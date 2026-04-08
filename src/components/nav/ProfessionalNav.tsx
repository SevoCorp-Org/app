import { SidebarLink, type NavItem } from "@/components/nav/SidebarLink";
import { ClipboardList, FolderOpen, LayoutDashboard, UserCircle } from "lucide-react";

const nav: NavItem[] = [
  { label: "Overview",   href: "/professional",            exact: true, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "My Tasks",   href: "/professional/tasks",                   icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Workspaces", href: "/professional/workspaces",              icon: <FolderOpen className="h-4 w-4" /> },
  { label: "Profile",    href: "/professional/profile",                 icon: <UserCircle className="h-4 w-4" /> },
];

export function ProfessionalNav({ userName }: { userName?: string }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
          <span className="text-[10px] font-bold text-white">P</span>
        </div>
        <span className="truncate text-sm font-semibold text-slate-900">
          {userName ?? "Professional"}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          My Work
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
