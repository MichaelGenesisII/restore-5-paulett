/**
 * Depth of the inward arc, in pixels.
 * Lower = flatter, higher = deeper dip.
 */
export const ARC_DEPTH = 34;

/** How far the gold ring sits inside the navy, past the cream edge, in pixels. */
export const ARC_RING_INSET = 12;

/**
 * Breathing room between an arc and the content it caps, in pixels. This is the
 * knob for a section's overall height — the arcs claim their own space first.
 */
export const ARC_EDGE_GAP = 26;

/** Padding a navy field needs on an arced edge for the curve to clear its content. */
export const ARC_SPACE = ARC_DEPTH + ARC_RING_INSET + ARC_EDGE_GAP;

/**
 * Concave cream arc with an inward-offset gold ring — used on the edges of a
 * navy field against the cream page. The cap sets the curve; the ring and echo
 * repeat it further in, so the gold always reads against navy rather than the
 * cream boundary.
 */
export function ArcEdge({ side }: { side: "top" | "bottom" }) {
  const isTop = side === "top";

  const radius = isTop
    ? {
        borderBottomLeftRadius: `50% ${ARC_DEPTH}px`,
        borderBottomRightRadius: `50% ${ARC_DEPTH}px`,
      }
    : {
        borderTopLeftRadius: `50% ${ARC_DEPTH}px`,
        borderTopRightRadius: `50% ${ARC_DEPTH}px`,
      };

  const offset = (px: number) =>
    isTop ? { top: `${px}px` } : { bottom: `${px}px` };

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 z-10 bg-pvn-cream"
        aria-hidden
        style={{ ...offset(0), height: `${ARC_DEPTH}px`, ...radius }}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 z-10 border-pvn-gold ${
          isTop ? "border-b-2" : "border-t-2"
        }`}
        aria-hidden
        style={{ ...offset(ARC_RING_INSET), height: `${ARC_DEPTH}px`, ...radius }}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 z-10 border-pvn-gold/25 ${
          isTop ? "border-b" : "border-t"
        }`}
        aria-hidden
        style={{
          ...offset(ARC_RING_INSET + 12),
          height: `${ARC_DEPTH}px`,
          ...radius,
        }}
      />
      {/* Keystone bead at the deepest point of the ring; the navy ring around it
          breaks the gold line so the arc reads as struck rather than drawn. */}
      <span
        className={`pointer-events-none absolute left-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-pvn-gold ring-[3px] ring-pvn-navy ${
          isTop ? "-translate-y-1/2" : "translate-y-1/2"
        }`}
        aria-hidden
        style={offset(ARC_RING_INSET + ARC_DEPTH)}
      />
    </>
  );
}
