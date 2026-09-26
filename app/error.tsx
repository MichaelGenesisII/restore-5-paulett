"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusScreen } from "@/components/StatusScreen";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      centered
      kicker="Error"
      title="This page couldn't be restored."
      description="Something unexpected stopped this page from loading. Your gifts are safe — nothing was taken twice. Try again, or head back to the house."
    >
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full bg-pvn-gold px-5 py-2.5 text-sm font-semibold text-pvn-navy shadow-[inset_0_-2px_0_rgba(12,27,51,0.12)] transition hover:bg-pvn-gold-light"
      >
        Try again
      </button>
      <Link
        href="/"
        className="rounded-full border border-pvn-navy/15 px-5 py-2.5 text-sm font-medium text-pvn-navy transition hover:border-pvn-navy/30 hover:bg-pvn-navy/5"
      >
        Back home
      </Link>
    </StatusScreen>
  );
}
