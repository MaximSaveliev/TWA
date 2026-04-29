import uuid
from datetime import datetime, date, time
from typing import Optional
from pydantic import BaseModel

from app.models.destination import DestinationCategory


class DestinationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    visit_date: Optional[date] = None
    visit_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    order_index: Optional[int] = None
    category: Optional[DestinationCategory] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class DestinationUpdate(BaseModel):
    name: str
    description: Optional[str] = None
    visit_date: Optional[date] = None
    visit_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    category: Optional[DestinationCategory] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class DestinationPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visit_date: Optional[date] = None
    visit_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    category: Optional[DestinationCategory] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ReorderItem(BaseModel):
    id: uuid.UUID
    order_index: int


class ReorderRequest(BaseModel):
    items: list[ReorderItem]


class DestinationResponse(BaseModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    name: str
    description: Optional[str]
    visit_date: Optional[date]
    visit_time: Optional[time]
    duration_minutes: Optional[int]
    order_index: int
    category: Optional[DestinationCategory]
    address: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
