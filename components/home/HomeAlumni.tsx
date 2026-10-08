import Image from "next/image";
import Link from "next/link";
import { IconGlobe } from "@/components/icons";

/** Where PVN Belfast alumni went, per the campaign story. Not live data. */
const scatteredTo = [
  "London",
  "Dublin",
  "Manchester",
  "Scotland",
  "Nigeria",
  "Canada",
  "America",
];

/** The anaphora is the point — each reason sits on its own row. */
const reasons = [
  "Some came as students.",
  "Some came for work.",
  "Some found Christ here.",
  "Some found the friends they still have.",
] as const;

/** The three movements of the alumni journey. */
const movements = [
  {
    label: "Remember",
    body: "The old photographs, and the stories still attached to them.",
  },
  {
    label: "Reconnect",
    body: "Find your year, your ministry, your family, your city.",
  },
  {
    label: "Rebuild",
    body: "Give, start a fundraiser, or join one that is already rising.",
  },
] as const;

export function HomeAlumni() {
  return (
    <section
      id="alumni"
      className="border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
          <div className="order-2 flex flex-col gap-5 lg:order-1">
            <p className="font-nav text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
              PVN Belfast alumni
            </p>

            <h2 className="font-display text-3xl font-semibold leading-tight text-pvn-navy sm:text-4xl">
              You may have left Belfast.
              <span className="mt-1 block text-pvn-gold">
                You never left the story.
              </span>
            </h2>

            <div className="max-w-md space-y-1 text-base leading-relaxed text-pvn-navy/75 sm:text-lg">
              {reasons.map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
            </div>

            <p className="max-w-md text-base leading-relaxed text-pvn-navy/75 text-pretty sm:text-lg">
              Then life took you elsewhere. The home we prayed for together has
              finally come.
            </p>

            <div className="hidden md:block">
              <p className="font-nav flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-navy/45">
                <IconGlobe className="h-4 w-4 shrink-0 text-pvn-gold" />
                Wherever you are now
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {scatteredTo.map((place) => (
                  <li
                    key={place}
                    className="font-nav rounded-full border border-pvn-gold/40 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-pvn-navy/70"
                  >
                    {place}
                  </li>
                ))}
                <li className="font-nav px-1 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-pvn-navy/35">
                  &amp; beyond
                </li>
              </ul>
            </div>

            <p className="font-nav text-sm font-bold uppercase tracking-[0.14em] text-pvn-navy text-balance">
              Wherever God has planted you today, come back and build with us.
            </p>

            <div className="mt-1 flex flex-wrap gap-3">
              <Link
                href="/alumni"
                className="font-nav inline-flex rounded-md bg-pvn-gold px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-pvn-navy transition hover:bg-pvn-gold-light sm:text-sm"
              >
                I&apos;m PVN alumni →
              </Link>
              <Link
                href="/fundraisers"
                className="font-nav inline-flex rounded-md border border-pvn-navy/25 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-pvn-navy transition hover:border-pvn-gold hover:text-pvn-gold sm:text-sm"
              >
                Find my group
              </Link>
            </div>
          </div>

          <figure className="relative order-1 mx-auto w-full max-w-sm lg:order-2 lg:max-w-none">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-pvn-navy">
              <Image
                src="/gallery/second.avif"
                alt="Two friends of PVN Belfast smiling and waving"
                fill
                sizes="(max-width: 1024px) 24rem, 45vw"
                className="object-cover object-center"
              />
            </div>
            {/* Gold ticks rather than a full frame — the Calling section
                already owns the framed-plaque treatment. */}
            <span
              className="pointer-events-none absolute -top-1.5 -left-1.5 h-6 w-6 border-t-2 border-l-2 border-pvn-gold"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -right-1.5 -bottom-1.5 h-6 w-6 border-r-2 border-b-2 border-pvn-gold"
              aria-hidden
            />
          </figure>
        </div>

        <div className="mt-12 hidden border-t border-pvn-navy/10 pt-8 md:block">
          <p className="font-nav text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
            The way back
          </p>
          <ol className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {movements.map((movement, i) => (
              <li key={movement.label}>
                <span className="block h-px w-8 bg-pvn-gold/60" aria-hidden />
                <p className="font-nav mt-4 flex items-baseline gap-2.5 text-sm font-bold uppercase tracking-[0.16em] text-pvn-navy">
                  <span
                    className="text-[0.65rem] tracking-[0.2em] text-pvn-gold/70"
                    aria-hidden
                  >
                    {`0${i + 1}`}
                  </span>
                  {movement.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-pvn-navy/70">
                  {movement.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
