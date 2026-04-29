import uuid

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.trip import Trip
from app.models.user import User
from app.services import trip_service
from app.services.auth_service import decode_token

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def get_owned_trip(
    trip_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Trip:
    trip = await trip_service.get_trip(db, trip_id)
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    if trip.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access forbidden")
    return trip
