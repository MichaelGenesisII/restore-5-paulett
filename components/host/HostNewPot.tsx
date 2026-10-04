"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { PotType } from "@prisma/client";
import { HostShareKit } from "@/components/host/HostShareKit";
import { useHostDashboard } from "@/components/host/HostDashboardShell";
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
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

const fieldClass =
  "w-full rounded-sm border border-pvn-navy/15 bg-white/70 px-3.5 py-2.5 text-sm text-pvn-navy transition placeholder:text-pvn-navy/45 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none";

const labelClass =
  "font-nav text-[0.7rem] font-bold uppercase tracking-[0.16em] text-pvn-navy/70";

const COVER_MAX = 5 * 1024 * 1024;
const COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TITLE_MAX = 80;

function copyHint(value: string, minWords: number): string {
  const words = wordCount(value);
  if (words === 0) return `optional · ${minWords}+ words if written`;
  if (words < minWords) return `optional · ${minWords - words} more`;
  return `optional · ${words} words`;
}

/**
 * Compact authenticated pot create — one page, then seed CTA.
 * Public visitors use CreatePotWizard at /fundraisers/create instead
 * (that flow can create a Host login). Both paths are intentional.
 */
export function HostNewPot() {
  const router = useRouter();
  const toast = useToast();
  const { data, refresh, setFormDirty } = useHostDashboard();

  const [type, setType] = useState<PotType>("INDIVIDUAL");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [founderStory, setFounderStory] = useState("");
  const [preset, setPreset] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [formStarted, setFormStarted] = useState(false);
  const [created, setCreated] = useState<{
    slug: string;
    title: string;
  } | null>(null);

  const [seedPreset, setSeedPreset] = useState<number | null>(MIN_POT_SEED_PENCE);
  const [seedCustom, setSeedCustom] = useState("");
  const [seeding, setSeeding] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);

  function markStarted() {
    if (!formStarted) setFormStarted(true);
  }

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    const dirty =
      formStarted &&
      !created &&
      (Boolean(title.trim()) ||
        Boolean(story.trim()) ||
        Boolean(founderStory.trim()) ||
        Boolean(photoFile) ||
        Boolean(custom.trim()));
    setFormDirty(dirty);
    return () => setFormDirty(false);
  }, [
    formStarted,
    created,
    title,
    story,
    founderStory,
    photoFile,
    custom,
    setFormDirty,
  ]);

  const targetPence = useMemo(
    () => (custom.trim() ? poundsToPence(custom) : preset),
    [custom, preset],
  );

  const seedPence = useMemo(
    () => (seedCustom.trim() ? poundsToPence(seedCustom) : seedPreset),
    [seedCustom, seedPreset],
  );

  const activeType = potTypes.find((o) => o.value === type);

  function clearCover() {
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoError(null);
  }

  function onCoverChosen(file: File | null) {
    markStarted();
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending || !data) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      toast.error("Name your fundraiser", "Use at least 3 characters.");
      return;
    }
    if (!isValidPotTargetPence(targetPence)) {
      toast.error("Choose a target", "Pick a preset or enter a valid amount.");
      return;
    }
    const storyProblem = optionalCopyProblem(
      story,
      MIN_POT_DESCRIPTION_WORDS,
      "The fundraiser description",
    );
    if (storyProblem) {
      toast.error("Description", storyProblem);
      return;
    }
    const founderProblem = optionalCopyProblem(
      founderStory,
      MIN_FOUNDER_STORY_WORDS,
      "Your story",
    );
    if (founderProblem) {
      toast.error("Your story", founderProblem);
      return;
    }

    setPending(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const form = new FormData();
        form.append("file", photoFile);
        const upload = await hostFetch("/api/uploads/pot-cover", {
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
              "Cover upload failed.",
            ),
          );
        }
        photoUrl = uploaded.url;
      }

      const response = await hostFetch("/api/host/pots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          type,
          targetAmountPence: targetPence,
          story: story.trim() || null,
          founderStory: founderStory.trim() || null,
          photoUrl,
          name: data.user.name,
        }),
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
            "We could not create your fundraiser.",
          ),
        );
      }

      setCreated({ slug: json.pot.slug, title: json.pot.title });
      toast.success("Fundraiser created", "Seed it with £25 or more to go live.");
      await refresh();
    } catch (err) {
      toast.error(
        "Could not create fundraiser",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  async function seedPot() {
    if (!created || !data) return;
    if (
      seedPence === null ||
      seedPence < MIN_POT_SEED_PENCE ||
      seedPence > MAX_DONATION_PENCE
    ) {
      toast.error(
        "Seed amount too low",
        `The first stone must be at least ${formatWholeGbp(MIN_POT_SEED_PENCE)}.`,
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
          donorName: data.user.name ?? data.user.email,
          donorEmail: data.user.email,
        }),
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not start the seed gift.",
          ),
        );
      }
      window.location.href = json.url;
    } catch (err) {
      setSeeding(false);
      toast.error(
        "The seed gift did not start",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    }
  }

  if (created) {
    return (
      <div className="animate-[pvn-rise_0.45s_ease-out]">
        <p className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
          Needs seed
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-pvn-navy sm:text-4xl">
          {created.title}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-pvn-navy/65">
          Your fundraiser is ready but not live yet. Lay the first stone (£25+)
          to open it, or come back later from Manage.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <HostShareKit slug={created.slug} title={created.title} />
          <Link
            href={`/host/pots/${created.slug}`}
            className="font-nav inline-flex min-h-10 items-center rounded-md border border-pvn-navy/15 px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/70 uppercase transition hover:border-pvn-navy/30 hover:text-pvn-navy"
          >
            Manage fundraiser
          </Link>
          <Link
            href={`/pots/${created.slug}`}
            className="font-nav inline-flex min-h-10 items-center text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase transition hover:text-pvn-navy"
          >
            View public page
          </Link>
        </div>

        <section className="mt-10 max-w-md border border-pvn-navy/10 bg-white/60 p-5">
          <h2 className="font-display text-xl font-semibold text-pvn-navy">
            Seed this fundraiser
          </h2>
          <p className="mt-1 text-sm text-pvn-navy/60">
            Minimum {formatWholeGbp(MIN_POT_SEED_PENCE)}. Card checkout opens
            next.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[MIN_POT_SEED_PENCE, 5_000, 10_000].map((value) => {
              const active = !seedCustom.trim() && seedPreset === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={seeding}
                  onClick={() => {
                    setSeedPreset(value);
                    setSeedCustom("");
                  }}
                  className={`font-nav min-h-9 rounded-md px-3 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition ${
                    active
                      ? "bg-pvn-navy text-pvn-cream"
                      : "border border-pvn-navy/15 text-pvn-navy/70 hover:border-pvn-gold"
                  }`}
                >
                  {formatWholeGbp(value)}
                </button>
              );
            })}
          </div>
          <label className="mt-4 block">
            <span className={labelClass}>Or custom</span>
            <input
              className={`${fieldClass} mt-1.5`}
              inputMode="decimal"
              placeholder="e.g. 40"
              value={seedCustom}
              disabled={seeding}
              onChange={(e) => {
                setSeedCustom(e.target.value);
                setSeedPreset(null);
              }}
            />
          </label>
          <button
            type="button"
            disabled={seeding}
            onClick={() => void seedPot()}
            className="font-nav mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50"
          >
            {seeding
              ? "Starting checkout…"
              : seedPence !== null
                ? `Seed with ${formatTidyGbp(seedPence)}`
                : "Seed fundraiser"}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/host/pots"
        className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/50 uppercase transition hover:text-pvn-gold"
      >
        ← Your fundraisers
      </Link>
      <h1 className="font-display mt-2 text-3xl font-semibold text-pvn-navy sm:text-4xl">
        Start a fundraiser
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-pvn-navy/65">
        Only a name and a target are needed. Description, story and cover are
        optional — add them later from Manage. Seed after create to go live.
      </p>

      <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-6">
        <fieldset>
          <legend className={labelClass}>Who is building?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {potTypes.map((option) => {
              const active = type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    markStarted();
                    setType(option.value);
                  }}
                  className={`rounded-md border px-3 py-2 text-left transition ${
                    active
                      ? "border-pvn-gold bg-pvn-gold/15 text-pvn-navy"
                      : "border-pvn-navy/12 bg-white/50 text-pvn-navy/70 hover:border-pvn-navy/25"
                  }`}
                >
                  <span className="font-nav block text-[0.6rem] font-bold tracking-[0.12em] uppercase">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
          {activeType ? (
            <p className="mt-2 text-xs text-pvn-navy/50">{activeType.blurb}</p>
          ) : null}
        </fieldset>

        <label className="block">
          <span className={labelClass}>Fundraiser name</span>
          <input
            className={`${fieldClass} mt-1.5`}
            value={title}
            maxLength={TITLE_MAX}
            placeholder={activeType?.placeholder ?? "Name your fundraiser"}
            onChange={(e) => {
              markStarted();
              setTitle(e.target.value);
            }}
            required
          />
        </label>

        <fieldset>
          <legend className={labelClass}>Target</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {POT_TARGET_PRESETS.map((value) => {
              const active = !custom.trim() && preset === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    markStarted();
                    setPreset(value);
                    setCustom("");
                  }}
                  className={`font-nav min-h-9 rounded-md px-3 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition ${
                    active
                      ? "bg-pvn-navy text-pvn-cream"
                      : "border border-pvn-navy/15 text-pvn-navy/70 hover:border-pvn-gold"
                  }`}
                >
                  {formatWholeGbp(value)}
                </button>
              );
            })}
          </div>
          <label className="mt-3 block">
            <span className="sr-only">Custom target in pounds</span>
            <input
              className={fieldClass}
              inputMode="decimal"
              placeholder="Or custom £"
              value={custom}
              onChange={(e) => {
                markStarted();
                setCustom(e.target.value);
                setPreset(null);
              }}
            />
          </label>
          <p className="mt-2 text-xs text-pvn-navy/50">
            Aiming lower? Type any amount from £1 — no upper limit.
          </p>
        </fieldset>

        <label className="block">
          <span className={labelClass}>
            Description{" "}
            <span className="normal-case tracking-normal text-pvn-navy/40">
              ({copyHint(story, MIN_POT_DESCRIPTION_WORDS)})
            </span>
          </span>
          <textarea
            className={`${fieldClass} mt-1.5 min-h-24`}
            value={story}
            onChange={(e) => {
              markStarted();
              setStory(e.target.value);
            }}
            placeholder="What is this fundraiser for?"
          />
        </label>

        <label className="block">
          <span className={labelClass}>
            Your story{" "}
            <span className="normal-case tracking-normal text-pvn-navy/40">
              ({copyHint(founderStory, MIN_FOUNDER_STORY_WORDS)})
            </span>
          </span>
          <textarea
            className={`${fieldClass} mt-1.5 min-h-28`}
            value={founderStory}
            onChange={(e) => {
              markStarted();
              setFounderStory(e.target.value);
            }}
            placeholder={activeType?.storyHint}
          />
        </label>

        <div>
          <p className={labelClass}>
            Cover image{" "}
            <span className="normal-case tracking-normal text-pvn-navy/40">
              (optional · landscape)
            </span>
          </p>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onCoverChosen(e.target.files?.[0] ?? null)}
          />
          {photoPreview ? (
            <div className="mt-2 overflow-hidden border border-pvn-navy/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
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
              className="mt-2 flex min-h-24 w-full flex-col items-center justify-center gap-1.5 border border-dashed border-pvn-navy/20 bg-white/40 px-3 py-4 text-center transition hover:border-pvn-gold hover:text-pvn-navy"
            >
              <span className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/70 uppercase">
                Add a landscape cover
              </span>
              <span className="text-[0.7rem] text-pvn-navy/45">
                Landscape · 16:9 recommended · JPEG, PNG or WebP · max 5 MB
              </span>
            </button>
          )}
          {photoError ? (
            <p className="mt-1.5 text-xs text-red-800/80">{photoError}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="font-nav inline-flex min-h-11 items-center rounded-md bg-pvn-gold px-5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create fundraiser"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => router.push("/host/pots")}
            className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase transition hover:text-pvn-navy"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
