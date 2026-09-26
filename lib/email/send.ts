import { Resend } from "resend";
import { emailFrom, resendApiKey } from "@/lib/email/config";

let client: Resend | null = null;

function getResend() {
  const key = resendApiKey();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Optional tags for Resend dashboard filtering. */
  tags?: { name: string; value: string }[];
  /** Dedupes webhook retries for the same lifecycle event. */
  idempotencyKey?: string;
};

/**
 * Fire-and-forget safe: never throws to callers. Logs and returns false on miss.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    console.warn("sendEmail skipped — no valid recipient");
    return false;
  }

  const resend = getResend();
  if (!resend) {
    console.warn("sendEmail skipped — RESEND_API_KEY missing");
    return false;
  }

  try {
    const { error } = await resend.emails.send(
      {
        from: emailFrom(),
        to: [to],
        subject: input.subject,
        html: input.html,
        tags: input.tags,
      },
      input.idempotencyKey
        ? { idempotencyKey: input.idempotencyKey.slice(0, 256) }
        : undefined,
    );

    if (error) {
      console.error("Resend send failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Resend send threw", error);
    return false;
  }
}
