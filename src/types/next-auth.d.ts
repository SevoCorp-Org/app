import { Role } from "@/lib/enums";
import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

// ─────────────────────────────────────────────────────────────────────────────
// Augment NextAuth types so `session.user` and JWT carry our custom fields.
// These are set in the jwt() and session() callbacks in auth.ts.
// ─────────────────────────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      companyId: string | null;
      professionalId: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    companyId: string | null;
    professionalId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    companyId: string | null;
    professionalId: string | null;
  }
}
