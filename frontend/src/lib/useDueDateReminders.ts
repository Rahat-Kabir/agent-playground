import { useEffect, useState } from "react";

import {
  REMINDER_CHECK_INTERVAL_MS,
  loadRemindersEnabled,
  reminderStatusMessage,
  runDueDateReminders,
  saveRemindersEnabled
} from "./reminders";
import type { Task } from "../types";

export function useDueDateReminders(tasks: Task[]) {
  const [enabled, setEnabled] = useState(() => loadRemindersEnabled());
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    saveRemindersEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      return;
    }

    let cancelled = false;

    async function checkReminders() {
      const result = await runDueDateReminders(tasks, { enabled: true });
      if (cancelled) {
        return;
      }

      setStatus(reminderStatusMessage(result));
    }

    void checkReminders();
    const timerId = window.setInterval(() => {
      void checkReminders();
    }, REMINDER_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, [tasks, enabled]);

  return {
    enabled,
    setEnabled,
    status
  };
}
