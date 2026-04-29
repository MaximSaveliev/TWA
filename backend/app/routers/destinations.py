import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_owned_trip
from app.models.trip import Trip
from app.schemas.destination import (
    DestinationCreate,
    DestinationPatch,
    DestinationResponse,
    DestinationUpdate,
    ReorderRequest,
)
from app.services import destination_service

router = APIRouter(prefix="/api/trips/{trip_id}/destinations", tags=["destinations"])


async def _get_destination(trip: Trip, dest_id: uuid.UUID, db: AsyncSession):
    dest = await destination_service.get_destination(db, trip.id, dest_id)
    if not dest:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Destination not found")
    return dest


@router.get("", response_model=list[DestinationResponse])
async def list_destinations(
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    return await destination_service.get_destinations(db, trip.id)


@router.post("", response_model=DestinationResponse, status_code=status.HTTP_201_CREATED)
async def create_destination(
    body: DestinationCreate,
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    return await destination_service.create_destination(db, trip.id, body.model_dump())


@router.patch("/reorder", response_model=list[DestinationResponse])
async def reorder_destinations(
    body: ReorderRequest,
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    items = [{"id": item.id, "order_index": item.order_index} for item in body.items]
    return await destination_service.reorder_destinations(db, trip.id, items)


@router.get("/{dest_id}", response_model=DestinationResponse)
async def get_destination(
    dest_id: uuid.UUID,
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    return await _get_destination(trip, dest_id, db)


@router.put("/{dest_id}", response_model=DestinationResponse)
async def replace_destination(
    dest_id: uuid.UUID,
    body: DestinationUpdate,
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    dest = await _get_destination(trip, dest_id, db)
    return await destination_service.update_destination(db, dest, body.model_dump())


@router.patch("/{dest_id}", response_model=DestinationResponse)
async def patch_destination(
    dest_id: uuid.UUID,
    body: DestinationPatch,
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    dest = await _get_destination(trip, dest_id, db)
    # exclude_unset (not exclude_none) — the user may legitimately clear a
    # field by sending an explicit null (e.g. dragging a stop into the
    # "Unscheduled" bucket sends {"visit_date": null}). exclude_none would
    # silently drop that and leave the date intact.
    return await destination_service.update_destination(
        db, dest, body.model_dump(exclude_unset=True)
    )


@router.delete("/{dest_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_destination(
    dest_id: uuid.UUID,
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    dest = await _get_destination(trip, dest_id, db)
    await destination_service.delete_destination(db, dest)
