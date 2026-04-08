import { cn } from "@/lib/utils";

interface SidebarShellProps {
  children:  React.ReactNode;
  className?: string;
}

/** Server component — the fixed sidebar column */
export function SidebarShell({ children, className }: SidebarShellProps) {
  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col",
        "fixed inset-y-0 left-0 z-40 w-[var(--sidebar-w)] border-r border-slate-200 bg-white",
        className
      )}
    >
      {children}
    </aside>
  );
}
