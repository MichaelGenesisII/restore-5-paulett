import { Suspense } from "react";
import { AdminGiftsList } from "@/components/admin/AdminGiftsList";

function GiftsPageFallback() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading gifts…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-14 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-28 animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="mt-2 h-3.5 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
      </div>
      <div className="mt-6 flex gap-3 border-b border-pvn-navy/10 pb-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10"
          />
        ))}
      </div>
    </div>
  );
}

export default function AdminGiftsPage() {
  return (
    <Suspense fallback={<GiftsPageFallback />}>
      <AdminGiftsList />
    </Suspense>
  );
}
