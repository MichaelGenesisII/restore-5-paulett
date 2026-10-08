import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/host/SetPasswordForm";

export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="w-full bg-pvn-cream">
      <section className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <p className="font-nav text-[0.65rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
          Fundraiser host
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-pvn-navy">
          Set your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-pvn-navy/65">
          Choose a password so you can sign in to your host account on any
          device. Any other device still signed in will be signed out.
        </p>
        <SetPasswordForm token={typeof token === "string" ? token : ""} />
      </section>
    </main>
  );
}
