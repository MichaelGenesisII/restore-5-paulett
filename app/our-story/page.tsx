import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StoryChapters } from "@/components/story/StoryChapters";
import { StoryFinalCta } from "@/components/story/StoryFinalCta";
export const metadata: Metadata = {
  title: "Our Story",
  description:
    "We prayed for a home. God opened the door. The journey of PVN Belfast, nearly 190 years of heritage at 5 Paulett Avenue, and the call to rebuild together.",
  alternates: { canonical: "/our-story" },
};

/**
 * This page is set as a church register: roman numerals, drop caps, leader
 * dots and heavy running-head rules. That vocabulary is deliberately confined
 * to Our Story — no other page uses it.
 */
const chapters = [
  {
    id: "journey",
    number: "01",
    title: "The Journey",
    lead: "Years without a permanent home.",
    body: [
      "Place of Victory for All Nations Belfast prayed and gathered for years without a house of its own.",
      "Rooms were borrowed. Addresses changed. The people stayed. The longing for a place that could hold prayer, worship and the next generation never left.",
    ],
  },
  {
    id: "prayer",
    number: "02",
    title: "The Prayer",
    lead: "Believing God for a place.",
    body: [
      "We prayed. We believed. We waited.",
      "Not for a landmark to own, but for a house of prayer — somewhere the church could put down roots and serve East Belfast without packing up again.",
    ],
  },
  {
    id: "opportunity",
    number: "03",
    title: "The Opportunity",
    lead: "5 Paulett becomes available.",
    body: [
      "Then a door opened on Paulett Avenue: a historic church building that had closed in 2010 and stood largely unused for more than a decade.",
      "Nearly 190 years of worship had already been poured into those walls. Another generation was being invited to receive the keys — and the responsibility that comes with them.",
    ],
  },
  {
    id: "purchase",
    number: "04",
    title: "The Purchase",
    lead: "The keys are ours.",
    body: [
      "In 2026, PVN Belfast purchased 5 Paulett Avenue as its permanent home.",
      "Celebration and urgency arrived in the same breath. We have the house. The purchase was the beginning, not the end.",
    ],
  },
  {
    id: "challenge",
    number: "05",
    title: "The Challenge",
    lead: "Vacant for over a decade.",
    body: [
      "More than ten years of vacancy took their toll. The roof, the stone, the windows, the heat and light — substantial restoration is required before the house can live again.",
      "Where others may see ruins, we see what can rise. The honesty of the “before” is the reason to give.",
    ],
  },
  {
    id: "call",
    number: "06",
    title: "The Call",
    lead: "Rise up and build.",
    body: [
      "We cannot rebuild this alone. Nehemiah’s wall went up in sections — families, individuals and groups each took a part.",
      "That is the invitation now: take your part of the wall. Give. Start a fundraiser. Join one. Watch the ruins rise.",
    ],
  },
] as const;

const timeline = [
  {
    year: "1837",
    title: "The beginning",
    body: "Surviving records of First Ballymacarrett Presbyterian Church begin. In a fast-growing industrial district of mills and manufacture, the church becomes part of the spiritual and social landscape of East Belfast.",
  },
  {
    year: "1912",
    title: "A moment in the city’s story",
    body: "Historical accounts record that Sir Edward Carson worshipped here on the day of the Ulster Covenant signing. Whatever one’s political perspective, it shows the building stood through significant moments in Belfast and Northern Ireland — offered as evidence of significance, never as political alignment.",
  },
  {
    year: "1928",
    title: "Another generation builds",
    body: "A lecture hall and sexton’s house open at a cost of roughly £6,000 — a serious investment by people who would not see the whole future they were funding. The clearest historical parallel to what we are being asked to do now.",
  },
  {
    year: "2010",
    title: "The doors close",
    body: "The congregation holds its final Sunday service in September and joins with Ravenhill. More than a decade of vacancy follows. The fabric pays the price.",
  },
  {
    year: "2026",
    title: "A new chapter",
    body: "PVN Belfast purchases 5 Paulett Avenue as its permanent home — receiving stewardship of a place that already carries the work and sacrifice of generations.",
  },
  {
    year: "Next",
    title: "The next generation",
    body: "The purchase was the beginning. Now comes the rebuilding — so that those who come after us inherit a house alive with prayer, worship and welcome.",
  },
] as const;

export default function OurStoryPage() {
  return (
    <main className="w-full">
      {/* Section 1: Hero — centered like /give */}
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
            Our story
          </p>
          <h1 className="font-display mt-2.5 text-[2.5rem] leading-[1.02] font-semibold tracking-tight text-pvn-cream sm:mt-3 sm:text-5xl sm:leading-[1.05] lg:text-6xl xl:text-7xl">
            We prayed for a home.
            <span className="block text-pvn-gold">God opened the door.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty text-pvn-cream/85 sm:mt-5 sm:max-w-xl sm:text-base lg:text-lg">
            <span className="sm:hidden">
              Now let us build. From prayer to possession — and the call that
              follows.
            </span>
            <span className="hidden sm:inline">
              Now let us build. From prayer to possession, nearly 190 years of
              inheritance, and the call that follows.
            </span>
          </p>
        </div>
      </section>

      {/* Section 2: Story Chapters */}
      <section className="relative overflow-hidden border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20">
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-nav text-xs font-semibold tracking-[0.28em] text-pvn-gold uppercase">
              How we got here
            </p>
            <h2 className="font-display mt-3 text-3xl leading-tight font-semibold text-pvn-navy sm:text-4xl">
              Six chapters, one house
            </h2>
          </div>

          <div className="mt-10 sm:mt-12">
            <StoryChapters chapters={chapters} />
          </div>
        </div>
      </section>

      {/* Section 4: Heritage / Timeline Ledger */}
      <section
        id="heritage"
        className="relative scroll-mt-28 overflow-hidden bg-pvn-navy text-pvn-cream"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
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

        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="border-b-2 border-pvn-cream/80 pb-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-nav text-[0.6rem] font-bold tracking-[0.3em] text-pvn-cream/50 uppercase sm:text-[0.65rem]">
                The house remembers
              </p>
              <p className="font-nav text-[0.6rem] font-bold tracking-[0.3em] text-pvn-cream/50 uppercase sm:text-[0.65rem]">
                1837 — now
              </p>
            </div>
            <h2 className="font-display mt-3 text-3xl leading-tight font-semibold text-pvn-cream sm:text-4xl">
              Nearly two centuries in these walls
            </h2>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-16 lg:items-start">
            <div>
              <p className="max-w-md text-base leading-relaxed text-pvn-cream/75 text-pretty sm:text-lg">
                First Ballymacarrett Presbyterian Church built and occupied this
                site from 1837 until 2010. Baptisms, marriages, working
                families and worship through the hardest periods in the city’s
                history are held in its story.
              </p>
              <p className="mt-5 max-w-md border-l-2 border-pvn-gold pl-4 text-sm leading-relaxed text-pvn-cream/60 text-pretty">
                The purchase did not begin the story. It placed PVN Belfast in
                the care of one already being written by generations.
              </p>
            </div>

            <ol className="relative border-l border-pvn-gold/45 pl-6 sm:pl-8">
              {timeline.map((entry, index) => (
                <li
                  key={entry.year}
                  className="relative pb-8 last:pb-0 sm:pb-10"
                >
                  <span
                    className="absolute -left-[2.05rem] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-pvn-gold bg-pvn-navy text-[0.6rem] font-bold text-pvn-gold sm:-left-[2.55rem]"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-display text-2xl leading-none font-semibold text-pvn-gold tabular-nums sm:text-3xl">
                      {entry.year}
                    </span>
                    <h3 className="font-nav text-xs font-bold tracking-[0.2em] text-pvn-cream uppercase sm:text-sm">
                      {entry.title}
                    </h3>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pvn-cream/70 sm:text-base">
                    {entry.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Section 5: Heritage Promise / Future Purpose */}
      <section className="border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 border-b-2 border-pvn-navy pb-4">
            <div>
              <p className="font-nav text-[0.6rem] font-bold tracking-[0.3em] text-pvn-gold uppercase sm:text-[0.65rem]">
                Heritage as a promise
              </p>
              <h2 className="font-display mt-3 max-w-2xl text-3xl leading-tight font-semibold text-pvn-navy sm:text-4xl">
                Preserving the past. Serving the future.
              </h2>
            </div>
            <p className="font-nav hidden shrink-0 text-[0.6rem] font-bold tracking-[0.3em] text-pvn-navy/45 uppercase sm:block sm:text-[0.65rem]">
              Plate III
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16">
            <figure className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
              <div className="relative aspect-[1200/896] w-full overflow-hidden bg-pvn-navy">
                <Image
                  src="/gallery/test2.avif"
                  alt="The community gathered at 5 Paulett Avenue"
                  fill
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-contain object-center transition-transform duration-700 hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pvn-navy/65 via-transparent to-transparent" />
                <span className="font-nav absolute bottom-4 left-4 text-[0.6rem] font-bold tracking-[0.2em] text-pvn-cream uppercase sm:bottom-5 sm:left-5">
                  The people the building is for
                </span>
              </div>
              <figcaption className="mt-3 flex items-baseline gap-3 border-t border-pvn-navy/20 pt-3">
                <span className="font-nav shrink-0 text-[0.6rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                  Plate III
                </span>
                <span className="text-sm text-pvn-navy/60 italic">
                  A place is only restored when it can welcome people again.
                </span>
              </figcaption>
            </figure>

            <div className="lg:py-2">
              <p className="text-base leading-relaxed text-pvn-navy/75 text-pretty sm:text-lg">
                The restoration commits to sharing the story of 5 Paulett and
                Ballymacarrett through exhibitions, schools engagement, oral
                histories, heritage activities and public access.
              </p>
              <p className="mt-5 text-base leading-relaxed text-pvn-navy/75 text-pretty">
                That honours the congregation that came before while creating
                genuine public benefit for people who are not part of the
                church.
              </p>

              <blockquote className="mt-8 border-y-2 border-pvn-navy py-5 sm:mt-10 sm:py-6">
                <p className="font-display text-2xl leading-snug font-semibold text-balance text-pvn-navy sm:text-3xl">
                  A historic building brought back to life — for the street as
                  well as the sanctuary.
                </p>
                <cite className="font-nav mt-4 block text-[0.6rem] font-bold tracking-[0.2em] text-pvn-gold uppercase not-italic">
                  The promise of 5 Paulett
                </cite>
              </blockquote>

              <Link
                href="/our-new-home"
                className="font-nav mt-6 inline-flex items-center gap-2 rounded-md bg-pvn-navy px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy-light"
              >
                See the house in photographs
                <span className="text-pvn-gold" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Rotating Scriptures / Final CTA */}
      <StoryFinalCta />
    </main>
  );
}
