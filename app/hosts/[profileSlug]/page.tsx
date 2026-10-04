import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HostProfileShare } from "@/components/hosts/HostProfileShare";
import { IconHeart } from "@/components/icons";
import { PotCard } from "@/components/PotCard";
import { Pagination } from "@/components/Pagination";
import { POTS_PER_PAGE } from "@/lib/fundraisers-pots";
import { formatWholeGbp } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ profileSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { profileSlug } = await params;
  const host = await prisma.fundraiser.findFirst({
    where: { profileSlug, profilePublic: true },
    select: { name: true, bio: true, photoUrl: true },
  });
  if (!host) {
    return { title: "Host", robots: { index: false, follow: false } };
  }
  const description =
    host.bio?.trim().slice(0, 140) ||
    `Fundraisers hosted by ${host.name} for the restoration of 5 Paulett Avenue.`;
  const path = `/hosts/${profileSlug}`;
  return {
    title: host.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: host.name,
      description,
      url: path,
      ...(host.photoUrl
        ? { images: [{ url: host.photoUrl, alt: host.name }] }
        : {}),
    },
    twitter: {
      card: host.photoUrl ? "summary_large_image" : "summary",
      title: host.name,
      description,
      ...(host.photoUrl ? { images: [host.photoUrl] } : {}),
    },
  };
}

const sincePattern = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

function alumniLine(host: {
  alumniYearsFrom: number | null;
  alumniYearsTo: number | null;
  alumniCity: string | null;
  alumniCountry: string | null;
}) {
  const years =
    host.alumniYearsFrom && host.alumniYearsTo
      ? `${host.alumniYearsFrom}–${host.alumniYearsTo}`
      : (host.alumniYearsFrom ?? host.alumniYearsTo)?.toString();
  const place = [host.alumniCity, host.alumniCountry]
    .filter(Boolean)
    .join(", ");
  return ["PVN alumni", years, place].filter(Boolean).join(" · ");
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 px-3 py-4 text-center sm:px-6 sm:py-5">
      <p className="font-display truncate text-2xl leading-none font-semibold text-pvn-cream sm:text-3xl">
        {value}
      </p>
      <p
        className="font-nav mt-2 truncate text-[0.6rem] font-bold tracking-[0.16em] text-pvn-gold-light uppercase sm:text-[0.65rem]"
        title={label}
      >
        {label}
      </p>
    </div>
  );
}

export default async function HostPublicProfilePage({
  params,
  searchParams,
}: Props & { searchParams: Promise<{ page?: string }> }) {
  const [{ profileSlug }, query] = await Promise.all([params, searchParams]);
  const requestedPage = Math.max(
    1,
    Number.parseInt(query.page ?? "1", 10) || 1,
  );
  const host = await prisma.fundraiser.findFirst({
    where: { profileSlug, profilePublic: true },
    select: {
      id: true,
      name: true,
      bio: true,
      photoUrl: true,
      profileSlug: true,
      createdAt: true,
      isAlumni: true,
      alumniYearsFrom: true,
      alumniYearsTo: true,
      alumniCity: true,
      alumniCountry: true,
    },
  });

  if (!host) notFound();

  const liveWhere = { fundraiserId: host.id, status: "ACTIVE" as const };
  const [impact, livePots] = await Promise.all([
    // Impact counts finished pots too, not just the ones still open.
    prisma.pot.aggregate({
      where: { fundraiserId: host.id, status: { in: ["ACTIVE", "CLOSED"] } },
      _sum: { totalRaised: true, donorCount: true },
    }),
    prisma.pot.count({ where: liveWhere }),
  ]);
  const raised = impact._sum.totalRaised ?? 0;
  const gifts = impact._sum.donorCount ?? 0;

  const totalPages = Math.max(1, Math.ceil(livePots / POTS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pots = await prisma.pot.findMany({
    where: liveWhere,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (currentPage - 1) * POTS_PER_PAGE,
    take: POTS_PER_PAGE,
    select: {
      slug: true,
      title: true,
      story: true,
      type: true,
      totalRaised: true,
      targetAmount: true,
      donorCount: true,
      photoUrl: true,
    },
  });

  const firstName = host.name.split(/\s+/)[0];
  const initial = host.name.trim().charAt(0).toUpperCase();
  const profilePath = `/hosts/${profileSlug}`;

  return (
    <main className="w-full bg-pvn-cream">
      <section className="relative -mt-[4.75rem] overflow-hidden bg-pvn-navy pt-[8.25rem] pb-12 text-pvn-cream sm:pb-16">
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
          className="pointer-events-none absolute inset-x-0 top-0 h-[24rem]"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.18), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
            <div className="relative shrink-0">
              <span
                className="absolute -inset-2 rounded-full border border-pvn-gold/35"
                aria-hidden
              />
              <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-pvn-gold font-display text-5xl font-semibold text-pvn-navy shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65)] ring-4 ring-pvn-gold sm:h-36 sm:w-36 sm:text-6xl">
                {host.photoUrl ? (
                  <Image
                    src={host.photoUrl}
                    alt=""
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 640px) 112px, 144px"
                  />
                ) : (
                  initial
                )}
              </div>
            </div>

            <div className="mt-6 min-w-0 sm:mt-0">
              <p className="font-nav flex items-center justify-center gap-2.5 text-xs font-semibold tracking-[0.28em] text-pvn-gold-light uppercase sm:justify-start">
                <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
                Host
              </p>
              <h1 className="font-display mt-2 text-4xl leading-[1.05] font-semibold text-balance text-pvn-cream sm:text-5xl">
                {host.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {host.isAlumni ? (
                  <span className="font-nav inline-flex items-center gap-1.5 rounded-full border border-pvn-gold/50 bg-pvn-gold/10 px-3 py-1 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold-light uppercase">
                    <span
                      className="h-1 w-1 rotate-45 bg-pvn-gold"
                      aria-hidden
                    />
                    {alumniLine(host)}
                  </span>
                ) : null}
                <span className="font-nav text-[0.65rem] font-semibold tracking-[0.14em] text-pvn-cream/60 uppercase">
                  Hosting since {sincePattern.format(host.createdAt)}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                {livePots > 0 ? (
                  <Link
                    href="#pots"
                    className="font-nav inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.16em] text-pvn-navy uppercase shadow-[0_10px_24px_-10px_rgba(201,168,76,0.8)] transition hover:bg-pvn-gold-light active:scale-[0.97]"
                  >
                    <IconHeart className="h-4 w-4" />
                    Give to {livePots === 1 ? "this fundraiser" : "a fundraiser"}
                  </Link>
                ) : null}
                {host.profileSlug ? (
                  <HostProfileShare
                    name={host.name}
                    profileSlug={host.profileSlug}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 divide-x divide-pvn-cream/12 overflow-hidden rounded-xl border border-pvn-gold/30 bg-pvn-cream/[0.04] backdrop-blur-sm sm:mt-12">
            <Stat value={formatWholeGbp(raised)} label="Raised" />
            <Stat value={gifts.toLocaleString("en-GB")} label={gifts === 1 ? "Gift" : "Gifts"} />
            <Stat
              value={livePots.toString()}
              label={livePots === 1 ? "Live fundraiser" : "Live fundraisers"}
            />
          </div>
        </div>
      </section>

      {host.bio ? (
        <section className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
          <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
            About {firstName}
          </p>
          <blockquote className="relative mt-4 border-l-2 border-pvn-gold pl-5 sm:pl-6">
            <p className="font-display text-xl leading-relaxed whitespace-pre-wrap text-pvn-navy/85 text-pretty sm:text-2xl">
              {host.bio}
            </p>
          </blockquote>
        </section>
      ) : null}

      <section
        id="pots"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-20"
      >
        <div className="flex items-end justify-between gap-4 border-b border-pvn-navy/10 pb-4">
          <div>
            <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
              Hosted by {firstName}
            </p>
            <h2 className="font-display mt-1 text-3xl font-semibold text-pvn-navy">
              Live fundraisers
            </h2>
          </div>
          {livePots > 0 ? (
            <span className="font-nav mb-1 text-[0.7rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
              {livePots} open
            </span>
          ) : null}
        </div>

        {livePots === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-pvn-navy/15 bg-white/50 px-6 py-12 text-center">
            <span className="h-2 w-2 rotate-45 bg-pvn-gold" aria-hidden />
            <p className="font-display mt-4 text-xl font-semibold text-pvn-navy">
              No live fundraisers just now
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
              {firstName}&apos;s fundraisers have closed, but the restoration
              goes on. Find another fundraiser to give to.
            </p>
            <Link
              href="/fundraisers"
              className="font-nav mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-navy px-5 text-xs font-bold tracking-[0.16em] text-pvn-cream uppercase transition hover:bg-pvn-navy-light active:scale-[0.97]"
            >
              Browse all fundraisers
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {pots.map((pot) => (
                <li key={pot.slug}>
                  <PotCard pot={{ ...pot, fundraiser: { name: host.name } }} />
                </li>
              ))}
            </ul>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              label={`${firstName}'s fundraisers pagination`}
              hrefFor={(p) =>
                `${p > 1 ? `${profilePath}?page=${p}` : profilePath}#pots`
              }
            />
          </>
        )}
      </section>
    </main>
  );
}
