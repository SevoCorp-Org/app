import { ResetPasswordForm } from "./ResetPasswordForm";
import Link from "next/link";

export const metadata = { title: "Reset Password — SevoCorp" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
            <span className="text-lg font-bold text-white">SC</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Invalid reset link</h1>
          <p className="mt-2 text-sm text-slate-500">
            This password reset link is missing or malformed.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
