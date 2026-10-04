"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  IconClose,
  IconMenu,
  IconSignOut,
} from "@/components/dashboard/DashboardIcons";
import { IconHeart } from "@/components/icons";
import {
  TabBarCenterItem,
  TabBarItem,
  TabBarShell,
  useTabNavigation,
} from "@/components/TabBarKit";

type Icon = ComponentType<{ className?: string }>;

export type DashboardTab = {
  href: string;
  label: string;
  Icon: Icon;
  active: boolean;
  badge?: number;
  /** Drawn as the raised gold circle; place it third so it sits mid-bar. */
  center?: boolean;
};

export type DashboardMenuLink = {
  href: string;
  label: string;
  Icon: Icon;
  active?: boolean;
  badge?: number;
};

export type DashboardMenuConfig = {
  /** e.g. "Host menu" — the dialog's accessible name. */
  label: string;
  identity: {
    title: string;
    subtitle: string;
    initial: string;
    photoUrl?: string | null;
  };
  /** Gold button at the top of the panel. */
  primaryAction?: { href: string; label: string; Icon: Icon };
  sections: Array<{ title?: string; links: DashboardMenuLink[] }>;
};

const siteLinks = [
  { href: "/", label: "Home" },
  { href: "/our-story", label: "Our Story" },
  { href: "/our-new-home", label: "Our New Home" },
  { href: "/fundraisers", label: "Fundraisers" },
  { href: "/the-wall", label: "The Wall" },
  { href: "/alumni", label: "Alumni" },
] as const;

const linkRow =
  "relative flex min-h-12 items-center gap-3 rounded-md px-3 text-[0.95rem] font-medium text-pvn-navy transition active:scale-[0.98] active:bg-pvn-navy/5";

const sectionTitle =
  "font-nav mt-4 mb-1 px-3 text-[0.62rem] font-bold tracking-[0.2em] text-pvn-navy/45 uppercase first:mt-0";

function DashboardMenu({
  open,
  onClose,
  config,
  onSignOut,
  signingOut,
}: {
  open: boolean;
  onClose: () => void;
  config: DashboardMenuConfig;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { identity, primaryAction, sections } = config;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[60] lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open || undefined}
      inert={!open || undefined}
    >
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 bg-pvn-navy/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={config.label}
        className={`absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto rounded-r-3xl bg-pvn-cream shadow-[24px_0_60px_-20px_rgba(12,27,51,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative shrink-0 overflow-hidden bg-pvn-navy px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 text-pvn-cream">
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
          <div className="relative flex items-start justify-between gap-3">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pvn-gold font-display text-2xl font-semibold text-pvn-navy ring-2 ring-pvn-gold/40 ring-offset-2 ring-offset-pvn-navy">
              {identity.photoUrl ? (
                <Image
                  src={identity.photoUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                identity.initial
              )}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pvn-cream/10 text-pvn-cream transition active:scale-90 active:bg-pvn-cream/20"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>
          <p className="relative mt-4 font-display text-xl leading-tight font-semibold">
            {identity.title}
          </p>
          <p className="relative mt-0.5 truncate text-xs text-pvn-cream/60">
            {identity.subtitle}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4" aria-label={config.label}>
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              onClick={onClose}
              className="font-nav mx-1 mb-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-pvn-gold-light to-pvn-gold text-[0.75rem] font-bold tracking-[0.14em] text-pvn-navy uppercase shadow-[0_10px_22px_-12px_rgba(201,168,76,0.95)] transition active:scale-[0.97]"
            >
              <primaryAction.Icon className="h-4 w-4" />
              {primaryAction.label}
            </Link>
          ) : null}

          {sections.map((section, i) =>
            section.links.length > 0 ? (
              <div key={section.title ?? i}>
                {section.title ? (
                  <p className={sectionTitle}>{section.title}</p>
                ) : null}
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    aria-current={link.active ? "page" : undefined}
                    className={`${linkRow} ${
                      link.active ? "bg-pvn-gold/15 font-semibold" : ""
                    }`}
                  >
                    {link.active ? (
                      <span
                        className="absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full bg-pvn-gold"
                        aria-hidden
                      />
                    ) : null}
                    <link.Icon className="h-5 w-5 shrink-0 text-pvn-gold" />
                    <span className="min-w-0 flex-1 truncate">{link.label}</span>
                    {link.badge && link.badge > 0 ? (
                      <span className="rounded-full bg-pvn-gold px-2 py-0.5 text-[0.65rem] font-bold text-pvn-navy">
                        {link.badge > 99 ? "99+" : link.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null,
          )}

          <p className={sectionTitle}>Explore the site</p>
          {siteLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={linkRow}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <span
                  className="h-1.5 w-1.5 rotate-45 bg-pvn-gold"
                  aria-hidden
                />
              </span>
              {item.label}
            </Link>
          ))}
          <Link href="/give" onClick={onClose} className={linkRow}>
            <IconHeart className="h-5 w-5 shrink-0 text-pvn-gold" />
            Give now
          </Link>
        </nav>

        <div className="border-t border-pvn-navy/10 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            disabled={signingOut}
            className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-[0.95rem] font-medium text-red-700 transition active:scale-[0.98] active:bg-red-700/5 disabled:opacity-50"
          >
            <IconSignOut className="h-5 w-5" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
    </div>
  );
}

/**
 * Mobile dashboard navigation: four tabs plus a Menu tab that opens a left
 * off-canvas panel. Pinned to the bottom; the site footer is hidden while it
 * is mounted (see `body[data-dashboard-tabbar]` in globals.css).
 */
export function DashboardTabBar({
  label,
  tabs,
  menu,
  onSignOut,
  signingOut,
}: {
  label: string;
  tabs: [DashboardTab, DashboardTab, DashboardTab, DashboardTab];
  menu: DashboardMenuConfig;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const pathname = usePathname();
  const onNavigate = useTabNavigation(pathname);
  // Opening records the route, so any navigation (incl. back) closes the menu.
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null);
  const menuOpen = menuOpenedOn === pathname;
  const menuButtonWrap = useRef<HTMLLIElement>(null);

  useEffect(() => {
    document.body.dataset.dashboardTabbar = "";
    return () => {
      delete document.body.dataset.dashboardTabbar;
    };
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpenedOn(null);
    menuButtonWrap.current?.querySelector("button")?.focus();
  }, []);

  return (
    <>
      <TabBarShell label={label} hidden={false} className="lg:hidden">
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {tabs.map((tab) => (
            <li key={tab.href}>
              {tab.center ? (
                <TabBarCenterItem
                  href={tab.href}
                  label={tab.label}
                  Icon={tab.Icon}
                  active={tab.active}
                  onNavigate={onNavigate}
                />
              ) : (
                <TabBarItem
                  href={tab.href}
                  label={tab.label}
                  Icon={tab.Icon}
                  active={tab.active}
                  badge={tab.badge}
                  onNavigate={onNavigate}
                />
              )}
            </li>
          ))}
          <li ref={menuButtonWrap}>
            <TabBarItem
              label="Menu"
              Icon={IconMenu}
              active={menuOpen}
              expanded={menuOpen}
              onClick={() => setMenuOpenedOn(pathname)}
            />
          </li>
        </ul>
      </TabBarShell>

      <DashboardMenu
        open={menuOpen}
        onClose={closeMenu}
        config={menu}
        onSignOut={onSignOut}
        signingOut={signingOut}
      />
    </>
  );
}
