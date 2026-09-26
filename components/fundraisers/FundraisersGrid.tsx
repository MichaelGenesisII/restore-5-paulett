import Link from "next/link";
import { PotCard } from "@/components/PotCard";
import { IconPeople } from "@/components/icons";
import {
  getFundraisersPageCached,
  type FundraisersPageData,
} from "@/lib/fundraisers-pots";

function fundraisersHref(opts: {
  page?: number;
  type?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (opts.search) params.set("search", opts.search);
  if (opts.type) params.set("type", opts.type);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `/fundraisers?${qs}` : "/fundraisers";
}

type Props = {
  type?: string;
  search: string;
  page: number;
};

export async function FundraisersGrid({ type, search, page }: Props) {
  let data: FundraisersPageData;
  try {
    data = await getFundraisersPageCached({ type, search, page });
  } catch {
    data = {
      pots: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      rangeStart: 0,
      rangeEnd: 0,
    };
  }

  const { pots, total, totalPages, currentPage } = data;
  const filtered = Boolean(type || search);

  if (total === 0) {
    return (
      <div className="mt-10 border border-dashed border-pvn-navy/20 bg-white/45 px-6 py-14 text-center">
        <IconPeople className="mx-auto h-8 w-8 text-pvn-gold" />
        <h2 className="font-display mt-4 text-2xl font-semibold text-pvn-navy">
          {filtered ? "No pot matches that yet" : "No pot found yet"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-pvn-navy/65">
          {filtered
            ? "Clear the search, or be the first to open a pot for that story."
            : "Be the first to name a section for your family, ministry, year or friends."}
        </p>
        <Link
          href="/fundraisers/create"
          className="font-nav mt-6 inline-flex items-center gap-2 rounded-md bg-pvn-gold px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
        >
          Start a pot <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {pots.map((pot) => (
          <PotCard key={pot.slug} pot={pot} />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav
          className="mt-10 flex items-center justify-between gap-3 border-t border-pvn-navy/10 pt-6 sm:mt-12"
          aria-label="Fundraisers pagination"
        >
          {currentPage > 1 ? (
            <Link
              href={`${fundraisersHref({
                page: currentPage - 1,
                type: type || undefined,
                search: search || undefined,
              })}#pots`}
              className="font-nav inline-flex min-h-11 items-center gap-2 border border-pvn-navy/15 px-3.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              <span aria-hidden>←</span> Previous
            </Link>
          ) : (
            <span className="min-w-0 flex-1 sm:flex-none" />
          )}
          <span className="font-nav shrink-0 text-center text-[0.7rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link
              href={`${fundraisersHref({
                page: currentPage + 1,
                type: type || undefined,
                search: search || undefined,
              })}#pots`}
              className="font-nav inline-flex min-h-11 items-center gap-2 border border-pvn-navy/15 px-3.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              Next <span aria-hidden>→</span>
            </Link>
          ) : (
            <span className="min-w-0 flex-1 sm:flex-none" />
          )}
        </nav>
      ) : null}
    </>
  );
}

/** Cream grid skeleton — only flashes on a cold cache. */
export function FundraisersGridFallback() {
  return (
    <div
      className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading pots"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-sm border border-pvn-navy/10 bg-white"
        >
          <div className="aspect-[16/10] bg-pvn-navy/5" />
          <div className="space-y-2.5 px-4 py-4">
            <div className="h-2.5 w-16 rounded-sm bg-pvn-navy/10" />
            <div className="h-4 w-3/4 rounded-sm bg-pvn-navy/15" />
            <div className="h-2 w-full rounded-sm bg-pvn-navy/8" />
            <div className="h-2 w-2/3 rounded-sm bg-pvn-navy/8" />
          </div>
        </div>
      ))}
    </div>
  );
}
