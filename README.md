# TripPlanner

> Fiecare călătorie, planificată perfect.

**Demo live: [tripplanner-usv-suceava.onrender.com](https://tripplanner-usv-suceava.onrender.com)**

<p align="center">
  <img src="screenshots/qrcode.png" alt="QR Code" width="160"/>
</p>

TripPlanner este o aplicație web de planificare a călătoriilor alimentată de inteligență artificială. Descrie excursia visurilor tale în limbaj natural și aplicația construiește pentru tine un itinerar detaliat zi cu zi — complet cu hoteluri, restaurante, atracții și activități. Poți rafina fiecare oprire printr-un chat AI conversațional, gestiona mai multe călătorii și urmări toate planurile de travel într-un singur loc.

---

## Capturi de ecran

### Pagina principală
![Pagina principală](screenshots/01-landing.png)

### Autentificare
![Autentificare](screenshots/02-signin.png)

### Tabloul de bord al călătoriilor
![Tabloul de bord](screenshots/03-dashboard.png)

### Chat AI cu itinerariu live
![Chat AI](screenshots/05-ai-chat.png)
![Chat AI](screenshots/07-chat.png)

### Detalii călătorie și itinerariu
![Detalii călătorie](screenshots/06-trip-detail.png)

### Setări profil
![Setări profil](screenshots/04-profile.png)

---

## Funcționalități

- **Generare itinerar cu AI** — descrie o destinație, date și buget; modelul Groq LLM generează un plan structurat zi cu zi cu opriri, ore și adrese
- **Rafinare conversațională** — discută cu AI pentru a pune întrebări despre opriri, schimba locații sau solicita alternative fără a părăsi pagina
- **Panou de itinerar live** — itinerarul se actualizează în timp real alături de chat; fiecare oprire afișează categorie, interval orar, adresă și descriere
- **Gestionare călătorii** — creează, editează și șterge călătorii; statusuri: Ciornă / Activ / Finalizat
- **Elemente salvate** — marchează opriri interesante din orice călătorie
- **Adaugă/elimină opriri** — adaugă opriri manual sau lasă AI-ul să le insereze în context
- **Mod întunecat** — comutator complet luminos/întunecat, persistent între sesiuni
- **Autentificare** — înregistrare și autentificare bazate pe JWT; setări profil (email, nume de utilizator, parolă)

---

## Stivă tehnologică

### Frontend

| Tehnologie | Rol |
|---|---|
| [Next.js 16](https://nextjs.org/) (App Router) | Framework React, SSR, output standalone |
| [React 19](https://react.dev/) | Bibliotecă UI |
| [TypeScript](https://www.typescriptlang.org/) | Tipizare statică |
| [Tailwind CSS v4](https://tailwindcss.com/) | Stilizare utility-first |
| [shadcn/ui](https://ui.shadcn.com/) | Componente UI accesibile |
| [next-themes](https://github.com/pacocoursey/next-themes) | Mod întunecat/luminos |
| [Axios](https://axios-http.com/) | Client HTTP pentru apeluri API |
| [Lucide React](https://lucide.dev/) | Bibliotecă de iconițe |
| [date-fns](https://date-fns.org/) | Formatare date |
| [react-day-picker](https://react-day-picker.js.org/) | Selector interval de date |
| [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) | Drag-and-drop pentru reordonarea itinerarului |

### Backend

| Tehnologie | Rol |
|---|---|
| [Python 3](https://www.python.org/) | Runtime |
| [FastAPI](https://fastapi.tiangolo.com/) | Framework REST API |
| [SQLAlchemy 2](https://www.sqlalchemy.org/) | ORM (async) |
| [Alembic](https://alembic.sqlalchemy.org/) | Migrări bază de date |
| [asyncpg](https://github.com/MagicStack/asyncpg) | Driver async PostgreSQL |
| [Groq SDK](https://console.groq.com/) | Inferență LLM (generare itinerar și chat) |
| [PyJWT](https://pyjwt.readthedocs.io/) + [passlib/bcrypt](https://passlib.readthedocs.io/) | Autentificare JWT și criptare parole |
| [Pydantic v2](https://docs.pydantic.dev/) | Validare cereri/răspunsuri |
| [Uvicorn](https://www.uvicorn.org/) | Server ASGI |

### Bază de date

| Tehnologie | Rol |
|---|---|
| [PostgreSQL](https://www.postgresql.org/) | Bază de date relațională principală |

### Hosting

| Serviciu | Scop |
|---|---|
| [Render](https://render.com/) | Găzduire — serviciu web backend + serviciu web frontend + PostgreSQL gestionat |

---

## Arhitectură

```
Browser
  │
  ▼
Next.js Frontend
  │  Apeluri REST API (Axios)
  │  NEXT_PUBLIC_API_URL
  ▼
FastAPI Backend
  │  SQLAlchemy / asyncpg
  │  DATABASE_URL
  ▼
PostgreSQL

FastAPI Backend
  │  Groq SDK
  │  GROQ_API_KEY
  ▼
Groq LLM API (extern)
```

Frontend-ul este un server Next.js standalone (nu un export static), astfel încât componentele server și proxy-ul API funcționează la runtime. Backend-ul expune un REST API consumat de frontend prin `NEXT_PUBLIC_API_URL`. CORS este restricționat la originea frontend-ului prin `FRONTEND_URL`.

---

## Dezvoltare locală

### Cerințe prealabile

- Node.js 20+
- Python 3.11+
- PostgreSQL rulând local (sau un connection string)
- O [cheie API Groq](https://console.groq.com/)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# creează .env
cp .env.example .env   # completează valorile

alembic upgrade head
uvicorn app.main:app --reload
```

Backend-ul rulează la `http://localhost:8000`. Documentație interactivă la `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install

# creează .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

Frontend-ul rulează la `http://localhost:3000`.

### Variabile de mediu

#### Backend `.env`

| Variabilă | Descriere |
|---|---|
| `DATABASE_URL` | String de conexiune PostgreSQL |
| `SECRET_KEY` | Secret pentru semnarea JWT (orice șir lung aleatoriu) |
| `ALGORITHM` | Algoritm JWT — `HS256` |
| `TOKEN_EXPIRE_MINUTES` | Durata de viață a token-ului de acces în minute |
| `GROQ_API_KEY` | Cheia ta API Groq |
| `FRONTEND_URL` | Originea frontend-ului pentru CORS (ex. `http://localhost:3000`) |

#### Frontend `.env.local`

| Variabilă | Descriere |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL-ul de bază al API-ului backend |

---

## Licență

[MIT](LICENSE) — vezi fișierul LICENSE pentru detalii.
