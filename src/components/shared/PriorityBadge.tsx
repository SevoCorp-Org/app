import { Badge } from "@/components/ui/badge";

// Plain string union — no @prisma/client import (safe for client components)
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW:    "Low",
  MEDIUM: "Medium",
  HIGH:   "High",
  URGENT: "Urgent",
};

const PRIORITY_VARIANTS: Record<TaskPriority, "low" | "medium" | "high" | "urgent"> = {
  LOW:    "low",
  MEDIUM: "medium",
  HIGH:   "high",
  URGENT: "urgent",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant={PRIORITY_VARIANTS[priority]}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
