import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { Building2, ClipboardList, FolderOpen, Users } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Companies — SevoCorp Admin" };

export default async function AdminCompaniesPage() {
  await requireAdmin();

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, slug: true, industry: true,
      isActive: true, createdAt: true,
      _count: { select: { workspaces: true, professionals: true, tasks: true } },
    },
  });

  type CompanyRow = (typeof companies)[number];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description={`${companies.length} registered compan${companies.length !== 1 ? "ies" : "y"}`}
        icon={Building2}
      />

      {companies.length === 0 ? (
        <EmptyState icon={Building2} title="No companies yet" description="Companies appear here once they register." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Professionals</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(companies as CompanyRow[]).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/companies/${c.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {c.name}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">{c.slug}</p>
                    </TableCell>
                    <TableCell className="text-slate-500">{c.industry ?? "—"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                        {c._count.workspaces}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {c._count.professionals}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                        {c._count.tasks}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "completed" : "destructive"}>
                        {c.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
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
