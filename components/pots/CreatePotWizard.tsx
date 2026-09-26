"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import type { PotType } from "@prisma/client";
import { PotPreview } from "@/components/pots/PotPreview";
import { ResultModal } from "@/components/ResultModal";
import { ShareCta } from "@/components/ShareCta";
import { useToast } from "@/components/toast/ToastProvider";
import { StepRail } from "@/components/StepRail";
import {
  IconGlobe,
  IconHeart,
  IconHouse,
  IconPeople,
  IconWall,
} from "@/components/icons";
import {
  MAX_DONATION_PENCE,
  MIN_DONATION_PENCE,
  MIN_POT_SEED_PENCE,
  formatTidyGbp,
  formatWholeGbp,
  poundsToPence,
} from "@/lib/money";
import { POT_TARGET_PRESETS, potTypes, MIN_FOUNDER_STORY_WORDS, MIN_POT_DESCRIPTION_WORDS, optionalCopyProblem, wordCount } from "@/lib/pots";
import { potPublicUrl } from "@/lib/pot-share";
import { slugifyTitle } from "@/lib/slug";
import { hostAccessToken } from "@/lib/host-client";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

const steps = [
  {
    rail: "Who",
    title: "Who is building?",
    lead: "Pick the shape of your pot.",
  },
  {
    rail: "Name",
    title: "Name your pot",
    lead: "Short enough to say out loud.",
  },
  {
    rail: "Words",
    title: "Words & cover",
    lead: "Add now, or leave blank and finish later.",
  },
  {
    rail: "Target",
    title: "Set the target",
    lead: "A number your people can reach.",
  },
  { rail: "You", title: "About you", lead: "So we know whose pot this is." },
  { rail: "Review", title: "Read it back", lead: "Then lay the first stone." },
] as const;

const LAST = steps.length - 1;

const TITLE_MAX = 70;

const typeIcons: Record<PotType, ComponentType<{ className?: string }>> = {
  INDIVIDUAL: IconHeart,
  FAMILY: IconHouse,
  ALUMNI_GROUP: IconGlobe,
  MINISTRY: IconWall,
  OTHER_GROUP: IconPeople,
};

const fieldClass =
  "w-full rounded-sm border border-pvn-navy/15 bg-white/70 px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/45 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.7rem] font-bold uppercase tracking-[0.16em] text-pvn-navy/70";

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Years are optional, but a half-remembered one should not reach the database. */
function parseYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const year = Number(trimmed);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  return year;
}

/**
 * Public “Start a pot” wizard (/fundraisers/create).
 * Signed-in hosts create additional pots via HostNewPot at /host/pots/new —
 * two entry points on purpose (visitor signup vs existing Host).
 */
export function CreatePotWizard() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [direction, setDirection] = useState(1);

  const [type, setType] = useState<PotType>("INDIVIDUAL");
  const [title, setTitle] = useState("");
  /** Public description — stored as pot.story */
  const [description, setDescription] = useState("");
  /** Optional personal why — stored as pot.founderStory */
  const [founderStory, setFounderStory] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [preset, setPreset] = useState<number | null>(50_000);
  const [custom, setCustom] = useState("");

  const [fundraiserName, setFundraiserName] = useState("");
  const [fundraiserEmail, setFundraiserEmail] = useState("");
  const [isAlumni, setIsAlumni] = useState(false);
  const [alumniYearsFrom, setAlumniYearsFrom] = useState("");
  const [alumniYearsTo, setAlumniYearsTo] = useState("");
  const [alumniMinistry, setAlumniMinistry] = useState("");
  const [alumniCity, setAlumniCity] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [returningCreator, setReturningCreator] = useState(false);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<{
    slug: string;
    account: {
      email: string;
      isNewAccount: boolean;
      credentialsEmailed: boolean;
    } | null;
  } | null>(null);

  const [seedPreset, setSeedPreset] = useState<number | null>(MIN_POT_SEED_PENCE);
  const [seedCustom, setSeedCustom] = useState("");
  const [seeding, setSeeding] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [coverDragging, setCoverDragging] = useState(false);

  useEffect(() => {
    const element = panelRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setPanelHeight(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const COVER_MAX_BYTES = 5 * 1024 * 1024;
  const COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

  function clearCover() {
    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoUrl("");
    setPhotoError(null);
  }

  function onCoverChosen(file: File | null) {
    if (!file) {
      clearCover();
      return;
    }

    if (!COVER_TYPES.has(file.type)) {
      setPhotoError("Use a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      setPhotoError("Keep the cover under 5 MB.");
      return;
    }

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUrl("");
  }

  const activeType = potTypes.find((option) => option.value === type);

  const targetPence = useMemo(
    () => (custom.trim() ? poundsToPence(custom) : preset),
    [custom, preset],
  );

  const targetValid =
    targetPence !== null &&
    targetPence >= MIN_DONATION_PENCE &&
    targetPence <= MAX_DONATION_PENCE;

  const slug = slugifyTitle(title);

  const descriptionWords = wordCount(description);
  const founderWords = wordCount(founderStory);

  const seedPence = useMemo(
    () => (seedCustom.trim() ? poundsToPence(seedCustom) : seedPreset),
    [seedCustom, seedPreset],
  );

  function problemWith(index: number): string | null {
    if (index === 1) {
      if (!title.trim()) {
        return "The pot needs a title — this is required.";
      }
      if (title.trim().length < 3) {
        return "Give the pot a name — three characters at the very least.";
      }
      if (title.trim().length > TITLE_MAX) {
        return `Keep the name under ${TITLE_MAX} characters so the link stays readable.`;
      }
    }

    if (index === 2) {
      const descriptionProblem = optionalCopyProblem(
        description,
        MIN_POT_DESCRIPTION_WORDS,
        "The pot description",
      );
      if (descriptionProblem) return descriptionProblem;
      const founderProblem = optionalCopyProblem(
        founderStory,
        MIN_FOUNDER_STORY_WORDS,
        "Your story",
      );
      if (founderProblem) return founderProblem;
      if (photoError) {
        return photoError;
      }
    }

    if (index === 3) {
      if (targetPence === null) {
        return "Choose a target, or type your own.";
      }
      if (targetPence < MIN_DONATION_PENCE) {
        return `The smallest target we can hold is ${formatWholeGbp(MIN_DONATION_PENCE)}.`;
      }
      if (targetPence > MAX_DONATION_PENCE) {
        return `Targets above ${formatWholeGbp(MAX_DONATION_PENCE)} need a word with us first — please get in touch.`;
      }
    }

    if (index === 4) {
      if (!fundraiserName.trim()) {
        return "Your name is required — a pot belongs to somebody.";
      }
      if (!fundraiserEmail.trim()) {
        return "Your email is required so we can reach you about the pot.";
      }
      if (!looksLikeEmail(fundraiserEmail)) {
        return "A working email address, so we can reach you about the pot.";
      }
      if (isAlumni) {
        const from = parseYear(alumniYearsFrom);
        const to = parseYear(alumniYearsTo);
        if (alumniYearsFrom.trim() && from === null) {
          return "Write the year you arrived in full, like 1998.";
        }
        if (alumniYearsTo.trim() && to === null) {
          return "Write the year you left in full, like 2004.";
        }
        if (from !== null && to !== null && from > to) {
          return "You cannot have left before you arrived.";
        }
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

  async function askToConfirm() {
    for (let index = 0; index <= LAST; index += 1) {
      const problem = problemWith(index);
      if (problem) {
        setError(problem);
        setDirection(-1);
        setStep(index);
        return;
      }
    }

    setError(null);

    try {
      const email = encodeURIComponent(fundraiserEmail.trim().toLowerCase());
      const response = await fetch(`/api/host/lookup?email=${email}`);
      const data = (await response.json()) as { returning?: boolean };
      setReturningCreator(data.returning === true);
    } catch {
      setReturningCreator(false);
    }

    setConfirming(true);
  }

  async function submit() {
    setPending(true);
    setError(null);

    const from = parseYear(alumniYearsFrom);
    const to = parseYear(alumniYearsTo);

    try {
      const accessToken = await hostAccessToken();
      if (returningCreator && !accessToken) {
        throw new Error(
          "This email already has a Host login. Sign in at /host, then create the pot — or use a different email.",
        );
      }

      let coverUrl = photoUrl.trim() || undefined;

      if (photoFile) {
        const form = new FormData();
        form.append("file", photoFile);
        const upload = await fetch("/api/uploads/pot-cover", {
          method: "POST",
          body: form,
        });
        const uploaded = (await upload.json()) as {
          url?: string;
          error?: string;
        };
        if (!upload.ok || !uploaded.url) {
          throw new Error(
            visitorSafeApiError(
              upload.status,
              uploaded.error,
              "We could not upload the cover. Please try again.",
            ),
          );
        }
        coverUrl = uploaded.url;
        setPhotoUrl(uploaded.url);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/pots", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type,
          title: title.trim(),
          story: description.trim() || undefined,
          founderStory: founderStory.trim() || undefined,
          targetAmountPence: targetPence,
          photoUrl: coverUrl,
          fundraiserName: fundraiserName.trim(),
          fundraiserEmail: fundraiserEmail.trim(),
          isAlumni,
          ...(isAlumni
            ? {
                alumniYearsFrom: from ?? undefined,
                alumniYearsTo: to ?? undefined,
                alumniMinistry: alumniMinistry.trim() || undefined,
                alumniCity: alumniCity.trim() || undefined,
              }
            : {}),
        }),
      });

      const data = (await response.json()) as {
        pot?: { slug: string };
        account?: {
          email: string;
          isNewAccount: boolean;
          credentialsEmailed?: boolean;
        };
        error?: string;
      };

      if (!response.ok || !data.pot?.slug) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            data.error,
            "We could not open your pot. Please try again.",
          ),
        );
      }

      setPending(false);
      setConfirming(false);
      setCreated({
        slug: data.pot.slug,
        account: data.account
          ? {
              email: data.account.email,
              isNewAccount: data.account.isNewAccount,
              credentialsEmailed: data.account.credentialsEmailed === true,
            }
          : null,
      });
      if (data.account?.isNewAccount) {
        toast.success(
          "Pot created — check your inbox",
          "Your Host login and temporary password are in your email.",
        );
      } else {
        toast.success(
          "Pot created",
          "Linked to your existing host login. Lay the first stone to open it.",
        );
      }
    } catch (err) {
      setPending(false);
      setConfirming(false);
      toast.error(
        "The pot did not open",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Nothing was lost — please try again.",
        ),
      );
    }
  }

  async function seedPot() {
    if (!created) return;

    if (seedPence === null || seedPence < MIN_POT_SEED_PENCE) {
      toast.error(
        "Seed amount too low",
        `The first stone must be at least ${formatWholeGbp(MIN_POT_SEED_PENCE)}.`,
      );
      return;
    }
    if (seedPence > MAX_DONATION_PENCE) {
      toast.error(
        "Seed amount too high",
        `The most we can take in one gift is ${formatWholeGbp(MAX_DONATION_PENCE)}.`,
      );
      return;
    }

    setSeeding(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence: seedPence,
          potSlug: created.slug,
          giftMode: "card_once",
          donorName: fundraiserName.trim(),
          donorEmail: fundraiserEmail.trim(),
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            data.error,
            "We could not start the seed gift. Please try again.",
          ),
        );
      }
      window.location.href = data.url;
    } catch (err) {
      setSeeding(false);
      toast.error(
        "The seed gift did not start",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Nothing was taken — please try again.",
        ),
      );
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (created) {
      void seedPot();
      return;
    }
    if (step === LAST) {
      void askToConfirm();
    } else {
      goTo(step + 1);
    }
  }

  const potPath = created ? `/pots/${created.slug}` : `/pots/${slug || "…"}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
      <form
        onSubmit={onSubmit}
        noValidate
        className="relative overflow-hidden rounded-sm border border-pvn-navy/10 bg-white/70 shadow-[0_24px_60px_-34px_rgba(12,27,51,0.5)]"
      >
        {(pending || seeding) && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-pvn-cream/85 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
          >
            <span
              className="h-9 w-9 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
              aria-hidden
            />
            <p className="font-nav text-xs font-bold tracking-[0.16em] text-pvn-navy uppercase">
              {seeding
                ? "Opening secure checkout…"
                : returningCreator
                  ? "Creating your pot…"
                  : "Creating your pot & account…"}
            </p>
            <p className="max-w-xs px-4 text-center text-sm text-pvn-navy/60">
              {seeding
                ? "Hang on while we start your seed gift."
                : returningCreator
                  ? "Saving your pot and linking it to your host login."
                  : "Saving your pot and setting up your login. This can take a moment."}
            </p>
          </div>
        )}
        {!created ? (
          <>
            <div className="bg-pvn-navy px-5 pt-6 pb-5 sm:px-8">
              <StepRail
                labels={steps.map((entry) => entry.rail)}
                current={step}
                furthest={furthest}
                onJump={goTo}
              />
            </div>
            <div className="h-1 w-full bg-pvn-gold" aria-hidden />
          </>
        ) : (
          <div className="h-1 w-full bg-pvn-gold" aria-hidden />
        )}

        <fieldset disabled={pending || seeding} className="block">
          <legend className="sr-only">Start a pot</legend>

          {created ? (
            <>
              <div className="border-b border-pvn-navy/10 px-6 py-5 sm:px-8">
                <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                  The first stone
                </p>
                <h2 className="font-display mt-1.5 text-2xl leading-tight font-semibold text-pvn-navy">
                  Lay {formatWholeGbp(MIN_POT_SEED_PENCE)} or more to open the
                  door
                </h2>
                <p className="mt-1 text-sm text-pvn-navy/65">
                  Seed with {formatWholeGbp(MIN_POT_SEED_PENCE)} or more to put
                  it on the wall.
                </p>
              </div>

              {created.account?.isNewAccount &&
              created.account.credentialsEmailed ? (
                <div className="border-b border-pvn-navy/10 bg-pvn-navy px-6 py-5 text-pvn-cream sm:px-8">
                  <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                    Your host login
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-pvn-cream/75">
                    We emailed a temporary password to{" "}
                    <strong className="font-medium text-pvn-cream">
                      {created.account.email}
                    </strong>
                    . Check your inbox (and spam), then sign in at{" "}
                    <Link
                      href="/host"
                      className="underline decoration-pvn-gold/50 underline-offset-4 hover:text-pvn-gold"
                    >
                      Host home
                    </Link>
                    .
                  </p>
                </div>
              ) : created.account && !created.account.isNewAccount ? (
                <div className="border-b border-pvn-navy/10 px-6 py-4 sm:px-8">
                  <p className="text-sm text-pvn-navy/70">
                    Linked to <strong>{created.account.email}</strong> — no new
                    password.
                  </p>
                </div>
              ) : null}

              <div className="px-6 py-7 sm:px-8">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[MIN_POT_SEED_PENCE, 5000, 10_000, 25_000].map((value) => {
                    const active = !seedCustom.trim() && seedPreset === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setSeedPreset(value);
                          setSeedCustom("");
                        }}
                        className={`font-nav min-h-12 rounded-sm border text-sm font-bold tracking-tight transition duration-300 ease-out active:scale-95 active:duration-100 ${
                          active
                            ? "border-pvn-gold bg-pvn-gold text-pvn-navy shadow-[0_10px_24px_-14px_rgba(201,168,76,0.9)]"
                            : "border-pvn-navy/15 bg-white/60 text-pvn-navy hover:-translate-y-0.5 hover:border-pvn-gold/60 hover:bg-pvn-gold/10"
                        }`}
                      >
                        {formatWholeGbp(value)}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <label htmlFor="seed-custom" className={labelClass}>
                    Or type another amount
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-pvn-navy/45">
                      £
                    </span>
                    <input
                      id="seed-custom"
                      inputMode="decimal"
                      className={`${fieldClass} pl-7`}
                      value={seedCustom}
                      onChange={(event) => {
                        setSeedCustom(event.target.value);
                        setSeedPreset(null);
                      }}
                      placeholder={String(MIN_POT_SEED_PENCE / 100)}
                    />
                  </div>
                  <p className="text-xs text-pvn-navy/55">
                    Minimum {formatWholeGbp(MIN_POT_SEED_PENCE)}. You finish on
                    Stripe’s secure page.
                  </p>
                </div>

                <div className="mt-6 rounded-sm border border-pvn-navy/10 bg-pvn-cream/50 px-4 py-4">
                  <p className="font-nav text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase">
                    Your pot is waiting
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-pvn-navy">
                    {potPath}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <ShareCta
                      title={title.trim() || "My pot"}
                      text={`Join me on “${title.trim() || "my pot"}” — raising for the restoration of 5 Paulett.`}
                      label="Share this pot"
                      size="lg"
                      className="min-h-11 border-pvn-navy/20 bg-white px-4 text-[0.65rem] tracking-[0.14em] text-pvn-navy hover:border-pvn-gold hover:text-pvn-gold sm:min-h-10"
                      getUrl={() => potPublicUrl(created.slug, "share")}
                    />
                    <Link
                      href={potPath}
                      className="font-nav inline-flex min-h-11 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold sm:min-h-10"
                    >
                      View pot
                    </Link>
                    <Link
                      href={`/host/pots/${created.slug}`}
                      className="font-nav inline-flex min-h-11 items-center justify-center rounded-md border border-pvn-navy/20 bg-white px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold sm:min-h-10"
                    >
                      Manage
                    </Link>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-pvn-navy/55">
                    You can seed now, or come back later with your host login.
                    Until you seed, the pot stays off the wall.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
          <div className="border-b border-pvn-navy/10 px-6 py-5 sm:px-8">
            <p
              key={`kicker-${step}`}
              className="pvn-figure font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase"
            >
              Step {step + 1} of {steps.length}
            </p>
            <h2
              key={`title-${step}`}
              className="pvn-figure font-display mt-1.5 text-2xl leading-tight font-semibold text-pvn-navy"
            >
              {steps[step].title}
            </h2>
            <p
              key={`lead-${step}`}
              className="pvn-figure mt-1 text-sm text-pvn-navy/65"
            >
              {steps[step].lead}
            </p>
          </div>

          <div
            className="relative overflow-hidden transition-[height] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={panelHeight === null ? undefined : { height: panelHeight }}
          >
            <div ref={panelRef}>
              <div
                key={step}
                data-direction={direction}
                className="pvn-step px-6 py-7 sm:px-8"
              >
                {/* 1 — who */}
                {step === 0 ? (
                  <div
                    role="radiogroup"
                    aria-label="What kind of pot is this?"
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {potTypes.map((option) => {
                      const active = type === option.value;
                      const Icon = typeIcons[option.value];
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setType(option.value)}
                          className={`group flex items-start gap-3.5 rounded-sm border p-4 text-left transition duration-300 ease-out active:scale-[0.99] ${
                            active
                              ? "pvn-amount-active border-pvn-gold bg-pvn-gold/12 shadow-[0_14px_30px_-20px_rgba(12,27,51,0.6)]"
                              : "border-pvn-navy/12 bg-white/50 hover:-translate-y-0.5 hover:border-pvn-gold/60 hover:bg-pvn-gold/[0.06]"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition duration-300 ${
                              active
                                ? "bg-pvn-navy text-pvn-gold"
                                : "bg-pvn-navy/[0.06] text-pvn-navy/50 group-hover:text-pvn-navy"
                            }`}
                            aria-hidden
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="font-nav block text-xs font-bold tracking-[0.12em] text-pvn-navy uppercase">
                              {option.label}
                            </span>
                            <span className="mt-1 block text-sm leading-relaxed text-pvn-navy/65">
                              {option.blurb}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {/* 2 — name */}
                {step === 1 ? (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="pot-title" className={labelClass}>
                      Pot title{" "}
                      <span className="text-pvn-gold">(required)</span>
                    </label>
                    <input
                      id="pot-title"
                      className={fieldClass}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={TITLE_MAX}
                      placeholder={activeType?.placeholder}
                      required
                      aria-required="true"
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-nav min-w-0 truncate text-xs text-pvn-navy/50">
                        <span className="text-pvn-navy/35">
                          Your link will be{" "}
                        </span>
                        <span className="text-pvn-navy">
                          /pots/{slug === "pot" && !title.trim() ? "…" : slug}
                        </span>
                      </p>
                      <p className="shrink-0 text-[0.7rem] text-pvn-navy/45 tabular-nums">
                        {title.length}/{TITLE_MAX}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* 3 — description + story + cover */}
                {step === 2 ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="pot-description" className={labelClass}>
                        Pot description
                      </label>
                      <textarea
                        id="pot-description"
                        className={`${fieldClass} min-h-28 resize-y`}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="What this pot is for — a short paragraph for your pot page."
                      />
                      <p className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase tabular-nums">
                        {descriptionWords === 0
                          ? `${MIN_POT_DESCRIPTION_WORDS}+ words if you write`
                          : descriptionWords < MIN_POT_DESCRIPTION_WORDS
                            ? `${MIN_POT_DESCRIPTION_WORDS - descriptionWords} more`
                            : `${descriptionWords} words`}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label htmlFor="pot-story" className={labelClass}>
                        Your story
                      </label>
                      <textarea
                        id="pot-story"
                        className={`${fieldClass} min-h-32 resize-y`}
                        value={founderStory}
                        onChange={(event) =>
                          setFounderStory(event.target.value)
                        }
                        placeholder={
                          activeType?.storyHint ??
                          "Why you are building this pot."
                        }
                      />
                      <p className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase tabular-nums">
                        {founderWords === 0
                          ? `${MIN_FOUNDER_STORY_WORDS}+ words if you write`
                          : founderWords < MIN_FOUNDER_STORY_WORDS
                            ? `${MIN_FOUNDER_STORY_WORDS - founderWords} more`
                            : `${founderWords} words`}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className={labelClass} id="pot-cover-label">
                        Cover image (landscape)
                      </p>
                      <input
                        ref={coverInputRef}
                        id="pot-cover"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        aria-labelledby="pot-cover-label"
                        onChange={(event) => {
                          onCoverChosen(event.target.files?.[0] ?? null);
                          event.target.value = "";
                        }}
                      />

                      {photoPreview ? (
                        <div className="group relative overflow-hidden rounded-sm border-2 border-pvn-navy/20 bg-pvn-navy/[0.03] shadow-[0_14px_32px_-24px_rgba(12,27,51,0.55)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview}
                            alt=""
                            className="aspect-[16/9] w-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-pvn-navy/90 to-transparent p-3 pt-10">
                            <button
                              type="button"
                              onClick={() => coverInputRef.current?.click()}
                              className="font-nav inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-pvn-gold px-3 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={clearCover}
                              className="font-nav inline-flex min-h-10 items-center justify-center rounded-md border border-pvn-cream/35 bg-pvn-navy/50 px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:border-pvn-cream/70"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          onDragEnter={(event) => {
                            event.preventDefault();
                            setCoverDragging(true);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setCoverDragging(true);
                          }}
                          onDragLeave={(event) => {
                            event.preventDefault();
                            setCoverDragging(false);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            setCoverDragging(false);
                            onCoverChosen(
                              event.dataTransfer.files?.[0] ?? null,
                            );
                          }}
                          className={`relative flex aspect-[16/9] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-sm border-2 border-dashed px-5 text-center transition duration-300 ease-out ${
                            coverDragging
                              ? "border-pvn-gold bg-pvn-gold/15 scale-[1.01]"
                              : "border-pvn-navy/35 bg-pvn-navy/[0.04] hover:border-pvn-gold hover:bg-pvn-gold/10"
                          }`}
                        >
                          <span
                            className="pointer-events-none absolute inset-0 opacity-[0.07]"
                            aria-hidden
                            style={{
                              backgroundImage: `
                                linear-gradient(335deg, #0c1b33 14px, transparent 14px),
                                linear-gradient(155deg, #0c1b33 14px, transparent 14px)
                              `,
                              backgroundSize: "28px 28px",
                              backgroundPosition: "0 0, 14px 0",
                            }}
                          />
                          <span
                            className={`relative flex h-14 w-14 items-center justify-center rounded-full transition duration-300 ${
                              coverDragging
                                ? "bg-pvn-gold text-pvn-navy"
                                : "bg-pvn-navy text-pvn-gold"
                            }`}
                            aria-hidden
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-6 w-6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </span>
                          <span className="relative">
                            <span className="font-nav block text-sm font-bold tracking-[0.14em] text-pvn-navy uppercase">
                              {coverDragging
                                ? "Drop to add"
                                : "Add a landscape cover"}
                            </span>
                            <span className="mt-1.5 block text-xs leading-relaxed text-pvn-navy/60">
                              Drop a landscape image here, or click to browse
                            </span>
                            <span className="mt-1 block text-[0.7rem] text-pvn-navy/45">
                              Landscape · 16:9 recommended · JPEG, PNG or WebP ·
                              max 5 MB
                            </span>
                          </span>
                        </button>
                      )}

                      {photoError ? (
                        <p className="text-sm text-red-700" role="alert">
                          {photoError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* 4 — target */}
                {step === 3 ? (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {POT_TARGET_PRESETS.map((value) => {
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
                            className={`font-nav min-h-12 rounded-sm border text-sm font-bold tracking-tight transition duration-300 ease-out active:scale-95 active:duration-100 ${
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
                      htmlFor="pot-custom"
                      className="flex items-center gap-3 rounded-sm border border-pvn-navy/15 bg-white/60 px-3.5 transition focus-within:border-pvn-gold focus-within:ring-2 focus-within:ring-pvn-gold/30"
                    >
                      <span className="font-nav text-lg font-bold text-pvn-navy/50">
                        £
                      </span>
                      <input
                        id="pot-custom"
                        inputMode="decimal"
                        value={custom}
                        onChange={(event) => setCustom(event.target.value)}
                        placeholder="Another target"
                        className="font-nav min-h-12 w-full bg-transparent text-lg font-bold tracking-tight text-pvn-navy placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-pvn-navy/45 focus:outline-none"
                      />
                    </label>
                    <p className="text-xs text-pvn-navy/50">
                      Targets from {formatWholeGbp(MIN_DONATION_PENCE)} to{" "}
                      {formatWholeGbp(MAX_DONATION_PENCE)}.
                    </p>

                    {targetValid && targetPence !== null ? (
                      <p
                        key={targetPence}
                        className="pvn-figure text-sm leading-relaxed text-pvn-navy/70"
                      >
                        <span className="font-semibold text-pvn-navy">
                          {formatWholeGbp(targetPence)}
                        </span>{" "}
                        is about{" "}
                        {Math.max(
                          1,
                          Math.round(targetPence / MIN_POT_SEED_PENCE),
                        )}{" "}
                        gifts of {formatWholeGbp(MIN_POT_SEED_PENCE)}, or{" "}
                        {Math.max(1, Math.round(targetPence / 10_000))} of £100.
                      </p>
                    ) : null}

                    <p className="text-xs leading-relaxed text-pvn-navy/55">
                      A target is a rallying point, not a ceiling. Pots that
                      pass it keep taking gifts, and every penny goes to the
                      same building.
                    </p>
                  </div>
                ) : null}

                {/* 5 — you */}
                {step === 4 ? (
                  <div className="flex flex-col gap-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <label htmlFor="pot-name" className={labelClass}>
                          Your name{" "}
                          <span className="text-pvn-gold">(required)</span>
                        </label>
                        <input
                          id="pot-name"
                          className={fieldClass}
                          value={fundraiserName}
                          onChange={(event) =>
                            setFundraiserName(event.target.value)
                          }
                          autoComplete="name"
                          maxLength={120}
                          placeholder="Tolu Adeyemi"
                          required
                          aria-required="true"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="pot-email" className={labelClass}>
                          Your email{" "}
                          <span className="text-pvn-gold">(required)</span>
                        </label>
                        <input
                          id="pot-email"
                          type="email"
                          className={fieldClass}
                          value={fundraiserEmail}
                          onChange={(event) =>
                            setFundraiserEmail(event.target.value)
                          }
                          autoComplete="email"
                          maxLength={254}
                          placeholder="you@example.com"
                          required
                          aria-required="true"
                        />
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-pvn-navy/12 bg-white/50 p-4 transition hover:border-pvn-gold/50">
                      <input
                        type="checkbox"
                        checked={isAlumni}
                        onChange={(event) => setIsAlumni(event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-pvn-navy"
                      />
                      <span className="min-w-0">
                        <span className="font-nav block text-sm font-bold tracking-[0.1em] text-pvn-navy uppercase">
                          I am PVN alumni
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-pvn-navy/70">
                          You may have left Belfast. You never left the story.
                        </span>
                      </span>
                    </label>

                    <div
                      className="pvn-reveal"
                      data-open={isAlumni}
                      aria-hidden={!isAlumni}
                    >
                      <div>
                        <div className="grid gap-4 pt-1 sm:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <label htmlFor="pot-from" className={labelClass}>
                              Years here, from
                            </label>
                            <input
                              id="pot-from"
                              inputMode="numeric"
                              className={fieldClass}
                              value={alumniYearsFrom}
                              onChange={(event) =>
                                setAlumniYearsFrom(event.target.value)
                              }
                              placeholder="1998"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label htmlFor="pot-to" className={labelClass}>
                              To
                            </label>
                            <input
                              id="pot-to"
                              inputMode="numeric"
                              className={fieldClass}
                              value={alumniYearsTo}
                              onChange={(event) =>
                                setAlumniYearsTo(event.target.value)
                              }
                              placeholder="2004"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label
                              htmlFor="pot-ministry"
                              className={labelClass}
                            >
                              Ministry (optional)
                            </label>
                            <input
                              id="pot-ministry"
                              className={fieldClass}
                              value={alumniMinistry}
                              onChange={(event) =>
                                setAlumniMinistry(event.target.value)
                              }
                              placeholder="Choir"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label htmlFor="pot-city" className={labelClass}>
                              Where you are now (optional)
                            </label>
                            <input
                              id="pot-city"
                              className={fieldClass}
                              value={alumniCity}
                              onChange={(event) =>
                                setAlumniCity(event.target.value)
                              }
                              placeholder="Lagos"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 6 — review */}
                {step === 5 ? (
                  <div className="flex flex-col gap-6">
                    <div className="relative overflow-hidden rounded-sm bg-pvn-navy p-6 text-pvn-cream">
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/60 to-transparent"
                        aria-hidden
                      />
                      <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                        One restoration fund
                      </p>
                      <p className="font-display mt-2 text-3xl leading-tight font-semibold text-balance">
                        {title.trim() || "Untitled pot"}
                      </p>
                      <p className="font-nav mt-3 border-t border-pvn-cream/15 pt-3 text-xs font-bold tracking-[0.12em] text-pvn-cream/70 uppercase">
                        Aiming at{" "}
                        <span className="text-pvn-gold">
                          {targetPence === null
                            ? "—"
                            : formatWholeGbp(targetPence)}
                        </span>
                      </p>
                    </div>

                    <dl className="flex flex-col divide-y divide-pvn-navy/10 border-y border-pvn-navy/10">
                      {[
                        {
                          term: "Kind of pot",
                          value: activeType?.label ?? "—",
                          goto: 0,
                        },
                        { term: "Link", value: `/pots/${slug}`, goto: 1 },
                        {
                          term: "Description",
                          value:
                            descriptionWords === 0
                              ? "Add later"
                              : `${descriptionWords} words`,
                          goto: 2,
                        },
                        {
                          term: "Your story",
                          value:
                            founderWords === 0
                              ? "Add later"
                              : `${founderWords} words`,
                          goto: 2,
                        },
                        {
                          term: "Run by",
                          value: fundraiserName.trim() || "—",
                          goto: 4,
                        },
                        {
                          term: "We reply to",
                          value: fundraiserEmail.trim() || "—",
                          goto: 4,
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

                    <p className="text-xs leading-relaxed text-pvn-navy/60">
                      The pot stays behind the door until you lay the first stone
                      — a gift of {formatWholeGbp(MIN_POT_SEED_PENCE)} or more.
                      Then it opens on the wall for everyone else.
                    </p>
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
            </>
          )}

          <div className="flex flex-col gap-3 border-t border-pvn-navy/10 px-6 py-6 sm:flex-row-reverse sm:items-center sm:px-8">
            <button
              type="submit"
              className="pvn-give-submit font-nav relative inline-flex min-h-14 w-full items-center justify-center overflow-hidden rounded-md bg-pvn-gold px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-pvn-navy uppercase transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-pvn-gold-light hover:shadow-[0_16px_34px_-16px_rgba(201,168,76,0.95)] active:translate-y-0 active:scale-[0.99] active:duration-100 disabled:translate-y-0 disabled:opacity-60 sm:w-auto sm:flex-1"
            >
              <span
                className="pvn-give-submit-glint pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
                aria-hidden
              />
              <span
                key={`cta-${step}-${pending}`}
                className="pvn-figure relative inline-flex items-center gap-2"
              >
                {pending ? (
                  "Opening your pot…"
                ) : created ? (
                  seeding ? (
                    "Opening secure checkout…"
                  ) : seedPence !== null ? (
                    `Seed with ${formatTidyGbp(seedPence)}`
                  ) : (
                    "Seed my pot"
                  )
                ) : step < LAST ? (
                  <>
                    Continue
                    <span aria-hidden className="text-base leading-none">
                      →
                    </span>
                  </>
                ) : (
                  "Open this pot"
                )}
              </span>
            </button>

            {step > 0 && !created ? (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                className="font-nav inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-pvn-navy/15 px-5 text-sm font-bold tracking-[0.12em] text-pvn-navy/70 uppercase transition duration-300 ease-out hover:border-pvn-navy/35 hover:text-pvn-navy sm:w-auto"
              >
                <span aria-hidden>←</span> Back
              </button>
            ) : null}
          </div>
        </fieldset>

        {/* Confirmation */}
        <ResultModal
          open={confirming}
          variant="confirm"
          busy={pending}
          busyLabel={
            returningCreator
              ? "Creating your pot…"
              : "Creating your pot & account…"
          }
          title="Open this pot?"
          body={
            returningCreator
              ? `This email already has a Host login — stay signed in (or sign in at Host home first). Next you’ll seed it (${formatWholeGbp(MIN_POT_SEED_PENCE)}+) so it goes live.`
              : `We’ll email your Host login, then you’ll seed it (${formatWholeGbp(MIN_POT_SEED_PENCE)}+) so it goes live.`
          }
          confirmLabel="Continue"
          actionLabel="Not yet"
          onConfirm={() => void submit()}
          onClose={() => {
            if (!pending) setConfirming(false);
          }}
        >
          <dl className="divide-y divide-pvn-navy/10 rounded-sm border border-pvn-navy/10 bg-white/60">
            {[
              { term: "Name", value: title.trim() || "—" },
              {
                term: "Target",
                value: targetPence === null ? "—" : formatWholeGbp(targetPence),
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
      </form>

      <aside className="flex h-fit flex-col gap-5 lg:sticky lg:top-24">
        <div>
          <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-navy/45 uppercase">
            Live preview
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-pvn-navy/60">
            As it will appear on the wall — title, cover and progress. Your
            longer story sits on the pot page.
          </p>
        </div>

        <PotPreview
          type={type}
          title={title}
          story={description}
          photoUrl={photoPreview || photoUrl}
          targetPence={targetPence}
          fundraiserName={fundraiserName}
        />

        <div className="rounded-sm border border-pvn-gold/40 bg-pvn-gold/10 p-5">
          <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-navy uppercase">
            Your pot → our house
          </p>
          <p className="mt-2 text-sm leading-relaxed text-pvn-navy/75">
            Every gift into your pot counts twice over: once against your
            target, and once against the one total for 5 Paulett. No pot
            competes with another, and there is no leaderboard.
          </p>
        </div>
      </aside>
    </div>
  );
}
