import type { Task } from "../types";

const today = new Date();
const toDateInput = (daysFromNow: number) => {
  const date = new Date(today);
  date.setDate(today.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
};

export const mockTasks: Task[] = [
  {
    id: "task-brass-lamp",
    title: "Polish brass desk lamp",
    description: "Dust the shade and replace the warm bulb before Friday reading hour.",
    status: "todo",
    priority: "medium",
    dueDate: toDateInput(3),
    labels: ["home", "ritual"],
    createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: "task-rent-cheque",
    title: "Mail rent cheque",
    description: "Drop it in the corner post box after work.",
    status: "in-progress",
    priority: "high",
    dueDate: toDateInput(-1),
    labels: ["finance", "errand"],
    createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString()
  },
  {
    id: "task-negatives",
    title: "Archive photo negatives",
    description: "Sort the 1998 summer roll and label the envelope.",
    status: "todo",
    priority: "low",
    dueDate: toDateInput(8),
    labels: ["personal", "archive"],
    createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 9).toISOString()
  },
  {
    id: "task-menu",
    title: "Complete Sunday menu",
    description: "Pick two vegetables and write the shopping card.",
    status: "done",
    priority: "medium",
    dueDate: toDateInput(-2),
    labels: ["food", "home"],
    createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 1).toISOString()
  }
];
