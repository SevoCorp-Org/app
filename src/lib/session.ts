import { authOptions } from "@/lib/auth";
import { Role } from "@/lib/enums";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// Server-side session utilities
//
// Use these in Server Components, Server Actions, and Route Handlers.
// Never call getServerSession() directly — use these helpers so role checks
// are consistent and cannot be accidentally skipped.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the current session or null.
 * Use when a page is accessible to both authenticated and unauthenticated users.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Returns the session. Redirects to /login if unauthenticated.
 * Use in any page/layout that requires authentication.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Returns the session. Redirects if the user does not hold the required role.
 * Use at the top of role-specific layouts or server actions.
 *
 * @example
 *   const session = await requireRole(Role.COMPANY);
 */
export async function requireRole(role: Role) {
  const session = await requireAuth();
  if (session.user.role !== role) {
    redirect(getDashboardUrl(session.user.role));
  }
  return session;
}

/**
 * Returns the session. Redirects if the user is not an ADMIN.
 */
export async function requireAdmin() {
  return requireRole(Role.ADMIN);
}

/**
 * Returns the session. Redirects if the user is not a COMPANY.
 */
export async function requireCompany() {
  return requireRole(Role.COMPANY);
}

/**
 * Returns the session. Redirects if the user is not a PROFESSIONAL.
 */
export async function requireProfessional() {
  return requireRole(Role.PROFESSIONAL);
}

/**
 * Maps a role to its home dashboard URL.
 * Used for post-login redirects and role-mismatch redirects.
 */
export function getDashboardUrl(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin";
    case Role.COMPANY:
      return "/company";
    case Role.PROFESSIONAL:
      return "/professional";
  }
}
