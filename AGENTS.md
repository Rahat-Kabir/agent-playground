# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Ledgerly Task Tracker is a monorepo with two services:

| Service | Directory | Tech | Dev Command |
|---------|-----------|------|-------------|
| Backend API | `backend/` | FastAPI + Pydantic (Python 3.11+) | `uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` |
| Frontend SPA | `frontend/` | React 19 + Vite 8 (TypeScript) | `npm run dev` |

### Running services

- **Backend** listens on port 8000. The frontend Vite dev server proxies `/api` and `/health` to it.
- **Frontend** Vite dev server listens on port 5173.
- Both must run for full end-to-end testing; the frontend alone works for localStorage-only features.

### Gotchas

- `npm install` in `frontend/` requires `--force` because `package.json` lists win32-only optional dependencies (`@rolldown/binding-win32-x64-msvc`, `lightningcss-win32-x64-msvc`) that fail platform checks on Linux.
- `uv` must be on PATH. It installs to `$HOME/.local/bin`. The update script handles installation if missing.
- No environment variables are required; all config (ports, CORS origins) is hardcoded.
- The backend uses an in-memory data store (no database). Data resets on every restart.

### Testing & Linting

See `README.md` for standard commands:
- Backend tests: `cd backend && uv run pytest`
- Frontend tests: `cd frontend && npm test`
- Frontend build (includes TypeScript checking): `cd frontend && npm run build`
- No separate lint command is configured; `tsc -b` (part of `npm run build`) serves as the type checker.
