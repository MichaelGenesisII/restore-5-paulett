import type { ComponentType } from "react";
import {
  IconFacebook,
  IconInstagram,
  IconX,
  IconYouTube,
} from "@/components/icons";

/**
 * Public-facing organisation details.
 *
 * TODO(PVN): confirm every value below before launch. Fields left as an empty
 * string are hidden rather than rendered blank, so it is safe to ship with the
 * charity number missing until it is confirmed — never guess it.
 */
export const organisation = {
  legalName: "Place of Victory for All Nations Belfast",
  shortName: "PVN Belfast",
  addressLines: ["5 Paulett Avenue", "Belfast", "Northern Ireland"],
  /** Shown as a mailto link in the footer. */
  email: "info@placeofvictoryni.org",
  /** e.g. "NIC123456". Left empty until the registered number is confirmed. */
  charityNumber: "",
} as const;

export type SocialLink = {
  name: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
  /** Brand colour at rest; the chip fills with it on hover. */
  className: string;
};

/**
 * TODO(PVN): replace these with the real profile URLs. Remove any platform the
 * church does not use — the footer renders whatever is left in this list.
 */
export const socialLinks: SocialLink[] = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/pvnbelfast",
    Icon: IconFacebook,
    className:
      "text-[#1877F2] hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/pvnbelfast",
    Icon: IconInstagram,
    className:
      "text-[#E1306C] hover:border-transparent hover:bg-[linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)] hover:text-white",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@pvnbelfast",
    Icon: IconYouTube,
    className:
      "text-[#FF0033] hover:border-[#FF0033] hover:bg-[#FF0033] hover:text-white",
  },
  {
    name: "X",
    href: "https://x.com/pvnbelfast",
    Icon: IconX,
    className:
      "text-pvn-cream hover:border-pvn-cream hover:bg-pvn-cream hover:text-pvn-navy",
  },
];
