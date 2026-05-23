import type { Task } from "../types";

import { isDueToday } from "./taskLogic";

export const REMINDERS_ENABLED_KEY = "ledgerly.reminders.enabled.v1";
export const REMINDERS_NOTIFIED_KEY = "ledgerly.reminders.notified.v1";

export const REMINDER_CHECK_INTERVAL_MS = 60_000;

export interface ReminderSnapshot {
  dateKey: string;
  taskIds: string[];
}

export type ReminderPermission = NotificationPermission | "unsupported";

export interface ReminderResult {
  notifiedCount: number;
  permission: ReminderPermission;
}

export interface NotificationGateway {
  supported: boolean;
  permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  show(title: string, options: NotificationOptions): void;
}

export function dateKeyFor(today: Date): string {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function loadRemindersEnabled(): boolean {
  return window.localStorage.getItem(REMINDERS_ENABLED_KEY) === "true";
}

export function saveRemindersEnabled(enabled: boolean): void {
  window.localStorage.setItem(REMINDERS_ENABLED_KEY, String(enabled));
}

export function loadNotifiedSnapshot(today: Date): ReminderSnapshot {
  const dateKey = dateKeyFor(today);
  const saved = window.localStorage.getItem(REMINDERS_NOTIFIED_KEY);

  if (!saved) {
    return { dateKey, taskIds: [] };
  }

  try {
    const snapshot = JSON.parse(saved) as ReminderSnapshot;
    if (snapshot.dateKey !== dateKey) {
      return { dateKey, taskIds: [] };
    }

    return snapshot;
  } catch {
    return { dateKey, taskIds: [] };
  }
}

export function saveNotifiedSnapshot(snapshot: ReminderSnapshot): void {
  window.localStorage.setItem(REMINDERS_NOTIFIED_KEY, JSON.stringify(snapshot));
}

export function tasksNeedingReminder(tasks: Task[], today: Date, alreadyNotified: ReadonlySet<string>): Task[] {
  return tasks.filter((task) => isDueToday(task, today) && !alreadyNotified.has(task.id));
}

export function createBrowserNotificationGateway(): NotificationGateway {
  const supported = typeof globalThis.Notification !== "undefined";

  return {
    supported,
    get permission() {
      return supported ? Notification.permission : "denied";
    },
    async requestPermission() {
      if (!supported) {
        return "denied";
      }

      return Notification.requestPermission();
    },
    show(title, options) {
      new Notification(title, options);
    }
  };
}

export async function runDueDateReminders(
  tasks: Task[],
  options: {
    enabled: boolean;
    today?: Date;
    gateway?: NotificationGateway;
  }
): Promise<ReminderResult> {
  const today = options.today ?? new Date();
  const gateway = options.gateway ?? createBrowserNotificationGateway();

  if (!options.enabled) {
    return {
      notifiedCount: 0,
      permission: gateway.supported ? gateway.permission : "unsupported"
    };
  }

  if (!gateway.supported) {
    return { notifiedCount: 0, permission: "unsupported" };
  }

  let permission = gateway.permission;
  if (permission === "default") {
    permission = await gateway.requestPermission();
  }

  if (permission !== "granted") {
    return { notifiedCount: 0, permission };
  }

  const snapshot = loadNotifiedSnapshot(today);
  const notifiedIds = new Set(snapshot.taskIds);
  const pending = tasksNeedingReminder(tasks, today, notifiedIds);

  for (const task of pending) {
    gateway.show(`Due today: ${task.title}`, {
      body: task.description || `Priority: ${task.priority}`,
      tag: `ledgerly-due-${task.id}`
    });
    notifiedIds.add(task.id);
  }

  if (pending.length > 0) {
    saveNotifiedSnapshot({
      dateKey: dateKeyFor(today),
      taskIds: [...notifiedIds]
    });
  }

  return { notifiedCount: pending.length, permission };
}

export function reminderStatusMessage(result: ReminderResult): string | null {
  if (!result) {
    return null;
  }

  if (result.permission === "unsupported") {
    return "This browser does not support desktop notifications.";
  }

  if (result.permission === "denied") {
    return "Notifications are blocked. Allow them in your browser settings to get due-date reminders.";
  }

  if (result.notifiedCount > 0) {
    const label = result.notifiedCount === 1 ? "task" : "tasks";
    return `Sent ${result.notifiedCount} due-date reminder${result.notifiedCount === 1 ? "" : "s"} for open ${label} due today.`;
  }

  return null;
}
