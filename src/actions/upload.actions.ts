"use server";

import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireCompany, requireProfessional } from "@/lib/session";
import { Role } from "@prisma/client";
import { UTApi } from "uploadthing/server";
import { z } from "zod";

import type { ActionResult } from "@/actions/task.actions";

// ─────────────────────────────────────────────────────────────────────────────
// UTApi — server-side UploadThing operations (deletion, etc.)
// One instance is enough; UTApi reads UPLOADTHING_SECRET from env.
// ─────────────────────────────────────────────────────────────────────────────

const utapi = new UTApi();

// ─────────────────────────────────────────────────────────────────────────────
// Shared: resolve any authenticated session
// ─────────────────────────────────────────────────────────────────────────────

async function resolveSession() {
  try { return await requireAdmin(); }       catch { /* */ }
  try { return await requireCompany(); }     catch { /* */ }
  return await requireProfessional();
}

// ─────────────────────────────────────────────────────────────────────────────
// linkCommentAttachment
//
// After a comment is created, link any pending file uploads to it.
// Called immediately after addComment returns so files reference the comment ID.
//
// Why not do this in the upload itself?
// The comment doesn't exist yet when the upload starts (user uploads first,
// then submits the comment form). This action closes the gap.
// ─────────────────────────────────────────────────────────────────────────────

const LinkSchema = z.object({
  commentId: z.string().cuid(),
  fileIds: z.array(z.string().cuid()).min(1).max(4),
});

export async function linkCommentAttachments(
  raw: z.input<typeof LinkSchema>
): Promise<ActionResult> {
  const session = await resolveSession();
  const actorId = session.user.id;

  const parsed = LinkSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { commentId, fileIds } = parsed.data;

  // Verify the comment belongs to a task this user has access to
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      task: {
        select: {
          companyId: true,
          assignments: { select: { professionalId: true } },
        },
      },
    },
  });

  if (!comment) return { ok: false, error: "Comment not found." };

  const role = session.user.role as Role;

  if (role === Role.COMPANY && comment.task.companyId !== session.user.companyId) {
    return { ok: false, error: "Comment not found." };
  }

  if (role === Role.PROFESSIONAL) {
    const isAssigned = comment.task.assignments.some(
      (a) => a.professionalId === session.user.professionalId
    );
    if (!isAssigned) return { ok: false, error: "Comment not found." };
  }

  // Verify all files were uploaded by this user and are not already linked
  const files = await prisma.fileUpload.findMany({
    where: {
      id: { in: fileIds },
      uploadedById: actorId,
      commentId: null, // not yet linked
    },
    select: { id: true },
  });

  if (files.length !== fileIds.length) {
    return {
      ok: false,
      error: "One or more files are invalid or already attached to a comment.",
    };
  }

  await prisma.fileUpload.updateMany({
    where: { id: { in: fileIds } },
    data: { commentId },
  });

  return { ok: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteFile
//
// Deletes a file from UploadThing storage AND removes the DB record.
// Authorization:
//   - The user who uploaded it can delete it
//   - ADMIN can delete any file
//   - COMPANY can delete files on their own tasks
// ─────────────────────────────────────────────────────────────────────────────

const DeleteSchema = z.object({
  fileId: z.string().cuid(),
});

export async function deleteFile(
  raw: z.input<typeof DeleteSchema>
): Promise<ActionResult> {
  const session = await resolveSession();
  const actorId = session.user.id;
  const role = session.user.role as Role;

  const parsed = DeleteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { fileId } = parsed.data;

  const file = await prisma.fileUpload.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      key: true,
      filename: true,
      uploadedById: true,
      companyId: true,
      taskId: true,
    },
  });

  if (!file) return { ok: false, error: "File not found." };

  // Authorization
  const isUploader = file.uploadedById === actorId;
  const isAdmin = role === Role.ADMIN;
  const isCompanyOwner =
    role === Role.COMPANY && file.companyId === session.user.companyId;

  if (!isUploader && !isAdmin && !isCompanyOwner) {
    return { ok: false, error: "You do not have permission to delete this file." };
  }

  try {
    // 1. Delete from UploadThing storage
    const { success } = await utapi.deleteFiles(file.key);

    if (!success) {
      // Log the failure but continue — removing the DB record is more
      // important than orphaning it. Storage can be cleaned up manually.
      console.error(`[uploadthing] Failed to delete key: ${file.key}`);
    }

    // 2. Remove the DB record (and audit log in same transaction)
    await prisma.$transaction(async (tx) => {
      await tx.fileUpload.delete({ where: { id: fileId } });

      await writeAuditLog({
        tx,
        action:    "DELETED",
        entity:    "FileUpload",
        entityId:  fileId,
        actorId,
        companyId: file.companyId,
        taskId:    file.taskId ?? undefined,
        meta: { filename: file.filename },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to delete file." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getTaskFiles
//
// Returns all files attached to a task, grouped by type.
// Access rules match task access rules.
// ─────────────────────────────────────────────────────────────────────────────

export async function getTaskFiles(taskId: string) {
  const session = await resolveSession();
  const role = session.user.role as Role;

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

  const files = await prisma.fileUpload.findMany({
    where: { taskId, commentId: null }, // task-level files only
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      url: true,
      size: true,
      mimeType: true,
      createdAt: true,
      uploadedBy: { select: { name: true, role: true } },
    },
  });

  return { ok: true as const, data: files };
}
