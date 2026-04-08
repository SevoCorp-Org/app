import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { AlertCircle, Briefcase, Building2, CheckCircle2, ClipboardList } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Overview — SevoCorp" };

export default async function ProfessionalOverviewPage() {
  const session      = await requireProfessional();
  const professionalId = session.user.professionalId!;
  const firstName    = session.user.name?.split(" ")[0] ?? "there";

  const [assignments, companies, profile] = await Promise.all([
    prisma.taskAssignment.findMany({
      where: {
        professionalId,
        task: { status: { in: ["APPROVED", "IN_PROGRESS", "REVIEW"] } },
      },
      orderBy: { assignedAt: "desc" },
      select: {
        assignedAt: true,
        task: {
          select: {
            id: true, title: true, status: true, priority: true, dueDate: true,
            workspace: { select: { name: true } },
            company:   { select: { name: true } },
          },
        },
      },
    }),
    prisma.companyProfessional.findMany({
      where:  { professionalId, status: "ACTIVE" },
      select: { company: { select: { id: true, name: true } } },
    }),
    prisma.professional.findUnique({
      where:  { id: professionalId },
      select: { available: true, title: true },
    }),
  ]);

  type AssignmentRow = {
    assignedAt: Date;
    task: {
      id: string; title: string; status: string; priority: string;
      dueDate: Date | null;
      workspace: { name: string };
      company:   { name: string };
    };
  };
  type CompanyRow = { company: { id: string; name: string } };

  const typedAssignments = assignments as AssignmentRow[];
  const typedCompanies   = companies   as CompanyRow[];

  const now       = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const dueSoon   = typedAssignments.filter((a) => a.task.dueDate && a.task.dueDate <= threeDays).length;
  const inReview  = typedAssignments.filter((a) => a.task.status === "REVIEW").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-slate-500">
            {profile?.title ?? "Professional"}&nbsp;&nbsp;
            <Badge variant={profile?.available ? "completed" : "secondary"} className="ml-1">
              {profile?.available ? "Available" : "Unavailable"}
            </Badge>
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/professional/tasks">All Tasks</Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Tasks" value={typedAssignments.length} icon={ClipboardList} color="blue" />
        <StatCard label="Due Soon (3d)" value={dueSoon}           icon={AlertCircle}   color="amber" />
        <StatCard label="In Review"     value={inReview}          icon={CheckCircle2}  color="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Task list */}
        <div className="space-y-3 lg:col-span-2">
          <PageHeader title="Active Tasks" icon={Briefcase}>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/professional/tasks">View all</Link>
            </Button>
          </PageHeader>

          {typedAssignments.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No active tasks"
              description="You have no tasks assigned right now."
            />
          ) : (
            <div className="space-y-2">
              {typedAssignments.slice(0, 6).map((a) => (
                <Link
                  key={a.task.id}
                  href={`/professional/tasks/${a.task.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{a.task.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {a.task.company.name} · {a.task.workspace.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={a.task.status} />
                    <PriorityBadge priority={a.task.priority} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Companies sidebar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              My Companies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {typedCompanies.length === 0 ? (
              <p className="text-sm text-slate-400">Not affiliated with any company.</p>
            ) : (
              typedCompanies.map((cp) => (
                <div
                  key={cp.company.id}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-600">
                    {cp.company.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-sm font-medium text-slate-700">
                    {cp.company.name}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
