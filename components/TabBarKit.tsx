"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent,
  type ReactNode,
} from "react";

/** Matches the bar's height, so it clears before covering the last content. */
const FOOTER_LOOKAHEAD_PX = 64;

type Ripple = { id: number; x: number; y: number };

/** Taps leave a ripple from the exact point the finger landed. */
export function useRipples() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const spawn = useCallback((event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ripple = {
      id: nextId.current++,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setRipples((current) => [...current, ripple]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((r) => r.id !== ripple.id));
    }, 650);
  }, []);

  const layer = ripples.map((r) => (
    <span
      key={r.id}
      className="pvn-tab-ripple"
      style={{ left: r.x, top: r.y }}
      aria-hidden
    />
  ));

  return { spawn, layer };
}

/** True while the site footer is (about to be) on screen. */
export function useFooterInView(enabled: boolean, pathname: string) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const footer = document.getElementById("site-footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: `0px 0px ${FOOTER_LOOKAHEAD_PX}px 0px` },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, [enabled, pathname]);

  return inView;
}

/**
 * A tab always lands at the top of its page. Without this, a short page (e.g.
 * /host while it checks the session) inherits the old scroll offset and opens
 * on the footer. Tapping the current tab scrolls back up, as apps do.
 */
export function useTabNavigation(pathname: string) {
  const pendingTop = useRef(false);

  useEffect(() => {
    if (!pendingTop.current) return;
    pendingTop.current = false;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return useCallback(
    (href: string) => {
      if (href === pathname) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      pendingTop.current = true;
    },
    [pathname],
  );
}

export function TabBarShell({
  label,
  hidden,
  className = "",
  children,
}: {
  label: string;
  hidden: boolean;
  /** Breakpoint visibility, e.g. `md:hidden`. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={`fixed inset-x-0 bottom-0 z-40 transition-[opacity,transform] duration-300 ease-out ${className} ${
        hidden
          ? "pointer-events-none translate-y-[calc(100%+2.5rem)] opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      <div className="relative rounded-t-3xl border-t border-pvn-navy/10 bg-pvn-cream/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-12px_rgba(12,27,51,0.28)] backdrop-blur-xl backdrop-saturate-150">
        {children}
      </div>
    </nav>
  );
}

/** The raised gold circle in the middle of a bar, sitting in a notch. */
export function TabBarCenterItem({
  href,
  label,
  Icon,
  active = false,
  onNavigate,
  iconClassName = "",
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active?: boolean;
  onNavigate: (href: string) => void;
  iconClassName?: string;
}) {
  const { spawn, layer } = useRipples();

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={() => onNavigate(href)}
      className="group relative flex h-full flex-col items-center justify-end pb-2 text-[0.6875rem] font-semibold tracking-wide whitespace-nowrap text-pvn-navy select-none [-webkit-tap-highlight-color:transparent]"
    >
      {/* The cradle: a cream disc behind the button reads as a notch cut into
          the bar's top edge. */}
      <span
        className="absolute -top-8 left-1/2 h-[4.25rem] w-[4.25rem] -translate-x-1/2 rounded-full bg-pvn-cream/90 shadow-[0_-8px_16px_-10px_rgba(12,27,51,0.35)] backdrop-blur-xl"
        aria-hidden
      />

      <span className="absolute -top-6 left-1/2 -translate-x-1/2">
        <span
          className="pvn-give-halo pointer-events-none absolute -inset-1.5 rounded-full border-2 border-pvn-gold"
          aria-hidden
        />
        <span
          onPointerDown={spawn}
          className="relative flex h-[3.25rem] w-[3.25rem] items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-pvn-gold-light to-pvn-gold text-pvn-cream shadow-[0_10px_22px_-8px_rgba(201,168,76,0.95)] transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:scale-90"
        >
          {layer}
          <Icon className={`relative h-6 w-6 ${iconClassName}`} />
        </span>
      </span>

      <span className="relative">{label}</span>
    </Link>
  );
}

type TabBarItemProps = {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active?: boolean;
  /** Small gold count on the icon (e.g. unread messages). */
  badge?: number;
} & (
  | { href: string; onNavigate: (href: string) => void; onClick?: never }
  | {
      href?: never;
      onNavigate?: never;
      onClick: () => void;
      /** For toggles that open a panel. */
      expanded?: boolean;
    }
);

export function TabBarItem(props: TabBarItemProps) {
  const { label, Icon, active = false, badge } = props;
  const { spawn, layer } = useRipples();

  const className = `relative flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden text-[0.6875rem] font-semibold tracking-wide transition-colors duration-200 select-none [-webkit-tap-highlight-color:transparent] active:scale-95 ${
    active ? "text-pvn-navy" : "text-pvn-navy/50"
  }`;

  const content = (
    <>
      {layer}
      <span className="relative flex h-6 items-center justify-center">
        <span key={String(active)} className={active ? "pvn-tab-pop" : ""}>
          <Icon className="h-6 w-6" />
        </span>
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pvn-gold px-1 text-[0.6rem] leading-none font-bold text-pvn-navy ring-2 ring-pvn-cream">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className="relative whitespace-nowrap">{label}</span>
      {active ? (
        <span
          className="pvn-tab-dot absolute bottom-1.5 h-1 w-1 rounded-full bg-pvn-gold"
          aria-hidden
        />
      ) : null}
    </>
  );

  if (props.href !== undefined) {
    const { href, onNavigate } = props;
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        onPointerDown={spawn}
        onClick={() => onNavigate(href)}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-expanded={props.expanded}
      onPointerDown={spawn}
      onClick={props.onClick}
      className={className}
    >
      {content}
    </button>
  );
}
