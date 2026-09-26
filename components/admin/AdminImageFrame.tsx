"use client";

import { useEffect, useState } from "react";

type Variant = "cover" | "avatar";
type Size = "sm" | "md";

const sizeClass: Record<Variant, Record<Size, string>> = {
  cover: {
    sm: "h-10 w-14",
    md: "w-full max-w-[11rem] sm:w-44",
  },
  avatar: {
    sm: "h-10 w-10",
    md: "h-28 w-28 sm:h-32 sm:w-32",
  },
};

const aspectClass: Record<Variant, Record<Size, string>> = {
  cover: {
    sm: "aspect-auto h-full w-full",
    md: "aspect-[4/3] w-full",
  },
  avatar: {
    sm: "aspect-auto h-full w-full",
    md: "aspect-auto h-full w-full",
  },
};

function IconCoverPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M3 16l5-4 4 3 3-2 6 4" />
    </svg>
  );
}

function IconAvatarPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 19c0-3.2 3-5 7-5s7 1.8 7 5" />
    </svg>
  );
}

/**
 * Framed image with placeholder when missing or failed to load.
 */
export function AdminImageFrame({
  src,
  alt = "",
  variant = "cover",
  size = "md",
  label,
}: {
  src: string | null | undefined;
  alt?: string;
  variant?: Variant;
  size?: Size;
  /** Accessible / visible label when empty (e.g. “No cover”). */
  label?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src?.trim()) && !failed;
  const emptyLabel =
    label ?? (variant === "avatar" ? "No photo" : "No cover");
  const Icon =
    variant === "avatar" ? IconAvatarPlaceholder : IconCoverPlaceholder;

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-sm border border-pvn-navy/15 bg-pvn-cream/70 ${sizeClass[variant][size]}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote host upload URLs
        <img
          src={src!}
          alt={alt}
          className={`${aspectClass[variant][size]} object-cover`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-1.5 bg-[linear-gradient(135deg,rgba(12,27,51,0.04)_25%,transparent_25%,transparent_50%,rgba(12,27,51,0.04)_50%,rgba(12,27,51,0.04)_75%,transparent_75%,transparent)] bg-[length:10px_10px] text-pvn-navy/35 ${aspectClass[variant][size]}`}
          role="img"
          aria-label={emptyLabel}
        >
          <Icon
            className={size === "sm" ? "h-4 w-4" : "h-7 w-7 sm:h-8 sm:w-8"}
          />
          {size !== "sm" ? (
            <span className="font-nav px-2 text-center text-[0.55rem] font-bold tracking-[0.12em] uppercase">
              {emptyLabel}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
