import type { Metadata } from "next";
import { HostDashboardShell } from "@/components/host/HostDashboardShell";

export const metadata: Metadata = {
  title: "Host",
  description: "Manage your pots, gift messages, and account.",
  robots: { index: false, follow: false },
};

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="w-full bg-pvn-cream">
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
        <HostDashboardShell>{children}</HostDashboardShell>
      </section>
    </main>
  );
}
