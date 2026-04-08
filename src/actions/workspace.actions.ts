"use server";

import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";
import type { ActionResult } from "./task.actions";

const CreateWorkspaceSchema = z.object({
  name:        z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
});

export async function createWorkspace(
  raw: z.input<typeof CreateWorkspaceSchema>
): Promise<ActionResult<{ workspaceId: string }>> {
  const session   = await requireCompany();
  const companyId = session.user.companyId!;
  const actorId   = session.user.id;

  const parsed = CreateWorkspaceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { name, description } = parsed.data;

  try {
    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: { name: name.trim(), description: description?.trim() ?? null, companyId },
      });

      await writeAuditLog({
        tx,
        action:   "CREATED",
        entity:   "Workspace",
        entityId: created.id,
        actorId,
        companyId,
        meta:     { name },
      });

      return created;
    });

    return { ok: true, data: { workspaceId: workspace.id } };
  } catch {
    return { ok: false, error: "Failed to create workspace. Please try again." };
  }
}
