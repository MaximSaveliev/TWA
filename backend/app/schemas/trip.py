import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

from app.models.trip import TripStatus
from app.schemas.destination import DestinationResponse


class TripCreate(BaseModel):
    title: str
    description: Optional[str] = None
    destination_city: str
    destination_country: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: TripStatus = TripStatus.draft
    budget: Optional[Decimal] = None
    currency: str = "USD"
    notes: Optional[str] = None


class TripUpdate(TripCreate):
    pass


class TripPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    destination_city: Optional[str] = None
    destination_country: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[TripStatus] = None
    budget: Optional[Decimal] = None
    currency: Optional[str] = None
    notes: Optional[str] = None


class TripResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str]
    destination_city: str
    destination_country: str
    start_date: Optional[date]
    end_date: Optional[date]
    status: TripStatus
    budget: Optional[Decimal]
    currency: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TripDetail(TripResponse):
    destinations: List[DestinationResponse] = []
