import uuid
from datetime import date
from typing import Optional
from pydantic import BaseModel

from app.models.message import MessageRole


class ChatMessage(BaseModel):
    role: MessageRole
    content: str


class ChatRequest(BaseModel):
    trip_id: Optional[uuid.UUID] = None
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    trip_updated: bool = False


class PlanRequest(BaseModel):
    destination: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    interests: Optional[str] = None


class UpdateTripRequest(BaseModel):
    instruction: str
