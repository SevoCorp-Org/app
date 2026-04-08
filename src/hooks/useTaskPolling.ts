"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// useTaskPolling
//
// Calls router.refresh() on an interval so server components re-fetch and
// push new comments to the client without a full page reload.
//
// router.refresh() in Next.js App Router:
//   - Re-runs server components on the server
//   - Sends only the diff (RSC payload) to the client
//   - Client reconciles — does NOT reset client component state
//   - useOptimistic automatically snaps back to new server props once the
//     refresh resolves
//
// The tab visibility API pauses polling while the tab is hidden to avoid
// unnecessary server load. Polling resumes the moment the tab becomes active.
//
// Usage:
//   useTaskPolling({ enabled: true, intervalMs: 15_000 })
// ─────────────────────────────────────────────────────────────────────────────

interface Options {
  enabled?: boolean;
  intervalMs?: number;
}

export function useTaskPolling({
  enabled = true,
  intervalMs = 15_000,
}: Options = {}) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = () => {
    if (intervalRef.current) return; // already running
    intervalRef.current = setInterval(() => {
      // Only refresh if the tab is visible — no point loading data nobody sees
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!enabled) return;

    startPolling();

    // Pause when tab is hidden, resume when visible
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        stopPolling();
      } else {
        // Immediately refresh when returning to the tab, then restart interval
        router.refresh();
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);
}
