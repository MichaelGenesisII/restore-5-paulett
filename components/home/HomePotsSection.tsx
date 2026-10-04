import { HomePots } from "@/components/home/HomePots";
import { getHomePotsCached } from "@/lib/home-pots";

/** Streams below the fold — Suspense fallback only flashes on a cold cache. */
export async function HomePotsSection() {
  const pots = await getHomePotsCached().catch(() => []);
  return <HomePots pots={pots} />;
}

/** Lightweight navy shell + horizontal pulse tiles — matches the live section. */
export function HomePotsFallback() {
  return (
    <section
      id="pots"
      className="relative overflow-hidden bg-pvn-navy py-14 text-pvn-cream sm:py-16"
      aria-busy="true"
      aria-label="Loading pots"
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-xl">
          <div className="h-3 w-40 animate-pulse rounded-sm bg-pvn-cream/15" />
          <div className="mt-3 h-9 w-64 max-w-full animate-pulse rounded-sm bg-pvn-cream/20" />
          <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
        </div>
      </div>

      <div className="relative mt-6 overflow-hidden py-4">
        <div className="flex w-max flex-nowrap gap-4 px-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-[17.5rem] w-[16rem] shrink-0 animate-pulse border border-pvn-cream/10 bg-pvn-cream/[0.06] sm:w-[18rem]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
