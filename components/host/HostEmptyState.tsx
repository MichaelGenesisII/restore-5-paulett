import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
};

/**
 * Calm empty composition for creator screens — one job, one CTA.
 */
export function HostEmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  children,
}: Props) {
  return (
    <div className="relative mt-8 overflow-hidden border border-dashed border-pvn-navy/15 bg-gradient-to-br from-white/70 via-pvn-cream/40 to-pvn-gold/5 px-5 py-10 text-center sm:px-8 sm:py-12">
      <span
        className="pointer-events-none absolute top-0 left-0 h-8 w-8 border-t border-l border-pvn-gold/50"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-0 bottom-0 h-8 w-8 border-r border-b border-pvn-gold/50"
        aria-hidden
      />
      <p className="font-nav text-[0.6rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
        Quiet for now
      </p>
      <h2 className="font-display mt-3 text-2xl font-semibold text-pvn-navy sm:text-3xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pvn-navy/60">
        {body}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="font-nav mt-6 inline-flex min-h-11 items-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
        >
          {actionLabel}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
