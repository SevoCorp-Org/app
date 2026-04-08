import { Role, TaskStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Task Lifecycle
//
//  PENDING ──(admin approve)──► APPROVED ──(professional start)──► IN_PROGRESS
//     ▲                                                                  │
//     │ (admin reject — stays PENDING, audit note added)                 │ (professional submit)
//     │                                                                  ▼
//     └─────────────────────────────────────────────── REVIEW ──(company/admin approve)──► COMPLETED
//                                                         │
//                                                         └──(company/admin send back)──► IN_PROGRESS
//
// COMPLETED is a terminal state — no further transitions.
// REJECTION is not a status; it is recorded in the AuditLog and as a comment.
// The task remains PENDING so the company can revise and re-submit.
// ─────────────────────────────────────────────────────────────────────────────

export interface TransitionRule {
  allowedRoles: Role[];
  allowedTargets: TaskStatus[];
}

export const TASK_TRANSITIONS: Record<TaskStatus, TransitionRule> = {
  PENDING: {
    allowedRoles: [Role.ADMIN],
    allowedTargets: [TaskStatus.APPROVED],
  },
  APPROVED: {
    allowedRoles: [Role.PROFESSIONAL],
    allowedTargets: [TaskStatus.IN_PROGRESS],
  },
  IN_PROGRESS: {
    allowedRoles: [Role.PROFESSIONAL],
    allowedTargets: [TaskStatus.REVIEW],
  },
  REVIEW: {
    allowedRoles: [Role.COMPANY, Role.ADMIN],
    allowedTargets: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS],
  },
  COMPLETED: {
    allowedRoles: [],
    allowedTargets: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if `role` is allowed to move a task from `from` → `to`.
 */
export function canTransition(
  from: TaskStatus,
  to: TaskStatus,
  role: Role
): boolean {
  const rule = TASK_TRANSITIONS[from];
  return rule.allowedRoles.includes(role) && rule.allowedTargets.includes(to);
}

/**
 * Returns the list of statuses this role can move the task to from `from`.
 * Returns an empty array if no transitions are available.
 */
export function getAllowedTransitions(
  from: TaskStatus,
  role: Role
): TaskStatus[] {
  const rule = TASK_TRANSITIONS[from];
  if (!rule.allowedRoles.includes(role)) return [];
  return rule.allowedTargets;
}

/**
 * Human-readable labels for task statuses — used in UI and audit notes.
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  IN_PROGRESS: "In Progress",
  REVIEW: "In Review",
  COMPLETED: "Completed",
};
