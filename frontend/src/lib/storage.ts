import { mockTasks } from "../data/mockTasks";
import type { Task } from "../types";

const STORAGE_KEY = "ledgerly.tasks.v1";

export function loadTasks(): Task[] {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return mockTasks;
  }

  try {
    return JSON.parse(saved) as Task[];
  } catch {
    return mockTasks;
  }
}

export function saveTasks(tasks: Task[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function resetTasks(): Task[] {
  window.localStorage.removeItem(STORAGE_KEY);
  return mockTasks;
}
