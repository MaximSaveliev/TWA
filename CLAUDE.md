# Trip Planner — Project Guidelines

## Tech Stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy (async), Alembic, asyncpg, PostgreSQL
- **Frontend**: Next.js (App Router), TypeScript, shadcn/ui, axios, @hello-pangea/dnd, next-themes
- **Auth**: JWT (HS256, 30-min expiry) via PyJWT; passwords hashed with passlib[bcrypt]
- **AI**: Groq API (`llama-3.3-70b-versatile`) for plan generation and chat-driven itinerary edits
- **Infra**: Docker + docker-compose, Render.com (render.yaml)

## Folder Structure
```
tripplanner/
├── CLAUDE.md
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── render.yaml
│   ├── alembic/
│   └── app/
│       ├── main.py         — FastAPI app, lifespan, CORS, router inclusion
│       ├── config.py       — pydantic-settings Settings
│       ├── database.py     — engine, SessionLocal, Base, get_db
│       ├── dependencies.py — get_current_user, get_owned_trip
│       ├── models/         — SQLAlchemy ORM models (Mapped/mapped_column)
│       ├── schemas/        — Pydantic request/response schemas
│       ├── routers/        — Thin FastAPI routers
│       └── services/       — Business logic + DB queries
└── frontend/
    └── (app/, components/, lib/, types/)
```

## API Conventions
- Base path: `/api/`
- Auth: `Authorization: Bearer <token>` header on protected routes
- Error format: `{"detail": "message"}`
- Ownership: return 403 (not 404) when a user accesses another user's resource
- Success creates: 201; deletes: 204

## Code Style
- No unnecessary comments; only when WHY is non-obvious
- Routers stay thin; services handle DB queries
- Schemas separate request (Create/Update/Patch) from response types
- Frontend: extract shared logic to `lib/`, keep components focused

## Database
- PostgreSQL via SQLAlchemy async (`asyncpg`)
- All PKs are UUID (server-generated)
- Migrations via Alembic (`alembic upgrade head` on deploy)

## Environment Variables
- Backend: `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `TOKEN_EXPIRE_MINUTES`, `GROQ_API_KEY`, `FRONTEND_URL`
- Frontend: `NEXT_PUBLIC_API_URL`
- Never commit `.env` files

## Docker
- All services defined in root `docker-compose.yml`
- Run `docker-compose up --build` to start everything locally
