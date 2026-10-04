"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminDonationStatusChip } from "@/components/admin/AdminDonationStatusChip";
import { ResultModal } from "@/components/ResultModal";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import { formatTidyGbp } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";
import { useRouter } from "next/navigation";

type GiftDetail = {
  id: string;
  amount: number;
  status: string;
  potId: string | null;
  restorationCategory: string;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  message: string | null;
  messageOriginal: string | null;
  commentHidden: boolean;
  creatorReply: string | null;
  creatorReplyAt: string | null;
  isRecurring: boolean;
  giftAid: boolean;
  donorAddressLine1: string | null;
  donorCity: string | null;
  donorPostcode: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeSubscriptionId: string | null;
  stripeInvoiceId: string | null;
  totalsApplied?: boolean;
  subscriptionCancelledAt: string | null;
  createdAt: string;
  destination: "POT" | "DIRECT";
  pot: {
    slug: string;
    title: string;
    status: string;
    fundraiser: { name: string; email: string };
  } | null;
};

type Tab = "details" | "message" | "stripe";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "message", label: "Message" },
  { id: "stripe", label: "Stripe" },
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function methodLabel(recurring: boolean) {
  return recurring ? "Card · monthly" : "Card · one-off";
}

function canDeleteGift(status: string) {
  return status === "PENDING" || status === "FAILED";
}

function CopyRow({ label, value }: { label: string; value: string | null }) {
  const toast = useToast();
  if (!value) {
    return (
      <div className="flex flex-col gap-0.5 border-b border-pvn-navy/8 py-2.5 sm:flex-row sm:gap-4">
        <dt className="font-nav w-40 shrink-0 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase">
          {label}
        </dt>
        <dd className="text-sm text-pvn-navy/35">—</dd>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 border-b border-pvn-navy/8 py-2.5 sm:flex-row sm:items-start sm:gap-4">
      <dt className="font-nav w-40 shrink-0 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1">
        <button
          type="button"
          className="break-all text-left text-sm text-pvn-navy underline decoration-pvn-navy/15 underline-offset-2 hover:decoration-pvn-gold"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(
              () => toast.success("Copied"),
              () => toast.error("Could not copy"),
            );
          }}
        >
          {value}
        </button>
      </dd>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-pvn-navy/8 py-2.5 sm:flex-row sm:gap-4">
      <dt className="font-nav w-40 shrink-0 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-pvn-navy">{children}</dd>
    </div>
  );
}

export function AdminGiftDetail({ id }: { id: string }) {
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gift, setGift] = useState<GiftDetail | null>(null);
  /** When the gift was fetched — the "pending for Nh" age is measured from it. */
  const [loadedAt, setLoadedAt] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("details");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const response = await adminFetch(
      `/api/admin/gifts/${encodeURIComponent(id)}`,
    );
    const json = (await response.json()) as {
      gift?: GiftDetail;
      error?: string;
    };
    if (response.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!response.ok) {
      throw new Error(
        visitorSafeApiError(
          response.status,
          json.error,
          "We could not load this gift.",
        ),
      );
    }
    setGift(json.gift ?? null);
    setLoadedAt(Date.now());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    // load() awaits the request before any setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((err) => {
      if (cancelled) return;
      toast.error(
        "Gift unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load, toast]);

  async function confirmDelete() {
    if (!gift) return;
    setDeleting(true);
    try {
      const response = await adminFetch(
        `/api/admin/gifts/${encodeURIComponent(gift.id)}`,
        { method: "DELETE" },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not delete gift.",
          ),
        );
      }
      toast.success("Gift deleted");
      router.push("/admin/gifts");
    } catch (err) {
      toast.error(
        "Could not delete",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3">
        <span
          className="h-7 w-7 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
          aria-hidden
        />
        <p className="font-nav text-xs font-bold tracking-[0.14em] text-pvn-navy/50 uppercase">
          Loading gift…
        </p>
      </div>
    );
  }

  if (notFound || !gift) {
    return (
      <div className="w-full">
        <Link
          href="/admin/gifts"
          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
        >
          ← Gifts
        </Link>
        <div className="mx-auto mt-6 flex min-h-[42vh] max-w-lg flex-col items-center justify-center rounded-sm border border-dashed border-pvn-navy/15 bg-gradient-to-b from-pvn-cream/80 to-white px-5 py-12 text-center sm:mt-8 sm:min-h-[38vh] sm:px-10 sm:py-14">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pvn-navy/[0.06] text-pvn-navy/45 sm:h-16 sm:w-16">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 sm:h-8 sm:w-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
              <path d="M9 11h4M11 9v4" />
            </svg>
          </span>
          <h1 className="font-display mt-5 text-2xl font-semibold text-pvn-navy sm:text-[1.75rem]">
            Gift not found
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
            This gift may have been deleted, or the link is incorrect. Check the
            gifts list for current checkout attempts.
          </p>
          <Link
            href="/admin/gifts"
            className="font-nav mt-6 inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 sm:w-auto"
          >
            View all gifts
          </Link>
        </div>
      </div>
    );
  }

  const ageHours =
    (loadedAt - new Date(gift.createdAt).getTime()) / (1000 * 60 * 60);

  return (
    <div className="w-full">
      <Link
        href="/admin/gifts"
        className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
      >
        ← Gifts
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold text-pvn-navy">
              {formatTidyGbp(gift.amount)}
            </h1>
            <AdminDonationStatusChip status={gift.status} />
          </div>
          <p className="mt-2 text-sm text-pvn-navy/60">
            {formatWhen(gift.createdAt)}
            {gift.status === "PENDING" && ageHours >= 1
              ? ` · pending ${Math.floor(ageHours)}h`
              : null}
          </p>
        </div>
        {canDeleteGift(gift.status) ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="font-nav inline-flex min-h-10 items-center justify-center rounded-md border border-red-800/30 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-red-800 uppercase"
          >
            Delete attempt
          </button>
        ) : null}
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Gift sections"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`font-nav shrink-0 border-b-2 px-3 py-2.5 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition ${
                active
                  ? "border-pvn-gold text-pvn-navy"
                  : "border-transparent text-pvn-navy/45 hover:text-pvn-navy"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "details" ? (
          <dl className="rounded-sm border border-pvn-navy/10 bg-white px-4 py-1 sm:px-5">
            <Field label="Where">
              {gift.pot ? (
                <span>
                  Pot{" "}
                  <Link
                    href={`/pots/${gift.pot.slug}`}
                    className="font-medium underline decoration-pvn-gold/40 underline-offset-2"
                  >
                    {gift.pot.title}
                  </Link>
                  <span className="text-pvn-navy/45">
                    {" "}
                    ({gift.pot.status.toLowerCase()})
                  </span>
                  <br />
                  <span className="text-pvn-navy/55">
                    Host: {gift.pot.fundraiser.name} ·{" "}
                    {gift.pot.fundraiser.email}
                  </span>
                </span>
              ) : (
                <span>Direct /give</span>
              )}
            </Field>
            <Field label="Method">
              {methodLabel(gift.isRecurring)}
            </Field>
            <Field label="Category">
              {gift.restorationCategory.replaceAll("_", " ").toLowerCase()}
            </Field>
            <Field label="Donor name">
              {gift.isAnonymous
                ? `${gift.donorName?.trim() || "—"} (anonymous on public page)`
                : gift.donorName?.trim() || "—"}
            </Field>
            <Field label="Email">{gift.donorEmail?.trim() || "—"}</Field>
            <Field label="Gift Aid">{gift.giftAid ? "Yes" : "No"}</Field>
            {gift.giftAid ? (
              <>
                <Field label="Address">
                  {gift.donorAddressLine1?.trim() || "—"}
                </Field>
                <Field label="City">{gift.donorCity?.trim() || "—"}</Field>
                <Field label="Postcode">
                  {gift.donorPostcode?.trim() || "—"}
                </Field>
              </>
            ) : null}
          </dl>
        ) : null}

        {tab === "message" ? (
          <dl className="rounded-sm border border-pvn-navy/10 bg-white px-4 py-1 sm:px-5">
            <Field label="Message">
              {gift.message?.trim() ? (
                <span className="whitespace-pre-wrap">
                  {gift.message.trim()}
                </span>
              ) : (
                "—"
              )}
              {gift.commentHidden ? (
                <span className="mt-1 block text-pvn-navy/45">
                  Hidden from public pot page
                </span>
              ) : null}
            </Field>
            {gift.messageOriginal?.trim() &&
            gift.messageOriginal !== gift.message ? (
              <Field label="Original message">
                <span className="whitespace-pre-wrap text-pvn-navy/70">
                  {gift.messageOriginal.trim()}
                </span>
              </Field>
            ) : null}
            <Field label="Host reply">
              {gift.creatorReply?.trim() ? (
                <>
                  <span className="whitespace-pre-wrap">
                    {gift.creatorReply.trim()}
                  </span>
                  {gift.creatorReplyAt ? (
                    <span className="mt-1 block text-pvn-navy/45">
                      {formatWhen(gift.creatorReplyAt)}
                    </span>
                  ) : null}
                </>
              ) : (
                "—"
              )}
            </Field>
          </dl>
        ) : null}

        {tab === "stripe" ? (
          <dl className="rounded-sm border border-pvn-navy/10 bg-white px-4 py-1 sm:px-5">
            <CopyRow label="Donation id" value={gift.id} />
            <CopyRow
              label="Checkout session"
              value={gift.stripeCheckoutSessionId}
            />
            <CopyRow
              label="Payment intent"
              value={gift.stripePaymentIntentId}
            />
            <CopyRow label="Subscription" value={gift.stripeSubscriptionId} />
            <CopyRow
              label="Subscription cancelled"
              value={
                gift.subscriptionCancelledAt
                  ? formatWhen(gift.subscriptionCancelledAt)
                  : gift.stripeSubscriptionId
                    ? "Active (or unknown)"
                    : null
              }
            />
            <CopyRow label="Invoice" value={gift.stripeInvoiceId} />
            <CopyRow
              label="Wall totals applied"
              value={gift.totalsApplied === false ? "No — retry may apply" : "Yes"}
            />
          </dl>
        ) : null}
      </div>

      <ResultModal
        open={deleteOpen}
        variant="confirm"
        title="Delete this gift attempt?"
        body="This permanently removes a pending or failed checkout row."
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
      />
    </div>
  );
}
