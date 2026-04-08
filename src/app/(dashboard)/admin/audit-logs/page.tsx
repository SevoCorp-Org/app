import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { ScrollText } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Audit Logs — SevoCorp Admin" };
export const dynamic = "force-dynamic";

const ACTION_VARIANTS: Record<string, "completed" | "destructive" | "pending" | "secondary"> = {
  CREATE: "completed",
  UPDATE: "pending",
  DELETE: "destructive",
  LOGIN:  "secondary",
  LOGOUT: "secondary",
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const { page: pageParam } = await searchParams;
  const page     = Math.max(1, Number(pageParam ?? 1));
  const pageSize = 50;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, action: true, entity: true, entityId: true,
        createdAt: true,
        actor:   { select: { name: true, email: true, role: true } },
        company: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  type LogRow = (typeof logs)[number];

  function actionVariant(action: string) {
    const key = action.split("_")[0].toUpperCase();
    return ACTION_VARIANTS[key] ?? "secondary";
  }

  function rolePill(role: string) {
    const map: Record<string, string> = {
      ADMIN:        "bg-purple-50 text-purple-700 border-purple-200",
      COMPANY:      "bg-blue-50 text-blue-700 border-blue-200",
      PROFESSIONAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
    return map[role] ?? "bg-slate-50 text-slate-600 border-slate-200";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description={`${total.toLocaleString()} entr${total !== 1 ? "ies" : "y"}`}
        icon={ScrollText}
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs yet"
          description="System events will appear here as users interact with the platform."
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs as LogRow[]).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap tabular-nums text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">
                          {log.actor.name ?? log.actor.email}
                        </p>
                        <span
                          className={`mt-0.5 inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${rolePill(log.actor.role)}`}
                        >
                          {log.actor.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-700">{log.entity}</span>
                        <span className="ml-1.5 font-mono text-xs text-slate-300">
                          {log.entityId.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {log.company?.name ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                Page <span className="font-medium text-slate-700">{page}</span> of{" "}
                <span className="font-medium text-slate-700">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}`}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}`}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
