import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { InviteButton, RemoveButton } from "@/components/company/ProfessionalActions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { Briefcase, DollarSign, Users } from "lucide-react";

export const metadata = { title: "Professionals — SevoCorp" };

export default async function CompanyProfessionalsPage() {
  const session   = await requireCompany();
  const companyId = session.user.companyId!;

  const [hired, available] = await Promise.all([
    prisma.companyProfessional.findMany({
      where: { companyId },
      select: {
        status: true,
        joinedAt: true,
        professional: {
          select: {
            id: true, title: true, skills: true, available: true,
            user:   { select: { name: true, email: true } },
            _count: { select: { assignments: true } },
          },
        },
      },
    }),

    prisma.professional.findMany({
      where: { available: true, companies: { none: { companyId } } },
      take: 20,
      select: {
        id: true, title: true, skills: true, hourlyRate: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  type HiredRow = (typeof hired)[number];
  type AvailRow = (typeof available)[number];

  function initials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }

  function statusVariant(status: string): "completed" | "pending" | "secondary" {
    if (status === "ACTIVE") return "completed";
    if (status === "PENDING") return "pending";
    return "secondary";
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Professionals"
        description="Manage your team and browse available talent"
        icon={Users}
      />

      {/* ── My Team ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">
          My Team{" "}
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
            {hired.length}
          </span>
        </h2>

        {hired.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Invite available professionals to add them to your team."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(hired as HiredRow[]).map((cp) => (
              <Card key={cp.professional.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm">
                          {initials(cp.professional.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900">
                          {cp.professional.user.name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {cp.professional.title ?? "No title"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusVariant(cp.status)}>
                      {cp.status}
                    </Badge>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1">
                    {(cp.professional.skills as string[]).slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600"
                      >
                        {s}
                      </span>
                    ))}
                    {(cp.professional.skills as string[]).length > 4 && (
                      <span className="text-xs text-slate-400">
                        +{(cp.professional.skills as string[]).length - 4}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Briefcase className="h-3.5 w-3.5" />
                      {cp.professional._count.assignments} assignment
                      {cp.professional._count.assignments !== 1 ? "s" : ""}
                    </div>
                    <RemoveButton professionalId={cp.professional.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Browse Available ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Available Professionals{" "}
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
            {available.length}
          </span>
        </h2>

        {available.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No available professionals"
            description="All platform professionals are currently engaged."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(available as AvailRow[]).map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm">
                          {initials(p.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900">
                          {p.user.name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {p.title ?? "No title"}
                        </p>
                      </div>
                    </div>
                    {p.hourlyRate && (
                      <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-700">
                        <DollarSign className="h-3 w-3" />
                        {Number(p.hourlyRate)}/hr
                      </span>
                    )}
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1">
                    {(p.skills as string[]).slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600"
                      >
                        {s}
                      </span>
                    ))}
                    {(p.skills as string[]).length > 4 && (
                      <span className="text-xs text-slate-400">
                        +{(p.skills as string[]).length - 4}
                      </span>
                    )}
                  </div>

                  <InviteButton professionalId={p.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
