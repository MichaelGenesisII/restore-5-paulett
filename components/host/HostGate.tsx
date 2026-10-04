"use client";

import Link from "next/link";
import { HostLoginForm } from "@/components/host/HostLoginForm";

type HostGateProps = {
  error: string | null;
  onSignedIn: () => Promise<void>;
};

/**
 * Unsigned creator landing. Form leads on mobile so sign-in is above the fold;
 * desktop keeps the pitch beside a finished cream card.
 */
export function HostGate({ error, onSignedIn }: HostGateProps) {
  return (
    <div className="relative overflow-hidden rounded-sm bg-pvn-navy text-pvn-cream">
      {/* Atmosphere — restrained, not glow-heavy */}
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
            Host home
          </p>
          <h1 className="font-display hidden max-w-md text-[2.15rem] leading-[1.12] font-semibold text-balance sm:text-4xl lg:mt-3 lg:block">
            Your fundraisers. Your replies. One login.
          </h1>
          <p className="mt-0 hidden max-w-sm text-sm leading-relaxed text-pvn-cream/68 lg:mt-4 lg:block">
            Sign in with the email you used when you opened a fundraiser.
            Manage details, covers, and gift messages from here.
          </p>

          <ul className="mt-8 hidden space-y-3.5 text-sm text-pvn-cream/72 lg:block">
            {[
              "Edit fundraiser story and cover",
              "Reply once to each gift message",
              "Change your password anytime",
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

          {/* Mobile: short reassurance under the form */}
          <p className="text-center text-[0.8rem] leading-relaxed text-pvn-cream/55 lg:mt-10 lg:text-left lg:text-sm">
            New here?{" "}
            <Link
              href="/fundraisers/create"
              className="font-semibold text-pvn-gold underline decoration-pvn-gold/35 underline-offset-4 transition hover:text-pvn-gold-light"
            >
              Start a fundraiser
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
                  Host home
                </p>
              </div>
              <h2 className="font-display mt-2.5 text-[1.65rem] leading-tight font-semibold text-pvn-navy sm:text-[1.85rem] lg:text-2xl">
                Sign in
              </h2>
              <p className="mt-1.5 text-[0.8rem] leading-snug text-pvn-navy/58 sm:text-sm">
                Email and password from when you created your fundraiser.
              </p>
            </div>

            {error ? (
              <p className="mb-4 rounded-sm border border-red-700/25 bg-red-700/5 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <HostLoginForm
              tone="cream"
              submitLabel="Enter"
              onSignedIn={onSignedIn}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
