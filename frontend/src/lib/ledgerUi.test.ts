import { describe, expect, it, vi } from "vitest";

import { buildDeleteTaskConfirmMessage, confirmDeleteTask, emptyLedgerMessage } from "./ledgerUi";

describe("ledger UI helpers", () => {
  describe("emptyLedgerMessage", () => {
    it("returns null when visible tasks exist", () => {
      expect(emptyLedgerMessage(0, 1)).toBeNull();
      expect(emptyLedgerMessage(5, 2)).toBeNull();
    });

    it("prompts to add a card when the ledger is empty", () => {
      expect(emptyLedgerMessage(0, 0)).toBe("Your ledger is empty. Add a card to get started.");
    });

    it("explains when filters hide every task", () => {
      expect(emptyLedgerMessage(3, 0)).toBe("No tasks match your filters.");
    });
  });

  describe("delete confirmation", () => {
    it("builds a message with the task title", () => {
      expect(buildDeleteTaskConfirmMessage("Pay rent")).toBe('Delete "Pay rent"? This cannot be undone.');
    });

    it("asks for confirmation before deleting", () => {
      const confirm = vi.fn(() => true);

      expect(confirmDeleteTask("Pay rent", confirm)).toBe(true);
      expect(confirm).toHaveBeenCalledWith('Delete "Pay rent"? This cannot be undone.');
    });

    it("cancels delete when confirmation is declined", () => {
      const confirm = vi.fn(() => false);

      expect(confirmDeleteTask("Pay rent", confirm)).toBe(false);
    });
  });
});
