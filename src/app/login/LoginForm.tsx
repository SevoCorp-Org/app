"use client";

import { resendVerificationEmail } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const UNVERIFIED_MSG = "Please verify your email before signing in.";

export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/";
  const registered   = searchParams.get("registered") === "1";

  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [unverified,  setUnverified]  = useState(false);
  const [isPending,   startTransition] = useTransition();

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setUnverified(false);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res?.ok) {
      // NextAuth surfaces the thrown error message in res.error
      if (res?.error?.includes("verify your email")) {
        setUnverified(true);
        return;
      }
      toast.error("Sign in failed", {
        description: "Invalid email or password. Please try again.",
      });
      return;
    }

    toast.success("Welcome back!");
    router.push(res.url ?? callbackUrl);
  }

  function handleResend() {
    startTransition(async () => {
      await resendVerificationEmail(email);
      toast.success("Verification email sent", {
        description: "Check your inbox for the verification link.",
      });
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
            <span className="text-lg font-bold text-white">SC</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Sign in to SevoCorp</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your credentials to continue</p>
        </div>

        {registered && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Account created! Check your email to verify your address, then sign in.
          </div>
        )}

        {unverified && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p>{UNVERIFIED_MSG}</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={isPending}
              className="mt-1 font-medium underline underline-offset-4 hover:text-amber-900 disabled:opacity-50"
            >
              {isPending ? "Sending…" : "Resend verification email"}
            </button>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-slate-700">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-slate-500 hover:text-slate-700 hover:underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
