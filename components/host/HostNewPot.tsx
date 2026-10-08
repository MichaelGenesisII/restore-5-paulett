"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useHostDashboard } from "@/components/host/HostDashboardShell";
import { QuickCreateFundraiser } from "@/components/pots/QuickCreateFundraiser";

export function HostNewPot() {
  const { data, refresh, setFormDirty } = useHostDashboard();

  const onCreated = useCallback(() => {
    void refresh({ bypassClientCache: true }).catch(() => {});
  }, [refresh]);

  if (!data) return null;

  return (
    <div>
      <Link
        href="/host/pots"
        className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/50 uppercase transition hover:text-pvn-gold"
      >
        ← Your fundraisers
      </Link>
      <h1 className="font-display mt-2 text-3xl font-semibold text-pvn-navy sm:text-4xl">
        Start a fundraiser
      </h1>
      <p className="mt-2 mb-8 max-w-xl text-sm leading-relaxed text-pvn-navy/65">
        A name, a target and your first stone. Everything else can wait.
      </p>
      <QuickCreateFundraiser
        mode="host"
        account={{ email: data.user.email, name: data.user.name }}
        onCreated={onCreated}
        onDirtyChange={setFormDirty}
        cancelHref="/host/pots"
      />
    </div>
  );
}
