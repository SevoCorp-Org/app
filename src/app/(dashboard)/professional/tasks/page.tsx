import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { cn } from "@/lib/utils";
import { TaskStatus } from "@prisma/client";
import { Briefcase, CalendarDays, MessageSquare } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "My Tasks — SevoCorp" };

const STATUS_TABS: { label: string; value: TaskStatus | "ALL" }[] = [
  { label: "All",         value: "ALL" },
  { label: "Approved",    value: "APPROVED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Review",      value: "REVIEW" },
  { label: "Completed",   value: "COMPLETED" },
];

export default async function ProfessionalTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params         = await searchParams;
  const session        = await requireProfessional();
  const professionalId = session.user.professionalId!;

  const validStatuses: TaskStatus[] = ["APPROVED", "IN_PROGRESS", "REVIEW", "COMPLETED"];
  const statusFilter = validStatuses.includes(params.status as TaskStatus)
    ? (params.status as TaskStatus)
    : undefined;

  const [assignments, counts] = await Promise.all([
    prisma.taskAssignment.findMany({
      where: {
        professionalId,
        ...(statusFilter && { task: { status: statusFilter } }),
      },
      orderBy: { assignedAt: "desc" },
      select: {
        assignedAt: true,
        task: {
          select: {
            id: true, title: true, description: true,
            status: true, priority: true, dueDate: true,
            workspace: { select: { name: true } },
            company:   { select: { name: true } },
            _count:    { select: { comments: true } },
          },
        },
      },
    }),
    prisma.taskAssignment.groupBy({
      by: [],
      where: { professionalId },
      _count: true,
    }),
  ]);

  // Count per status for tabs
  const allAssignments = await prisma.taskAssignment.findMany({
    where:  { professionalId },
    select: { task: { select: { status: true } } },
  });
  type AssignmentItem = { task: { status: string } };
  const tabCounts = (allAssignments as AssignmentItem[]).reduce<Record<string, number>>((acc, a) => {
    acc[a.task.status] = (acc[a.task.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description={`${allAssignments.length} task${allAssignments.length !== 1 ? "s" : ""} assigned to you`}
        icon={Briefcase}
      />

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {STATUS_TABS.map((tab) => {
          const count  = tab.value === "ALL"
            ? allAssignments.length
            : (tabCounts[tab.value] ?? 0);
          const active = tab.value === "ALL" ? !statusFilter : statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "ALL" ? "?" : `?status=${tab.value}`}
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

      {/* Task cards */}
      {assignments.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No tasks found"
          description={statusFilter ? "No tasks with this status." : "You have no tasks assigned yet."}
        />
      ) : (
        <div className="space-y-3">
          {(assignments as (typeof assignments)[number][]).map((a) => {
            const isOverdue =
              a.task.dueDate &&
              new Date(a.task.dueDate) < new Date() &&
              a.task.status !== "COMPLETED";
            return (
              <Link
                key={a.task.id}
                href={`/professional/tasks/${a.task.id}`}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{a.task.title}</p>
                  {a.task.description && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">
                      {a.task.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    <span className="font-medium text-slate-600">{a.task.company.name}</span>
                    <span>·</span>
                    <span>{a.task.workspace.name}</span>
                    {a.task._count.comments > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {a.task._count.comments}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={a.task.status} />
                  <PriorityBadge priority={a.task.priority} />
                  {a.task.dueDate && (
                    <span className={cn(
                      "flex items-center gap-1 text-xs",
                      isOverdue ? "font-medium text-red-600" : "text-slate-400"
                    )}>
                      <CalendarDays className="h-3 w-3" />
                      {new Date(a.task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
