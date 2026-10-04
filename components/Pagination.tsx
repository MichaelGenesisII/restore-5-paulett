import Link from "next/link";

const linkClass =
  "font-nav inline-flex min-h-11 items-center gap-2 border border-pvn-navy/15 px-3.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold";

/** Previous / page x of y / next. Renders nothing for a single page. */
export function Pagination({
  currentPage,
  totalPages,
  hrefFor,
  label,
}: {
  currentPage: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-10 flex items-center justify-between gap-3 border-t border-pvn-navy/10 pt-6 sm:mt-12"
      aria-label={label}
    >
      {currentPage > 1 ? (
        <Link href={hrefFor(currentPage - 1)} className={linkClass}>
          <span aria-hidden>←</span> Previous
        </Link>
      ) : (
        <span className="min-w-0 flex-1 sm:flex-none" />
      )}
      <span className="font-nav shrink-0 text-center text-[0.7rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link href={hrefFor(currentPage + 1)} className={linkClass}>
          Next <span aria-hidden>→</span>
        </Link>
      ) : (
        <span className="min-w-0 flex-1 sm:flex-none" />
      )}
    </nav>
  );
}
