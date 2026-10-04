/** Landscape cover placeholder for host pot lists / manage hero. */
export function HostPotCoverPlaceholder({
  className = "",
  label = true,
  tone = "light",
}: {
  className?: string;
  /** Show “Add cover” cue under the icon. */
  label?: boolean;
  /** `dark` for navy surfaces. */
  tone?: "light" | "dark";
}) {
  const toneClass =
    tone === "dark"
      ? "bg-pvn-cream/10 text-pvn-gold/70"
      : "bg-gradient-to-br from-pvn-navy/[0.07] via-pvn-cream/40 to-pvn-gold/15 text-pvn-navy/40";

  return (
    <span
      className={`flex h-full w-full flex-col items-center justify-center gap-1 ${toneClass} ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 sm:h-7 sm:w-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M3 16l5-4 4 3 3-2 6 4" />
      </svg>
      {label ? (
        <span className="font-nav text-[0.5rem] font-bold tracking-[0.14em] uppercase">
          Add cover
        </span>
      ) : null}
    </span>
  );
}
