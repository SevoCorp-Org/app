import { Badge } from "@/components/ui/badge";
import { TaskPriority } from "@prisma/client";

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
