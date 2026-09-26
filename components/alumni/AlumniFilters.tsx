"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Soft filters for the alumni wall. They write into the URL so a shared
 * link opens on the same people, and so the server can do the query.
 *
 * Do not wrap navigation in startTransition — that keeps stale results and
 * prevents the parent Suspense boundary from showing its loading UI.
 */
export function AlumniFilters({
  cities,
  ministries,
}: {
  cities: string[];
  ministries: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const city = params.get("city") ?? "";
  const ministry = params.get("ministry") ?? "";
  const search = params.get("search") ?? "";

  const write = useCallback(
    (next: { city?: string; ministry?: string; search?: string }) => {
      const query = new URLSearchParams();
      const nextCity = next.city ?? city;
      const nextMinistry = next.ministry ?? ministry;
      const nextSearch = next.search ?? search;

      if (nextCity) query.set("city", nextCity);
      if (nextMinistry) query.set("ministry", nextMinistry);
      if (nextSearch.trim()) query.set("search", nextSearch.trim());

      const path = query.size > 0 ? `/alumni?${query.toString()}` : "/alumni";
      router.push(path, { scroll: false });
    },
    [city, ministry, router, search],
  );

  return (
    <div className="flex flex-col gap-5">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          write({ search: String(form.get("search") ?? "") });
        }}
      >
        <label className="sr-only" htmlFor="alumni-search">
          Search alumni pots
        </label>
        <input
          id="alumni-search"
          name="search"
          defaultValue={search}
          placeholder="Search by name, city, ministry…"
          className="w-full rounded-sm border border-pvn-navy/15 bg-white/70 px-3.5 py-3 text-sm text-pvn-navy placeholder:text-pvn-navy/45 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none"
        />
        <button
          type="submit"
          className="font-nav inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-pvn-navy px-5 text-xs font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy-light"
        >
          Find them
        </button>
      </form>

      {cities.length > 0 ? (
        <div>
          <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-navy/45 uppercase">
            By city
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {cities.map((place) => {
              const active = city.toLowerCase() === place.toLowerCase();
              return (
                <li key={place}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => write({ city: active ? "" : place })}
                    className={`font-nav rounded-full border px-3.5 py-1.5 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition duration-300 ${
                      active
                        ? "border-pvn-gold bg-pvn-gold text-pvn-navy"
                        : "border-pvn-navy/15 bg-white/60 text-pvn-navy/70 hover:border-pvn-gold/60 hover:text-pvn-navy"
                    }`}
                  >
                    {place}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {ministries.length > 0 ? (
        <div>
          <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-navy/45 uppercase">
            By ministry
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {ministries.map((group) => {
              const active = ministry.toLowerCase() === group.toLowerCase();
              return (
                <li key={group}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => write({ ministry: active ? "" : group })}
                    className={`font-nav rounded-full border px-3.5 py-1.5 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition duration-300 ${
                      active
                        ? "border-pvn-gold bg-pvn-gold text-pvn-navy"
                        : "border-pvn-navy/15 bg-white/60 text-pvn-navy/70 hover:border-pvn-gold/60 hover:text-pvn-navy"
                    }`}
                  >
                    {group}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {city || ministry || search ? (
        <button
          type="button"
          onClick={() => {
            router.push("/alumni", { scroll: false });
          }}
          className="font-nav self-start text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase underline decoration-pvn-gold/50 underline-offset-4 transition hover:text-pvn-navy"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
