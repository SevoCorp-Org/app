"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50">
        <AlertTriangle className="h-5 w-5 text-red-500" />
      </div>
      <h2 className="text-base font-semibold text-slate-900">Something went wrong</h2>
      <p className="mt-1 text-sm text-slate-500">
        Failed to load this page. Your data is safe.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">ID: {error.digest}</p>
      )}
      <div className="mt-5 flex gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Try again
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <Home className="mr-1.5 h-3.5 w-3.5" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
