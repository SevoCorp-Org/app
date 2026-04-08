"use client";

import { inviteProfessional, removeProfessional } from "@/actions/professional.actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function InviteButton({ professionalId }: { professionalId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleInvite() {
    startTransition(async () => {
      const result = await inviteProfessional({ professionalId });
      if (!result.ok) {
        toast.error("Failed to add professional", { description: result.error });
        return;
      }
      toast.success("Professional added to your team.");
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleInvite}
      disabled={isPending}
      className="mt-1 w-full rounded-md border border-slate-900 bg-slate-900 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50"
    >
      {isPending ? "Adding…" : "Add to team"}
    </button>
  );
}

export function RemoveButton({ professionalId }: { professionalId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    if (!confirm("Remove this professional from your team?")) return;
    startTransition(async () => {
      const result = await removeProfessional({ professionalId });
      if (!result.ok) {
        toast.error("Cannot remove", { description: result.error });
        return;
      }
      toast.success("Professional removed from your team.");
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="text-xs text-red-500 transition hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "Removing…" : "Remove"}
    </button>
  );
}
