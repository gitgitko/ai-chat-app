# Advanced AI Chat App

A full-stack AI chat application powered by **Llama 3** (strong free open-source model) with a modern React frontend and Python FastAPI backend.

## Features

✅ **Real-time streaming responses** - Watch AI responses generate in real-time  
✅ **Conversation history** - Persistent chat history with context management  
✅ **Markdown support** - Formatted responses with code blocks  
✅ **Token counting** - See input/output token usage  
✅ **Advanced settings** - Control temperature, top_p, max_tokens  
✅ **System prompts** - Customize AI behavior  
✅ **Dark mode** - Modern UI with theme toggle  
✅ **Responsive design** - Works on desktop, tablet, mobile  
✅ **Export chats** - Save conversations as JSON  

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Next.js 14 (App Router)
- Tailwind CSS
- Zustand (state management)
- React Markdown

**Backend:**
- Python 3.11+
- FastAPI
- Ollama (model runtime)
- Llama 3 or Mistral

## Quick Start

### 1. Install Ollama
https://ollama.ai

### 2. Pull a model
```bash
ollama pull llama2
```

### 3. Install dependencies
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 4. Run everything
```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Backend
cd backend && python -m uvicorn main:app --reload

# Terminal 3: Frontend
cd frontend && npm run dev
```

Open http://localhost:3000

## API Endpoints

- `POST /api/chat` - Stream chat responses
- `POST /api/chat/complete` - Get complete response
- `GET /api/models` - List available models
- `GET /api/health` - Health check

## License

MIT
