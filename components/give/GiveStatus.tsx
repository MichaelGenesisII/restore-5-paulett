"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ResultModal } from "@/components/ResultModal";
import { clearAllGiveDrafts } from "@/lib/give-draft";
import { formatTidyGbp, formatWholeGbp } from "@/lib/money";

type StatusResponse = {
  status?: string;
  amount?: number;
  potSlug?: string | null;
  potTotalRaised?: number | null;
  buildingFundTotalRaised?: number;
  isSeedGift?: boolean;
};

/**
 * Totals are credited by the Stripe webhook, never by this redirect — so the
 * page asks the server what actually happened rather than assuming.
 * All outcomes are announced with modals; nothing permanent sits above the form.
 */
export function GiveProcessing({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/donations/status?session_id=${encodeURIComponent(sessionId)}`,
        );
        const json = (await response.json()) as StatusResponse;
        if (cancelled) return;

        setData(json);

        if (json.status === "FAILED") {
          const failPath = json.potSlug ? `/pots/${json.potSlug}` : "/give";
          router.replace(`${failPath}?checkout=failed`, { scroll: false });
          return;
        }

        if (json.status === "SUCCEEDED") return;
        if (attempts >= 40) {
          setTimedOut(true);
          return;
        }
      } catch {
        if (cancelled) return;
        if (attempts >= 40) {
          setTimedOut(true);
          return;
        }
      }

      // Fast early polls (webhook often lands in <2s); then ease off.
      const delayMs =
        attempts <= 4 ? 400 : attempts <= 10 ? 1000 : 2000;
      window.setTimeout(poll, delayMs);
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  useEffect(() => {
    if (data?.status !== "SUCCEEDED") return;
    clearAllGiveDrafts(data.potSlug);
  }, [data?.status, data?.potSlug]);

  const status = data?.status;
  const potSlug = data?.potSlug ?? null;
  const isSeedGift = data?.isSeedGift === true;
  const potPath = potSlug ? `/pots/${potSlug}` : null;

  function clearProcessingUrl(fallback = "/give") {
    const target = potPath ?? (pathname.startsWith("/pots/") ? pathname : fallback);
    router.replace(target, { scroll: false });
  }

  if (status === "FAILED") {
    return null;
  }

  if (status === "SUCCEEDED") {
    if (isSeedGift && potPath && potSlug) {
      return (
        <ResultModal
          open={!announced}
          variant="success"
          title="Your pot is open"
          body={
            typeof data?.amount === "number"
              ? `${formatTidyGbp(data.amount)} opened the pot. It is on the wall now.`
              : "Your seed gift opened the pot. It is on the wall now."
          }
          actionLabel={null}
          onClose={() => {
            setAnnounced(true);
            clearProcessingUrl(potPath);
          }}
        >
          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href={potPath}
              onClick={() => {
                setAnnounced(true);
                clearProcessingUrl(potPath);
              }}
              className="font-nav inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              View your pot
            </Link>
            <Link
              href={`/host/pots/${potSlug}`}
              onClick={() => {
                setAnnounced(true);
                clearProcessingUrl(potPath);
              }}
              className="font-nav inline-flex min-h-11 items-center justify-center rounded-md border border-pvn-navy/25 px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              Manage this pot
            </Link>
          </div>
        </ResultModal>
      );
    }

    return (
      <ResultModal
        open={!announced}
        variant="success"
        title="Your gift is in"
        body={
          typeof data?.amount === "number"
            ? potPath && typeof data.potTotalRaised === "number"
              ? `${formatTidyGbp(data.amount)} is in. This pot now stands at ${formatWholeGbp(data.potTotalRaised)}.`
              : `${formatTidyGbp(data.amount)} is in the stonework. The total now stands at ${formatWholeGbp(data?.buildingFundTotalRaised ?? 0)}.`
            : `Your gift is in the stonework. The total now stands at ${formatWholeGbp(data?.buildingFundTotalRaised ?? 0)}.`
        }
        actionLabel={potPath ? "Back to the pot" : null}
        onClose={() => {
          setAnnounced(true);
          clearProcessingUrl();
        }}
      >
        {!potPath ? (
          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/fundraisers/create"
              onClick={() => {
                setAnnounced(true);
                clearProcessingUrl();
              }}
              className="font-nav inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Start a pot
            </Link>
            <Link
              href="/the-wall"
              onClick={() => {
                setAnnounced(true);
                clearProcessingUrl();
              }}
              className="font-nav inline-flex min-h-11 items-center justify-center rounded-md border border-pvn-navy/25 px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              See the wall rising
            </Link>
          </div>
        ) : null}
      </ResultModal>
    );
  }

  if (timedOut) {
    return (
      <ResultModal
        open
        variant="confirm"
        title="This is taking longer than usual"
        body="Your payment is with Stripe and is not lost. Confirmation sometimes lags a little."
        confirmLabel="Refresh page"
        actionLabel="Got it"
        onConfirm={() => window.location.reload()}
        onClose={() => clearProcessingUrl()}
      >
        <p className="text-center text-sm text-pvn-navy/65">
          Still unsure?{" "}
          <Link
            href="/contact"
            className="font-semibold text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4"
          >
            Write to us
          </Link>
          .
        </p>
      </ResultModal>
    );
  }

  return (
    <ResultModal
      open
      variant="waiting"
      title="Confirming your gift"
      body="Stripe has your payment. We are waiting for confirmation before we count it — a redirect alone is never proof."
      onClose={() => {}}
    />
  );
}
