import uuid
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.trip import Trip, TripStatus


async def get_trips(
    db: AsyncSession,
    user_id: uuid.UUID,
    status: Optional[TripStatus] = None,
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[Trip], int]:
    query = select(Trip).where(Trip.user_id == user_id)
    if status:
        query = query.where(Trip.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(
            Trip.title.ilike(pattern),
            Trip.destination_city.ilike(pattern),
            Trip.destination_country.ilike(pattern),
        ))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    query = query.order_by(Trip.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all()), total or 0


async def get_trip(db: AsyncSession, trip_id: uuid.UUID) -> Optional[Trip]:
    result = await db.execute(
        select(Trip).options(selectinload(Trip.destinations)).where(Trip.id == trip_id)
    )
    return result.scalar_one_or_none()


async def create_trip(db: AsyncSession, user_id: uuid.UUID, data: dict) -> Trip:
    trip = Trip(user_id=user_id, **data)
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return trip


async def update_trip(db: AsyncSession, trip: Trip, data: dict) -> Trip:
    for key, value in data.items():
        setattr(trip, key, value)
    await db.commit()
    await db.refresh(trip)
    return trip


async def delete_trip(db: AsyncSession, trip: Trip) -> None:
    await db.delete(trip)
    await db.commit()
