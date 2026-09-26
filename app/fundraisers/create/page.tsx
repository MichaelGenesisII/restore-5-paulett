import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArcEdge, ARC_SPACE } from "@/components/ArcEdge";
import { CreatePotWizard } from "@/components/pots/CreatePotWizard";

export const metadata: Metadata = {
  title: "Start a pot",
  description:
    "Open your own pot for the restoration of 5 Paulett Avenue, name it, tell your story and invite the people who already know you.",
  alternates: { canonical: "/fundraisers/create" },
};

const nehemiah = [
  {
    step: "01",
    title: "Name it",
    body: "Nehemiah listed builders by the section they took. Yours gets a name and a link.",
  },
  {
    step: "02",
    title: "Describe it",
    body: "Words for the pot page when you are ready — the wall cards lead with the title.",
  },
  {
    step: "03",
    title: "Seed it",
    body: "You lay the first stone. Then the pot opens for everyone else.",
  },
];

export default function CreatePotPage() {
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
          className="pointer-events-none absolute inset-x-0 top-0 h-[22rem]"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.18), transparent 70%)",
          }}
        />

        <ArcEdge side="bottom" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-14">
          <div>
            <p className="font-nav flex items-center gap-2.5 text-xs font-semibold tracking-[0.28em] text-pvn-gold-light uppercase">
              <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
              Your pot → our house
            </p>
            <h1 className="font-nav mt-3 text-4xl leading-[0.95] font-bold tracking-tight text-pvn-cream uppercase sm:text-5xl lg:text-6xl">
              Take your part
              <span className="block text-pvn-gold">of the wall</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-pvn-cream/85 text-pretty sm:text-lg">
              A pot is a section of the rebuild with your name against it. You
              open it, you tell people why it matters, and they give through
              you. Every penny lands in the same fund.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-pvn-cream/60">
              The short story of a pot is below. The form itself is six steps,
              then your seed gift — and you can watch the finished card change
              as you write.
            </p>
          </div>

          <ol className="flex flex-col gap-4 rounded-sm border border-pvn-cream/12 bg-pvn-navy/60 p-5 backdrop-blur-sm sm:p-6">
            <li className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold/80 uppercase">
              In spirit
            </li>
            {nehemiah.map((item) => (
              <li key={item.step} className="flex items-start gap-4">
                <span className="font-nav shrink-0 text-sm font-bold text-pvn-gold/60 tabular-nums">
                  {item.step}
                </span>
                <span className="min-w-0">
                  <span className="font-nav block text-xs font-bold tracking-[0.14em] text-pvn-cream uppercase">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-pvn-cream/65">
                    {item.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <CreatePotWizard />
        </div>
      </section>

      {/* Closing */}
      <section className="relative overflow-hidden border-t border-pvn-navy/5 bg-pvn-cream py-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/50 to-transparent"
          aria-hidden
        />

        <Image
          src="/dove-left.png"
          alt=""
          aria-hidden
          width={500}
          height={500}
          className="pvn-dove pvn-dove-left pointer-events-none absolute -left-10 bottom-2 w-32 opacity-[0.07] sm:left-2 sm:w-44 lg:w-56 lg:opacity-[0.09]"
        />
        <Image
          src="/dove-right.png"
          alt=""
          aria-hidden
          width={499}
          height={499}
          className="pvn-dove pvn-dove-right pointer-events-none absolute -right-10 top-2 w-32 opacity-[0.07] sm:right-2 sm:w-44 lg:w-56 lg:opacity-[0.09]"
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
            <p className="font-display text-xl leading-snug text-pvn-navy italic text-pretty sm:text-2xl">
              “So they strengthened their hands for the good work.”
            </p>
            <cite className="font-nav mt-3 block text-xs font-semibold uppercase not-italic tracking-[0.2em] text-pvn-navy/70">
              Nehemiah 2:18
            </cite>
          </blockquote>

          <p className="mt-5 text-sm leading-relaxed text-pvn-navy/70 text-pretty">
            Would you rather give than run a pot?
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/give"
              className="font-nav inline-flex min-h-10 items-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Give directly
            </Link>
            <Link
              href="/fundraisers"
              className="font-nav inline-flex min-h-10 items-center rounded-md border border-pvn-navy/25 px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              Join a pot
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
