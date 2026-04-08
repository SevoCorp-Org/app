import { SidebarShell } from "@/components/layout/SidebarShell";
import { Topbar } from "@/components/layout/Topbar";
import { CompanyNav } from "@/components/nav/CompanyNav";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const session  = await requireCompany();
  const user     = session.user;
  const company  = await prisma.company.findUnique({
    where:  { id: user.companyId! },
    select: { name: true },
  });
  const companyName = company?.name ?? "My Company";

  const navContent = <CompanyNav companyName={companyName} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarShell>
        {navContent}
      </SidebarShell>

      <div className="lg:pl-[var(--sidebar-w)]">
        <Topbar
          userName={user.name ?? "User"}
          userEmail={user.email ?? ""}
          userRole="Company"
          userDashboard="/company"
          mobileSidebar={navContent}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
