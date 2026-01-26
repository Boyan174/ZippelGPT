import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers.chat import router as chat_router
from services.gemini import get_gemini_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Gemini service with context caching on startup
    print("Initializing Gemini service with context caching...")
    try:
        gemini = get_gemini_service()
        print("Gemini service initialized successfully!")
    except Exception as e:
        print(f"Warning: Failed to initialize Gemini service: {e}")

    yield
    print("Shutting down...")


app = FastAPI(
    title="ZippelGPT API",
    description="AI chat API with the persona of Dr. Christian Zippel",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://zippel-gpt.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_router)


@app.get("/")
async def root():
    return {
        "message": "ZippelGPT AI Service",
        "docs": "/docs",
        "endpoints": {
            "chat": "/api/chat/stream"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
