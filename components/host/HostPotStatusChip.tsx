/** Human status chip for creator pot lists (not raw enum). */

const STYLES: Record<
  string,
  { label: string; className: string; onDarkClassName: string }
> = {
  PENDING: {
    label: "Needs seed",
    className: "bg-amber-500/15 text-amber-950 ring-amber-700/25",
    onDarkClassName: "bg-amber-400/20 text-amber-200 ring-amber-300/35",
  },
  ACTIVE: {
    label: "Live",
    className: "bg-emerald-600/10 text-emerald-950 ring-emerald-700/20",
    onDarkClassName: "bg-emerald-400/20 text-emerald-200 ring-emerald-300/35",
  },
  PAUSED: {
    label: "Paused",
    className: "bg-sky-600/10 text-sky-950 ring-sky-700/20",
    onDarkClassName: "bg-sky-400/20 text-sky-200 ring-sky-300/35",
  },
  DISABLED: {
    label: "Hidden",
    className: "bg-pvn-navy/8 text-pvn-navy/55 ring-pvn-navy/10",
    onDarkClassName: "bg-pvn-cream/10 text-pvn-cream/65 ring-pvn-cream/20",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-pvn-navy/8 text-pvn-navy/55 ring-pvn-navy/10",
    onDarkClassName: "bg-pvn-cream/10 text-pvn-cream/65 ring-pvn-cream/20",
  },
};

export function HostPotStatusChip({
  status,
  onDark = false,
}: {
  status: string;
  /** Lighter contrast for navy surfaces. */
  onDark?: boolean;
}) {
  const style = STYLES[status] ?? {
    label: status.replaceAll("_", " "),
    className: "bg-pvn-navy/8 text-pvn-navy/55 ring-pvn-navy/10",
    onDarkClassName: "bg-pvn-cream/10 text-pvn-cream/65 ring-pvn-cream/20",
  };

  return (
    <span
      className={`font-nav inline-flex items-center rounded-sm px-2 py-0.5 text-[0.6rem] font-bold tracking-[0.14em] uppercase ring-1 ring-inset ${
        onDark ? style.onDarkClassName : style.className
      }`}
    >
      {style.label}
    </span>
  );
}
