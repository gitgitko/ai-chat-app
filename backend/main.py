import os
from datetime import datetime
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "llama2")
MAX_TOKENS = 2048

app = FastAPI(
    title="Advanced AI Chat API",
    description="Real-time AI chat with Llama 3 via Ollama",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    system_prompt: Optional[str] = Field(
        default="You are a helpful, honest, and harmless AI assistant.",
        max_length=2000,
    )
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    max_tokens: int = Field(default=512, ge=1, le=MAX_TOKENS)
    model: str = Field(default=DEFAULT_MODEL)

class ChatResponse(BaseModel):
    message: str
    tokens_used: Optional[int] = None
    model: str

def count_tokens(text: str) -> int:
    return len(text) // 4

def check_ollama_health() -> bool:
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        return response.status_code == 200
    except Exception:
        return False

def get_available_models() -> list:
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            return [m["name"] for m in models]
        return []
    except Exception:
        return []

@app.get("/")
async def root():
    return {
        "name": "Advanced AI Chat API",
        "version": "1.0.0",
        "endpoints": ["/docs", "/api/chat", "/api/models", "/api/health"],
    }

@app.get("/api/health")
async def health_check():
    ollama_healthy = check_ollama_health()
    return {
        "api": "healthy",
        "ollama": "healthy" if ollama_healthy else "unhealthy",
        "ollama_url": OLLAMA_BASE_URL,
    }

@app.get("/api/models")
async def list_models():
    models = get_available_models()
    if not models:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running or no models available. Run: ollama pull llama2",
        )
    return {"models": models, "default": DEFAULT_MODEL}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not check_ollama_health():
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start it with: ollama serve",
        )

    full_prompt = f"""System: {request.system_prompt}

User: {request.message}

Assistant:"""

    input_tokens = count_tokens(full_prompt)

    def generate():
        accumulated_response = ""
        output_tokens = 0

        try:
            response = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": request.model,
                    "prompt": full_prompt,
                    "stream": True,
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "num_predict": request.max_tokens,
                },
                stream=True,
                timeout=120,
            )

            if response.status_code != 200:
                yield f"data: {{\"error\": \"Ollama error: {response.text}\"}}\n\n"
                return

            for line in response.iter_lines():
                if line:
                    import json
                    try:
                        chunk = json.loads(line)
                        token = chunk.get("response", "")
                        accumulated_response += token
                        output_tokens += count_tokens(token)
                        yield f"data: {{\"token\": {json.dumps(token)}}}\n\n"
                    except json.JSONDecodeError:
                        continue

            import json
            yield f"data: {{\"done\": true, \"tokens\": {{\"input\": {input_tokens}, \"output\": {output_tokens}}}}}\n\n"

        except requests.exceptions.Timeout:
            yield f"data: {{\"error\": \"Request timeout\"}}\n\n"
        except requests.exceptions.ConnectionError:
            yield f"data: {{\"error\": \"Could not connect to Ollama\"}}\n\n"
        except Exception as e:
            yield f"data: {{\"error\": \"Error: {str(e)}\"}}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )

@app.post("/api/chat/complete")
async def chat_complete(request: ChatRequest) -> ChatResponse:
    if not check_ollama_health():
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start it with: ollama serve",
        )

    full_prompt = f"""System: {request.system_prompt}

User: {request.message}

Assistant:"""

    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": request.model,
                "prompt": full_prompt,
                "stream": False,
                "temperature": request.temperature,
                "top_p": request.top_p,
                "num_predict": request.max_tokens,
            },
            timeout=120,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Ollama error")

        data = response.json()
        message = data.get("response", "")
        tokens = count_tokens(full_prompt) + count_tokens(message)

        return ChatResponse(message=message, tokens_used=tokens, model=request.model)

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Could not connect to Ollama")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
