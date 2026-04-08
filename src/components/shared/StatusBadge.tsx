import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@prisma/client";

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
