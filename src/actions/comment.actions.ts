"use server";

import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireCompany, requireProfessional } from "@/lib/session";
import { Role } from "@prisma/client";
import { z } from "zod";

import type { ActionResult } from "@/actions/task.actions";

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const AddCommentSchema = z.object({
  taskId: z.string().cuid(),
  body: z.string().min(1, "Comment cannot be empty").max(5000),
  parentId: z.string().cuid().optional(), // for replies
});

const EditCommentSchema = z.object({
  commentId: z.string().cuid(),
  body: z.string().min(1).max(5000),
});

const DeleteCommentSchema = z.object({
  commentId: z.string().cuid(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared: resolve caller from any of the 3 roles
// ─────────────────────────────────────────────────────────────────────────────

async function resolveSession() {
  try { return await requireAdmin(); } catch { /* */ }
  try { return await requireCompany(); } catch { /* */ }
  return await requireProfessional();
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: verify the caller has read access to the task
//   - ADMIN: always
//   - COMPANY: task must belong to their company
//   - PROFESSIONAL: must be assigned to the task
// ─────────────────────────────────────────────────────────────────────────────

async function verifyTaskAccess(
  taskId: string,
  role: Role,
  companyId: string | null,
  professionalId: string | null
): Promise<
  | { ok: true; task: { id: string; companyId: string } }
  | { ok: false; error: string }
> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      companyId: true,
      assignments: { select: { professionalId: true } },
    },
  });

  if (!task) return { ok: false, error: "Task not found." };

  if (role === Role.COMPANY && task.companyId !== companyId) {
    return { ok: false, error: "Task not found." };
  }

  if (role === Role.PROFESSIONAL) {
    const isAssigned = task.assignments.some(
      (a) => a.professionalId === professionalId
    );
    if (!isAssigned) return { ok: false, error: "Task not found." };
  }

  return { ok: true, task: { id: task.id, companyId: task.companyId } };
}

// ─────────────────────────────────────────────────────────────────────────────
// addComment — any authenticated user with task access
//
// Company, Admin, and Professionals can all comment.
// Supports one level of replies via parentId.
// ─────────────────────────────────────────────────────────────────────────────

export async function addComment(
  raw: z.input<typeof AddCommentSchema>
): Promise<ActionResult<{ commentId: string }>> {
  const session = await resolveSession();
  const actorId = session.user.id;
  const role = session.user.role as Role;

  const parsed = AddCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { taskId, body, parentId } = parsed.data;

  // Verify task access
  const access = await verifyTaskAccess(
    taskId,
    role,
    session.user.companyId ?? null,
    session.user.professionalId ?? null
  );

  if (!access.ok) return { ok: false, error: access.error };

  // If replying, verify the parent comment belongs to this task
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { taskId: true, parentId: true },
    });

    if (!parent || parent.taskId !== taskId) {
      return { ok: false, error: "Parent comment not found on this task." };
    }

    // Prevent nesting beyond one level
    if (parent.parentId) {
      return { ok: false, error: "Replies to replies are not supported." };
    }
  }

  try {
    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: { body, taskId, authorId: actorId, parentId: parentId ?? null },
      });

      await writeAuditLog({
        tx,
        action: "COMMENTED",
        entity: "Comment",
        entityId: created.id,
        actorId,
        companyId: access.task.companyId,
        taskId,
      });

      return created;
    });

    return { ok: true, data: { commentId: comment.id } };
  } catch {
    return { ok: false, error: "Failed to post comment." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// editComment — comment author only
//
// Only the original author can edit their comment.
// Sets isEdited = true to show an "edited" indicator in the UI.
// ─────────────────────────────────────────────────────────────────────────────

export async function editComment(
  raw: z.input<typeof EditCommentSchema>
): Promise<ActionResult> {
  const session = await resolveSession();
  const actorId = session.user.id;

  const parsed = EditCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { commentId, body } = parsed.data;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      task: { select: { companyId: true } },
    },
  });

  if (!comment) return { ok: false, error: "Comment not found." };

  if (comment.authorId !== actorId) {
    return { ok: false, error: "You can only edit your own comments." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id: commentId },
        data: { body, isEdited: true },
      });

      await writeAuditLog({
        tx,
        action: "UPDATED",
        entity: "Comment",
        entityId: commentId,
        actorId,
        companyId: comment.task.companyId,
        taskId: undefined, // not task-scoped to avoid noise in task activity feed
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to edit comment." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteComment — author or ADMIN
//
// Authors can delete their own comments.
// Admins can delete any comment (moderation).
// Replies are also deleted via onDelete: Cascade in the schema's self-relation.
// Wait — schema uses SetNull for parentId, so replies are not cascaded.
// We handle this explicitly: orphaned replies have their parentId nulled by DB,
// but we also delete them here to avoid dangling reply threads.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteComment(
  raw: z.input<typeof DeleteCommentSchema>
): Promise<ActionResult> {
  const session = await resolveSession();
  const actorId = session.user.id;
  const role = session.user.role as Role;

  const parsed = DeleteCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { commentId } = parsed.data;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      taskId: true,
      task: { select: { companyId: true } },
      replies: { select: { id: true } },
    },
  });

  if (!comment) return { ok: false, error: "Comment not found." };

  const isAuthor = comment.authorId === actorId;
  const isAdmin = role === Role.ADMIN;

  if (!isAuthor && !isAdmin) {
    return { ok: false, error: "You can only delete your own comments." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Delete replies first (schema uses SetNull, not Cascade for parentId)
      if (comment.replies.length > 0) {
        await tx.comment.deleteMany({
          where: { parentId: commentId },
        });
      }

      await tx.comment.delete({ where: { id: commentId } });

      await writeAuditLog({
        tx,
        action: "DELETED",
        entity: "Comment",
        entityId: commentId,
        actorId,
        companyId: comment.task.companyId,
        taskId: comment.taskId,
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to delete comment." };
  }
}
