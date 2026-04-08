import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Token helpers — backed by the VerificationToken table (NextAuth model).
//
// identifier format:
//   "verify:<email>"   — email verification tokens (24h expiry)
//   "reset:<email>"    — password reset tokens     (1h expiry)
// ─────────────────────────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Creates (or replaces) an email verification token for the given address. */
export async function createVerificationToken(email: string): Promise<string> {
  const identifier = `verify:${email}`;
  const token      = generateToken();
  const expires    = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing token so the table stays clean
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  return token;
}

/** Creates (or replaces) a password reset token for the given address. */
export async function createPasswordResetToken(email: string): Promise<string> {
  const identifier = `reset:${email}`;
  const token      = generateToken();
  const expires    = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  return token;
}

/**
 * Validates and consumes a token.
 * Returns the email address on success, or null if invalid/expired.
 */
export async function consumeToken(
  prefix: "verify" | "reset",
  token:  string
): Promise<{ email: string } | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record) return null;
  if (!record.identifier.startsWith(`${prefix}:`)) return null;

  // Always delete — expired or not — to avoid stale rows
  await prisma.verificationToken.delete({ where: { token } });

  if (record.expires < new Date()) return null;

  const email = record.identifier.slice(`${prefix}:`.length);
  return { email };
}
