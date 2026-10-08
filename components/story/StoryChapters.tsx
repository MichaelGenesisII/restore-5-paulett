import { SlowCarousel } from "@/components/SlowCarousel";

export type StoryChapter = {
  id: string;
  title: string;
  lead: string;
  body: readonly string[];
};

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

function ChapterCard({
  chapter,
  index,
}: {
  chapter: StoryChapter;
  index: number;
}) {
  return (
    <article
      id={chapter.id}
      className="h-full scroll-mt-28 rounded-sm border border-pvn-navy/8 bg-white/50 px-5 py-8 text-center shadow-[0_18px_40px_-28px_rgba(12,27,51,0.35)] transition duration-300 ease-out hover:border-pvn-gold/40 sm:px-6"
    >
      <span className="mb-4 flex h-11 items-center justify-center">
        <span className="font-display text-3xl leading-none font-semibold text-pvn-gold">
          {NUMERALS[index]}
        </span>
      </span>

      <h3 className="font-nav text-lg leading-snug font-bold tracking-[0.08em] text-balance text-pvn-navy uppercase sm:text-xl">
        {chapter.title}
      </h3>

      <div
        className="mx-auto mt-4 flex items-center justify-center gap-2"
        aria-hidden
      >
        <span className="h-px w-8 bg-pvn-gold/50" />
        <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" />
        <span className="h-px w-8 bg-pvn-gold/50" />
      </div>

      <p className="font-display mt-3 text-base text-pvn-navy/55 italic">
        {chapter.lead}
      </p>

      <div className="mx-auto mt-4 max-w-lg space-y-3 text-sm leading-relaxed text-pvn-navy/70 text-pretty">
        {chapter.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}

/**
 * One card at a time on phones (the next one peeks in to invite a swipe),
 * three across from `lg`. Drifts slowly until the reader takes over.
 */
export function StoryChapters({
  chapters,
}: {
  chapters: readonly StoryChapter[];
}) {
  return (
    <SlowCarousel
      label="Chapters of our story"
      intervalMs={15_000}
      slideClassName="w-[88%] px-1.5 sm:w-[70%] sm:px-2 lg:w-1/3 lg:px-3"
      slideLabels={chapters.map(
        (chapter, i) => `Chapter ${NUMERALS[i]} — ${chapter.title}`,
      )}
    >
      {chapters.map((chapter, i) => (
        <ChapterCard key={chapter.id} chapter={chapter} index={i} />
      ))}
    </SlowCarousel>
  );
}
