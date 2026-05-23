import { describe, expect, it } from "vitest";

import { filterTasks, isDueToday, isOverdue, parseLabels, sortTasks, visibleTasks } from "./taskLogic";
import type { Task, TaskFilters } from "../types";

const baseFilters: TaskFilters = {
  status: "all",
  priority: "all",
  label: "",
  overdueOnly: false,
  search: "",
  sortBy: "due_date"
};

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? "task-id",
    title: overrides.title ?? "Untitled",
    description: overrides.description ?? "",
    status: overrides.status ?? "todo",
    priority: overrides.priority ?? "medium",
    dueDate: overrides.dueDate ?? "",
    labels: overrides.labels ?? [],
    createdAt: overrides.createdAt ?? "2026-05-01T10:00:00.000Z"
  };
}

describe("task logic", () => {
  it("detects overdue tasks without marking completed cards overdue", () => {
    const today = new Date("2026-05-09T12:00:00");

    expect(isOverdue(makeTask({ dueDate: "2026-05-08" }), today)).toBe(true);
    expect(isOverdue(makeTask({ dueDate: "2026-05-08", status: "done" }), today)).toBe(false);
    expect(isOverdue(makeTask({ dueDate: "" }), today)).toBe(false);
  });

  it("detects tasks due today without flagging other dates", () => {
    const today = new Date("2026-05-09T12:00:00");

    expect(isDueToday(makeTask({ dueDate: "2026-05-09" }), today)).toBe(true);
    expect(isDueToday(makeTask({ dueDate: "2026-05-10" }), today)).toBe(false);
    expect(isDueToday(makeTask({ dueDate: "2026-05-09", status: "done" }), today)).toBe(false);
  });

  it("filters by status, priority, label, overdue state, and search", () => {
    const today = new Date("2026-05-09T12:00:00");
    const tasks = [
      makeTask({
        title: "Mail rent cheque",
        description: "Use the red post box",
        status: "todo",
        priority: "high",
        dueDate: "2026-05-08",
        labels: ["finance", "errand"]
      }),
      makeTask({
        title: "Plan menu",
        status: "done",
        priority: "high",
        dueDate: "2026-05-07",
        labels: ["home"]
      }),
      makeTask({
        title: "Dust shelves",
        status: "todo",
        priority: "low",
        dueDate: "2026-05-10",
        labels: ["home"]
      })
    ];

    const result = filterTasks(
      tasks,
      {
        ...baseFilters,
        status: "todo",
        priority: "high",
        label: "finance",
        overdueOnly: true,
        search: "post"
      },
      today
    );

    expect(result.map((task) => task.title)).toEqual(["Mail rent cheque"]);
  });

  it("sorts by priority and due date", () => {
    const tasks = [
      makeTask({ title: "Low soon", priority: "low", dueDate: "2026-05-10" }),
      makeTask({ title: "High later", priority: "high", dueDate: "2026-05-20" }),
      makeTask({ title: "High soon", priority: "high", dueDate: "2026-05-09" })
    ];

    expect(sortTasks(tasks, "priority").map((task) => task.title)).toEqual(["High soon", "High later", "Low soon"]);
  });

  it("combines search and sorting for visible tasks", () => {
    const tasks = [
      makeTask({ title: "Archive photo negatives", description: "label the envelope", dueDate: "2026-05-20" }),
      makeTask({ title: "Buy envelopes", description: "paper shop", dueDate: "2026-05-10" }),
      makeTask({ title: "Water plants", description: "kitchen", dueDate: "2026-05-08" })
    ];

    const result = visibleTasks(tasks, { ...baseFilters, search: "envelope" });

    expect(result.map((task) => task.title)).toEqual(["Buy envelopes", "Archive photo negatives"]);
  });

  it("normalizes comma-separated labels", () => {
    expect(parseLabels(" Home, finance, home ,, ARCHIVE ")).toEqual(["home", "finance", "archive"]);
  });
});
