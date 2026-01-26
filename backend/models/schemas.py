from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    history: list[Message] = []


class ChatResponse(BaseModel):
    response: str
    session_id: str


class UserProfile(BaseModel):
    user_id: str
    gender: Optional[str] = None
    age: Optional[int] = None
