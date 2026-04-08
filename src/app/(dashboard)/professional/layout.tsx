import { SidebarShell } from "@/components/layout/SidebarShell";
import { Topbar } from "@/components/layout/Topbar";
import { ProfessionalNav } from "@/components/nav/ProfessionalNav";
import { requireProfessional } from "@/lib/session";

export default async function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireProfessional();
  const user    = session.user;

  const navContent = <ProfessionalNav userName={user.name ?? undefined} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarShell>
        {navContent}
      </SidebarShell>

      <div className="lg:pl-[var(--sidebar-w)]">
        <Topbar
          userName={user.name ?? "Professional"}
          userEmail={user.email ?? ""}
          userRole="Professional"
          userDashboard="/professional"
          mobileSidebar={navContent}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
