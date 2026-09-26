import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PotType } from "@prisma/client";
import { ArcEdge, ARC_SPACE } from "@/components/ArcEdge";
import {
  FundraisersGrid,
  FundraisersGridFallback,
} from "@/components/fundraisers/FundraisersGrid";
import { IconHeart, IconWall } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse pots",
  description:
    "Explore live pots raising for the restoration of 5 Paulett Avenue — individuals, families, alumni, and ministries building together with PVN Belfast.",
  alternates: { canonical: "/fundraisers" },
  openGraph: {
    title: "Browse pots",
    description:
      "Explore live pots raising for the restoration of 5 Paulett Avenue.",
    url: "/fundraisers",
  },
};

const potTypes = [
  { value: "", label: "All pots" },
  { value: PotType.INDIVIDUAL, label: "Individuals" },
  { value: PotType.FAMILY, label: "Families" },
  { value: PotType.ALUMNI_GROUP, label: "Alumni groups" },
  { value: PotType.MINISTRY, label: "Ministries" },
  { value: PotType.OTHER_GROUP, label: "Groups" },
] as const;

export default async function FundraisersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string; page?: string }>;
}) {
  const query = await searchParams;
  const requestedType = query.type?.trim() ?? "";
  const type = Object.values(PotType).includes(requestedType as PotType)
    ? requestedType
    : undefined;
  const search = query.search?.trim() ?? "";
  const requestedPage = Math.max(
    1,
    Number.parseInt(query.page ?? "1", 10) || 1,
  );

  const selectedType = potTypes.find(
    (option) => option.value === requestedType,
  );

  return (
    <main className="w-full">
      <section
        className="relative isolate -mt-[4.75rem] overflow-hidden bg-pvn-navy pt-[calc(4.75rem+3.5rem)] text-pvn-cream"
        style={{ paddingBottom: `${ARC_SPACE}px` }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(335deg, #c9a84c 20px, transparent 20px),
              linear-gradient(155deg, #c9a84c 20px, transparent 20px)
            `,
            backgroundSize: "52px 52px",
            backgroundPosition: "0 0, 26px 0",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[22rem]"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.18), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-black/35 to-transparent"
          aria-hidden
        />
        <ArcEdge side="bottom" />

        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-3 sm:px-6 lg:grid-cols-1">
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-5 border-b border-pvn-cream/20 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-nav text-xs font-semibold tracking-[0.28em] text-pvn-gold uppercase">
                  Browse the wall
                </p>
                <h2 className="font-display mt-2 text-3xl font-semibold text-pvn-cream sm:text-4xl">
                  {search
                    ? "Matching pots"
                    : type
                      ? (selectedType?.label ?? "Matching pots")
                      : "Pots already rising"}
                </h2>
                <p className="mt-2 text-sm text-pvn-cream/65 sm:text-base">
                  Choose a story to join, or start one for the people who know
                  you.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-pvn-cream/60">
                <IconWall className="h-4 w-4 text-pvn-gold" />
                <span className="font-nav text-xs tracking-[0.12em] uppercase">
                  On the wall
                </span>
                <Link
                  href="/fundraisers/create"
                  className="inline-flex items-center gap-2 rounded-md bg-pvn-gold px-4 py-2.5 font-nav text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
                >
                  <IconHeart className="h-4 w-4" /> Start a pot
                </Link>
              </div>
            </div>

            <form
              className="mt-6 grid gap-2.5 rounded-sm border border-pvn-cream/15 bg-pvn-navy-light/45 p-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-3 sm:p-4"
              action="/fundraisers"
              method="get"
            >
              <label className="sr-only" htmlFor="fundraiser-search">
                Search fundraisers
              </label>
              <input
                id="fundraiser-search"
                name="search"
                defaultValue={search}
                placeholder="Search pots or people"
                className="min-h-11 w-full min-w-0 rounded-md border border-pvn-cream/15 bg-pvn-cream px-3 text-base text-pvn-navy outline-none placeholder:text-pvn-navy/40 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/20 sm:text-sm"
              />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 sm:contents">
                <label className="sr-only" htmlFor="fundraiser-type">
                  Filter by pot type
                </label>
                <select
                  id="fundraiser-type"
                  name="type"
                  defaultValue={requestedType}
                  className="min-h-11 w-full min-w-0 rounded-md border border-pvn-cream/15 bg-pvn-cream px-3 text-base text-pvn-navy outline-none focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/20 sm:w-auto sm:text-sm"
                >
                  {potTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="min-h-11 shrink-0 rounded-md bg-pvn-gold px-4 font-nav text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light sm:px-5"
                >
                  <span className="sm:hidden">Search</span>
                  <span className="hidden sm:inline">Search wall</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section
        id="pots"
        className="border-t border-pvn-navy/5 bg-pvn-cream py-10 sm:py-14"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Suspense
            key={`${type ?? ""}|${search}|${requestedPage}`}
            fallback={<FundraisersGridFallback />}
          >
            <FundraisersGrid
              type={type}
              search={search}
              page={requestedPage}
            />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
