import {
  approveTask,
  rejectTask,
  transitionTaskStatus,
} from "@/actions/task.actions";
import {
  assignProfessional,
  unassignProfessional,
} from "@/actions/assignment.actions";
import { CommentThread } from "@/components/comments/CommentThread";
import type { CommentData } from "@/components/comments/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { DeleteTaskButton } from "@/components/admin/AdminTaskQuickActions";
import { UploadedFileList } from "@/components/upload/UploadedFileList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { TaskStatus } from "@/lib/enums";
import { Building2, CalendarDays, FolderOpen, UserCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      company:   { select: { id: true, name: true } },
      workspace: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      assignments: {
        select: {
          professional: {
            select: {
              id: true, title: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, body: true, isEdited: true, createdAt: true, parentId: true,
          author:  { select: { id: true, name: true, image: true, role: true } },
          uploads: { select: { id: true, filename: true, url: true, mimeType: true, size: true } },
        },
      },
      uploads: {
        where:   { commentId: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, filename: true, url: true, mimeType: true, size: true, createdAt: true,
          uploadedBy: { select: { name: true, role: true } },
        },
      },
    },
  });

  if (!task) notFound();

  // Nest replies for CommentThread
  const repliesMap = task.comments
    .filter((c) => c.parentId)
    .reduce<Record<string, typeof task.comments>>((acc, r) => {
      acc[r.parentId!] = [...(acc[r.parentId!] ?? []), r];
      return acc;
    }, {});

  const nestedComments: CommentData[] = task.comments
    .filter((c) => !c.parentId)
    .map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      author: { ...c.author, image: c.author.image ?? null },
      replies: (repliesMap[c.id] ?? []).map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        author: { ...r.author, image: r.author.image ?? null },
        uploads: r.uploads,
        replies: [],
      })),
    }));

  const assignedProfessionalIds = task.assignments.map((a) => a.professional.id);

  const availableProfessionals = await prisma.professional.findMany({
    where: {
      companies: { some: { companyId: task.company.id, status: "ACTIVE" } },
      id: { notIn: assignedProfessionalIds },
    },
    select: {
      id: true, title: true, available: true,
      user: { select: { name: true } },
    },
  });

  const auditLog = await prisma.auditLog.findMany({
    where:   { taskId: task.id },
    orderBy: { createdAt: "desc" },
    take:    20,
    select: {
      id: true, action: true, meta: true, createdAt: true,
      actor: { select: { name: true, role: true } },
    },
  });

  const isPending  = task.status === TaskStatus.PENDING;
  const isApproved = task.status === TaskStatus.APPROVED;
  const isReview   = task.status === TaskStatus.REVIEW;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb + Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/admin/tasks" className="hover:text-slate-600">Tasks</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 line-clamp-1">{task.title}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{task.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              <Link href={`/admin/companies/${task.company.id}`} className="hover:underline">
                {task.company.name}
              </Link>
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3.5 w-3.5" />
              {task.workspace.name}
            </span>
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Due {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.status !== TaskStatus.COMPLETED && (
            <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ── Description ────────────────────────────────────────────── */}
          {task.description && (
            <Card>
              <CardContent className="pt-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {task.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Admin Review ───────────────────────────────────────────── */}
          {isPending && (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-amber-800">Review Task</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  action={async () => {
                    "use server";
                    await approveTask({ taskId: task.id });
                    revalidatePath(`/admin/tasks/${task.id}`);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    Approve Task
                  </button>
                </form>

                <form
                  action={async (formData: FormData) => {
                    "use server";
                    const reason = formData.get("reason") as string;
                    await rejectTask({ taskId: task.id, reason });
                    revalidatePath(`/admin/tasks/${task.id}`);
                  }}
                  className="space-y-2"
                >
                  <textarea
                    name="reason"
                    rows={3}
                    required
                    minLength={10}
                    placeholder="Rejection reason (shown to company in task comments)…"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                  >
                    Reject Task
                  </button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Assign Professionals ───────────────────────────────────── */}
          {isApproved && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="h-4 w-4 text-slate-400" />
                  Assign Professionals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Already assigned */}
                {task.assignments.length > 0 && (
                  <div className="space-y-2">
                    {task.assignments.map((a) => (
                      <div
                        key={a.professional.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {a.professional.user.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {a.professional.title ?? "No title"}
                          </p>
                        </div>
                        <form
                          action={async () => {
                            "use server";
                            await unassignProfessional({
                              taskId: task.id,
                              professionalId: a.professional.id,
                            });
                            revalidatePath(`/admin/tasks/${task.id}`);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs text-red-500 transition hover:text-red-700"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}

                {/* Available */}
                {availableProfessionals.length > 0 ? (
                  <div className="space-y-2">
                    {availableProfessionals.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-slate-800">{p.user.name}</p>
                          <p className="text-xs text-slate-400">
                            {p.title ?? "No title"} ·{" "}
                            {p.available ? (
                              <span className="text-emerald-600">Available</span>
                            ) : (
                              <span className="text-slate-400">Unavailable</span>
                            )}
                          </p>
                        </div>
                        <form
                          action={async () => {
                            "use server";
                            await assignProfessional({
                              taskId: task.id,
                              professionalId: p.id,
                            });
                            revalidatePath(`/admin/tasks/${task.id}`);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-700"
                          >
                            Assign
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    {task.assignments.length > 0
                      ? "All active company professionals are assigned."
                      : "No active professionals in this company yet."}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Deliverables ───────────────────────────────────────────── */}
          <Card className={isReview ? "border-purple-200" : undefined}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Deliverables</span>
                <span className="text-xs font-normal text-slate-400">
                  {task.uploads.length > 0
                    ? `${task.uploads.length} file${task.uploads.length !== 1 ? "s" : ""}`
                    : "No files yet"}
                  {isReview && task.uploads.length > 0 && (
                    <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                      Awaiting review
                    </span>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UploadedFileList
                files={task.uploads.map((f) => ({
                  ...f,
                  uploadedBy: f.uploadedBy
                    ? { name: f.uploadedBy.name, role: String(f.uploadedBy.role) }
                    : undefined,
                }))}
                canDelete={false}
                emptyMessage={
                  isReview
                    ? "No files were uploaded by the professional."
                    : "No deliverables uploaded yet."
                }
              />
            </CardContent>
          </Card>

          {/* ── Review Resolution ─────────────────────────────────────── */}
          {isReview && (
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-purple-800">Review Submitted</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  The professional has submitted this task for review. Review the deliverables above, then mark as complete or send back for more work.
                </p>
                <div className="flex flex-wrap gap-3">
                  <form
                    action={async () => {
                      "use server";
                      await transitionTaskStatus({ taskId: task.id, to: TaskStatus.COMPLETED });
                      revalidatePath(`/admin/tasks/${task.id}`);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      Mark as Completed
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await transitionTaskStatus({ taskId: task.id, to: TaskStatus.IN_PROGRESS });
                      revalidatePath(`/admin/tasks/${task.id}`);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Send Back to In Progress
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Comments ───────────────────────────────────────────────── */}
          <CommentThread
            taskId={task.id}
            initialComments={nestedComments}
            currentUserId={session.user.id}
            currentUserRole={session.user.role}
            canComment={task.status !== TaskStatus.COMPLETED}
            enableRealtime
            pollingIntervalMs={15_000}
          />
        </div>

        {/* ── Activity Log ─────────────────────────────────────────────── */}
        <aside>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-400">
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLog.length === 0 ? (
                  <p className="text-xs text-slate-400">No activity yet.</p>
                ) : (
                  auditLog.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                      <div>
                        <p className="text-xs text-slate-700">
                          <span className="font-semibold">{log.actor.name}</span>{" "}
                          {formatAuditAction(log.action, log.meta)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task meta */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-400">
                Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-400">Created by</p>
                <p className="mt-0.5 text-slate-800">{task.createdBy.name ?? task.createdBy.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Assignees</p>
                <p className="mt-0.5 text-slate-800">{task.assignments.length}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Created</p>
                <p className="mt-0.5 text-slate-800">
                  {new Date(task.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function formatAuditAction(action: string, meta: unknown): string {
  const m = meta as Record<string, unknown> | null;
  switch (action) {
    case "CREATED":       return "created this task";
    case "STATUS_CHANGED":
      if (m?.from && m?.to) return `moved task: ${m.from} → ${m.to}`;
      return "changed task status";
    case "ASSIGNED":      return "updated assignees";
    case "UNASSIGNED":    return "removed an assignee";
    case "COMMENTED":     return "left a comment";
    case "UPDATED":
      if (m?.rejected) return `rejected: "${m.reason}"`;
      return "updated task details";
    case "DELETED":       return "deleted this task";
    default:              return action.toLowerCase().replace(/_/g, " ");
  }
}
