"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  openCookiePreferences,
  parseConsent,
  rawConsent,
  subscribeToConsent,
} from "@/lib/consent";

type FbPlayerEvent = "startedPlaying" | "paused" | "finishedPlaying";

type FbPlayer = {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  mute: () => void;
  unmute: () => void;
  subscribe: (
    event: FbPlayerEvent,
    handler: () => void,
  ) => { release: (event: FbPlayerEvent) => void };
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

/** Length of the branded ident before the film starts. */
const INTRO_MS = 2000;
/** How long a play with sound gets to start before it falls back to muted. */
const SOUND_START_GRACE_MS = 2500;

/**
 * idle: loaded, not started yet · intro: branded ident · playing ·
 * paused: by the visitor, or by scrolling away · ended: film finished.
 */
type Stage = "idle" | "intro" | "playing" | "paused" | "ended";

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

function PlayIcon({ className = "ml-1 h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

/** The PVN mark, painted gold through the logo's own shape. */
const logoMask: CSSProperties = {
  maskImage: "url(/pvnlogo.png)",
  WebkitMaskImage: "url(/pvnlogo.png)",
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
};

/**
 * Facebook's player sets Facebook cookies, so it only loads by itself for
 * visitors who allowed "Sharing the story"; everyone else gets a cover they
 * can tap. Each start opens on a short PVN ident, and whenever the film is
 * paused or finished a branded card covers the player — which also hides
 * Facebook's "more videos" suggestions. It plays while on screen and pauses
 * when scrolled away. Autoplay starts muted (browsers refuse it with sound)
 * and is muted only that once, so sound someone turns on survives scrolling.
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
  const stageRef = useRef<Stage>("idle");
  const scrollPausedRef = useRef(false);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const consentRaw = useSyncExternalStore(subscribeToConsent, rawConsent, () => null);
  const allowed = parseConsent(consentRaw)?.marketing === true;

  const [tapped, setTapped] = useState(false);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [width, setWidth] = useState(0);
  const [stage, setStageState] = useState<Stage>("idle");
  const [introRun, setIntroRun] = useState(0);

  const load = (allowed || tapped) && near;

  function setStage(next: Stage) {
    stageRef.current = next;
    setStageState(next);
  }

  function clearTimers() {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    if (soundFallbackRef.current) clearTimeout(soundFallbackRef.current);
    introTimerRef.current = null;
    soundFallbackRef.current = null;
  }

  /** Plays, and if the browser refuses sound, starts again muted. */
  function playSafely(player: FbPlayer) {
    let started = false;
    let watching = true;
    const watch = player.subscribe("startedPlaying", () => {
      started = true;
      if (watching) watch.release("startedPlaying");
      watching = false;
    });
    scrollPausedRef.current = false;
    setStage("playing");
    player.play();
    soundFallbackRef.current = setTimeout(() => {
      if (watching) watch.release("startedPlaying");
      watching = false;
      if (started) return;
      player.mute();
      player.play();
    }, SOUND_START_GRACE_MS);
  }

  /**
   * Shows the ident, then plays. A start nobody asked for (autoplay) is
   * dropped if the film has scrolled away by the time the ident ends.
   */
  function startWithIntro({ fromStart, requested }: { fromStart: boolean; requested: boolean }) {
    const player = playerRef.current;
    if (!player) return;
    clearTimers();
    if (fromStart) player.seek(0);
    setStage("intro");
    setIntroRun((n) => n + 1);
    introTimerRef.current = setTimeout(() => {
      introTimerRef.current = null;
      if (!requested && !visibleRef.current) {
        setStage("idle");
        return;
      }
      playSafely(player);
    }, INTRO_MS);
  }

  const onVisibility = useEffectEvent((visible: boolean) => {
    visibleRef.current = visible;
    const player = playerRef.current;
    if (!player) return;
    const current = stageRef.current;

    if (!visible) {
      if (current === "playing") {
        scrollPausedRef.current = true;
        player.pause();
      } else if (current === "intro") {
        clearTimers();
        setStage("idle");
      }
      return;
    }

    if (!autoplayRef.current) return;
    if (current === "idle") {
      startWithIntro({ fromStart: false, requested: false });
    } else if (current === "paused" && scrollPausedRef.current) {
      playSafely(player);
    }
  });

  const onPlayerReady = useEffectEvent((player: FbPlayer) => {
    playerRef.current = player;
    player.subscribe("startedPlaying", () => {
      scrollPausedRef.current = false;
      if (stageRef.current !== "intro") setStage("playing");
    });
    player.subscribe("paused", () => {
      if (stageRef.current === "playing") setStage("paused");
    });
    player.subscribe("finishedPlaying", () => {
      clearTimers();
      setStage("ended");
    });
    setReady(true);

    if (tappedRef.current) {
      player.unmute();
      startWithIntro({ fromStart: false, requested: true });
      return;
    }
    player.mute();
    if (visibleRef.current && autoplayRef.current) {
      startWithIntro({ fromStart: false, requested: false });
    }
  });

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
      ([entry]) => onVisibility(Boolean(entry && entry.intersectionRatio >= 0.6)),
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
          if (cancelled || message.type !== "video" || message.id !== id) return;
          onPlayerReady(message.instance);
        });
        FB.XFBML.parse(frameRef.current);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      if (soundFallbackRef.current) clearTimeout(soundFallbackRef.current);
    };
  }, [build, id, attempt]);

  const covered = stage !== "playing";

  const resume = () => {
    const player = playerRef.current;
    if (!player) return;
    clearTimers();
    playSafely(player);
  };

  const replay = () => startWithIntro({ fromStart: true, requested: true });

  const playFirst = () => {
    playerRef.current?.unmute();
    startWithIntro({ fromStart: false, requested: true });
  };

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

        {ready ? (
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden bg-pvn-navy p-6 text-center transition-opacity duration-300 ${
              covered ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            inert={!covered}
          >
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background:
                  "radial-gradient(90% 60% at 50% 38%, rgba(201,168,76,0.16), transparent 70%)",
              }}
            />

            <div key={stage === "intro" ? `intro-${introRun}` : stage} className="relative flex flex-col items-center">
              <span
                className={`block bg-pvn-gold ${
                  stage === "intro" ? "pvn-reel-logo h-24 w-24 sm:h-28 sm:w-28" : "h-14 w-14"
                }`}
                style={logoMask}
                aria-hidden
              />
              <p className="font-nav mt-5 text-[0.65rem] font-bold tracking-[0.28em] text-pvn-gold-light uppercase">
                PVN Belfast
              </p>
              <p className="font-display mt-1.5 text-2xl leading-tight font-semibold text-pvn-cream sm:text-3xl">
                Restore 5 Paulett Ave
              </p>

              {stage === "intro" ? (
                <>
                  <span className="sr-only">Starting: {title}</span>
                  <span className="mt-6 block h-px w-28 overflow-hidden bg-pvn-cream/15" aria-hidden>
                    <span className="pvn-reel-line block h-full w-full bg-pvn-gold" />
                  </span>
                </>
              ) : (
                <>
                  <p className="mt-3 max-w-[17rem] text-xs leading-relaxed text-pvn-cream/70">
                    {stage === "ended" ? "Thank you for watching." : title}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                    {stage === "paused" ? (
                      <button
                        type="button"
                        onClick={resume}
                        className="font-nav inline-flex items-center gap-2 rounded-md bg-pvn-gold px-4 py-2.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
                      >
                        <PlayIcon className="h-4 w-4" />
                        Continue
                      </button>
                    ) : null}
                    {stage === "idle" ? (
                      <button
                        type="button"
                        onClick={playFirst}
                        className="font-nav inline-flex items-center gap-2 rounded-md bg-pvn-gold px-4 py-2.5 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
                      >
                        <PlayIcon className="h-4 w-4" />
                        Play
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={replay}
                        className={`font-nav inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold tracking-[0.14em] uppercase transition ${
                          stage === "ended"
                            ? "bg-pvn-gold text-pvn-navy hover:bg-pvn-gold-light"
                            : "border border-pvn-cream/30 text-pvn-cream hover:border-pvn-gold hover:text-pvn-gold"
                        }`}
                      >
                        <ReplayIcon />
                        Replay
                      </button>
                    )}
                    {stage === "ended" ? (
                      <Link
                        href="/give"
                        className="font-nav inline-flex items-center gap-2 rounded-md border border-pvn-cream/30 px-4 py-2.5 text-xs font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
                      >
                        Give to the house
                      </Link>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
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
        )}
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
