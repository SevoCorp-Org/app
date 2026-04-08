import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-slate-900 text-white",
        secondary:   "border-transparent bg-slate-100 text-slate-700",
        outline:     "border-slate-200 text-slate-600",
        destructive: "border-transparent bg-red-100 text-red-700",
        // Task statuses
        pending:     "border-amber-200 bg-amber-50 text-amber-700",
        approved:    "border-blue-200 bg-blue-50 text-blue-700",
        in_progress: "border-indigo-200 bg-indigo-50 text-indigo-700",
        review:      "border-purple-200 bg-purple-50 text-purple-700",
        completed:   "border-emerald-200 bg-emerald-50 text-emerald-700",
        // Priorities
        low:         "border-slate-200 bg-slate-50 text-slate-600",
        medium:      "border-sky-200 bg-sky-50 text-sky-700",
        high:        "border-orange-200 bg-orange-50 text-orange-700",
        urgent:      "border-red-200 bg-red-50 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
