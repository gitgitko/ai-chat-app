"""Advanced AI Chat API using OpenRouter."""

import os
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ============================================================================
# Configuration
# ============================================================================

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "meta-llama/llama-3-8b-instruct:free")

if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY environment variable is required!")

app = FastAPI(
    title="Advanced AI Chat API",
    description="Real-time AI chat with OpenRouter",
    version="1.0.0",
)

# ============================================================================
# CORS Configuration
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Data Models
# ============================================================================


class ChatRequest(BaseModel):
    """Chat request with optional advanced parameters."""

    message: str = Field(..., min_length=1, max_length=4000)
    system_prompt: Optional[str] = Field(
        default="You are a helpful, honest, and harmless AI assistant.",
        max_length=2000,
    )
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    max_tokens: int = Field(default=512, ge=1, le=4096)
    model: str = Field(default=DEFAULT_MODEL)


class ChatResponse(BaseModel):
    """Chat response with metadata."""

    message: str
    tokens_used: Optional[int] = None
    model: str


# ============================================================================
# Available Models on OpenRouter
# ============================================================================

AVAILABLE_MODELS = {
    "meta-llama/llama-3-8b-instruct:free": "Llama 3 8B (Free)",
    "meta-llama/llama-3-70b-instruct:free": "Llama 3 70B (Free)",
    "mistralai/mistral-7b-instruct:free": "Mistral 7B (Free)",
    "openai/gpt-3.5-turbo": "GPT-3.5 Turbo",
    "openai/gpt-4": "GPT-4",
    "anthropic/claude-3-sonnet": "Claude 3 Sonnet",
}

# ============================================================================
# Utility Functions
# ============================================================================


def count_tokens(text: str) -> int:
    """Approximate token count (4 chars ≈ 1 token)."""
    return len(text) // 4


# ============================================================================
# Routes
# ============================================================================


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Advanced AI Chat API",
        "version": "1.0.0",
        "provider": "OpenRouter",
        "endpoints": ["/docs", "/api/chat", "/api/models", "/api/health"],
    }


@app.get("/api/health")
async def health_check():
    """Check API health and OpenRouter connectivity."""
    try:
        response = requests.get(
            f"{OPENROUTER_BASE_URL}/models",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
            timeout=5,
        )
        openrouter_healthy = response.status_code == 200
    except Exception:
        openrouter_healthy = False

    return {
        "api": "healthy",
        "openrouter": "healthy" if openrouter_healthy else "unhealthy",
        "provider": "OpenRouter",
    }


@app.get("/api/models")
async def list_models():
    """List available models."""
    return {
        "models": list(AVAILABLE_MODELS.values()),
        "model_ids": list(AVAILABLE_MODELS.keys()),
        "default": DEFAULT_MODEL,
        "available_models": AVAILABLE_MODELS,
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Send a message and get a streaming response from the AI.

    Response is streamed using Server-Sent Events (SSE) for real-time updates.
    """

    def generate():
        """Generator function for streaming response."""
        accumulated_response = ""
        input_tokens = 0
        output_tokens = 0

        try:
            # Call OpenRouter streaming endpoint
            response = requests.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Advanced AI Chat",
                },
                json={
                    "model": request.model,
                    "messages": [
                        {"role": "system", "content": request.system_prompt},
                        {"role": "user", "content": request.message},
                    ],
                    "stream": True,
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "max_tokens": request.max_tokens,
                },
                stream=True,
                timeout=120,
            )

            if response.status_code != 200:
                error_text = response.text
                yield f'data: {{"error": "OpenRouter error: {error_text}"}}\n\n'
                return

            # Stream response chunks
            import json

            for line in response.iter_lines():
                if line:
                    line = line.decode("utf-8") if isinstance(line, bytes) else line

                    if line.startswith("data: "):
                        data_str = line[6:]

                        if data_str == "[DONE]":
                            yield f'data: {{"done": true, "tokens": {{"input": {input_tokens}, "output": {output_tokens}}}}}\n\n'
                            continue

                        try:
                            data = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            token = delta.get("content", "")

                            if token:
                                accumulated_response += token
                                output_tokens = count_tokens(accumulated_response)
                                yield f'data: {{"token": {json.dumps(token)}}}\n\n'

                            # Get usage info from finish
                            if (
                                data.get("choices", [{}])[0].get("finish_reason")
                                == "stop"
                            ):
                                usage = data.get("usage", {})
                                input_tokens = usage.get("prompt_tokens", 0)
                                output_tokens = usage.get("completion_tokens", 0)

                        except json.JSONDecodeError:
                            continue

        except requests.exceptions.Timeout:
            yield f'data: {{"error": "Request timeout. Model is taking too long to respond."}}\n\n'
        except requests.exceptions.ConnectionError:
            yield f'data: {{"error": "Could not connect to OpenRouter."}}\n\n'
        except Exception as e:
            yield f'data: {{"error": "Unexpected error: {str(e)}"}}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.post("/api/chat/complete")
async def chat_complete(request: ChatRequest) -> ChatResponse:
    """
    Send a message and get a complete response (non-streaming).

    Useful for simpler clients that can't handle streaming.
    """

    try:
        response = requests.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Advanced AI Chat",
            },
            json={
                "model": request.model,
                "messages": [
                    {"role": "system", "content": request.system_prompt},
                    {"role": "user", "content": request.message},
                ],
                "stream": False,
                "temperature": request.temperature,
                "top_p": request.top_p,
                "max_tokens": request.max_tokens,
            },
            timeout=120,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="OpenRouter error")

        data = response.json()
        message = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        tokens = usage.get("prompt_tokens", 0) + usage.get("completion_tokens", 0)

        return ChatResponse(message=message, tokens_used=tokens, model=request.model)

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Could not connect to OpenRouter")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
