import { transitionTaskStatus } from "@/actions/task.actions";
import { CommentThread } from "@/components/comments/CommentThread";
import type { CommentData } from "@/components/comments/types";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TaskUploadSection } from "@/components/upload/TaskUploadSection";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { getAllowedTransitions, TASK_STATUS_LABELS } from "@/lib/task-transitions";
import { Role, TaskStatus } from "@/lib/enums";
import { Building2, CalendarDays, FolderOpen, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function ProfessionalTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session        = await requireProfessional();
  const professionalId = session.user.professionalId!;
  const { id }         = await params;

  const assignment = await prisma.taskAssignment.findUnique({
    where: { taskId_professionalId: { taskId: id, professionalId } },
  });
  if (!assignment) notFound();

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      workspace: { select: { name: true } },
      company:   { select: { name: true } },
      createdBy: { select: { name: true } },
      assignments: {
        select: {
          professional: {
            select: { id: true, title: true, user: { select: { name: true } } },
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

  const allowedTransitions = getAllowedTransitions(task.status, Role.PROFESSIONAL);
  const canUploadFiles =
    task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REVIEW;
  const canComment = task.status !== TaskStatus.COMPLETED;

  const repliesMap = task.comments
    .filter((c) => c.parentId)
    .reduce<Record<string, typeof task.comments>>((acc, reply) => {
      const key = reply.parentId!;
      acc[key] = acc[key] ?? [];
      acc[key].push(reply);
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

  function initials(name: string | null | undefined) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }

  const TRANSITION_STYLES: Record<string, string> = {
    [TaskStatus.IN_PROGRESS]: "bg-indigo-600 hover:bg-indigo-700 text-white",
    [TaskStatus.REVIEW]:      "bg-purple-600 hover:bg-purple-700 text-white",
    [TaskStatus.COMPLETED]:   "bg-emerald-600 hover:bg-emerald-700 text-white",
  };

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb + Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/professional/tasks" className="hover:text-slate-600">Tasks</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 line-clamp-1">{task.title}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{task.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {task.company.name}
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

          {/* ── Start Task button — shown when APPROVED ────────────────── */}
          {task.status === TaskStatus.APPROVED && (
            <Card className="border-indigo-200">
              <CardContent className="flex items-center justify-between pt-5">
                <div>
                  <p className="font-medium text-slate-900">Ready to start?</p>
                  <p className="text-sm text-slate-500">Click to begin working on this task.</p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await transitionTaskStatus({ taskId: task!.id, to: TaskStatus.IN_PROGRESS });
                    revalidatePath(`/professional/tasks/${task!.id}`);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    Start Task
                  </button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Deliverables ───────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Deliverables & Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskUploadSection
                taskId={task.id}
                initialFiles={task.uploads.map((f) => ({
                  ...f,
                  uploadedBy: f.uploadedBy
                    ? { name: f.uploadedBy.name, role: f.uploadedBy.role }
                    : undefined,
                }))}
                canUpload={canUploadFiles}
                canDelete={true}
              />
            </CardContent>
          </Card>

          {/* ── Submit for Review — shown when IN_PROGRESS ─────────────── */}
          {task.status === TaskStatus.IN_PROGRESS && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="flex items-center justify-between pt-5">
                <div>
                  <p className="font-medium text-slate-900">Done with this task?</p>
                  <p className="text-sm text-slate-500">Upload your deliverables above, then submit for admin review.</p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await transitionTaskStatus({ taskId: task!.id, to: TaskStatus.REVIEW });
                    revalidatePath(`/professional/tasks/${task!.id}`);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-md bg-purple-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-purple-700"
                  >
                    Submit for Review
                  </button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Completed notice ────────────────────────────────────────── */}
          {task.status === TaskStatus.COMPLETED && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-5">
                <p className="font-medium text-emerald-800">Task completed</p>
                <p className="text-sm text-emerald-700">This task has been marked as completed by the admin.</p>
              </CardContent>
            </Card>
          )}

          {/* ── In Review notice ────────────────────────────────────────── */}
          {task.status === TaskStatus.REVIEW && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-5">
                <p className="font-medium text-amber-800">Awaiting review</p>
                <p className="text-sm text-amber-700">Your submission is being reviewed by the admin. You'll be notified if it's sent back.</p>
              </CardContent>
            </Card>
          )}

          {/* ── Comments ───────────────────────────────────────────────── */}
          <CommentThread
            taskId={task.id}
            initialComments={nestedComments}
            currentUserId={session.user.id}
            currentUserRole={session.user.role}
            canComment={canComment}
            enableRealtime
            pollingIntervalMs={15_000}
          />
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="space-y-4">
          {/* Assignees */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-slate-400" />
                Assignees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {task.assignments.map((a) => {
                const isMe = a.professional.id === professionalId;
                return (
                  <div
                    key={a.professional.id}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${isMe ? "bg-indigo-50 border border-indigo-200" : "bg-slate-50 border border-slate-100"}`}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {initials(a.professional.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={`text-sm font-medium ${isMe ? "text-indigo-900" : "text-slate-800"}`}>
                        {a.professional.user.name ?? "—"}
                        {isMe && " (you)"}
                      </p>
                      {a.professional.title && (
                        <p className="text-xs text-slate-400">{a.professional.title}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Task info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-400">
                Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-400">Created by</p>
                <p className="mt-0.5 text-slate-800">{task.createdBy.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Created</p>
                <p className="mt-0.5 text-slate-800">
                  {new Date(task.createdAt).toLocaleDateString()}
                </p>
              </div>
              {task.dueDate && (
                <div>
                  <p className="text-xs font-medium text-slate-400">Due Date</p>
                  <p className="mt-0.5 text-slate-800">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
