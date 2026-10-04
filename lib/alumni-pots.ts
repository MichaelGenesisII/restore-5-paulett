import { PotStatus, PotType, type Prisma } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const ALUMNI_POTS_CACHE_TAG = "alumni-pots";

export type AlumniPotCardData = {
  slug: string;
  title: string;
  story: string | null;
  photoUrl: string | null;
  type: PotType;
  targetAmount: number;
  totalRaised: number;
  donorCount: number;
  fundraiser: {
    name: string;
    alumniCity: string | null;
    alumniMinistry: string | null;
  };
};

export type AlumniFacets = {
  cities: string[];
  ministries: string[];
  alumniPotCount: number;
};

function uniqueSorted(values: (string | null | undefined)[]) {
  return [
    ...new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function buildAlumniWhere(
  city: string,
  ministry: string,
  search: string,
): Prisma.PotWhereInput {
  return {
    status: PotStatus.ACTIVE,
    AND: [
      {
        OR: [
          { type: PotType.ALUMNI_GROUP },
          { fundraiser: { isAlumni: true } },
        ],
      },
      ...(city
        ? [
            {
              fundraiser: {
                alumniCity: { contains: city, mode: "insensitive" as const },
              },
            },
          ]
        : []),
      ...(ministry
        ? [
            {
              fundraiser: {
                alumniMinistry: {
                  contains: ministry,
                  mode: "insensitive" as const,
                },
              },
            },
          ]
        : []),
      ...(search
        ? [
            {
              OR: [
                { title: { contains: search, mode: "insensitive" as const } },
                { story: { contains: search, mode: "insensitive" as const } },
                {
                  fundraiser: {
                    name: { contains: search, mode: "insensitive" as const },
                  },
                },
                {
                  fundraiser: {
                    alumniCity: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  fundraiser: {
                    alumniMinistry: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };
}

async function loadAlumniFacets(): Promise<AlumniFacets> {
  const [alumniFundraisers, alumniPotCount] = await Promise.all([
    prisma.fundraiser.findMany({
      where: { isAlumni: true },
      select: { alumniCity: true, alumniMinistry: true },
    }),
    prisma.pot.count({
      where: {
        status: PotStatus.ACTIVE,
        OR: [
          { type: PotType.ALUMNI_GROUP },
          { fundraiser: { isAlumni: true } },
        ],
      },
    }),
  ]);

  return {
    cities: uniqueSorted(alumniFundraisers.map((row) => row.alumniCity)),
    ministries: uniqueSorted(
      alumniFundraisers.map((row) => row.alumniMinistry),
    ),
    alumniPotCount,
  };
}

export const getAlumniFacetsCached = unstable_cache(
  loadAlumniFacets,
  ["alumni-facets-v1"],
  { revalidate: 60, tags: [ALUMNI_POTS_CACHE_TAG] },
);

async function loadAlumniPots(
  city: string,
  ministry: string,
  search: string,
): Promise<AlumniPotCardData[]> {
  return prisma.pot.findMany({
    where: buildAlumniWhere(city, ministry, search),
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      slug: true,
      title: true,
      story: true,
      photoUrl: true,
      type: true,
      targetAmount: true,
      totalRaised: true,
      donorCount: true,
      fundraiser: {
        select: {
          name: true,
          alumniCity: true,
          alumniMinistry: true,
        },
      },
    },
  });
}

export function getAlumniPotsCached(opts: {
  city?: string;
  ministry?: string;
  search?: string;
}) {
  const city = opts.city?.trim() ?? "";
  const ministry = opts.ministry?.trim() ?? "";
  const search = opts.search?.trim() ?? "";

  return unstable_cache(
    () => loadAlumniPots(city, ministry, search),
    ["alumni-pots-v2", city, ministry, search],
    { revalidate: 60, tags: [ALUMNI_POTS_CACHE_TAG] },
  )();
}

export function revalidateAlumniPots() {
  revalidateTag(ALUMNI_POTS_CACHE_TAG, "max");
}
