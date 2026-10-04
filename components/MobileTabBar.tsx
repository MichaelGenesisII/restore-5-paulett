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

/** Dashboards have their own navigation; the bar is for visitors only. */
const EXCLUDED_PREFIXES = ["/host", "/admin", "/creator"];

export function MobileTabBar() {
  const pathname = usePathname();
  const excluded = EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const footerInView = useFooterInView(!excluded, pathname);
  const onNavigate = useTabNavigation(pathname);

  if (excluded) return null;

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
            label="Pots"
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
            href={GIVE_HREF}
            label="Give"
            Icon={IconHeart}
            iconClassName="pvn-give-heart"
            active={pathname === GIVE_HREF}
            onNavigate={onNavigate}
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
