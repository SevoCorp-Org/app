import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { Building2, ClipboardList, FolderOpen } from "lucide-react";

export const metadata = { title: "Workspaces — SevoCorp" };

export default async function ProfessionalWorkspacesPage() {
  const session        = await requireProfessional();
  const professionalId = session.user.professionalId!;

  const memberships = await prisma.workspaceMember.findMany({
    where:   { professionalId },
    orderBy: { joinedAt: "desc" },
    select: {
      joinedAt: true,
      workspace: {
        select: {
          id: true, name: true, description: true, isArchived: true,
          company: { select: { name: true } },
          _count:  { select: { tasks: true } },
          tasks: {
            where: {
              assignments: { some: { professionalId } },
              status: { in: ["PENDING", "APPROVED", "IN_PROGRESS", "REVIEW"] },
            },
            select: { id: true },
          },
        },
      },
    },
  });

  const active   = memberships.filter((m) => !m.workspace.isArchived);
  const archived = memberships.filter((m) => m.workspace.isArchived);

  type MemberRow = (typeof memberships)[number];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workspaces"
        description={`Member of ${memberships.length} workspace${memberships.length !== 1 ? "s" : ""}`}
        icon={FolderOpen}
      />

      {/* ── Active ───────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        {active.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No workspaces yet"
            description="You'll appear here once a company adds you to a workspace."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(active as MemberRow[]).map((m) => (
              <Card key={m.workspace.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900 leading-tight">
                      {m.workspace.name}
                    </p>
                    <Badge variant="secondary" className="shrink-0">Active</Badge>
                  </div>

                  <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <Building2 className="h-3.5 w-3.5" />
                    {m.workspace.company.name}
                  </div>

                  {m.workspace.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-slate-500">
                      {m.workspace.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <ClipboardList className="h-3.5 w-3.5" />
                      {m.workspace._count.tasks} total
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <ClipboardList className="h-3.5 w-3.5 text-indigo-400" />
                      {m.workspace.tasks.length} assigned
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Archived ─────────────────────────────────────────────────────── */}
      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Archived
          </h2>
          <div className="space-y-2">
            {(archived as MemberRow[]).map((m) => (
              <div
                key={m.workspace.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <FolderOpen className="h-4 w-4" />
                  {m.workspace.name}
                </div>
                <span className="text-xs text-slate-300">{m.workspace.company.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
