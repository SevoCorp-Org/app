import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label:   string;
  value:   string | number;
  icon:    LucideIcon;
  trend?:  { value: string; positive: boolean };
  color?:  "slate" | "blue" | "emerald" | "amber" | "purple" | "red";
  className?: string;
}

const COLOR_MAP = {
  slate:   "bg-slate-100 text-slate-600",
  blue:    "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  amber:   "bg-amber-100 text-amber-600",
  purple:  "bg-purple-100 text-purple-600",
  red:     "bg-red-100 text-red-600",
};

export function StatCard({ label, value, icon: Icon, trend, color = "slate", className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", COLOR_MAP[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</p>
          {trend && (
            <p className={cn("mt-0.5 text-xs font-medium", trend.positive ? "text-emerald-600" : "text-red-600")}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
