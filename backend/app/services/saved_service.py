import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_place import SavedPlace


async def list_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[SavedPlace]:
    result = await db.execute(
        select(SavedPlace)
        .where(SavedPlace.user_id == user_id)
        .order_by(SavedPlace.created_at.desc())
    )
    return list(result.scalars().all())


async def get_for_user(
    db: AsyncSession, user_id: uuid.UUID, place_id: uuid.UUID
) -> Optional[SavedPlace]:
    result = await db.execute(
        select(SavedPlace).where(
            SavedPlace.id == place_id, SavedPlace.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, user_id: uuid.UUID, data: dict) -> SavedPlace:
    place = SavedPlace(user_id=user_id, **data)
    db.add(place)
    await db.commit()
    await db.refresh(place)
    return place


async def update(db: AsyncSession, place: SavedPlace, data: dict) -> SavedPlace:
    for key, value in data.items():
        setattr(place, key, value)
    await db.commit()
    await db.refresh(place)
    return place


async def delete(db: AsyncSession, place: SavedPlace) -> None:
    await db.delete(place)
    await db.commit()
