import type { Metadata } from "next";
import Link from "next/link";
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

        <div className="relative mx-auto grid max-w-6xl gap-5 px-4 pb-2 sm:gap-8 sm:px-6 sm:pb-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-14 lg:pb-6">
          <div className="min-w-0 text-center sm:text-left">
            <p className="font-nav inline-flex items-center justify-center gap-2 text-[0.65rem] font-semibold tracking-[0.2em] text-pvn-gold-light uppercase sm:justify-start sm:gap-2.5 sm:text-xs sm:tracking-[0.28em]">
              <span
                className="h-1.5 w-1.5 shrink-0 rotate-45 bg-pvn-gold"
                aria-hidden
              />
              Your pot → our house
            </p>
            <h1 className="font-nav mt-2.5 text-[2.5rem] leading-[0.95] font-bold tracking-tight text-pvn-cream uppercase sm:mt-3 sm:text-5xl lg:text-6xl">
              Take your part
              <span className="block text-pvn-gold">of the wall</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty text-pvn-cream/85 sm:mx-0 sm:mt-5 sm:max-w-xl sm:text-base lg:text-lg">
              <span className="sm:hidden">
                A section of the rebuild with your name on it. Every penny lands
                in the same fund.
              </span>
              <span className="hidden sm:inline">
                A pot is a section of the rebuild with your name against it.
                You open it, you tell people why it matters, and they give
                through you. Every penny lands in the same fund.
              </span>
            </p>
            <p className="mt-4 hidden max-w-xl text-sm leading-relaxed text-pvn-cream/60 sm:block">
              The short story of a pot is below. The form itself is six steps,
              then your seed gift — and you can watch the finished card change
              as you write.
            </p>
          </div>

          {/* Mobile: one compact strip. sm+: the full three-step panel. */}
          <aside className="rounded-sm border border-pvn-gold/60 bg-pvn-navy/60 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] backdrop-blur-sm transition duration-300 ease-out hover:border-pvn-gold hover:shadow-[0_26px_50px_-18px_rgba(201,168,76,0.35)] motion-safe:hover:-translate-y-1">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:hidden">
              <div className="min-w-0">
                <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                  In spirit
                </p>
                <p className="mt-1 truncate text-xs leading-snug text-pvn-cream/85">
                  {nehemiah.map((item) => item.title).join(" · ")}
                </p>
              </div>
              <Link
                href="#start"
                className="font-nav shrink-0 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-gold uppercase underline decoration-pvn-gold/40 underline-offset-4"
              >
                Start ↓
              </Link>
            </div>

            <ol className="hidden flex-col gap-4 p-5 sm:flex sm:p-6">
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
          </aside>
        </div>
      </section>

      <section
        id="start"
        className="scroll-mt-20 border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20"
      >
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
