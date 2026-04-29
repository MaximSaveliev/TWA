import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SavedPlaceCreate(BaseModel):
    name: str
    address: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None


class SavedPlaceUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None


class SavedPlaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    address: Optional[str]
    category: Optional[str]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
