import { appBaseUrl } from "@/lib/email/config";
import { emailShell, escapeHtml, p } from "@/lib/email/layout";

export function creatorWelcomeEmail(input: {
  name: string | null;
  email: string;
  potTitle: string;
  potSlug: string;
  setPasswordToken: string;
}) {
  const first = input.name?.trim().split(/\s+/)[0] || "Friend";
  const setPasswordUrl = `${appBaseUrl()}/set-password?token=${encodeURIComponent(input.setPasswordToken)}`;
  const potUrl = `${appBaseUrl()}/pots/${input.potSlug}`;

  return {
    subject: `Your fundraiser “${input.potTitle}” — set your password`,
    html: emailShell({
      tone: "success",
      preheader:
        "You are signed in on the device you used. Set a password to sign in anywhere else.",
      eyebrow: "Fundraiser host account",
      title: "Welcome — you are a host",
      bodyHtml: [
        p(`Dear ${escapeHtml(first)},`),
        p(
          `Thank you for starting <strong>${escapeHtml(input.potTitle)}</strong>. It goes on the wall the moment its first stone (£25 or more) is laid.`,
        ),
        p(
          `You are already signed in on the device you used. To sign in anywhere else, choose a password for <strong>${escapeHtml(input.email)}</strong> — the button below works for 7 days.`,
        ),
        p(
          "If the link has expired, use “Forgot password?” on the Host sign-in screen and we will email you a temporary one.",
        ),
      ].join(""),
      cta: { label: "Set your password", href: setPasswordUrl },
      secondaryCta: { label: "View your fundraiser", href: potUrl },
      footnote:
        "This email is for the person who started the fundraiser. If that was not you, reply and we will help.",
    }),
  };
}

export function creatorSeedReminderEmail(input: {
  name: string | null;
  potTitle: string;
  potSlug: string;
}) {
  const first = input.name?.trim().split(/\s+/)[0] || "Friend";
  const potUrl = `${appBaseUrl()}/pots/${input.potSlug}`;

  return {
    subject: `“${input.potTitle}” is waiting for its first stone`,
    html: emailShell({
      tone: "pending",
      preheader: "One gift of £25 or more puts your fundraiser on the wall.",
      eyebrow: "Your fundraiser",
      title: "Ready when you are",
      bodyHtml: [
        p(`Dear ${escapeHtml(first)},`),
        p(
          `<strong>${escapeHtml(input.potTitle)}</strong> is saved, but nobody can see it yet. It opens the moment you lay the first stone — a gift of £25 or more.`,
        ),
        p("It takes under a minute with card, Apple Pay or Google Pay."),
      ].join(""),
      cta: { label: "Lay the first stone", href: potUrl },
      footnote:
        "This is the only reminder we will send. If you changed your mind, you can simply ignore it.",
    }),
  };
}

export function creatorPasswordResetEmail(input: {
  name: string | null;
  email: string;
  temporaryPassword: string;
}) {
  const first = input.name?.trim().split(/\s+/)[0] || "Friend";
  const hostUrl = `${appBaseUrl()}/host`;

  return {
    subject: "Your new temporary fundraiser host password",
    html: emailShell({
      tone: "pending",
      preheader: "A new temporary password is ready. Sign in, then change it when you can.",
      eyebrow: "Password reset",
      title: "Here is a new temporary password",
      bodyHtml: [
        p(`Dear ${escapeHtml(first)},`),
        p(
          "You asked for a new password for your fundraiser host login. Use the temporary password below — the old one no longer works.",
        ),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;background:#ffffff;border:1px solid rgba(12,27,51,0.1);border-radius:8px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6a7380;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;">Email</p>
              <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#0c1b33;">${escapeHtml(input.email)}</p>
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6a7380;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;">New temporary password</p>
              <p style="margin:0;font-family:Consolas,Monaco,monospace;font-size:18px;letter-spacing:0.04em;color:#0c1b33;">${escapeHtml(input.temporaryPassword)}</p>
            </td>
          </tr>
        </table>`,
        p("If you did not ask for this, reply to this email and we will lock the account down."),
      ].join(""),
      cta: { label: "Sign in as host", href: hostUrl },
      footnote:
        "Forgot which email you used? Write to us from the Contact page — we cannot guess it from here.",
    }),
  };
}
