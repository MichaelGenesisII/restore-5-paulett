"use client";

import { usePathname } from "next/navigation";
import {
  IconBook,
  IconGraduation,
  IconHeart,
  IconPeople,
  IconWall,
} from "@/components/icons";
import {
  TabBarCenterItem,
  TabBarItem,
  TabBarShell,
  useFooterInView,
  useTabNavigation,
} from "@/components/TabBarKit";

const GIVE_HREF = "/give";

function scrollToPotForm() {
  document
    .getElementById("give")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Dashboards have their own navigation; the bar is for visitors only. */
const EXCLUDED_PREFIXES = ["/host", "/admin", "/creator"];

export function hasMobileTabBar(pathname: string) {
  return !EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const excluded = !hasMobileTabBar(pathname);
  const footerInView = useFooterInView(!excluded, pathname);
  const onNavigate = useTabNavigation(pathname);

  if (excluded) return null;

  // On a fundraiser page, Give means this fundraiser — not the general fund.
  const onPot = /^\/pots\/[^/]+$/.test(pathname);
  const giveHref = onPot ? `${pathname}#give` : GIVE_HREF;

  return (
    <TabBarShell label="Quick links" hidden={footerInView} className="md:hidden">
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        <li>
          <TabBarItem
            href="/our-story"
            label="Story"
            Icon={IconBook}
            active={pathname === "/our-story"}
            onNavigate={onNavigate}
          />
        </li>
        <li>
          <TabBarItem
            href="/fundraisers"
            label="Fundraisers"
            Icon={IconWall}
            active={
              pathname.startsWith("/fundraisers") ||
              pathname.startsWith("/pots/")
            }
            onNavigate={onNavigate}
          />
        </li>
        <li>
          <TabBarCenterItem
            href={giveHref}
            label="Give"
            Icon={IconHeart}
            iconClassName="pvn-give-heart"
            active={pathname === GIVE_HREF}
            onNavigate={onPot ? scrollToPotForm : onNavigate}
          />
        </li>
        <li>
          <TabBarItem
            href="/alumni"
            label="Alumni"
            Icon={IconGraduation}
            active={pathname.startsWith("/alumni")}
            onNavigate={onNavigate}
          />
        </li>
        <li>
          <TabBarItem
            href="/host"
            label="Host"
            Icon={IconPeople}
            onNavigate={onNavigate}
          />
        </li>
      </ul>
    </TabBarShell>
  );
}
