"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ResultModal } from "@/components/ResultModal";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import {
  clearHostClientCache,
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type StripeMode = "test" | "live" | "unknown" | "missing";

type SettingsPayload = {
  signedInAs: string;
  adminAllowlistConfigured: boolean;
  adminAllowlistCount: number;
  envAdminCount: number;
  cronSecretConfigured: boolean;
  stripeSecretConfigured: boolean;
  stripeWebhookConfigured: boolean;
  stripeMode: StripeMode;
  supabaseConfigured: boolean;
  resendConfigured: boolean;
  appUrl: string | null;
  latestSucceededAt: string | null;
  issues: string[];
  healthy: boolean;
};

type DbAdmin = {
  id: string;
  email: string;
  addedBy: string | null;
  createdAt: string;
  source: "database";
};

type AdminsPayload = {
  envEmails: string[];
  dbAdmins: DbAdmin[];
  signedInAs: string;
};

type Tab = "overview" | "admins" | "password" | "integrations" | "links";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "admins", label: "Admins" },
  { id: "password", label: "Password" },
  { id: "integrations", label: "Integrations" },
  { id: "links", label: "Links" },
];

const SETTINGS_CACHE_KEY = "admin-settings";
const SETTINGS_CACHE_TTL_MS = 45_000;
const ADMINS_CACHE_KEY = "admin-settings-admins";
const ADMINS_CACHE_TTL_MS = 45_000;

const fieldClass =
  "mt-1.5 w-full rounded-sm border border-pvn-navy/15 bg-white px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/40 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/55 uppercase";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripeModeLabel(mode: StripeMode) {
  switch (mode) {
    case "test":
      return "Test mode";
    case "live":
      return "Live mode";
    case "unknown":
      return "Key present";
    case "missing":
      return "Missing";
  }
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`font-nav text-[0.6rem] font-bold tracking-[0.12em] uppercase ${
        ok ? "text-emerald-800" : "text-amber-800"
      }`}
    >
      {label}
    </span>
  );
}

function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-pvn-navy/8 px-4 py-3.5 text-sm last:border-0 sm:px-5">
      <dt className="text-pvn-navy/70">{label}</dt>
      <dd className="text-right">
        <StatusPill ok={ok} label={ok ? "Configured" : "Missing"} />
        {detail ? (
          <span className="mt-0.5 block text-[0.75rem] text-pvn-navy/45">
            {detail}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function AdminSettingsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading settings…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-16 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-32 animate-pulse rounded-sm bg-pvn-cream/20" />
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
      <div className="mt-6 space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border border-pvn-navy/10 bg-white/55 px-4 py-4"
          >
            <div className="h-4 w-36 animate-pulse rounded-sm bg-pvn-navy/10" />
            <div className="h-3 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Ops health + email-based admin allowlist management.
 */
export function AdminSettings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [admins, setAdmins] = useState<AdminsPayload | null>(null);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsRefreshing, setAdminsRefreshing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<DbAdmin | null>(null);
  const [removing, setRemoving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);

  const loadSettings = useCallback(async (soft: boolean) => {
    const cached = readHostClientCache<SettingsPayload>(
      SETTINGS_CACHE_KEY,
      SETTINGS_CACHE_TTL_MS,
    );
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else if (soft) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const response = await adminFetch("/api/admin/settings");
    const json = (await response.json()) as SettingsPayload & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(
        visitorSafeApiError(
          response.status,
          json.error,
          "Could not load settings.",
        ),
      );
    }
    setData(json);
    writeHostClientCache(SETTINGS_CACHE_KEY, json);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadAdmins = useCallback(async (soft: boolean) => {
    const cached = readHostClientCache<AdminsPayload>(
      ADMINS_CACHE_KEY,
      ADMINS_CACHE_TTL_MS,
    );
    if (cached) {
      setAdmins(cached);
      setAdminsLoading(false);
      setAdminsRefreshing(true);
    } else if (soft) {
      setAdminsRefreshing(true);
    } else {
      setAdminsLoading(true);
    }

    try {
      const response = await adminFetch("/api/admin/admins");
      const json = (await response.json()) as AdminsPayload & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not load admins.",
          ),
        );
      }
      setAdmins(json);
      writeHostClientCache(ADMINS_CACHE_KEY, json);
    } finally {
      setAdminsLoading(false);
      setAdminsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const softSettings = Boolean(
      readHostClientCache(SETTINGS_CACHE_KEY, SETTINGS_CACHE_TTL_MS),
    );
    const softAdmins = Boolean(
      readHostClientCache(ADMINS_CACHE_KEY, ADMINS_CACHE_TTL_MS),
    );
    void Promise.all([
      // Both loaders paint the sessionStorage cache before revalidating; that
      // first render from an external store is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSettings(softSettings),
      loadAdmins(softAdmins),
    ]).catch((err) => {
      if (cancelled) return;
      toast.error(
        "Settings unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setLoading(false);
      setRefreshing(false);
      setAdminsLoading(false);
      setAdminsRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadSettings, loadAdmins, toast]);

  async function onAddAdmin(event: FormEvent) {
    event.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    setAdding(true);
    try {
      const response = await adminFetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await response.json()) as {
        error?: string;
        admin?: DbAdmin;
        accountCreated?: boolean;
        inviteSent?: boolean;
        temporaryPassword?: string | null;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not add admin.",
          ),
        );
      }
      setNewEmail("");
      if (!json.inviteSent && json.temporaryPassword) {
        try {
          await navigator.clipboard.writeText(json.temporaryPassword);
          toast.success(
            "Admin added — copy this password",
            `Invite email failed. Temporary password copied for ${json.admin?.email ?? email}: ${json.temporaryPassword}`,
          );
        } catch {
          toast.success(
            "Admin added — save this password",
            `Invite email failed. Temporary password for ${json.admin?.email ?? email}: ${json.temporaryPassword}`,
          );
        }
      } else {
        const detail = json.inviteSent
          ? json.accountCreated
            ? "Invite emailed with a temporary password."
            : "Invite emailed — they already had a login."
          : "Added to allowlist, but the invite email did not send. Ask them to use Forgot password on /admin.";
        toast.success("Admin added", detail);
      }
      clearHostClientCache(ADMINS_CACHE_KEY);
      clearHostClientCache(SETTINGS_CACHE_KEY);
      await Promise.all([loadAdmins(true), loadSettings(true)]);
    } catch (err) {
      toast.error(
        "Could not add",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setAdding(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const response = await adminFetch(
        `/api/admin/admins/${encodeURIComponent(removeTarget.id)}`,
        { method: "DELETE" },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not remove admin.",
          ),
        );
      }
      toast.success("Admin removed", removeTarget.email);
      setRemoveTarget(null);
      clearHostClientCache(ADMINS_CACHE_KEY);
      clearHostClientCache(SETTINGS_CACHE_KEY);
      await Promise.all([loadAdmins(true), loadSettings(true)]);
    } catch (err) {
      toast.error(
        "Could not remove",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setRemoving(false);
    }
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(
        "Passwords do not match",
        "Type the same new password twice.",
      );
      return;
    }

    setPasswordPending(true);
    try {
      const response = await adminFetch("/api/admin/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not update your password. Please try again.",
          ),
        );
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(
        "Password updated",
        "Use your new password next time you sign in.",
      );
    } catch (err) {
      toast.error(
        "Could not update",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setPasswordPending(false);
    }
  }

  if (loading && !data) return <AdminSettingsSkeleton />;

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[36vh] max-w-lg flex-col items-center justify-center border border-dashed border-pvn-navy/15 px-5 py-12 text-center">
        <h1 className="font-display text-2xl font-semibold text-pvn-navy">
          Settings unavailable
        </h1>
        <p className="mt-2 text-sm text-pvn-navy/60">
          We could not load health checks. Try again from overview.
        </p>
        <Link
          href="/admin"
          className="font-nav mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase"
        >
          Back to overview
        </Link>
      </div>
    );
  }

  const issueCount = data.issues.length;
  const adminCountLabel = data.adminAllowlistConfigured
    ? `${data.adminAllowlistCount} ${data.adminAllowlistCount === 1 ? "admin" : "admins"}`
    : "No admins";

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
              Settings
            </p>
            <h1 className="font-display mt-0.5 text-xl font-semibold text-balance sm:text-2xl">
              System Operational Health
            </h1>
            <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
              {data.healthy
                ? `All checks ok · ${adminCountLabel}`
                : `${issueCount} ${issueCount === 1 ? "issue" : "issues"} · ${adminCountLabel}`}
              {refreshing ? (
                <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-pvn-gold border-t-transparent align-middle" />
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("admins")}
              className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Manage admins
            </button>
            <Link
              href="/admin/exports"
              className="font-nav inline-flex min-h-9 items-center rounded-md border border-pvn-cream/30 px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              Exports
            </Link>
          </div>
        </div>
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Settings sections"
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
              {t.id === "overview" && !data.healthy ? (
                <span
                  className={`ml-1.5 ${active ? "text-pvn-gold" : "text-pvn-navy/35"}`}
                >
                  {issueCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "overview" ? (
          <div className="space-y-5">
            <section className="border border-pvn-navy/10 bg-white px-4 py-4 sm:px-5">
              <p className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/40 uppercase">
                Signed in as
              </p>
              <p className="mt-1 break-all text-sm font-medium text-pvn-navy">
                {data.signedInAs}
              </p>
              <p className="mt-2 text-[0.8rem] text-pvn-navy/55">
                {adminCountLabel}
                {" · "}
                Stripe: {stripeModeLabel(data.stripeMode)}
              </p>
            </section>

            {data.issues.length > 0 ? (
              <section className="border border-amber-800/25 bg-amber-50/60 px-4 py-4 sm:px-5">
                <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-amber-900/80 uppercase">
                  Needs attention
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-950/80">
                  {data.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setTab("integrations")}
                  className="font-nav mt-3 text-[0.65rem] font-bold tracking-[0.12em] text-amber-900 uppercase"
                >
                  View integrations →
                </button>
              </section>
            ) : (
              <section className="border border-emerald-800/20 bg-emerald-50/40 px-4 py-4 sm:px-5">
                <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-emerald-900/70 uppercase">
                  Healthy
                </h2>
                <p className="mt-2 text-sm text-pvn-navy/65">
                  Core env checks look good. Secrets are never shown here.
                </p>
              </section>
            )}

            <section className="border border-pvn-navy/10 bg-white px-4 py-4 sm:px-5">
              <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                Recent payment activity
              </h2>
              <p className="mt-2 text-sm text-pvn-navy/65">
                {data.latestSucceededAt
                  ? `Last succeeded gift ${formatWhen(data.latestSucceededAt)}. Useful when diagnosing “slow confirm” vs missing webhooks.`
                  : "No succeeded gifts yet — webhook health is harder to judge until money flows."}
              </p>
              <Link
                href="/admin/gifts?status=SUCCEEDED"
                className="font-nav mt-3 inline-block text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
              >
                View succeeded gifts →
              </Link>
            </section>
          </div>
        ) : null}

        {tab === "admins" ? (
          <div className="space-y-5">
            <section className="border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
              <h2 className="font-display text-xl font-semibold text-pvn-navy">
                Who can sign in
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-pvn-navy/60">
                Every person listed here has full admin access — there are no
                role tiers. We create a Supabase login if they need one and email
                an invite (with a temporary password when the account is new).
                Direct /give gift notices and contact-form pings still go only to{" "}
                <code className="text-[0.8rem] text-pvn-navy/80">
                  ADMIN_EMAILS
                </code>{" "}
                — by design, so desk-only staff are not flooded.
              </p>

              <form
                onSubmit={(e) => void onAddAdmin(e)}
                className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <label className="min-w-0 flex-1">
                  <span className={labelClass}>Email</span>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ops@example.org"
                    className={fieldClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={adding || !newEmail.trim()}
                  className="font-nav inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 disabled:opacity-40"
                >
                  {adding ? "Adding…" : "Add admin"}
                </button>
              </form>
            </section>

            {adminsLoading && !admins ? (
              <div className="space-y-2" aria-busy="true">
                <span className="sr-only">Loading admins…</span>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border border-pvn-navy/10 bg-white/55 px-4 py-4"
                  >
                    <div className="h-4 w-48 animate-pulse rounded-sm bg-pvn-navy/10" />
                    <div className="h-3 w-14 animate-pulse rounded-sm bg-pvn-navy/10" />
                  </div>
                ))}
              </div>
            ) : admins ? (
              <div className="space-y-4">
                {admins.envEmails.length > 0 ? (
                  <section>
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <h3 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                        From environment
                      </h3>
                      {adminsRefreshing ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-pvn-gold border-t-transparent" />
                      ) : null}
                    </div>
                    <p className="mb-2 text-[0.8rem] text-pvn-navy/50">
                      Set in{" "}
                      <code className="text-pvn-navy/70">ADMIN_EMAILS</code>.
                      Remove by editing env, not here.
                    </p>
                    <ul className="divide-y divide-pvn-navy/8 border border-pvn-navy/10 bg-white">
                      {admins.envEmails.map((email) => (
                        <li
                          key={email}
                          className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                        >
                          <span className="min-w-0 break-all text-sm font-medium text-pvn-navy">
                            {email}
                          </span>
                          <span className="font-nav shrink-0 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase">
                            Env
                            {email === admins.signedInAs ? " · You" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section>
                  <h3 className="font-nav mb-2 text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                    Added in settings
                  </h3>
                  {admins.dbAdmins.length === 0 ? (
                    <p className="border border-dashed border-pvn-navy/15 bg-pvn-cream/40 px-4 py-8 text-center text-sm text-pvn-navy/55">
                      No extra admins yet. Add an email above.
                    </p>
                  ) : (
                    <ul className="divide-y divide-pvn-navy/8 border border-pvn-navy/10 bg-white">
                      {admins.dbAdmins.map((row) => (
                        <li
                          key={row.id}
                          className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="break-all text-sm font-medium text-pvn-navy">
                              {row.email}
                            </p>
                            <p className="mt-0.5 text-[0.75rem] text-pvn-navy/45">
                              Added {formatWhen(row.createdAt)}
                              {row.addedBy ? ` by ${row.addedBy}` : ""}
                              {row.email === admins.signedInAs ? " · You" : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={row.email === admins.signedInAs}
                            onClick={() => setRemoveTarget(row)}
                            className="font-nav shrink-0 self-start text-[0.65rem] font-bold tracking-[0.12em] text-red-800/80 uppercase transition hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-35 sm:self-center"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : (
              <p className="text-sm text-pvn-navy/55">
                Could not load the admin list.
              </p>
            )}
          </div>
        ) : null}

        {tab === "password" ? (
          <form
            onSubmit={(e) => void onChangePassword(e)}
            className="max-w-md space-y-5 border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5"
          >
            <div>
              <h2 className="font-display text-xl font-semibold text-pvn-navy">
                Change password
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-pvn-navy/60">
                Replace a temporary invite password with one you will remember.
                You will use this the next time you sign in to the Operations
                Desk.
              </p>
            </div>

            <label className="block">
              <span className={labelClass}>Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={fieldClass}
              />
            </label>

            <button
              type="submit"
              disabled={
                passwordPending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="font-nav inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-gold px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-40"
            >
              {passwordPending ? "Saving…" : "Update password"}
            </button>
          </form>
        ) : null}

        {tab === "integrations" ? (
          <dl className="border border-pvn-navy/10 bg-white">
            <StatusRow
              label="Admin allowlist"
              ok={data.adminAllowlistConfigured}
              detail={
                data.adminAllowlistConfigured
                  ? `${data.adminAllowlistCount} address${data.adminAllowlistCount === 1 ? "" : "es"} (${data.envAdminCount} env)`
                  : undefined
              }
            />
            <StatusRow
              label="Stripe secret key"
              ok={data.stripeSecretConfigured}
              detail={stripeModeLabel(data.stripeMode)}
            />
            <StatusRow
              label="Stripe webhook secret"
              ok={data.stripeWebhookConfigured}
            />
            <StatusRow
              label="Cron secret (stale-attempt purge)"
              ok={data.cronSecretConfigured}
              detail="Daily 04:00 UTC · pending/failed only, older than 90 days"
            />
            <StatusRow label="Supabase" ok={data.supabaseConfigured} />
            <StatusRow
              label="Resend (giving emails)"
              ok={data.resendConfigured}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3.5 text-sm sm:px-5">
              <dt className="text-pvn-navy/70">App URL</dt>
              <dd className="max-w-[min(100%,20rem)] break-all text-right text-pvn-navy/60">
                {data.appUrl ?? "Not set"}
              </dd>
            </div>
          </dl>
        ) : null}

        {tab === "links" ? (
          <ul className="divide-y divide-pvn-navy/8 border border-pvn-navy/10 bg-white">
            <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-pvn-navy">
                  Stripe Dashboard
                </p>
                <p className="mt-0.5 text-[0.8rem] leading-snug text-pvn-navy/55">
                  Payments, webhooks, and test vs live mode.
                </p>
              </div>
              <a
                href={
                  data.stripeMode === "test"
                    ? "https://dashboard.stripe.com/test"
                    : "https://dashboard.stripe.com"
                }
                target="_blank"
                rel="noreferrer"
                className="font-nav inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-pvn-navy px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90"
              >
                Open Stripe
              </a>
            </li>
            <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-pvn-navy">
                  Building fund
                </p>
                <p className="mt-0.5 text-[0.8rem] leading-snug text-pvn-navy/55">
                  Edit campaign target. Raised stays Stripe-owned.
                </p>
              </div>
              <Link
                href="/admin/building-fund"
                className="font-nav inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold"
              >
                Open fund
              </Link>
            </li>
            <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-pvn-navy">Exports</p>
                <p className="mt-0.5 text-[0.8rem] leading-snug text-pvn-navy/55">
                  Gift Aid CSV and ops audits.
                </p>
              </div>
              <Link
                href="/admin/exports"
                className="font-nav inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold"
              >
                Open exports
              </Link>
            </li>
          </ul>
        ) : null}
      </div>

      <ResultModal
        open={removeTarget !== null}
        variant="confirm"
        title="Remove admin?"
        body={
          removeTarget
            ? `${removeTarget.email} will no longer be able to open /admin. They need a Supabase account again only if you re-add them.`
            : "Remove this admin?"
        }
        confirmLabel="Remove"
        busy={removing}
        onConfirm={() => void confirmRemove()}
        onClose={() => {
          if (!removing) setRemoveTarget(null);
        }}
      />
    </div>
  );
}
