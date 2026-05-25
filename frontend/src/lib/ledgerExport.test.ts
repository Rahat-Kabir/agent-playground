import { describe, expect, it, vi } from "vitest";

import type { Task } from "../types";

import {
  LedgerImportError,
  buildLedgerExport,
  downloadLedgerExport,
  exportFilename,
  parseLedgerImport,
  serializeLedgerExport
} from "./ledgerExport";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? "task-1",
    title: overrides.title ?? "Pay rent",
    description: overrides.description ?? "Drop at the post box",
    status: overrides.status ?? "todo",
    priority: overrides.priority ?? "high",
    dueDate: overrides.dueDate ?? "2026-05-23",
    labels: overrides.labels ?? ["finance"],
    createdAt: overrides.createdAt ?? "2026-05-01T10:00:00.000Z"
  };
}

describe("ledger export/import", () => {
  it("builds a versioned export envelope", () => {
    const tasks = [makeTask()];
    const exportedAt = "2026-05-23T12:00:00.000Z";

    expect(buildLedgerExport(tasks, exportedAt)).toEqual({
      format: "ledgerly-tasks",
      version: 1,
      exportedAt,
      tasks
    });
  });

  it("serializes tasks as pretty-printed JSON", () => {
    const json = serializeLedgerExport([makeTask({ title: "Water plants" })], "2026-05-23T12:00:00.000Z");

    expect(json).toContain('"format": "ledgerly-tasks"');
    expect(json).toContain('"title": "Water plants"');
  });

  it("creates a dated export filename", () => {
    expect(exportFilename(new Date("2026-05-23T15:00:00.000Z"))).toBe("ledgerly-tasks-2026-05-23.json");
  });

  it("parses export envelopes and plain task arrays", () => {
    const task = makeTask();
    const envelope = serializeLedgerExport([task]);
    const plain = JSON.stringify([task]);

    expect(parseLedgerImport(envelope)).toEqual([task]);
    expect(parseLedgerImport(plain)).toEqual([task]);
  });

  it("normalizes missing optional fields and labels", () => {
    const imported = parseLedgerImport(
      JSON.stringify([
        {
          id: "card-2",
          title: " Dust shelves ",
          status: "in-progress",
          priority: "low",
          labels: [" Home ", "home"]
        }
      ])
    );

    expect(imported[0]).toMatchObject({
      id: "card-2",
      title: "Dust shelves",
      description: "",
      dueDate: "",
      labels: ["home"],
      status: "in-progress",
      priority: "low"
    });
    expect(imported[0]?.createdAt).toEqual(expect.any(String));
  });

  it("rejects invalid JSON and malformed task records", () => {
    expect(() => parseLedgerImport("{not-json")).toThrow(LedgerImportError);
    expect(() => parseLedgerImport(JSON.stringify({ format: "ledgerly-tasks", tasks: [] }))).toThrow(
      /does not contain any tasks/
    );
    expect(() =>
      parseLedgerImport(
        JSON.stringify([
          {
            id: "bad",
            title: "Broken",
            status: "paused",
            priority: "high"
          }
        ])
      )
    ).toThrow(/invalid status/);
  });

  it("downloads a JSON file through a temporary anchor", () => {
    const click = vi.fn();
    const createObjectURL = vi.fn(() => "blob:ledger");
    const revokeObjectURL = vi.fn();
    const anchor = { click, href: "", download: "", rel: "" };
    const createElement = vi.fn(() => anchor) as unknown as typeof document.createElement;

    downloadLedgerExport([makeTask()], {
      exportedAt: new Date("2026-05-23T09:00:00.000Z"),
      createObjectURL,
      revokeObjectURL,
      createElement
    });

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(createElement).toHaveBeenCalledWith("a");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:ledger");
  });
});
