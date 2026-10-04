"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ResultModal } from "@/components/ResultModal";
import { StepRail } from "@/components/StepRail";
import { useToast } from "@/components/toast/ToastProvider";
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
  writeGiveDraft,
} from "@/lib/give-draft";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";
import { GiftAidAddressFields } from "@/components/give/GiftAidAddressFields";

const modes: { value: GiftMode; label: string; note: string }[] = [
  { value: "card_once", label: "Once", note: "A single gift, by card." },
  {
    value: "card_monthly",
    label: "Monthly",
    note: "A gift every month by card, until you stop it.",
  },
];

/** One-off ladder climbs; the monthly ladder starts where a monthly gift starts. */
const ONE_OFF_PRESETS = [2500, 5000, 10_000, 25_000, 50_000];
const MONTHLY_PRESETS = [500, 1000, 2500, 5000, 10_000];

const steps = [
  { title: "About you", lead: "Who is taking this part of the wall?" },
  { title: "Your gift", lead: "How often, and how much." },
  { title: "Gift Aid", lead: "Let the taxman add a quarter." },
  { title: "Review", lead: "One last look before Stripe." },
] as const;

const LAST = steps.length - 1;

const fieldClass =
  "w-full rounded-sm border border-pvn-navy/15 bg-white/70 px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/45 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.7rem] font-bold uppercase tracking-[0.16em] text-pvn-navy/70";

/** Deliberately loose — the real check is whether the receipt ever arrives. */
function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type ResumeKind = "cancelled" | "failed";

export function GiveForm({
  potSlug,
  resume,
  seedRequired = false,
}: {
  potSlug?: string;
  /** Returned from Stripe without completing — handled inside the wizard. */
  resume?: ResumeKind;
  /** First gift that opens a PENDING pot — £25 floor. */
  seedRequired?: boolean;
}) {
  const toast = useToast();
  const minGiftPence = seedRequired ? MIN_POT_SEED_PENCE : MIN_DONATION_PENCE;
  const [step, setStep] = useState(resume ? LAST : 0);
  const [furthest, setFurthest] = useState(resume ? LAST : 0);
  const [direction, setDirection] = useState(1);
  const [notice, setNotice] = useState<ResumeKind | null>(resume ?? null);

  const [giftMode, setGiftMode] = useState<GiftMode>("card_once");
  const [preset, setPreset] = useState<number | null>(
    seedRequired ? MIN_POT_SEED_PENCE : 5000,
  );
  const [custom, setCustom] = useState("");

  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [giftAid, setGiftAid] = useState(false);
  const [donorAddressLine1, setDonorAddressLine1] = useState("");
  const [donorCity, setDonorCity] = useState("");
  const [donorPostcode, setDonorPostcode] = useState("");

  /** Field-level problems stay inline; a broken checkout gets a toast. */
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  /** Measured so the card can grow and shrink smoothly between steps. */
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);

  useEffect(() => {
    const element = panelRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setPanelHeight(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

    const nextStep = resume ? LAST : saved.step;
    setStep(nextStep);
    setFurthest(Math.max(saved.furthest, nextStep));
  }, [resume, potSlug]);

  // Initial state already reflects `resume`; a later change (cancelled →
  // failed without a remount) is applied during render.
  const [syncedResume, setSyncedResume] = useState(resume);
  if (resume !== syncedResume) {
    setSyncedResume(resume);
    if (resume) {
      setNotice(resume);
      setStep(LAST);
      setFurthest((seen) => Math.max(seen, LAST));
      setError(null);
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

  const bonus = valid && giftAid ? giftAidBonusPence(amountPence) : 0;
  const withGiftAid = valid && giftAid ? amountPence + bonus : null;
  const per = recurring ? " a month" : "";

  function givePath() {
    return potSlug ? `/pots/${potSlug}` : "/give";
  }

  /** Soft URL clean — avoids remounting the form and wiping answers. */
  function clearResumeFromUrl() {
    window.history.replaceState(null, "", givePath());
  }

  function persistDraft(nextStep = step, nextFurthest = furthest) {
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
        step: nextStep,
        furthest: nextFurthest,
      },
      potSlug,
    );
  }

  function dismissNotice() {
    setNotice(null);
    setError(null);
    setStep(LAST);
    setFurthest((seen) => Math.max(seen, LAST));
    clearResumeFromUrl();
  }

  function restart() {
    clearGiveDraft(potSlug);
    setGiftMode("card_once");
    setPreset(seedRequired ? MIN_POT_SEED_PENCE : 5000);
    setCustom("");
    setDonorName("");
    setDonorEmail("");
    setMessage("");
    setIsAnonymous(false);
    setGiftAid(false);
    setDonorAddressLine1("");
    setDonorCity("");
    setDonorPostcode("");
    setError(null);
    setConfirming(false);
    setPending(false);
    setDirection(-1);
    setStep(0);
    setFurthest(0);
    setNotice(null);
    clearResumeFromUrl();
  }

  function problemWith(index: number): string | null {
    if (index === 0) {
      if (!donorName.trim()) {
        return "We need a name for the record, even if you give quietly.";
      }
      if (!looksLikeEmail(donorEmail)) {
        return "A working email address, so your receipt reaches you.";
      }
      return null;
    }

    if (index === 1) {
      if (amountPence === null) {
        return "Choose an amount, or type your own.";
      }
      if (amountPence < minGiftPence) {
        return seedRequired
          ? `The first gift that opens this fundraiser must be at least ${formatWholeGbp(minGiftPence)}.`
          : `The smallest gift we can take is ${formatWholeGbp(minGiftPence)}.`;
      }
      if (amountPence > MAX_DONATION_PENCE) {
        return `Gifts above ${formatWholeGbp(MAX_DONATION_PENCE)} need to go through us directly — please get in touch.`;
      }
      return null;
    }

    if (index === 2 && giftAid) {
      if (
        !donorAddressLine1.trim() ||
        !donorCity.trim() ||
        !donorPostcode.trim()
      ) {
        return "Gift Aid needs your full home address, town or city, and postcode.";
      }
    }

    return null;
  }

  function goTo(next: number) {
    if (next > step) {
      for (let index = step; index < next; index += 1) {
        const problem = problemWith(index);
        if (problem) {
          setError(problem);
          setStep(index);
          return;
        }
      }
    }

    setError(null);
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setFurthest((seen) => Math.max(seen, next));
  }

  /** Everything must still hold at the end, not just when each step was passed. */
  function firstUnfinishedStep(): number | null {
    for (let index = 0; index <= LAST; index += 1) {
      if (problemWith(index)) return index;
    }
    return null;
  }

  function askToConfirm() {
    const unfinished = firstUnfinishedStep();
    if (unfinished !== null) {
      setError(problemWith(unfinished));
      setDirection(-1);
      setStep(unfinished);
      return;
    }

    setError(null);
    setConfirming(true);
  }

  async function submit() {
    setPending(true);
    setError(null);

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
          donorAddressLine1: donorAddressLine1.trim() || undefined,
          donorCity: donorCity.trim() || undefined,
          donorPostcode: donorPostcode.trim() || undefined,
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

      persistDraft(LAST, LAST);
      window.location.href = data.url;
    } catch (err) {
      setPending(false);
      setConfirming(false);
      toast.error(
        "We could not open checkout",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Nothing has been taken — your answers are still here.",
        ),
      );
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step === LAST) {
      askToConfirm();
    } else {
      goTo(step + 1);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative overflow-hidden rounded-sm border border-pvn-navy/10 bg-white/70 shadow-[0_24px_60px_-34px_rgba(12,27,51,0.5)]"
    >
      {/* Progress */}
      <div className="bg-pvn-navy px-4 pt-5 pb-4 sm:px-8 sm:pt-6 sm:pb-5">
        <StepRail
          labels={steps.map((entry) => entry.title)}
          current={step}
          furthest={furthest}
          onJump={goTo}
        />
      </div>
      <div className="h-1 w-full bg-pvn-gold" aria-hidden />

      <fieldset disabled={pending} className="block">
        <legend className="sr-only">Give to the restoration</legend>

        <div className="border-b border-pvn-navy/10 px-4 py-4 sm:px-8 sm:py-5">
          <p
            key={`kicker-${step}`}
            className="pvn-figure font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase"
          >
            Step {step + 1} of {steps.length}
          </p>
          <h3
            key={`title-${step}`}
            className="pvn-figure font-display mt-1.5 text-2xl leading-tight font-semibold text-pvn-navy"
          >
            {steps[step].title}
          </h3>
          <p
            key={`lead-${step}`}
            className="pvn-figure mt-1 text-sm text-pvn-navy/65"
          >
            {steps[step].lead}
          </p>
        </div>

        {/* The measured well — its height animates as steps swap */}
        <div
          className="relative overflow-hidden transition-[height] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={panelHeight === null ? undefined : { height: panelHeight }}
        >
          <div ref={panelRef}>
            <div
              key={step}
              data-direction={direction}
              className="pvn-step px-4 py-6 sm:px-8 sm:py-7"
            >
              {step === 0 ? (
                <div className="flex flex-col gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="give-name" className={labelClass}>
                        Your name
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
                    <div className="flex flex-col gap-2">
                      <label htmlFor="give-email" className={labelClass}>
                        Your email
                      </label>
                      <input
                        id="give-email"
                        type="email"
                        className={fieldClass}
                        value={donorEmail}
                        onChange={(event) => setDonorEmail(event.target.value)}
                        autoComplete="email"
                        maxLength={254}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-pvn-navy/12 bg-white/50 p-4 transition hover:border-pvn-gold/50">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(event) => setIsAnonymous(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-pvn-navy"
                    />
                    <span className="min-w-0">
                      <span className="font-nav block text-sm font-bold tracking-[0.1em] text-pvn-navy uppercase">
                        Give quietly
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-pvn-navy/70">
                        Your gift shows on the wall; your name does not. We
                        still keep it for the receipt.
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="flex flex-col gap-7">
                  {seedRequired ? (
                    <p className="rounded-sm border border-pvn-gold/40 bg-pvn-gold/10 px-3.5 py-3 text-sm leading-relaxed text-pvn-navy/75">
                      This fundraiser is not on the wall yet. The first gift must be at
                      least {formatWholeGbp(minGiftPence)}.
                    </p>
                  ) : null}

                  <div>
                    <p className={labelClass}>How often</p>
                    <div
                      role="radiogroup"
                      aria-label="How often would you like to give?"
                      className="relative mt-3 grid grid-cols-2 gap-1.5 rounded-sm border border-pvn-navy/12 bg-pvn-navy/[0.03] p-1.5"
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
                                mode.value === "card_once"
                                  ? seedRequired
                                    ? MIN_POT_SEED_PENCE
                                    : 5000
                                  : 2500,
                              );
                              setCustom("");
                            }}
                            className={`font-nav relative z-10 min-h-11 rounded-sm px-2 text-[0.7rem] font-bold tracking-[0.1em] uppercase transition-colors duration-300 ease-out sm:text-xs ${
                              active
                                ? "text-pvn-cream"
                                : "text-pvn-navy/70 hover:text-pvn-navy"
                            }`}
                          >
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>
                    <p
                      key={giftMode}
                      className="pvn-figure mt-2.5 text-xs leading-relaxed text-pvn-navy/60"
                    >
                      {modes.find((mode) => mode.value === giftMode)?.note}
                    </p>
                  </div>

                  <div>
                    <p className={labelClass}>
                      How much{recurring ? ", each month" : ""}
                    </p>
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
                            }}
                            className={`font-nav relative min-h-12 overflow-hidden rounded-sm border text-sm font-bold tracking-tight transition duration-300 ease-out active:scale-95 active:duration-100 ${
                              active
                                ? "pvn-amount-active border-pvn-gold bg-pvn-gold text-pvn-navy shadow-[0_10px_24px_-14px_rgba(201,168,76,0.9)]"
                                : "border-pvn-navy/15 bg-white/60 text-pvn-navy hover:-translate-y-0.5 hover:border-pvn-gold/60 hover:bg-pvn-gold/10 hover:shadow-[0_10px_22px_-14px_rgba(12,27,51,0.5)]"
                            }`}
                          >
                            {formatWholeGbp(value)}
                          </button>
                        );
                      })}
                    </div>

                    <label
                      htmlFor="give-custom"
                      className="mt-3 flex items-center gap-3 rounded-sm border border-pvn-navy/15 bg-white/60 px-3.5 transition focus-within:border-pvn-gold focus-within:ring-2 focus-within:ring-pvn-gold/30"
                    >
                      <span className="font-nav text-lg font-bold text-pvn-navy/50">
                        £
                      </span>
                      <input
                        id="give-custom"
                        inputMode="decimal"
                        value={custom}
                        onChange={(event) => setCustom(event.target.value)}
                        placeholder="Another amount"
                        className="font-nav min-h-12 w-full bg-transparent text-lg font-bold tracking-tight text-pvn-navy placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-pvn-navy/45 focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="flex flex-col gap-5">
                  <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-pvn-gold/40 bg-pvn-gold/[0.08] p-5 transition hover:border-pvn-gold/70">
                    <input
                      type="checkbox"
                      checked={giftAid}
                      onChange={(event) => setGiftAid(event.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-pvn-navy"
                    />
                    <span className="min-w-0">
                      <span className="font-nav block text-sm font-bold tracking-[0.12em] text-pvn-navy uppercase">
                        Add Gift Aid — 25% more, at no cost to you
                      </span>
                      <span className="mt-1.5 block text-sm leading-relaxed text-pvn-navy/75">
                        If you pay UK tax, the government adds 25p to every
                        pound you give. It comes from tax you have already paid,
                        not from your pocket.
                      </span>
                    </span>
                  </label>

                  {withGiftAid !== null && amountPence !== null ? (
                    <p
                      key={withGiftAid}
                      className="pvn-figure font-nav flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-sm bg-pvn-navy px-5 py-4 text-sm font-bold tracking-[0.12em] text-pvn-cream uppercase"
                    >
                      <span className="text-pvn-cream/55">
                        {formatTidyGbp(amountPence)}
                        {per}
                      </span>
                      <span className="text-pvn-gold" aria-hidden>
                        →
                      </span>
                      <span className="text-lg tracking-tight text-pvn-gold">
                        {formatTidyGbp(withGiftAid)}
                        {per}
                      </span>
                      <span className="text-pvn-cream/55">
                        for the building
                      </span>
                    </p>
                  ) : null}

                  <div
                    className="pvn-reveal"
                    data-open={giftAid}
                    aria-hidden={!giftAid}
                  >
                    <div>
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
                      <p className="mt-4 text-xs leading-relaxed text-pvn-navy/60">
                        I am a UK taxpayer and understand that if I pay less
                        Income Tax or Capital Gains Tax in the current tax year
                        than the Gift Aid claimed on all my donations, it is my
                        responsibility to pay the difference.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="flex flex-col gap-6">
                  <div className="relative overflow-hidden rounded-sm bg-pvn-navy p-6 text-pvn-cream">
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/60 to-transparent"
                      aria-hidden
                    />
                    <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                      {recurring
                        ? "Every month, by card"
                        : "A single gift, by card"}
                    </p>
                    <p className="font-display mt-2 text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
                      {amountPence === null ? "—" : formatTidyGbp(amountPence)}
                      {recurring ? (
                        <span className="font-nav ml-1.5 text-base font-bold tracking-[0.1em] text-pvn-cream/50 uppercase">
                          / month
                        </span>
                      ) : null}
                    </p>
                    {withGiftAid !== null ? (
                      <p className="font-nav mt-3 border-t border-pvn-cream/15 pt-3 text-xs font-bold tracking-[0.12em] text-pvn-cream/70 uppercase">
                        With Gift Aid, the building receives{" "}
                        <span className="text-pvn-gold">
                          {formatTidyGbp(withGiftAid)}
                          {per}
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <dl className="flex flex-col divide-y divide-pvn-navy/10 border-y border-pvn-navy/10">
                    {[
                      {
                        term: "Named as",
                        value: isAnonymous
                          ? `${donorName.trim() || "—"} (shown quietly)`
                          : donorName.trim() || "—",
                        goto: 0,
                      },
                      {
                        term: "Receipt to",
                        value: donorEmail.trim() || "—",
                        goto: 0,
                      },
                      {
                        term: "Gift Aid",
                        value: giftAid
                          ? `Yes — adds ${formatTidyGbp(bonus)}`
                          : "No",
                        goto: 2,
                      },
                    ].map((row) => (
                      <div
                        key={row.term}
                        className="flex items-baseline justify-between gap-4 py-3"
                      >
                        <dt className={labelClass}>{row.term}</dt>
                        <dd className="flex min-w-0 items-baseline gap-3 text-right">
                          <span className="truncate text-sm text-pvn-navy">
                            {row.value}
                          </span>
                          <button
                            type="button"
                            onClick={() => goTo(row.goto)}
                            className="font-nav shrink-0 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase underline decoration-pvn-gold/50 underline-offset-4 transition hover:text-pvn-navy"
                          >
                            Edit
                          </button>
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="give-message" className={labelClass}>
                      Leave a word with your gift (optional)
                    </label>
                    <textarea
                      id="give-message"
                      className={`${fieldClass} min-h-24 resize-y`}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      maxLength={280}
                      placeholder="A verse, a memory, or why this house matters to you."
                    />
                    {potSlug ? (
                      <p className="text-right text-[0.7rem] text-pvn-navy/45 tabular-nums">
                        {message.length}/280
                      </p>
                    ) : (
                      <p className="text-[0.7rem] leading-snug text-pvn-navy/50">
                        Direct gifts that leave a word appear on{" "}
                        <a
                          href="/the-wall"
                          className="font-medium text-pvn-navy underline decoration-pvn-gold/50 underline-offset-2 transition hover:text-pvn-gold"
                        >
                          The Wall
                        </a>
                        .
                        <span className="float-right tabular-nums text-pvn-navy/45">
                          {message.length}/280
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="pvn-figure mt-6 rounded-sm border border-red-700/30 bg-red-700/5 px-3.5 py-2.5 text-sm text-red-700"
                >
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 border-t border-pvn-navy/10 px-4 py-5 sm:flex-row-reverse sm:items-center sm:px-8 sm:py-6">
          <button
            type="submit"
            className="pvn-give-submit font-nav relative inline-flex min-h-14 w-full items-center justify-center overflow-hidden rounded-md bg-pvn-gold px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-pvn-navy uppercase transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-pvn-gold-light hover:shadow-[0_16px_34px_-16px_rgba(201,168,76,0.95)] active:translate-y-0 active:scale-[0.99] active:duration-100 disabled:translate-y-0 disabled:opacity-60 sm:w-auto sm:flex-1"
          >
            <span
              className="pvn-give-submit-glint pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
              aria-hidden
            />
            <span
              key={`cta-${step}-${pending}-${amountPence ?? 0}`}
              className="pvn-figure relative inline-flex items-center gap-2"
            >
              {pending ? (
                "Taking you to checkout…"
              ) : step < LAST ? (
                <>
                  Continue
                  <span aria-hidden className="text-base leading-none">
                    →
                  </span>
                </>
              ) : valid && amountPence !== null ? (
                `Give ${formatTidyGbp(amountPence)}${per}`
              ) : (
                "Give"
              )}
            </span>
          </button>

          {step > 0 ? (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              className="font-nav inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-pvn-navy/15 px-5 text-sm font-bold tracking-[0.12em] text-pvn-navy/70 uppercase transition duration-300 ease-out hover:border-pvn-navy/35 hover:text-pvn-navy sm:w-auto"
            >
              <span aria-hidden>←</span> Back
            </button>
          ) : null}
        </div>

        <p className="border-t border-pvn-navy/10 px-4 py-4 text-center text-xs leading-relaxed text-pvn-navy/60 sm:px-8">
          You will finish on Stripe’s secure page. We never see your card
          number.{" "}
          {seedRequired
            ? `First gift from ${formatWholeGbp(minGiftPence)}.`
            : `Smallest gift ${formatWholeGbp(minGiftPence)}${recurring ? " a month" : ""}.`}
        </p>
      </fieldset>

      {/* Confirmation — the last chance to stop before Stripe takes over */}
      <ResultModal
        open={confirming}
        variant="confirm"
        busy={pending}
        busyLabel="Taking you to checkout…"
        title={recurring ? "Start this monthly gift?" : "Send this gift?"}
        body="We will hand you to Stripe’s secure page to finish. Nothing is taken until you do."
        confirmLabel={
          amountPence === null
            ? "Yes, continue"
            : `Yes — give ${formatTidyGbp(amountPence)}${per}`
        }
        actionLabel="Not yet"
        onConfirm={() => void submit()}
        onClose={() => {
          if (!pending) setConfirming(false);
        }}
      >
        <dl className="divide-y divide-pvn-navy/10 rounded-sm border border-pvn-navy/10 bg-white/60">
          {[
            {
              term: recurring ? "Every month" : "One gift",
              value:
                amountPence === null ? "—" : `${formatTidyGbp(amountPence)}`,
            },
            {
              term: "Gift Aid",
              value:
                withGiftAid === null
                  ? "Not added"
                  : `Adds ${formatTidyGbp(bonus)}`,
            },
            {
              term: "Receipt to",
              value: donorEmail.trim() || "—",
            },
          ].map((row) => (
            <div
              key={row.term}
              className="flex items-baseline justify-between gap-4 px-4 py-2.5"
            >
              <dt className="font-nav text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/60 uppercase">
                {row.term}
              </dt>
              <dd className="truncate text-sm font-semibold text-pvn-navy">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </ResultModal>

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
            ? "Your bank or card provider stopped it. Nothing was charged. Continue to edit your details, or restart from the beginning."
            : "You left Stripe before finishing. Nothing was charged. Continue to keep your answers, or restart from the beginning."
        }
        confirmLabel="Continue"
        actionLabel="Restart"
        onConfirm={dismissNotice}
        onSecondary={restart}
        onClose={dismissNotice}
      />
    </form>
  );
}
