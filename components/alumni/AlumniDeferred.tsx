import Link from "next/link";
import { Suspense } from "react";
import { AlumniFilters } from "@/components/alumni/AlumniFilters";
import { AlumniPotCard } from "@/components/alumni/AlumniPotCard";
import {
  getAlumniFacetsCached,
  getAlumniPotsCached,
} from "@/lib/alumni-pots";

const scatteredTo = [
  "London",
  "Dublin",
  "Manchester",
  "Scotland",
  "Nigeria",
  "Canada",
  "America",
  "Europe",
] as const;

export async function AlumniHeroAside() {
  let alumniPotCount = 0;
  try {
    const facets = await getAlumniFacetsCached();
    alumniPotCount = facets.alumniPotCount;
  } catch {
    // zeros
  }

  return (
    <aside className="rounded-sm border border-pvn-gold/60 bg-pvn-navy/60 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] backdrop-blur-sm transition duration-300 ease-out hover:border-pvn-gold hover:shadow-[0_26px_50px_-18px_rgba(201,168,76,0.35)] motion-safe:hover:-translate-y-1">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:hidden">
        <div className="min-w-0">
          <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
            On the wall
          </p>
          <p className="mt-1 truncate text-xs leading-snug text-pvn-cream/85">
            {alumniPotCount > 0
              ? `${alumniPotCount} alumni ${alumniPotCount === 1 ? "pot" : "pots"} rising`
              : "No alumni pot open yet"}
          </p>
        </div>
        <Link
          href="#reconnect"
          className="font-nav shrink-0 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-gold uppercase underline decoration-pvn-gold/40 underline-offset-4"
        >
          Find →
        </Link>
      </div>

      <div className="hidden p-5 sm:block sm:p-6 lg:p-7">
        <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
          Wherever you are now
        </p>
        <p className="font-display mt-2 text-2xl leading-tight font-semibold tracking-tight text-pvn-cream sm:text-3xl">
          {alumniPotCount > 0
            ? `${alumniPotCount} alumni ${alumniPotCount === 1 ? "pot" : "pots"}`
            : "The wall is open"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-pvn-cream/70">
          {alumniPotCount > 0
            ? "Already rising — by year, city and ministry. Find your people, or name a section of your own."
            : "No alumni pot has opened yet. Be the first to name a section for your year, city or ministry."}
        </p>
        <p className="font-nav mt-3 text-[0.65rem] font-semibold tracking-[0.12em] text-pvn-cream/40 uppercase">
          {scatteredTo.slice(0, 5).join(" · ")}
          <span className="text-pvn-cream/25"> · &amp; beyond</span>
        </p>
        <p className="mt-4 border-t border-pvn-cream/12 pt-4">
          <Link
            href="#reconnect"
            className="font-nav text-[0.7rem] font-bold tracking-[0.16em] text-pvn-gold uppercase transition hover:text-pvn-gold-light"
          >
            Find your people on the wall →
          </Link>
        </p>
      </div>
    </aside>
  );
}

export function AlumniHeroAsideFallback() {
  return (
    <aside
      className="rounded-sm border border-pvn-gold/60 bg-pvn-navy/60 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] backdrop-blur-sm"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:hidden">
        <div className="min-w-0 space-y-2">
          <div className="h-2.5 w-16 animate-pulse rounded-sm bg-pvn-cream/15" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-pvn-cream/10" />
        </div>
      </div>
      <div className="hidden space-y-3 p-5 sm:block sm:p-6 lg:p-7">
        <div className="h-2.5 w-28 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="h-8 w-48 animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="h-12 w-full animate-pulse rounded-sm bg-pvn-cream/10" />
      </div>
    </aside>
  );
}

type ReconnectProps = {
  city: string;
  ministry: string;
  search: string;
};

export async function AlumniReconnect({ city, ministry, search }: ReconnectProps) {
  let cities: string[] = [];
  let ministries: string[] = [];
  let pots: Awaited<ReturnType<typeof getAlumniPotsCached>> = [];

  try {
    const [facets, potRows] = await Promise.all([
      getAlumniFacetsCached(),
      getAlumniPotsCached({ city, ministry, search }),
    ]);
    cities = facets.cities;
    ministries = facets.ministries;
    pots = potRows;
  } catch {
    // empty reconnect
  }

  const filtered = Boolean(city || ministry || search);

  return (
    <section
      id="reconnect"
      className="border-t border-pvn-navy/5 bg-pvn-cream pt-14 pb-14 sm:pt-20 sm:pb-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-nav text-xs font-semibold tracking-[0.28em] text-pvn-gold uppercase">
            Reconnect
          </p>
          <h2 className="font-display mt-3 text-3xl leading-tight font-semibold text-pvn-navy sm:text-4xl">
            Find your people on the wall
          </h2>
          <p className="mt-4 text-base leading-relaxed text-pvn-navy/75 text-pretty">
            Alumni pots and pots run by alumni. Filter by city or ministry, or
            search for a name you still know.
          </p>
        </div>

        <div className="mt-8">
          <Suspense
            fallback={
              <div className="h-24 animate-pulse rounded-sm bg-pvn-navy/5" />
            }
          >
            <AlumniFilters cities={cities} ministries={ministries} />
          </Suspense>
        </div>

        {pots.length === 0 ? (
          <div className="mt-10 rounded-sm border border-dashed border-pvn-navy/20 bg-white/40 px-6 py-12 text-center">
            <p className="font-display text-2xl font-semibold text-pvn-navy">
              {filtered
                ? "Nobody matches that yet"
                : "The alumni wall is still quiet"}
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pvn-navy/70">
              {filtered
                ? "Clear the filters, or be the first to open a pot for that city or ministry."
                : "Be the first to name a section for your year, your city, or your ministry. The people who already know you will follow."}
            </p>
            <Link
              href="/fundraisers/create"
              className="font-nav mt-6 inline-flex rounded-md bg-pvn-gold px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Start an alumni pot →
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pots.map((pot) => (
              <AlumniPotCard key={pot.slug} pot={pot} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function AlumniReconnectFallback() {
  return (
    <section
      id="reconnect"
      className="border-t border-pvn-navy/5 bg-pvn-cream pt-14 pb-14 sm:pt-20 sm:pb-20"
      aria-busy="true"
      aria-label="Searching alumni pots"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-nav text-xs font-semibold tracking-[0.28em] text-pvn-gold uppercase">
            Reconnect
          </p>
          <h2 className="font-display mt-3 text-3xl leading-tight font-semibold text-pvn-navy sm:text-4xl">
            Find your people on the wall
          </h2>
          <p className="mt-4 text-base leading-relaxed text-pvn-navy/75 text-pretty">
            Searching the alumni wall…
          </p>
        </div>

        <div className="mt-8 h-24 animate-pulse rounded-sm bg-pvn-navy/5" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-sm border border-pvn-navy/10 bg-white"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
