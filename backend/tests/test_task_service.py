from datetime import date, datetime

from app.models import Task, TaskPriority, TaskStatus
from app.task_service import filter_tasks, is_overdue, sort_tasks


def make_task(
    title: str,
    *,
    description: str = "",
    status: TaskStatus = TaskStatus.TODO,
    priority: TaskPriority = TaskPriority.MEDIUM,
    due_date: date | None = None,
    labels: list[str] | None = None,
) -> Task:
    return Task(
        title=title,
        description=description,
        status=status,
        priority=priority,
        due_date=due_date,
        labels=labels or [],
        created_at=datetime(2026, 5, 1, 10, 0),
    )


def test_filters_by_status_priority_label_and_overdue() -> None:
    today = date(2026, 5, 9)
    tasks = [
        make_task("Pay rent", status=TaskStatus.TODO, priority=TaskPriority.HIGH, due_date=date(2026, 5, 8), labels=["finance"]),
        make_task("Plan menu", status=TaskStatus.DONE, priority=TaskPriority.HIGH, due_date=date(2026, 5, 7), labels=["home"]),
        make_task("Read book", status=TaskStatus.TODO, priority=TaskPriority.LOW, due_date=date(2026, 5, 12), labels=["home"]),
    ]

    result = filter_tasks(
        tasks,
        status=TaskStatus.TODO,
        priority=TaskPriority.HIGH,
        label="finance",
        overdue=True,
        today=today,
    )

    assert [task.title for task in result] == ["Pay rent"]


def test_search_checks_title_and_description_case_insensitively() -> None:
    tasks = [
        make_task("Fix typewriter", description="Order ribbon ink"),
        make_task("Garden notes", description="Water tomato starts"),
    ]

    result = filter_tasks(tasks, search="RIBBON")

    assert [task.title for task in result] == ["Fix typewriter"]


def test_sort_by_priority_then_due_date() -> None:
    tasks = [
        make_task("Low soon", priority=TaskPriority.LOW, due_date=date(2026, 5, 10)),
        make_task("High later", priority=TaskPriority.HIGH, due_date=date(2026, 5, 20)),
        make_task("High soon", priority=TaskPriority.HIGH, due_date=date(2026, 5, 9)),
    ]

    result = sort_tasks(tasks, sort_by="priority")

    assert [task.title for task in result] == ["High soon", "High later", "Low soon"]


def test_overdue_ignores_completed_and_missing_due_dates() -> None:
    today = date(2026, 5, 9)

    assert is_overdue(make_task("Late", due_date=date(2026, 5, 8)), today=today)
    assert not is_overdue(make_task("Done late", status=TaskStatus.DONE, due_date=date(2026, 5, 8)), today=today)
    assert not is_overdue(make_task("No due date"), today=today)
