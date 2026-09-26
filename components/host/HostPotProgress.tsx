import { percentOf } from "@/lib/money";

/** Compact raised/target meter for creator portfolio rows. */
export function HostPotProgress({
  raised,
  target,
}: {
  raised: number;
  target: number;
}) {
  const pct = percentOf(raised, target);

  return (
    <div className="w-full" aria-hidden>
      <div className="relative h-[3px] w-full bg-pvn-navy/12">
        <div
          className="h-full bg-gradient-to-r from-pvn-gold to-pvn-gold-light transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        <span
          className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-pvn-gold"
          style={{ left: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase">
        {pct}% of target
      </p>
    </div>
  );
}
