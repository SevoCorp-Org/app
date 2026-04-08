import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "Pending",
  APPROVED:    "Approved",
  IN_PROGRESS: "In Progress",
  REVIEW:      "Review",
  COMPLETED:   "Completed",
};

const STATUS_VARIANTS: Record<string, "pending" | "approved" | "in_progress" | "review" | "completed"> = {
  PENDING:     "pending",
  APPROVED:    "approved",
  IN_PROGRESS: "in_progress",
  REVIEW:      "review",
  COMPLETED:   "completed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "pending"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
