"use server";

import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { TaskStatus } from "@/lib/enums";
import { z } from "zod";

import type { ActionResult } from "@/actions/task.actions";

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const AssignSchema = z.object({
  taskId: z.string().cuid(),
  professionalId: z.string().cuid(),
});

const UnassignSchema = z.object({
  taskId: z.string().cuid(),
  professionalId: z.string().cuid(),
});

const BulkAssignSchema = z.object({
  taskId: z.string().cuid(),
  // Replace all current assignments with this list.
  // Send an empty array to clear all assignees.
  professionalIds: z
    .array(z.string().cuid())
    .max(20, "Cannot assign more than 20 professionals to a single task"),
});

// ─────────────────────────────────────────────────────────────────────────────
// assignProfessional — ADMIN
//
// Adds a single professional to a task.
// Rules:
//   1. Task must be APPROVED (admin has reviewed it before assigning).
//   2. Professional must be an ACTIVE member of the task's company.
//   3. No duplicate assignments (idempotent — returns ok if already assigned).
// ─────────────────────────────────────────────────────────────────────────────

export async function assignProfessional(
  raw: z.input<typeof AssignSchema>
): Promise<ActionResult> {
  const session = await requireAdmin();
  const actorId = session.user.id;

  const parsed = AssignSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { taskId, professionalId } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, companyId: true, title: true },
  });

  if (!task) return { ok: false, error: "Task not found." };

  if (task.status !== TaskStatus.APPROVED) {
    return {
      ok: false,
      error: "Professionals can only be assigned to approved tasks. Approve the task first.",
    };
  }

  // Verify the professional exists
  const professional = await prisma.professional.findUnique({
    where:  { id: professionalId },
    select: { id: true },
  });
  if (!professional) return { ok: false, error: "Professional not found." };

  // Auto-create company membership if not already a member
  await prisma.companyProfessional.upsert({
    where:  { companyId_professionalId: { companyId: task.companyId, professionalId } },
    update: { status: "ACTIVE" },
    create: { companyId: task.companyId, professionalId, status: "ACTIVE" },
  });

  // Check for an existing assignment — treat as idempotent
  const existing = await prisma.taskAssignment.findUnique({
    where: { taskId_professionalId: { taskId, professionalId } },
    select: { taskId: true },
  });

  if (existing) {
    return { ok: true, data: undefined }; // already assigned, nothing to do
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.taskAssignment.create({
        data: { taskId, professionalId },
      });

      await writeAuditLog({
        tx,
        action: "ASSIGNED",
        entity: "TaskAssignment",
        entityId: taskId,
        actorId,
        companyId: task.companyId,
        taskId,
        meta: { professionalId },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to assign professional." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// unassignProfessional — ADMIN
//
// Removes a single professional from a task.
// Not allowed once the task is IN_PROGRESS or beyond — the work is underway.
// ─────────────────────────────────────────────────────────────────────────────

export async function unassignProfessional(
  raw: z.input<typeof UnassignSchema>
): Promise<ActionResult> {
  const session = await requireAdmin();
  const actorId = session.user.id;

  const parsed = UnassignSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { taskId, professionalId } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, companyId: true },
  });

  if (!task) return { ok: false, error: "Task not found." };

  const lockedStatuses: TaskStatus[] = [
    TaskStatus.IN_PROGRESS,
    TaskStatus.REVIEW,
    TaskStatus.COMPLETED,
  ];

  if (lockedStatuses.includes(task.status)) {
    return {
      ok: false,
      error:
        "Cannot unassign a professional from a task that is already in progress or further.",
    };
  }

  const assignment = await prisma.taskAssignment.findUnique({
    where: { taskId_professionalId: { taskId, professionalId } },
  });

  if (!assignment) {
    return { ok: true, data: undefined }; // already not assigned, idempotent
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.taskAssignment.delete({
        where: { taskId_professionalId: { taskId, professionalId } },
      });

      await writeAuditLog({
        tx,
        action: "UNASSIGNED",
        entity: "TaskAssignment",
        entityId: taskId,
        actorId,
        companyId: task.companyId,
        taskId,
        meta: { professionalId },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to unassign professional." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// bulkSetAssignees — ADMIN
//
// Replaces the full assignee list for a task in one atomic operation.
// Useful for the assignment UI where admin picks from a checklist.
//
// Validates every professionalId is an ACTIVE member of the company
// before making any changes. Fails entirely if any ID is invalid.
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkSetAssignees(
  raw: z.input<typeof BulkAssignSchema>
): Promise<ActionResult> {
  const session = await requireAdmin();
  const actorId = session.user.id;

  const parsed = BulkAssignSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { taskId, professionalIds } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, companyId: true },
  });

  if (!task) return { ok: false, error: "Task not found." };

  if (task.status !== TaskStatus.APPROVED) {
    return {
      ok: false,
      error: "Professionals can only be assigned to approved tasks.",
    };
  }

  // Validate all provided IDs are active members of this company
  if (professionalIds.length > 0) {
    const validMemberships = await prisma.companyProfessional.findMany({
      where: {
        companyId: task.companyId,
        professionalId: { in: professionalIds },
        status: "ACTIVE",
      },
      select: { professionalId: true },
    });

    const validIds = new Set(validMemberships.map((m) => m.professionalId));
    const invalidIds = professionalIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      return {
        ok: false,
        error: `${invalidIds.length} professional(s) are not active members of this company.`,
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Delete all current assignments for this task
      await tx.taskAssignment.deleteMany({ where: { taskId } });

      // Insert the new set
      if (professionalIds.length > 0) {
        await tx.taskAssignment.createMany({
          data: professionalIds.map((professionalId) => ({
            taskId,
            professionalId,
          })),
        });
      }

      await writeAuditLog({
        tx,
        action: "ASSIGNED",
        entity: "Task",
        entityId: taskId,
        actorId,
        companyId: task.companyId,
        taskId,
        meta: { assignees: professionalIds, count: professionalIds.length },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to update assignees." };
  }
}
