import { SidebarLink, type NavItem } from "@/components/nav/SidebarLink";
import { ClipboardList, FolderOpen, LayoutDashboard, Settings, Users } from "lucide-react";

const nav: NavItem[] = [
  { label: "Dashboard",     href: "/company",               exact: true, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Workspaces",    href: "/company/workspaces",                 icon: <FolderOpen className="h-4 w-4" /> },
  { label: "Tasks",         href: "/company/tasks",                      icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Professionals", href: "/company/professionals",              icon: <Users className="h-4 w-4" /> },
  { label: "Settings",      href: "/company/settings",                   icon: <Settings className="h-4 w-4" /> },
];

export function CompanyNav({ companyName }: { companyName?: string }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
          <span className="text-[10px] font-bold text-white">SC</span>
        </div>
        <span className="truncate text-sm font-semibold text-slate-900">
          {companyName ?? "SevoCorp"}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Workspace
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
