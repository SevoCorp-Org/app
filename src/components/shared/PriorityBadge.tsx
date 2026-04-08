import { Badge } from "@/components/ui/badge";

const PRIORITY_LABELS: Record<string, string> = {
  LOW:    "Low",
  MEDIUM: "Medium",
  HIGH:   "High",
  URGENT: "Urgent",
};

const PRIORITY_VARIANTS: Record<string, "low" | "medium" | "high" | "urgent"> = {
  LOW:    "low",
  MEDIUM: "medium",
  HIGH:   "high",
  URGENT: "urgent",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={PRIORITY_VARIANTS[priority] ?? "low"}>
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}
