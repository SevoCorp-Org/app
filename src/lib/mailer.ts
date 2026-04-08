import nodemailer from "nodemailer";

// ─────────────────────────────────────────────────────────────────────────────
// Nodemailer transporter — configured via environment variables.
// Compatible with Resend SMTP (smtp.resend.com) and any standard SMTP provider.
//
// Required env vars:
//   EMAIL_SERVER_HOST     e.g. smtp.resend.com
//   EMAIL_SERVER_PORT     e.g. 465
//   EMAIL_SERVER_USER     e.g. resend
//   EMAIL_SERVER_PASSWORD Your Resend API key (re_...)
//   EMAIL_FROM            e.g. noreply@sevocorp.com
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_SERVER_HOST,
  port:   Number(process.env.EMAIL_SERVER_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to:      string;
  subject: string;
  html:    string;
}) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@sevocorp.com",
    to,
    subject,
    html,
  });
}
