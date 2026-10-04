import type { ReactNode } from "react";

/**
 * Shared frame for the policy pages, so Privacy, Terms and Cookies read as one
 * document set rather than three pages that happen to sit beside each other.
 */
export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="w-full">
      <section className="relative -mt-[4.75rem] overflow-hidden bg-pvn-navy pt-[8.25rem] pb-12 text-pvn-cream sm:pb-14">
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
          <p className="font-nav flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold-light">
            <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
            {eyebrow}
          </p>
          <h1 className="font-nav mt-3 text-4xl font-bold uppercase leading-[0.95] tracking-tight text-pvn-cream sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-pvn-cream/85 text-pretty sm:text-lg">
            {intro}
          </p>
          <p className="font-nav mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-pvn-cream/70">
            Last updated {updated}
          </p>
        </div>
      </section>

      <section className="border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">{children}</div>
      </section>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="font-display text-2xl font-semibold leading-tight text-pvn-navy sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-pvn-navy/80 text-pretty">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            className="mt-2.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-pvn-gold"
            aria-hidden
          />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}
