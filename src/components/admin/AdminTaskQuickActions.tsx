"use client";

import { approveTask, deleteTask, transitionTaskStatus } from "@/actions/task.actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

// Avoid importing TaskStatus from @prisma/client in client components
// (Prisma cannot run in the browser).
const TaskStatus = {
  COMPLETED:   "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
} as const;
type TaskStatusValue = typeof TaskStatus[keyof typeof TaskStatus];

// ─────────────────────────────────────────────────────────────────────────────
// Quick approve button — shown on PENDING tasks in the task list
// ─────────────────────────────────────────────────────────────────────────────

export function QuickApproveButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveTask({ taskId });
      if (!result.ok) {
        toast.error("Failed to approve", { description: result.error });
        return;
      }
      toast.success("Task approved.");
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleApprove}
      disabled={isPending}
      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
    >
      {isPending ? "Approving…" : "Approve"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Review resolution buttons — shown on REVIEW tasks in the task list
// ─────────────────────────────────────────────────────────────────────────────

export function QuickReviewActions({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState<"complete" | "sendback" | null>(null);

  function handle(to: TaskStatusValue, label: "complete" | "sendback") {
    setActive(label);
    startTransition(async () => {
      const result = await transitionTaskStatus({ taskId, to });
      if (!result.ok) {
        toast.error("Failed", { description: result.error });
        setActive(null);
        return;
      }
      toast.success(label === "complete" ? "Task completed." : "Task sent back to In Progress.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handle(TaskStatus.COMPLETED, "complete")}
        disabled={isPending}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending && active === "complete" ? "Saving…" : "Complete"}
      </button>
      <button
        onClick={() => handle(TaskStatus.IN_PROGRESS, "sendback")}
        disabled={isPending}
        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
      >
        {isPending && active === "sendback" ? "Saving…" : "Send Back"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete task button — shown on the admin task detail page
// ─────────────────────────────────────────────────────────────────────────────

export function DeleteTaskButton({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${taskTitle}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteTask({ taskId });
      if (!result.ok) {
        toast.error("Failed to delete", { description: result.error });
        return;
      }
      toast.success("Task deleted.");
      router.push("/admin/tasks");
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete Task"}
    </button>
  );
}
