import { appBaseUrl } from "@/lib/email/config";
import { emailShell, escapeHtml, p } from "@/lib/email/layout";

function credentialsTable(input: {
  email: string;
  temporaryPassword: string;
  heading: string;
  passwordLabel: string;
}) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;background:#ffffff;border:1px solid rgba(12,27,51,0.1);border-radius:8px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#c9a84c;">${escapeHtml(input.heading)}</p>
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6a7380;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;">Email</p>
              <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#0c1b33;">${escapeHtml(input.email)}</p>
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6a7380;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;">${escapeHtml(input.passwordLabel)}</p>
              <p style="margin:0;font-family:Consolas,Monaco,monospace;font-size:18px;letter-spacing:0.04em;color:#0c1b33;">${escapeHtml(input.temporaryPassword)}</p>
            </td>
          </tr>
        </table>`;
}

/**
 * Invite to /admin — dedicated Operations Desk staff email (not Host).
 */
export function adminInviteEmail(input: {
  email: string;
  invitedBy: string;
  temporaryPassword: string | null;
}) {
  const adminUrl = `${appBaseUrl()}/admin`;
  const settingsUrl = `${appBaseUrl()}/admin/settings`;
  const inviter = escapeHtml(input.invitedBy);
  const hasTemp = Boolean(input.temporaryPassword);

  const credentialsBlock = hasTemp
    ? credentialsTable({
        email: input.email,
        temporaryPassword: input.temporaryPassword!,
        heading: "Operations Desk login",
        passwordLabel: "Temporary password",
      })
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;background:#ffffff;border:1px solid rgba(12,27,51,0.1);border-radius:8px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#c9a84c;">You already have a login</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#0c1b33;">Sign in at the <strong>Operations Desk</strong> with <strong>${escapeHtml(input.email)}</strong> and the password you already use. Forgot it? Use “Forgot password?” on the Admin sign-in screen.</p>
            </td>
          </tr>
        </table>`;

  return {
    subject: "An admin at PVN Belfast invited you to the Operations Desk",
    html: emailShell({
      tone: "success",
      preheader: hasTemp
        ? "Admin invite for Restore 5 Paulett Ave. Temporary password inside — change it under Settings → Password."
        : "Admin invite for Restore 5 Paulett Ave. Sign in at /admin, then change your password in Settings.",
      eyebrow: "Admin invitation · PVN Belfast",
      title: "Welcome to the Operations Desk",
      bodyHtml: [
        p("Hello,"),
        p(
          `<strong>${inviter}</strong> — an admin at <strong>PVN Belfast</strong> — has invited you onto the <strong>Operations Desk</strong> for <strong>Restore 5 Paulett Ave</strong>: house-wide gifts, fundraisers and hosts, inbox, exports, and the quiet work that keeps the campaign honest.`,
        ),
        p(
          "This is staff access only — not Host home, and not a public page. It is the admin desk behind the restoration.",
        ),
        credentialsBlock,
        hasTemp
          ? p(
              "No email verification is needed. Sign in with the temporary password, then <strong>change your password straight away</strong> under Settings → Password. Keep this email somewhere safe until you do.",
            )
          : p(
              "Your admin allowlist entry is ready. Open the Operations Desk with the login you already have, then <strong>change your password</strong> under Settings → Password so this access stays yours alone.",
            ),
        p(
          "If this invitation surprises you, reply to this email and we will close the door again.",
        ),
      ].join(""),
      cta: { label: "Enter Operations Desk", href: adminUrl },
      secondaryCta: { label: "Open Settings", href: settingsUrl },
      footnote:
        "Admin email · Restore 5 Paulett Ave · PVN Belfast. Sent only when a current admin adds your email under Settings → Admins.",
    }),
  };
}

/**
 * Forgot-password / reset for Operations Desk staff (not Host).
 */
export function adminPasswordResetEmail(input: {
  email: string;
  temporaryPassword: string;
}) {
  const adminUrl = `${appBaseUrl()}/admin`;
  const settingsUrl = `${appBaseUrl()}/admin/settings`;

  return {
    subject: "Your new temporary Operations Desk password",
    html: emailShell({
      tone: "pending",
      preheader:
        "A new temporary admin password is ready. Sign in at /admin, then change it under Settings → Password.",
      eyebrow: "Admin password reset · PVN Belfast",
      title: "New temporary Operations Desk password",
      bodyHtml: [
        p("Hello,"),
        p(
          "You asked for a new password for the <strong>Operations Desk</strong> (admin) at <strong>PVN Belfast</strong>. Use the temporary password below — the old one no longer works.",
        ),
        credentialsTable({
          email: input.email,
          temporaryPassword: input.temporaryPassword,
          heading: "Operations Desk login",
          passwordLabel: "New temporary password",
        }),
        p(
          "Sign in at Admin, then <strong>change your password straight away</strong> under Settings → Password.",
        ),
        p(
          "If you did not ask for this, reply to this email and we will lock the account down.",
        ),
      ].join(""),
      cta: { label: "Enter Operations Desk", href: adminUrl },
      secondaryCta: { label: "Change password", href: settingsUrl },
      footnote:
        "Admin email · Restore 5 Paulett Ave · PVN Belfast. This is not a fundraiser host password reset.",
    }),
  };
}

/** Staff ping when someone uses the public contact form. */
export function adminContactMessageEmail(input: {
  topicLabel: string;
  name: string;
  email: string;
  message: string;
}) {
  const inboxUrl = `${appBaseUrl()}/admin/inbox`;
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br />");

  return {
    subject: `Contact: ${input.topicLabel} — ${input.name}`,
    html: emailShell({
      tone: "soft",
      preheader: `${input.name} wrote via the contact form (${input.topicLabel}).`,
      eyebrow: "Contact form",
      title: "New message in the inbox",
      bodyHtml: [
        p(
          `<strong>${escapeHtml(input.name)}</strong> (${escapeHtml(input.email)}) wrote about <strong>${escapeHtml(input.topicLabel)}</strong>.`,
        ),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;background:#ffffff;border:1px solid rgba(12,27,51,0.1);border-radius:8px;">
          <tr>
            <td style="padding:18px 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#0c1b33;">${safeMessage}</td>
          </tr>
        </table>`,
        p("Reply from the Operations Desk inbox when you can."),
      ].join(""),
      cta: { label: "Open Admin inbox", href: inboxUrl },
      footnote:
        "Sent to ADMIN_EMAILS only · Restore 5 Paulett Ave · PVN Belfast.",
    }),
  };
}
