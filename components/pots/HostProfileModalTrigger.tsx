"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type HostProfile = {
  name: string;
  bio: string | null;
  photoUrl: string | null;
  profileSlug: string;
};

type Props = {
  host: HostProfile;
  children: React.ReactNode;
  className?: string;
};

function hostInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function HostAvatar({
  host,
  size,
}: {
  host: HostProfile;
  size: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8 sm:h-9 sm:w-9" : "h-16 w-16";
  const text = size === "sm" ? "text-[0.65rem]" : "text-lg";

  if (host.photoUrl) {
    return (
      <span
        className={`relative ${dim} shrink-0 overflow-hidden rounded-full ring-1 ring-pvn-gold/45`}
      >
        <Image
          src={host.photoUrl}
          alt=""
          fill
          className="object-cover"
          sizes={size === "sm" ? "36px" : "64px"}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full bg-pvn-navy text-pvn-cream ring-1 ring-pvn-gold/45 ${text} font-semibold`}
      aria-hidden
    >
      {hostInitials(host.name)}
    </span>
  );
}

/**
 * Opens a calm host-profile modal from pot details (“Built by …”).
 * Dialog is portalled to document.body so it never nests inside <p> / headings.
 */
export function HostProfileModalTrigger({
  host,
  children,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const excerpt =
    host.bio && host.bio.length > 220
      ? `${host.bio.slice(0, 220).trim()}…`
      : host.bio;

  const dialog =
    // open only flips true from a click, so we're always client-side here.
    open
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-pvn-navy/45 p-4"
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-sm bg-pvn-cream p-5 shadow-[0_24px_60px_-28px_rgba(12,27,51,0.55)] sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                Host
              </div>
              <div className="mt-3 flex gap-4">
                <HostAvatar host={host} size="md" />
                <div className="min-w-0">
                  <h2
                    id={titleId}
                    className="font-display text-2xl font-semibold text-pvn-navy"
                  >
                    {host.name}
                  </h2>
                  {excerpt ? (
                    <p className="mt-2 text-sm leading-relaxed text-pvn-navy/65 whitespace-pre-wrap">
                      {excerpt}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-pvn-navy/50">
                      This host has not added a bio yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/hosts/${host.profileSlug}`}
                  className="font-nav inline-flex min-h-10 items-center rounded-md bg-pvn-gold px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
                >
                  View full profile
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="font-nav inline-flex min-h-10 items-center px-3 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/55 uppercase transition hover:text-pvn-navy"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2.5 text-left transition hover:text-pvn-gold ${className}`}
      >
        <HostAvatar host={host} size="sm" />
        <span className="min-w-0">{children}</span>
      </button>
      {dialog}
    </>
  );
}
