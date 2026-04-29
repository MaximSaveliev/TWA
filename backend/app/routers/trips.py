from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_owned_trip
from app.models.trip import Trip, TripStatus
from app.models.user import User
from app.schemas.trip import TripCreate, TripDetail, TripPatch, TripResponse
from app.services import trip_service

router = APIRouter(prefix="/api/trips", tags=["trips"])


class TripListResponse(BaseModel):
    items: list[TripResponse]
    total: int
    page: int
    per_page: int


@router.get("", response_model=TripListResponse)
async def list_trips(
    status_filter: Optional[TripStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trips, total = await trip_service.get_trips(
        db, current_user.id, status_filter, search, page, per_page
    )
    return {"items": trips, "total": total, "page": page, "per_page": per_page}


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    body: TripCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await trip_service.create_trip(db, current_user.id, body.model_dump())


@router.get("/{trip_id}", response_model=TripDetail)
async def get_trip(trip: Trip = Depends(get_owned_trip)):
    return trip


@router.put("/{trip_id}", response_model=TripResponse)
async def replace_trip(
    body: TripCreate,
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    return await trip_service.update_trip(db, trip, body.model_dump())


@router.patch("/{trip_id}", response_model=TripResponse)
async def patch_trip(
    body: TripPatch,
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    return await trip_service.update_trip(db, trip, body.model_dump(exclude_none=True))


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    await trip_service.delete_trip(db, trip)
