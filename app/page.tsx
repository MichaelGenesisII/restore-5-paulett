import { Suspense } from "react";
import type { Metadata } from "next";
import { DonationStatus, PotStatus } from "@prisma/client";
import { HomeHero } from "@/components/HomeHero";
import { HomeAlumni } from "@/components/home/HomeAlumni";
import { HomeBuild } from "@/components/home/HomeBuild";
import { HomeCalling } from "@/components/home/HomeCalling";
import { HomeClosing } from "@/components/home/HomeClosing";
import { HomePlaces } from "@/components/home/HomePlaces";
import {
  HomePotsFallback,
  HomePotsSection,
} from "@/components/home/HomePotsSection";
import { HomeVision } from "@/components/home/HomeVision";
import { DEFAULT_BUILDING_FUND_TARGET_PENCE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | PVN Belfast` },
  description: SITE_TAGLINE,
  alternates: { canonical: "/" },
};

export default async function Home() {
  let raised = 0;
  let target = DEFAULT_BUILDING_FUND_TARGET_PENCE;
  let peopleGiven = 0;
  let potCount = 0;
  let countryCount = 0;

  try {
    // Hero metrics only — pot tiles stream separately via Suspense + cache.
    const [fund, donationCount, activePots, countryRows] = await Promise.all([
      prisma.buildingFund.findUnique({ where: { id: 1 } }),
      prisma.donation.count({
        where: { status: DonationStatus.SUCCEEDED },
      }),
      prisma.pot.count({ where: { status: PotStatus.ACTIVE } }),
      prisma.fundraiser.findMany({
        where: { alumniCountry: { not: null } },
        select: { alumniCountry: true },
        distinct: ["alumniCountry"],
      }),
    ]);

    raised = fund?.totalRaised ?? 0;
    target = fund?.targetAmount ?? DEFAULT_BUILDING_FUND_TARGET_PENCE;
    peopleGiven = donationCount;
    potCount = activePots;
    countryCount = countryRows.filter((row) =>
      Boolean(row.alumniCountry?.trim()),
    ).length;
  } catch {
    // Database unreachable (local / paused pooler) — render with zeros.
  }

  return (
    <main className="w-full">
      <HomeHero
        raised={raised}
        target={target}
        peopleGiven={peopleGiven}
        potCount={potCount}
        countryCount={countryCount}
      />
      <HomePlaces />
      <HomeVision />
      <HomeCalling />
      <HomeBuild />
      <Suspense fallback={<HomePotsFallback />}>
        <HomePotsSection />
      </Suspense>
      <HomeAlumni />
      <HomeClosing />
    </main>
  );
}
