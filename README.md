# vibecodemeetup001

A minimal Meetup-style platform focused on vibe coding events, hack nights, and builder sessions.

## Stack
- Frontend: React + Vite
- Backend: FastAPI + SQLModel
- Auth: Supabase Auth (JWT)

## Local Development

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set these in `backend/.env`:
- `SUPABASE_JWT_SECRET` from your Supabase project (Settings → API → JWT Secret)
- `ADMIN_EMAILS` (comma-separated emails to auto-promote to admin on first login)
- Optional: set `AUTH_DISABLED=true` to bypass auth locally
- Optional: set `DEFAULT_ROLE=organizer` if you want dev users to create events

Run the API:

```bash
uvicorn app.main:app --reload
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Set these in `frontend/.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (default `http://localhost:8000`)
- `VITE_AUTH_DISABLED` set to `true` when backend `AUTH_DISABLED=true`

If you're running with `AUTH_DISABLED=true`, set `VITE_AUTH_DISABLED=true` and you can leave the Supabase vars blank for local testing.

Run the app:

```bash
npm run dev
```

## Roles
- New users default to `attendee`.
- Add your email to `ADMIN_EMAILS` so your first login becomes `admin`.
- Admins can promote other users on the Profile page.

## Avatars
- Profiles get a deterministic fun avatar ([DiceBear](https://www.dicebear.com/) lorelei style) by default; the URL is stored in the profile. You can override it with a custom Avatar URL on the Profile page.

## Vercel Deployment
- Deploy `frontend/` as a Vercel project (React build).
- Deploy `backend/` as a separate service (FastAPI) and point `VITE_API_BASE_URL` at it.

If you want everything in one Vercel project, I can convert the backend to Vercel serverless functions.
