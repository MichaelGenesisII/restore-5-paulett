import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    `Pots hosted by ${host.name} for the restoration of 5 Paulett Avenue.`;
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

export default async function HostPublicProfilePage({ params }: Props) {
  const { profileSlug } = await params;
  const host = await prisma.fundraiser.findFirst({
    where: { profileSlug, profilePublic: true },
    select: {
      name: true,
      bio: true,
      photoUrl: true,
      profileSlug: true,
      pots: {
        where: { status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        select: {
          slug: true,
          title: true,
          totalRaised: true,
          targetAmount: true,
          donorCount: true,
          photoUrl: true,
        },
      },
    },
  });

  if (!host) notFound();

  return (
    <main className="min-h-[70vh] bg-pvn-cream">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
          Host
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-5">
          {host.photoUrl ? (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm">
              <Image
                src={host.photoUrl}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold text-pvn-navy sm:text-4xl">
              {host.name}
            </h1>
            {host.bio ? (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-pvn-navy/70 whitespace-pre-wrap">
                {host.bio}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-12 border-t border-pvn-navy/10 pt-8">
          <h2 className="font-display text-2xl font-semibold text-pvn-navy">
            Live pots
          </h2>
          {host.pots.length === 0 ? (
            <p className="mt-3 text-sm text-pvn-navy/55">
              No live pots just now.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {host.pots.map((pot) => (
                <li key={pot.slug}>
                  <Link
                    href={`/pots/${pot.slug}`}
                    className="flex gap-4 rounded-sm border border-pvn-navy/10 bg-white/50 p-3 transition hover:border-pvn-gold/50"
                  >
                    {pot.photoUrl ? (
                      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-sm">
                        <Image
                          src={pot.photoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold text-pvn-navy">
                        {pot.title}
                      </p>
                      <p className="mt-1 text-sm text-pvn-navy/55">
                        {formatWholeGbp(pot.totalRaised)} of{" "}
                        {formatWholeGbp(pot.targetAmount)} · {pot.donorCount}{" "}
                        {pot.donorCount === 1 ? "gift" : "gifts"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
