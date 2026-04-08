import { Badge } from "@/components/ui/badge";

// Plain string union — no @prisma/client import (safe for client components)
type TaskStatus = "PENDING" | "APPROVED" | "IN_PROGRESS" | "REVIEW" | "COMPLETED";

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING:     "Pending",
  APPROVED:    "Approved",
  IN_PROGRESS: "In Progress",
  REVIEW:      "Review",
  COMPLETED:   "Completed",
};

const STATUS_VARIANTS: Record<TaskStatus, "pending" | "approved" | "in_progress" | "review" | "completed"> = {
  PENDING:     "pending",
  APPROVED:    "approved",
  IN_PROGRESS: "in_progress",
  REVIEW:      "review",
  COMPLETED:   "completed",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
