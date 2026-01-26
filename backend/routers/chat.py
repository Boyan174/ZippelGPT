import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.gemini import get_gemini_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Stream chat response using Server-Sent Events.

    Frontend sends:
    - message: the new user message
    - history: previous messages from this session (fetched from Supabase by frontend)

    Backend:
    - Uses cached book content + system prompt
    - Sends history + new message to Gemini
    - Streams response back

    Frontend is responsible for saving messages to Supabase.
    """
    try:
        gemini = get_gemini_service()

        # Convert history to format expected by Gemini
        history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        # Create chat with history
        chat = gemini.create_chat(history=history)

        async def generate():
            try:
                async for chunk in gemini.send_message_stream(chat, request.message):
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                error_data = json.dumps({"error": str(e)})
                yield f"data: {error_data}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
