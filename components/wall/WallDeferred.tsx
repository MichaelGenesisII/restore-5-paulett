import Link from "next/link";
import { formatWholeGbp } from "@/lib/money";
import {
  getWallMetricsCached,
  getWallPageCached,
  type WallMetrics,
  type WallPageData,
} from "@/lib/wall";

export async function WallMetricsStrip() {
  let metrics: WallMetrics = {
    totalCount: 0,
    directGifts: 0,
    houseRaised: 0,
  };
  try {
    metrics = await getWallMetricsCached();
  } catch {
    // empty metrics
  }

  const { totalCount, directGifts, houseRaised } = metrics;

  return (
    <section
      className="border-b border-pvn-navy/10 bg-pvn-cream"
      aria-label="Wall progress"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-3 gap-2.5 px-4 py-4 sm:gap-4 sm:px-6 sm:py-6">
        <div className="min-w-0 rounded-sm border border-pvn-navy/10 bg-white px-2.5 py-3.5 text-center shadow-[0_14px_32px_-20px_rgba(12,27,51,0.45)] sm:px-5 sm:py-5">
          <p className="font-nav text-[0.5rem] font-bold tracking-[0.12em] text-pvn-gold uppercase sm:text-[0.6rem] sm:tracking-[0.16em]">
            Stones
          </p>
          <p className="font-display mt-1 text-xl font-semibold tabular-nums text-pvn-navy sm:text-3xl">
            {totalCount}
          </p>
        </div>
        <div className="min-w-0 rounded-sm border border-pvn-navy/10 bg-white px-2.5 py-3.5 text-center shadow-[0_14px_32px_-20px_rgba(12,27,51,0.45)] sm:px-5 sm:py-5">
          <p className="font-nav text-[0.5rem] font-bold tracking-[0.12em] text-pvn-gold uppercase sm:text-[0.6rem] sm:tracking-[0.16em]">
            Direct gifts
          </p>
          <p className="font-display mt-1 text-xl font-semibold tabular-nums text-pvn-navy sm:text-3xl">
            {directGifts}
          </p>
        </div>
        <div className="min-w-0 rounded-sm border border-pvn-navy/10 bg-white px-2.5 py-3.5 text-center shadow-[0_14px_32px_-20px_rgba(12,27,51,0.45)] sm:px-5 sm:py-5">
          <p className="font-nav text-[0.5rem] leading-snug font-bold tracking-[0.12em] text-pvn-gold uppercase sm:text-[0.6rem] sm:tracking-[0.16em]">
            <span className="sm:hidden">Raised</span>
            <span className="hidden sm:inline">Given to the house</span>
          </p>
          <p className="font-display mt-1 truncate text-xl font-semibold tabular-nums text-pvn-navy sm:text-3xl">
            {formatWholeGbp(houseRaised)}
          </p>
        </div>
      </div>
    </section>
  );
}

export function WallMetricsFallback() {
  return (
    <section
      className="border-b border-pvn-navy/10 bg-pvn-cream"
      aria-busy="true"
      aria-label="Loading wall progress"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-3 gap-2.5 px-4 py-4 sm:gap-4 sm:px-6 sm:py-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-[4.75rem] animate-pulse rounded-sm border border-pvn-navy/10 bg-white sm:h-[5.5rem]"
          />
        ))}
      </div>
    </section>
  );
}

export async function WallStonesSection({ page }: { page: number }) {
  let data: WallPageData = {
    stones: [],
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
  };
  try {
    data = await getWallPageCached(page);
  } catch {
    // empty wall
  }

  const { stones, totalCount, totalPages, currentPage } = data;

  return (
    <section
      id="stones"
      className="scroll-mt-24 bg-pvn-cream py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
            Laid with gifts
          </p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-pvn-navy sm:text-4xl">
            {totalCount === 0
              ? "The first stone is waiting"
              : `${totalCount} ${totalCount === 1 ? "stone" : "stones"} in the wall`}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-pvn-navy/60 sm:text-base">
            Words from{" "}
            <Link
              href="/give"
              className="text-pvn-navy underline decoration-pvn-gold/50 underline-offset-2 transition hover:text-pvn-gold"
            >
              Give now
            </Link>{" "}
            come first. Recent messages from pots follow — each pot still keeps
            its full conversation on its own page.
          </p>
        </div>

        {stones.length === 0 ? (
          <div className="relative mt-12 overflow-hidden border border-dashed border-pvn-navy/20 bg-white/40 px-6 py-16 text-center sm:mt-14 sm:px-10">
            <p className="font-display relative text-2xl font-semibold text-pvn-navy italic sm:text-3xl">
              No words yet — only bare stone.
            </p>
            <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-pvn-navy/60">
              When someone gives to the house — or through a pot — and leaves a
              sentence, a verse, or a memory, it will be set here.
            </p>
            <Link
              href="/give"
              className="font-nav relative mt-8 inline-flex min-h-12 items-center justify-center rounded-md bg-pvn-gold px-6 text-xs font-bold tracking-[0.16em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Be the first stone
            </Link>
          </div>
        ) : (
          <>
            <ul className="the-wall-grid mt-10 sm:mt-12">
              {stones.map((stone, index) => {
                const name =
                  stone.isAnonymous || !stone.donorName?.trim()
                    ? "Anonymous"
                    : stone.donorName.trim();
                const when = new Date(stone.createdAt).toLocaleDateString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                );
                const stagger = index % 3;
                const href =
                  stone.source === "pot" && stone.pot
                    ? `/pots/${stone.pot.slug}`
                    : "/give";
                const ariaLabel =
                  stone.source === "pot" && stone.pot
                    ? `Open ${stone.pot.title} pot`
                    : "Give to the house";

                return (
                  <li
                    key={stone.id}
                    className={`${
                      stagger === 1
                        ? "sm:mt-6"
                        : stagger === 2
                          ? "sm:mt-3"
                          : ""
                    }`}
                    style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                  >
                    <Link
                      href={href}
                      aria-label={ariaLabel}
                      className="the-wall-stone group relative flex h-full flex-col overflow-hidden border border-pvn-navy/10 bg-white/70 p-5 transition duration-300 ease-out hover:-translate-y-1 hover:border-pvn-gold/50 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pvn-gold focus-visible:ring-offset-2 sm:p-6"
                    >
                      <span className="the-wall-stone-bar" aria-hidden />
                      <span className="the-wall-stone-sheen" aria-hidden />
                      {stone.source === "pot" && stone.pot ? (
                        <p className="font-nav relative mb-3 text-[0.6rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                          via {stone.pot.title} pot
                        </p>
                      ) : (
                        <p className="font-nav relative mb-3 text-[0.6rem] font-bold tracking-[0.16em] text-pvn-navy/35 uppercase">
                          Direct gift
                        </p>
                      )}
                      <p className="the-wall-stone-quote font-display relative text-lg leading-snug text-pvn-navy/85 text-pretty italic whitespace-pre-wrap sm:text-xl">
                        “{stone.message}”
                      </p>
                      <div className="the-wall-stone-meta relative mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-5">
                        <p className="text-sm font-semibold text-pvn-navy">
                          {name}
                          <span className="the-wall-stone-amount font-normal text-pvn-navy/40">
                            {" "}
                            · {formatWholeGbp(stone.amount)}
                          </span>
                        </p>
                        <p className="the-wall-stone-when font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase">
                          {when}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 ? (
              <nav
                className="mt-10 flex items-center justify-between gap-3 border-t border-pvn-navy/10 pt-6 sm:mt-12"
                aria-label="The Wall pagination"
              >
                {currentPage > 1 ? (
                  <Link
                    href={
                      currentPage === 2
                        ? "/the-wall#stones"
                        : `/the-wall?page=${currentPage - 1}#stones`
                    }
                    className="font-nav inline-flex min-h-11 items-center gap-2 border border-pvn-navy/15 px-3.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
                  >
                    <span aria-hidden>←</span> Newer
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 sm:flex-none" />
                )}
                <span className="font-nav shrink-0 text-center text-[0.7rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Link
                    href={`/the-wall?page=${currentPage + 1}#stones`}
                    className="font-nav inline-flex min-h-11 items-center gap-2 border border-pvn-navy/15 px-3.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
                  >
                    Older <span aria-hidden>→</span>
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 sm:flex-none" />
                )}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export function WallStonesFallback() {
  return (
    <section
      id="stones"
      className="scroll-mt-24 bg-pvn-cream py-12 sm:py-16"
      aria-busy="true"
      aria-label="Loading stones"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-3 w-28 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="mt-2 h-9 w-64 max-w-full animate-pulse rounded-sm bg-pvn-navy/15" />
        <div className="the-wall-grid mt-10 sm:mt-12">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse border border-pvn-navy/10 bg-white/70"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
