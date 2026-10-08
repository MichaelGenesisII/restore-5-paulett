"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ResultModal } from "@/components/ResultModal";
import { useToast } from "@/components/toast/ToastProvider";
import { GiftAidAddressFields } from "@/components/give/GiftAidAddressFields";
import { parseGiftMode, type GiftMode } from "@/lib/gift-mode";
import {
  MAX_DONATION_PENCE,
  MIN_DONATION_PENCE,
  MIN_POT_SEED_PENCE,
  formatTidyGbp,
  formatWholeGbp,
  giftAidBonusPence,
  poundsToPence,
} from "@/lib/money";
import {
  clearGiveDraft,
  readGiveDraft,
  readRememberedGiver,
  writeGiveDraft,
  writeRememberedGiver,
} from "@/lib/give-draft";
import { getBrowserSession } from "@/lib/supabase-browser";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

const modes: { value: GiftMode; label: string }[] = [
  { value: "card_once", label: "Once" },
  { value: "card_monthly", label: "Monthly" },
];

/** One-off ladder climbs; the monthly ladder starts where a monthly gift starts. */
const ONE_OFF_PRESETS = [2500, 5000, 10_000, 25_000, 50_000];
const MONTHLY_PRESETS = [500, 1000, 2500, 5000, 10_000];

const fieldClass =
  "w-full rounded-sm border border-pvn-navy/15 bg-white/70 px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/45 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.7rem] font-bold uppercase tracking-[0.16em] text-pvn-navy/70";

/** Deliberately loose — the real check is whether the receipt ever arrives. */
function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type ResumeKind = "cancelled" | "failed";

function defaultPreset(seedRequired: boolean) {
  return seedRequired ? MIN_POT_SEED_PENCE : 5000;
}

/** A linked amount lands on its chip when there is one, otherwise in "Another amount". */
function amountFields(pence: number | null | undefined, seedRequired: boolean) {
  if (!pence) return { preset: defaultPreset(seedRequired), custom: "" };
  if (ONE_OFF_PRESETS.includes(pence)) return { preset: pence, custom: "" };
  return { preset: null, custom: (pence / 100).toFixed(pence % 100 ? 2 : 0) };
}

/**
 * One screen: amount first, then optional details, then one button to Stripe.
 * Stripe's page is the confirmation; Gift Aid can also be added afterwards.
 */
export function GiveForm({
  potSlug,
  resume,
  seedRequired = false,
  initialAmountPence,
}: {
  potSlug?: string;
  /** Returned from Stripe without completing. */
  resume?: ResumeKind;
  /** First gift that opens a PENDING pot — £25 floor. */
  seedRequired?: boolean;
  /** From `?amount=` in a share link or the pot header chips. */
  initialAmountPence?: number | null;
}) {
  const toast = useToast();
  const minGiftPence = seedRequired ? MIN_POT_SEED_PENCE : MIN_DONATION_PENCE;
  const [notice, setNotice] = useState<ResumeKind | null>(resume ?? null);

  const initial = amountFields(initialAmountPence, seedRequired);
  const [giftMode, setGiftMode] = useState<GiftMode>("card_once");
  const [preset, setPreset] = useState<number | null>(initial.preset);
  const [custom, setCustom] = useState(initial.custom);

  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [remember, setRemember] = useState(false);

  const [giftAid, setGiftAid] = useState(false);
  const [donorAddressLine1, setDonorAddressLine1] = useState("");
  const [donorCity, setDonorCity] = useState("");
  const [donorPostcode, setDonorPostcode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Restore answers after Stripe’s full-page return (SSR cannot read sessionStorage). */
  useLayoutEffect(() => {
    const saved = readGiveDraft(potSlug);
    if (!saved) return;

    // sessionStorage only exists after hydration, so this one-time restore has
    // to happen here; a layout effect applies it before the first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGiftMode(parseGiftMode({ giftMode: saved.giftMode }));
    setPreset(saved.preset);
    setCustom(saved.custom);
    setDonorName(saved.donorName);
    setDonorEmail(saved.donorEmail);
    setMessage(saved.message);
    setIsAnonymous(saved.isAnonymous);
    setGiftAid(saved.giftAid);
    setDonorAddressLine1(saved.donorAddressLine1);
    setDonorCity(saved.donorCity);
    setDonorPostcode(saved.donorPostcode);
    if (saved.message || saved.isAnonymous) setExtrasOpen(true);
  }, [potSlug]);

  /** Prefill: remembered on this device first, then a signed-in host. */
  useEffect(() => {
    let cancelled = false;
    const remembered = readRememberedGiver();
    if (remembered) {
      // localStorage only exists after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemember(true);
      setDonorName((current) => current || remembered.name);
      setDonorEmail((current) => current || remembered.email);
      return;
    }
    void getBrowserSession(4_000).then(({ session }) => {
      if (cancelled || !session?.user.email) return;
      const metaName = session.user.user_metadata?.name;
      setDonorEmail((current) => current || session.user.email!.toLowerCase());
      if (typeof metaName === "string") {
        setDonorName((current) => current || metaName);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // `resume` and `initialAmountPence` can change without a remount (soft
  // navigation to the same page with new search params).
  const [syncedResume, setSyncedResume] = useState(resume);
  if (resume !== syncedResume) {
    setSyncedResume(resume);
    if (resume) {
      setNotice(resume);
      setError(null);
    }
  }
  const [syncedAmount, setSyncedAmount] = useState(initialAmountPence);
  if (initialAmountPence !== syncedAmount) {
    setSyncedAmount(initialAmountPence);
    if (initialAmountPence) {
      const next = amountFields(initialAmountPence, seedRequired);
      setGiftMode("card_once");
      setPreset(next.preset);
      setCustom(next.custom);
    }
  }

  const recurring = giftMode !== "card_once";
  const presets = (recurring ? MONTHLY_PRESETS : ONE_OFF_PRESETS).filter(
    (value) => value >= minGiftPence,
  );
  const modeIndex = modes.findIndex((mode) => mode.value === giftMode);

  const amountPence = useMemo(
    () => (custom.trim() ? poundsToPence(custom) : preset),
    [custom, preset],
  );

  const valid =
    amountPence !== null &&
    amountPence >= minGiftPence &&
    amountPence <= MAX_DONATION_PENCE;

  const bonus = valid ? giftAidBonusPence(amountPence) : 0;
  const per = recurring ? " a month" : "";

  function givePath() {
    return potSlug ? `/pots/${potSlug}` : "/give";
  }

  function clearResumeFromUrl() {
    window.history.replaceState(null, "", givePath());
  }

  function dismissNotice() {
    setNotice(null);
    setError(null);
    clearResumeFromUrl();
  }

  function restart() {
    clearGiveDraft(potSlug);
    const fresh = amountFields(null, seedRequired);
    setGiftMode("card_once");
    setPreset(fresh.preset);
    setCustom("");
    setMessage("");
    setIsAnonymous(false);
    setGiftAid(false);
    setDonorAddressLine1("");
    setDonorCity("");
    setDonorPostcode("");
    setExtrasOpen(false);
    setError(null);
    setPending(false);
    setNotice(null);
    clearResumeFromUrl();
  }

  function problem(): string | null {
    if (amountPence === null) return "Choose an amount, or type your own.";
    if (amountPence < minGiftPence) {
      return seedRequired
        ? `The first gift that opens this fundraiser must be at least ${formatWholeGbp(minGiftPence)}.`
        : `The smallest gift we can take is ${formatWholeGbp(minGiftPence)}.`;
    }
    if (amountPence > MAX_DONATION_PENCE) {
      return `Gifts above ${formatWholeGbp(MAX_DONATION_PENCE)} need to go through us directly — please get in touch.`;
    }
    if (recurring && !looksLikeEmail(donorEmail)) {
      return "Monthly gifts need an email, so each receipt reaches you.";
    }
    if (donorEmail.trim() && !looksLikeEmail(donorEmail)) {
      return "That email does not look right — fix it or leave it blank.";
    }
    if (giftAid) {
      if (!donorName.trim()) return "Gift Aid needs your full name.";
      if (!donorAddressLine1.trim() || !donorCity.trim() || !donorPostcode.trim()) {
        return "Gift Aid needs your home address, town or city, and postcode.";
      }
    }
    return null;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const issue = problem();
    if (issue) {
      setError(issue);
      return;
    }

    setError(null);
    setPending(true);

    writeRememberedGiver(
      remember ? { name: donorName.trim(), email: donorEmail.trim() } : null,
    );

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence,
          potSlug,
          giftMode,
          isAnonymous,
          giftAid,
          donorName: donorName.trim() || undefined,
          donorEmail: donorEmail.trim() || undefined,
          message: message.trim() || undefined,
          donorAddressLine1: giftAid ? donorAddressLine1.trim() : undefined,
          donorCity: giftAid ? donorCity.trim() : undefined,
          donorPostcode: giftAid ? donorPostcode.trim() : undefined,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            data.error,
            "We could not start checkout. Please try again.",
          ),
        );
      }

      writeGiveDraft(
        {
          giftMode,
          preset,
          custom,
          donorName,
          donorEmail,
          message,
          isAnonymous,
          giftAid,
          donorAddressLine1,
          donorCity,
          donorPostcode,
        },
        potSlug,
      );
      window.location.href = data.url;
    } catch (err) {
      setPending(false);
      toast.error(
        "We could not open checkout",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Nothing has been taken — your answers are still here.",
        ),
      );
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative overflow-hidden rounded-sm border border-pvn-navy/10 bg-white/70 shadow-[0_24px_60px_-34px_rgba(12,27,51,0.5)]"
    >
      <div className="h-1 w-full bg-pvn-gold" aria-hidden />

      <fieldset disabled={pending} className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-7">
        <legend className="sr-only">Give to the restoration</legend>

        {seedRequired ? (
          <p className="rounded-sm border border-pvn-gold/40 bg-pvn-gold/10 px-3.5 py-3 text-sm leading-relaxed text-pvn-navy/75">
            This fundraiser is not on the wall yet. The first gift must be at
            least {formatWholeGbp(minGiftPence)}.
          </p>
        ) : null}

        <div>
          <div
            role="radiogroup"
            aria-label="How often would you like to give?"
            className="relative grid grid-cols-2 gap-1.5 rounded-sm border border-pvn-navy/12 bg-pvn-navy/[0.03] p-1.5"
          >
            {/* The selected pill slides between options rather than blinking */}
            <span
              className="pointer-events-none absolute inset-y-1.5 left-1.5 rounded-sm bg-pvn-navy shadow-[0_10px_24px_-14px_rgba(12,27,51,0.9)] transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              aria-hidden
              style={{
                width: "calc((100% - 1.125rem) / 2)",
                transform: `translateX(calc(${modeIndex} * (100% + 0.375rem)))`,
              }}
            />
            {modes.map((mode) => {
              const active = giftMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setGiftMode(mode.value);
                    setPreset(
                      mode.value === "card_once" ? defaultPreset(seedRequired) : 2500,
                    );
                    setCustom("");
                    setError(null);
                  }}
                  className={`font-nav relative z-10 min-h-11 rounded-sm px-2 text-[0.7rem] font-bold tracking-[0.1em] uppercase transition-colors duration-300 ease-out sm:text-xs ${
                    active ? "text-pvn-cream" : "text-pvn-navy/70 hover:text-pvn-navy"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {presets.map((value) => {
              const active = !custom.trim() && preset === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setPreset(value);
                    setCustom("");
                    setError(null);
                  }}
                  className={`font-nav relative min-h-12 overflow-hidden rounded-sm border text-sm font-bold tracking-tight transition duration-300 ease-out active:scale-95 active:duration-100 ${
                    active
                      ? "pvn-amount-active border-pvn-gold bg-pvn-gold text-pvn-navy shadow-[0_10px_24px_-14px_rgba(201,168,76,0.9)]"
                      : "border-pvn-navy/15 bg-white/60 text-pvn-navy hover:-translate-y-0.5 hover:border-pvn-gold/60 hover:bg-pvn-gold/10"
                  }`}
                >
                  {formatWholeGbp(value)}
                </button>
              );
            })}
          </div>

          <label
            htmlFor="give-custom"
            className="mt-2 flex items-center gap-3 rounded-sm border border-pvn-navy/15 bg-white/60 px-3.5 transition focus-within:border-pvn-gold focus-within:ring-2 focus-within:ring-pvn-gold/30"
          >
            <span className="font-nav text-lg font-bold text-pvn-navy/50">£</span>
            <input
              id="give-custom"
              inputMode="decimal"
              value={custom}
              onChange={(event) => {
                setCustom(event.target.value);
                setError(null);
              }}
              placeholder={recurring ? "Another amount a month" : "Another amount"}
              className="font-nav min-h-12 w-full bg-transparent text-lg font-bold tracking-tight text-pvn-navy placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-pvn-navy/45 focus:outline-none"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="give-name" className={labelClass}>
                Your name{" "}
                <span className="tracking-normal normal-case text-pvn-navy/40">
                  {giftAid ? "(for Gift Aid)" : "(optional)"}
                </span>
              </label>
              <input
                id="give-name"
                className={fieldClass}
                value={donorName}
                onChange={(event) => setDonorName(event.target.value)}
                autoComplete="name"
                maxLength={120}
                placeholder="Tolu Adeyemi"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="give-email" className={labelClass}>
                Email{" "}
                <span className="tracking-normal normal-case text-pvn-navy/40">
                  {recurring ? "(for receipts)" : "(optional)"}
                </span>
              </label>
              <input
                id="give-email"
                type="email"
                className={fieldClass}
                value={donorEmail}
                onChange={(event) => {
                  setDonorEmail(event.target.value);
                  setError(null);
                }}
                autoComplete="email"
                maxLength={254}
                placeholder="you@example.com"
              />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-pvn-navy/50">
            {recurring
              ? "We send a receipt for every monthly gift."
              : "Skip these if you like — the payment page asks for an email for your receipt and uses the name on your card."}
          </p>
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-pvn-gold/40 bg-pvn-gold/[0.08] px-4 py-3 transition hover:border-pvn-gold/70">
            <input
              type="checkbox"
              checked={giftAid}
              onChange={(event) => {
                setGiftAid(event.target.checked);
                setError(null);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-pvn-navy"
            />
            <span className="min-w-0 text-sm leading-relaxed text-pvn-navy/75">
              <span className="font-semibold text-pvn-navy">
                Add Gift Aid{valid ? ` (+${formatTidyGbp(bonus)}${per})` : ""}
              </span>{" "}
              — free if you pay UK tax. Or add it after paying.
            </span>
          </label>

          <div className="pvn-reveal" data-open={giftAid} aria-hidden={!giftAid}>
            <div>
              <div className="pt-4">
                <GiftAidAddressFields
                  value={{
                    line1: donorAddressLine1,
                    city: donorCity,
                    postcode: donorPostcode,
                  }}
                  onChange={(next) => {
                    setDonorAddressLine1(next.line1);
                    setDonorCity(next.city);
                    setDonorPostcode(next.postcode);
                  }}
                  fieldClass={fieldClass}
                  labelClass={labelClass}
                />
                <p className="mt-3 text-xs leading-relaxed text-pvn-navy/60">
                  I am a UK taxpayer and understand that if I pay less Income
                  Tax or Capital Gains Tax in the current tax year than the
                  Gift Aid claimed on all my donations, it is my responsibility
                  to pay the difference.
                </p>
              </div>
            </div>
          </div>
        </div>

        <details
          open={extrasOpen}
          onToggle={(event) => setExtrasOpen(event.currentTarget.open)}
          className="group"
        >
          <summary className="font-nav flex cursor-pointer list-none items-center gap-2 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/60 uppercase transition hover:text-pvn-navy [&::-webkit-details-marker]:hidden">
            <span className="text-pvn-gold transition group-open:rotate-45" aria-hidden>
              +
            </span>
            Leave a word or give quietly
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="give-message" className="sr-only">
                Leave a word with your gift
              </label>
              <textarea
                id="give-message"
                className={`${fieldClass} min-h-20 resize-y`}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={280}
                placeholder="A verse, a memory, or why this house matters to you."
              />
              <p className="text-right text-[0.7rem] text-pvn-navy/45 tabular-nums">
                {message.length}/280
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-pvn-navy"
              />
              <span className="text-sm leading-relaxed text-pvn-navy/70">
                <span className="font-semibold text-pvn-navy">Give quietly</span>{" "}
                — your gift shows on the wall, your name does not.
              </span>
            </label>
          </div>
        </details>

        {error ? (
          <p
            role="alert"
            className="pvn-figure rounded-sm border border-red-700/30 bg-red-700/5 px-3.5 py-2.5 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            className="pvn-give-submit font-nav relative inline-flex min-h-14 w-full items-center justify-center overflow-hidden rounded-md bg-pvn-gold px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-pvn-navy uppercase transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-pvn-gold-light hover:shadow-[0_16px_34px_-16px_rgba(201,168,76,0.95)] active:translate-y-0 active:scale-[0.99] active:duration-100 disabled:translate-y-0 disabled:opacity-60"
          >
            <span
              className="pvn-give-submit-glint pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
              aria-hidden
            />
            <span
              key={`cta-${pending}-${amountPence ?? 0}-${giftMode}`}
              className="pvn-figure relative inline-flex items-center gap-2"
            >
              {pending
                ? "Taking you to checkout…"
                : valid && amountPence !== null
                  ? `Give ${formatTidyGbp(amountPence)}${per}`
                  : "Give"}
            </span>
          </button>
          <label className="flex cursor-pointer items-center justify-center gap-2 text-xs text-pvn-navy/55">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-3.5 w-3.5 accent-pvn-navy"
            />
            Remember my name and email on this device
          </label>
        </div>
      </fieldset>

      <p className="border-t border-pvn-navy/10 px-4 py-4 text-center text-xs leading-relaxed text-pvn-navy/60 sm:px-8">
        Card, Apple Pay or Google Pay on Stripe’s secure page — nothing is
        taken until you pay there.{" "}
        {seedRequired
          ? `First gift from ${formatWholeGbp(minGiftPence)}.`
          : `Smallest gift ${formatWholeGbp(minGiftPence)}${recurring ? " a month" : ""}.`}
      </p>

      {/* Returned from Stripe without completing */}
      <ResultModal
        open={notice !== null}
        variant={notice === "failed" ? "error" : "confirm"}
        title={
          notice === "failed"
            ? "That payment did not go through"
            : "Checkout paused"
        }
        body={
          notice === "failed"
            ? "Your bank or card provider stopped it. Nothing was charged. Your answers are still here."
            : "You left the payment page before finishing. Nothing was charged. Your answers are still here."
        }
        confirmLabel="Try again"
        actionLabel="Start over"
        onConfirm={dismissNotice}
        onSecondary={restart}
        onClose={dismissNotice}
      />
    </form>
  );
}
