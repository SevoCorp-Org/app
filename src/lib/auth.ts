import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { Role } from "@/lib/enums";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// ─────────────────────────────────────────────────────────────────────────────
// NextAuth configuration
//
// Strategy: JWT (no DB sessions). The role, companyId, and professionalId are
// embedded in the signed JWT so middleware can gate routes without a DB call.
// ─────────────────────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error: "/login", // redirect auth errors back to login with ?error=
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        // ── 1. Find user ──────────────────────────────────────────────────────
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: {
            company: { select: { id: true } },
            professional: { select: { id: true } },
          },
        });

        if (!user || !user.passwordHash) {
          // Keep the error message generic — do not reveal whether the email exists.
          throw new Error("Invalid email or password.");
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated. Contact support.");
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in. Check your inbox for a verification link.");
        }

        // ── 2. Verify password ────────────────────────────────────────────────
        const valid = await verifyPassword(
          credentials.password,
          user.passwordHash
        );

        if (!valid) {
          throw new Error("Invalid email or password.");
        }

        // ── 3. Return the user object that gets passed to the jwt() callback ──
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          companyId: user.company?.id ?? null,
          professionalId: user.professional?.id ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // ── jwt() ─────────────────────────────────────────────────────────────────
    // Called when a token is created (sign in) or accessed.
    // Persist our custom fields into the JWT so they are available in session().
    async jwt({ token, user }) {
      if (user) {
        // user is only defined on initial sign-in
        token.id = user.id;
        token.role = user.role as Role;
        token.companyId = user.companyId ?? null;
        token.professionalId = user.professionalId ?? null;
      }
      return token;
    },

    // ── session() ─────────────────────────────────────────────────────────────
    // Expose the JWT payload to the client session object.
    // Only include what the client actually needs.
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.professionalId = token.professionalId;
      }
      return session;
    },
  },

  // Signed with NEXTAUTH_SECRET (required in production)
  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",
};
