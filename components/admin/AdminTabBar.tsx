"use client";

import { usePathname } from "next/navigation";
import {
  IconChart,
  IconDashboard,
  IconDownload,
  IconGift,
  IconInbox,
  IconSettings,
} from "@/components/dashboard/DashboardIcons";
import { DashboardTabBar } from "@/components/dashboard/DashboardTabBar";
import { IconHouse, IconPeople, IconWall } from "@/components/icons";

/**
 * Admin navigation on mobile. The bar carries the daily loop (overview, pots,
 * gifts at centre, inbox); reporting and configuration live in the menu.
 */
export function AdminTabBar({
  email,
  unhandledContacts,
  onSignOut,
  signingOut,
}: {
  email: string;
  unhandledContacts: number;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const pathname = usePathname();
  const under = (href: string) => pathname.startsWith(href);

  return (
    <DashboardTabBar
      label="Admin"
      onSignOut={onSignOut}
      signingOut={signingOut}
      tabs={[
        {
          href: "/admin",
          label: "Overview",
          Icon: IconDashboard,
          active: pathname === "/admin",
        },
        {
          href: "/admin/pots",
          label: "Pots",
          Icon: IconWall,
          active: under("/admin/pots"),
        },
        {
          href: "/admin/gifts",
          label: "Gifts",
          Icon: IconGift,
          active: under("/admin/gifts"),
          center: true,
        },
        {
          href: "/admin/inbox",
          label: "Inbox",
          Icon: IconInbox,
          active: under("/admin/inbox"),
          badge: unhandledContacts,
        },
      ]}
      menu={{
        label: "Admin menu",
        identity: {
          title: "Operations",
          subtitle: email,
          initial: email.trim().charAt(0).toUpperCase(),
        },
        sections: [
          {
            title: "Manage",
            links: [
              {
                href: "/admin/hosts",
                label: "Hosts",
                Icon: IconPeople,
                active: under("/admin/hosts"),
              },
              {
                href: "/admin/building-fund",
                label: "Building fund",
                Icon: IconHouse,
                active: under("/admin/building-fund"),
              },
            ],
          },
          {
            title: "Reports",
            links: [
              {
                href: "/admin/analytics",
                label: "Analytics",
                Icon: IconChart,
                active: under("/admin/analytics"),
              },
              {
                href: "/admin/exports",
                label: "Exports",
                Icon: IconDownload,
                active: under("/admin/exports"),
              },
            ],
          },
          {
            title: "Configure",
            links: [
              {
                href: "/admin/settings",
                label: "Settings",
                Icon: IconSettings,
                active: under("/admin/settings"),
              },
            ],
          },
        ],
      }}
    />
  );
}
