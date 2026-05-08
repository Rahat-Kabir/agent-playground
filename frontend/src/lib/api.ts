import type { Task } from "../types";

type ApiTask = Omit<Task, "dueDate" | "createdAt"> & {
  due_date: string | null;
  created_at: string;
};

export async function fetchSeedTasks(): Promise<Task[]> {
  const response = await fetch("/api/tasks");
  if (!response.ok) {
    throw new Error("Unable to load API seed tasks");
  }

  const tasks = (await response.json()) as ApiTask[];
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date ?? "",
    labels: task.labels,
    createdAt: task.created_at
  }));
}
