import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArcEdge, ARC_SPACE } from "@/components/ArcEdge";
import { ContactForm } from "@/components/ContactForm";
import { IconHeart } from "@/components/icons";
import { organisation, socialLinks } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to the team behind Restore 5 Paulett — giving and Gift Aid, pots, alumni, heritage and community, or press.",
  alternates: { canonical: "/contact" },
};

/**
 * Distance from left/right edge.
 * `0` = flush; positive = inset; negative = past edge.
 */
const FLOWER_EDGE_INSET = {
  mobile: "0px",
  desktop: "60px",
} as const;

export default function ContactPage() {
  return (
    <main className="w-full">
      <section
        className="relative isolate -mt-[4.75rem] overflow-hidden bg-pvn-navy pt-[calc(4.75rem+3.5rem)] text-pvn-cream"
        style={{ paddingBottom: `${ARC_SPACE}px` }}
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
          className="pointer-events-none absolute inset-x-0 top-0 h-[20rem]"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.16), transparent 70%)",
          }}
        />

        <ArcEdge side="bottom" />

        <div className="relative mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <p className="font-nav flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
            <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
            Get in touch
          </p>
          <h1 className="font-nav mt-3 text-4xl font-bold uppercase leading-[0.95] tracking-tight text-pvn-cream sm:text-5xl lg:text-6xl">
            Talk to us
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-pvn-cream/80 text-pretty sm:text-lg">
            Whether you are giving, building a pot, coming back after years
            away, or simply curious about the building on the corner — there is
            someone here to answer you.
          </p>
        </div>
      </section>

      <section className="border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
          <div>
            <p className="font-nav text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
              Send a message
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight text-pvn-navy sm:text-4xl">
              Tell us what you need
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-pvn-navy/75 text-pretty">
              Choose what your message is about and it reaches the person who
              handles it. Every field below is short on purpose.
            </p>

            <div className="mt-8">
              <ContactForm />
            </div>
          </div>

          <div className="relative h-fit overflow-hidden rounded-sm bg-pvn-navy p-6 text-pvn-cream shadow-[0_22px_50px_-26px_rgba(12,27,51,0.6)] sm:p-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              aria-hidden
              style={{
                backgroundImage: `
                  linear-gradient(335deg, #c9a84c 18px, transparent 18px),
                  linear-gradient(155deg, #c9a84c 18px, transparent 18px)
                `,
                backgroundSize: "46px 46px",
                backgroundPosition: "0 0, 23px 0",
              }}
            />

            <div className="relative flex flex-col gap-7">
              <div>
                <p className="font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-gold">
                  Our address
                </p>
                <address className="mt-3 text-sm leading-relaxed text-pvn-cream/75 not-italic">
                  <span className="font-nav block text-xs font-bold uppercase tracking-[0.16em] text-pvn-cream">
                    {organisation.legalName}
                  </span>
                  {organisation.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </div>

              <div>
                <p className="font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-gold">
                  Email
                </p>
                <a
                  href={`mailto:${organisation.email}`}
                  className="mt-3 inline-flex text-sm text-pvn-cream/85 underline decoration-pvn-gold/50 underline-offset-4 transition hover:text-pvn-gold-light hover:decoration-pvn-gold"
                >
                  {organisation.email}
                </a>
              </div>

              <div>
                <p className="font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-gold">
                  Visiting
                </p>
                <p className="mt-3 text-sm leading-relaxed text-pvn-cream/70">
                  The building is a restoration site and is not yet open to
                  visitors. Write to us and we will tell you the moment the
                  doors open again.
                </p>
              </div>

              {socialLinks.length > 0 ? (
                <div>
                  <p className="font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-gold">
                    Follow the rebuild
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    {socialLinks.map((social) => (
                      <a
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-pvn-cream/15 transition duration-300 ease-out hover:-translate-y-0.5 ${social.className}`}
                      >
                        <span className="sr-only">
                          {organisation.shortName} on {social.name}
                        </span>
                        <social.Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20"
        style={
          {
            "--flower-inset-mobile": FLOWER_EDGE_INSET.mobile,
            "--flower-inset-desktop": FLOWER_EDGE_INSET.desktop,
          } as CSSProperties
        }
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/50 to-transparent"
          aria-hidden
        />

        <Image
          src="/flower.png"
          alt=""
          aria-hidden
          width={497}
          height={373}
          className="pointer-events-none absolute top-1/2 left-[var(--flower-inset-mobile)] w-44 -translate-y-1/2 opacity-[0.12] sm:left-[var(--flower-inset-desktop)] sm:w-56 lg:w-72 lg:opacity-[0.16]"
        />
        <Image
          src="/flower.png"
          alt=""
          aria-hidden
          width={497}
          height={373}
          className="pointer-events-none absolute top-1/2 right-[var(--flower-inset-mobile)] w-44 -translate-y-1/2 scale-x-[-1] opacity-[0.12] sm:right-[var(--flower-inset-desktop)] sm:w-56 lg:w-72 lg:opacity-[0.16]"
        />

        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="font-nav text-2xl font-bold uppercase tracking-[0.08em] text-pvn-navy sm:text-3xl">
            Rather build than write?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-pvn-navy/75">
            You do not need permission, and you do not need to ask first. Take
            your part of the wall.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/give"
              className="font-nav inline-flex items-center gap-2 rounded-md bg-pvn-navy px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-pvn-cream transition hover:bg-pvn-navy-light sm:text-sm"
            >
              <IconHeart className="h-4 w-4 text-pvn-gold" />
              Give now
            </Link>
            <Link
              href="/fundraisers/create"
              className="font-nav inline-flex rounded-md border border-pvn-navy/25 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-pvn-navy transition hover:border-pvn-gold hover:text-pvn-gold sm:text-sm"
            >
              Start a pot
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
