import Link from "next/link";
import { formatWholeGbp } from "@/lib/money";

const opens = [
  {
    title: "A sound hall",
    body: "Roof, walls, damp and weatherproofing — so the room can be used again.",
  },
  {
    title: "Safe services",
    body: "Electrics, heating, plumbing and fire safety. Mostly hidden from view, all essential.",
  },
  {
    title: "A way in",
    body: "Clearer entrances, toilets and a proper welcome for everyone who walks through the door.",
  },
  {
    title: "Rooms that work",
    body: "Space fitted for worship, children, training and community use.",
  },
] as const;

/**
 * The campaign is staged: the live building-fund target is the current
 * phase's goal, so this section and the hero always quote the same figure.
 */
export function HomePhase({
  raised,
  target,
}: {
  raised: number;
  target: number;
}) {
  const started = raised > 0;
  const exactPct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;
  const pct = Math.round(exactPct);
  const pctLabel = started && pct === 0 ? "<1%" : `${pct}%`;
  const railPct = started ? Math.max(exactPct, 1.2) : 0;
  const goal = formatWholeGbp(target);

  return (
    <section
      id="phase-one"
      aria-labelledby="phase-heading"
      className="relative scroll-mt-28 border-t border-pvn-navy/5 bg-pvn-cream py-12 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* The road: two stops, the first one lit. */}
        <ol
          className="mx-auto flex max-w-xl items-start"
          aria-label="Restoration phases"
        >
          <li className="relative flex flex-1 flex-col items-center text-center">
            <span
              className="absolute top-[0.6rem] left-1/2 h-0.5 w-full bg-gradient-to-r from-pvn-gold to-pvn-navy/15"
              aria-hidden
            />
            <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-pvn-gold ring-4 ring-pvn-gold/25">
              <span className="h-1.5 w-1.5 rounded-full bg-pvn-navy" />
            </span>
            <span className="font-nav mt-3 text-[0.6rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
              Phase one · now
            </span>
            <span className="font-nav mt-1 text-xs font-bold tracking-[0.08em] text-pvn-navy uppercase sm:text-sm">
              Open the hall
            </span>
          </li>
          <li className="relative flex flex-1 flex-col items-center text-center">
            <span className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-pvn-navy/25 bg-pvn-cream" />
            <span className="font-nav mt-3 text-[0.6rem] font-bold tracking-[0.2em] text-pvn-navy/45 uppercase">
              Phase two · next
            </span>
            <span className="font-nav mt-1 text-xs font-bold tracking-[0.08em] text-pvn-navy/60 uppercase sm:text-sm">
              Investigate the church
            </span>
          </li>
        </ol>

        <div className="mt-10 grid gap-10 sm:mt-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="font-nav text-[0.65rem] font-semibold tracking-[0.2em] text-pvn-gold uppercase sm:text-xs sm:tracking-[0.28em]">
              Where your gift goes now
            </p>
            <h2
              id="phase-heading"
              className="font-display mt-3 text-[1.85rem] leading-[1.1] font-semibold text-balance text-pvn-navy sm:text-4xl sm:leading-tight lg:text-5xl"
            >
              First, we open the hall.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[0.95rem] leading-relaxed text-pretty text-pvn-navy/75 sm:text-lg lg:mx-0">
              We are restoring 5 Paulett in stages. Phase one raises{" "}
              <strong className="font-semibold text-pvn-navy">{goal}</strong>{" "}
              to make the hall safe, warm and ready for worship and community
              use — so the doors can open while the bigger work is planned.
            </p>

            <div className="mx-auto mt-7 max-w-md rounded-sm border-l-4 border-pvn-gold bg-white/60 p-5 text-left shadow-[0_18px_40px_-30px_rgba(12,27,51,0.45)] lg:mx-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-nav text-2xl font-bold tracking-tight text-pvn-navy sm:text-3xl">
                  {started ? formatWholeGbp(raised) : goal}
                </p>
                <p className="font-nav text-right text-[0.6rem] font-semibold tracking-[0.16em] text-pvn-navy/55 uppercase">
                  {started ? `raised of ${goal}` : "phase one goal"}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-pvn-navy/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pvn-gold to-pvn-gold-light"
                    style={{ width: `${railPct}%` }}
                  />
                </div>
                <span className="font-nav text-sm font-semibold text-pvn-navy">
                  {pctLabel}
                </span>
              </div>
              <Link
                href="/give"
                className="font-nav mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-pvn-navy px-6 text-xs font-bold tracking-[0.16em] text-pvn-cream uppercase transition hover:bg-pvn-navy-light"
              >
                Give to phase one
              </Link>
            </div>
          </div>

          <div>
            <p className="font-nav text-center text-[0.65rem] font-bold tracking-[0.2em] text-pvn-navy/50 uppercase lg:text-left">
              What {goal} opens
            </p>
            <ol className="mt-4 divide-y divide-pvn-navy/10 border-y border-pvn-navy/10">
              {opens.map((item, i) => (
                <li key={item.title} className="flex gap-4 py-4 sm:gap-5 sm:py-5">
                  <span className="font-display w-8 shrink-0 text-2xl leading-none font-semibold text-pvn-gold tabular-nums sm:text-3xl">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-nav text-[0.8rem] font-bold tracking-[0.12em] text-pvn-navy uppercase sm:text-sm">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[0.85rem] leading-relaxed text-pretty text-pvn-navy/70 sm:text-sm">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex gap-4 rounded-sm bg-pvn-navy/[0.04] p-4 sm:p-5">
              <span
                className="font-nav mt-0.5 shrink-0 rounded-sm border border-pvn-navy/20 px-2 py-1 text-[0.55rem] font-bold tracking-[0.16em] text-pvn-navy/55 uppercase"
              >
                Then
              </span>
              <p className="text-[0.85rem] leading-relaxed text-pretty text-pvn-navy/70 sm:text-sm">
                <strong className="font-semibold text-pvn-navy">
                  Phase two investigates the main church
                </strong>{" "}
                — surveys and design, so its restoration is understood before
                the work begins.
              </p>
            </div>
          </div>
        </div>

        <p className="font-nav mt-10 text-center text-[0.65rem] font-semibold tracking-[0.24em] text-pvn-navy/45 uppercase sm:mt-12">
          Every gift, in every fundraiser, goes to the same hall
        </p>
      </div>
    </section>
  );
}
