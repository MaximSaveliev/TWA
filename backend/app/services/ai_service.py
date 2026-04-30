"""AI service for plan generation and chat-driven itinerary edits.

The service exposes three async entry points used by `routers/ai.py`:
- `generate_plan` — builds a complete day-by-day plan from scratch.
- `smart_chat` — conversational replies plus optional `[PLAN_UPDATE]` block.
- `update_trip_from_instruction` — one-shot natural-language edit of a trip.

Design goals (refactor 2026-04):
1. The model knows exactly which stop the user means (day number, per-day
   position, exact date, time, category).
2. Adds happen at the place the user named — same day, sensible time slot
   that does not collide with existing stops.
3. Every destination written back to the DB has all displayable fields
   filled (name, category, address, visit_date, visit_time,
   duration_minutes, description, notes).
4. Replies are scrubbed of UUIDs, internal markers, JSON, and any other
   technical bleed before reaching the user.
5. Day plans read like a real trip: morning sight → lunch → afternoon
   activity → coffee → dinner → evening — never two restaurants back-to-back
   and never two stops at the same hour.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Any, Iterable, Optional

from groq import Groq

from app.config import settings

logger = logging.getLogger(__name__)

_client = Groq(api_key=settings.groq_api_key)
_MODEL = "llama-3.3-70b-versatile"

_VALID_CATEGORIES = {
    "accommodation",
    "restaurant",
    "attraction",
    "transport",
    "activity",
    "other",
}

_FOOD_CATEGORIES = {"restaurant"}

_DEFAULT_SLOT_BY_TIME = (
    (time(6, 0), time(10, 30), "breakfast"),
    (time(10, 30), time(12, 0), "morning"),
    (time(12, 0), time(14, 30), "lunch"),
    (time(14, 30), time(17, 30), "afternoon"),
    (time(17, 30), time(20, 0), "dinner"),
    (time(20, 0), time(23, 59), "evening"),
)


# ---------------------------------------------------------------------------
# Trip context — what the model sees about the current trip.
# ---------------------------------------------------------------------------


def _day_map(trip) -> list[tuple[int, date]]:
    if not trip.start_date:
        return []
    end = trip.end_date or trip.start_date
    cur, num, out = trip.start_date, 1, []
    while cur <= end:
        out.append((num, cur))
        cur += timedelta(days=1)
        num += 1
    return out


def _slot_label(t: Optional[time]) -> str:
    if not t:
        return "anytime"
    for start, end, label in _DEFAULT_SLOT_BY_TIME:
        if start <= t < end:
            return label
    return "evening"


def _trip_context(trip, destinations) -> str:
    lines: list[str] = [
        f"Trip: {trip.title}",
        f"Destination: {trip.destination_city}, {trip.destination_country}",
        f"Status: {trip.status}",
    ]
    if trip.start_date:
        lines.append(f"Dates: {trip.start_date} → {trip.end_date or trip.start_date}")
    if trip.budget:
        lines.append(f"Budget: {trip.budget} {trip.currency}")
    if trip.description:
        lines.append(f"Description: {trip.description}")
    if trip.notes:
        lines.append(f"Notes: {trip.notes}")

    by_date: dict[str, list] = defaultdict(list)
    for d in sorted(destinations, key=lambda x: (x.visit_date or date.max, x.order_index or 0)):
        key = str(d.visit_date) if d.visit_date else "unscheduled"
        by_date[key].append(d)

    days = _day_map(trip)

    if days:
        lines.append("\n=== DAY → DATE TABLE (the only correct dates) ===")
        for num, d in days:
            hint = ""
            if num == 1:
                hint = "  ← 'first day' / 'day 1'"
            elif num == 2:
                hint = "  ← 'second day' / 'day 2'"
            elif num == len(days):
                hint = "  ← 'last day'"
            lines.append(f"  Day {num} = {d.isoformat()}{hint}")
        lines.append("=== END TABLE ===")

        lines.append("\nItinerary:")
        remaining = dict(by_date)
        for num, d in days:
            stops = remaining.pop(d.isoformat(), [])
            header = f"  Day {num} ({d.isoformat()})"
            if not stops:
                lines.append(f"{header} — empty, no stops yet")
                continue
            lines.append(f"{header} — {len(stops)} stop(s):")
            for pos, s in enumerate(stops, start=1):
                lines.append(_format_stop(s, num, pos))

        for date_key, stops in remaining.items():
            label = "Unscheduled" if date_key == "unscheduled" else f"Outside trip range ({date_key})"
            lines.append(f"  {label}:")
            for pos, s in enumerate(stops, start=1):
                lines.append(_format_stop(s, None, pos))
    else:
        lines.append("\nItinerary:")
        for date_key, stops in by_date.items():
            label = "Unscheduled" if date_key == "unscheduled" else date_key
            lines.append(f"  {label}:")
            for pos, s in enumerate(stops, start=1):
                lines.append(_format_stop(s, None, pos))

    return "\n".join(lines)


def _format_stop(d, day_num: Optional[int], pos: int) -> str:
    cat = (d.category.value if hasattr(d.category, "value") else d.category) or "other"
    time_part = f" at {d.visit_time.strftime('%H:%M')}" if d.visit_time else ""
    dur_part = f" ({d.duration_minutes} min)" if d.duration_minutes else ""
    addr_part = f", {d.address}" if d.address else ""
    slot = _slot_label(d.visit_time)
    anchor = f"Day {day_num} stop {pos}" if day_num is not None else f"stop {pos}"
    out = [
        f"    [{anchor} · {slot}] {d.name} [{cat}]{addr_part}{time_part}{dur_part}  <stop-id:{d.id}>"
    ]
    if d.description:
        out.append(f"      {d.description}")
    if d.notes:
        out.append(f"      Tip: {d.notes}")
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Reply sanitization — strip every technical leak before showing the user.
# ---------------------------------------------------------------------------


_UUID_RE = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.IGNORECASE)
_STOP_ID_RE = re.compile(r"\s*<stop-?id:[^>]+>", re.IGNORECASE)
_PLAN_UPDATE_RE = re.compile(r"\[PLAN_UPDATE\].*?(?:\[/PLAN_UPDATE\]|$)", re.DOTALL | re.IGNORECASE)
_TAG_LEFTOVER_RE = re.compile(r"\[/?PLAN_UPDATE\]", re.IGNORECASE)
_INTERNAL_NOISE_RE = re.compile(
    r"DestinationCategory\.\w+"
    r"|Destination\([^)]*\)"
    r"|order_index\s*[:=]\s*\d+"
    r"|visit_date\s*[:=]\s*\S+"
    r"|trip[_-]?id\s*[:=]\s*\S+",
    re.IGNORECASE,
)
_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*\{.*?\}\s*```", re.DOTALL | re.IGNORECASE)
_BARE_JSON_RE = re.compile(r"^\s*\{[\s\S]*?\}\s*$")


def _sanitize_reply(text: str) -> str:
    if not text:
        return ""
    text = _PLAN_UPDATE_RE.sub("", text)
    text = _JSON_BLOCK_RE.sub("", text)
    text = _STOP_ID_RE.sub("", text)
    text = _UUID_RE.sub("", text)
    text = _TAG_LEFTOVER_RE.sub("", text)
    text = _INTERNAL_NOISE_RE.sub("", text)
    text = re.sub(r"\(\s*[,\s]*\)", "", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[\s\-:,;]+$", "", text, flags=re.MULTILINE)
    cleaned = text.strip()
    if not cleaned or _BARE_JSON_RE.match(cleaned):
        return "Done — your itinerary has been updated."
    return cleaned


# ---------------------------------------------------------------------------
# Destination validation & auto-completion of empty fields.
# ---------------------------------------------------------------------------


_FALLBACK_TIME_BY_CATEGORY = {
    "accommodation": time(15, 0),
    "restaurant": time(13, 0),
    "attraction": time(10, 30),
    "activity": time(15, 0),
    "transport": time(9, 0),
    "other": time(11, 0),
}

_FALLBACK_DURATION_BY_CATEGORY = {
    "accommodation": 30,
    "restaurant": 75,
    "attraction": 90,
    "activity": 120,
    "transport": 45,
    "other": 60,
}


def _coerce_time(value: Any) -> Optional[time]:
    if isinstance(value, time):
        return value
    if not value or not isinstance(value, str):
        return None
    s = value.strip()
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p"):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return None


def _coerce_date(value: Any) -> Optional[date]:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if not value or not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return None


def _normalize_category(raw: Any) -> str:
    if not raw:
        return "other"
    s = str(raw).strip().lower()
    return s if s in _VALID_CATEGORIES else "other"


def _ensure_full_destination(d: dict, trip, destinations) -> dict:
    """Fill missing/empty fields with reasonable defaults so the saved
    destination always renders cleanly in the UI."""
    name = (d.get("name") or "").strip()
    if not name:
        return d  # router-level guard will skip nameless entries

    category = _normalize_category(d.get("category"))
    visit_date = _coerce_date(d.get("visit_date"))
    visit_time = _coerce_time(d.get("visit_time"))

    if not visit_date and trip and trip.start_date:
        visit_date = _pick_open_day(trip, destinations) or trip.start_date

    if not visit_time:
        visit_time = _pick_open_slot(category, visit_date, destinations)

    duration = d.get("duration_minutes")
    try:
        duration = int(duration) if duration not in (None, "", "null") else None
    except (TypeError, ValueError):
        duration = None
    if not duration or duration <= 0:
        duration = _FALLBACK_DURATION_BY_CATEGORY[category]

    description = (d.get("description") or "").strip() or _fallback_description(name, category, trip)
    address = (d.get("address") or "").strip() or _fallback_address(name, trip)
    notes = (d.get("notes") or "").strip() or _fallback_notes(category)

    out = {
        "name": name,
        "description": description,
        "category": category,
        "address": address,
        "visit_date": visit_date,
        "visit_time": visit_time,
        "duration_minutes": duration,
        "notes": notes,
    }
    if "order_index" in d and d["order_index"] not in (None, "", "null"):
        try:
            out["order_index"] = int(d["order_index"])
        except (TypeError, ValueError):
            pass
    return out


def _fallback_description(name: str, category: str, trip) -> str:
    where = f" in {trip.destination_city}" if trip and getattr(trip, "destination_city", None) else ""
    by_cat = {
        "restaurant": f"A welcoming spot to enjoy a meal{where}. Expect local flavours and a relaxed atmosphere.",
        "attraction": f"A landmark worth seeing{where}. Take your time to wander and soak in the atmosphere.",
        "activity": f"A hands-on experience{where} that adds variety to the day.",
        "accommodation": f"Your base for the day{where} — drop bags, freshen up, then head out again.",
        "transport": f"A short hop to the next stop{where}. Build in a small buffer in case of delays.",
        "other": f"A handy stop{where} to break up the day.",
    }
    return by_cat.get(category, by_cat["other"]) + f" Visit: {name}."


def _fallback_address(name: str, trip) -> str:
    if trip and getattr(trip, "destination_city", None):
        country = getattr(trip, "destination_country", "") or ""
        return f"{name}, {trip.destination_city}{', ' + country if country else ''}"
    return name


def _fallback_notes(category: str) -> str:
    return {
        "restaurant": "Reserve a table during peak hours; check the daily specials.",
        "attraction": "Book tickets online to skip the queue and arrive early for the best light.",
        "activity": "Wear comfortable shoes and bring water.",
        "accommodation": "Confirm check-in time and keep a copy of your booking handy.",
        "transport": "Buy tickets in advance and double-check the platform or terminal.",
        "other": "Worth a quick stop — keep an eye on opening hours.",
    }.get(category, "Worth a quick stop — keep an eye on opening hours.")


def _pick_open_day(trip, destinations) -> Optional[date]:
    days = [d for _, d in _day_map(trip)]
    if not days:
        return None
    counts: dict[date, int] = {d: 0 for d in days}
    for s in destinations:
        if s.visit_date in counts:
            counts[s.visit_date] += 1
    return min(counts, key=lambda k: (counts[k], k))


def _pick_open_slot(category: str, visit_date: Optional[date], destinations) -> time:
    base = _FALLBACK_TIME_BY_CATEGORY.get(category, time(11, 0))
    if not visit_date:
        return base
    taken = {
        s.visit_time for s in destinations
        if s.visit_date == visit_date and s.visit_time is not None
    }
    candidate = base
    step = timedelta(minutes=30)
    pivot = datetime.combine(date.today(), candidate)
    safety = 0
    while candidate in taken and safety < 20:
        pivot += step
        candidate = pivot.time()
        safety += 1
    return candidate


def _enforce_variety(stops: list[dict]) -> list[dict]:
    """Avoid two restaurants back-to-back on the same day by shifting the
    second one's time and category framing. We never reject — the model is
    the planner — we only nudge ordering for readability."""
    by_day: dict[Any, list[dict]] = defaultdict(list)
    for s in stops:
        by_day[s.get("visit_date")].append(s)
    for day_stops in by_day.values():
        day_stops.sort(key=lambda s: (_coerce_time(s.get("visit_time")) or time(0, 0)))
        for i in range(1, len(day_stops)):
            prev, cur = day_stops[i - 1], day_stops[i]
            if (
                _normalize_category(prev.get("category")) in _FOOD_CATEGORIES
                and _normalize_category(cur.get("category")) in _FOOD_CATEGORIES
            ):
                ct = _coerce_time(cur.get("visit_time")) or time(15, 0)
                bumped = (datetime.combine(date.today(), ct) + timedelta(hours=2)).time()
                cur["visit_time"] = (
                    bumped if isinstance(cur.get("visit_time"), time) else bumped.strftime("%H:%M")
                )
    return stops


# ---------------------------------------------------------------------------
# LLM helpers.
# ---------------------------------------------------------------------------


_TRANSIENT_STATUSES = {408, 409, 425, 429, 500, 502, 503, 504}


def _is_transient(err: Exception) -> bool:
    status = getattr(err, "status_code", None) or getattr(err, "status", None)
    if isinstance(status, int) and status in _TRANSIENT_STATUSES:
        return True
    name = type(err).__name__.lower()
    return any(t in name for t in ("timeout", "connection", "ratelimit", "apierror"))


async def _call_groq(messages: list[dict], *, json_mode: bool = False, max_tokens: int = 4096) -> str:
    """Run a Groq chat-completion with up to 3 attempts on transient errors.

    The Groq SDK is synchronous, so we run it via `asyncio.to_thread` to avoid
    blocking the event loop, and back off briefly between retries.
    """
    kwargs: dict[str, Any] = {
        "model": _MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    last_err: Optional[Exception] = None
    for attempt in range(3):
        try:
            response = await asyncio.to_thread(_client.chat.completions.create, **kwargs)
            return response.choices[0].message.content or ""
        except Exception as e:  # noqa: BLE001 — Groq surfaces many specific subclasses
            last_err = e
            if not _is_transient(e) or attempt == 2:
                break
            await asyncio.sleep(0.6 * (2 ** attempt))
            logger.warning("Groq call retrying (attempt %d): %s", attempt + 1, e)
    assert last_err is not None
    logger.exception("Groq call failed after retries", exc_info=last_err)
    raise last_err


async def _complete(system: str, user: str, *, json_mode: bool = False, max_tokens: int = 4096) -> str:
    return await _call_groq(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        json_mode=json_mode,
        max_tokens=max_tokens,
    )


def _safe_json(text: str) -> Optional[dict]:
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fall back to extracting the first balanced JSON object.
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            return None
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            return None


# ---------------------------------------------------------------------------
# Plan generation.
# ---------------------------------------------------------------------------


_PLAN_SYSTEM = (
    "You are an expert travel planner. Today is {today}. "
    "You always reply with a single valid JSON object — no prose, no markdown. "
    "Every destination you produce must have ALL of these populated: name, "
    "description (2-3 vivid sentences), category, address (real street "
    "address), visit_date (YYYY-MM-DD), visit_time (HH:MM 24h), "
    "duration_minutes (positive integer), notes (one practical tip). "
    "Never leave a field null, empty, or 'unknown'."
)


def _plan_user_prompt(destination: str, start_date, end_date, budget, interests) -> str:
    parts = [f"Build a complete day-by-day plan for: {destination}."]
    if start_date:
        parts.append(f"Travel dates: {start_date} → {end_date or start_date}.")
    if budget:
        parts.append(f"Budget: ${budget} total.")
    if interests:
        parts.append(f"Traveler interests: {interests}.")

    parts.append(
        "\nMake the trip feel like a real human itinerary, not a checklist:\n"
        "- Fill EVERY day between start_date and end_date with 4–6 stops.\n"
        "- Mix categories across the day: morning attraction, lunch (restaurant), "
        "afternoon activity or attraction, optional cafe/other, dinner (restaurant), "
        "and an evening activity when it fits the city.\n"
        "- NEVER schedule two stops in the same category back-to-back. "
        "Especially: never two restaurants in a row.\n"
        "- Use realistic time slots — breakfast 08:00, sightseeing 10:00, "
        "lunch 12:30–13:30, afternoon 15:00, dinner 19:00, evening 21:00 — "
        "and never give two stops on the same day the same time.\n"
        "- Use real, well-known places with their true street addresses. "
        "Make sure they actually exist in the destination city.\n"
        "- Group stops geographically per day so the day flows on foot or by short transit.\n"
        "- order_index increments globally across the trip starting at 1.\n"
    )

    parts.append(
        "\nReturn JSON with exactly this shape:\n"
        '{"title": "...", "description": "...", '
        '"destination_city": "...", "destination_country": "...", '
        '"notes": "high-level travel tips for this trip", '
        '"destinations": [{'
        '"name": "...", "description": "...", '
        '"category": "accommodation|restaurant|attraction|transport|activity|other", '
        '"address": "...", "visit_date": "YYYY-MM-DD", '
        '"visit_time": "HH:MM", "duration_minutes": 90, '
        '"notes": "...", "order_index": 1}]}'
    )

    return "\n".join(parts)


async def generate_plan(
    destination: str,
    start_date: Optional[date],
    end_date: Optional[date],
    budget: Optional[float],
    interests: Optional[str],
) -> dict:
    today = date.today().isoformat()
    try:
        text = await _complete(
            system=_PLAN_SYSTEM.format(today=today),
            user=_plan_user_prompt(destination, start_date, end_date, budget, interests),
            json_mode=True,
            max_tokens=8192,
        )
    except Exception:
        logger.exception("generate_plan failed")
        return {"destinations": [], "error": "The trip planner is unavailable right now. Please try again in a moment."}

    data = _safe_json(text) or {}
    raw_dests = data.get("destinations") or []
    if isinstance(raw_dests, list):
        data["destinations"] = _enforce_variety(list(raw_dests))
    return data


# ---------------------------------------------------------------------------
# Smart chat (conversation + optional [PLAN_UPDATE]).
# ---------------------------------------------------------------------------


_CHAT_SYSTEM = """You are a friendly, expert travel-planner assistant. Today is {today}.

You see the full trip below. Each existing stop has:
  - an anchor like `Day 2 stop 3` (day number and per-day position)
  - a slot label (breakfast/morning/lunch/afternoon/dinner/evening)
  - a `<stop-id:uuid>` marker

Use the anchor + name to identify which stop the user means when they say
things like "the second stop on day 1", "the museum on Tuesday", or "the
restaurant we have for lunch on day 3".

== HOW TO REPLY ==

KEEP REPLIES SHORT. The right-side panel already shows the user every
stop's address, category, opening hours, and full description. DO NOT
repeat that data in chat. In chat, talk about places by NAME and TIME
only — like a friend, not a brochure.

Length budget:
- Yes/no or factual questions ("are you sure?", "is the Louvre included?"):
  one sentence.
- "What's on day N?" / "show me my plan": at most 5 short lines per day,
  formatted `HH:MM — Place name`. No addresses, no opening hours, no
  multi-sentence descriptions.
- Anything else: 1–3 sentences, max.

Speak about places by NAME only. Never mention UUIDs, stop-ids, JSON,
internal categories, day-date tables, or any other technical scaffolding.

If the user is ASKING about their plan ("what's on day 1?", "places I will
go on day 2", "show me Tuesday", "where am I eating?"), reply with a
compact list of times and place names. DO NOT add, change, or remove
anything. DO NOT emit `[PLAN_UPDATE]`.

If — and only if — the user clearly uses a MODIFICATION VERB (add, remove,
delete, change, move, replace, swap, edit, update, schedule, book), append
a single `[PLAN_UPDATE]` block AFTER the natural reply, containing JSON of
the changes:

[PLAN_UPDATE]
{{
  "add_destinations": [
    {{
      "name": "Real, specific place name",
      "description": "2-3 sentences describing the place and why it's worth visiting",
      "category": "accommodation|restaurant|attraction|transport|activity|other",
      "address": "Real street address",
      "visit_date": "YYYY-MM-DD",
      "visit_time": "HH:MM",
      "duration_minutes": 90,
      "notes": "Practical tip — booking, hours, transport etc.",
      "order_index": 999
    }}
  ],
  "delete_destination_ids": ["uuid-from-the-itinerary"],
  "update_destinations": [
    {{
      "id": "uuid-from-the-itinerary",
      "name": "...",
      "description": "...",
      "category": "...",
      "address": "...",
      "visit_date": "YYYY-MM-DD",
      "visit_time": "HH:MM",
      "duration_minutes": 90,
      "notes": "..."
    }}
  ]
}}
[/PLAN_UPDATE]

== STRICT RULES ==

1. ALWAYS fill every field for every add/update: name, description (2-3
   sentences), category, address (real, full street address), visit_date,
   visit_time, duration_minutes, notes. Never null, never empty, never
   "TBD".
2. Use real place names and real addresses in the trip's city/country.
3. The DAY → DATE TABLE is the only source of truth for dates. "First day"
   means whatever date sits beside `Day 1` in that table — even if Day 1 is
   currently empty. Never invent a different date.
4. When deleting or updating, copy the UUID directly from the stop's
   `<stop-id:uuid>` marker. Never invent UUIDs.
5. Honour the place the user names: if they say "add a museum on day 2 in
   the morning", the visit_date MUST be Day 2's date, the category
   `attraction`, and visit_time around 10:00–11:30. If they ask "after
   lunch", schedule it 90+ minutes after the existing lunch stop.
6. Don't double-book: never give a new stop the same visit_time as an
   existing stop on that day. Pick the nearest free 30-minute slot.
7. Don't schedule two restaurants back-to-back. If lunch is at 13:00, the
   next stop should be an attraction/activity, not another restaurant.
8. Never re-add a place that is already in the itinerary.
9. When updating, include EVERY field you want kept — fields you omit will
   be cleared.

== WHEN NOT TO USE [PLAN_UPDATE] ==

Skip the block entirely whenever the user is asking, listing, or chatting.
Examples that must NEVER produce a `[PLAN_UPDATE]`:
- "Places I will go on day 1" / "What am I doing on day 2" / "Show me my
  itinerary" / "What's on Tuesday" — list the existing stops, do not add
  anything.
- Questions about an existing stop ("what are the hours?", "tell me more
  about X", "is it kid-friendly?", "how do I get there?")
- General travel questions ("do I need a visa?", "what's the weather?")
- Suggestions without a clear add intent ("what restaurants would you
  recommend?")
- Acknowledgements ("thanks", "ok", "sounds good")

Only emit `[PLAN_UPDATE]` when the user uses an explicit modification verb:
add, remove, delete, change, move, replace, swap, edit, update, schedule,
or book.

== TONE ==

Warm, concise, specific. No bullet lists of internal fields. Never quote
the trip context back at the user. Never apologise for "I am an AI".
"""


async def smart_chat(messages: list[dict], trip=None, destinations=None) -> dict:
    last_user = next(
        (m["content"] for m in reversed(messages) if m.get("role") == "user"),
        None,
    )

    # Read-only query about the existing itinerary — answer locally without
    # the LLM. Eliminates a class of hallucinated edits and saves a request.
    if last_user and trip and not _has_modify_intent(last_user):
        deterministic = _answer_query_locally(last_user, trip, destinations or [])
        if deterministic is not None:
            return {"reply": deterministic, "modifications": None}

    system = _CHAT_SYSTEM.format(today=date.today().isoformat())
    if trip:
        system += f"\n\nCurrent trip:\n{_trip_context(trip, destinations or [])}"

    try:
        raw = await _call_groq(
            [{"role": "system", "content": system}, *messages],
            max_tokens=600,
        )
    except Exception as e:
        logger.exception("smart_chat failed")
        return {"reply": _friendly_error(e), "modifications": None}

    match = _PLAN_UPDATE_RE.search(raw)
    if not match:
        return {"reply": _sanitize_reply(raw), "modifications": None}

    block = match.group(0)
    natural = raw.replace(block, "")
    reply = _sanitize_reply(natural)

    # Hard guard: if the user did not actually use a modify verb, ignore the
    # block. The model occasionally over-eagerly emits PLAN_UPDATE for
    # informational questions.
    if last_user and not _has_modify_intent(last_user):
        logger.info("Dropping PLAN_UPDATE — user message has no modify verb: %r", last_user)
        return {"reply": reply or "Here's what's currently planned.", "modifications": None}

    json_text = re.sub(r"^\[PLAN_UPDATE\]|\[/PLAN_UPDATE\]$", "", block, flags=re.IGNORECASE | re.DOTALL).strip()
    modifications = _safe_json(json_text)

    if modifications and isinstance(modifications, dict):
        modifications = _post_process_modifications(
            modifications, trip, destinations or [], user_message=last_user
        )

    return {"reply": reply, "modifications": modifications}


_MODIFY_VERB_RE = re.compile(
    r"\b("
    r"add|adds|adding|added|"
    r"remove|removes|removing|removed|"
    r"delete|deletes|deleting|deleted|"
    r"drop|drops|dropping|dropped|"
    r"change|changes|changing|changed|"
    r"move|moves|moving|moved|"
    r"shift|shifts|shifting|shifted|"
    r"replace|replaces|replacing|replaced|"
    r"swap|swaps|swapping|swapped|"
    r"edit|edits|editing|edited|"
    r"update|updates|updating|updated|"
    r"reschedule|reschedules|rescheduled|"
    r"book|books|booking|booked|"
    r"insert|inserts|inserting|inserted|"
    r"include|includes|including|included|"
    r"put"
    r")\b",
    re.IGNORECASE,
)
_QUERY_HINT_RE = re.compile(
    r"^\s*(?:what|where|which|when|who|how|show|list|tell|do i|am i|is there|"
    r"are there|can i see|places i (?:will|am|'ll|'m))",
    re.IGNORECASE,
)


def _has_modify_intent(message: str) -> bool:
    if not message:
        return False
    if _QUERY_HINT_RE.match(message):
        return False
    return bool(_MODIFY_VERB_RE.search(message))


def _answer_query_locally(message: str, trip, destinations: Iterable) -> Optional[str]:
    """Return a deterministic answer for the common 'what's on day N' style
    question. Returns None if the question doesn't match — falls back to LLM."""
    target_date = _extract_day_from_message(message, trip)
    text = message.lower()
    asks_about_day = bool(target_date) or any(
        kw in text for kw in ("itinerary", "my plan", "my trip", "all days", "every day", "whole trip")
    )
    if not asks_about_day:
        return None

    days = _day_map(trip)
    by_date: dict[date, list] = defaultdict(list)
    for d in destinations:
        if d.visit_date is not None:
            by_date[d.visit_date].append(d)
    for stops in by_date.values():
        stops.sort(key=lambda s: (s.visit_time or time(0, 0), s.order_index or 0))

    if target_date is not None:
        return _format_day_answer(target_date, days, by_date.get(target_date, []))

    # All-days summary — one compact line per stop, nothing more.
    if not days:
        return "Your trip doesn't have a date range yet. Add start and end dates to see a day-by-day breakdown."
    blocks: list[str] = []
    for num, d in days:
        stops = by_date.get(d, [])
        if not stops:
            blocks.append(f"Day {num} ({d.strftime('%a %d %b')}): nothing planned yet.")
            continue
        lines = [f"Day {num} ({d.strftime('%a %d %b')}):"]
        for s in stops:
            lines.append(f"  • {_format_stop_line(s)}")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def _format_day_answer(target: date, days: list[tuple[int, date]], stops: list) -> str:
    num = next((n for n, d in days if d == target), None)
    label = f"Day {num} ({target.strftime('%a %d %b')})" if num else target.strftime('%a %d %b')
    if not stops:
        return f"{label} is empty. Tell me what to add and I'll schedule it."
    lines = [f"{label}:"]
    for s in stops:
        lines.append(f"  • {_format_stop_line(s)}")
    return "\n".join(lines)


def _format_stop_line(s) -> str:
    t = s.visit_time.strftime("%H:%M") if s.visit_time else "anytime"
    return f"{t} — {s.name}"


def _friendly_error(err: Exception) -> str:
    status = getattr(err, "status_code", None) or getattr(err, "status", None)
    if status == 429:
        return "I'm getting a lot of requests right now — give me a few seconds and try again."
    if isinstance(status, int) and 500 <= status < 600:
        return "The travel-AI service is having a hiccup. Please try again in a moment."
    name = type(err).__name__.lower()
    if "timeout" in name or "connection" in name:
        return "I couldn't reach the AI service. Check your connection and try again."
    return "Something went wrong on my side. Please try again — I'll keep your trip as is."


# ---------------------------------------------------------------------------
# One-shot natural-language trip update.
# ---------------------------------------------------------------------------


_UPDATE_SYSTEM = (
    "You are an expert travel-planning assistant. Today is {today}. "
    "Reply with a single valid JSON object only. No prose, no markdown, "
    "no UUIDs in chat. Use real place names and real addresses. Every "
    "destination you add or update must include name, description (2-3 "
    "sentences), category, address, visit_date (YYYY-MM-DD), visit_time "
    "(HH:MM 24h), duration_minutes, and notes — never empty or null."
)


async def update_trip_from_instruction(instruction: str, trip, destinations) -> dict:
    today = date.today().isoformat()
    user_prompt = (
        f"Current trip:\n{_trip_context(trip, destinations)}\n\n"
        f"User instruction: {instruction}\n\n"
        "Apply the instruction. Return JSON with only the keys that have "
        "changes. For every destination you add or update, fill EVERY field "
        "(name, description, category, address, visit_date, visit_time, "
        "duration_minutes, notes). Use real addresses. Place new stops on "
        "the SAME day and time-slot the user mentioned, and avoid two "
        "restaurants back-to-back.\n\n"
        '{"trip_updates": {}, '
        '"add_destinations": [{"name": "...", "description": "...", "category": "...", '
        '"address": "...", "visit_date": "YYYY-MM-DD", "visit_time": "HH:MM", '
        '"duration_minutes": 90, "notes": "..."}], '
        '"update_destinations": [{"id": "uuid-from-itinerary", "name": "...", '
        '"description": "...", "category": "...", "address": "...", '
        '"visit_date": "YYYY-MM-DD", "visit_time": "HH:MM", '
        '"duration_minutes": 90, "notes": "..."}], '
        '"delete_destination_ids": []}'
    )

    try:
        text = await _complete(
            system=_UPDATE_SYSTEM.format(today=today),
            user=user_prompt,
            json_mode=True,
        )
    except Exception:
        logger.exception("update_trip_from_instruction failed")
        return {
            "trip_updates": {},
            "add_destinations": [],
            "update_destinations": [],
            "delete_destination_ids": [],
            "error": "The AI update service is unavailable right now. Please try again in a moment.",
        }

    data = _safe_json(text) or {}
    return _post_process_modifications(data, trip, destinations, user_message=instruction)


# ---------------------------------------------------------------------------
# Modification post-processing — fills incomplete records before the router
# writes them. The router still does its own type coercion.
# ---------------------------------------------------------------------------


def _post_process_modifications(
    mods: dict,
    trip,
    destinations: Iterable,
    user_message: Optional[str] = None,
) -> dict:
    dests_list = list(destinations)
    forced_date = _extract_day_from_message(user_message, trip) if user_message else None

    add = mods.get("add_destinations") or []
    upd = mods.get("update_destinations") or []

    if isinstance(add, list):
        ensured = []
        for d in add:
            if not isinstance(d, dict):
                continue
            if forced_date is not None:
                d["visit_date"] = forced_date  # override the model — user was explicit
            ensured.append(_ensure_full_destination(d, trip, dests_list))
        ensured = _enforce_variety(ensured)
        mods["add_destinations"] = ensured

    if isinstance(upd, list):
        cleaned = []
        for d in upd:
            if not isinstance(d, dict) or not d.get("id"):
                continue
            if forced_date is not None and not d.get("visit_date"):
                d["visit_date"] = forced_date
            ensured = _ensure_full_destination(d, trip, dests_list)
            ensured["id"] = d["id"]
            cleaned.append(ensured)
        mods["update_destinations"] = cleaned

    delete_ids = mods.get("delete_destination_ids") or []
    if isinstance(delete_ids, list):
        mods["delete_destination_ids"] = [str(x) for x in delete_ids if x]

    return mods


# ---------------------------------------------------------------------------
# Day-reference extraction. The model occasionally drifts off the user's
# stated day (e.g. interpreting "1 day" as "the next empty day"). When the
# user is explicit, we force the date in post-processing.
# ---------------------------------------------------------------------------


_WORD_TO_NUM = {
    "first": 1, "1st": 1, "one": 1,
    "second": 2, "2nd": 2, "two": 2,
    "third": 3, "3rd": 3, "three": 3,
    "fourth": 4, "4th": 4, "four": 4,
    "fifth": 5, "5th": 5, "five": 5,
    "sixth": 6, "6th": 6, "six": 6,
    "seventh": 7, "7th": 7, "seven": 7,
    "eighth": 8, "8th": 8, "eight": 8,
    "ninth": 9, "9th": 9, "nine": 9,
    "tenth": 10, "10th": 10, "ten": 10,
}

# Matches: "day 1", "day one", "1 day", "first day", "1st day", "on day 2",
# "the second day", "day-3". Captures the day token in group 1 or 2.
_DAY_REF_RE = re.compile(
    r"\b(?:on\s+)?(?:the\s+)?"
    r"(?:day[\s\-]*(\d+|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|one|two|three|four|five|six|seven|eight|nine|ten)"
    r"|(\d+|first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|ninth|9th|tenth|10th)[\s\-]+day)"
    r"\b",
    re.IGNORECASE,
)
_LAST_DAY_RE = re.compile(r"\b(?:on\s+)?(?:the\s+)?last\s+day\b", re.IGNORECASE)


def _extract_day_from_message(message: Optional[str], trip) -> Optional[date]:
    if not message or not trip or not getattr(trip, "start_date", None):
        return None
    days = _day_map(trip)
    if not days:
        return None

    text = message.strip()

    if _LAST_DAY_RE.search(text):
        return days[-1][1]

    match = _DAY_REF_RE.search(text)
    if not match:
        return None

    token = (match.group(1) or match.group(2) or "").lower()
    if token.isdigit():
        n = int(token)
    else:
        n = _WORD_TO_NUM.get(token)
        if n is None:
            return None

    if 1 <= n <= len(days):
        return days[n - 1][1]
    return None
