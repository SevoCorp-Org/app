"use client";

import { sendPasswordResetEmail } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useTransition } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await sendPasswordResetEmail(email);
      if (!result.ok && result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
            <span className="text-lg font-bold text-white">SC</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Forgot password?</h1>
          <p className="mt-1 text-sm text-slate-500">
            {sent
              ? "Check your inbox"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-sm text-emerald-700">
              If an account exists for <strong>{email}</strong>, a password reset link
              has been sent. Check your inbox (and spam folder).
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-slate-700">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending…
                  </span>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
