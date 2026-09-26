import { appBaseUrl } from "@/lib/email/config";
import { emailShell, escapeHtml, p } from "@/lib/email/layout";

export function creatorCredentialsEmail(input: {
  name: string | null;
  email: string;
  temporaryPassword: string;
  potTitle: string;
  potSlug: string;
}) {
  const first = input.name?.trim().split(/\s+/)[0] || "Friend";
  const manageUrl = `${appBaseUrl()}/host/pots/${input.potSlug}`;
  const hostUrl = `${appBaseUrl()}/host`;

  return {
    subject: `Your pot login for “${input.potTitle}”`,
    html: emailShell({
      tone: "success",
      preheader: `Your pot is ready. Sign in with ${input.email} and the temporary password in this email.`,
      eyebrow: "Pot host account",
      title: "Your login is ready",
      bodyHtml: [
        p(`Dear ${escapeHtml(first)},`),
        p(
          `Your pot <strong>${escapeHtml(input.potTitle)}</strong> is on the wall (pending your seed gift). We have opened a host login so you can manage it later.`,
        ),
        p(
          "No email verification is needed — use these details to sign in. You can change the password after you are in.",
        ),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;background:#ffffff;border:1px solid rgba(12,27,51,0.1);border-radius:8px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#c9a84c;">Sign-in details</p>
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6a7380;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;">Email</p>
              <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#0c1b33;">${escapeHtml(input.email)}</p>
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6a7380;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;">Temporary password</p>
              <p style="margin:0;font-family:Consolas,Monaco,monospace;font-size:18px;letter-spacing:0.04em;color:#0c1b33;">${escapeHtml(input.temporaryPassword)}</p>
            </td>
          </tr>
        </table>`,
        p(
          "Keep this email somewhere safe. If you forget the password later, use “Forgot password?” on the manage screen and we will send a new temporary one.",
        ),
      ].join(""),
      cta: { label: "Open host home", href: hostUrl },
      secondaryCta: { label: "Manage this pot", href: manageUrl },
      footnote:
        "This email is for the person who hosts the pot. If that was not you, reply and we will help.",
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
    subject: "Your new temporary pot-host password",
    html: emailShell({
      tone: "pending",
      preheader: "A new temporary password is ready. Sign in, then change it when you can.",
      eyebrow: "Password reset",
      title: "Here is a new temporary password",
      bodyHtml: [
        p(`Dear ${escapeHtml(first)},`),
        p(
          "You asked for a new password for your pot-host login. Use the temporary password below — the old one no longer works.",
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
