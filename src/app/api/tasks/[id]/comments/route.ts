import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks/[id]/comments
//
// Returns all comments for a task as JSON — used by client-side polling via
// fetch() when the caller needs only comment data (not a full page refresh).
//
// Auth: same access rules as the task detail page:
//   ADMIN → any task
//   COMPANY → tasks belonging to their company
//   PROFESSIONAL → tasks they are assigned to
//
// Response: { comments: CommentData[] }
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as Role;
  const { id: taskId } = await params;

  // ── Access check ────────────────────────────────────────────────────────────

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      companyId: true,
      assignments: { select: { professionalId: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (role === Role.COMPANY && task.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (role === Role.PROFESSIONAL) {
    const isAssigned = task.assignments.some(
      (a) => a.professionalId === session.user.professionalId
    );
    if (!isAssigned) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
  }

  // ── Fetch comments ──────────────────────────────────────────────────────────

  const comments = await prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      isEdited: true,
      createdAt: true,
      parentId: true,
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          role: true,
        },
      },
      uploads: {
        select: {
          id: true,
          filename: true,
          url: true,
          mimeType: true,
          size: true,
        },
      },
    },
  });

  // Serialize dates — NextResponse.json handles Date → string, but be explicit
  const serialized = comments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  return NextResponse.json(
    { comments: serialized },
    {
      headers: {
        // Prevent caching — comments must always be fresh
        "Cache-Control": "no-store",
      },
    }
  );
}
