# Ledgerly Task Tracker

A small personal task tracker with a FastAPI/Pydantic backend and a React/Vite frontend. The UI uses a retro desk-ledger style, and task data stays simple: the browser writes to `localStorage`, while the API exposes in-memory mock tasks and CRUD endpoints.

## Features

- Create, edit, delete, and complete tasks.
- Track title, description, status, priority, due date, and labels.
- Filter by status, priority, label, and overdue tasks.
- Search task titles and descriptions.
- Sort by due date, priority, title, or newest.
- Load mock seed tasks from the FastAPI server or reset browser-local data.
- Optional desktop notifications for open tasks due today (once per task per day).
- Light, dark, or system-matched color theme (Desk lamp control).
- Export and import the browser ledger as JSON for backup or device moves.

## Project Structure

```text
backend/
  pyproject.toml     uv project configuration
  app/
    main.py          FastAPI app and routes
    models.py        Pydantic task models
    task_service.py  filtering, sorting, overdue helpers
    mock_data.py     in-memory sample tasks
  tests/
    test_task_service.py
frontend/
  src/
    App.tsx
    data/mockTasks.ts
    lib/taskLogic.ts
    lib/storage.ts
    lib/ledgerExport.ts
    lib/api.ts
    styles.css
```

## Install

Backend:

```bash
cd backend
uv sync
```

Frontend:

```bash
cd frontend
npm install
```

## Run

Start the API:

```bash
cd backend
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the web UI in a second terminal:

```bash
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173`. The frontend proxies `/api` requests to `http://127.0.0.1:8000`.

## Test And Build

Backend tests:

```bash
cd backend
uv run pytest
```

Frontend tests and production build:

```bash
cd frontend
npm test
npm run build
```

## Usage Notes

Tasks are saved in browser `localStorage`, so refreshing keeps your cards. Use `Reset local` to restore the bundled sample cards, or `Load API sample` to pull the FastAPI mock tasks into localStorage.

Enable **Due-date reminders** in the filter bar to receive one desktop notification per open task on its due date. The browser will ask for notification permission the first time you turn reminders on. Reminders re-check about once a minute while the page stays open.

Use **Desk lamp** in the hero section to switch between day ledger (light), night ledger (dark), or match your OS theme. The choice is saved in `localStorage`.

Use **Export JSON** to download your current cards as a `ledgerly-tasks-YYYY-MM-DD.json` file. Use **Import JSON** to replace the in-browser ledger with a previously exported file (or any compatible task array). Imported tasks are validated before they replace local data.
