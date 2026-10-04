import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CheckoutCancelNotifier } from "@/components/give/CheckoutCancelNotifier";
import { GiveForm } from "@/components/give/GiveForm";
import { GiveProcessing } from "@/components/give/GiveStatus";
import { PotLifecycleNotice } from "@/components/pots/PotLifecycleNotice";
import {
  PotCommentsFallback,
  PotCommentsSection,
  PotMorePotsFallback,
  PotMorePotsSection,
} from "@/components/pots/PotPageDeferred";
import { PotShareButton } from "@/components/pots/PotShareButton";
import { PotShareCreator } from "@/components/pots/PotShareCreator";
import { HostProfileModalTrigger } from "@/components/pots/HostProfileModalTrigger";
import { PotViewTracker } from "@/components/pots/PotViewTracker";
import { formatWholeGbp, MIN_POT_SEED_PENCE, percentOf } from "@/lib/money";
import { isPubliclyVisible } from "@/lib/pot-lifecycle";
import {
  findPotSlugRedirect,
  getPublicPotCached,
} from "@/lib/pot-page";
import { potJsonLd, potPageMetadata } from "@/lib/pot-seo";
import { potTypeLabel } from "@/lib/pots";

export const dynamic = "force-dynamic";

type PotPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    checkout?: string;
    session_id?: string;
    donation_id?: string;
    page?: string;
  }>;
};

export async function generateMetadata({
  params,
}: Pick<PotPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  let pot;
  try {
    pot = await getPublicPotCached(slug);
  } catch {
    pot = null;
  }
  if (!pot || !isPubliclyVisible(pot.status)) {
    return { title: "Pot not found", robots: { index: false, follow: false } };
  }
  return potPageMetadata(pot);
}

export default async function PotPage({
  params,
  searchParams,
}: PotPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  let pot;
  try {
    pot = await getPublicPotCached(slug);
  } catch {
    pot = null;
  }

  if (!pot) {
    const redirected = await findPotSlugRedirect(slug);
    if (redirected) {
      redirect(`/pots/${redirected}`);
    }
  }

  if (!pot || !isPubliclyVisible(pot.status)) {
    notFound();
  }

  const pct = percentOf(pot.totalRaised, pot.targetAmount);
  const typeLabel = potTypeLabel(pot.type);
  const awaitingSeed = pot.status === "PENDING";
  const isPaused = pot.status === "PAUSED";
  const isClosed = pot.status === "CLOSED";
  const giftsBlocked = isPaused || isClosed;
  const description = (pot.story ?? "").trim();
  const founderStory = (pot.founderStory ?? "").trim();
  const giftWord = pot.donorCount === 1 ? "gift" : "gifts";
  const raisedLabel =
    pot.totalRaised > 0
      ? `${formatWholeGbp(pot.totalRaised)} raised`
      : "Waiting for the first gift";

  const publicHost =
    pot.fundraiser.profilePublic && pot.fundraiser.profileSlug
      ? {
          name: pot.fundraiser.name,
          bio: pot.fundraiser.bio,
          photoUrl: pot.fundraiser.photoUrl,
          profileSlug: pot.fundraiser.profileSlug,
        }
      : null;

  return (
    <main className="w-full bg-pvn-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(potJsonLd(pot)),
        }}
      />
      <PotViewTracker slug={pot.slug} />
      <section className="relative isolate -mt-[4.75rem] overflow-hidden bg-pvn-navy pt-[4.75rem] text-pvn-cream">
        <div className="absolute inset-0" aria-hidden>
          {pot.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pot.photoUrl}
              alt=""
              className="h-full w-full object-cover object-center opacity-70 [animation:pvn-kenburns_18s_ease-out_both]"
            />
          ) : (
            <div
              className="h-full w-full opacity-[0.22]"
              style={{
                backgroundImage: `
                  linear-gradient(335deg, #c9a84c 18px, transparent 18px),
                  linear-gradient(155deg, #c9a84c 18px, transparent 18px)
                `,
                backgroundSize: "44px 44px",
                backgroundPosition: "0 0, 22px 0",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-pvn-navy via-pvn-navy/50 to-transparent" />
        </div>

        {awaitingSeed ? (
          <div className="relative z-10 border-b border-pvn-gold/35 bg-pvn-navy/55 backdrop-blur-[2px]">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                Seed gift needed
              </p>
              <p className="text-sm leading-relaxed text-pvn-cream/80">
                This pot joins the wall after a first gift of{" "}
                {formatWholeGbp(MIN_POT_SEED_PENCE)} or more.
              </p>
            </div>
          </div>
        ) : null}

        {isPaused ? (
          <div className="relative z-10 border-b border-pvn-cream/20 bg-pvn-navy/60 backdrop-blur-[2px]">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                This pot is paused
              </p>
              <p className="text-sm leading-relaxed text-pvn-cream/80">
                The host has paused gifts for now. The story is still here to
                read.
              </p>
            </div>
          </div>
        ) : null}

        {isClosed ? (
          <div className="relative z-10 border-b border-pvn-cream/20 bg-pvn-navy/60 backdrop-blur-[2px]">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                This pot is closed
              </p>
              <p className="text-sm leading-relaxed text-pvn-cream/80">
                Giving has finished. Progress and messages remain as a record.
              </p>
            </div>
          </div>
        ) : null}

        <div
          className={`relative flex w-full flex-col ${
            pot.photoUrl
              ? "md:aspect-[16/9] md:min-h-[22rem] md:max-h-[min(70svh,44rem)]"
              : "md:min-h-[28rem]"
          }`}
        >
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-6 px-4 py-7 sm:gap-10 sm:px-6 sm:py-10 lg:py-12">
            <Link
              href="/fundraisers"
              className="font-nav inline-flex w-fit items-center gap-2 text-xs font-bold tracking-[0.16em] text-pvn-cream/70 uppercase transition hover:text-pvn-gold"
            >
              <span aria-hidden>←</span> All pots
            </Link>

            <div className="max-w-3xl pb-1">
              <div className="font-nav flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                {publicHost ? (
                  <HostProfileModalTrigger
                    host={publicHost}
                    className="uppercase"
                  >
                    Built by {pot.fundraiser.name}
                  </HostProfileModalTrigger>
                ) : (
                  <span>Built by {pot.fundraiser.name}</span>
                )}
                <span className="h-1 w-1 rotate-45 bg-pvn-gold/70" aria-hidden />
                <span>{typeLabel}</span>
              </div>
              <h1 className="font-display mt-3 text-[1.85rem] leading-[1.05] font-semibold tracking-tight text-balance sm:mt-4 sm:text-5xl lg:text-6xl">
                {pot.title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-pvn-cream/80 text-pretty sm:mt-4 sm:text-lg">
                Your gift through this pot counts toward the one restoration
                fund for 5 Paulett.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2.5 sm:mt-8 sm:gap-3">
                {giftsBlocked ? (
                  <a
                    href="#story"
                    className="font-nav inline-flex min-h-12 items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.16em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light sm:px-6"
                  >
                    Read the story
                  </a>
                ) : (
                  <a
                    href="#give"
                    className="font-nav inline-flex min-h-12 items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.16em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light sm:px-6"
                  >
                    {awaitingSeed ? "Open with a gift" : "Give to this pot"}
                  </a>
                )}
                <PotShareButton slug={pot.slug} title={pot.title} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-b border-pvn-navy/10 bg-pvn-cream"
        aria-label="Progress toward the pot target"
      >
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-navy/45 uppercase">
                Toward the target
              </p>
              <p className="font-display mt-1 text-2xl font-semibold text-pvn-navy sm:text-3xl">
                {raisedLabel}
              </p>
            </div>
            <p className="font-nav flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] font-bold tracking-[0.1em] text-pvn-navy/55 uppercase sm:justify-end sm:text-xs sm:tracking-[0.12em]">
              <span className="text-pvn-gold">{pct}%</span>
              <span className="text-pvn-navy/25" aria-hidden>
                ·
              </span>
              <span>
                {pot.donorCount} {giftWord}
              </span>
              <span className="text-pvn-navy/25" aria-hidden>
                ·
              </span>
              <span>Aim {formatWholeGbp(pot.targetAmount)}</span>
            </p>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-pvn-navy/10 sm:rounded-none">
            <div
              className="h-full bg-gradient-to-r from-pvn-gold to-pvn-gold-light transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max(pct, pot.totalRaised > 0 ? 1.5 : 0)}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="border-b border-pvn-navy/5 bg-pvn-cream py-10 sm:py-14 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:gap-12 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-start lg:gap-14 xl:gap-16">
          <div id="story" className="min-w-0 scroll-mt-24">
            <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
              About this pot
            </p>
            <h2 className="font-display mt-2 text-[1.75rem] font-semibold text-pvn-navy sm:text-4xl">
              The pitch
            </h2>

            <div className="mt-5 sm:mt-6">
              {description ? (
                <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-pvn-navy/75 text-pretty sm:text-lg">
                  {description}
                </p>
              ) : (
                <p className="text-[0.95rem] leading-relaxed text-pvn-navy/45 italic sm:text-lg">
                  A fuller description is still being written.
                </p>
              )}
            </div>

            {founderStory ? (
              <blockquote className="relative mt-9 border-l-[3px] border-pvn-gold pl-4 sm:mt-12 sm:pl-7">
                <div className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                  {publicHost ? (
                    <HostProfileModalTrigger
                      host={publicHost}
                      className="uppercase"
                    >
                      From {pot.fundraiser.name}
                    </HostProfileModalTrigger>
                  ) : (
                    <>From {pot.fundraiser.name}</>
                  )}
                </div>
                <p className="font-display mt-3 whitespace-pre-wrap text-lg leading-snug text-pvn-navy/80 text-pretty italic sm:text-2xl">
                  {founderStory}
                </p>
              </blockquote>
            ) : null}

            <PotShareCreator slug={pot.slug} title={pot.title} />
          </div>

          <div id="give" className="min-w-0 scroll-mt-24 lg:sticky lg:top-24">
            {query.checkout === "processing" && query.session_id ? (
              <div className="mb-5">
                <GiveProcessing sessionId={query.session_id} />
              </div>
            ) : null}
            {query.checkout === "cancelled" ? (
              <CheckoutCancelNotifier donationId={query.donation_id} />
            ) : null}
            {isPaused || isClosed ? (
              <PotLifecycleNotice status={isPaused ? "PAUSED" : "CLOSED"} />
            ) : (
              <GiveForm
                potSlug={pot.slug}
                seedRequired={awaitingSeed}
                resume={
                  query.checkout === "cancelled"
                    ? "cancelled"
                    : query.checkout === "failed"
                      ? "failed"
                      : undefined
                }
              />
            )}
          </div>
        </div>
      </section>

      <Suspense fallback={<PotCommentsFallback />}>
        <PotCommentsSection slug={pot.slug} page={page} />
      </Suspense>

      <Suspense fallback={<PotMorePotsFallback />}>
        <PotMorePotsSection excludeSlug={pot.slug} />
      </Suspense>

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

          <p className="font-nav mt-4 text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
            Your pot → our house
          </p>
          <p className="font-display mt-3 text-xl leading-snug text-pvn-navy text-pretty sm:text-2xl">
            Every gift through this pot joins the one fund for 5 Paulett.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/fundraisers"
              className="font-nav inline-flex items-center justify-center rounded-md border border-pvn-navy/25 px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold sm:text-sm"
            >
              Browse other pots
            </Link>
            <Link
              href="/fundraisers/create"
              className="font-nav inline-flex items-center justify-center rounded-md bg-pvn-gold px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light sm:text-sm"
            >
              Start your own
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
