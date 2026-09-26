import Link from "next/link";
import { PotComments } from "@/components/pots/PotComments";
import { PotMorePots } from "@/components/pots/PotMorePots";
import {
  getOtherPotsCached,
  getPotCommentsCached,
} from "@/lib/pot-page";

export async function PotCommentsSection({
  slug,
  page,
}: {
  slug: string;
  page: number;
}) {
  let data;
  try {
    data = await getPotCommentsCached(slug, page);
  } catch {
    return null;
  }

  if (!data || data.totalCount === 0) return null;

  const { comments, totalCount, totalPages, currentPage, creatorName } = data;

  return (
    <section
      id="messages"
      className="border-t border-pvn-navy/10 bg-pvn-cream py-10 sm:py-14 lg:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PotComments
          comments={comments}
          creatorName={creatorName}
          totalCount={totalCount}
          potSlug={slug}
        />

        {totalPages > 1 ? (
          <nav
            className="mt-6 flex max-w-2xl items-center justify-between gap-3 border-t border-pvn-navy/10 pt-5 sm:gap-4 sm:pt-6"
            aria-label="Comments pagination"
          >
            {currentPage > 1 ? (
              <Link
                href={`/pots/${slug}?page=${currentPage - 1}#messages`}
                className="font-nav inline-flex min-h-10 items-center gap-2 border border-pvn-navy/15 px-3.5 py-2.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold sm:px-4"
              >
                <span aria-hidden>←</span> Newer
              </Link>
            ) : (
              <span className="min-w-0 flex-1 sm:flex-none" />
            )}
            <span className="font-nav shrink-0 text-center text-[0.7rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase sm:text-xs">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link
                href={`/pots/${slug}?page=${currentPage + 1}#messages`}
                className="font-nav inline-flex min-h-10 items-center gap-2 border border-pvn-navy/15 px-3.5 py-2.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold sm:px-4"
              >
                Older <span aria-hidden>→</span>
              </Link>
            ) : (
              <span className="min-w-0 flex-1 sm:flex-none" />
            )}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

export function PotCommentsFallback() {
  return (
    <section
      className="border-t border-pvn-navy/10 bg-pvn-cream py-10 sm:py-14"
      aria-busy="true"
      aria-label="Loading messages"
    >
      <div className="mx-auto max-w-6xl space-y-4 px-4 sm:px-6">
        <div className="h-3 w-28 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-8 w-48 animate-pulse rounded-sm bg-pvn-navy/15" />
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-sm border border-pvn-navy/8 bg-white"
          />
        ))}
      </div>
    </section>
  );
}

export async function PotMorePotsSection({ excludeSlug }: { excludeSlug: string }) {
  let pots: Awaited<ReturnType<typeof getOtherPotsCached>> = [];
  try {
    pots = await getOtherPotsCached(excludeSlug);
  } catch {
    pots = [];
  }
  return <PotMorePots pots={pots} />;
}

export function PotMorePotsFallback() {
  return (
    <section
      className="border-t border-pvn-navy/10 bg-pvn-cream py-10 sm:py-12"
      aria-busy="true"
      aria-label="Loading other pots"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-3 w-36 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="mt-2 h-8 w-56 animate-pulse rounded-sm bg-pvn-navy/15" />
      </div>
      <div className="mt-6 flex gap-4 overflow-hidden px-4 py-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-64 w-64 shrink-0 animate-pulse rounded-sm border border-pvn-navy/10 bg-white"
          />
        ))}
      </div>
    </section>
  );
}
