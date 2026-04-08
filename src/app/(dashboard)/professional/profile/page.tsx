import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { UserCircle } from "lucide-react";

export const metadata = { title: "Profile — SevoCorp" };

export default async function ProfessionalProfilePage() {
  const session        = await requireProfessional();
  const professionalId = session.user.professionalId!;

  const professional = await prisma.professional.findUnique({
    where:  { id: professionalId },
    select: {
      bio: true, title: true, skills: true, hourlyRate: true, available: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!professional) return null;

  function initials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your professional information and availability"
        icon={UserCircle}
      />

      <div className="max-w-xl space-y-6">
        {/* ── Identity card ──────────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-5">
            <div className="mb-5 flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg">
                  {initials(professional.user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">
                  {professional.user.name ?? "—"}
                </p>
                <p className="text-sm text-slate-400">{professional.user.email}</p>
                <div className="mt-1">
                  <Badge variant={professional.available ? "completed" : "secondary"}>
                    {professional.available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" defaultValue={professional.user.name ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={professional.user.email} disabled className="cursor-not-allowed opacity-60" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Professional Info ──────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Professional Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={professional.title ?? ""} placeholder="e.g. Senior UX Designer" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={professional.bio ?? ""}
                rows={4}
                placeholder="Tell companies about yourself…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hourlyRate">Hourly Rate (USD)</Label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                defaultValue={professional.hourlyRate ? String(professional.hourlyRate) : ""}
                placeholder="e.g. 75"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Skills ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              {(professional.skills as string[]).map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {s}
                  {/* Remove — wired in actions phase */}
                  <button className="ml-0.5 text-slate-300 hover:text-slate-600 transition-colors">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Input placeholder="Add a skill and press Enter" className="max-w-xs" />
          </CardContent>
        </Card>

        {/* ── Availability ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                defaultChecked={professional.available}
                name="available"
                className="h-4 w-4 rounded border-slate-300 accent-slate-900"
              />
              <span className="text-sm text-slate-700">Available for new assignments</span>
            </label>
          </CardContent>
        </Card>

        {/* Save — wired in actions phase */}
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700">
          Save Profile
        </button>
      </div>
    </div>
  );
}
