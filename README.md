# ZippelGPT

AI chat app with the persona of Dr. Christian Zippel, using Gemini's context caching.

## Architecture

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
│  TypeScript +   │
│  shadcn/ui      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌────────┐
│Supabase│  │FastAPI │
│  Auth  │  │   AI   │
│  Data  │  │Service │
└────────┘  └───┬────┘
                ▼
           ┌────────┐
           │ Gemini │
           │  API   │
           └────────┘
```

- **Frontend**: Next.js + TypeScript + shadcn/ui (dark mode)
  - Connects directly to Supabase for auth & data
  - Connects to FastAPI for AI chat
- **FastAPI**: AI service only (Gemini with context caching)
- **Supabase**: Auth + PostgreSQL database (with RLS)

## Setup

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Get your project URL and **anon key** from Settings > API

### 2. Backend (AI Service)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env already has GEMINI_API_KEY
uvicorn main:app --reload
```

Backend runs at http://localhost:8000

### 3. Frontend

```bash
cd frontend
npm install

# Update .env.local with your Supabase credentials
npm run dev
```

Frontend runs at http://localhost:3000

## Environment Variables

### Backend (`backend/.env`)
```
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Data Flow

1. **Auth**: Frontend ↔ Supabase directly
2. **Chat history**: Frontend ↔ Supabase directly (RLS secured)
3. **AI chat**: Frontend → FastAPI → Gemini (with cached book content)

## API Endpoints (FastAPI)

- `POST /api/chat/stream` - Send message + history, stream AI response
- `GET /api/chat/health` - Health check

## Features

- User authentication via Supabase
- Chat history persistence (Supabase)
- Streaming AI responses (SSE)
- Context caching (book content cached for 24h)
- Dark mode UI with shadcn/ui
- Row Level Security (users only see their own data)
