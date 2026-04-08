import { AuditAction, Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Audit log helper
//
// Always call inside a transaction (tx) so the audit entry is atomic with
// the mutation it describes. If the mutation rolls back, the log rolls back too.
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditParams {
  tx: Prisma.TransactionClient;
  action: AuditAction;
  entity: string;        // Model name: "Task", "Comment", "TaskAssignment", etc.
  entityId: string;
  actorId: string;
  companyId: string;
  taskId?: string;       // Set when the event is task-scoped (feeds task activity log)
  meta?: Record<string, unknown>; // Diff, reason, extra context
}

export async function writeAuditLog({
  tx,
  action,
  entity,
  entityId,
  actorId,
  companyId,
  taskId,
  meta,
}: AuditParams): Promise<void> {
  await tx.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      actorId,
      companyId,
      taskId: taskId ?? null,
      meta: meta ? (meta as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });
}
