import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { QuickApproveButton, QuickReviewActions } from "@/components/admin/AdminTaskQuickActions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";
import { TaskStatus } from "@prisma/client";
import { CalendarDays, ClipboardList, Users } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Task Queue — SevoCorp Admin" };
export const dynamic  = "force-dynamic";

const TABS = [
  { label: "Pending Review", status: TaskStatus.PENDING,     color: "amber"   },
  { label: "Approved",       status: TaskStatus.APPROVED,    color: "blue"    },
  { label: "In Progress",    status: TaskStatus.IN_PROGRESS, color: "indigo"  },
  { label: "In Review",      status: TaskStatus.REVIEW,      color: "purple"  },
  { label: "Completed",      status: TaskStatus.COMPLETED,   color: "emerald" },
] as const;

export default async function AdminTaskQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const statusFilter = Object.values(TaskStatus).includes(params.status as TaskStatus)
    ? (params.status as TaskStatus)
    : TaskStatus.PENDING;

  const [tasks, counts] = await Promise.all([
    prisma.task.findMany({
      where:   { status: statusFilter },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, title: true, status: true, priority: true,
        dueDate: true, createdAt: true,
        company:    { select: { name: true } },
        workspace:  { select: { name: true } },
        createdBy:  { select: { name: true } },
        _count:     { select: { assignments: true, comments: true } },
      },
    }),
    prisma.task.groupBy({ by: ["status"], _count: true }),
  ]);

  type CountGroup = { status: string; _count: number };
  const countMap = Object.fromEntries((counts as CountGroup[]).map((c) => [c.status, c._count]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Queue"
        description="Review, approve, and assign tasks across all companies."
        icon={ClipboardList}
      />

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((tab) => {
          const count  = countMap[tab.status] ?? 0;
          const active = statusFilter === tab.status;
          return (
            <Link
              key={tab.status}
              href={`?status=${tab.status}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                )}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks here"
          description="No tasks with this status right now."
        />
      ) : (
        <div className="space-y-2">
          {(tasks as (typeof tasks)[number][]).map((task) => {
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";
            const isPending = task.status === TaskStatus.PENDING;
            const isReview  = task.status === TaskStatus.REVIEW;

            return (
              <div
                key={task.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
              >
                {/* Left — clickable title/meta */}
                <Link href={`/admin/tasks/${task.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 hover:underline">
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    <span className="font-medium text-slate-600">{task.company.name}</span>
                    <span>·</span>
                    <span>{task.workspace.name}</span>
                    <span>·</span>
                    <span>by {task.createdBy.name ?? "unknown"}</span>
                    <span>·</span>
                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>

                {/* Right — badges + actions */}
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  {task._count.assignments > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Users className="h-3 w-3" />
                      {task._count.assignments}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className={cn(
                      "flex items-center gap-1 text-xs",
                      isOverdue ? "font-medium text-red-600" : "text-slate-400"
                    )}>
                      <CalendarDays className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}

                  {/* Quick actions */}
                  {isPending && <QuickApproveButton taskId={task.id} />}
                  {isReview  && <QuickReviewActions taskId={task.id} />}
                  {task.status === TaskStatus.APPROVED && (
                    <Link
                      href={`/admin/tasks/${task.id}`}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
                    >
                      Assign →
                    </Link>
                  )}

                  <Link
                    href={`/admin/tasks/${task.id}`}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    View →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
