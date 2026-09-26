import { formatGbp } from "@/lib/money";

type Props = {
  raised: number;
  target: number;
};

export function ProgressBar({ raised, target }: Props) {
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between text-sm text-pvn-navy">
        <span className="font-medium">{formatGbp(raised)} raised</span>
        <span className="text-pvn-stone">
          {pct}% of {formatGbp(target)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-pvn-navy/10">
        <div
          className="h-full rounded-full bg-pvn-gold"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
