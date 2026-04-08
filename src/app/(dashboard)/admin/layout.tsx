import { SidebarShell } from "@/components/layout/SidebarShell";
import { Topbar } from "@/components/layout/Topbar";
import { AdminNav } from "@/components/nav/AdminNav";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const user = session.user;

  const navContent = <AdminNav />;

  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarShell>
        <AdminNav />
      </SidebarShell>

      <div className="lg:pl-[var(--sidebar-w)]">
        <Topbar
          userName={user.name ?? "Admin"}
          userEmail={user.email ?? ""}
          userRole="Administrator"
          userDashboard="/admin"
          mobileSidebar={navContent}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
