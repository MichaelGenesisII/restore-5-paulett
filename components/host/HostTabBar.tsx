"use client";

import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconInbox,
  IconProfile,
} from "@/components/dashboard/DashboardIcons";
import { DashboardTabBar } from "@/components/dashboard/DashboardTabBar";
import { IconWall } from "@/components/icons";

type HostMenuUser = {
  name: string | null;
  email: string;
  photoUrl: string | null;
  profileSlug: string | null;
  profilePublic: boolean;
};

/** Signed-in host navigation on mobile: four destinations and the menu. */
export function HostTabBar({
  user,
  unrepliedTotal,
  onSignOut,
  signingOut,
}: {
  user: HostMenuUser;
  unrepliedTotal: number;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const pathname = usePathname();

  return (
    <DashboardTabBar
      label="Host"
      onSignOut={onSignOut}
      signingOut={signingOut}
      tabs={[
        {
          href: "/host",
          label: "Dashboard",
          Icon: IconDashboard,
          active: pathname === "/host",
        },
        {
          href: "/host/inbox",
          label: "Inbox",
          Icon: IconInbox,
          active: pathname.startsWith("/host/inbox"),
          badge: unrepliedTotal,
        },
        {
          href: "/host/pots",
          label: "Fundraisers",
          Icon: IconWall,
          center: true,
          active:
            pathname.startsWith("/host/pots") &&
            !pathname.startsWith("/host/pots/new"),
        },
        {
          href: "/host/account",
          label: "Profile",
          Icon: IconProfile,
          active: pathname.startsWith("/host/account"),
        },
      ]}
      menu={{
        label: "Host menu",
        identity: {
          title: user.name ?? "Your account",
          subtitle: user.email,
          initial: (user.name ?? user.email).trim().charAt(0).toUpperCase(),
          photoUrl: user.photoUrl,
        },
        primaryAction: {
          href: "/host/pots/new",
          label: "Start a fundraiser",
          Icon: IconWall,
        },
        sections: [
          {
            links:
              user.profileSlug && user.profilePublic
                ? [
                    {
                      href: `/hosts/${user.profileSlug}`,
                      label: "View public profile",
                      Icon: IconProfile,
                    },
                  ]
                : [],
          },
        ],
      }}
    />
  );
}
