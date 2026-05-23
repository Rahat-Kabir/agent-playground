import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Task } from "../types";

import {
  REMINDERS_ENABLED_KEY,
  REMINDERS_NOTIFIED_KEY,
  dateKeyFor,
  loadNotifiedSnapshot,
  loadRemindersEnabled,
  reminderStatusMessage,
  runDueDateReminders,
  saveRemindersEnabled,
  tasksNeedingReminder,
  type NotificationGateway
} from "./reminders";
import { isDueToday } from "./taskLogic";

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

function createMockGateway(permission: NotificationPermission = "granted") {
  const shown: Array<{ title: string; options: NotificationOptions }> = [];

  const gateway: NotificationGateway = {
    supported: true,
    permission,
    requestPermission: vi.fn(async () => permission),
    show: (title, options) => {
      shown.push({ title, options });
    }
  };

  return { gateway, shown };
}

describe("due-date reminders", () => {
  const today = new Date("2026-05-23T15:30:00");

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("detects tasks due today and ignores completed cards", () => {
    expect(isDueToday(makeTask({ dueDate: "2026-05-23" }), today)).toBe(true);
    expect(isDueToday(makeTask({ dueDate: "2026-05-23", status: "done" }), today)).toBe(false);
    expect(isDueToday(makeTask({ dueDate: "2026-05-22" }), today)).toBe(false);
    expect(isDueToday(makeTask({ dueDate: "" }), today)).toBe(false);
  });

  it("persists reminder preference in localStorage", () => {
    expect(loadRemindersEnabled()).toBe(false);
    saveRemindersEnabled(true);
    expect(loadRemindersEnabled()).toBe(true);
    expect(window.localStorage.getItem(REMINDERS_ENABLED_KEY)).toBe("true");
  });

  it("resets notified task ids when the calendar day changes", () => {
    window.localStorage.setItem(
      REMINDERS_NOTIFIED_KEY,
      JSON.stringify({ dateKey: "2026-05-22", taskIds: ["old-task"] })
    );

    expect(loadNotifiedSnapshot(today)).toEqual({
      dateKey: dateKeyFor(today),
      taskIds: []
    });
  });

  it("shows a desktop notification for open tasks due today", async () => {
    const { gateway, shown } = createMockGateway();
    const tasks = [
      makeTask({ id: "due-today", title: "Pay water bill", dueDate: "2026-05-23", description: "City hall" }),
      makeTask({ id: "due-later", title: "Sort photos", dueDate: "2026-05-24" }),
      makeTask({ id: "done-today", title: "Done item", dueDate: "2026-05-23", status: "done" })
    ];

    const result = await runDueDateReminders(tasks, {
      enabled: true,
      today,
      gateway
    });

    expect(result).toEqual({ notifiedCount: 1, permission: "granted" });
    expect(shown).toHaveLength(1);
    expect(shown[0]?.title).toBe("Due today: Pay water bill");
    expect(shown[0]?.options.body).toBe("City hall");
    expect(shown[0]?.options.tag).toBe("ledgerly-due-due-today");
    expect(tasksNeedingReminder(tasks, today, new Set(["due-today"]))).toEqual([]);
  });

  it("does not notify the same task twice on the same day", async () => {
    const { gateway, shown } = createMockGateway();
    const tasks = [makeTask({ id: "repeat-me", title: "Renew library card", dueDate: "2026-05-23" })];

    const first = await runDueDateReminders(tasks, { enabled: true, today, gateway });
    const second = await runDueDateReminders(tasks, { enabled: true, today, gateway });

    expect(first.notifiedCount).toBe(1);
    expect(second.notifiedCount).toBe(0);
    expect(shown).toHaveLength(1);
  });

  it("requests permission when notifications are still in the default state", async () => {
    const { gateway } = createMockGateway("default");
    const requestPermission = vi.spyOn(gateway, "requestPermission").mockResolvedValue("granted");

    const result = await runDueDateReminders(
      [makeTask({ id: "needs-permission", title: "Call dentist", dueDate: "2026-05-23" })],
      { enabled: true, today, gateway }
    );

    expect(requestPermission).toHaveBeenCalledOnce();
    expect(result.notifiedCount).toBe(1);
  });

  it("skips notifications when permission is denied or reminders are disabled", async () => {
    const denied = createMockGateway("denied");
    const deniedResult = await runDueDateReminders(
      [makeTask({ id: "blocked", title: "Blocked task", dueDate: "2026-05-23" })],
      { enabled: true, today, gateway: denied.gateway }
    );

    expect(deniedResult).toEqual({ notifiedCount: 0, permission: "denied" });
    expect(denied.shown).toHaveLength(0);

    const granted = createMockGateway();
    const disabledResult = await runDueDateReminders(
      [makeTask({ id: "quiet", title: "Quiet task", dueDate: "2026-05-23" })],
      { enabled: false, today, gateway: granted.gateway }
    );

    expect(disabledResult.notifiedCount).toBe(0);
    expect(granted.shown).toHaveLength(0);
  });

  it("uses the browser Notification API when no custom gateway is provided", async () => {
    const shown: Array<{ title: string; options?: NotificationOptions }> = [];

    class MockNotification {
      static permission: NotificationPermission = "granted";

      static requestPermission = vi.fn(async () => "granted" as NotificationPermission);

      title: string;
      options?: NotificationOptions;

      constructor(title: string, options?: NotificationOptions) {
        this.title = title;
        this.options = options;
        shown.push({ title, options });
      }
    }

    vi.stubGlobal("Notification", MockNotification);

    const result = await runDueDateReminders(
      [makeTask({ id: "browser-path", title: "Pick up parcel", dueDate: "2026-05-23" })],
      { enabled: true, today }
    );

    expect(result.notifiedCount).toBe(1);
    expect(shown[0]?.title).toBe("Due today: Pick up parcel");

    vi.unstubAllGlobals();
  });

  it("builds user-facing status messages from reminder results", () => {
    expect(reminderStatusMessage({ notifiedCount: 2, permission: "granted" })).toContain("2");
    expect(reminderStatusMessage({ notifiedCount: 0, permission: "denied" })).toContain("blocked");
    expect(reminderStatusMessage({ notifiedCount: 0, permission: "unsupported" })).toContain("does not support");
    expect(reminderStatusMessage({ notifiedCount: 0, permission: "granted" })).toBeNull();
  });
});
