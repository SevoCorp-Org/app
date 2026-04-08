import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { getServerSession } from "next-auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";

const f = createUploadthing();

// ─────────────────────────────────────────────────────────────────────────────
// Shared: resolve session from request and verify task access.
//
// Returns metadata consumed by onUploadComplete.
// Throwing UploadThingError aborts the upload — the client receives the message.
// ─────────────────────────────────────────────────────────────────────────────

async function resolveUploadContext(taskId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new UploadThingError("You must be logged in to upload files.");
  }

  const role = session.user.role as Role;
  const actorId = session.user.id;

  // Fetch the task with enough info to validate access
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      companyId: true,
      status: true,
      assignments: { select: { professionalId: true } },
    },
  });

  if (!task) throw new UploadThingError("Task not found.");

  // ── Role-specific access check ────────────────────────────────────────────

  if (role === Role.COMPANY) {
    if (task.companyId !== session.user.companyId) {
      throw new UploadThingError("You do not have access to this task.");
    }
  }

  if (role === Role.PROFESSIONAL) {
    const isAssigned = task.assignments.some(
      (a) => a.professionalId === session.user.professionalId
    );
    if (!isAssigned) {
      throw new UploadThingError("You are not assigned to this task.");
    }
    // Professionals can only upload to tasks that are in progress or in review
    if (task.status !== "IN_PROGRESS" && task.status !== "REVIEW") {
      throw new UploadThingError(
        "Files can only be uploaded to tasks that are In Progress or In Review."
      );
    }
  }

  return {
    actorId,
    companyId: task.companyId,
    taskId: task.id,
    role,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// File Router
// ─────────────────────────────────────────────────────────────────────────────

export const ourFileRouter = {

  // ── taskAttachment ──────────────────────────────────────────────────────
  // General task attachment: documents, images, spreadsheets.
  // Used by Company and Admin to attach reference materials to a task.
  // Used by Professionals to upload deliverables.
  //
  // Max: 10 files per request, 32 MB each.
  // Accepted: images, PDFs, Word docs, Excel, plain text, zip.

  taskAttachment: f(
    {
      image:  { maxFileSize: "8MB",  maxFileCount: 10 },
      pdf:    { maxFileSize: "32MB", maxFileCount: 10 },
      text:   { maxFileSize: "4MB",  maxFileCount: 10 },
      blob:   { maxFileSize: "32MB", maxFileCount: 10 },
    },
    { awaitServerData: false }
  )
    .input(z.object({ taskId: z.string().min(1) }))

    .middleware(async ({ input }) => {
      return resolveUploadContext(input.taskId);
    })

    .onUploadComplete(async ({ file }) => {
      // DB record is saved by the client via saveUploadedFile() server action
      // (UploadThing cannot reach localhost in dev, so we don't rely on this callback for DB writes).
      // This handler must succeed so the client receives onClientUploadComplete.
      const url = file.ufsUrl ?? (file as unknown as { url: string }).url ?? "";
      return { filename: file.name, url };
    }),

  // ── commentAttachment ───────────────────────────────────────────────────
  // Lighter files attached to a specific comment.
  // commentId is optional at upload time — the client passes it when
  // attaching to an existing comment, or omits it when uploading before
  // posting (comment is created after, FileUpload.commentId is set then).
  //
  // Max: 4 files per request, 8 MB each.

  commentAttachment: f(
    {
      image:  { maxFileSize: "8MB", maxFileCount: 4 },
      pdf:    { maxFileSize: "8MB", maxFileCount: 4 },
      text:   { maxFileSize: "2MB", maxFileCount: 4 },
      blob:   { maxFileSize: "8MB", maxFileCount: 4 },
    },
    { awaitServerData: false }
  )
    .input(
      z.object({
        taskId:    z.string().min(1),
        commentId: z.string().min(1).optional(),
      })
    )

    .middleware(async ({ input }) => {
      const ctx = await resolveUploadContext(input.taskId);
      return { ...ctx, commentId: input.commentId ?? null };
    })

    .onUploadComplete(async ({ file }) => {
      // DB record is saved by the client via saveUploadedFile() server action.
      const url = file.ufsUrl ?? (file as unknown as { url: string }).url ?? "";
      return { filename: file.name, url };
    }),

} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
