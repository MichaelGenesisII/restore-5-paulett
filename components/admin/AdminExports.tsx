"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ResultModal } from "@/components/ResultModal";
import { useToast } from "@/components/toast/ToastProvider";
import { adminAccessToken, adminFetch } from "@/lib/admin-client";
import {
  clearHostClientCache,
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type ExportKind = "gift-aid" | "succeeded" | "attempts";
type Tab = "downloads" | "retention";

type PreviewCounts = Record<ExportKind, number>;

type PurgePreview = {
  eligible: number;
  recentUnfinished: number;
  cutoff: string | null;
  olderThanDays: number;
};

const fieldClass =
  "rounded-sm border border-pvn-navy/15 bg-white px-3 py-2 text-sm text-pvn-navy focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "downloads", label: "Downloads" },
  { id: "retention", label: "Retention" },
];

const EXPORTS: Array<{
  kind: ExportKind;
  title: string;
  body: string;
  primary?: boolean;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel: string;
}> = [
  {
    kind: "gift-aid",
    title: "Gift Aid claims",
    body: "Succeeded gifts with Gift Aid flagged — name, address, postcode, amount, estimated reclaim.",
    primary: true,
    confirmTitle: "Download Gift Aid CSV?",
    confirmBody:
      "This file includes donor names, emails, and addresses. Handle it as confidential staff data.",
    confirmLabel: "Download Gift Aid",
  },
  {
    kind: "succeeded",
    title: "All succeeded",
    body: "Every successful gift in range, with or without Gift Aid.",
    confirmTitle: "Download succeeded gifts?",
    confirmBody:
      "This file includes donor contact details for every succeeded gift in the selected range.",
    confirmLabel: "Download CSV",
  },
  {
    kind: "attempts",
    title: "All attempts",
    body: "Ops audit: pending, failed, succeeded, and refunded.",
    confirmTitle: "Download all attempts?",
    confirmBody:
      "This ops audit includes donor details across pending, failed, succeeded, and refunded gifts.",
    confirmLabel: "Download CSV",
  },
];

const COUNTS_CACHE_TTL_MS = 45_000;
const PURGE_CACHE_KEY = "admin-exports-purge";
const PURGE_CACHE_TTL_MS = 45_000;

function countsCacheKey(from: string, to: string) {
  return `admin-exports-counts:${from}:${to}`;
}

function AdminExportsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading exports…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-14 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-28 animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="mt-2 h-3.5 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
      </div>
      <div className="mt-6 flex gap-3 border-b border-pvn-navy/10 pb-3">
        <div className="h-4 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
      </div>
      <div className="mt-6 space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border border-pvn-navy/10 bg-white/55 px-4 py-4"
          >
            <div className="h-4 w-40 animate-pulse rounded-sm bg-pvn-navy/10" />
            <div className="h-9 w-28 animate-pulse rounded-md bg-pvn-navy/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Gift Aid / ops CSV downloads + 90-day stale attempt purge.
 */
export function AdminExports() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("downloads");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState<ExportKind | null>(null);
  const [counts, setCounts] = useState<PreviewCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsRefreshing, setCountsRefreshing] = useState(false);
  const [purge, setPurge] = useState<PurgePreview | null>(null);
  const [purgeLoading, setPurgeLoading] = useState(true);
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [purging, setPurging] = useState(false);
  const [downloadKind, setDownloadKind] = useState<ExportKind | null>(null);
  const [ready, setReady] = useState(false);

  const refreshCounts = useCallback(async (nextFrom: string, nextTo: string) => {
    const cacheKey = countsCacheKey(nextFrom, nextTo);
    const cached = readHostClientCache<PreviewCounts>(
      cacheKey,
      COUNTS_CACHE_TTL_MS,
    );
    if (cached) {
      setCounts(cached);
      setCountsLoading(false);
      setCountsRefreshing(true);
    } else {
      setCounts((prev) => {
        if (prev) setCountsRefreshing(true);
        else setCountsLoading(true);
        return prev;
      });
    }

    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    const qs = params.toString();
    const response = await adminFetch(
      `/api/admin/exports/preview${qs ? `?${qs}` : ""}`,
    );
    const json = (await response.json()) as {
      counts?: PreviewCounts;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(
        visitorSafeApiError(
          response.status,
          json.error,
          "Could not preview export counts.",
        ),
      );
    }
    const next = json.counts ?? {
      "gift-aid": 0,
      succeeded: 0,
      attempts: 0,
    };
    setCounts(next);
    writeHostClientCache(cacheKey, next);
    setCountsLoading(false);
    setCountsRefreshing(false);
  }, []);

  const refreshPurgePreview = useCallback(async () => {
    const cached = readHostClientCache<PurgePreview>(
      PURGE_CACHE_KEY,
      PURGE_CACHE_TTL_MS,
    );
    if (cached) {
      setPurge(cached);
      setPurgeLoading(false);
    } else {
      setPurgeLoading(true);
    }

    const response = await adminFetch("/api/admin/exports/purge");
    const json = (await response.json()) as Partial<PurgePreview> & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(
        visitorSafeApiError(
          response.status,
          json.error,
          "Could not check purge eligibility.",
        ),
      );
    }
    const next: PurgePreview = {
      eligible: json.eligible ?? 0,
      recentUnfinished: json.recentUnfinished ?? 0,
      cutoff: json.cutoff ?? null,
      olderThanDays: json.olderThanDays ?? 90,
    };
    setPurge(next);
    writeHostClientCache(PURGE_CACHE_KEY, next);
    setPurgeLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      // Both loaders paint the sessionStorage cache before revalidating; that
      // first render from an external store is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshCounts(from, to),
      refreshPurgePreview(),
    ])
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          "Exports unavailable",
          visitorSafeMessage(
            err instanceof Error ? err.message : null,
            "Please try again.",
          ),
        );
        setCountsLoading(false);
        setCountsRefreshing(false);
        setPurgeLoading(false);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
    // Initial load only — date changes handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    // refreshCounts() paints the sessionStorage cache before revalidating.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCounts(from, to).catch((err) => {
      if (cancelled) return;
      toast.error(
        "Export preview unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setCountsLoading(false);
      setCountsRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, ready, refreshCounts, toast]);

  async function download(kind: ExportKind) {
    setDownloading(kind);
    try {
      const token = await adminAccessToken();
      if (!token) throw new Error("Please sign in again.");

      const params = new URLSearchParams({ kind });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(
        `/api/admin/exports/gifts?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Download failed.",
          ),
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `5-paulett-${kind}.csv`;
      const rowCount = response.headers.get("X-Row-Count");

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      setDownloadKind(null);
      toast.success(
        "CSV downloaded",
        rowCount != null ? `${rowCount} rows` : undefined,
      );
    } catch (err) {
      toast.error(
        "Could not export",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setDownloading(null);
    }
  }

  const pendingExport = downloadKind
    ? (EXPORTS.find((e) => e.kind === downloadKind) ?? null)
    : null;
  const pendingCount = downloadKind ? counts?.[downloadKind] : null;

  async function runPurge() {
    setPurging(true);
    try {
      const response = await adminFetch("/api/admin/exports/purge", {
        method: "POST",
      });
      const json = (await response.json()) as {
        deleted?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Purge failed.",
          ),
        );
      }
      toast.success(
        "Purge complete",
        `${json.deleted ?? 0} ${(json.deleted ?? 0) === 1 ? "row" : "rows"} removed`,
      );
      setPurgeConfirm(false);
      clearHostClientCache(PURGE_CACHE_KEY);
      clearHostClientCache(countsCacheKey(from, to));
      await Promise.all([
        refreshPurgePreview(),
        refreshCounts(from, to),
      ]);
    } catch (err) {
      toast.error(
        "Could not purge",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setPurging(false);
    }
  }

  const rangeLabel =
    from || to ? `${from || "…"} → ${to || "…"}` : "All dates";
  const giftAidCount = counts?.["gift-aid"] ?? null;
  const eligible = purge?.eligible ?? null;
  const olderThanDays = purge?.olderThanDays ?? 90;
  const recentUnfinished = purge?.recentUnfinished ?? null;
  const cutoff = purge?.cutoff ?? null;

  if (!ready && countsLoading && purgeLoading) {
    return <AdminExportsSkeleton />;
  }

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 text-pvn-cream sm:px-6 sm:py-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(335deg, #c9a84c 16px, transparent 16px),
              linear-gradient(155deg, #c9a84c 16px, transparent 16px)
            `,
            backgroundSize: "44px 44px",
            backgroundPosition: "0 0, 22px 0",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/70 to-transparent"
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
              Exports
            </p>
            <h1 className="font-display mt-0.5 text-xl font-semibold text-balance sm:text-2xl">
              CSV downloads
            </h1>
            <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
              {countsLoading && !counts
                ? "Counting rows…"
                : giftAidCount != null
                  ? `${giftAidCount} Gift Aid ${giftAidCount === 1 ? "row" : "rows"} · ${rangeLabel}`
                  : rangeLabel}
              {countsRefreshing ? (
                <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-pvn-gold border-t-transparent align-middle" />
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/gifts?giftAid=true&status=SUCCEEDED"
              className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Gift Aid gifts
            </Link>
            <Link
              href="/admin/gifts"
              className="font-nav inline-flex min-h-9 items-center rounded-md border border-pvn-cream/30 px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              All gifts
            </Link>
          </div>
        </div>
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Exports sections"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`font-nav relative -mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[0.7rem] font-bold tracking-[0.14em] uppercase transition sm:px-4 ${
                active
                  ? "border-pvn-gold text-pvn-navy"
                  : "border-transparent text-pvn-navy/45 hover:text-pvn-navy"
              }`}
            >
              {t.label}
              {t.id === "retention" && eligible != null && eligible > 0 ? (
                <span
                  className={`ml-1.5 ${active ? "text-pvn-gold" : "text-pvn-navy/35"}`}
                >
                  {eligible}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "downloads" ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 border border-pvn-navy/10 bg-white px-4 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:px-5">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase">
                  From
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase">
                  To
                </span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={fieldClass}
                />
              </label>
              {from || to ? (
                <button
                  type="button"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                  }}
                  className="font-nav min-h-10 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase underline decoration-pvn-navy/20"
                >
                  Clear dates
                </button>
              ) : (
                <p className="pb-2 text-[0.75rem] text-pvn-navy/45 sm:ml-auto">
                  Blank = all time · created date UTC
                </p>
              )}
            </div>

            <ul className="divide-y divide-pvn-navy/8 border border-pvn-navy/10 bg-white">
              {EXPORTS.map((item) => {
                const count = counts?.[item.kind];
                const empty = count === 0;
                return (
                  <li
                    key={item.kind}
                    className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 ${
                      item.primary ? "bg-pvn-cream/30" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-sm font-medium text-pvn-navy">
                          {item.title}
                        </p>
                        {item.primary ? (
                          <span className="font-nav text-[0.55rem] font-bold tracking-[0.12em] text-pvn-gold uppercase">
                            Primary
                          </span>
                        ) : null}
                        <span className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase">
                          {countsLoading && count == null
                            ? "…"
                            : count == null
                              ? "—"
                              : `${count} ${count === 1 ? "row" : "rows"}`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[0.8rem] leading-snug text-pvn-navy/55">
                        {item.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={
                        downloading !== null ||
                        downloadKind !== null ||
                        countsLoading ||
                        empty
                      }
                      onClick={() => setDownloadKind(item.kind)}
                      className="font-nav inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-pvn-navy px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 disabled:opacity-45"
                    >
                      {downloading === item.kind
                        ? "Preparing…"
                        : empty
                          ? "No rows"
                          : "Download CSV"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {tab === "retention" ? (
          <section className="border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
            <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
              Stale attempts
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-pvn-navy/65">
              Only pending and failed attempts{" "}
              <span className="font-medium text-pvn-navy/80">
                older than {olderThanDays} days
              </span>{" "}
              are purged. Succeeded and refunded gifts are never purged. Vercel
              Cron runs this daily at 04:00 UTC when{" "}
              <code className="text-[0.8rem] text-pvn-navy/80">CRON_SECRET</code>{" "}
              is set (see Settings → Integrations). Use Purge now only if you
              need it sooner.
            </p>

            {purgeLoading && !purge ? (
              <p className="font-nav mt-6 text-xs font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
                Checking…
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {recentUnfinished != null && recentUnfinished > 0 ? (
                  <p className="border border-pvn-navy/10 bg-pvn-cream/50 px-3.5 py-3 text-sm text-pvn-navy/75">
                    <span className="font-semibold text-pvn-navy">
                      {recentUnfinished}
                    </span>{" "}
                    pending or failed{" "}
                    {recentUnfinished === 1 ? "attempt is" : "attempts are"}{" "}
                    still under {olderThanDays} days old — not eligible yet.
                    <Link
                      href="/admin/gifts?status=PENDING"
                      className="mt-1 block font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
                    >
                      View pending gifts →
                    </Link>
                  </p>
                ) : null}

                {eligible === 0 ? (
                  <div className="border border-dashed border-pvn-navy/15 bg-pvn-cream/40 px-4 py-8 text-center">
                    <p className="font-display text-xl font-semibold text-pvn-navy">
                      Nothing to purge
                    </p>
                    <p className="mt-2 text-sm text-pvn-navy/55">
                      No pending or failed attempts older than {olderThanDays}{" "}
                      days
                      {cutoff
                        ? ` (before ${new Date(cutoff).toLocaleDateString("en-GB")})`
                        : ""}
                      .
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-pvn-navy">
                      <span className="font-semibold">{eligible}</span>{" "}
                      {eligible === 1 ? "row" : "rows"} eligible to purge
                      {cutoff ? (
                        <span className="text-pvn-navy/50">
                          {" "}
                          (created before{" "}
                          {new Date(cutoff).toLocaleDateString("en-GB")})
                        </span>
                      ) : null}
                    </p>
                    <button
                      type="button"
                      disabled={purging}
                      onClick={() => setPurgeConfirm(true)}
                      className="font-nav inline-flex min-h-10 items-center justify-center rounded-md border border-red-800/30 bg-red-700/5 px-4 text-[0.65rem] font-bold tracking-[0.14em] text-red-800 uppercase transition hover:bg-red-700/10 disabled:opacity-40"
                    >
                      Purge eligible rows now
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <ResultModal
        open={downloadKind !== null}
        variant="confirm"
        title={pendingExport?.confirmTitle ?? "Download CSV?"}
        body={
          pendingExport
            ? `${pendingExport.confirmBody} About ${pendingCount ?? 0} ${(pendingCount ?? 0) === 1 ? "row" : "rows"} for ${rangeLabel}.`
            : "Confirm this download."
        }
        confirmLabel={pendingExport?.confirmLabel ?? "Download"}
        busy={downloading !== null}
        onConfirm={() => {
          if (downloadKind) void download(downloadKind);
        }}
        onClose={() => {
          if (downloading === null) setDownloadKind(null);
        }}
      />

      <ResultModal
        open={purgeConfirm}
        variant="confirm"
        title="Purge old attempts?"
        body={`This permanently deletes ${eligible ?? 0} pending or failed gift row(s) older than ${olderThanDays} days. Succeeded gifts are kept.`}
        confirmLabel="Purge now"
        busy={purging}
        onConfirm={() => void runPurge()}
        onClose={() => {
          if (!purging) setPurgeConfirm(false);
        }}
      />
    </div>
  );
}
