import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { fetchSeedTasks } from "./lib/api";
import { LedgerImportError, downloadLedgerExport, parseLedgerImport } from "./lib/ledgerExport";
import {
  collectLabels,
  countFiledTasks,
  isOverdue,
  parseLabels,
  removeFiledTasks,
  reopenTaskInList,
  summarizeDueSoon,
  visibleTasks
} from "./lib/taskLogic";
import { loadTasks, resetTasks, saveTasks } from "./lib/storage";
import { useDueDateReminders } from "./lib/useDueDateReminders";
import { useTheme } from "./lib/useTheme";
import type { ThemePreference } from "./lib/theme";
import type { DueWindow, SortKey, Task, TaskFilters, TaskPriority, TaskStatus } from "./types";

type TaskForm = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  labels: string;
};

const defaultFilters: TaskFilters = {
  status: "all",
  priority: "all",
  label: "",
  dueWindow: "all",
  overdueOnly: false,
  search: "",
  sortBy: "due_date"
};

const blankForm: TaskForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  labels: ""
};

const statusOptions: Array<{ value: TaskStatus | "all"; label: string }> = [
  { value: "all", label: "Any status" },
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" }
];

const priorityOptions: Array<{ value: TaskPriority | "all"; label: string }> = [
  { value: "all", label: "Any priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" }
];

const dueWindowOptions: Array<{ value: DueWindow; label: string }> = [
  { value: "all", label: "Any due date" },
  { value: "today", label: "Due today" },
  { value: "this_week", label: "Due this week" }
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "due_date", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title" },
  { value: "created_at", label: "Newest" }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [form, setForm] = useState<TaskForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apiNotice, setApiNotice] = useState("Local notebook ready.");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const dueDateReminders = useDueDateReminders(tasks);
  const theme = useTheme();
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const labels = useMemo(() => collectLabels(tasks), [tasks]);
  const displayedTasks = useMemo(() => visibleTasks(tasks, filters), [tasks, filters]);
  const openCount = tasks.filter((task) => task.status !== "done").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const overdueCount = tasks.filter((task) => isOverdue(task, currentTime)).length;
  const dueSoon = useMemo(() => summarizeDueSoon(tasks, currentTime), [tasks, currentTime]);
  const formattedTime = useMemo(
    () =>
      currentTime.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
    [currentTime]
  );
  const formattedDate = useMemo(
    () =>
      currentTime.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
      }),
    [currentTime]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate,
      labels: parseLabels(form.labels)
    };

    if (!payload.title) {
      return;
    }

    if (editingId) {
      setTasks((current) => current.map((task) => (task.id === editingId ? { ...task, ...payload } : task)));
      setEditingId(null);
    } else {
      setTasks((current) => [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...payload
        },
        ...current
      ]);
    }

    setForm(blankForm);
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      labels: task.labels.join(", ")
    });
  }

  function completeTask(taskId: string) {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: "done" } : task)));
  }

  function reopenTask(taskId: string) {
    setTasks((current) => reopenTaskInList(current, taskId));
  }

  function deleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    if (editingId === taskId) {
      setEditingId(null);
      setForm(blankForm);
    }
  }


  function clearFiledTasks() {
    const filedCount = countFiledTasks(tasks);
    if (filedCount === 0) {
      setApiNotice("No filed tasks to clear.");
      return;
    }

    const confirmed = window.confirm(
      `Remove ${filedCount} filed task${filedCount === 1 ? "" : "s"}? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setTasks((current) => {
      const next = removeFiledTasks(current);
      if (editingId && !next.some((task) => task.id === editingId)) {
        setEditingId(null);
        setForm(blankForm);
      }
      return next;
    });
    setApiNotice(`Cleared ${filedCount} filed task${filedCount === 1 ? "" : "s"}.`);
  }

  async function loadApiSeeds() {
    try {
      const seedTasks = await fetchSeedTasks();
      setTasks(seedTasks);
      setApiNotice("Loaded the FastAPI mock ledger into localStorage.");
    } catch {
      setApiNotice("FastAPI is not reachable, so the browser ledger stayed local.");
    }
  }

  function handleExportLedger() {
    downloadLedgerExport(tasks);
    setApiNotice(`Exported ${tasks.length} task${tasks.length === 1 ? "" : "s"} to JSON.`);
  }

  function handleImportClick() {
    importInputRef.current?.click();
  }

  async function handleImportLedger(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const importedTasks = parseLedgerImport(await file.text());
      setTasks(importedTasks);
      setEditingId(null);
      setForm(blankForm);
      setApiNotice(`Imported ${importedTasks.length} task${importedTasks.length === 1 ? "" : "s"} from ${file.name}.`);
    } catch (error) {
      const message = error instanceof LedgerImportError ? error.message : "Unable to import the ledger file.";
      setApiNotice(message);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero__copy">
          <p className="eyebrow">Personal task ledger</p>
          <h1 id="page-title">Ledgerly</h1>
          <p>
            A pocket-sized desk planner for tasks, labels, due dates, and the small errands that deserve a proper
            index card.
          </p>
          <div className="hero-clock" aria-label="Current time">
            <span className="hero-clock__label">Desk clock</span>
            <time className="hero-clock__time" dateTime={currentTime.toISOString()}>
              {formattedTime}
            </time>
            <span className="hero-clock__date">{formattedDate}</span>
          </div>
          <label className="theme-control">
            <span className="theme-control__label">Desk lamp</span>
            <select
              value={theme.preference}
              onChange={(event) => theme.setPreference(event.target.value as ThemePreference)}
              aria-label="Color theme"
            >
              <option value="system">Match system</option>
              <option value="light">Day ledger</option>
              <option value="dark">Night ledger</option>
            </select>
          </label>
        </div>
        <div className="hero__stats" aria-label="Task summary">
          <span>
            <strong>{openCount}</strong>
            open
          </span>
          <span>
            <strong>{dueSoon.dueToday}</strong>
            due today
          </span>
          <span>
            <strong>{dueSoon.dueThisWeek}</strong>
            due this week
          </span>
          <span>
            <strong>{overdueCount}</strong>
            overdue
          </span>
          <span>
            <strong>{doneCount}</strong>
            filed
          </span>
        </div>
      </section>

      <section className="workspace">
        <aside className="panel form-panel" aria-label={editingId ? "Edit task" : "Create task"}>
          <div className="panel__header">
            <p className="eyebrow">{editingId ? "Revise card" : "New card"}</p>
            <h2>{editingId ? "Edit task" : "Add a task"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="task-form">
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={4}
              />
            </label>
            <div className="form-grid">
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
                >
                  {statusOptions
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}
                >
                  {priorityOptions
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label>
              Due date
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </label>
            <label>
              Labels
              <input
                placeholder="home, finance, archive"
                value={form.labels}
                onChange={(event) => setForm({ ...form, labels: event.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="button button--primary">
                {editingId ? "Save card" : "Create card"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(blankForm);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </aside>

        <section className="panel ledger-panel" aria-label="Task list and filters">
          <div className="panel__header ledger-panel__header">
            <div>
              <p className="eyebrow">Card catalogue</p>
              <h2>{displayedTasks.length} visible tasks</h2>
            </div>
            <div className="data-actions">
              <button type="button" className="button" onClick={handleExportLedger}>
                Export JSON
              </button>
              <button type="button" className="button" onClick={handleImportClick}>
                Import JSON
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => void handleImportLedger(event)}
              />
              <button type="button" className="button" onClick={loadApiSeeds}>
                Load API sample
              </button>
              <button type="button" className="button" onClick={clearFiledTasks}>
                Clear filed
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  setTasks(resetTasks());
                  setApiNotice("Restored the browser sample cards.");
                }}
              >
                Reset local
              </button>
            </div>
          </div>

          <div className="notice" role="status">
            {apiNotice}
            {dueDateReminders.status ? <span className="notice__secondary">{dueDateReminders.status}</span> : null}
          </div>

          <div className="filters">
            <label className="filters__search">
              Search
              <input
                placeholder="title or description"
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              />
            </label>
            <label>
              Status
              <select
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value as TaskFilters["status"] })}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={filters.priority}
                onChange={(event) => setFilters({ ...filters, priority: event.target.value as TaskFilters["priority"] })}
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Label
              <select value={filters.label} onChange={(event) => setFilters({ ...filters, label: event.target.value })}>
                <option value="">Any label</option>
                {labels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due
              <select
                value={filters.dueWindow}
                onChange={(event) => setFilters({ ...filters, dueWindow: event.target.value as DueWindow })}
              >
                {dueWindowOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select
                value={filters.sortBy}
                onChange={(event) => setFilters({ ...filters, sortBy: event.target.value as SortKey })}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.overdueOnly}
                onChange={(event) => setFilters({ ...filters, overdueOnly: event.target.checked })}
              />
              Overdue only
            </label>
            <label className="checkbox-label reminders-toggle">
              <input
                type="checkbox"
                checked={dueDateReminders.enabled}
                onChange={(event) => dueDateReminders.setEnabled(event.target.checked)}
              />
              Due-date reminders
            </label>
          </div>
          {dueDateReminders.enabled ? (
            <p className="reminders-hint">
              Desktop notifications fire once per day for open tasks due today. Keep this tab open or check back
              periodically.
            </p>
          ) : null}

          <div className="task-list">
            {displayedTasks.map((task) => {
              const overdue = isOverdue(task);
              return (
                <article key={task.id} className={`task-card ${task.status === "done" ? "is-done" : ""}`}>
                  <div className="task-card__topline">
                    <span className={`stamp stamp--${task.priority}`}>{task.priority}</span>
                    <span className={`status-pill status-pill--${task.status}`}>{task.status.replace("-", " ")}</span>
                    {overdue ? <span className="overdue">overdue</span> : null}
                  </div>
                  <h3>{task.title}</h3>
                  <p>{task.description || "No description yet."}</p>
                  <div className="task-card__meta">
                    <span>{task.dueDate ? `Due ${task.dueDate}` : "No due date"}</span>
                    <span>{task.labels.length ? task.labels.join(" / ") : "unlabelled"}</span>
                  </div>
                  <div className="task-card__actions">
                    <button type="button" className="button" onClick={() => startEdit(task)}>
                      Edit
                    </button>
                    {task.status === "done" ? (
                      <button type="button" className="button" onClick={() => reopenTask(task.id)}>
                        Reopen
                      </button>
                    ) : (
                      <button type="button" className="button" onClick={() => completeTask(task.id)}>
                        Complete
                      </button>
                    )}
                    <button type="button" className="button button--danger" onClick={() => deleteTask(task.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
