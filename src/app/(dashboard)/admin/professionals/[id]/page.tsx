import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { Briefcase, Building2, CalendarDays, UserCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminProfessionalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const professional = await prisma.professional.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true, isActive: true, createdAt: true } },
      companies: {
        select: {
          status: true, joinedAt: true,
          company: { select: { id: true, name: true } },
        },
      },
      assignments: {
        take: 10,
        orderBy: { assignedAt: "desc" },
        select: {
          assignedAt: true,
          task: {
            select: {
              id: true, title: true, status: true,
              company: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!professional) notFound();

  type CompanyRow    = (typeof professional.companies)[number];
  type AssignmentRow = (typeof professional.assignments)[number];

  const STATUS_STYLES: Record<string, string> = {
    PENDING:     "bg-yellow-50 text-yellow-700 border-yellow-200",
    APPROVED:    "bg-blue-50 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-indigo-50 text-indigo-700 border-indigo-200",
    REVIEW:      "bg-purple-50 text-purple-700 border-purple-200",
    COMPLETED:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED:   "bg-slate-50 text-slate-400 border-slate-200",
  };

  function cpVariant(status: string): "completed" | "pending" | "secondary" {
    if (status === "ACTIVE") return "completed";
    if (status === "PENDING") return "pending";
    return "secondary";
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb + Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/professionals" className="text-sm text-slate-400 hover:text-slate-600">
              Professionals
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-600">
              {professional.user.name ?? professional.user.email}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {professional.user.name ?? professional.user.email}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {professional.title ?? "No title set"} · {professional.user.email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={professional.available ? "completed" : "secondary"}>
            {professional.available ? "Available" : "Unavailable"}
          </Badge>
          {!professional.user.isActive && (
            <Badge variant="destructive">Account Inactive</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ── Skills ─────────────────────────────────────────────────── */}
          {(professional.skills as string[]).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(professional.skills as string[]).map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Companies ──────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-slate-400" />
                Companies
                <span className="ml-auto text-sm font-normal text-slate-400">
                  {professional.companies.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {professional.companies.length === 0 ? (
                <p className="text-sm text-slate-400">Not linked to any company.</p>
              ) : (
                (professional.companies as CompanyRow[]).map((cp) => (
                  <div
                    key={cp.company.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <Link
                        href={`/admin/companies/${cp.company.id}`}
                        className="text-sm font-medium text-slate-800 hover:underline"
                      >
                        {cp.company.name}
                      </Link>
                      <p className="text-xs text-slate-400">
                        Joined {new Date(cp.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={cpVariant(cp.status)}>{cp.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* ── Recent Assignments ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4 text-slate-400" />
                Recent Task Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {professional.assignments.length === 0 ? (
                <p className="text-sm text-slate-400">No task assignments yet.</p>
              ) : (
                (professional.assignments as AssignmentRow[]).map((a) => (
                  <div
                    key={a.task.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{a.task.title}</p>
                      <p className="text-xs text-slate-400">{a.task.company.name}</p>
                    </div>
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.task.status] ?? "bg-slate-50 text-slate-400 border-slate-200"}`}
                    >
                      {a.task.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {professional.hourlyRate && (
                <div>
                  <p className="text-xs font-medium text-slate-400">Hourly Rate</p>
                  <p className="mt-0.5 text-slate-800">
                    ${Number(professional.hourlyRate)}/hr
                  </p>
                </div>
              )}
              {professional.bio && (
                <div>
                  <p className="text-xs font-medium text-slate-400">Bio</p>
                  <p className="mt-0.5 line-clamp-4 text-slate-600">{professional.bio}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-400">Member Since</p>
                <p className="mt-0.5 text-slate-800">
                  {new Date(professional.user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
