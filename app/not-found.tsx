import type { Metadata } from "next";
import Link from "next/link";
import { StatusScreen } from "@/components/StatusScreen";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <StatusScreen
      centered
      kicker="404"
      title="This room isn't on the plans."
      description="That address isn't part of 5 Paulett yet. Head home, browse the pots, or give straight to the restoration."
    >
      <Link
        href="/"
        className="rounded-full bg-pvn-gold px-5 py-2.5 text-sm font-semibold text-pvn-navy shadow-[inset_0_-2px_0_rgba(12,27,51,0.12)] transition hover:bg-pvn-gold-light"
      >
        Back home
      </Link>
      <Link
        href="/fundraisers"
        className="rounded-full border border-pvn-navy/15 px-5 py-2.5 text-sm font-medium text-pvn-navy transition hover:border-pvn-navy/30 hover:bg-pvn-navy/5"
      >
        Browse pots
      </Link>
      <Link
        href="/give"
        className="rounded-full border border-pvn-navy/15 px-5 py-2.5 text-sm font-medium text-pvn-navy transition hover:border-pvn-navy/30 hover:bg-pvn-navy/5"
      >
        Give now
      </Link>
    </StatusScreen>
  );
}
