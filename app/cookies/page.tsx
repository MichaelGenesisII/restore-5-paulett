import type { Metadata } from "next";
import Link from "next/link";
import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";
import { LegalList, LegalPage, LegalSection } from "@/components/LegalPage";
import { organisation } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookies",
  description:
    "What this site stores on your device, what it does not, and how to change your mind at any time.",
};

const inUse = [
  {
    name: "pvn-cookie-consent",
    kind: "Stored on your device",
    purpose:
      "Remembers the choice you made in the banner, so you are not asked on every page.",
    life: "Until you clear it, or until the categories change.",
  },
  {
    name: "pvn_vid",
    kind: "Stored on your device — only if you allow analytics",
    purpose:
      "A random id used to count fundraiser page visits without storing your name. Hosts see totals and share sources, not who you are.",
    life: "Until you clear site data, or turn analytics off and clear storage.",
  },
  {
    name: "Stripe session cookies",
    kind: "Set by Stripe, on Stripe's own pages",
    purpose:
      "Protects your card payment against fraud while you are completing it.",
    life: "Set only when you are giving, and only on Stripe's checkout pages.",
  },
  {
    name: "Facebook video player",
    kind: "Set by Facebook — only if you allow Sharing the story, or tap play",
    purpose:
      "Plays the film of 5 Paulett Avenue on Our New Home. Facebook's player may set its own cookies, governed by Facebook's policy.",
    life: "Set only when the player loads.",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Cookies"
      title="What we keep, and what we do not"
      intro="Most cookie notices are written to be skimmed past. This one is written to be read, because it is short — this site currently sets almost nothing."
      updated="8 October 2026"
    >
      <LegalSection title="The short version">
        <p>We do not sell your attention, and we do not follow you around the web.</p>
        <p>
          There is no advertising pixel. Optional analytics — counting visits to
          fundraiser pages so hosts can see whether their link is working — runs only
          if you turn on <strong className="font-semibold text-pvn-navy">Understanding the rebuild</strong>{" "}
          in the cookie banner. Until then, those visits are not recorded.
        </p>
        <p>
          The only thing we always store on your device is the record of the
          choice you made when the banner appeared (and Stripe’s own cookies on
          their checkout pages when you give).
        </p>
      </LegalSection>

      <LegalSection title="What a cookie actually is">
        <p>
          A cookie is a small file a website asks your browser to keep, so it
          can recognise your device next time. The same rules cover related
          technologies such as local storage, which is what we use for your
          consent choice. On this page, “cookie” means both.
        </p>
      </LegalSection>

      <LegalSection title="What is set today">
        <div className="overflow-hidden rounded-sm border border-pvn-navy/12">
          {inUse.map((item, i) => (
            <div
              key={item.name}
              className={`p-5 ${i > 0 ? "border-t border-pvn-navy/12" : ""}`}
            >
              <p className="font-mono text-sm font-medium text-pvn-navy">
                {item.name}
              </p>
              <p className="font-nav mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-pvn-navy/70">
                {item.kind}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-pvn-navy/80">
                {item.purpose}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-pvn-navy/70">
                {item.life}
              </p>
            </div>
          ))}
        </div>
        <p>
          Stripe processes card payments for us. When you give, you are handed
          to Stripe’s own secure pages, and the cookies they set there are
          governed by their policy rather than ours. We never see your card
          details.
        </p>
      </LegalSection>

      <LegalSection title="Why this matters to us">
        <p>
          We are asking people to give toward a building. That asking has to be
          clean.
        </p>
        <p>
          A site that quietly follows you around the internet has already spent
          some of the trust it was about to ask for. So the default here is
          nothing, and anything more is a question we put to you plainly.
        </p>
      </LegalSection>

      <LegalSection title="The three categories">
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-pvn-navy">
                Strictly necessary.
              </strong>{" "}
              Without these the site cannot do its job — remembering your
              consent choice, and carrying you safely through giving. The law
              does not require your permission for these, and we do not pretend
              to ask for it.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                Understanding the rebuild.
              </strong>{" "}
              Counting visits to fundraiser pages (hashed visitor id, no names) so
              hosts can see traffic and share sources. Off unless you turn it
              on.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                Sharing the story.
              </strong>{" "}
              Letting the Facebook film on Our New Home play by itself as you
              scroll to it, and seeing whether a post or an advert brought you
              here. Off unless you turn it on — you can still tap to play the
              film without it.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Changing your mind">
        <p>
          Your choice is not permanent and refusing is never penalised — every
          part of this site, including giving, works exactly the same either
          way.
        </p>
        <div className="rounded-sm border border-pvn-gold/40 bg-pvn-gold/10 p-5 sm:p-6">
          <p className="font-nav text-xs font-bold uppercase tracking-[0.16em] text-pvn-navy">
            Your current settings
          </p>
          <p className="mt-2 text-sm leading-relaxed text-pvn-navy/75">
            Open the panel to see what you allowed and change it. The same link
            sits in the footer of every page.
          </p>
          <CookiePreferencesButton className="font-nav mt-4 inline-flex min-h-11 items-center rounded-md bg-pvn-navy px-6 text-xs font-bold uppercase tracking-[0.16em] text-pvn-cream transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-pvn-navy-light">
            Manage cookie settings
          </CookiePreferencesButton>
        </div>
        <p>
          You can also clear cookies and site data for any website from your
          browser’s own settings, usually under Privacy. Doing that here simply
          means the banner asks you again.
        </p>
      </LegalSection>

      <LegalSection title="Asking us about this">
        <p>
          Write to{" "}
          <a
            href={`mailto:${organisation.email}?subject=${encodeURIComponent(
              "Cookies question",
            )}`}
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            {organisation.email}
          </a>
          , or use the{" "}
          <Link
            href="/contact"
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            contact form
          </Link>
          . How we handle personal information more broadly is set out in our{" "}
          <Link
            href="/privacy"
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            privacy notice
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
