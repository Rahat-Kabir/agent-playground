import type { Task, TaskPriority, TaskStatus } from "../types";

export const LEDGER_EXPORT_FORMAT = "ledgerly-tasks";
export const LEDGER_EXPORT_VERSION = 1;

export interface LedgerExportFile {
  format: typeof LEDGER_EXPORT_FORMAT;
  version: typeof LEDGER_EXPORT_VERSION;
  exportedAt: string;
  tasks: Task[];
}

export class LedgerImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerImportError";
  }
}

const statusValues = new Set<TaskStatus>(["todo", "in-progress", "done"]);
const priorityValues = new Set<TaskPriority>(["low", "medium", "high"]);

export function buildLedgerExport(tasks: Task[], exportedAt = new Date().toISOString()): LedgerExportFile {
  return {
    format: LEDGER_EXPORT_FORMAT,
    version: LEDGER_EXPORT_VERSION,
    exportedAt,
    tasks
  };
}

export function serializeLedgerExport(tasks: Task[], exportedAt = new Date().toISOString()): string {
  return JSON.stringify(buildLedgerExport(tasks, exportedAt), null, 2);
}

export function exportFilename(exportedAt = new Date()): string {
  const date = exportedAt.toISOString().slice(0, 10);
  return `ledgerly-tasks-${date}.json`;
}

export function parseLedgerImport(raw: string): Task[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new LedgerImportError("The file is not valid JSON.");
  }

  const taskRecords = extractTaskRecords(parsed);
  return taskRecords.map((record, index) => normalizeTask(record, index));
}

export function downloadLedgerExport(
  tasks: Task[],
  options: {
    exportedAt?: Date;
    createObjectURL?: typeof URL.createObjectURL;
    revokeObjectURL?: typeof URL.revokeObjectURL;
    createElement?: typeof document.createElement;
  } = {}
): void {
  const exportedAt = options.exportedAt ?? new Date();
  const createObjectURL = options.createObjectURL ?? URL.createObjectURL.bind(URL);
  const revokeObjectURL = options.revokeObjectURL ?? URL.revokeObjectURL.bind(URL);
  const createElement = options.createElement ?? document.createElement.bind(document);

  const blob = new Blob([serializeLedgerExport(tasks, exportedAt.toISOString())], {
    type: "application/json"
  });
  const url = createObjectURL(blob);
  const anchor = createElement("a");
  anchor.href = url;
  anchor.download = exportFilename(exportedAt);
  anchor.rel = "noopener";
  anchor.click();
  revokeObjectURL(url);
}

function extractTaskRecords(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new LedgerImportError("The ledger file does not contain any tasks.");
    }

    return parsed;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new LedgerImportError("The ledger file must contain a task list or export envelope.");
  }

  const envelope = parsed as Partial<LedgerExportFile>;
  if (envelope.format !== LEDGER_EXPORT_FORMAT) {
    throw new LedgerImportError("Unrecognized ledger export format.");
  }

  if (!Array.isArray(envelope.tasks)) {
    throw new LedgerImportError("The export envelope is missing a tasks array.");
  }

  if (envelope.tasks.length === 0) {
    throw new LedgerImportError("The ledger file does not contain any tasks.");
  }

  return envelope.tasks;
}

function normalizeTask(record: unknown, index: number): Task {
  if (!record || typeof record !== "object") {
    throw new LedgerImportError(`Task ${index + 1} is not a valid object.`);
  }

  const task = record as Partial<Task>;
  const title = readString(task.title, `Task ${index + 1} is missing a title.`);
  const status = readStatus(task.status, index);
  const priority = readPriority(task.priority, index);

  return {
    id: readString(task.id, `Task ${index + 1} is missing an id.`, `imported-${index + 1}-${crypto.randomUUID()}`),
    title,
    description: typeof task.description === "string" ? task.description : "",
    status,
    priority,
    dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
    labels: readLabels(task.labels, index),
    createdAt: readCreatedAt(task.createdAt)
  };
}

function readString(value: unknown, errorMessage: string, fallback?: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (fallback) {
    return fallback;
  }

  throw new LedgerImportError(errorMessage);
}

function readStatus(value: unknown, index: number): TaskStatus {
  if (typeof value === "string" && statusValues.has(value as TaskStatus)) {
    return value as TaskStatus;
  }

  throw new LedgerImportError(`Task ${index + 1} has an invalid status.`);
}

function readPriority(value: unknown, index: number): TaskPriority {
  if (typeof value === "string" && priorityValues.has(value as TaskPriority)) {
    return value as TaskPriority;
  }

  throw new LedgerImportError(`Task ${index + 1} has an invalid priority.`);
}

function readLabels(value: unknown, index: number): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new LedgerImportError(`Task ${index + 1} has invalid labels.`);
  }

  const labels = value.map((label, labelIndex) => {
    if (typeof label !== "string" || !label.trim()) {
      throw new LedgerImportError(`Task ${index + 1} has an invalid label at position ${labelIndex + 1}.`);
    }

    return label.trim().toLowerCase();
  });

  return Array.from(new Set(labels));
}

function readCreatedAt(value: unknown): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return value;
  }

  return new Date().toISOString();
}
