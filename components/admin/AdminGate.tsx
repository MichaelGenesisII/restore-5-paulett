"use client";

import Link from "next/link";
import { HostLoginForm } from "@/components/host/HostLoginForm";

type AdminGateProps = {
  error: string | null;
  onSignedIn: () => Promise<void>;
};

/**
 * Unsigned admin landing — same composition as HostGate; allowlist enforced
 * by /api/admin/me after sign-in.
 */
export function AdminGate({ error, onSignedIn }: AdminGateProps) {
  return (
    <div className="relative overflow-hidden rounded-sm bg-pvn-navy text-pvn-cream">
      {/* Atmosphere — match HostGate */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(335deg, #c9a84c 16px, transparent 16px),
            linear-gradient(155deg, #c9a84c 16px, transparent 16px)
          `,
          backgroundSize: "48px 48px",
          backgroundPosition: "0 0, 24px 0",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/70 to-transparent"
        aria-hidden
      />

      <div className="relative grid lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,22rem)] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        {/* Copy — below the form on mobile */}
        <div className="order-2 flex flex-col justify-center px-5 pb-8 pt-6 sm:px-7 sm:pb-10 sm:pt-8 lg:order-1 lg:border-r lg:border-pvn-cream/10 lg:px-10 lg:py-14 xl:px-12">
          <p className="font-nav hidden text-[0.65rem] font-bold tracking-[0.22em] text-pvn-gold uppercase lg:block">
            Admin
          </p>
          <h1 className="font-display hidden max-w-md text-[2.15rem] leading-[1.12] font-semibold text-balance sm:text-4xl lg:mt-3 lg:block">
            Gifts, pots, and house ops.
          </h1>
          <p className="mt-0 hidden max-w-sm text-sm leading-relaxed text-pvn-cream/68 lg:mt-4 lg:block">
            Sign in with a staff email on the admin allowlist. Exports, inbox,
            and hosts live here.
          </p>

          <ul className="mt-8 hidden space-y-3.5 text-sm text-pvn-cream/72 lg:block">
            {[
              "Review gifts and Gift Aid exports",
              "Moderate inbox and pot hosts",
              "Manage who else can open this desk",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-pvn-gold"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="text-center text-[0.8rem] leading-relaxed text-pvn-cream/55 lg:mt-10 lg:text-left lg:text-sm">
            Looking for your pot?{" "}
            <Link
              href="/host"
              className="font-semibold text-pvn-gold underline decoration-pvn-gold/35 underline-offset-4 transition hover:text-pvn-gold-light"
            >
              Host home
            </Link>
          </p>
        </div>

        {/* Form — first on mobile */}
        <div className="order-1 px-4 pt-5 sm:px-6 sm:pt-7 lg:order-2 lg:flex lg:items-center lg:px-8 lg:py-12 xl:px-10">
          <div className="w-full rounded-sm border border-pvn-cream/12 bg-pvn-cream p-5 text-pvn-navy shadow-[0_24px_48px_-28px_rgba(0,0,0,0.55)] sm:p-6">
            <div className="mb-5">
              <div className="flex items-center gap-2.5">
                <span className="h-px w-5 bg-pvn-gold" aria-hidden />
                <p className="font-nav text-[0.62rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                  Admin
                </p>
              </div>
              <h2 className="font-display mt-2.5 text-[1.65rem] leading-tight font-semibold text-pvn-navy sm:text-[1.85rem] lg:text-2xl">
                Sign in
              </h2>
              <p className="mt-1.5 text-[0.8rem] leading-snug text-pvn-navy/58 sm:text-sm">
                Staff email and password. Access is checked against the
                allowlist.
              </p>
            </div>

            {error ? (
              <p
                role="alert"
                className="mb-4 rounded-sm border border-red-700/25 bg-red-700/5 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}

            <HostLoginForm
              tone="cream"
              submitLabel="Enter"
              workingLabel="Checking access…"
              passwordResetAudience="admin"
              onSignedIn={onSignedIn}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
