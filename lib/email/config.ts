import { organisation } from "@/lib/site";

export function emailFrom() {
  const address =
    process.env.EMAIL_FROM_ADDRESS?.trim() || organisation.email;
  const name =
    process.env.EMAIL_FROM_NAME?.trim() || organisation.shortName;
  return `${name} <${address}>`;
}

export function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    console.error(
      "NEXT_PUBLIC_APP_URL is not set in production — email links may be wrong",
    );
  }

  return "http://localhost:3000";
}

export function resendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || null;
}
