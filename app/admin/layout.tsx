import type { Metadata } from "next";
import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";

export const metadata: Metadata = {
  title: "Admin",
  description: "House-wide gifts, fundraisers, and ops for 5 Paulett.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="w-full bg-pvn-cream">
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
        <AdminDashboardShell>{children}</AdminDashboardShell>
      </section>
    </main>
  );
}
