import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { Briefcase, Building2, Users } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Professionals — SevoCorp Admin" };

export default async function AdminProfessionalsPage() {
  await requireAdmin();

  const professionals = await prisma.professional.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, skills: true, available: true, createdAt: true,
      user:   { select: { name: true, email: true, isActive: true } },
      _count: { select: { companies: true, assignments: true } },
    },
  });

  type ProfRow = (typeof professionals)[number];

  function initials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Professionals"
        description={`${professionals.length} registered professional${professionals.length !== 1 ? "s" : ""}`}
        icon={Users}
      />

      {professionals.length === 0 ? (
        <EmptyState icon={Users} title="No professionals yet" description="Professionals appear here once they register." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Professional</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Companies</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(professionals as ProfRow[]).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{initials(p.user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            href={`/admin/professionals/${p.id}`}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {p.user.name ?? "—"}
                          </Link>
                          <p className="text-xs text-slate-400">{p.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{p.title ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(p.skills as string[]).slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600"
                          >
                            {s}
                          </span>
                        ))}
                        {(p.skills as string[]).length > 3 && (
                          <span className="text-xs text-slate-400">
                            +{(p.skills as string[]).length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {p._count.companies}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                        {p._count.assignments}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.available ? "completed" : "secondary"}>
                        {p.available ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
