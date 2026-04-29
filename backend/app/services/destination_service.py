import uuid
from datetime import date as date_type, time as time_type
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.destination import Destination
from app.models.trip import Trip


async def get_destinations(db: AsyncSession, trip_id: uuid.UUID) -> list[Destination]:
    result = await db.execute(
        select(Destination)
        .where(Destination.trip_id == trip_id)
        .order_by(Destination.order_index)
    )
    return list(result.scalars().all())


async def get_destination(
    db: AsyncSession, trip_id: uuid.UUID, dest_id: uuid.UUID
) -> Optional[Destination]:
    result = await db.execute(
        select(Destination).where(
            Destination.id == dest_id, Destination.trip_id == trip_id
        )
    )
    return result.scalar_one_or_none()


async def _get_trip(db: AsyncSession, trip_id: uuid.UUID) -> Optional[Trip]:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    return result.scalar_one_or_none()


def _clamp_visit_date(
    visit_date: Optional[date_type], trip: Optional[Trip]
) -> Optional[date_type]:
    """Clamp visit_date into the trip's [start_date, end_date] range.

    Without this, the AI (or a stale frontend state) can save stops on
    dates that fall outside the trip — they appear in an "Unscheduled"
    bucket and confuse the user. We snap them to the nearest valid day.
    """
    if visit_date is None or trip is None or not trip.start_date:
        return visit_date
    end = trip.end_date or trip.start_date
    if visit_date < trip.start_date:
        return trip.start_date
    if visit_date > end:
        return end
    return visit_date


async def _find_exact_duplicate(
    db: AsyncSession,
    trip_id: uuid.UUID,
    name: str,
    visit_date: Optional[date_type],
    visit_time: Optional[time_type],
    exclude_id: Optional[uuid.UUID] = None,
) -> Optional[Destination]:
    if not name or visit_date is None or visit_time is None:
        return None
    stmt = select(Destination).where(
        Destination.trip_id == trip_id,
        Destination.name == name,
        Destination.visit_date == visit_date,
        Destination.visit_time == visit_time,
    )
    if exclude_id is not None:
        stmt = stmt.where(Destination.id != exclude_id)
    result = await db.execute(stmt.limit(1))
    return result.scalar_one_or_none()


async def _next_order_index(db: AsyncSession, trip_id: uuid.UUID) -> int:
    result = await db.execute(
        select(Destination.order_index)
        .where(Destination.trip_id == trip_id)
        .order_by(Destination.order_index.desc())
        .limit(1)
    )
    return (result.scalar_one_or_none() or 0) + 1


async def create_destination(
    db: AsyncSession, trip_id: uuid.UUID, data: dict
) -> Destination:
    trip = await _get_trip(db, trip_id)
    if "visit_date" in data:
        data["visit_date"] = _clamp_visit_date(data.get("visit_date"), trip)

    dupe = await _find_exact_duplicate(
        db,
        trip_id,
        data.get("name", ""),
        data.get("visit_date"),
        data.get("visit_time"),
    )
    if dupe is not None:
        return dupe

    if data.get("order_index") is None:
        data["order_index"] = await _next_order_index(db, trip_id)
    dest = Destination(trip_id=trip_id, **data)
    db.add(dest)
    await db.commit()
    await db.refresh(dest)
    return dest


async def update_destination(
    db: AsyncSession, dest: Destination, data: dict
) -> Destination:
    if "visit_date" in data:
        trip = await _get_trip(db, dest.trip_id)
        data["visit_date"] = _clamp_visit_date(data.get("visit_date"), trip)

    new_name = data.get("name", dest.name)
    new_date = data["visit_date"] if "visit_date" in data else dest.visit_date
    new_time = data["visit_time"] if "visit_time" in data else dest.visit_time
    dupe = await _find_exact_duplicate(
        db, dest.trip_id, new_name, new_date, new_time, exclude_id=dest.id
    )
    if dupe is not None:
        # The slot is already taken by another stop with the same name —
        # bump this one by one minute so it stays on the same day/slot
        # without colliding. Saner than rejecting the user's drag.
        if isinstance(new_time, time_type):
            from datetime import datetime, timedelta
            bumped = (
                datetime.combine(new_date or date_type.today(), new_time)
                + timedelta(minutes=1)
            ).time()
            data["visit_time"] = bumped

    for key, value in data.items():
        setattr(dest, key, value)
    await db.commit()
    await db.refresh(dest)
    return dest


async def delete_destination(db: AsyncSession, dest: Destination) -> None:
    await db.delete(dest)
    await db.commit()


async def reorder_destinations(
    db: AsyncSession, trip_id: uuid.UUID, items: list[dict]
) -> list[Destination]:
    by_id = {item["id"]: item["order_index"] for item in items}
    result = await db.execute(
        select(Destination).where(
            Destination.trip_id == trip_id, Destination.id.in_(by_id.keys())
        )
    )
    for dest in result.scalars().all():
        dest.order_index = by_id[dest.id]
    await db.commit()
    return await get_destinations(db, trip_id)
