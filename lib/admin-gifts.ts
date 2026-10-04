import { unstable_cache, revalidateTag } from "next/cache";
import { DonationStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ADMIN_GIFTS_CACHE_TAG = "admin-gifts";

const PAGE_SIZE_DEFAULT = 40;
const PAGE_SIZE_MAX = 100;

export type AdminGiftsQuery = {
  status: DonationStatus | "ALL";
  destination: "DIRECT" | "POT" | "ALL";
  giftAid: boolean | "ALL";
  recurring: boolean | "ALL";
  q: string;
  page: number;
  pageSize: number;
  from: string | null;
  to: string | null;
};

function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | "ALL" {
  if (!value || value === "ALL") return "ALL";
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : "ALL";
}

function parseBoolFilter(value: string | null): boolean | "ALL" {
  if (value === "true") return true;
  if (value === "false") return false;
  return "ALL";
}

function parsePage(value: string | null): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parsePageSize(value: string | null): number {
  const n = Number.parseInt(value ?? String(PAGE_SIZE_DEFAULT), 10);
  if (!Number.isFinite(n) || n < 1) return PAGE_SIZE_DEFAULT;
  return Math.min(n, PAGE_SIZE_MAX);
}

export function parseAdminGiftsQuery(url: URL): AdminGiftsQuery {
  return {
    status: parseEnum(url.searchParams.get("status"), [
      DonationStatus.PENDING,
      DonationStatus.SUCCEEDED,
      DonationStatus.FAILED,
      DonationStatus.REFUNDED,
    ] as const),
    destination: parseEnum(url.searchParams.get("destination"), [
      "DIRECT",
      "POT",
    ] as const),
    giftAid: parseBoolFilter(url.searchParams.get("giftAid")),
    recurring: parseBoolFilter(url.searchParams.get("recurring")),
    q: (url.searchParams.get("q") ?? "").trim(),
    page: parsePage(url.searchParams.get("page")),
    pageSize: parsePageSize(url.searchParams.get("pageSize")),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };
}

function buildWhere(query: AdminGiftsQuery): Prisma.DonationWhereInput {
  const where: Prisma.DonationWhereInput = {};

  if (query.status !== "ALL") where.status = query.status;
  if (query.destination === "DIRECT") where.potId = null;
  if (query.destination === "POT") where.potId = { not: null };
  if (query.giftAid !== "ALL") where.giftAid = query.giftAid;
  if (query.recurring !== "ALL") where.isRecurring = query.recurring;

  if (query.from || query.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) {
      const from = new Date(query.from);
      if (!Number.isNaN(from.getTime())) createdAt.gte = from;
    }
    if (query.to) {
      const to = new Date(query.to);
      if (!Number.isNaN(to.getTime())) createdAt.lte = to;
    }
    if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  }

  if (query.q) {
    where.OR = [
      { id: { contains: query.q, mode: "insensitive" } },
      { donorEmail: { contains: query.q, mode: "insensitive" } },
      { donorName: { contains: query.q, mode: "insensitive" } },
      { message: { contains: query.q, mode: "insensitive" } },
      { stripePaymentIntentId: { contains: query.q, mode: "insensitive" } },
      { stripeCheckoutSessionId: { contains: query.q, mode: "insensitive" } },
      { stripeSubscriptionId: { contains: query.q, mode: "insensitive" } },
      { stripeInvoiceId: { contains: query.q, mode: "insensitive" } },
      { pot: { slug: { contains: query.q, mode: "insensitive" } } },
      { pot: { title: { contains: query.q, mode: "insensitive" } } },
    ];
  }

  return where;
}

/** Where for status counts — same filters except status itself. */
function buildCountWhere(query: AdminGiftsQuery): Prisma.DonationWhereInput {
  return buildWhere({ ...query, status: "ALL" });
}

async function loadAdminGifts(query: AdminGiftsQuery) {
  const where = buildWhere(query);
  const countWhere = buildCountWhere(query);

  const [total, gifts, statusGroups] = await Promise.all([
    prisma.donation.count({ where }),
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        amount: true,
        status: true,
        potId: true,
        donorName: true,
        donorEmail: true,
        isAnonymous: true,
        message: true,
        isRecurring: true,
        giftAid: true,
        createdAt: true,
        pot: {
          select: {
            slug: true,
            title: true,
          },
        },
      },
    }),
    prisma.donation.groupBy({
      by: ["status"],
      where: countWhere,
      _count: { _all: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {
    ALL: 0,
    PENDING: 0,
    SUCCEEDED: 0,
    FAILED: 0,
    REFUNDED: 0,
  };
  for (const row of statusGroups) {
    statusCounts[row.status] = row._count._all;
    statusCounts.ALL += row._count._all;
  }

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    statusCounts,
    gifts: gifts.map((g) => ({
      id: g.id,
      amount: g.amount,
      status: g.status,
      donorName: g.donorName,
      donorEmail: g.donorEmail,
      isAnonymous: g.isAnonymous,
      message: g.message,
      isRecurring: g.isRecurring,
      giftAid: g.giftAid,
      createdAt: g.createdAt.toISOString(),
      destination: g.potId ? ("POT" as const) : ("DIRECT" as const),
      pot: g.pot ? { slug: g.pot.slug, title: g.pot.title } : null,
    })),
  };
}

function cacheKey(query: AdminGiftsQuery): string[] {
  return [
    "admin-gifts-v2",
    query.status,
    query.destination,
    String(query.giftAid),
    String(query.recurring),
    query.q,
    String(query.page),
    String(query.pageSize),
    query.from ?? "",
    query.to ?? "",
  ];
}

/** Short TTL — gift ops need fresher lists than public pages. */
export function getAdminGiftsCached(query: AdminGiftsQuery) {
  return unstable_cache(() => loadAdminGifts(query), cacheKey(query), {
    revalidate: 20,
    tags: [ADMIN_GIFTS_CACHE_TAG],
  })();
}

export function revalidateAdminGifts() {
  revalidateTag(ADMIN_GIFTS_CACHE_TAG, "max");
}
