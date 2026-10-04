export type NavItem = {
  href: string;
  label: string;
};

export const primaryNav: NavItem[] = [
  { href: "/our-story", label: "Our Story" },
  { href: "/our-new-home", label: "Our New Home" },
  { href: "/fundraisers", label: "Fundraisers" },
  { href: "/the-wall", label: "The Wall" },
  { href: "/alumni", label: "Alumni" },
  { href: "/host", label: "Host" },
];

/** Footer “Explore” — Contact lives here; Login (Host/Admin) is under Ways to build. */
export const exploreNav: NavItem[] = [
  { href: "/our-story", label: "Our Story" },
  { href: "/our-new-home", label: "Our New Home" },
  { href: "/fundraisers", label: "Fundraisers" },
  { href: "/alumni", label: "Alumni" },
  { href: "/contact", label: "Contact" },
];

/** Ways to build — Login (Host/Admin dropdown) is rendered in the footer, not listed here. */
export const giveNav: NavItem[] = [
  { href: "/give", label: "Give now" },
  { href: "/the-wall", label: "The Wall" },
  { href: "/fundraisers/create", label: "Start a fundraiser" },
  { href: "/fundraisers", label: "Browse fundraisers" },
];

/** Footer Login hover menu under Ways to build. */
export const loginNav: NavItem[] = [
  { href: "/host", label: "Host" },
  { href: "/admin", label: "Admin" },
];

/** Policy and contact pages. These routes still need to be built. */
export const legalNav: NavItem[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/accessibility", label: "Accessibility" },
];
