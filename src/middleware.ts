import { Role } from "@/lib/enums";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Route definitions
// ─────────────────────────────────────────────────────────────────────────────

// Routes that skip all auth checks
const PUBLIC_PATHS = ["/", "/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];

// Routes that require a specific role
const ROLE_ROUTES: Record<string, Role> = {
  "/admin": Role.ADMIN,
  "/company": Role.COMPANY,
  "/professional": Role.PROFESSIONAL,
};

// Routes that are always accessible once authenticated (regardless of role)
const AUTH_PATHS = ["/api/auth"];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getDashboardUrl(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin";
    case Role.COMPANY:
      return "/company";
    case Role.PROFESSIONAL:
      return "/professional";
  }
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * Returns the required Role for this pathname, or null if unrestricted.
 */
function getRequiredRole(pathname: string): Role | null {
  for (const [prefix, role] of Object.entries(ROLE_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return role;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always pass through NextAuth API routes and static assets
  if (isAuthPath(pathname)) {
    return NextResponse.next();
  }

  // Read JWT from the request cookie — no DB call, runs at the edge
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;

  // ── Unauthenticated user ──────────────────────────────────────────────────

  if (!isAuthenticated) {
    if (isPublic(pathname)) {
      return NextResponse.next();
    }
    // Any non-public route requires auth — redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Authenticated user ────────────────────────────────────────────────────

  const role = token.role as Role;

  // Prevent authenticated users from accessing auth pages
  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.redirect(new URL(getDashboardUrl(role), req.url));
  }

  // Check role-restricted routes
  const requiredRole = getRequiredRole(pathname);

  if (requiredRole && role !== requiredRole) {
    // User is authenticated but accessing the wrong role's section.
    // Redirect them to their own dashboard rather than showing a 403.
    return NextResponse.redirect(new URL(getDashboardUrl(role), req.url));
  }

  return NextResponse.next();
}

// ─────────────────────────────────────────────────────────────────────────────
// Matcher — run middleware on all routes except static files and next internals
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     * - public folder files (e.g. /logo.png)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
