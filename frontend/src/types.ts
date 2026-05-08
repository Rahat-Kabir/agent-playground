export type TaskStatus = "todo" | "in-progress" | "done";

export type TaskPriority = "low" | "medium" | "high";

export type SortKey = "due_date" | "priority" | "title" | "created_at";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  labels: string[];
  createdAt: string;
}

export interface TaskFilters {
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  label: string;
  overdueOnly: boolean;
  search: string;
  sortBy: SortKey;
}
