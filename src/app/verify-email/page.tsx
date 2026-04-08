import { verifyEmail } from "@/actions/auth.actions";
import Link from "next/link";

export const metadata = { title: "Verify Email — SevoCorp" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <VerifyLayout status="invalid" />;
  }

  const result = await verifyEmail(token);

  return <VerifyLayout status={result.ok ? "success" : "invalid"} error={result.error} />;
}

function VerifyLayout({
  status,
  error,
}: {
  status: "success" | "invalid";
  error?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
          <span className="text-lg font-bold text-white">SC</span>
        </div>

        {status === "success" ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Email verified!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your email has been confirmed. You can now sign in to your account.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Link invalid or expired</h1>
            <p className="mt-2 text-sm text-slate-500">
              {error ?? "This verification link is invalid or has expired."}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
