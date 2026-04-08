import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { CreateWorkspaceSheet } from "@/components/company/CreateWorkspaceSheet";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { Archive, ClipboardList, FolderOpen, Users } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Workspaces — SevoCorp" };

export default async function CompanyWorkspacesPage() {
  const session   = await requireCompany();
  const companyId = session.user.companyId!;

  const workspaces = await prisma.workspace.findMany({
    where:   { companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, description: true,
      isArchived: true, createdAt: true,
      _count: { select: { tasks: true, members: true } },
    },
  });

  type WorkspaceItem = (typeof workspaces)[number];
  const active   = (workspaces as WorkspaceItem[]).filter((w) => !w.isArchived);
  const archived = (workspaces as WorkspaceItem[]).filter((w) =>  w.isArchived);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces"
        description={`${active.length} active workspace${active.length !== 1 ? "s" : ""}`}
        icon={FolderOpen}
      >
        <CreateWorkspaceSheet />
      </PageHeader>

      {/* Active workspaces */}
      {active.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No workspaces yet"
          description="Create a workspace to organise your tasks and team."
        >
          <CreateWorkspaceSheet />
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((ws) => (
            <Link
              key={ws.id}
              href={`/company/workspaces/${ws.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <FolderOpen className="h-5 w-5 text-slate-500 group-hover:text-slate-700" />
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-slate-700">
                {ws.name}
              </h3>
              {ws.description && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {ws.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {ws._count.tasks} task{ws._count.tasks !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {ws._count.members} member{ws._count.members !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Archived workspaces */}
      {archived.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Archive className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-medium text-slate-500">
              Archived ({archived.length})
            </h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {archived.map((ws) => (
                  <Link
                    key={ws.id}
                    href={`/company/workspaces/${ws.id}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderOpen className="h-4 w-4 text-slate-300" />
                      <span className="text-sm text-slate-500">{ws.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{ws._count.tasks} tasks</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
