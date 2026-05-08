from datetime import date
from typing import Iterable, Literal

from .models import Task, TaskPriority, TaskStatus


SortKey = Literal["due_date", "priority", "title", "created_at"]

PRIORITY_WEIGHT = {
    TaskPriority.HIGH: 0,
    TaskPriority.MEDIUM: 1,
    TaskPriority.LOW: 2,
}


def is_overdue(task: Task, today: date | None = None) -> bool:
    if task.due_date is None or task.status == TaskStatus.DONE:
        return False

    return task.due_date < (today or date.today())


def filter_tasks(
    tasks: Iterable[Task],
    *,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    label: str | None = None,
    overdue: bool = False,
    search: str | None = None,
    today: date | None = None,
) -> list[Task]:
    normalized_search = search.strip().lower() if search else ""
    normalized_label = label.strip().lower() if label else ""

    results: list[Task] = []
    for task in tasks:
        if status is not None and task.status != status:
            continue
        if priority is not None and task.priority != priority:
            continue
        if normalized_label and normalized_label not in {item.lower() for item in task.labels}:
            continue
        if overdue and not is_overdue(task, today=today):
            continue
        if normalized_search:
            haystack = f"{task.title} {task.description}".lower()
            if normalized_search not in haystack:
                continue
        results.append(task)

    return results


def sort_tasks(tasks: Iterable[Task], sort_by: SortKey = "due_date") -> list[Task]:
    if sort_by == "priority":
        return sorted(tasks, key=lambda task: (PRIORITY_WEIGHT[task.priority], task.due_date or date.max, task.title.lower()))
    if sort_by == "title":
        return sorted(tasks, key=lambda task: task.title.lower())
    if sort_by == "created_at":
        return sorted(tasks, key=lambda task: task.created_at, reverse=True)

    return sorted(tasks, key=lambda task: (task.due_date or date.max, PRIORITY_WEIGHT[task.priority], task.title.lower()))
