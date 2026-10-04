import { unstable_cache, revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ADMIN_HOSTS_CACHE_TAG = "admin-hosts";

const PAGE_SIZE_DEFAULT = 40;
const PAGE_SIZE_MAX = 100;

export type AdminHostsAlumniFilter = "ALL" | "true" | "false";

export type AdminHostsQuery = {
  alumni: AdminHostsAlumniFilter;
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

function parseAlumni(value: string | null): AdminHostsAlumniFilter {
  if (value === "true" || value === "false") return value;
  return "ALL";
}

export function parseAdminHostsQuery(url: URL): AdminHostsQuery {
  return {
    alumni: parseAlumni(url.searchParams.get("alumni")),
    q: (url.searchParams.get("q") ?? "").trim(),
    page: parsePage(url.searchParams.get("page")),
    pageSize: parsePageSize(url.searchParams.get("pageSize")),
  };
}

function buildBaseWhere(query: AdminHostsQuery): Prisma.FundraiserWhereInput {
  const where: Prisma.FundraiserWhereInput = {};
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { email: { contains: query.q, mode: "insensitive" } },
      { profileSlug: { contains: query.q, mode: "insensitive" } },
    ];
  }
  return where;
}

async function loadAdminHosts(query: AdminHostsQuery) {
  const baseWhere = buildBaseWhere(query);
  const where: Prisma.FundraiserWhereInput = { ...baseWhere };
  if (query.alumni === "true") where.isAlumni = true;
  if (query.alumni === "false") where.isAlumni = false;

  const [total, hosts, alumniTrue, alumniFalse] = await Promise.all([
    prisma.fundraiser.count({ where }),
    prisma.fundraiser.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        profileSlug: true,
        profilePublic: true,
        photoUrl: true,
        isAlumni: true,
        createdAt: true,
        pots: {
          select: {
            totalRaised: true,
            status: true,
          },
        },
      },
    }),
    prisma.fundraiser.count({
      where: { ...baseWhere, isAlumni: true },
    }),
    prisma.fundraiser.count({
      where: { ...baseWhere, isAlumni: false },
    }),
  ]);

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    filterCounts: {
      ALL: alumniTrue + alumniFalse,
      alumni: alumniTrue,
      nonAlumni: alumniFalse,
    },
    hosts: hosts.map((h) => {
      const potCount = h.pots.length;
      const totalRaised = h.pots.reduce((s, p) => s + p.totalRaised, 0);
      const livePots = h.pots.filter((p) => p.status === "ACTIVE").length;
      return {
        id: h.id,
        name: h.name,
        email: h.email,
        profileSlug: h.profileSlug,
        profilePublic: h.profilePublic,
        photoUrl: h.photoUrl,
        isAlumni: h.isAlumni,
        potCount,
        livePots,
        totalRaised,
        createdAt: h.createdAt.toISOString(),
      };
    }),
  };
}

function cacheKey(query: AdminHostsQuery): string[] {
  return [
    "admin-hosts-v1",
    query.alumni,
    query.q,
    String(query.page),
    String(query.pageSize),
  ];
}

export function getAdminHostsCached(query: AdminHostsQuery) {
  return unstable_cache(() => loadAdminHosts(query), cacheKey(query), {
    revalidate: 20,
    tags: [ADMIN_HOSTS_CACHE_TAG],
  })();
}

export function revalidateAdminHosts() {
  revalidateTag(ADMIN_HOSTS_CACHE_TAG, "max");
}
