import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { organisation, socialLinks } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to the team behind Restore 5 Paulett Ave — giving and Gift Aid, fundraisers, alumni, heritage and community, or press.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="w-full">
      <section
        className="relative isolate -mt-[4.75rem] overflow-hidden bg-pvn-navy pt-[calc(4.75rem+3.5rem)] pb-12 text-pvn-cream sm:pb-14"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(335deg, #c9a84c 20px, transparent 20px),
              linear-gradient(155deg, #c9a84c 20px, transparent 20px)
            `,
            backgroundSize: "52px 52px",
            backgroundPosition: "0 0, 26px 0",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[20rem]"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.16), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <p className="font-nav flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
            <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
            Get in touch
          </p>
          <h1 className="font-nav mt-3 text-4xl font-bold uppercase leading-[0.95] tracking-tight text-pvn-cream sm:text-5xl lg:text-6xl">
            Talk to us
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-pvn-cream/80 text-pretty sm:text-lg">
            Whether you are giving, building a fundraiser, coming back after years
            away, or simply curious about the building on the corner — there is
            someone here to answer you.
          </p>
        </div>
      </section>

      <section className="border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
          <div>
            <p className="font-nav text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
              Send a message
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight text-pvn-navy sm:text-4xl">
              Tell us what you need
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-pvn-navy/75 text-pretty">
              Choose what your message is about and it reaches the person who
              handles it. Every field below is short on purpose.
            </p>

            <div className="mt-8">
              <ContactForm />
            </div>
          </div>

          <div className="relative h-fit overflow-hidden rounded-sm bg-pvn-navy p-6 text-pvn-cream shadow-[0_22px_50px_-26px_rgba(12,27,51,0.6)] sm:p-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              aria-hidden
              style={{
                backgroundImage: `
                  linear-gradient(335deg, #c9a84c 18px, transparent 18px),
                  linear-gradient(155deg, #c9a84c 18px, transparent 18px)
                `,
                backgroundSize: "46px 46px",
                backgroundPosition: "0 0, 23px 0",
              }}
            />

            <div className="relative flex flex-col gap-7">
              <div>
                <p className="font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-gold">
                  Our address
                </p>
                <address className="mt-3 text-sm leading-relaxed text-pvn-cream/75 not-italic">
                  <span className="font-nav block text-xs font-bold uppercase tracking-[0.16em] text-pvn-cream">
                    {organisation.legalName}
                  </span>
                  {organisation.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </div>

              <div>
                <p className="font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-gold">
                  Email
                </p>
                <a
                  href={`mailto:${organisation.email}`}
                  className="mt-3 inline-flex text-sm text-pvn-cream/85 underline decoration-pvn-gold/50 underline-offset-4 transition hover:text-pvn-gold-light hover:decoration-pvn-gold"
                >
                  {organisation.email}
                </a>
              </div>

              <div>
                <p className="font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-gold">
                  Visiting
                </p>
                <p className="mt-3 text-sm leading-relaxed text-pvn-cream/70">
                  The building is a restoration site and is not yet open to
                  visitors. Write to us and we will tell you the moment the
                  doors open again.
                </p>
              </div>

              {socialLinks.length > 0 ? (
                <div>
                  <p className="font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-gold">
                    Follow the rebuild
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    {socialLinks.map((social) => (
                      <a
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-pvn-cream/15 transition duration-300 ease-out hover:-translate-y-0.5 ${social.className}`}
                      >
                        <span className="sr-only">
                          {organisation.shortName} on {social.name}
                        </span>
                        <social.Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
