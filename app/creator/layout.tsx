import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Host",
  description: "Manage your fundraisers, gift messages, and account.",
  robots: { index: false, follow: false },
};

/** Legacy /creator paths redirect from each page into /host. */
export default function CreatorLegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
