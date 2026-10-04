import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { revalidateAdminInbox } from "@/lib/admin-inbox";
import { revalidateAdminOverview } from "@/lib/admin-overview";
import { contactTopicLabel } from "@/lib/contact-topics";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const messageSelect = {
  id: true,
  topic: true,
  name: true,
  email: true,
  message: true,
  handled: true,
  createdAt: true,
} as const;

function serializeMessage<T extends { topic: string; createdAt: Date }>(
  message: T,
) {
  return {
    ...message,
    topicLabel: contactTopicLabel(message.topic),
    createdAt: message.createdAt.toISOString(),
  };
}

/** Single contact message. */
export async function GET(request: Request, context: RouteContext) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const message = await prisma.contactMessage.findUnique({
    where: { id: id.trim() },
    select: messageSelect,
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  return NextResponse.json({ message: serializeMessage(message) });
}

/** Mark a contact message handled / unhandled. */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let body: { handled?: unknown };
  try {
    body = (await request.json()) as { handled?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.handled !== "boolean") {
    return NextResponse.json(
      { error: "handled boolean required" },
      { status: 400 },
    );
  }

  try {
    const message = await prisma.contactMessage.update({
      where: { id: id.trim() },
      data: { handled: body.handled },
      select: messageSelect,
    });

    revalidateAdminInbox();
    revalidateAdminOverview();
    return NextResponse.json({ message: serializeMessage(message) });
  } catch {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
}
