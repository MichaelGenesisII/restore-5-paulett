"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { PotType } from "@prisma/client";
import { HostLoginModal } from "@/components/host/HostLoginModal";
import { PotPreview } from "@/components/pots/PotPreview";
import { ResultModal } from "@/components/ResultModal";
import { useToast } from "@/components/toast/ToastProvider";
import { hostFetch } from "@/lib/host-client";
import {
  formatTidyGbp,
  formatWholeGbp,
  isValidPotTargetPence,
  MAX_DONATION_PENCE,
  MIN_POT_SEED_PENCE,
  poundsToPence,
} from "@/lib/money";
import {
  MIN_FOUNDER_STORY_WORDS,
  MIN_POT_DESCRIPTION_WORDS,
  optionalCopyProblem,
  potTypes,
  POT_TARGET_PRESETS,
  wordCount,
} from "@/lib/pots";
import { getBrowserSession, getSupabaseBrowser } from "@/lib/supabase-browser";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

const fieldClass =
  "w-full rounded-sm border border-pvn-navy/15 bg-white/70 px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/45 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.7rem] font-bold uppercase tracking-[0.16em] text-pvn-navy/70";

const chipClass = (active: boolean) =>
  `font-nav min-h-9 rounded-md px-3 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition disabled:opacity-50 ${
    active
      ? "bg-pvn-navy text-pvn-cream"
      : "border border-pvn-navy/15 bg-white/50 text-pvn-navy/70 hover:border-pvn-gold"
  }`;

const COVER_MAX = 5 * 1024 * 1024;
const COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TITLE_MAX = 80;
const SEED_PRESETS = [MIN_POT_SEED_PENCE, 5_000, 10_000];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Account = { email: string; name: string | null };

type UnpaidPot = { slug: string; title: string };

/** Most recent fundraiser the signed-in host saved but never seeded. */
async function findUnpaidPot(): Promise<UnpaidPot | null> {
  try {
    const response = await hostFetch("/api/host/me");
    if (!response.ok) return null;
    const json = (await response.json()) as {
      pots?: Array<{ slug: string; title: string; status: string }>;
    };
    const pot = json.pots?.find((p) => p.status === "PENDING");
    return pot ? { slug: pot.slug, title: pot.title } : null;
  } catch {
    return null;
  }
}

type Draft = {
  title: string;
  preset: number | null;
  custom: string;
  name: string;
  email: string;
  isAlumni: boolean;
  yearsFrom: string;
  yearsTo: string;
  ministry: string;
  city: string;
  type: PotType;
  story: string;
  founderStory: string;
  seedPreset: number | null;
  seedCustom: string;
};

const EMPTY: Draft = {
  title: "",
  preset: null,
  custom: "",
  name: "",
  email: "",
  isAlumni: false,
  yearsFrom: "",
  yearsTo: "",
  ministry: "",
  city: "",
  type: "INDIVIDUAL",
  story: "",
  founderStory: "",
  seedPreset: MIN_POT_SEED_PENCE,
  seedCustom: "",
};

function draftKey(mode: "public" | "host") {
  return `pvn-create-fundraiser:v1:${mode}`;
}

function readDraft(mode: "public" | "host"): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(mode));
    if (!raw) return null;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    return null;
  }
}

function hasContent(draft: Draft) {
  return Boolean(
    draft.title.trim() ||
      draft.custom.trim() ||
      draft.preset !== null ||
      draft.story.trim() ||
      draft.founderStory.trim(),
  );
}

function parseYear(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const year = Number(trimmed);
  return year >= 1900 && year <= new Date().getFullYear() ? year : null;
}

function copyHint(value: string, minWords: number): string {
  const words = wordCount(value);
  if (words === 0) return `optional · ${minWords}+ words if written`;
  if (words < minWords) return `optional · ${minWords - words} more`;
  return `optional · ${words} words`;
}

type Props =
  | {
      mode: "public";
      account?: undefined;
      onCreated?: undefined;
      onDirtyChange?: undefined;
      cancelHref?: undefined;
    }
  | {
      mode: "host";
      account: Account;
      onCreated?: () => void;
      onDirtyChange?: (dirty: boolean) => void;
      cancelHref?: string;
    };

/**
 * One short form for visitors and hosts: name, target, who you are, first
 * stone — then one button creates the fundraiser and opens card checkout.
 * Everything else is optional and folded away. Answers autosave locally.
 */
export function QuickCreateFundraiser(props: Props) {
  const { mode } = props;
  const toast = useToast();
  const uid = useId();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [restored, setRestored] = useState(false);
  const [account, setAccount] = useState<Account | null>(
    props.mode === "host" ? props.account : null,
  );
  const [returningEmail, setReturningEmail] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<"idle" | "creating" | "paying">("idle");
  const [created, setCreated] = useState<{
    slug: string;
    title: string;
    newAccount: boolean;
  } | null>(null);
  const [unpaid, setUnpaid] = useState<UnpaidPot | null>(null);
  const [resumeOffer, setResumeOffer] = useState<{
    pot: UnpaidPot;
    payNow: boolean;
    signedIn: Account;
  } | null>(null);

  const lookups = useRef(new Map<string, boolean>());
  const pendingIntent = useRef<boolean | null>(null);
  const hydrated = useRef(false);

  const onDirtyChange = props.mode === "host" ? props.onDirtyChange : undefined;
  const onCreated = props.mode === "host" ? props.onCreated : undefined;

  useEffect(() => {
    const saved = readDraft(mode);
    hydrated.current = true;
    if (saved && hasContent(saved)) {
      // Restoring browser-only storage must wait until after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(saved);
      setRestored(true);
      if (saved.story.trim() || saved.founderStory.trim() || saved.type !== "INDIVIDUAL") {
        setDetailsOpen(true);
      }
    }
  }, [mode]);

  useEffect(() => {
    if (!hydrated.current || created) return;
    try {
      if (hasContent(draft)) {
        localStorage.setItem(draftKey(mode), JSON.stringify(draft));
      }
    } catch {
      /* private mode / quota */
    }
  }, [draft, mode, created]);

  useEffect(() => {
    if (mode !== "public") return;
    let cancelled = false;
    void getBrowserSession().then(({ session }) => {
      if (cancelled || !session?.user.email) return;
      const metaName = session.user.user_metadata?.name;
      setAccount({
        email: session.user.email.toLowerCase(),
        name: typeof metaName === "string" ? metaName : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (!account || created) return;
    let cancelled = false;
    void findUnpaidPot().then((pot) => {
      if (!cancelled) setUnpaid(pot);
    });
    return () => {
      cancelled = true;
    };
  }, [account, created]);

  useEffect(() => {
    if (!onDirtyChange) return;
    onDirtyChange(!created && (hasContent(draft) || Boolean(photoFile)));
    return () => onDirtyChange(false);
  }, [draft, photoFile, created, onDirtyChange]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey(mode));
    } catch {
      /* ignore */
    }
  }

  function startOver() {
    clearDraft();
    setDraft(EMPTY);
    setRestored(false);
    setDetailsOpen(false);
    clearCover();
  }

  const targetPence = useMemo(
    () => (draft.custom.trim() ? poundsToPence(draft.custom) : draft.preset),
    [draft.custom, draft.preset],
  );
  const seedPence = useMemo(
    () =>
      draft.seedCustom.trim() ? poundsToPence(draft.seedCustom) : draft.seedPreset,
    [draft.seedCustom, draft.seedPreset],
  );
  const activeType = potTypes.find((option) => option.value === draft.type);
  const busy = phase !== "idle";
  const seedLabel =
    seedPence !== null && seedPence >= MIN_POT_SEED_PENCE
      ? formatTidyGbp(seedPence)
      : null;

  function clearCover() {
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview("");
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
    if (file.size > COVER_MAX) {
      setPhotoError("Keep the cover under 5 MB.");
      return;
    }
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function isReturning(email: string): Promise<boolean> {
    const cached = lookups.current.get(email);
    if (cached !== undefined) return cached;
    try {
      const response = await fetch(
        `/api/host/lookup?email=${encodeURIComponent(email)}`,
      );
      const json = (await response.json()) as { returning?: boolean };
      const returning = json.returning === true;
      if (response.ok) lookups.current.set(email, returning);
      return returning;
    } catch {
      return false;
    }
  }

  async function checkEmail() {
    if (account) return;
    const email = draft.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setReturningEmail(null);
      return;
    }
    const returning = await isReturning(email);
    setReturningEmail(returning ? email : null);
  }

  async function signOut() {
    try {
      await getSupabaseBrowser().auth.signOut();
    } finally {
      setAccount(null);
    }
  }

  function seedProblem(): string | null {
    if (seedPence === null || seedPence < MIN_POT_SEED_PENCE) {
      return `The first stone must be at least ${formatWholeGbp(MIN_POT_SEED_PENCE)}.`;
    }
    if (seedPence > MAX_DONATION_PENCE) {
      return `The most we can take in one gift is ${formatWholeGbp(MAX_DONATION_PENCE)}.`;
    }
    return null;
  }

  async function startCheckout(slug: string, donor: Account) {
    setPhase("paying");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence: seedPence,
          potSlug: slug,
          giftMode: "card_once",
          donorName: donor.name ?? donor.email,
          donorEmail: donor.email,
        }),
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not open checkout. Please try again.",
          ),
        );
      }
      window.location.href = json.url;
    } catch (err) {
      setPhase("idle");
      toast.error(
        "Checkout did not open",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Your fundraiser is saved — nothing was taken. Try again below.",
        ),
      );
    }
  }

  function finishUnpaid(pot: UnpaidPot, donor: Account) {
    const problem = seedProblem();
    if (problem) {
      toast.error("First stone", problem);
      return;
    }
    setResumeOffer(null);
    void startCheckout(pot.slug, donor);
  }

  async function submit(
    payNow: boolean,
    signedIn: Account | null = account,
    allowDuplicate = false,
  ) {
    if (busy) return;

    // Visitors who back out of checkout tend to come back and start over,
    // leaving the first fundraiser unseeded. Offer to finish that one instead.
    if (signedIn && !allowDuplicate) {
      const waiting =
        signedIn === account ? unpaid : await findUnpaidPot();
      if (waiting) {
        setUnpaid(waiting);
        setResumeOffer({ pot: waiting, payNow, signedIn });
        return;
      }
    }

    const title = draft.title.trim();
    if (title.length < 3) {
      toast.error("Name your fundraiser", "Use at least 3 characters.");
      return;
    }
    if (!isValidPotTargetPence(targetPence)) {
      toast.error("Choose a target", "Pick an amount or type your own.");
      return;
    }

    const name = (signedIn?.name ?? draft.name).trim();
    const email = (signedIn?.email ?? draft.email).trim().toLowerCase();
    if (!signedIn) {
      if (!name) {
        toast.error("Your name", "Tell us who is hosting this fundraiser.");
        return;
      }
      if (!EMAIL_RE.test(email)) {
        toast.error("Your email", "Enter an email we can reach you on.");
        return;
      }
    }

    const storyProblem = optionalCopyProblem(
      draft.story,
      MIN_POT_DESCRIPTION_WORDS,
      "The fundraiser description",
    );
    const founderProblem = optionalCopyProblem(
      draft.founderStory,
      MIN_FOUNDER_STORY_WORDS,
      "Your story",
    );
    if (storyProblem || founderProblem) {
      setDetailsOpen(true);
      toast.error("Optional details", storyProblem ?? founderProblem ?? "");
      return;
    }

    if (payNow) {
      const problem = seedProblem();
      if (problem) {
        toast.error("First stone", problem);
        return;
      }
    }

    if (!signedIn && (await isReturning(email))) {
      setReturningEmail(email);
      pendingIntent.current = payNow;
      setLoginOpen(true);
      return;
    }

    setPhase("creating");
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const form = new FormData();
        form.append("file", photoFile);
        const upload = signedIn
          ? await hostFetch("/api/uploads/pot-cover", { method: "POST", body: form })
          : await fetch("/api/uploads/pot-cover", { method: "POST", body: form });
        const uploaded = (await upload.json()) as { url?: string; error?: string };
        if (!upload.ok || !uploaded.url) {
          throw new Error(
            visitorSafeApiError(
              upload.status,
              uploaded.error,
              "We could not upload the cover. Please try again.",
            ),
          );
        }
        photoUrl = uploaded.url;
      }

      const shared = {
        title,
        type: draft.type,
        targetAmountPence: targetPence,
        story: draft.story.trim() || null,
        founderStory: draft.founderStory.trim() || null,
        photoUrl,
      };

      let pot: { slug: string; title: string };
      let donor: Account;
      let newAccount = false;

      if (signedIn) {
        const response = await hostFetch("/api/host/pots", {
          method: "POST",
          body: JSON.stringify({ ...shared, name: signedIn.name }),
        });
        const json = (await response.json()) as {
          pot?: { slug: string; title: string };
          error?: string;
        };
        if (!response.ok || !json.pot) {
          throw new Error(
            visitorSafeApiError(
              response.status,
              json.error,
              "We could not save your fundraiser.",
            ),
          );
        }
        pot = json.pot;
        donor = signedIn;
      } else {
        const response = await fetch("/api/pots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...shared,
            fundraiserName: name,
            fundraiserEmail: email,
            isAlumni: draft.isAlumni,
            ...(draft.isAlumni
              ? {
                  alumniYearsFrom: parseYear(draft.yearsFrom) ?? undefined,
                  alumniYearsTo: parseYear(draft.yearsTo) ?? undefined,
                  alumniMinistry: draft.ministry.trim() || undefined,
                  alumniCity: draft.city.trim() || undefined,
                }
              : {}),
          }),
        });
        const json = (await response.json()) as {
          pot?: { slug: string; title: string };
          account?: { email: string; isNewAccount: boolean };
          session?: { access_token: string; refresh_token: string } | null;
          error?: string;
        };
        if (!response.ok || !json.pot) {
          throw new Error(
            visitorSafeApiError(
              response.status,
              json.error,
              "We could not save your fundraiser.",
            ),
          );
        }
        pot = json.pot;
        donor = { email, name };
        newAccount = json.account?.isNewAccount === true;
        if (json.session) {
          const { error } = await getSupabaseBrowser().auth.setSession(json.session);
          if (!error) setAccount(donor);
        }
      }

      clearDraft();
      setRestored(false);
      setCreated({ slug: pot.slug, title: pot.title, newAccount });
      onCreated?.();

      if (payNow) {
        await startCheckout(pot.slug, donor);
      } else {
        setPhase("idle");
        toast.success(
          "Fundraiser saved",
          "It opens when you lay the first stone.",
        );
      }
    } catch (err) {
      setPhase("idle");
      toast.error(
        "Your fundraiser was not saved",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Nothing was lost — please try again.",
        ),
      );
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(true);
  }

  async function onSignedInFromModal() {
    const { session } = await getBrowserSession();
    const email = session?.user.email?.toLowerCase();
    if (!email) return;
    const metaName = session?.user.user_metadata?.name;
    const signedIn: Account = {
      email,
      name: typeof metaName === "string" ? metaName : draft.name.trim() || null,
    };
    setAccount(signedIn);
    setReturningEmail(null);
    setLoginOpen(false);
    const intent = pendingIntent.current;
    pendingIntent.current = null;
    if (intent !== null) {
      void submit(intent, signedIn);
    } else {
      toast.success("Signed in", "Your fundraiser will join your host account.");
    }
  }

  const seedChips = (
    <div className="flex flex-wrap gap-2">
      {SEED_PRESETS.map((value) => (
        <button
          key={value}
          type="button"
          disabled={busy}
          onClick={() => update({ seedPreset: value, seedCustom: "" })}
          className={chipClass(!draft.seedCustom.trim() && draft.seedPreset === value)}
        >
          {formatWholeGbp(value)}
        </button>
      ))}
      <label className="min-w-[7rem] flex-1 sm:max-w-[10rem]">
        <span className="sr-only">Custom first stone in pounds</span>
        <input
          className={`${fieldClass} min-h-9 py-1.5`}
          inputMode="decimal"
          placeholder="Other £"
          value={draft.seedCustom}
          disabled={busy}
          onChange={(e) => update({ seedCustom: e.target.value, seedPreset: null })}
        />
      </label>
    </div>
  );

  if (created && phase !== "paying") {
    return (
      <div className="max-w-xl animate-[pvn-rise_0.45s_ease-out] rounded-sm border border-pvn-navy/10 bg-white/70 p-5 shadow-[0_24px_60px_-34px_rgba(12,27,51,0.5)] sm:p-8">
        <p className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
          Saved · waiting for its first stone
        </p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-pvn-navy">
          {created.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-pvn-navy/65">
          Nobody can see it yet. It goes on the wall the moment you lay the
          first stone ({formatWholeGbp(MIN_POT_SEED_PENCE)} or more).
          {created.newAccount
            ? " You are signed in on this device, and we have emailed you a link to set a password."
            : ""}
        </p>

        <div className="mt-6">
          <p className={labelClass}>First stone</p>
          <div className="mt-2">{seedChips}</div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const problem = seedProblem();
              if (problem) {
                toast.error("First stone", problem);
                return;
              }
              void startCheckout(
                created.slug,
                account ?? { email: draft.email.trim(), name: draft.name.trim() || null },
              );
            }}
            className="font-nav mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50"
          >
            {seedLabel ? `Lay the first stone · ${seedLabel}` : "Lay the first stone"}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-pvn-navy/10 pt-4">
          <Link
            href={`/host/pots/${created.slug}`}
            className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/70 uppercase underline decoration-pvn-gold/40 underline-offset-4 transition hover:text-pvn-navy"
          >
            Manage fundraiser
          </Link>
          <Link
            href={`/pots/${created.slug}`}
            className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/50 uppercase underline decoration-pvn-gold/40 underline-offset-4 transition hover:text-pvn-navy"
          >
            View its page
          </Link>
        </div>
      </div>
    );
  }

  const form = (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative min-w-0 rounded-sm border border-pvn-navy/10 bg-white/70 p-5 shadow-[0_24px_60px_-34px_rgba(12,27,51,0.5)] sm:p-8"
    >
      {busy ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-sm bg-pvn-cream/90 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
            aria-hidden
          />
          <p className="font-nav text-xs font-bold tracking-[0.16em] text-pvn-navy uppercase">
            {phase === "paying" ? "Opening secure checkout…" : "Saving your fundraiser…"}
          </p>
        </div>
      ) : null}

      {restored ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-sm bg-pvn-gold/10 px-3.5 py-2.5 text-xs text-pvn-navy/75">
          <span>We kept what you typed last time.</span>
          <button
            type="button"
            onClick={startOver}
            className="font-nav font-bold tracking-[0.1em] text-pvn-navy/60 uppercase underline decoration-pvn-gold/40 underline-offset-4 hover:text-pvn-navy"
          >
            Start over
          </button>
        </div>
      ) : null}

      {account && unpaid ? (
        <div className="mb-6 flex flex-col gap-3 rounded-sm border border-pvn-gold/50 bg-pvn-gold/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-pvn-navy/80">
            <span className="font-semibold text-pvn-navy">{unpaid.title}</span>{" "}
            is saved but still waiting for its first stone. Finish it, or carry
            on below to start a different fundraiser.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => finishUnpaid(unpaid, account)}
            className="font-nav inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-pvn-navy px-4 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 disabled:opacity-50"
          >
            {seedLabel ? `Finish it · ${seedLabel}` : "Finish it"}
          </button>
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${uid}-title`} className={labelClass}>
            Fundraiser name
          </label>
          <input
            id={`${uid}-title`}
            className={fieldClass}
            value={draft.title}
            maxLength={TITLE_MAX}
            placeholder={activeType?.placeholder ?? "Name your fundraiser"}
            onChange={(e) => update({ title: e.target.value })}
            required
            autoComplete="off"
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Target</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {POT_TARGET_PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ preset: value, custom: "" })}
                className={chipClass(!draft.custom.trim() && draft.preset === value)}
              >
                {formatWholeGbp(value)}
              </button>
            ))}
            <label className="min-w-[7rem] flex-1 sm:max-w-[10rem]">
              <span className="sr-only">Custom target in pounds</span>
              <input
                className={`${fieldClass} min-h-9 py-1.5`}
                inputMode="decimal"
                placeholder="Other £"
                value={draft.custom}
                onChange={(e) => update({ custom: e.target.value, preset: null })}
              />
            </label>
          </div>
        </fieldset>

        {account ? (
          mode === "public" ? (
            <p className="rounded-sm border border-pvn-navy/10 bg-pvn-cream/60 px-3.5 py-2.5 text-sm text-pvn-navy/75">
              Hosting as <span className="font-semibold text-pvn-navy">{account.email}</span>
              {" · "}
              <button
                type="button"
                onClick={() => void signOut()}
                className="font-semibold text-pvn-navy/60 underline decoration-pvn-gold/40 underline-offset-4 hover:text-pvn-navy"
              >
                Not you?
              </button>
            </p>
          ) : null
        ) : (
          <fieldset className="space-y-4">
            <legend className={labelClass}>You</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor={`${uid}-name`} className="sr-only">
                  Your name
                </label>
                <input
                  id={`${uid}-name`}
                  className={fieldClass}
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  autoComplete="name"
                  maxLength={120}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor={`${uid}-email`} className="sr-only">
                  Your email
                </label>
                <input
                  id={`${uid}-email`}
                  type="email"
                  className={fieldClass}
                  value={draft.email}
                  onChange={(e) => {
                    update({ email: e.target.value });
                    if (returningEmail) setReturningEmail(null);
                  }}
                  onBlur={() => void checkEmail()}
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {returningEmail ? (
              <div className="flex flex-col gap-3 rounded-sm border border-pvn-gold/50 bg-pvn-gold/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-relaxed text-pvn-navy/80">
                  <span className="font-semibold text-pvn-navy">Welcome back.</span>{" "}
                  This email already has a host account — sign in and the
                  fundraiser joins it.
                </p>
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="font-nav inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-pvn-navy px-4 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90"
                >
                  Sign in
                </button>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={draft.isAlumni}
                onChange={(e) => update({ isAlumni: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 accent-pvn-navy"
              />
              <span className="text-sm leading-relaxed text-pvn-navy/75">
                <span className="font-semibold text-pvn-navy">I am PVN alumni</span>{" "}
                — you may have left Belfast, you never left the story.
              </span>
            </label>

            <div className="pvn-reveal" data-open={draft.isAlumni} aria-hidden={!draft.isAlumni}>
              <div>
                <div className="grid gap-3 pt-1 sm:grid-cols-4">
                  <input
                    aria-label="Years here, from (optional)"
                    inputMode="numeric"
                    className={fieldClass}
                    value={draft.yearsFrom}
                    onChange={(e) => update({ yearsFrom: e.target.value })}
                    placeholder="From (1998)"
                    tabIndex={draft.isAlumni ? undefined : -1}
                  />
                  <input
                    aria-label="Years here, to (optional)"
                    inputMode="numeric"
                    className={fieldClass}
                    value={draft.yearsTo}
                    onChange={(e) => update({ yearsTo: e.target.value })}
                    placeholder="To (2004)"
                    tabIndex={draft.isAlumni ? undefined : -1}
                  />
                  <input
                    aria-label="Ministry (optional)"
                    className={fieldClass}
                    value={draft.ministry}
                    onChange={(e) => update({ ministry: e.target.value })}
                    placeholder="Ministry"
                    tabIndex={draft.isAlumni ? undefined : -1}
                  />
                  <input
                    aria-label="Where you are now (optional)"
                    className={fieldClass}
                    value={draft.city}
                    onChange={(e) => update({ city: e.target.value })}
                    placeholder="City now"
                    tabIndex={draft.isAlumni ? undefined : -1}
                  />
                </div>
                <p className="pt-2 text-xs text-pvn-navy/50">
                  All optional — ticking the box is enough.
                </p>
              </div>
            </div>
          </fieldset>
        )}

        <details
          open={detailsOpen}
          onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
          className="group rounded-sm border border-pvn-navy/10 bg-pvn-cream/40"
        >
          <summary className="font-nav flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/70 uppercase [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 truncate">
              Add a description, story or cover
              <span className="ml-2 tracking-normal normal-case text-pvn-navy/40">
                optional
              </span>
            </span>
            <span
              className="shrink-0 text-pvn-gold transition group-open:rotate-45"
              aria-hidden
            >
              +
            </span>
          </summary>

          <div className="space-y-5 border-t border-pvn-navy/10 px-4 pt-4 pb-5">
            <p className="text-xs leading-relaxed text-pvn-navy/55">
              Skip these if you are in a hurry — you can add them any time
              from your host account.
            </p>

            <fieldset>
              <legend className={labelClass}>Who is building?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {potTypes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update({ type: option.value })}
                    className={chipClass(draft.type === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {activeType ? (
                <p className="mt-2 text-xs text-pvn-navy/50">{activeType.blurb}</p>
              ) : null}
            </fieldset>

            <label className="block">
              <span className={labelClass}>
                Description{" "}
                <span className="tracking-normal normal-case text-pvn-navy/40">
                  ({copyHint(draft.story, MIN_POT_DESCRIPTION_WORDS)})
                </span>
              </span>
              <textarea
                className={`${fieldClass} mt-1.5 min-h-24`}
                value={draft.story}
                onChange={(e) => update({ story: e.target.value })}
                placeholder="What is this fundraiser for?"
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                Your story{" "}
                <span className="tracking-normal normal-case text-pvn-navy/40">
                  ({copyHint(draft.founderStory, MIN_FOUNDER_STORY_WORDS)})
                </span>
              </span>
              <textarea
                className={`${fieldClass} mt-1.5 min-h-24`}
                value={draft.founderStory}
                onChange={(e) => update({ founderStory: e.target.value })}
                placeholder={activeType?.storyHint}
              />
            </label>

            <div>
              <p className={labelClass}>
                Cover image{" "}
                <span className="tracking-normal normal-case text-pvn-navy/40">
                  (optional · landscape)
                </span>
              </p>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => onCoverChosen(e.target.files?.[0] ?? null)}
              />
              {photoPreview ? (
                <div className="mt-2 overflow-hidden border border-pvn-navy/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="" className="aspect-[16/9] w-full object-cover" />
                  <div className="flex gap-3 border-t border-pvn-navy/10 px-3 py-2">
                    <button
                      type="button"
                      className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase"
                      onClick={clearCover}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="mt-2 flex min-h-20 w-full flex-col items-center justify-center gap-1 border border-dashed border-pvn-navy/20 bg-white/40 px-3 py-3 text-center transition hover:border-pvn-gold"
                >
                  <span className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/70 uppercase">
                    Add a cover
                  </span>
                  <span className="text-[0.7rem] text-pvn-navy/45">
                    16:9 · JPEG, PNG or WebP · max 5 MB
                  </span>
                </button>
              )}
              {photoError ? (
                <p className="mt-1.5 text-xs text-red-800/80">{photoError}</p>
              ) : null}
            </div>
          </div>
        </details>

        <fieldset className="border-t border-pvn-navy/10 pt-6">
          <legend className="sr-only">First stone</legend>
          <p className={labelClass}>First stone</p>
          <p className="mt-1 text-xs leading-relaxed text-pvn-navy/55">
            You open your fundraiser with a gift of{" "}
            {formatWholeGbp(MIN_POT_SEED_PENCE)} or more. Then it goes on the
            wall for everyone else.
          </p>
          <div className="mt-3">{seedChips}</div>
        </fieldset>
      </div>

      <div className="mt-7 flex flex-col gap-3">
        <button
          type="submit"
          disabled={busy}
          className="font-nav inline-flex min-h-12 w-full items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50"
        >
          {seedLabel ? `Create and pay ${seedLabel}` : "Create and pay"}
        </button>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit(false)}
            className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/55 uppercase underline decoration-pvn-gold/40 underline-offset-4 transition hover:text-pvn-navy disabled:opacity-50"
          >
            Save — I’ll pay later
          </button>
          {props.mode === "host" && props.cancelHref ? (
            <Link
              href={props.cancelHref}
              className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase transition hover:text-pvn-navy"
            >
              Cancel
            </Link>
          ) : null}
        </div>
        {!account ? (
          <p className="text-center text-xs leading-relaxed text-pvn-navy/50">
            No sign-up step: we sign you in straight away and email you a link
            to set a password.
          </p>
        ) : null}
      </div>
    </form>
  );

  return (
    <>
      {mode === "public" ? (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          {form}
          <aside className="hidden h-fit flex-col gap-5 lg:sticky lg:top-24 lg:flex">
            <div>
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-navy/45 uppercase">
                Live preview
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-pvn-navy/60">
                As it will appear on the wall once the first stone is laid.
              </p>
            </div>
            <PotPreview
              type={draft.type}
              title={draft.title}
              photoUrl={photoPreview}
              targetPence={targetPence}
              fundraiserName={account?.name ?? draft.name}
            />
            <div className="rounded-sm border border-pvn-gold/40 bg-pvn-gold/10 p-5">
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-navy uppercase">
                Your fundraiser → our house
              </p>
              <p className="mt-2 text-sm leading-relaxed text-pvn-navy/75">
                Every gift into your fundraiser counts twice over: once against
                your target, and once against the one total for 5 Paulett. No
                fundraiser competes with another, and there is no leaderboard.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="max-w-xl">{form}</div>
      )}

      <HostLoginModal
        open={loginOpen}
        onClose={() => {
          pendingIntent.current = null;
          setLoginOpen(false);
        }}
        initialEmail={returningEmail ?? draft.email.trim()}
        title="Welcome back"
        lead="This email already has a host account. Sign in and we will carry on where you left off."
        workingLabel="Carrying on…"
        onSignedIn={onSignedInFromModal}
      />

      <ResultModal
        open={resumeOffer !== null}
        variant="confirm"
        title="Finish your first fundraiser?"
        body={
          resumeOffer
            ? `You already started “${resumeOffer.pot.title}”, but it hasn’t had its first stone yet, so nobody can see it. Finish that one, or create a new fundraiser alongside it.`
            : ""
        }
        confirmLabel={seedLabel ? `Finish it · ${seedLabel}` : "Finish it"}
        onConfirm={() => {
          if (resumeOffer) finishUnpaid(resumeOffer.pot, resumeOffer.signedIn);
        }}
        actionLabel="Create a new one"
        onSecondary={() => {
          const offer = resumeOffer;
          setResumeOffer(null);
          if (offer) void submit(offer.payNow, offer.signedIn, true);
        }}
        onClose={() => setResumeOffer(null)}
      />
    </>
  );
}
