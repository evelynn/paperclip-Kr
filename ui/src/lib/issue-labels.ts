import type { TFunction } from "i18next";

/**
 * Issue status enum values use snake_case (`in_progress`), while the i18n keys
 * are camelCase leaves under `issues.status.*`. This map bridges the two so the
 * board, badges, and filters can share one localized label source.
 */
const ISSUE_STATUS_LABEL_KEYS: Record<string, string> = {
  backlog: "backlog",
  todo: "todo",
  in_progress: "inProgress",
  in_review: "inReview",
  done: "done",
  blocked: "blocked",
  cancelled: "cancelled",
};

/** Localized issue/task status label, falling back to the prettified enum. */
export function issueStatusLabel(t: TFunction, status: string): string {
  const key = ISSUE_STATUS_LABEL_KEYS[status];
  if (key) return t(`issues.status.${key}`);
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Localized issue/task priority label, falling back to the raw value. */
export function issuePriorityLabel(t: TFunction, priority: string): string {
  return t(`issues.priority.${priority}`, { defaultValue: priority });
}
