import { unstable_cache, revalidateTag } from "next/cache";
import { PotStatus, PotType, type Prisma } from "@prisma/client";
import { potStatusLabel } from "@/lib/pot-lifecycle";
import { prisma } from "@/lib/prisma";

export const ADMIN_POTS_CACHE_TAG = "admin-pots";

const STATUSES = Object.values(PotStatus);
const TYPES = Object.values(PotType);
const PAGE_SIZE_DEFAULT = 40;
const PAGE_SIZE_MAX = 100;

export type AdminPotsQuery = {
  status: PotStatus | "ALL";
  type: PotType | "ALL";
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

export function parseAdminPotsQuery(url: URL): AdminPotsQuery {
  const statusRaw = url.searchParams.get("status");
  const typeRaw = url.searchParams.get("type");
  return {
    status:
      statusRaw && STATUSES.includes(statusRaw as PotStatus)
        ? (statusRaw as PotStatus)
        : "ALL",
    type:
      typeRaw && TYPES.includes(typeRaw as PotType)
        ? (typeRaw as PotType)
        : "ALL",
    q: (url.searchParams.get("q") ?? "").trim(),
    page: parsePage(url.searchParams.get("page")),
    pageSize: parsePageSize(url.searchParams.get("pageSize")),
  };
}

function buildBaseWhere(query: AdminPotsQuery): Prisma.PotWhereInput {
  const where: Prisma.PotWhereInput = {};
  if (query.type !== "ALL") where.type = query.type;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { slug: { contains: query.q, mode: "insensitive" } },
      { fundraiser: { name: { contains: query.q, mode: "insensitive" } } },
      { fundraiser: { email: { contains: query.q, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function loadAdminPots(query: AdminPotsQuery) {
  const baseWhere = buildBaseWhere(query);
  const where: Prisma.PotWhereInput = { ...baseWhere };
  if (query.status !== "ALL") where.status = query.status;

  const [total, pots, statusGroups] = await Promise.all([
    prisma.pot.count({ where }),
    prisma.pot.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        status: true,
        photoUrl: true,
        totalRaised: true,
        targetAmount: true,
        donorCount: true,
        updatedAt: true,
        fundraiser: {
          select: {
            name: true,
            email: true,
            isAlumni: true,
          },
        },
      },
    }),
    prisma.pot.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  let allCount = 0;
  for (const row of statusGroups) {
    statusCounts[row.status] = row._count._all;
    allCount += row._count._all;
  }

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    statusCounts: {
      ALL: allCount,
      PENDING: statusCounts[PotStatus.PENDING] ?? 0,
      ACTIVE: statusCounts[PotStatus.ACTIVE] ?? 0,
      PAUSED: statusCounts[PotStatus.PAUSED] ?? 0,
      CLOSED: statusCounts[PotStatus.CLOSED] ?? 0,
      DISABLED: statusCounts[PotStatus.DISABLED] ?? 0,
    },
    pots: pots.map((p) => ({
      ...p,
      statusLabel: potStatusLabel(p.status),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}

function cacheKey(query: AdminPotsQuery): string[] {
  return [
    "admin-pots-v1",
    query.status,
    query.type,
    query.q,
    String(query.page),
    String(query.pageSize),
  ];
}

export function getAdminPotsCached(query: AdminPotsQuery) {
  return unstable_cache(() => loadAdminPots(query), cacheKey(query), {
    revalidate: 20,
    tags: [ADMIN_POTS_CACHE_TAG],
  })();
}

export function revalidateAdminPots() {
  revalidateTag(ADMIN_POTS_CACHE_TAG, "max");
}
