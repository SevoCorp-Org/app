import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { Building2, Briefcase, ClipboardList, FolderOpen, User, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      workspaces: {
        select: {
          id: true, name: true, isArchived: true,
          _count: { select: { tasks: true, members: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      professionals: {
        select: {
          status: true, joinedAt: true,
          professional: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!company) notFound();

  type WorkspaceRow    = (typeof company.workspaces)[number];
  type ProfessionalRow = (typeof company.professionals)[number];

  function cpVariant(status: string): "completed" | "pending" | "secondary" {
    if (status === "ACTIVE") return "completed";
    if (status === "PENDING") return "pending";
    return "secondary";
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/companies" className="text-sm text-slate-400 hover:text-slate-600">
              Companies
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600">{company.name}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{company.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
            <span className="font-mono">{company.slug}</span>
            {company.industry && (
              <>
                <span>·</span>
                <span>{company.industry}</span>
              </>
            )}
          </p>
        </div>
        <Badge variant={company.isActive ? "completed" : "destructive"}>
          {company.isActive ? "Active" : "Suspended"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ── Workspaces ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-4 w-4 text-slate-400" />
                Workspaces
                <span className="ml-auto text-sm font-normal text-slate-400">
                  {company.workspaces.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {company.workspaces.length === 0 ? (
                <p className="text-sm text-slate-400">No workspaces created.</p>
              ) : (
                (company.workspaces as WorkspaceRow[]).map((ws) => (
                  <div
                    key={ws.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-800">{ws.name}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <ClipboardList className="h-3.5 w-3.5" />
                        {ws._count.tasks}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {ws._count.members}
                      </span>
                      {ws.isArchived && (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* ── Professionals ──────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4 text-slate-400" />
                Professionals
                <span className="ml-auto text-sm font-normal text-slate-400">
                  {company.professionals.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {company.professionals.length === 0 ? (
                <p className="text-sm text-slate-400">No professionals linked.</p>
              ) : (
                (company.professionals as ProfessionalRow[]).map((cp) => (
                  <div
                    key={cp.professional.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {cp.professional.user.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {cp.professional.user.email}
                      </p>
                    </div>
                    <Badge variant={cpVariant(cp.status)}>{cp.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar info ───────────────────────────────────────────────── */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-400">Owner</p>
                <p className="mt-0.5 text-slate-800">{company.owner.name ?? "—"}</p>
                <p className="text-xs text-slate-400">{company.owner.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Total Tasks</p>
                <p className="mt-0.5 text-slate-800">{company._count.tasks}</p>
              </div>
              {company.website && (
                <div>
                  <p className="text-xs font-medium text-slate-400">Website</p>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 text-indigo-600 hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-400">Joined</p>
                <p className="mt-0.5 text-slate-800">
                  {new Date(company.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
