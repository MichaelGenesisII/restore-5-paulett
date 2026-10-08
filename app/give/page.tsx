import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutCancelNotifier } from "@/components/give/CheckoutCancelNotifier";
import { GiveForm } from "@/components/give/GiveForm";
import { GiveProcessing } from "@/components/give/GiveStatus";
import { IconHeart, IconHouse, IconPeople, IconWall } from "@/components/icons";
import { DEFAULT_BUILDING_FUND_TARGET_PENCE } from "@/lib/constants";
import { parseAmountParam } from "@/lib/give-draft";
import { formatWholeGbp, percentOf } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Give now",
  description:
    "Give to the restoration of 5 Paulett Avenue. One gift, or every month. Gift Aid adds 25% at no cost to you.",
  alternates: { canonical: "/give" },
  openGraph: {
    title: "Give now",
    description:
      "Give to the restoration of 5 Paulett Avenue. One gift, or every month. Gift Aid adds 25%.",
    url: "/give",
  },
};

/** Compact trust facts — sit beside the form, not above it. */
const trustPoints = [
  {
    Icon: IconWall,
    title: "One restoration fund",
    body: "Direct gifts and fundraisers land in the same house.",
  },
  {
    Icon: IconHouse,
    title: "Gift Aid adds 25%",
    body: "At no extra cost to you, if you are a UK taxpayer.",
  },
  {
    Icon: IconPeople,
    title: "Progress you can watch",
    body: "Honest figures and updates as the fabric rises.",
  },
  {
    Icon: IconHeart,
    title: "You will see what it bought",
    body: "Photographs and milestones as the stonework rises again.",
  },
] as const;

export default async function GivePage({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string;
    session_id?: string;
    donation_id?: string;
    amount?: string;
  }>;
}) {
  const query = await searchParams;
  let target = DEFAULT_BUILDING_FUND_TARGET_PENCE;
  let raised = 0;

  try {
    const fund = await prisma.buildingFund.findUnique({ where: { id: 1 } });
    target = fund?.targetAmount ?? DEFAULT_BUILDING_FUND_TARGET_PENCE;
    raised = fund?.totalRaised ?? 0;
  } catch {
    // Database unreachable — still show the give form with defaults.
  }

  const started = raised > 0;
  const exactPct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;
  const pct = percentOf(raised, target);
  // A real gift can round to 0% early on. Say "<1%" and keep a sliver of gold
  // rather than showing an empty rail beside a live total.
  const pctLabel = started && pct === 0 ? "<1%" : `${pct}%`;
  const railPct = started ? Math.max(exactPct, 1.2) : 0;

  const processing = query.checkout === "processing" && query.session_id;

  return (
    <main className="w-full">
      {/* 1. Hero */}
      <section
        className="relative isolate -mt-[4.75rem] overflow-hidden bg-pvn-navy pt-[calc(4.75rem+3.5rem)] pb-12 text-pvn-cream sm:pb-14"
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

        <div className="relative mx-auto max-w-3xl px-4 pb-2 text-center sm:px-6 sm:pb-4 lg:pb-6">
          <p className="font-nav inline-flex items-center justify-center gap-2 text-[0.65rem] font-semibold tracking-[0.2em] text-pvn-gold-light uppercase sm:gap-2.5 sm:text-xs sm:tracking-[0.28em]">
            <span
              className="h-1.5 w-1.5 shrink-0 rotate-45 bg-pvn-gold"
              aria-hidden
            />
            Take your part of the wall
          </p>
          <h1 className="font-nav mt-2.5 text-[2.35rem] leading-[0.95] font-bold tracking-tight text-pvn-cream uppercase sm:mt-3 sm:text-5xl lg:text-6xl xl:text-7xl">
            Give to the
            <span className="block text-pvn-gold">restoration</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty text-pvn-cream/85 sm:mt-5 sm:max-w-xl sm:text-base lg:text-lg">
            <span className="sm:hidden">
              The keys are ours. The roof is not. Your gift goes straight into
              the fabric of the building.
            </span>
            <span className="hidden sm:inline">
              We prayed for a home. God opened the door. The keys are ours and
              the roof is not. What you give here goes straight into the fabric
              of the building.
            </span>
          </p>
        </div>
      </section>

      {/* 2. Live total — compact strip so the form stays close */}
      <section
        id="live-total"
        className="border-t border-pvn-navy/5 bg-pvn-cream py-5 sm:py-6"
        aria-label="Campaign total"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 rounded-sm border border-pvn-navy/10 bg-white/70 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5">
            <div className="shrink-0 sm:min-w-[11rem]">
              <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                Live total
              </p>
              <p className="font-nav mt-1 text-2xl font-bold tracking-tight text-pvn-navy sm:text-3xl">
                {started ? formatWholeGbp(raised) : formatWholeGbp(target)}
              </p>
              <p className="font-nav mt-0.5 text-[0.65rem] tracking-[0.14em] text-pvn-navy/50 uppercase">
                {started
                  ? `of ${formatWholeGbp(target)} · phase one`
                  : "phase one goal"}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-pvn-navy/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pvn-gold to-pvn-gold-light"
                    style={{ width: `${railPct}%` }}
                  />
                </div>
                <span className="font-nav shrink-0 text-sm font-semibold text-pvn-navy">
                  {started ? pctLabel : "0%"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-snug text-pvn-navy/55 sm:text-sm">
                {started
                  ? "Already given — one fund, seven areas of the fabric."
                  : "Nothing given yet. The first gift starts the thermometer."}
                <span className="hidden sm:inline">
                  {" "}
                  Gift Aid can add 25%.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Form */}
      <section className="border-t border-pvn-navy/5 bg-pvn-cream pt-8 pb-14 sm:pt-10 sm:pb-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-14">
          <div className="flex flex-col gap-6">
            <header>
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                Give now
              </p>
              <h2 className="font-display mt-2 text-3xl leading-none font-semibold tracking-tight text-pvn-navy sm:text-4xl">
                Your gift
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-pvn-navy/65">
                One gift, or every month. Finish on Stripe — we never see your
                card.
              </p>
            </header>

            {processing && query.session_id ? (
              <GiveProcessing sessionId={query.session_id} />
            ) : null}

            {query.checkout === "cancelled" ? (
              <CheckoutCancelNotifier donationId={query.donation_id} />
            ) : null}

            <GiveForm
              initialAmountPence={parseAmountParam(query.amount)}
              resume={
                query.checkout === "cancelled"
                  ? "cancelled"
                  : query.checkout === "failed"
                    ? "failed"
                    : undefined
              }
            />
          </div>

          <aside className="flex flex-col gap-6 lg:pt-1">
            <div className="rounded-sm border border-pvn-navy/10 bg-white/60 p-5 sm:p-6">
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                Before you give
              </p>
              <ul className="mt-4 space-y-4">
                {trustPoints.map(({ Icon, title, body }) => (
                  <li key={title} className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-pvn-gold/10 text-pvn-gold"
                      aria-hidden
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-nav text-xs font-bold tracking-[0.12em] text-pvn-navy uppercase">
                        {title}
                      </p>
                      <p className="mt-1 text-sm leading-snug text-pvn-navy/65">
                        {body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-sm border border-pvn-navy/10 bg-white/60 p-5 sm:p-6">
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                Words with gifts
              </p>
              <p className="mt-3 text-sm leading-relaxed text-pvn-navy/70">
                Leave a sentence when you give — it is set on{" "}
                <span className="font-semibold text-pvn-navy">The Wall</span>, a
                living guestbook for gifts to the house.
              </p>
              <Link
                href="/the-wall"
                className="font-nav mt-5 inline-flex min-h-11 items-center rounded-md border border-pvn-navy/20 px-5 text-xs font-bold uppercase tracking-[0.14em] text-pvn-navy transition hover:border-pvn-gold hover:text-pvn-gold"
              >
                Visit The Wall
              </Link>
            </div>

            <div className="rounded-sm border border-pvn-gold/40 bg-pvn-gold/10 p-5 sm:p-6">
              <p className="font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-navy/70">
                Rather bring others with you?
              </p>
              <p className="mt-3 text-sm leading-relaxed text-pvn-navy/80">
                A fundraiser turns one gift into a hundred invitations. Set a target,
                tell your story, and let your circle build alongside you.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/fundraisers/create"
                  className="font-nav inline-flex min-h-11 items-center rounded-md bg-pvn-navy px-5 text-xs font-bold uppercase tracking-[0.14em] text-pvn-cream transition hover:bg-pvn-navy-light"
                >
                  Start a fundraiser
                </Link>
                <Link
                  href="/fundraisers"
                  className="font-nav inline-flex min-h-11 items-center rounded-md border border-pvn-navy/25 px-5 text-xs font-bold uppercase tracking-[0.14em] text-pvn-navy transition hover:border-pvn-gold hover:text-pvn-gold"
                >
                  Join a fundraiser
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* 4. Closing */}
      <section className="relative overflow-hidden border-t border-pvn-navy/5 bg-pvn-cream py-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/50 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <div
            className="mx-auto flex items-center justify-center gap-2"
            aria-hidden
          >
            <span className="h-px w-8 bg-pvn-gold/50" />
            <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" />
            <span className="h-px w-8 bg-pvn-gold/50" />
          </div>
          <blockquote className="mt-4">
            <p className="font-display text-2xl leading-snug text-pvn-navy italic text-pretty sm:text-3xl">
              “And they shall build the old wastes, they shall raise up the
              former desolations…”
            </p>
            <cite className="font-nav mt-4 block text-xs font-semibold uppercase not-italic tracking-[0.2em] text-pvn-navy/70">
              Isaiah 61:4
            </cite>
          </blockquote>
          <p className="font-nav mt-5 text-sm font-bold uppercase tracking-[0.2em] text-pvn-navy">
            We cannot build this alone
          </p>
        </div>
      </section>
    </main>
  );
}
