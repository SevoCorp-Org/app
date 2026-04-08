"use server";

import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { getDashboardUrl } from "@/lib/session";
import { sendEmail } from "@/lib/mailer";
import { createVerificationToken, createPasswordResetToken, consumeToken } from "@/lib/tokens";
import { Role } from "@/lib/enums";
import { redirect } from "next/navigation";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  role: z.enum([Role.COMPANY, Role.PROFESSIONAL]),
  // Only required when role === COMPANY
  companyName: z.string().optional(),
  companySlug: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// registerUser
//
// Creates a User + the associated profile record in a single transaction.
// - COMPANY role  → also creates a Company record
// - PROFESSIONAL  → also creates a Professional record
//
// Callers must sign the user in via signIn("credentials", ...) after this
// returns — this action only handles persistence.
// ─────────────────────────────────────────────────────────────────────────────

export type RegisterResult =
  | { ok: true; role: Role }
  | { ok: false; error: string };

export async function registerUser(
  raw: RegisterInput
): Promise<RegisterResult> {
  // ── 1. Validate input ──────────────────────────────────────────────────────
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  // ── 2. Check for existing email ────────────────────────────────────────────
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  // ── 3. Validate role-specific fields ──────────────────────────────────────
  if (data.role === Role.COMPANY) {
    if (!data.companyName?.trim()) {
      return { ok: false, error: "Company name is required." };
    }
    if (!data.companySlug?.trim()) {
      return { ok: false, error: "Company slug is required." };
    }

    const slugTaken = await prisma.company.findUnique({
      where: { slug: data.companySlug },
      select: { id: true },
    });

    if (slugTaken) {
      return {
        ok: false,
        error: "That company URL is already taken. Choose another.",
      };
    }
  }

  // ── 4. Hash password ───────────────────────────────────────────────────────
  const passwordHash = await hashPassword(data.password);

  // ── 5. Create user + profile in one transaction ───────────────────────────
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name.trim(),
        email,
        passwordHash,
        role: data.role,
      },
    });

    if (data.role === Role.COMPANY) {
      await tx.company.create({
        data: {
          name: data.companyName!.trim(),
          slug: data.companySlug!.toLowerCase().trim(),
          ownerId: user.id,
        },
      });
    }

    if (data.role === Role.PROFESSIONAL) {
      await tx.professional.create({
        data: {
          userId: user.id,
        },
      });
    }
  });

  // ── 6. Send verification email ────────────────────────────────────────────
  try {
    const token   = await createVerificationToken(email);
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    await sendEmail({
      to:      email,
      subject: "Verify your SevoCorp email",
      html:    emailVerificationHtml(data.name.trim(), verifyUrl),
    });
  } catch {
    // Non-fatal — account is created; user can request a new verification email
  }

  return { ok: true, role: data.role };
}

// ─────────────────────────────────────────────────────────────────────────────
// resendVerificationEmail
// ─────────────────────────────────────────────────────────────────────────────

export async function resendVerificationEmail(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where:  { email: email.toLowerCase().trim() },
    select: { id: true, name: true, emailVerified: true },
  });

  // Always return ok:true to avoid revealing whether the email exists
  if (!user || user.emailVerified) return { ok: true };

  try {
    const token     = await createVerificationToken(email);
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    await sendEmail({
      to:      email,
      subject: "Verify your SevoCorp email",
      html:    emailVerificationHtml(user.name ?? "there", verifyUrl),
    });
  } catch {
    return { ok: false, error: "Failed to send email. Please try again." };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyEmail — called from /verify-email?token=
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyEmail(
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await consumeToken("verify", token);

  if (!result) {
    return { ok: false, error: "This verification link is invalid or has expired." };
  }

  await prisma.user.update({
    where: { email: result.email },
    data:  { emailVerified: new Date() },
  });

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// sendPasswordResetEmail
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  rawEmail: string
): Promise<{ ok: boolean; error?: string }> {
  const email = rawEmail.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, name: true },
  });

  // Always return ok:true to avoid revealing whether the email exists
  if (!user) return { ok: true };

  try {
    const token    = await createPasswordResetToken(email);
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to:      email,
      subject: "Reset your SevoCorp password",
      html:    passwordResetHtml(user.name ?? "there", resetUrl),
    });
  } catch {
    return { ok: false, error: "Failed to send email. Please try again." };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// resetPassword — called from /reset-password
// ─────────────────────────────────────────────────────────────────────────────

const ResetPasswordSchema = z.object({
  token:    z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

export async function resetPassword(
  raw: z.input<typeof ResetPasswordSchema>
): Promise<{ ok: boolean; error?: string }> {
  const parsed = ResetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { token, password } = parsed.data;
  const result = await consumeToken("reset", token);

  if (!result) {
    return { ok: false, error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { email: result.email },
    data:  { passwordHash },
  });

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// redirectToDashboard — call after successful signIn on the client
// ─────────────────────────────────────────────────────────────────────────────

export async function redirectToDashboard(role: Role) {
  redirect(getDashboardUrl(role));
}

// ─────────────────────────────────────────────────────────────────────────────
// Email HTML templates
// ─────────────────────────────────────────────────────────────────────────────

function emailVerificationHtml(name: string, url: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
      <div style="margin-bottom:24px;text-align:center">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#0f172a;border-radius:12px">
          <span style="color:#fff;font-size:18px;font-weight:700">SC</span>
        </div>
      </div>
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:600">Verify your email</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#475569">Hi ${name}, please confirm your email address to activate your SevoCorp account.</p>
      <a href="${url}" style="display:block;text-align:center;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Verify email address
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center">
        This link expires in 24 hours. If you didn't create a SevoCorp account, you can ignore this email.
      </p>
    </div>
  `;
}

function passwordResetHtml(name: string, url: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
      <div style="margin-bottom:24px;text-align:center">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#0f172a;border-radius:12px">
          <span style="color:#fff;font-size:18px;font-weight:700">SC</span>
        </div>
      </div>
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:600">Reset your password</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#475569">Hi ${name}, click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${url}" style="display:block;text-align:center;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Reset password
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center">
        If you didn't request a password reset, you can ignore this email. Your password won't change.
      </p>
    </div>
  `;
}
