"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label:  string;
  href:   string;
  icon:   React.ReactNode;
  exact?: boolean;
  badge?: string | number;
}

export function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();

  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-slate-100 text-slate-900"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <span className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-slate-700" : "text-slate-400 group-hover:text-slate-600")}>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span className="ml-auto rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700 tabular-nums">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
