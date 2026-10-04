import { getEnvAdminEmails } from "@/lib/admin-emails";
import { contactTopicLabel } from "@/lib/contact-topics";
import {
  adminContactMessageEmail,
  adminInviteEmail,
  adminPasswordResetEmail,
} from "@/lib/email/admin-templates";
import { sendEmail } from "@/lib/email/send";

export async function notifyAdminInvite(input: {
  email: string;
  invitedBy: string;
  temporaryPassword: string | null;
}): Promise<boolean> {
  const payload = adminInviteEmail(input);
  return sendEmail({
    to: input.email,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `admin-invite/${input.email}/${Date.now()}`,
    tags: [
      { name: "kind", value: "admin_invite" },
      {
        name: "new_account",
        value: input.temporaryPassword ? "true" : "false",
      },
    ],
  });
}

export async function notifyAdminPasswordReset(input: {
  email: string;
  temporaryPassword: string;
}) {
  const payload = adminPasswordResetEmail(input);
  await sendEmail({
    to: input.email,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `admin-password-reset/${input.email}/${Date.now()}`,
    tags: [{ name: "kind", value: "admin_password_reset" }],
  });
}

/**
 * Email ADMIN_EMAILS (env bootstrap) when the public contact form lands.
 * Failures are logged; the inbox row is already saved.
 */
export async function notifyAdminsOfContactMessage(input: {
  topic: string;
  name: string;
  email: string;
  message: string;
  messageId: string;
}) {
  const admins = getEnvAdminEmails();
  if (admins.length === 0) return;

  const payload = adminContactMessageEmail({
    topicLabel: contactTopicLabel(input.topic),
    name: input.name,
    email: input.email,
    message: input.message,
  });

  await Promise.all(
    admins.map((to) =>
      sendEmail({
        to,
        subject: payload.subject,
        html: payload.html,
        idempotencyKey: `admin-contact/${input.messageId}/${to}`,
        tags: [
          { name: "kind", value: "admin_contact" },
          { name: "message_id", value: input.messageId.slice(0, 48) },
        ],
      }),
    ),
  );
}
