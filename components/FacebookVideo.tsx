"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  openCookiePreferences,
  parseConsent,
  rawConsent,
  subscribeToConsent,
} from "@/lib/consent";

type FbPlayer = {
  play: () => void;
  pause: () => void;
  mute: () => void;
};

type FbSdk = {
  init: (options: { xfbml: boolean; version: string }) => void;
  XFBML: { parse: (element?: HTMLElement) => void };
  Event: {
    subscribe: (
      event: "xfbml.ready",
      handler: (message: { type: string; id: string; instance: FbPlayer }) => void,
    ) => void;
  };
};

declare global {
  interface Window {
    FB?: FbSdk;
    fbAsyncInit?: () => void;
  }
}

const SDK_SRC = "https://connect.facebook.net/en_GB/sdk.js";
const SDK_VERSION = "v21.0";

let sdkPromise: Promise<FbSdk> | null = null;

function loadSdk(): Promise<FbSdk> {
  if (window.FB) return Promise.resolve(window.FB);
  sdkPromise ??= new Promise<FbSdk>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ xfbml: false, version: SDK_VERSION });
      resolve(window.FB!);
    };
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Facebook player could not load."));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

/**
 * Facebook's player sets Facebook cookies, so it only loads by itself for
 * visitors who allowed "Sharing the story"; everyone else gets a cover they
 * can tap. Once loaded it plays (muted, as browsers require) while it is on
 * screen and pauses when it scrolls away.
 */
export function FacebookVideo({
  href,
  shareUrl,
  title,
  poster,
}: {
  /** Canonical facebook.com/…/videos/{id}/ URL. */
  href: string;
  /** Link people can open on Facebook itself. */
  shareUrl: string;
  title: string;
  poster: string;
}) {
  const id = `fb-video-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const frameRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<FbPlayer | null>(null);
  const visibleRef = useRef(false);
  const autoplayRef = useRef(true);
  const tappedRef = useRef(false);

  const consentRaw = useSyncExternalStore(subscribeToConsent, rawConsent, () => null);
  const allowed = parseConsent(consentRaw)?.marketing === true;

  const [tapped, setTapped] = useState(false);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [width, setWidth] = useState(0);

  const load = (allowed || tapped) && near;

  useEffect(() => {
    autoplayRef.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const resize = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    resize.observe(frame);

    const nearby = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin: "400px 0px" },
    );
    nearby.observe(frame);

    const inView = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry && entry.intersectionRatio >= 0.6);
        visibleRef.current = visible;
        const player = playerRef.current;
        if (!player) return;
        if (visible && autoplayRef.current) {
          player.mute();
          player.play();
        } else if (!visible) {
          player.pause();
        }
      },
      { threshold: [0, 0.6] },
    );
    inView.observe(frame);

    return () => {
      resize.disconnect();
      nearby.disconnect();
      inView.disconnect();
    };
  }, []);

  const playerWidth = Math.min(width, 420);
  const build = load && playerWidth > 0;

  useEffect(() => {
    if (!build) return;
    let cancelled = false;

    loadSdk()
      .then((FB) => {
        if (cancelled || !frameRef.current) return;
        FB.Event.subscribe("xfbml.ready", (message) => {
          if (message.type !== "video" || message.id !== id) return;
          playerRef.current = message.instance;
          setReady(true);
          if (visibleRef.current && (autoplayRef.current || tappedRef.current)) {
            message.instance.mute();
            message.instance.play();
          }
        });
        FB.XFBML.parse(frameRef.current);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [build, id, attempt]);

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div
        ref={frameRef}
        className="relative min-h-[28rem] w-full overflow-hidden rounded-sm border border-pvn-navy/10 bg-pvn-navy shadow-[0_24px_60px_-34px_rgba(12,27,51,0.6)] sm:min-h-[36rem]"
      >
        {build ? (
          <div
            className="fb-video"
            id={id}
            data-href={href}
            data-width={String(playerWidth)}
            data-show-text="false"
            data-allowfullscreen="true"
          />
        ) : null}

        {!ready ? (
          <div className="absolute inset-0">
            <Image
              src={poster}
              alt=""
              fill
              sizes="420px"
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-pvn-navy via-pvn-navy/40 to-pvn-navy/10" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              {load && !failed ? (
                <p className="font-nav text-xs font-bold tracking-[0.16em] text-pvn-cream/80 uppercase">
                  Loading video…
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      tappedRef.current = true;
                      setFailed(false);
                      setTapped(true);
                      setAttempt((n) => n + 1);
                    }}
                    aria-label={`Play video: ${title}`}
                    className="flex h-18 w-18 items-center justify-center rounded-full bg-pvn-gold text-pvn-navy shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:scale-105 hover:bg-pvn-gold-light focus-visible:ring-4 focus-visible:ring-pvn-gold/40 focus-visible:outline-none"
                  >
                    <PlayIcon />
                  </button>
                  <p className="max-w-[16rem] text-xs leading-relaxed text-pvn-cream/75">
                    {failed
                      ? "The video could not load. Try again, or watch it on Facebook."
                      : "Plays from Facebook, which may set its own cookies."}
                  </p>
                  {!failed ? (
                    <button
                      type="button"
                      onClick={openCookiePreferences}
                      className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-gold uppercase underline decoration-pvn-gold/40 underline-offset-4"
                    >
                      Always play videos
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-nav mt-3 inline-flex text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/60 uppercase transition hover:text-pvn-gold"
      >
        Watch on Facebook ↗
      </a>
    </div>
  );
}
