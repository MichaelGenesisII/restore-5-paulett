/** Donation status chip for admin gift lists. */

const STYLES: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-500/15 text-amber-900 ring-amber-600/20",
  },
  SUCCEEDED: {
    label: "Succeeded",
    className: "bg-emerald-600/10 text-emerald-900 ring-emerald-700/15",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-700/10 text-red-800 ring-red-700/20",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-pvn-navy/8 text-pvn-navy/60 ring-pvn-navy/12",
  },
};

export function AdminDonationStatusChip({ status }: { status: string }) {
  const style = STYLES[status] ?? {
    label: status.replaceAll("_", " "),
    className: "bg-pvn-navy/8 text-pvn-navy/55 ring-pvn-navy/10",
  };

  return (
    <span
      className={`font-nav inline-flex items-center rounded-sm px-2 py-0.5 text-[0.6rem] font-bold tracking-[0.14em] uppercase ring-1 ring-inset ${style.className}`}
    >
      {style.label}
    </span>
  );
}
