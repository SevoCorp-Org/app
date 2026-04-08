"use server";

import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { z } from "zod";
import type { ActionResult } from "./task.actions";

const InviteSchema = z.object({
  professionalId: z.string().cuid(),
});

// ─────────────────────────────────────────────────────────────────────────────
// inviteProfessional — COMPANY
//
// Adds a platform professional to the company's team as ACTIVE.
// If already a member (any status), returns ok without duplicating.
// ─────────────────────────────────────────────────────────────────────────────

export async function inviteProfessional(
  raw: z.input<typeof InviteSchema>
): Promise<ActionResult> {
  const session   = await requireCompany();
  const companyId = session.user.companyId!;
  const actorId   = session.user.id;

  const parsed = InviteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { professionalId } = parsed.data;

  // Verify the professional exists
  const professional = await prisma.professional.findUnique({
    where:  { id: professionalId },
    select: { id: true },
  });
  if (!professional) return { ok: false, error: "Professional not found." };

  // Idempotent — don't duplicate if already a member
  const existing = await prisma.companyProfessional.findUnique({
    where: { companyId_professionalId: { companyId, professionalId } },
    select: { status: true },
  });
  if (existing) return { ok: true, data: undefined };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.companyProfessional.create({
        data: { companyId, professionalId, status: "ACTIVE" },
      });

      await writeAuditLog({
        tx,
        action:   "ASSIGNED",
        entity:   "CompanyProfessional",
        entityId: professionalId,
        actorId,
        companyId,
        meta:     { professionalId },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to add professional. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// removeProfessional — COMPANY
//
// Removes a professional from the company team.
// Not allowed if the professional has active (non-completed) task assignments.
// ─────────────────────────────────────────────────────────────────────────────

const RemoveSchema = z.object({
  professionalId: z.string().cuid(),
});

export async function removeProfessional(
  raw: z.input<typeof RemoveSchema>
): Promise<ActionResult> {
  const session   = await requireCompany();
  const companyId = session.user.companyId!;
  const actorId   = session.user.id;

  const parsed = RemoveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { professionalId } = parsed.data;

  // Check for active task assignments within this company
  const activeAssignments = await prisma.taskAssignment.count({
    where: {
      professionalId,
      task: {
        companyId,
        status: { in: ["PENDING", "APPROVED", "IN_PROGRESS", "REVIEW"] },
      },
    },
  });

  if (activeAssignments > 0) {
    return {
      ok: false,
      error: `This professional has ${activeAssignments} active task(s). Complete or reassign them before removing.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.companyProfessional.delete({
        where: { companyId_professionalId: { companyId, professionalId } },
      });

      await writeAuditLog({
        tx,
        action:   "UNASSIGNED",
        entity:   "CompanyProfessional",
        entityId: professionalId,
        actorId,
        companyId,
        meta:     { professionalId },
      });
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Failed to remove professional." };
  }
}
