"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminImageFrame } from "@/components/admin/AdminImageFrame";
import { HostPotStatusChip } from "@/components/host/HostPotStatusChip";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import { formatWholeGbp } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type HostPot = {
  id: string;
  slug: string;
  title: string;
  status: string;
  statusLabel: string;
  type: string;
  photoUrl: string | null;
  totalRaised: number;
  targetAmount: number;
  donorCount: number;
  updatedAt: string;
};

type HostDetail = {
  id: string;
  name: string;
  email: string;
  profileSlug: string | null;
  profilePublic: boolean;
  bio: string | null;
  photoUrl: string | null;
  isAlumni: boolean;
  alumniYearsFrom: number | null;
  alumniYearsTo: number | null;
  alumniMinistry: string | null;
  alumniCity: string | null;
  alumniCountry: string | null;
  createdAt: string;
  potCount: number;
  livePots: number;
  totalRaised: number;
  pots: HostPot[];
};

type Tab = "overview" | "pots" | "alumni";

function IconEye({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-md border border-pvn-navy/15 bg-white text-pvn-navy/70 transition hover:border-pvn-gold hover:text-pvn-navy";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

export function AdminHostDetail({ id }: { id: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [host, setHost] = useState<HostDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const load = useCallback(async () => {
    const response = await adminFetch(
      `/api/admin/hosts/${encodeURIComponent(id)}`,
    );
    const json = (await response.json()) as {
      host?: HostDetail;
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
          "We could not load this host.",
        ),
      );
    }
    setHost(json.host ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    // load() awaits the request before any setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((err) => {
      if (cancelled) return;
      toast.error(
        "Host unavailable",
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

  if (loading) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3">
        <span
          className="h-7 w-7 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
          aria-hidden
        />
        <p className="font-nav text-xs font-bold tracking-[0.14em] text-pvn-navy/50 uppercase">
          Loading host…
        </p>
      </div>
    );
  }

  if (notFound || !host) {
    return (
      <div className="w-full">
        <Link
          href="/admin/hosts"
          className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
        >
          ← Hosts
        </Link>
        <div className="mx-auto mt-6 flex min-h-[42vh] max-w-lg flex-col items-center justify-center rounded-sm border border-dashed border-pvn-navy/15 bg-gradient-to-b from-pvn-cream/80 to-white px-5 py-12 text-center sm:mt-8 sm:min-h-[38vh] sm:px-10 sm:py-14">
          <h1 className="font-display text-2xl font-semibold text-pvn-navy sm:text-[1.75rem]">
            Host not found
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
            This host may have been removed, or the link is incorrect.
          </p>
          <Link
            href="/admin/hosts"
            className="font-nav mt-6 inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 sm:w-auto"
          >
            View all hosts
          </Link>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "pots", label: `Fundraisers (${host.potCount})` },
    ...(host.isAlumni ? [{ id: "alumni" as const, label: "Alumni" }] : []),
  ];

  return (
    <div className="w-full">
      <Link
        href="/admin/hosts"
        className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
      >
        ← Hosts
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold text-pvn-navy">
              {host.name}
            </h1>
            {host.isAlumni ? (
              <span className="font-nav rounded-sm border border-pvn-gold/40 bg-pvn-cream px-2 py-0.5 text-[0.55rem] font-bold tracking-[0.12em] text-pvn-navy/70 uppercase">
                Alumni
              </span>
            ) : null}
          </div>
          <p className="mt-2 break-all text-sm text-pvn-navy/60">{host.email}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {host.profilePublic && host.profileSlug ? (
            <Link
              href={`/hosts/${host.profileSlug}`}
              className="font-nav inline-flex min-h-10 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold"
            >
              Public profile
            </Link>
          ) : null}
          <Link
            href={`/admin/pots?q=${encodeURIComponent(host.email)}`}
            className="font-nav inline-flex min-h-10 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold"
          >
            All fundraisers
          </Link>
        </div>
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Host sections"
      >
        {tabs.map((t) => {
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
                  src={host.photoUrl}
                  alt=""
                  variant="avatar"
                  size="md"
                  label="No photo"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/40 uppercase">
                    Raised across fundraisers
                  </p>
                  <p className="font-display mt-1 text-2xl font-semibold text-pvn-navy sm:text-3xl">
                    {formatWholeGbp(host.totalRaised)}
                  </p>
                  <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
                    {host.potCount} {host.potCount === 1 ? "fundraiser" : "fundraisers"} ·{" "}
                    {host.livePots} live
                  </p>
                </div>
              </div>
            </section>

            <dl className="rounded-sm border border-pvn-navy/10 bg-white px-4 py-1 sm:px-5">
              <Field label="Email">{host.email}</Field>
              <Field label="Profile">
                {host.profilePublic && host.profileSlug ? (
                  <Link
                    href={`/hosts/${host.profileSlug}`}
                    className="underline decoration-pvn-gold/40"
                  >
                    /hosts/{host.profileSlug}
                  </Link>
                ) : host.profileSlug ? (
                  <span>
                    /hosts/{host.profileSlug}{" "}
                    <span className="text-pvn-navy/45">(private)</span>
                  </span>
                ) : (
                  "Not set"
                )}
              </Field>
              <Field label="Joined">{formatWhen(host.createdAt)}</Field>
              <Field label="Bio">
                {host.bio?.trim() ? (
                  <span className="whitespace-pre-wrap">{host.bio.trim()}</span>
                ) : (
                  "—"
                )}
              </Field>
            </dl>
          </div>
        ) : null}

        {tab === "pots" ? (
          host.pots.length === 0 ? (
            <p className="text-sm text-pvn-navy/55">No fundraisers for this host.</p>
          ) : (
            <div className="overflow-x-auto rounded-sm border border-pvn-navy/10 bg-white">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-pvn-navy/10 bg-pvn-cream/60">
                    <th className="font-nav px-3 py-2.5 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase">
                      Fundraiser
                    </th>
                    <th className="font-nav px-3 py-2.5 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase">
                      Status
                    </th>
                    <th className="font-nav px-3 py-2.5 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase">
                      Raised
                    </th>
                    <th className="font-nav px-3 py-2.5 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase">
                      Gifts
                    </th>
                    <th className="font-nav px-3 py-2.5 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {host.pots.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-pvn-navy/8 transition hover:bg-pvn-cream/40"
                    >
                      <td className="max-w-[16rem] px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <AdminImageFrame
                            src={p.photoUrl}
                            alt=""
                            variant="cover"
                            size="sm"
                            label="No cover"
                          />
                          <Link
                            href={`/admin/pots/${p.slug}`}
                            className="min-w-0 truncate font-medium text-pvn-navy underline decoration-pvn-gold/30 underline-offset-2 hover:decoration-pvn-gold"
                          >
                            {p.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <HostPotStatusChip status={p.status} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-pvn-navy">
                        {formatWholeGbp(p.totalRaised)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-pvn-navy/70">
                        {p.donorCount}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Link
                          href={`/admin/pots/${p.slug}`}
                          className={iconBtn}
                          aria-label={`View ${p.title}`}
                          title="View fundraiser"
                        >
                          <IconEye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === "alumni" && host.isAlumni ? (
          <dl className="rounded-sm border border-pvn-navy/10 bg-white px-4 py-1 sm:px-5">
            <Field label="Years">
              {host.alumniYearsFrom != null || host.alumniYearsTo != null
                ? `${host.alumniYearsFrom ?? "—"} – ${host.alumniYearsTo ?? "—"}`
                : "—"}
            </Field>
            <Field label="Ministry">
              {host.alumniMinistry?.trim() || "—"}
            </Field>
            <Field label="City">{host.alumniCity?.trim() || "—"}</Field>
            <Field label="Country">
              {host.alumniCountry?.trim() || "—"}
            </Field>
          </dl>
        ) : null}
      </div>
    </div>
  );
}
