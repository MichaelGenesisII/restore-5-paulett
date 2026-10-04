"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminImageFrame } from "@/components/admin/AdminImageFrame";
import { HostPotStatusChip } from "@/components/host/HostPotStatusChip";
import { ResultModal } from "@/components/ResultModal";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import { formatWholeGbp } from "@/lib/money";
import type { PotLifecycleStatus } from "@/lib/pot-lifecycle";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type Transition = {
  status: PotLifecycleStatus;
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
};

type PotDetail = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  statusLabel: string;
  story: string | null;
  founderStory: string | null;
  photoUrl: string | null;
  totalRaised: number;
  targetAmount: number;
  donorCount: number;
  restorationCategory: string;
  donationAttempts: number;
  createdAt: string;
  updatedAt: string;
  fundraiser: {
    id: string;
    name: string;
    email: string;
    profileSlug: string | null;
    profilePublic: boolean;
    isAlumni: boolean;
  };
  transitions: Transition[];
};

type Tab = "overview" | "story" | "moderation";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "story", label: "Story" },
  { id: "moderation", label: "Moderation" },
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

export function AdminPotDetail({ slug }: { slug: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [pot, setPot] = useState<PotDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [pending, setPending] = useState<Transition | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await adminFetch(
      `/api/admin/pots/${encodeURIComponent(slug)}`,
    );
    const json = (await response.json()) as {
      pot?: PotDetail;
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
          "We could not load this pot.",
        ),
      );
    }
    setPot(json.pot ?? null);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    // load() awaits the request before any setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((err) => {
      if (cancelled) return;
      toast.error(
        "Pot unavailable",
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

  async function applyStatus(to: Transition) {
    setBusy(true);
    try {
      const response = await adminFetch(
        `/api/admin/pots/${encodeURIComponent(slug)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: to.status }),
        },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Status change failed.",
          ),
        );
      }
      toast.success(`Pot is now ${to.label.toLowerCase()}`);
      setPending(null);
      await load();
    } catch (err) {
      toast.error(
        "Could not update status",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setBusy(false);
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
          Loading pot…
        </p>
      </div>
    );
  }

  if (notFound || !pot) {
    return (
      <div className="w-full">
        <Link
          href="/admin/pots"
          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
        >
          ← Pots
        </Link>
        <div className="mx-auto mt-6 flex min-h-[42vh] max-w-lg flex-col items-center justify-center rounded-sm border border-dashed border-pvn-navy/15 bg-gradient-to-b from-pvn-cream/80 to-white px-5 py-12 text-center sm:mt-8 sm:min-h-[38vh] sm:px-10 sm:py-14">
          <h1 className="font-display text-2xl font-semibold text-pvn-navy sm:text-[1.75rem]">
            Pot not found
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
            This pot may have been removed, or the link is incorrect.
          </p>
          <Link
            href="/admin/pots"
            className="font-nav mt-6 inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 sm:w-auto"
          >
            View all pots
          </Link>
        </div>
      </div>
    );
  }

  const progressPct =
    pot.targetAmount > 0
      ? Math.min(100, Math.round((pot.totalRaised / pot.targetAmount) * 100))
      : 0;

  return (
    <div className="w-full">
      <Link
        href="/admin/pots"
        className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
      >
        ← Pots
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold text-pvn-navy">
              {pot.title}
            </h1>
            <HostPotStatusChip status={pot.status} />
          </div>
          <p className="mt-2 text-sm text-pvn-navy/60">
            /{pot.slug} · {pot.type.replaceAll("_", " ").toLowerCase()}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={`/pots/${pot.slug}`}
            className="font-nav inline-flex min-h-10 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold"
          >
            Public page
          </Link>
          <Link
            href={`/admin/gifts?q=${encodeURIComponent(pot.slug)}`}
            className="font-nav inline-flex min-h-10 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold"
          >
            Gifts
          </Link>
        </div>
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Pot sections"
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
        {tab === "overview" ? (
          <div className="space-y-6">
            <section className="rounded-sm border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                <AdminImageFrame
                  src={pot.photoUrl}
                  alt={`Cover for ${pot.title}`}
                  variant="cover"
                  size="md"
                  label="No cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/40 uppercase">
                    Raised
                  </p>
                  <p className="font-display mt-1 text-2xl font-semibold text-pvn-navy sm:text-3xl">
                    {formatWholeGbp(pot.totalRaised)}
                    <span className="text-lg font-normal text-pvn-navy/40">
                      {" "}
                      / {formatWholeGbp(pot.targetAmount)}
                    </span>
                  </p>
                  <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
                    {progressPct}% · {pot.donorCount}{" "}
                    {pot.donorCount === 1 ? "gift" : "gifts"} ·{" "}
                    {pot.donationAttempts} attempts
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-pvn-navy/10">
                    <div
                      className="h-full rounded-full bg-pvn-gold"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <dl className="rounded-sm border border-pvn-navy/10 bg-white px-4 py-1 sm:px-5">
              <Field label="Host">
                {pot.fundraiser.name} · {pot.fundraiser.email}
                {pot.fundraiser.isAlumni ? " · Alumni" : ""}
                {pot.fundraiser.profilePublic && pot.fundraiser.profileSlug ? (
                  <>
                    {" · "}
                    <Link
                      href={`/hosts/${pot.fundraiser.profileSlug}`}
                      className="underline decoration-pvn-gold/40"
                    >
                      Public profile
                    </Link>
                  </>
                ) : null}
              </Field>
              <Field label="Category">
                {pot.restorationCategory.replaceAll("_", " ").toLowerCase()}
              </Field>
              <Field label="Created">{formatWhen(pot.createdAt)}</Field>
              <Field label="Updated">{formatWhen(pot.updatedAt)}</Field>
            </dl>
          </div>
        ) : null}

        {tab === "story" ? (
          <dl className="rounded-sm border border-pvn-navy/10 bg-white px-4 py-1 sm:px-5">
            <Field label="Story">
              {pot.story?.trim() ? (
                <span className="whitespace-pre-wrap">{pot.story.trim()}</span>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Founder story">
              {pot.founderStory?.trim() ? (
                <span className="whitespace-pre-wrap">
                  {pot.founderStory.trim()}
                </span>
              ) : (
                "—"
              )}
            </Field>
          </dl>
        ) : null}

        {tab === "moderation" ? (
          <section className="rounded-sm border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
            <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
              Status actions
            </h2>
            <p className="mt-2 max-w-lg text-sm text-pvn-navy/60">
              Same lifecycle rules as Host home. Unseeded pots cannot be forced
              live from Needs seed without a gift.
            </p>
            {pot.transitions.length === 0 ? (
              <p className="mt-5 text-sm text-pvn-navy/50">
                No status changes available from here.
              </p>
            ) : (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {pot.transitions.map((t) => (
                  <button
                    key={t.status}
                    type="button"
                    onClick={() => setPending(t)}
                    className="font-nav inline-flex min-h-10 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:border-pvn-gold"
                  >
                    {t.confirmLabel}
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <ResultModal
        open={pending !== null}
        variant="confirm"
        title={pending?.title ?? ""}
        body={pending?.body ?? ""}
        confirmLabel={pending?.confirmLabel ?? "Confirm"}
        busy={busy}
        onConfirm={() => {
          if (pending) void applyStatus(pending);
        }}
        onClose={() => {
          if (!busy) setPending(null);
        }}
      />
    </div>
  );
}
