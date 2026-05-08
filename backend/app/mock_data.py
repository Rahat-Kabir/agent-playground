from datetime import date, timedelta

from .models import Task, TaskPriority, TaskStatus


def make_mock_tasks() -> list[Task]:
    today = date.today()

    return [
        Task(
            title="Polish brass desk lamp",
            description="Dust the shade and replace the warm bulb before Friday reading hour.",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
            due_date=today + timedelta(days=3),
            labels=["home", "ritual"],
        ),
        Task(
            title="Mail rent cheque",
            description="Drop it in the post box after work.",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.HIGH,
            due_date=today - timedelta(days=1),
            labels=["finance", "errand"],
        ),
        Task(
            title="Archive photo negatives",
            description="Sort the 1998 summer roll and label the envelope.",
            status=TaskStatus.TODO,
            priority=TaskPriority.LOW,
            due_date=today + timedelta(days=8),
            labels=["personal", "archive"],
        ),
        Task(
            title="Complete Sunday menu",
            description="Pick two vegetables and write the shopping card.",
            status=TaskStatus.DONE,
            priority=TaskPriority.MEDIUM,
            due_date=today - timedelta(days=2),
            labels=["food", "home"],
        ),
    ]
