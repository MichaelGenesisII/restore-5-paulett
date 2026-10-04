import Link from "next/link";
import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";
import { FooterLoginMenu } from "@/components/FooterLoginMenu";
import { Logo } from "@/components/Logo";
import { exploreNav, giveNav, legalNav } from "@/lib/navigation";
import { organisation, socialLinks } from "@/lib/site";

const linkClass =
  "inline-flex min-h-9 items-center text-pvn-cream/75 transition hover:text-pvn-gold-light";

function FooterColumn({
  title,
  items,
  extra,
}: {
  title: string;
  items: { href: string; label: string }[];
  /** Appended below the links — used for Login / cookie panel. */
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-nav text-[0.62rem] font-bold uppercase tracking-[0.16em] text-pvn-gold-light sm:text-[0.7rem] sm:tracking-[0.22em]">
        {title}
      </h2>
      <ul className="mt-3 flex flex-col text-[0.8rem] sm:text-sm">
        {items.map((item) => (
          <li key={`${item.href}:${item.label}`}>
            <Link href={item.href} className={linkClass}>
              {item.label}
            </Link>
          </li>
        ))}
        {extra ? <li>{extra}</li> : null}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      id="site-footer"
      className="relative mt-auto overflow-hidden bg-pvn-navy pt-12 text-pvn-cream sm:pt-14"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(335deg, #c9a84c 23px, transparent 23px),
            linear-gradient(155deg, #c9a84c 23px, transparent 23px),
            linear-gradient(335deg, #c9a84c 23px, transparent 23px),
            linear-gradient(155deg, #c9a84c 23px, transparent 23px)
          `,
          backgroundSize: "58px 58px",
          backgroundPosition: "0 0, 29px 0, 29px -29px, 0 29px",
        }}
      />

      {/* Light falling from the top edge, so the navy has depth behind the logo */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[22rem]"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.15), transparent 68%)",
        }}
      />

      <div className="relative">
        <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,2.1fr)] lg:gap-12">
            <div className="flex flex-col gap-4">
              <Logo variant="light" />
              <p className="max-w-md text-sm leading-relaxed text-pvn-cream/75 lg:max-w-sm">
                {organisation.legalName} is bringing 5 Paulett Avenue back to
                life — a historic East Belfast building for worship, community,
                and generations to come.
              </p>

              <address className="text-sm leading-relaxed text-pvn-cream/70 not-italic">
                <span className="block font-medium text-pvn-gold-light">
                  {organisation.addressLines[0]}
                </span>
                {organisation.addressLines.slice(1).join(", ")}
                {organisation.email ? (
                  <a
                    href={`mailto:${organisation.email}`}
                    className="mt-1 block text-pvn-cream/75 transition hover:text-pvn-gold-light"
                  >
                    {organisation.email}
                  </a>
                ) : null}
              </address>

              <Link
                href="/give"
                className="font-nav inline-flex min-h-11 w-fit items-center rounded-md bg-pvn-gold px-6 text-xs font-bold uppercase tracking-[0.16em] text-pvn-navy transition hover:bg-pvn-gold-light"
              >
                Give now
              </Link>
            </div>

            <div>
              {/* Three columns abreast at every width — stacking them turns the
                  footer into a long ladder of links on a phone. */}
              <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:gap-x-8">
                <FooterColumn title="Explore" items={exploreNav} />
                <FooterColumn
                  title="Ways to build"
                  items={giveNav}
                  extra={<FooterLoginMenu linkClass={linkClass} />}
                />
                <FooterColumn
                  title="Legal"
                  items={legalNav}
                  extra={
                    <CookiePreferencesButton
                      className={`${linkClass} text-left`}
                    />
                  }
                />
              </div>

              {socialLinks.length > 0 ? (
                <div className="mt-8 flex items-center justify-end gap-2.5">
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
              ) : null}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-pvn-cream/10 pt-6 text-xs text-pvn-cream/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p>
                © {year} {organisation.legalName}. All rights reserved.
              </p>
              {organisation.charityNumber ? (
                <p>
                  Registered charity in Northern Ireland, no.{" "}
                  {organisation.charityNumber}.
                </p>
              ) : null}
            </div>
            <p className="font-nav uppercase tracking-[0.2em]">
              Your fundraiser <span className="text-pvn-gold">→</span> our house
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
