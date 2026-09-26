"use client";

/**
 * The progress rail shared by the giving and pot wizards: numbered pips on a
 * line that fills with gold as you advance, and step-back navigation for
 * anything already reached.
 */
export function StepRail({
  labels,
  current,
  furthest,
  onJump,
}: {
  /** Kept short — these sit under the pips on anything wider than a phone. */
  labels: readonly string[];
  current: number;
  furthest: number;
  onJump: (index: number) => void;
}) {
  const last = labels.length - 1;

  return (
    <ol className="relative flex items-start justify-between gap-1">
      <span
        className="absolute top-3.5 right-4 left-4 h-px bg-pvn-cream/20"
        aria-hidden
      />
      <span
        className="absolute top-3.5 right-4 left-4 h-px origin-left bg-pvn-gold transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        aria-hidden
        style={{ transform: `scaleX(${last === 0 ? 1 : current / last})` }}
      />

      {labels.map((label, index) => {
        const done = index < current;
        const active = index === current;
        const reachable = index <= furthest;

        return (
          <li key={label} className="relative z-10">
            <button
              type="button"
              onClick={() => onJump(index)}
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
              className="group flex flex-col items-center gap-2 disabled:cursor-default"
            >
              <span
                className={`font-nav flex h-7 w-7 items-center justify-center rounded-full border text-[0.65rem] font-bold transition duration-[400ms] ease-out ${
                  active
                    ? "scale-110 border-pvn-gold bg-pvn-gold text-pvn-navy shadow-[0_0_0_4px_rgba(201,168,76,0.18)]"
                    : done
                      ? "border-pvn-gold bg-pvn-gold/15 text-pvn-gold group-hover:bg-pvn-gold/30"
                      : "border-pvn-cream/25 bg-pvn-navy text-pvn-cream/45"
                }`}
              >
                {done ? (
                  <svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M2 6.5 4.6 9 10 3.5" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={`font-nav hidden text-[0.6rem] font-bold tracking-[0.14em] uppercase transition-colors duration-300 sm:block ${
                  active
                    ? "text-pvn-cream"
                    : done
                      ? "text-pvn-cream/60"
                      : "text-pvn-cream/35"
                }`}
              >
                {label}
              </span>
              <span className="sr-only">
                Step {index + 1}: {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
