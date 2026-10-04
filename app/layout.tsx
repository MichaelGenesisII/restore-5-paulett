import type { Metadata } from "next";
import { CookieConsent } from "@/components/CookieConsent";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { absoluteUrl, SITE_NAME, SITE_TAGLINE, siteOrigin } from "@/lib/seo";
import { display, geistMono, geistSans, nav } from "./fonts";
import "./globals.css";

const siteUrl = siteOrigin();
const defaultOgImage = absoluteUrl("/icon.png");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} | PVN Belfast`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | PVN Belfast`,
    description: SITE_TAGLINE,
    url: siteUrl,
    images: [{ url: defaultOgImage, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | PVN Belfast`,
    description:
      "Help Place of Victory for All Nations Belfast restore 5 Paulett Avenue.",
    images: [defaultOgImage],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${nav.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-pvn-cream text-pvn-navy">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-pvn-navy focus:px-4 focus:py-2.5 focus:font-nav focus:text-xs focus:font-bold focus:tracking-[0.14em] focus:text-pvn-cream focus:uppercase focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-pvn-gold"
        >
          Skip to content
        </a>
        <ToastProvider>
          <Header />
          <div id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
            {children}
          </div>
          <Footer />
          <MobileTabBar />
          <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  );
}
