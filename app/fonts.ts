import localFont from "next/font/local";

/**
 * Self-hosted faces. next/font/google was failing intermittently against
 * fonts.googleapis.com (see the Geist / Cormorant / Barlow warnings in
 * `next dev`), so these ship from `app/fonts` and never hit the network.
 */

export const geistSans = localFont({
  src: [
    { path: "./fonts/Geist-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Geist-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Geist-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Geist-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

export const geistMono = localFont({
  src: [
    { path: "./fonts/GeistMono-Regular.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

export const display = localFont({
  src: [
    {
      path: "./fonts/CormorantGaramond-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/CormorantGaramond-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/CormorantGaramond-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

export const nav = localFont({
  src: [
    {
      path: "./fonts/BarlowCondensed-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/BarlowCondensed-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/BarlowCondensed-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-nav",
  display: "swap",
});
