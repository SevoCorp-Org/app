import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateTaskSheet } from "@/components/company/CreateTaskSheet";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { CheckCircle2, ClipboardList, Clock, FolderOpen, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import type { TaskPriority, TaskStatus } from "@/lib/enums";

export const metadata = { title: "Dashboard — SevoCorp" };

export default async function CompanyDashboardPage() {
  const session   = await requireCompany();
  const companyId = session.user.companyId!;
  const userName  = session.user.name ?? "there";

  const [workspaces, tasksByStatus, recentTasks, activeProfessionalCount] = await Promise.all([
    prisma.workspace.findMany({
      where:   { companyId, isArchived: false },
      orderBy: { createdAt: "desc" },
      take:    6,
      select:  { id: true, name: true, _count: { select: { tasks: true, members: true } } },
    }),
    prisma.task.groupBy({ by: ["status"], where: { companyId }, _count: true }),
    prisma.task.findMany({
      where:   { companyId },
      orderBy: { updatedAt: "desc" },
      take:    8,
      select:  {
        id: true, title: true, status: true, priority: true, dueDate: true,
        workspace: { select: { name: true } },
      },
    }),
    prisma.companyProfessional.count({ where: { companyId, status: "ACTIVE" } }),
  ]);

  type TaskRow = {
    id: string; title: string; status: TaskStatus; priority: TaskPriority;
    dueDate: Date | null;
    workspace: { name: string };
  };
  type WorkspaceRow = {
    id: string; name: string;
    _count: { tasks: number; members: number };
  };
  type StatusGroup = { status: string; _count: number };

  const typedTasks      = recentTasks  as TaskRow[];
  const typedWorkspaces = workspaces   as WorkspaceRow[];

  const sm         = Object.fromEntries((tasksByStatus as StatusGroup[]).map((g) => [g.status, g._count]));
  const totalTasks = (tasksByStatus as StatusGroup[]).reduce((s, g) => s + g._count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Good day, ${userName.split(" ")[0]}`}
        description="Here's what's happening across your workspaces."
        icon={LayoutDashboard}
      >
        <CreateTaskSheet workspaces={workspaces} />
      </PageHeader>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Tasks"    value={totalTasks}                        icon={ClipboardList} color="slate" />
        <StatCard label="Pending Review" value={sm["PENDING"] ?? 0}               icon={Clock}         color="amber" />
        <StatCard label="In Progress"    value={(sm["IN_PROGRESS"] ?? 0) + (sm["REVIEW"] ?? 0)} icon={CheckCircle2} color="blue" />
        <StatCard label="Professionals"  value={activeProfessionalCount}           icon={Users}         color="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Recent Tasks</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/company/tasks">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {typedTasks.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  icon={ClipboardList}
                  title="No tasks yet"
                  description="Create your first task to get started."
                >
                  <CreateTaskSheet workspaces={workspaces} />
                </EmptyState>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typedTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Link
                          href={`/company/tasks/${task.id}`}
                          className="font-medium text-slate-900 hover:text-slate-700 hover:underline"
                        >
                          {task.title}
                        </Link>
                        {task.dueDate && (
                          <p className="text-xs text-slate-400">
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">{task.workspace.name}</TableCell>
                      <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                      <TableCell><StatusBadge status={task.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Workspaces */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Workspaces</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/company/workspaces">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {typedWorkspaces.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No workspaces"
                description="Create a workspace to organise your tasks."
              />
            ) : (
              typedWorkspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/company/workspaces/${ws.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white">
                      <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-900 truncate max-w-[120px]">
                      {ws.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{ws._count.tasks} tasks</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

