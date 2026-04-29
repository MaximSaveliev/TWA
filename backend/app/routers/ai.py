import uuid
from datetime import date, time
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import asc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_owned_trip
from app.models.message import ChatMessage as ChatMessageModel, MessageRole
from app.models.trip import Trip
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, PlanRequest, UpdateTripRequest
from app.services import ai_service, destination_service, trip_service

router = APIRouter(prefix="/api/ai", tags=["ai"])

_DEST_FIELDS = {
    "name", "description", "visit_date", "visit_time", "duration_minutes",
    "order_index", "category", "address", "notes",
}
_NULLISH = {None, "", "null", "None"}


def _parse(field: str, value: Any) -> Any:
    if value in _NULLISH:
        return None if field != "order_index" else 999
    try:
        if field == "visit_date":
            return date.fromisoformat(value) if isinstance(value, str) else value
        if field == "visit_time":
            return time.fromisoformat(value) if isinstance(value, str) else value
        if field == "duration_minutes":
            return int(value)
        if field == "order_index":
            return int(value)
    except (TypeError, ValueError):
        return None if field != "order_index" else 999
    return value


def _sanitize_dest(data: dict) -> dict:
    return {k: _parse(k, v) for k, v in data.items() if k in _DEST_FIELDS}


@router.get("/messages/{trip_id}")
async def get_chat_messages(
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatMessageModel)
        .where(ChatMessageModel.trip_id == trip.id)
        .order_by(asc(ChatMessageModel.created_at))
    )
    return [{"role": m.role.value, "content": m.content} for m in result.scalars().all()]


@router.post("/plan")
async def generate_plan(
    body: PlanRequest,
    current_user: User = Depends(get_current_user),
):
    return await ai_service.generate_plan(
        destination=body.destination,
        start_date=body.start_date,
        end_date=body.end_date,
        budget=body.budget,
        interests=body.interests,
    )


async def _apply_modifications(
    db: AsyncSession, trip_id: uuid.UUID, mods: dict
) -> bool:
    changed = False

    for raw in mods.get("add_destinations", []):
        clean = _sanitize_dest(raw)
        if clean.get("name"):
            await destination_service.create_destination(db, trip_id, clean)
            changed = True

    for raw in mods.get("update_destinations", []):
        try:
            dest_id = uuid.UUID(str(raw.pop("id")))
        except (ValueError, KeyError):
            continue
        dest = await destination_service.get_destination(db, trip_id, dest_id)
        if dest:
            await destination_service.update_destination(db, dest, _sanitize_dest(raw))
            changed = True

    for raw in mods.get("delete_destination_ids", []):
        try:
            dest_id = uuid.UUID(str(raw))
        except ValueError:
            continue
        dest = await destination_service.get_destination(db, trip_id, dest_id)
        if dest:
            await destination_service.delete_destination(db, dest)
            changed = True

    return changed


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip: Optional[Trip] = None
    destinations: list = []

    if body.trip_id:
        trip = await trip_service.get_trip(db, body.trip_id)
        if not trip or trip.user_id != current_user.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Access forbidden")
        destinations = await destination_service.get_destinations(db, body.trip_id)

    history = [{"role": m.role, "content": m.content} for m in body.messages]
    result = await ai_service.smart_chat(history, trip=trip, destinations=destinations)
    reply = result["reply"]

    trip_updated = False
    if result.get("modifications") and body.trip_id:
        trip_updated = await _apply_modifications(db, body.trip_id, result["modifications"])

    if body.messages:
        latest = body.messages[-1]
        db.add(ChatMessageModel(
            trip_id=body.trip_id,
            user_id=current_user.id,
            role=latest.role,
            content=latest.content,
        ))

    db.add(ChatMessageModel(
        trip_id=body.trip_id,
        user_id=current_user.id,
        role=MessageRole.assistant,
        content=reply,
    ))
    await db.commit()

    return {"reply": reply, "trip_updated": trip_updated}


@router.post("/update-trip/{trip_id}")
async def update_trip_with_ai(
    body: UpdateTripRequest,
    trip: Trip = Depends(get_owned_trip),
    db: AsyncSession = Depends(get_db),
):
    destinations = await destination_service.get_destinations(db, trip.id)
    changes = await ai_service.update_trip_from_instruction(
        body.instruction, trip, destinations
    )

    if changes.get("trip_updates"):
        await trip_service.update_trip(db, trip, changes["trip_updates"])

    await _apply_modifications(db, trip.id, changes)

    updated_trip = await trip_service.get_trip(db, trip.id)
    updated_destinations = await destination_service.get_destinations(db, trip.id)

    return {
        "trip": updated_trip,
        "destinations": updated_destinations,
        "changes_applied": changes,
    }
