// ─────────────────────────────────────────────────────────────────────────────
// Root dashboard layout
//
// This wrapper sits above all three role layouts. It does NOT enforce auth —
// that is the responsibility of each role-specific layout. This layout exists
// to apply any shared structure (fonts, providers, etc.) common to all
// dashboard pages.
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
