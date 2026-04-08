import { EmptyState } from "@/components/shared/EmptyState";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { CalendarDays, ClipboardList, FolderOpen, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const STATUS_ORDER = ["PENDING", "APPROVED", "IN_PROGRESS", "REVIEW", "COMPLETED"] as const;
type StatusKey = (typeof STATUS_ORDER)[number];

const STATUS_COLORS: Record<StatusKey, string> = {
  PENDING:     "border-yellow-200 bg-yellow-50",
  APPROVED:    "border-blue-200 bg-blue-50",
  IN_PROGRESS: "border-indigo-200 bg-indigo-50",
  REVIEW:      "border-purple-200 bg-purple-50",
  COMPLETED:   "border-emerald-200 bg-emerald-50",
};

const STATUS_LABELS: Record<StatusKey, string> = {
  PENDING:     "Pending",
  APPROVED:    "Approved",
  IN_PROGRESS: "In Progress",
  REVIEW:      "In Review",
  COMPLETED:   "Completed",
};

export default async function WorkspaceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session   = await requireCompany();
  const companyId = session.user.companyId!;

  const workspace = await prisma.workspace.findFirst({
    where: { id: params.id, companyId },
    include: {
      tasks: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, title: true, status: true, priority: true, dueDate: true,
          assignments: {
            select: {
              professional: { select: { user: { select: { name: true } } } },
            },
          },
        },
      },
      members: {
        select: {
          joinedAt: true,
          professional: {
            select: {
              id: true, title: true,
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!workspace) notFound();

  const byStatus = STATUS_ORDER.reduce<Record<StatusKey, typeof workspace.tasks>>(
    (acc, s) => { acc[s] = workspace.tasks.filter((t) => t.status === s); return acc; },
    {} as Record<StatusKey, typeof workspace.tasks>
  );

  type TaskRow = (typeof workspace.tasks)[number];
  type MemberRow = (typeof workspace.members)[number];

  function initials(name: string | null | undefined) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb + Header ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/company/workspaces" className="hover:text-slate-600">Workspaces</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">{workspace.name}</span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{workspace.name}</h1>
            {workspace.description && (
              <p className="mt-1 text-sm text-slate-400">{workspace.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
            <ClipboardList className="h-4 w-4" />
            {workspace.tasks.length} tasks
            <Users className="ml-2 h-4 w-4" />
            {workspace.members.length} members
          </div>
        </div>
      </div>

      {/* ── Members strip ──────────────────────────────────────────────── */}
      {workspace.members.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Team:</span>
          {(workspace.members as MemberRow[]).map((m) => (
            <div key={m.professional.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-sm">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[9px]">{initials(m.professional.user.name)}</AvatarFallback>
              </Avatar>
              {m.professional.user.name ?? "—"}
            </div>
          ))}
        </div>
      )}

      {/* ── Kanban board ───────────────────────────────────────────────── */}
      {workspace.tasks.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No tasks in this workspace"
          description="Tasks added to this workspace will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="space-y-2">
              <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${STATUS_COLORS[status]}`}>
                <span className="text-xs font-semibold text-slate-700">
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-slate-400">{byStatus[status].length}</span>
              </div>
              <div className="space-y-2">
                {(byStatus[status] as TaskRow[]).map((task) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <Link
                        href={`/company/tasks/${task.id}`}
                        className="block text-sm font-medium text-slate-800 hover:text-slate-600 hover:underline"
                      >
                        {task.title}
                      </Link>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <PriorityBadge priority={task.priority} />
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {task.assignments.length > 0 && (
                        <div className="mt-2 flex -space-x-1">
                          {task.assignments.slice(0, 3).map((a, i) => (
                            <Avatar key={i} className="h-5 w-5 border-2 border-white">
                              <AvatarFallback className="text-[9px]">
                                {initials(a.professional.user.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {task.assignments.length > 3 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] text-slate-600">
                              +{task.assignments.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
