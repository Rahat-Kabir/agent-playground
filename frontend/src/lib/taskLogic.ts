import type { SortKey, Task, TaskFilters, TaskPriority } from "../types";

const priorityWeight: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

export function isOverdue(task: Task, today = new Date()): boolean {
  if (!task.dueDate || task.status === "done") {
    return false;
  }

  return parseDate(task.dueDate) < startOfDay(today);
}

export function isDueToday(task: Task, today = new Date()): boolean {
  if (!task.dueDate || task.status === "done") {
    return false;
  }

  return parseDate(task.dueDate).getTime() === startOfDay(today).getTime();
}

export function isDueThisWeek(task: Task, today = new Date()): boolean {
  if (!task.dueDate || task.status === "done") {
    return false;
  }

  const dueDate = parseDate(task.dueDate);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(weekStart);

  return dueDate >= weekStart && dueDate <= weekEnd;
}

export function filterTasks(tasks: Task[], filters: TaskFilters, today = new Date()): Task[] {
  const query = filters.search.trim().toLowerCase();
  const label = filters.label.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.status !== "all" && task.status !== filters.status) {
      return false;
    }
    if (filters.priority !== "all" && task.priority !== filters.priority) {
      return false;
    }
    if (label && !task.labels.some((item) => item.toLowerCase() === label)) {
      return false;
    }
    if (filters.dueWindow === "today" && !isDueToday(task, today)) {
      return false;
    }
    if (filters.dueWindow === "this_week" && !isDueThisWeek(task, today)) {
      return false;
    }
    if (filters.overdueOnly && !isOverdue(task, today)) {
      return false;
    }
    if (query) {
      const haystack = `${task.title} ${task.description}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export function sortTasks(tasks: Task[], sortBy: SortKey): Task[] {
  const sorted = [...tasks];

  if (sortBy === "priority") {
    return sorted.sort((a, b) => {
      const priorityDelta = priorityWeight[a.priority] - priorityWeight[b.priority];
      return priorityDelta || dateValue(a.dueDate) - dateValue(b.dueDate) || a.title.localeCompare(b.title);
    });
  }

  if (sortBy === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sortBy === "created_at") {
    return sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  return sorted.sort((a, b) => {
    const dateDelta = dateValue(a.dueDate) - dateValue(b.dueDate);
    return dateDelta || priorityWeight[a.priority] - priorityWeight[b.priority] || a.title.localeCompare(b.title);
  });
}

export function visibleTasks(tasks: Task[], filters: TaskFilters, today = new Date()): Task[] {
  return sortTasks(filterTasks(tasks, filters, today), filters.sortBy);
}

export function collectLabels(tasks: Task[]): string[] {
  return Array.from(new Set(tasks.flatMap((task) => task.labels.map((label) => label.trim()).filter(Boolean)))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function parseLabels(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((label) => label.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function dateValue(value: string): number {
  return value ? parseDate(value).getTime() : Number.MAX_SAFE_INTEGER;
}

/** Monday-based calendar week (Monday 00:00 through Sunday 23:59:59.999). */
function startOfWeek(date: Date): Date {
  const dayStart = startOfDay(date);
  const weekday = dayStart.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;

  return new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() - daysFromMonday);
}

function endOfWeek(weekStart: Date): Date {
  return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59, 999);
}
