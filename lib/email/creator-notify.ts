import {
  creatorCredentialsEmail,
  creatorPasswordResetEmail,
} from "@/lib/email/creator-templates";
import { sendEmail } from "@/lib/email/send";

export async function notifyCreatorCredentials(input: {
  name: string | null;
  email: string;
  temporaryPassword: string;
  potTitle: string;
  potSlug: string;
}) {
  const payload = creatorCredentialsEmail(input);
  await sendEmail({
    to: input.email,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `creator-credentials/${input.email}/${input.potSlug}`,
    tags: [
      { name: "kind", value: "creator_credentials" },
      { name: "pot_slug", value: input.potSlug.slice(0, 48) },
    ],
  });
}

export async function notifyCreatorPasswordReset(input: {
  name: string | null;
  email: string;
  temporaryPassword: string;
}) {
  const payload = creatorPasswordResetEmail(input);
  await sendEmail({
    to: input.email,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `creator-password-reset/${input.email}/${Date.now()}`,
    tags: [{ name: "kind", value: "creator_password_reset" }],
  });
}
