"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconHeart } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { primaryNav } from "@/lib/navigation";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const onPotDetails = /^\/pots\/[^/]+$/.test(pathname);
  const heroBlendPaths = new Set([
    "/",
    "/the-wall",
    "/fundraisers",
    "/fundraisers/create",
    "/give",
    "/contact",
    "/alumni",
    "/our-new-home",
    "/our-story",
  ]);
  const overHero =
    (heroBlendPaths.has(pathname) || onPotDetails) && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="relative sticky top-0 z-50 font-nav">
      <div
        className={`border-b transition-[background-color,box-shadow,border-color,color] duration-300 ${
          scrolled
            ? "border-pvn-navy/10 bg-pvn-cream/95 shadow-[0_8px_30px_-12px_rgba(12,27,51,0.25)] backdrop-blur-md"
            : overHero && onPotDetails
              ? "border-transparent bg-gradient-to-b from-pvn-navy/35 via-pvn-navy/10 to-transparent"
              : overHero
                ? "border-transparent bg-transparent"
                : "border-transparent bg-pvn-cream"
        }`}
      >
        <div className="mx-auto flex h-[4.75rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo variant={overHero ? "light" : "dark"} />

          <nav
            className="hidden items-center gap-1.5 lg:flex"
            aria-label="Main navigation"
          >
            {primaryNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.16em] transition-colors ${
                    overHero
                      ? active
                        ? "bg-pvn-cream/15 text-pvn-cream"
                        : "text-pvn-cream/90 hover:bg-pvn-cream/10 hover:text-pvn-cream"
                      : active
                        ? "bg-pvn-navy/10 text-pvn-navy"
                        : "text-pvn-navy/80 hover:bg-pvn-navy/5 hover:text-pvn-navy"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* The wrapper carries the entrance and the halo, which has to sit
                outside the button's overflow clip to ripple past its edge. */}
            <span className="pvn-give-wrap relative hidden sm:inline-flex">
              <span
                className="pvn-give-halo pointer-events-none absolute -inset-[3px] rounded-lg border border-pvn-gold"
                aria-hidden
              />
              <Link
                href="/give"
                className="pvn-give relative inline-flex items-center gap-2 overflow-hidden rounded-md border border-pvn-gold/80 bg-pvn-gold px-4 py-2 text-[0.8rem] font-bold uppercase tracking-[0.16em] text-pvn-navy transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-pvn-gold hover:bg-pvn-gold-light hover:shadow-[0_10px_22px_-10px_rgba(201,168,76,0.9)] focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-pvn-navy/70 focus-visible:outline-none active:translate-y-0 active:scale-[0.97] active:duration-100"
              >
                <span
                  className="pvn-give-glint pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-pvn-cream/60 to-transparent"
                  aria-hidden
                />
                <IconHeart className="pvn-give-heart relative h-3.5 w-3.5 shrink-0 text-pvn-cream" />
                <span className="relative">Give now</span>
              </Link>
            </span>

            <button
              type="button"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-md border lg:hidden ${
                overHero
                  ? "border-pvn-cream/30 text-pvn-cream"
                  : "border-pvn-navy/15 text-pvn-navy"
              }`}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="sr-only">Toggle menu</span>
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="absolute inset-x-0 top-full z-50 lg:hidden">
          <nav
            id="mobile-nav"
            className="border-b border-pvn-navy/10 bg-pvn-cream px-4 py-4 shadow-[0_24px_40px_-16px_rgba(12,27,51,0.35)] sm:px-6"
            aria-label="Mobile navigation"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {primaryNav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-3 text-[0.95rem] font-semibold uppercase tracking-[0.14em] ${
                      active
                        ? "bg-pvn-navy/10 text-pvn-navy"
                        : "text-pvn-navy hover:bg-pvn-navy/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/give"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-pvn-gold px-3 py-3 text-[0.95rem] font-bold uppercase tracking-[0.16em] text-pvn-navy transition duration-150 ease-out active:scale-[0.98] active:bg-pvn-gold-light"
              >
                <IconHeart className="h-4 w-4 shrink-0 text-pvn-cream" />
                Give now
              </Link>
            </div>
          </nav>
          <button
            type="button"
            className="h-[100dvh] w-full bg-pvn-navy/50 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        </div>
      ) : null}
    </header>
  );
}
