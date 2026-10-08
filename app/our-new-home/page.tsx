import type { Metadata } from "next";
import Link from "next/link";
import { FacebookVideo } from "@/components/FacebookVideo";
import { HomeGallery } from "@/components/home/HomeGallery";

export const metadata: Metadata = {
  title: "Our New Home",
  description:
    "A gallery of 5 Paulett Avenue — the historic East Belfast house that is now the permanent home of PVN Belfast.",
  alternates: { canonical: "/our-new-home" },
};

/**
 * Photographs of the place, in file order. Portraits get a taller cell so the
 * masonry reads as a visit through the house rather than a flat grid.
 */
const gallery = [
  { src: "/compressed/photo1.avif", shape: "wide" as const },
  { src: "/compressed/photo2.avif", shape: "wide" as const },
  { src: "/compressed/photo3.avif", shape: "wide" as const },
  { src: "/compressed/photo4.avif", shape: "wide" as const },
  { src: "/compressed/photo5.avif", shape: "wide" as const },
  { src: "/compressed/photo6.avif", shape: "portrait" as const },
  { src: "/compressed/photo7.avif", shape: "wide" as const },
  { src: "/compressed/photo8.avif", shape: "wide" as const },
  { src: "/compressed/photo9.avif", shape: "wide" as const },
  { src: "/compressed/photo10.avif", shape: "wide" as const },
  { src: "/compressed/photo11.avif", shape: "wide" as const },
  { src: "/compressed/photo12.avif", shape: "wide" as const },
  { src: "/compressed/photo13.avif", shape: "wide" as const },
  { src: "/compressed/photo14.avif", shape: "wide" as const },
  { src: "/compressed/photo15.avif", shape: "wide" as const },
  { src: "/compressed/photo16.avif", shape: "portrait" as const },
  { src: "/compressed/photo17.avif", shape: "wide" as const },
  { src: "/compressed/photo18.avif", shape: "wide" as const },
  { src: "/compressed/photo19.avif", shape: "wide" as const },
  { src: "/compressed/photo20.avif", shape: "portrait" as const },
  { src: "/compressed/photo21.avif", shape: "wide" as const },
  { src: "/compressed/photo22.avif", shape: "wide" as const },
  { src: "/compressed/photo23.avif", shape: "wide" as const },
  { src: "/compressed/photo24.avif", shape: "wide" as const },
  { src: "/compressed/photo25.avif", shape: "wide" as const },
  { src: "/compressed/photo26.avif", shape: "wide" as const },
  { src: "/compressed/photo27.avif", shape: "wide" as const },
  { src: "/compressed/photo28.avif", shape: "portrait" as const },
  { src: "/compressed/photo29.avif", shape: "wide" as const },
  { src: "/compressed/photo30.avif", shape: "wide" as const },
  { src: "/compressed/photo31.avif", shape: "portrait" as const },
];

export default function OurNewHomePage() {
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

        <div className="relative mx-auto grid max-w-6xl gap-5 px-4 pb-2 sm:gap-8 sm:px-6 sm:pb-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16 lg:pb-6">
          <div className="min-w-0 text-center sm:text-left">
            <p className="font-nav inline-flex items-center justify-center gap-2 text-[0.65rem] font-semibold tracking-[0.2em] text-pvn-gold-light uppercase sm:justify-start sm:gap-2.5 sm:text-xs sm:tracking-[0.28em]">
              <span
                className="h-1.5 w-1.5 shrink-0 rotate-45 bg-pvn-gold"
                aria-hidden
              />
              5 Paulett Avenue
            </p>
            <h1 className="font-display mt-2.5 text-[2.5rem] leading-[1.02] font-semibold tracking-tight text-pvn-cream sm:mt-3 sm:text-5xl sm:leading-[1.05] lg:text-6xl xl:text-7xl">
              Our new
              <span className="block text-pvn-gold">home</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty text-pvn-cream/85 sm:mx-0 sm:mt-5 sm:max-w-xl sm:text-base lg:text-lg">
              <span className="sm:hidden">
                A historic house in East Belfast — PVN’s permanent home. The
                purchase is complete. The restoration is not.
              </span>
              <span className="hidden sm:inline">
                A historic house in Ballymacarrett, East Belfast. Nearly 190
                years of gathering behind it. PVN Belfast’s permanent home ahead
                of it. The purchase is complete. The restoration is not.
              </span>
            </p>
          </div>

          {/* Mobile: one compact strip. Desktop: the fuller gallery panel. */}
          <aside className="rounded-sm border border-pvn-cream/12 bg-pvn-navy/60 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:hidden">
              <div className="min-w-0">
                <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                  The gallery
                </p>
                <p className="mt-1 truncate text-xs leading-snug text-pvn-cream/85">
                  {gallery.length} photographs · tap to open
                </p>
              </div>
              <Link
                href="/our-story"
                className="font-nav shrink-0 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-gold uppercase underline decoration-pvn-gold/40 underline-offset-4"
              >
                Story →
              </Link>
            </div>

            <div className="hidden p-5 sm:block sm:p-6 lg:p-7">
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                The gallery
              </p>
              <p className="font-display mt-2 text-2xl leading-tight font-semibold tracking-tight text-pvn-cream sm:text-3xl">
                {gallery.length} photographs
              </p>
              <p className="mt-2 text-sm leading-relaxed text-pvn-cream/70">
                Walk the rooms as they stand — stone, glass, timber and light —
                before the rebuild brings them back to life. Click any frame to
                open it.
              </p>
              <p className="mt-4 border-t border-pvn-cream/12 pt-4">
                <Link
                  href="/our-story"
                  className="font-nav text-[0.7rem] font-bold tracking-[0.16em] text-pvn-gold uppercase transition hover:text-pvn-gold-light"
                >
                  Read the story of this house →
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section
        id="film"
        aria-labelledby="film-heading"
        className="scroll-mt-28 bg-pvn-cream pt-12 pb-4 sm:pt-16"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="font-nav text-xs font-semibold tracking-[0.28em] text-pvn-gold uppercase">
              See it for yourself
            </p>
            <h2
              id="film-heading"
              className="font-display mt-3 text-3xl leading-tight font-semibold text-balance text-pvn-navy sm:text-4xl"
            >
              Step inside 5 Paulett Avenue
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-pretty text-pvn-navy/75 sm:text-lg lg:mx-0">
              A short film of First Presbyterian Church Ballymacarrett — the
              building that is now our home. Nearly two centuries of East
              Belfast life, waiting for its next chapter.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-pretty text-pvn-navy/60 lg:mx-0">
              It plays without sound to begin with — tap the speaker in the
              player to hear it.
            </p>
            <Link
              href="/give"
              className="font-nav mt-6 inline-flex min-h-12 items-center justify-center rounded-md bg-pvn-navy px-6 text-xs font-bold tracking-[0.16em] text-pvn-cream uppercase transition hover:bg-pvn-navy-light"
            >
              Help bring it back to life
            </Link>
          </div>

          <FacebookVideo
            href="https://www.facebook.com/100092743565746/videos/1692736025316067/"
            shareUrl="https://www.facebook.com/share/r/1DBusS6HLu/"
            title="First Presbyterian Church Ballymacarrett, East Belfast"
            poster="/gallery/first.avif"
          />
        </div>
      </section>

      <section
        className="bg-pvn-cream pt-10 pb-14 sm:pt-14 sm:pb-20"
        aria-label="Photographs of 5 Paulett Avenue"
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <HomeGallery shots={gallery} />
        </div>
      </section>
    </main>
  );
}
