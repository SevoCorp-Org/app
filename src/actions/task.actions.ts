"use server";

import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireCompany, requireProfessional } from "@/lib/session";
import {
  canTransition,
  TASK_STATUS_LABELS,
} from "@/lib/task-transitions";
import { Role, TaskPriority, TaskStatus } from "@/lib/enums";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Shared result type — all actions return this so callers get typed outcomes
// without relying on thrown errors.
// ─────────────────────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const CreateTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(5000).optional(),
  workspaceId: z.string().cuid("Invalid workspace ID"),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined))
    .refine((v) => !v || v > new Date(), {
      message: "Due date must be in the future",
    }),
});

const UpdateTaskSchema = z.object({
  taskId: z.string().cuid(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : v === null ? null : undefined)),
});

const ApproveTaskSchema = z.object({
  taskId: z.string().cuid(),
});

const RejectTaskSchema = z.object({
  taskId: z.string().cuid(),
  reason: z.string().min(10, "Please provide a reason of at least 10 characters").max(1000),
});

const TransitionStatusSchema = z.object({
  taskId: z.string().cuid(),
  to: z.nativeEnum(TaskStatus),
});

const DeleteTaskSchema = z.object({
  taskId: z.string().cuid(),
});

// ─────────────────────────────────────────────────────────────────────────────
// createTask — COMPANY
//
// Company creates a task inside one of their workspaces.
// Status starts at PENDING, awaiting admin review.
// ─────────────────────────────────────────────────────────────────────────────

export async function createTask(
  raw: z.input<typeof CreateTaskSchema>
): Promise<ActionResult<{ taskId: string }>> {
  const session = await requireCompany();
  const companyId = session.user.companyId!;
  const actorId = session.user.id;

  const parsed = CreateTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { title, description, workspaceId, priority, dueDate } = parsed.data;

  // Verify the workspace belongs to this company (tenant guard)
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, companyId, isArchived: false },
    select: { id: true },
  });

  if (!workspace) {
    return { ok: false, error: "Workspace not found." };
  }

  try {
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title,
          description,
          priority,
          dueDate: dueDate ?? null,
          status: TaskStatus.PENDING,
          workspaceId,
          companyId,
          createdById: actorId,
        },
      });

      await writeAuditLog({
        tx,
        action: "CREATED",
        entity: "Task",
        entityId: created.id,
        actorId,
        companyId,
        taskId: created.id,
        meta: { title, priority, workspaceId },
      });

      return created;
    });

    return { ok: true, data: { taskId: task.id } };
  } catch {
    return { ok: false, error: "Failed to create task. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateTask — COMPANY (only while PENDING)
//
// Company can edit task details before admin reviews it.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTask(
  raw: z.input<typeof UpdateTaskSchema>
): Promise<ActionResult> {
  const session = await requireCompany();
  const companyId = session.user.companyId!;
  const actorId = session.user.id;

  const parsed = UpdateTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { taskId, title, description, priority, dueDate } = parsed.data;

  const task = await prisma.task.findFirst({
    where: { id: taskId, companyId },
    select: { id: true, status: true },
  });

  if (!task) return { ok: false, error: "Task not found." };

  if (task.status !== TaskStatus.PENDING) {
    return {
      ok: false,
      error: "Only pending tasks can be edited.",
    };
  }

  // Build only the fields that were provided
  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (priority !== undefined) updateData.priority = priority;
  if (dueDate !== undefined) updateData.dueDate = dueDate;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id: taskId }, data: updateData });

      await writeAuditLog({
        tx,
        action: "UPDATED",
        entity: "Task",
        entityId: taskId,
        actorId,
        companyId,
        taskId,
        meta: { changes: updateData },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to update task." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// approveTask — ADMIN
//
// Moves a task from PENDING → APPROVED.
// After approval, admin can assign professionals.
// ─────────────────────────────────────────────────────────────────────────────

export async function approveTask(
  raw: z.input<typeof ApproveTaskSchema>
): Promise<ActionResult> {
  const session = await requireAdmin();
  const actorId = session.user.id;

  const parsed = ApproveTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { taskId } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, companyId: true, title: true },
  });

  if (!task) return { ok: false, error: "Task not found." };

  if (!canTransition(task.status, TaskStatus.APPROVED, Role.ADMIN)) {
    return {
      ok: false,
      error: `Cannot approve a task with status "${TASK_STATUS_LABELS[task.status]}".`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.APPROVED },
      });

      await writeAuditLog({
        tx,
        action: "STATUS_CHANGED",
        entity: "Task",
        entityId: taskId,
        actorId,
        companyId: task.companyId,
        taskId,
        meta: { from: TaskStatus.PENDING, to: TaskStatus.APPROVED },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to approve task." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// rejectTask — ADMIN
//
// Task is kept at PENDING. A rejection reason is written to the AuditLog
// and added as a comment so the company sees it in the task thread.
// Company can revise the task and it will be re-reviewed.
// ─────────────────────────────────────────────────────────────────────────────

export async function rejectTask(
  raw: z.input<typeof RejectTaskSchema>
): Promise<ActionResult> {
  const session = await requireAdmin();
  const actorId = session.user.id;

  const parsed = RejectTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { taskId, reason } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, companyId: true },
  });

  if (!task) return { ok: false, error: "Task not found." };

  if (task.status !== TaskStatus.PENDING) {
    return {
      ok: false,
      error: `Only pending tasks can be rejected. Current status: "${TASK_STATUS_LABELS[task.status]}".`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Add a comment so the company sees the reason in the task thread
      await tx.comment.create({
        data: {
          body: `**Task rejected by admin.**\n\nReason: ${reason}\n\nPlease update the task and it will be reviewed again.`,
          taskId,
          authorId: actorId,
        },
      });

      await writeAuditLog({
        tx,
        action: "UPDATED",
        entity: "Task",
        entityId: taskId,
        actorId,
        companyId: task.companyId,
        taskId,
        meta: { rejected: true, reason },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to reject task." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// transitionTaskStatus — PROFESSIONAL or COMPANY or ADMIN
//
// General-purpose status transition. The caller specifies `to`.
// Transition rules from task-transitions.ts are enforced — no role can
// move a task to a status it is not permitted to.
//
// Covers:
//   Professional: APPROVED → IN_PROGRESS, IN_PROGRESS → REVIEW
//   Company/Admin: REVIEW → COMPLETED, REVIEW → IN_PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

export async function transitionTaskStatus(
  raw: z.input<typeof TransitionStatusSchema>
): Promise<ActionResult> {
  // Determine caller identity and role
  let actorId: string;
  let role: Role;

  // Try each role — the first requireXxx that doesn't redirect succeeds.
  // We resolve session manually here to avoid multiple redirects.
  const session = await (async () => {
    try {
      return await requireAdmin();
    } catch {
      // not admin
    }
    try {
      return await requireCompany();
    } catch {
      // not company
    }
    return await requireProfessional();
  })();

  actorId = session.user.id;
  role = session.user.role as Role;

  const parsed = TransitionStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { taskId, to } = parsed.data;

  // Fetch the task with enough context to validate the transition
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      companyId: true,
      assignments: {
        select: { professionalId: true },
      },
    },
  });

  if (!task) return { ok: false, error: "Task not found." };

  // Tenant guard: company users can only touch their own tasks
  if (role === Role.COMPANY && task.companyId !== session.user.companyId) {
    return { ok: false, error: "Task not found." };
  }

  // Professional guard: professional must be assigned to this task
  if (role === Role.PROFESSIONAL) {
    const professionalId = session.user.professionalId!;
    const isAssigned = task.assignments.some(
      (a) => a.professionalId === professionalId
    );
    if (!isAssigned) {
      return { ok: false, error: "You are not assigned to this task." };
    }
  }

  // Transition rule guard
  if (!canTransition(task.status, to, role)) {
    return {
      ok: false,
      error: `Cannot move task from "${TASK_STATUS_LABELS[task.status]}" to "${TASK_STATUS_LABELS[to]}" as ${role}.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { status: to },
      });

      await writeAuditLog({
        tx,
        action: "STATUS_CHANGED",
        entity: "Task",
        entityId: taskId,
        actorId,
        companyId: task.companyId,
        taskId,
        meta: { from: task.status, to },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to update task status." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteTask — COMPANY (PENDING only) or ADMIN (any non-COMPLETED status)
//
// Cascades to: TaskAssignment, Comment, FileUpload (via Prisma onDelete rules).
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteTask(
  raw: z.input<typeof DeleteTaskSchema>
): Promise<ActionResult> {
  const parsed = DeleteTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { taskId } = parsed.data;

  // Resolve caller
  let actorId: string;
  let role: Role;
  let companyId: string | null;

  const session = await (async () => {
    try { return await requireAdmin(); } catch { /* */ }
    return await requireCompany();
  })();

  actorId = session.user.id;
  role = session.user.role as Role;
  companyId = session.user.companyId ?? null;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, companyId: true, title: true },
  });

  if (!task) return { ok: false, error: "Task not found." };

  // Tenant guard for company users
  if (role === Role.COMPANY && task.companyId !== companyId) {
    return { ok: false, error: "Task not found." };
  }

  // Company can only delete PENDING tasks
  if (role === Role.COMPANY && task.status !== TaskStatus.PENDING) {
    return {
      ok: false,
      error: "Only pending tasks can be deleted. Contact your admin to remove this task.",
    };
  }

  // Nobody deletes a COMPLETED task
  if (task.status === TaskStatus.COMPLETED) {
    return { ok: false, error: "Completed tasks cannot be deleted." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: taskId } });

      // Audit log goes to company-level (no taskId since the task no longer exists)
      await writeAuditLog({
        tx,
        action: "DELETED",
        entity: "Task",
        entityId: taskId,
        actorId,
        companyId: task.companyId,
        meta: { title: task.title, status: task.status },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to delete task." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getTaskActivityLog — any authenticated user with access to the task
//
// Returns the AuditLog entries for a single task, newest first.
// Used to render the activity feed on the task detail page.
// ─────────────────────────────────────────────────────────────────────────────

export async function getTaskActivityLog(taskId: string) {
  // Resolve session (any role)
  const session = await (async () => {
    try { return await requireAdmin(); } catch { /* */ }
    try { return await requireCompany(); } catch { /* */ }
    return await requireProfessional();
  })();

  const role = session.user.role as Role;

  // Tenant / assignment access check
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      companyId: true,
      assignments: { select: { professionalId: true } },
    },
  });

  if (!task) return { ok: false as const, error: "Task not found." };

  if (role === Role.COMPANY && task.companyId !== session.user.companyId) {
    return { ok: false as const, error: "Task not found." };
  }

  if (role === Role.PROFESSIONAL) {
    const isAssigned = task.assignments.some(
      (a) => a.professionalId === session.user.professionalId
    );
    if (!isAssigned) return { ok: false as const, error: "Task not found." };
  }

  const logs = await prisma.auditLog.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      meta: true,
      createdAt: true,
      actor: { select: { name: true, role: true } },
    },
  });

  return { ok: true as const, data: logs };
}
