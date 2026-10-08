import {
  creatorPasswordResetEmail,
  creatorSeedReminderEmail,
  creatorWelcomeEmail,
} from "@/lib/email/creator-templates";
import { sendEmail } from "@/lib/email/send";

export async function notifyCreatorWelcome(input: {
  name: string | null;
  email: string;
  potTitle: string;
  potSlug: string;
  setPasswordToken: string;
}) {
  const payload = creatorWelcomeEmail(input);
  await sendEmail({
    to: input.email,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `creator-welcome/${input.email}/${input.potSlug}`,
    tags: [
      { name: "kind", value: "creator_welcome" },
      { name: "pot_slug", value: input.potSlug.slice(0, 48) },
    ],
  });
}

export async function notifyCreatorSeedReminder(input: {
  name: string | null;
  email: string;
  potTitle: string;
  potSlug: string;
}): Promise<boolean> {
  const payload = creatorSeedReminderEmail(input);
  return sendEmail({
    to: input.email,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `creator-seed-reminder/${input.potSlug}`,
    tags: [
      { name: "kind", value: "creator_seed_reminder" },
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
