import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateTaskSheet } from "@/components/company/CreateTaskSheet";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@prisma/client";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Tasks — SevoCorp" };

const STATUS_TABS: { label: string; value: TaskStatus | "ALL" }[] = [
  { label: "All",         value: "ALL" },
  { label: "Pending",     value: "PENDING" },
  { label: "Approved",    value: "APPROVED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Review",      value: "REVIEW" },
  { label: "Completed",   value: "COMPLETED" },
];

export default async function CompanyTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; workspace?: string }>;
}) {
  const params    = await searchParams;
  const session   = await requireCompany();
  const companyId = session.user.companyId!;

  const validStatuses: TaskStatus[] = ["PENDING", "APPROVED", "IN_PROGRESS", "REVIEW", "COMPLETED"];
  const statusFilter = validStatuses.includes(params.status as TaskStatus)
    ? (params.status as TaskStatus)
    : undefined;

  const [tasks, workspaces, counts] = await Promise.all([
    prisma.task.findMany({
      where: {
        companyId,
        ...(statusFilter && { status: statusFilter }),
        ...(params.workspace && { workspaceId: params.workspace }),
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true, title: true, status: true, priority: true,
        dueDate: true, createdAt: true,
        workspace:   { select: { id: true, name: true } },
        assignments: { select: { professional: { select: { user: { select: { name: true } } } } } },
      },
    }),
    prisma.workspace.findMany({
      where:   { companyId, isArchived: false },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.groupBy({ by: ["status"], where: { companyId }, _count: true }),
  ]);

  type StatusGroup = { status: string; _count: number };
  const countMap = Object.fromEntries((counts as StatusGroup[]).map((c) => [c.status, c._count]));
  const total    = (counts as StatusGroup[]).reduce((s, c) => s + c._count, 0);

  const overdueCount = (tasks as (typeof tasks)[number][]).filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={`${total} task${total !== 1 ? "s" : ""}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`}
        icon={ClipboardList}
      >
        <CreateTaskSheet workspaces={workspaces} />
      </PageHeader>

      {/* Workspace filter pills */}
      {workspaces.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={statusFilter ? `?status=${statusFilter}` : "?"}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !params.workspace
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            All workspaces
          </Link>
          {(workspaces as (typeof workspaces)[number][]).map((ws) => (
            <Link
              key={ws.id}
              href={`?${statusFilter ? `status=${statusFilter}&` : ""}workspace=${ws.id}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                params.workspace === ws.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {ws.name}
            </Link>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {STATUS_TABS.map((tab) => {
          const count  = tab.value === "ALL" ? total : (countMap[tab.value] ?? 0);
          const active = tab.value === "ALL" ? !statusFilter : statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "ALL"
                  ? params.workspace ? `?workspace=${params.workspace}` : "?"
                  : `?status=${tab.value}${params.workspace ? `&workspace=${params.workspace}` : ""}`
              }
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

      {/* Task table */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks found"
          description={statusFilter ? "No tasks with this status yet." : "Create your first task to get started."}
        >
          {!statusFilter && <CreateTaskSheet workspaces={workspaces} />}
        </EmptyState>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Assignees</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tasks as (typeof tasks)[number][]).map((task) => {
                  const isOverdue =
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== "COMPLETED";
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Link
                          href={`/company/tasks/${task.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {task.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/company/workspaces/${task.workspace.id}`}
                          className="text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          {task.workspace.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {(task.assignments as (typeof task.assignments)[number][]).length > 0 ? (
                          <span className="text-slate-600">
                            {(task.assignments as (typeof task.assignments)[number][])
                              .map((a) => a.professional.user.name ?? "—")
                              .join(", ")}
                          </span>
                        ) : (
                          <span className="text-slate-300">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                      <TableCell><StatusBadge status={task.status} /></TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <span className={isOverdue ? "font-medium text-red-600" : "text-slate-500"}>
                            {new Date(task.dueDate).toLocaleDateString()}
                            {isOverdue && <span className="ml-1 text-xs">· overdue</span>}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
