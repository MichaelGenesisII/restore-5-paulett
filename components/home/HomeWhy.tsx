import Link from "next/link";

type Pillar = {
  title: string;
  lead: string;
  body: string;
  icon: "nextgen" | "community" | "heritage" | "future";
};

const pillars: Pillar[] = [
  {
    title: "For young people",
    lead: "Somewhere to learn, grow and be believed in.",
    body: "Youth activities, mentoring, Saturday School and educational support — a safe, welcoming place to spend time and find direction.",
    icon: "nextgen",
  },
  {
    title: "For families & community",
    lead: "Open doors, and room for everyone.",
    body: "Family activities, wellbeing programmes and community events, with flexible spaces local organisations can use and call their own.",
    icon: "community",
  },
  {
    title: "For heritage",
    lead: "Ballymacarrett’s story, kept and shared.",
    body: "Preserving the building and opening its history to all through exhibitions, oral histories, school programmes, heritage walks and visitor experiences.",
    icon: "heritage",
  },
  {
    title: "For the future",
    lead: "A building at risk, working again.",
    body: "Bringing a Heritage at Risk building back into everyday use, and creating a lasting, sustainable community asset for East Belfast.",
    icon: "future",
  },
];

function PillarIcon({ name }: { name: Pillar["icon"] }) {
  return (
    <span
      aria-hidden
      className="inline-block h-7 w-7 shrink-0 bg-pvn-gold sm:h-9 sm:w-9"
      style={{
        WebkitMaskImage: `url(/svg/${name}.svg)`,
        maskImage: `url(/svg/${name}.svg)`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

/**
 * The case for giving beyond the congregation. On phones each pillar is a
 * compact row (icon beside the words) so all four fit in a couple of thumbs'
 * worth of scrolling; from `sm` they become cards.
 */
export function HomeWhy() {
  return (
    <section
      id="why"
      aria-labelledby="why-heading"
      className="relative scroll-mt-28 overflow-hidden bg-pvn-navy py-12 text-pvn-cream sm:py-20"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/60 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[20rem]"
        aria-hidden
        style={{
          background:
            "radial-gradient(90% 100% at 50% 0%, rgba(201,168,76,0.14), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-nav text-[0.65rem] font-semibold tracking-[0.18em] text-pvn-gold uppercase sm:text-xs sm:tracking-[0.28em]">
            Why we’re restoring 5 Paulett Avenue
          </p>
          <h2
            id="why-heading"
            className="font-display mt-3 text-[1.85rem] leading-[1.1] font-semibold text-balance text-pvn-cream sm:text-4xl sm:leading-tight lg:text-5xl"
          >
            Not only a church —{" "}
            <span className="text-pvn-gold">a home for East Belfast.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-pretty text-pvn-cream/80 sm:mt-5 sm:text-lg">
            <span className="sm:hidden">
              A heritage and community hub for East Belfast. Every gift opens
              its doors to young people, families, local groups and visitors.
            </span>
            <span className="hidden sm:inline">
              We are bringing 5 Paulett Avenue back to life as a heritage and
              community hub for the people of East Belfast. Every gift helps
              open its doors to young people, families, local groups and
              visitors — whether or not they ever join us on a Sunday.
            </span>
          </p>
        </div>

        <ul className="mt-8 divide-y divide-pvn-cream/10 border-y border-pvn-cream/10 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-5 sm:divide-y-0 sm:border-0 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <li
              key={pillar.title}
              className="flex gap-4 py-5 sm:flex-col sm:gap-0 sm:rounded-sm sm:border sm:border-pvn-cream/12 sm:bg-pvn-cream/[0.04] sm:p-6 sm:transition sm:duration-300 sm:hover:border-pvn-gold/45 sm:hover:bg-pvn-cream/[0.07]"
            >
              <span className="pt-0.5 sm:pt-0">
                <PillarIcon name={pillar.icon} />
              </span>
              <div className="min-w-0">
                <h3 className="font-nav text-[0.8rem] font-bold tracking-[0.12em] text-pvn-cream uppercase sm:mt-5 sm:text-sm sm:tracking-[0.14em]">
                  {pillar.title}
                </h3>
                <p className="font-display mt-1 text-base leading-snug text-pvn-gold-light italic sm:mt-2 sm:text-lg">
                  {pillar.lead}
                </p>
                <p className="mt-2 text-[0.85rem] leading-relaxed text-pretty text-pvn-cream/70 sm:mt-3 sm:text-sm">
                  {pillar.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center gap-5 text-center sm:mt-14 sm:gap-6 sm:border-t sm:border-pvn-cream/12 sm:pt-10">
          <p className="font-display text-xl leading-snug font-semibold text-pvn-cream sm:text-3xl sm:text-balance">
            <span className="block sm:inline">Restoring the past. </span>
            <span className="block text-pvn-gold sm:inline">
              Serving the present.{" "}
            </span>
            <span className="block sm:inline">Building for the future.</span>
          </p>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/give"
              className="font-nav inline-flex min-h-12 items-center justify-center rounded-md bg-pvn-gold px-6 text-xs font-bold tracking-[0.16em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Give to the restoration
            </Link>
            <Link
              href="/our-story"
              className="font-nav inline-flex min-h-12 items-center justify-center px-2 text-xs font-bold tracking-[0.16em] text-pvn-cream uppercase underline decoration-pvn-gold/60 decoration-2 underline-offset-4 transition hover:text-pvn-gold"
            >
              Read our story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
