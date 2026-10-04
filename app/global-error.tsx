"use client";

import { useEffect } from "react";
import { display, geistSans } from "./fonts";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-pvn-cream text-pvn-navy">
        <title>Something went wrong | Restore 5 Paulett</title>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <p
            className="font-display text-[6.5rem] leading-none font-semibold text-pvn-gold/25 sm:text-[8rem]"
            aria-hidden
          >
            Error
          </p>
          <h1 className="font-display mt-2 max-w-xl text-4xl leading-tight font-semibold text-pvn-navy sm:text-5xl">
            The house hit a snag.
          </h1>
          <p className="mt-4 max-w-md text-pvn-navy/70">
            An unexpected error stopped the site from loading. Your donations
            are untouched. Try again in a moment.
          </p>
          {error.digest ? (
            <p className="mt-3 text-xs text-pvn-stone">
              Reference {error.digest}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="rounded-full bg-pvn-gold px-5 py-2.5 text-sm font-semibold text-pvn-navy shadow-[inset_0_-2px_0_rgba(12,27,51,0.12)] transition hover:bg-pvn-gold-light"
            >
              Try again
            </button>
            {/* A full page load rebuilds the root layout this error replaced;
                client-side <Link> navigation would reuse the broken tree. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="rounded-full border border-pvn-navy/15 px-5 py-2.5 text-sm font-medium text-pvn-navy transition hover:border-pvn-navy/30 hover:bg-pvn-navy/5"
            >
              Back home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
