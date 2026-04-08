import { SidebarLink, type NavItem } from "@/components/nav/SidebarLink";
import { Building2, ClipboardList, LayoutDashboard, ScrollText, Users } from "lucide-react";

const nav: NavItem[] = [
  { label: "Overview",      href: "/admin",              exact: true, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Companies",     href: "/admin/companies",                 icon: <Building2 className="h-4 w-4" /> },
  { label: "Tasks",         href: "/admin/tasks",                     icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Professionals", href: "/admin/professionals",             icon: <Users className="h-4 w-4" /> },
  { label: "Audit Logs",    href: "/admin/audit-logs",                icon: <ScrollText className="h-4 w-4" /> },
];

export function AdminNav({ companyName }: { companyName?: string }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b border-slate-200 px-5">
        <span className="text-sm font-semibold text-slate-900">SevoCorp</span>
        <span className="ml-1.5 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          Admin
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Platform
        </p>
        <div className="flex flex-col gap-0.5">
          {nav.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
