import type { Metadata } from "next";
import Link from "next/link";
import { ArcEdge, ARC_SPACE } from "@/components/ArcEdge";
import { organisation } from "@/lib/site";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How accessible the Restore 5 Paulett website is, what we know is not right yet, and how to tell us about a barrier.",
};

/**
 * Dates are written out rather than generated, because a statement is only
 * honest if the review date reflects a review that actually happened.
 */
const preparedOn = "26 September 2026";
const reviewDue = "26 March 2027";

const working = [
  "Every page can be reached and used with a keyboard alone, and the focus outline stays visible as you move.",
  "A “Skip to content” link appears when focused, so you can jump past the main navigation.",
  "Animations stop for anyone whose device asks for reduced motion, including the moving row of pots.",
  "The home pot row has an explicit Pause control as well as pausing on hover.",
  "Text is real text, never an image of text, so it survives being zoomed to 200% or restyled by your browser.",
  "Photographs carry descriptions, and purely decorative shapes are hidden from screen readers rather than read aloud.",
  "Form fields have permanent visible labels, not placeholder text that disappears the moment you type.",
  "Pages use proper headings and landmarks, so screen reader users can jump rather than wade.",
];

const knownIssues = [
  {
    title: "Gold text on cream backgrounds",
    body: "Our gold reaches roughly 2.1:1 against the cream page, well under the 4.5:1 the standard asks for. It is used for the small uppercase labels above section headings across most of the site.",
    impact: "Affects people with low vision or colour vision deficiency.",
  },
  {
    title: "Faint secondary text",
    body: "Hint lines, input placeholders, character counters and photo captions are set at opacities that fall between roughly 3:1 and 4:1 against their background.",
    impact:
      "Affects people with low vision, and anyone on a screen in daylight.",
  },
  {
    title: "Form errors are not announced precisely",
    body: "Validation messages appear on screen and are announced, but they are not yet tied to the individual field they belong to, so the connection is not obvious out of context.",
    impact: "Affects screen reader users completing forms.",
  },
  {
    title: "Not yet tested with real assistive technology",
    body: "We have not completed an end-to-end test with screen readers such as NVDA, JAWS or VoiceOver, and no independent audit has been carried out.",
    impact: "Means this list is almost certainly incomplete.",
  },
];

function TickMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-4 w-4 shrink-0 text-pvn-gold"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12.5 9.5 18 20 7" />
    </svg>
  );
}

export default function AccessibilityPage() {
  return (
    <main className="w-full">
      <section
        className="relative overflow-hidden bg-pvn-navy text-pvn-cream"
        style={{ paddingTop: "3.5rem", paddingBottom: `${ARC_SPACE}px` }}
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
          <p className="font-nav flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold-light">
            <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
            Accessibility
          </p>
          <h1 className="font-nav mt-3 text-4xl font-bold uppercase leading-[0.95] tracking-tight text-pvn-cream sm:text-5xl lg:text-6xl">
            A house with no step at the door
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-pvn-cream/85 text-pretty sm:text-lg">
            We are restoring a building so that everyone can come in. The same
            has to be true of this website. Below is an honest account of where
            it stands.
          </p>
        </div>
      </section>

      <section className="border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-sm border border-pvn-navy/10 bg-white/60 p-6 sm:p-8">
            <p className="font-nav text-xs font-semibold uppercase tracking-[0.24em] text-pvn-navy/70">
              Conformance status
            </p>
            <p className="font-display mt-3 text-2xl font-semibold leading-snug text-pvn-navy sm:text-3xl">
              Partially conformant with WCAG 2.2 level AA
            </p>
            <p className="mt-4 text-base leading-relaxed text-pvn-navy/75 text-pretty">
              “Partially conformant” means most of the standard is met, but not
              all of it. The Web Content Accessibility Guidelines are the
              international benchmark for accessible websites, and level AA is
              the level most organisations aim for. We are committed to reaching
              it in full, and the gaps are listed further down this page rather
              than left for you to discover.
            </p>
          </div>

          <h2 className="font-display mt-14 text-3xl font-semibold leading-tight text-pvn-navy sm:text-4xl">
            What works today
          </h2>
          <ul className="mt-6 space-y-3.5">
            {working.map((item) => (
              <li key={item} className="flex gap-3">
                <TickMark />
                <span className="text-base leading-relaxed text-pvn-navy/80 text-pretty">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="font-display mt-14 text-3xl font-semibold leading-tight text-pvn-navy sm:text-4xl">
            What is not right yet
          </h2>
          <p className="mt-4 text-base leading-relaxed text-pvn-navy/75 text-pretty">
            These are the barriers we already know about. Each one is on the
            list to fix.
          </p>

          <ol className="mt-8 space-y-8">
            {knownIssues.map((issue, i) => (
              <li
                key={issue.title}
                className="border-l-2 border-pvn-gold/40 pl-5"
              >
                <p className="font-nav flex items-baseline gap-2.5 text-sm font-bold uppercase tracking-[0.14em] text-pvn-navy">
                  <span
                    className="text-[0.7rem] tracking-[0.2em] text-pvn-navy/70"
                    aria-hidden
                  >
                    {`0${i + 1}`}
                  </span>
                  {issue.title}
                </p>
                <p className="mt-2 text-base leading-relaxed text-pvn-navy/75 text-pretty">
                  {issue.body}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-pvn-navy/60 italic">
                  {issue.impact}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-pvn-navy/5 bg-pvn-cream pb-14 sm:pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-sm bg-pvn-navy p-6 text-pvn-cream shadow-[0_22px_50px_-26px_rgba(12,27,51,0.6)] sm:p-8">
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

            <div className="relative">
              <h2 className="font-display text-2xl font-semibold text-pvn-cream sm:text-3xl">
                Found a barrier? Tell us
              </h2>
              <p className="mt-3 text-base leading-relaxed text-pvn-cream/80 text-pretty">
                If something on this site stopped you doing what you came to do
                — especially if it stopped you giving — we want to hear about
                it. You do not need to know the technical reason.
              </p>

              <p className="mt-5 text-sm leading-relaxed text-pvn-cream/75">
                Email{" "}
                <a
                  href={`mailto:${organisation.email}?subject=${encodeURIComponent(
                    "Accessibility — barrier report",
                  )}`}
                  className="text-pvn-gold-light underline decoration-pvn-gold/60 underline-offset-4 transition hover:decoration-pvn-gold"
                >
                  {organisation.email}
                </a>{" "}
                or use the{" "}
                <Link
                  href="/contact"
                  className="text-pvn-gold-light underline decoration-pvn-gold/60 underline-offset-4 transition hover:decoration-pvn-gold"
                >
                  contact form
                </Link>
                . Telling us the page you were on and what you were trying to do
                is enough. We aim to reply within three working days.
              </p>

              <div
                className="mt-6 flex items-center gap-2 border-t border-pvn-cream/12 pt-5"
                aria-hidden
              >
                <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" />
                <span className="h-px flex-1 bg-pvn-cream/12" />
              </div>

              <p className="mt-4 text-sm leading-relaxed text-pvn-cream/75">
                Need something in another format — large print, plain text, or
                read aloud over the phone? Ask, and we will arrange it. Giving
                should never depend on a screen.
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-pvn-navy/10 pt-6 text-sm leading-relaxed text-pvn-navy/60">
            <p>
              This statement was prepared on {preparedOn} following an internal
              review of the site by the team that builds it. It has not been
              independently audited. It is next due for review on {reviewDue},
              or sooner if the site changes significantly.
            </p>
            <p className="mt-3">
              {organisation.legalName}, {organisation.addressLines.join(", ")}.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
