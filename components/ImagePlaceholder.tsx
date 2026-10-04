type ImagePlaceholderProps = {
  label: string;
  caption?: string;
  aspect?: "video" | "photo" | "portrait" | "wide";
  className?: string;
};

const aspectClass = {
  video: "aspect-video",
  photo: "aspect-[4/3]",
  portrait: "aspect-[3/4]",
  wide: "aspect-[21/9]",
} as const;

/** Visual stand-in until real photography is supplied. */
export function ImagePlaceholder({
  label,
  caption,
  aspect = "photo",
  className = "",
}: ImagePlaceholderProps) {
  return (
    <figure className={`relative overflow-hidden bg-pvn-navy ${className}`}>
      <div
        className={`relative w-full ${aspectClass[aspect]} bg-[linear-gradient(145deg,#152642_0%,#0c1b33_55%,#1a2f4d_100%)]`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(335deg, #c9a84c 18px, transparent 18px),
              linear-gradient(155deg, #c9a84c 18px, transparent 18px)
            `,
            backgroundSize: "42px 42px",
            backgroundPosition: "0 0, 21px 0",
          }}
        />
        <span
          className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-pvn-gold/70"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-pvn-gold/70"
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-nav text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-pvn-gold">
            Photo placeholder
          </p>
          <p className="font-display text-xl font-semibold text-pvn-cream/90 sm:text-2xl">
            {label}
          </p>
        </div>
      </div>
      {caption ? (
        <figcaption className="border-t border-pvn-navy/10 bg-pvn-cream px-1 py-2 text-xs text-pvn-stone">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
