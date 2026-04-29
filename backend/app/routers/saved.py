import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.saved import SavedPlaceCreate, SavedPlaceResponse, SavedPlaceUpdate
from app.services import saved_service

router = APIRouter(prefix="/api/saved", tags=["saved"])


async def _get_owned_place(
    place_id: uuid.UUID,
    db: AsyncSession,
    user: User,
):
    place = await saved_service.get_for_user(db, user.id, place_id)
    if not place:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Place not found")
    return place


@router.get("", response_model=list[SavedPlaceResponse])
async def list_saved(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await saved_service.list_for_user(db, current_user.id)


@router.post("", response_model=SavedPlaceResponse, status_code=status.HTTP_201_CREATED)
async def create_saved(
    body: SavedPlaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await saved_service.create(db, current_user.id, body.model_dump())


@router.patch("/{place_id}", response_model=SavedPlaceResponse)
async def update_saved(
    place_id: uuid.UUID,
    body: SavedPlaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    place = await _get_owned_place(place_id, db, current_user)
    return await saved_service.update(db, place, body.model_dump(exclude_none=True))


@router.delete("/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved(
    place_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    place = await _get_owned_place(place_id, db, current_user)
    await saved_service.delete(db, place)
