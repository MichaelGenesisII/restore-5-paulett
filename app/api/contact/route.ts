import { NextResponse, after } from "next/server";
import { parseContactTopic } from "@/lib/contact-topics";
import { prisma } from "@/lib/prisma";
import { rateLimitConsume, requestClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ContactBody = {
  topic?: unknown;
  name?: unknown;
  email?: unknown;
  message?: unknown;
  /** Honeypot — must be empty. */
  website?: unknown;
};

const CONTACT_LIMIT = 8;
const CONTACT_WINDOW_MS = 15 * 60 * 1000;

function optionalString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

/** Public contact form → ContactMessage row for admin inbox (+ staff email ping). */
export async function POST(request: Request) {
  const limited = rateLimitConsume(
    `contact:${requestClientIp(request)}`,
    CONTACT_LIMIT,
    CONTACT_WINDOW_MS,
  );
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: `Too many messages. Try again in about ${limited.retryAfterSec} seconds.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: ContactBody;
  try {
    body = (await request.json()) as ContactBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Silent success for bots that fill the honeypot.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const topic = parseContactTopic(body.topic) ?? null;
  const name = optionalString(body.name, 120);
  const email = optionalString(body.email, 254)?.toLowerCase() ?? null;
  const message = optionalString(body.message, 4000);

  if (!topic) {
    return NextResponse.json({ error: "Choose a topic." }, { status: 400 });
  }
  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "Please tell us your name." },
      { status: 400 },
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "That email address does not look right." },
      { status: 400 },
    );
  }
  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: "Please add a little more detail so we can help." },
      { status: 400 },
    );
  }

  const row = await prisma.contactMessage.create({
    data: {
      topic,
      name,
      email,
      message,
    },
    select: { id: true },
  });

  after(() => {
    void import("@/lib/email/admin-notify")
      .then(({ notifyAdminsOfContactMessage }) =>
        notifyAdminsOfContactMessage({
          topic,
          name,
          email,
          message,
          messageId: row.id,
        }),
      )
      .catch((err) => console.error("Contact staff email failed", err));
  });

  return NextResponse.json({ ok: true });
}
