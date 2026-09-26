import { unstable_cache, revalidateTag } from "next/cache";
import type { ContactTopic, Prisma } from "@prisma/client";
import { contactTopicLabel, parseContactTopic } from "@/lib/contact-topics";
import { prisma } from "@/lib/prisma";

export const ADMIN_INBOX_CACHE_TAG = "admin-inbox";

const PAGE_SIZE_DEFAULT = 40;
const PAGE_SIZE_MAX = 100;

export type AdminInboxFilter = "open" | "done" | "all";

export type AdminInboxQuery = {
  filter: AdminInboxFilter;
  topic: ContactTopic | null;
  q: string;
  page: number;
  pageSize: number;
};

function parsePage(value: string | null): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parsePageSize(value: string | null): number {
  const n = Number.parseInt(value ?? String(PAGE_SIZE_DEFAULT), 10);
  if (!Number.isFinite(n) || n < 1) return PAGE_SIZE_DEFAULT;
  return Math.min(n, PAGE_SIZE_MAX);
}

function parseFilter(value: string | null): AdminInboxFilter {
  if (value === "done" || value === "all") return value;
  return "open";
}

export function parseAdminInboxQuery(url: URL): AdminInboxQuery {
  return {
    filter: parseFilter(url.searchParams.get("filter")),
    topic: parseContactTopic(url.searchParams.get("topic")),
    q: url.searchParams.get("q")?.trim() ?? "",
    page: parsePage(url.searchParams.get("page")),
    pageSize: parsePageSize(url.searchParams.get("pageSize")),
  };
}

function buildWhere(query: AdminInboxQuery): Prisma.ContactMessageWhereInput {
  const where: Prisma.ContactMessageWhereInput = {};
  if (query.filter === "open") where.handled = false;
  if (query.filter === "done") where.handled = true;
  if (query.topic) where.topic = query.topic;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { email: { contains: query.q, mode: "insensitive" } },
      { message: { contains: query.q, mode: "insensitive" } },
    ];
  }
  return where;
}

async function loadAdminInbox(query: AdminInboxQuery) {
  const where = buildWhere(query);

  const [messages, total, openCount, doneCount] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: [
        { handled: "asc" },
        { createdAt: query.filter === "done" ? "desc" : "asc" },
      ],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        topic: true,
        name: true,
        email: true,
        message: true,
        handled: true,
        createdAt: true,
      },
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { handled: false } }),
    prisma.contactMessage.count({ where: { handled: true } }),
  ]);

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    openCount,
    doneCount,
    messages: messages.map((m) => ({
      id: m.id,
      topic: m.topic,
      topicLabel: contactTopicLabel(m.topic),
      name: m.name,
      email: m.email,
      preview: m.message.trim().slice(0, 160),
      handled: m.handled,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

function cacheKey(query: AdminInboxQuery): string[] {
  return [
    "admin-inbox-v1",
    query.filter,
    query.topic ?? "",
    query.q,
    String(query.page),
    String(query.pageSize),
  ];
}

export function getAdminInboxCached(query: AdminInboxQuery) {
  return unstable_cache(() => loadAdminInbox(query), cacheKey(query), {
    revalidate: 20,
    tags: [ADMIN_INBOX_CACHE_TAG],
  })();
}

export function revalidateAdminInbox() {
  revalidateTag(ADMIN_INBOX_CACHE_TAG, "max");
}
