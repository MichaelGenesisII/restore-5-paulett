type Props = {
  status: "PAUSED" | "CLOSED";
};

/**
 * Replaces the give form when a pot is paused or closed (story still visible).
 */
export function PotLifecycleNotice({ status }: Props) {
  const paused = status === "PAUSED";

  return (
    <div className="rounded-sm border border-pvn-navy/12 bg-white/70 px-5 py-7 sm:px-6 sm:py-8">
      <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
        {paused ? "Pot paused" : "Pot closed"}
      </p>
      <h2 className="font-display mt-2 text-2xl font-semibold text-pvn-navy sm:text-3xl">
        {paused ? "Gifts are paused for now" : "This pot has finished"}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-pvn-navy/65">
        {paused
          ? "The host has paused giving on this pot. You can still read the story below. Check back later, or explore other live pots."
          : "This pot is closed and is no longer accepting gifts. The story and progress remain here as a record of what was raised."}
      </p>
      <a
        href="/fundraisers"
        className="font-nav mt-6 inline-flex min-h-11 items-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
      >
        Browse live pots
      </a>
    </div>
  );
}
