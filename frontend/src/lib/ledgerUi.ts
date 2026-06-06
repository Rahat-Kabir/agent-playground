export function emptyLedgerMessage(totalTasks: number, visibleTasks: number): string | null {
  if (visibleTasks > 0) {
    return null;
  }

  if (totalTasks === 0) {
    return "Your ledger is empty. Add a card to get started.";
  }

  return "No tasks match your filters.";
}

export function buildDeleteTaskConfirmMessage(title: string): string {
  return `Delete "${title}"? This cannot be undone.`;
}

export function confirmDeleteTask(
  title: string,
  confirm: (message: string) => boolean = (message) => window.confirm(message)
): boolean {
  return confirm(buildDeleteTaskConfirmMessage(title));
}
