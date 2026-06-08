import { describe, expect, it } from "vitest";

import {
  countFiledTasks,
  filterTasks,
  hasActiveFilters,
  isDueThisWeek,
  isDueToday,
  isOverdue,
  parseLabels,
  removeFiledTasks,
  reopenTaskInList,
  sortTasks,
  summarizeDueSoon,
  visibleTasks
} from "./taskLogic";
import type { Task, TaskFilters } from "../types";

const baseFilters: TaskFilters = {
  status: "all",
  priority: "all",
  label: "",
  dueWindow: "all",
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

  it("detects tasks due this calendar week (Monday through Sunday)", () => {
    const saturday = new Date("2026-05-09T12:00:00");

    expect(isDueThisWeek(makeTask({ dueDate: "2026-05-05" }), saturday)).toBe(true);
    expect(isDueThisWeek(makeTask({ dueDate: "2026-05-09" }), saturday)).toBe(true);
    expect(isDueThisWeek(makeTask({ dueDate: "2026-05-10" }), saturday)).toBe(true);
    expect(isDueThisWeek(makeTask({ dueDate: "2026-05-03" }), saturday)).toBe(false);
    expect(isDueThisWeek(makeTask({ dueDate: "2026-05-11" }), saturday)).toBe(false);
    expect(isDueThisWeek(makeTask({ dueDate: "2026-05-09", status: "done" }), saturday)).toBe(false);
  });

  it("summarizes open tasks due today and due this week", () => {
    const today = new Date("2026-05-09T12:00:00");
    const tasks = [
      makeTask({ title: "Due today", dueDate: "2026-05-09" }),
      makeTask({ title: "Also today", dueDate: "2026-05-09" }),
      makeTask({ title: "Due Sunday", dueDate: "2026-05-10" }),
      makeTask({ title: "Due next week", dueDate: "2026-05-11" }),
      makeTask({ title: "Filed today", dueDate: "2026-05-09", status: "done" }),
      makeTask({ title: "No due date" })
    ];

    expect(summarizeDueSoon(tasks, today)).toEqual({ dueToday: 2, dueThisWeek: 3 });
  });

  it("filters by due today and due this week", () => {
    const today = new Date("2026-05-09T12:00:00");
    const tasks = [
      makeTask({ title: "Due today", dueDate: "2026-05-09" }),
      makeTask({ title: "Due Sunday", dueDate: "2026-05-10" }),
      makeTask({ title: "Due next week", dueDate: "2026-05-11" }),
      makeTask({ title: "Due last week", dueDate: "2026-05-03" })
    ];

    expect(filterTasks(tasks, { ...baseFilters, dueWindow: "today" }, today).map((task) => task.title)).toEqual([
      "Due today"
    ]);
    expect(filterTasks(tasks, { ...baseFilters, dueWindow: "this_week" }, today).map((task) => task.title)).toEqual([
      "Due today",
      "Due Sunday"
    ]);
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

  it("detects whether filters differ from their defaults", () => {
    expect(hasActiveFilters(baseFilters, baseFilters)).toBe(false);
    expect(hasActiveFilters({ ...baseFilters, search: "rent" }, baseFilters)).toBe(true);
    expect(hasActiveFilters({ ...baseFilters, overdueOnly: true }, baseFilters)).toBe(true);
    expect(hasActiveFilters({ ...baseFilters, sortBy: "priority" }, baseFilters)).toBe(true);
  });

  it("normalizes comma-separated labels", () => {
    expect(parseLabels(" Home, finance, home ,, ARCHIVE ")).toEqual(["home", "finance", "archive"]);
  });

  it("counts and removes filed tasks", () => {
    const tasks = [
      makeTask({ id: "open", status: "todo" }),
      makeTask({ id: "filed-a", status: "done" }),
      makeTask({ id: "in-progress", status: "in-progress" }),
      makeTask({ id: "filed-b", status: "done" })
    ];

    expect(countFiledTasks(tasks)).toBe(2);
    expect(removeFiledTasks(tasks).map((task) => task.id)).toEqual(["open", "in-progress"]);
  });
  it("reopens a filed task back to todo", () => {
    const tasks = [
      makeTask({ id: "filed", status: "done" }),
      makeTask({ id: "open", status: "in-progress" })
    ];

    expect(reopenTaskInList(tasks, "filed")).toEqual([
      makeTask({ id: "filed", status: "todo" }),
      makeTask({ id: "open", status: "in-progress" })
    ]);
    expect(reopenTaskInList(tasks, "open")).toEqual(tasks);
  });

});
