import { transitionTaskStatus } from "@/actions/task.actions";
import { CommentThread } from "@/components/comments/CommentThread";
import type { CommentData } from "@/components/comments/types";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TaskUploadSection } from "@/components/upload/TaskUploadSection";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { getAllowedTransitions, TASK_STATUS_LABELS } from "@/lib/task-transitions";
import { Role, TaskStatus } from "@prisma/client";
import { CalendarDays, FolderOpen, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CompanyTaskDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session   = await requireCompany();
  const companyId = session.user.companyId!;

  const task = await prisma.task.findFirst({
    where: { id: params.id, companyId },
    include: {
      workspace: { select: { id: true, name: true } },
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

  const allowedTransitions = getAllowedTransitions(task.status, Role.COMPANY);
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
    [TaskStatus.COMPLETED]:  "bg-emerald-600 hover:bg-emerald-700 text-white",
    [TaskStatus.IN_PROGRESS]: "bg-indigo-600 hover:bg-indigo-700 text-white",
  };

  const TRANSITION_LABELS: Record<string, string> = {
    [TaskStatus.COMPLETED]:  "Mark as Completed",
    [TaskStatus.IN_PROGRESS]: "Send Back to In Progress",
  };

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb + Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href={`/company/workspaces/${task.workspace.id}`} className="hover:text-slate-600">
              {task.workspace.name}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 line-clamp-1">{task.title}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{task.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
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

          {/* ── Review Actions ──────────────────────────────────────────── */}
          {allowedTransitions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Review Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions.map((toStatus) => (
                    <form
                      key={toStatus}
                      action={async () => {
                        "use server";
                        await transitionTaskStatus({ taskId: task!.id, to: toStatus });
                      }}
                    >
                      <button
                        type="submit"
                        className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm transition ${TRANSITION_STYLES[toStatus] ?? "bg-slate-900 hover:bg-slate-700 text-white"}`}
                      >
                        {TRANSITION_LABELS[toStatus] ?? `Move to ${TASK_STATUS_LABELS[toStatus]}`}
                      </button>
                    </form>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Attachments ─────────────────────────────────────────────── */}
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
                canUpload={false}
                canDelete={false}
              />
            </CardContent>
          </Card>

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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-slate-400" />
                Assignees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {task.assignments.length === 0 ? (
                <p className="text-sm text-slate-400">No assignees yet.</p>
              ) : (
                task.assignments.map((a) => (
                  <div
                    key={a.professional.id}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {initials(a.professional.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {a.professional.user.name ?? "—"}
                      </p>
                      {a.professional.title && (
                        <p className="text-xs text-slate-400">{a.professional.title}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

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
