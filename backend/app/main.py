from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .mock_data import make_mock_tasks
from .models import Task, TaskCreate, TaskPriority, TaskStatus, TaskUpdate
from .task_service import SortKey, filter_tasks, sort_tasks

app = FastAPI(title="Ledgerly Task Tracker", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TASKS: list[Task] = make_mock_tasks()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tasks", response_model=list[Task])
def list_tasks(
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    label: str | None = None,
    overdue: bool = False,
    search: str | None = None,
    sort_by: SortKey = Query(default="due_date"),
) -> list[Task]:
    return sort_tasks(
        filter_tasks(
            TASKS,
            status=status,
            priority=priority,
            label=label,
            overdue=overdue,
            search=search,
        ),
        sort_by=sort_by,
    )


@app.post("/api/tasks", response_model=Task, status_code=201)
def create_task(task: TaskCreate) -> Task:
    created = Task(**task.model_dump())
    TASKS.append(created)
    return created


@app.put("/api/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, update: TaskUpdate) -> Task:
    task = _find_task(task_id)
    update_data = update.model_dump(exclude_unset=True)
    updated = task.model_copy(update=update_data)

    TASKS[TASKS.index(task)] = updated
    return updated


@app.post("/api/tasks/{task_id}/complete", response_model=Task)
def complete_task(task_id: str) -> Task:
    task = _find_task(task_id)
    completed = task.model_copy(update={"status": TaskStatus.DONE})

    TASKS[TASKS.index(task)] = completed
    return completed


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: str) -> None:
    task = _find_task(task_id)
    TASKS.remove(task)


def _find_task(task_id: str) -> Task:
    for task in TASKS:
        if task.id == task_id:
            return task

    raise HTTPException(status_code=404, detail="Task not found")
