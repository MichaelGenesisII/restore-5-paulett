"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  ALL_ACCEPTED,
  ALL_DECLINED,
  OPEN_PREFERENCES_EVENT,
  type OptionalCategory,
  parseConsent,
  rawConsent,
  readConsent,
  subscribeToConsent,
  writeConsent,
} from "@/lib/consent";

/**
 * The server cannot see localStorage, so it reports "not yet known" rather
 * than "no choice made". That keeps the banner out of the server-rendered
 * HTML, which would otherwise flash at people who answered months ago.
 */
const UNKNOWN = "\u0000unknown";

type CategoryRow = {
  key: OptionalCategory | "essential";
  name: string;
  body: string;
  inUse: string;
  locked?: boolean;
};

const categories: CategoryRow[] = [
  {
    key: "essential",
    name: "Strictly necessary",
    body: "Keeps the site working — remembering this very choice, and carrying your basket of details safely to our payment provider when you give.",
    inUse: "Always on. No permission needed, and none asked for.",
    locked: true,
  },
  {
    key: "analytics",
    name: "Understanding the rebuild",
    body: "Counts visits to fundraiser pages (no names) so hosts can see whether their link is being opened, and which share routes bring people.",
    inUse: "In use on fundraiser pages when you allow this. Off by default until you say yes.",
  },
  {
    key: "marketing",
    name: "Sharing the story",
    body: "Lets us see whether a post or an advert brought you here, so the money spent telling people about 5 Paulett is not wasted.",
    inUse: "Not in use yet. This switch decides what happens when it is.",
  },
];

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-300 ease-out focus-visible:ring-2 focus-visible:ring-pvn-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pvn-navy focus-visible:outline-none ${
        checked
          ? "border-pvn-gold bg-pvn-gold"
          : "border-pvn-cream/30 bg-pvn-cream/10"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full transition duration-300 ease-out ${
          checked
            ? "translate-x-6 bg-pvn-navy"
            : "translate-x-1 bg-pvn-cream/70"
        }`}
        aria-hidden
      />
    </button>
  );
}

export function CookieConsent() {
  const [dismissed, setDismissed] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });
  const dialogRef = useRef<HTMLDialogElement>(null);

  const stored = useSyncExternalStore(
    subscribeToConsent,
    rawConsent,
    () => UNKNOWN,
  );

  const decided = stored === UNKNOWN || parseConsent(stored) !== null;
  const bannerOpen = !decided && !dismissed;

  const openPreferences = useCallback(() => {
    const existing = readConsent();
    setDraft({
      analytics: existing?.analytics ?? false,
      marketing: existing?.marketing ?? false,
    });
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    return () =>
      window.removeEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
  }, [openPreferences]);

  function decide(choice: { analytics: boolean; marketing: boolean }) {
    writeConsent(choice);
    setDraft(choice);
    setDismissed(true);
    dialogRef.current?.close();
  }

  return (
    <>
      {bannerOpen ? (
        <div
          role="region"
          aria-label="Cookie choices"
          className="pvn-consent fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4"
        >
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-sm bg-pvn-navy text-pvn-cream shadow-[0_-18px_60px_-20px_rgba(12,27,51,0.75)]">
            <div className="h-1 w-full bg-pvn-gold" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              aria-hidden
              style={{
                backgroundImage: `
                  linear-gradient(335deg, #c9a84c 18px, transparent 18px),
                  linear-gradient(155deg, #c9a84c 18px, transparent 18px)
                `,
                backgroundSize: "46px 46px",
                backgroundPosition: "0 0, 23px 0",
              }}
            />

            <div className="relative flex flex-col gap-3.5 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-8">
              <div className="min-w-0 flex-1">
                <p className="font-nav flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-gold-light">
                  <span
                    className="h-1.5 w-1.5 rotate-45 bg-pvn-gold"
                    aria-hidden
                  />
                  Before you come in
                </p>
                <p className="mt-1.5 text-sm leading-snug text-pvn-cream/85 text-pretty">
                  We keep only what the site needs to work, including this
                  choice itself. Anything beyond that is yours to allow or
                  refuse.{" "}
                  <Link
                    href="/cookies"
                    className="text-pvn-gold-light underline decoration-pvn-gold/60 underline-offset-4 transition hover:decoration-pvn-gold"
                  >
                    Read the detail
                  </Link>{" "}
                  or{" "}
                  <button
                    type="button"
                    onClick={openPreferences}
                    className="text-pvn-gold-light underline decoration-pvn-gold/60 underline-offset-4 transition hover:decoration-pvn-gold"
                  >
                    choose for yourself
                  </button>
                  .
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => decide(ALL_DECLINED)}
                  className="font-nav inline-flex min-h-10 flex-1 items-center justify-center rounded-md border border-pvn-cream/35 px-4 text-xs font-bold uppercase tracking-[0.14em] text-pvn-cream transition duration-300 ease-out hover:border-pvn-cream hover:bg-pvn-cream/10 sm:flex-none sm:px-5"
                >
                  Only what is needed
                </button>
                <button
                  type="button"
                  onClick={() => decide(ALL_ACCEPTED)}
                  className="font-nav inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-pvn-gold px-4 text-xs font-bold uppercase tracking-[0.14em] text-pvn-navy transition duration-300 ease-out hover:bg-pvn-gold-light sm:flex-none sm:px-6"
                >
                  Allow all
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="pvn-modal m-auto w-[min(38rem,calc(100vw-2rem))] overflow-hidden rounded-sm bg-pvn-navy p-0 text-pvn-cream shadow-[0_40px_90px_-30px_rgba(12,27,51,0.75)] backdrop:bg-pvn-navy/70 backdrop:backdrop-blur-sm"
        aria-labelledby="pvn-consent-title"
      >
        <div className="h-1 w-full bg-pvn-gold" aria-hidden />

        <div className="max-h-[80vh] overflow-y-auto p-6 sm:p-8">
          <h2
            id="pvn-consent-title"
            className="font-display text-2xl font-semibold sm:text-3xl"
          >
            Choose what you allow
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-pvn-cream/75">
            You can change any of this later from the footer of any page.
          </p>

          <ul className="mt-7 space-y-6">
            {categories.map((category) => {
              const isLocked = category.locked === true;
              const checked = isLocked
                ? true
                : draft[category.key as OptionalCategory];

              return (
                <li
                  key={category.key}
                  className="border-t border-pvn-cream/12 pt-6 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-nav text-sm font-bold uppercase tracking-[0.14em] text-pvn-gold-light">
                        {category.name}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-pvn-cream/75 text-pretty">
                        {category.body}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-pvn-cream/70 italic">
                        {category.inUse}
                      </p>
                    </div>

                    <Toggle
                      checked={checked}
                      disabled={isLocked}
                      label={category.name}
                      onChange={(next) =>
                        setDraft((current) => ({
                          ...current,
                          [category.key]: next,
                        }))
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex flex-col gap-2.5 border-t border-pvn-cream/12 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => decide(ALL_DECLINED)}
              className="font-nav inline-flex min-h-11 items-center justify-center rounded-md border border-pvn-cream/35 px-5 text-xs font-bold uppercase tracking-[0.14em] text-pvn-cream transition duration-300 ease-out hover:border-pvn-cream hover:bg-pvn-cream/10"
            >
              Refuse all optional
            </button>
            <button
              type="button"
              onClick={() => decide(draft)}
              className="font-nav inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-gold px-6 text-xs font-bold uppercase tracking-[0.14em] text-pvn-navy transition duration-300 ease-out hover:bg-pvn-gold-light"
            >
              Save my choices
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
