import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/session";
import { Settings } from "lucide-react";

export const metadata = { title: "Settings — SevoCorp" };

export default async function CompanySettingsPage() {
  const session   = await requireCompany();
  const companyId = session.user.companyId!;

  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { name: true, slug: true, website: true, industry: true, logo: true },
  });

  if (!company) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Settings"
        description="Manage your company profile and account preferences"
        icon={Settings}
      />

      <div className="max-w-xl space-y-6">
        {/* ── Company Profile ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Company Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" name="name" defaultValue={company.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug</Label>
              <Input id="slug" name="slug" defaultValue={company.slug} />
              <p className="text-xs text-slate-400">
                Used in your company&apos;s public URL. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" defaultValue={company.website ?? ""} placeholder="https://example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" defaultValue={company.industry ?? ""} placeholder="e.g. Technology, Finance…" />
            </div>

            {/* Save — wired in actions phase */}
            <button className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700">
              Save Changes
            </button>
          </CardContent>
        </Card>

        {/* ── Danger Zone ────────────────────────────────────────────────── */}
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-500">
              Deactivating your account will suspend all workspaces and remove professional
              access. This action can be reversed by contacting support.
            </p>
            <button className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100">
              Deactivate Account
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
