import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { Building2, ClipboardList, ClipboardCheck, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Admin Overview — SevoCorp" };

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [totalCompanies, totalProfessionals, tasksByStatus, recentAuditLogs, pendingTasks] =
    await Promise.all([
      prisma.company.count({ where: { isActive: true } }),
      prisma.professional.count(),
      prisma.task.groupBy({ by: ["status"], _count: true }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, action: true, entity: true, createdAt: true,
          actor:   { select: { name: true, email: true } },
          company: { select: { name: true } },
        },
      }),
      // Tasks awaiting admin action (PENDING)
      prisma.task.findMany({
        where:   { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take:    5,
        select: {
          id: true, title: true, priority: true, createdAt: true,
          company:   { select: { name: true } },
          workspace: { select: { name: true } },
        },
      }),
    ]);

  type StatusGroup  = { status: string; _count: number };
  type PendingTask  = {
    id: string; title: string; priority: string; createdAt: Date;
    company:   { name: string };
    workspace: { name: string };
  };
  type AuditRow = {
    id: string; action: string; entity: string; createdAt: Date;
    actor:   { name: string | null; email: string | null };
    company: { name: string };
  };

  const typedPending = pendingTasks    as PendingTask[];
  const typedLogs    = recentAuditLogs as AuditRow[];

  const sm         = Object.fromEntries((tasksByStatus as StatusGroup[]).map((g) => [g.status, g._count]));
  const totalTasks = (tasksByStatus as StatusGroup[]).reduce((s, g) => s + g._count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        description="Manage companies, tasks, and professionals across the platform."
        icon={LayoutDashboard}
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Companies"  value={totalCompanies}          icon={Building2}      color="blue" />
        <StatCard label="Professionals"     value={totalProfessionals}      icon={Users}          color="emerald" />
        <StatCard label="Total Tasks"       value={totalTasks}              icon={ClipboardList}  color="slate" />
        <StatCard label="Pending Approval"  value={sm["PENDING"] ?? 0}     icon={ClipboardCheck} color="amber"
          trend={(sm["PENDING"] ?? 0) > 0 ? { value: "needs attention", positive: false } : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending approval queue */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Approval Queue</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/tasks?status=PENDING">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {typedPending.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No tasks pending approval</p>
            ) : (
              typedPending.map((task) => (
                <Link
                  key={task.id}
                  href={`/admin/tasks/${task.id}`}
                  className="block rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-white"
                >
                  <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {task.company.name} · {task.workspace.name}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent audit log */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/audit-logs">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-slate-900">
                      {log.actor.name ?? log.actor.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">{log.company.name}</TableCell>
                    <TableCell className="text-slate-400 tabular-nums">
                      {log.createdAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
