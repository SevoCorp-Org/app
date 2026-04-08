"use client";

import { registerUser, type RegisterInput } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Role = "COMPANY" | "PROFESSIONAL";

export function RegisterForm() {
  const router = useRouter();

  const [role,     setRole]     = useState<Role>("COMPANY");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [company,  setCompany]  = useState("");
  const [slug,     setSlug]     = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const payload: RegisterInput = {
      name,
      email,
      password,
      role,
      ...(role === "COMPANY" && { companyName: company, companySlug: slug }),
    };

    const res = await registerUser(payload);
    setLoading(false);

    if (!res.ok) {
      toast.error("Registration failed", { description: res.error });
      return;
    }

    toast.success("Account created!", { description: "You can now sign in." });
    router.push("/login?registered=1");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
            <span className="text-lg font-bold text-white">SC</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Get started with SevoCorp</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          {/* Role selector */}
          <div className="mb-5 grid grid-cols-2 gap-2">
            {(["COMPANY", "PROFESSIONAL"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                  role === r
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {r === "COMPANY" ? "Company" : "Professional"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Full name</label>
              <Input
                required
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Email address</label>
              <Input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Password</label>
              <Input
                type="password"
                required
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {role === "COMPANY" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Company name</label>
                  <Input
                    required
                    placeholder="Acme Inc."
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Company slug</label>
                  <Input
                    required
                    placeholder="acme-inc"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                    }
                    disabled={loading}
                  />
                  <p className="text-[10px] text-slate-400">
                    Lowercase letters and hyphens only — used in URLs
                  </p>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
