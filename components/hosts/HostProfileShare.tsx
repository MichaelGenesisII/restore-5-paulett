"use client";

import { ShareCta } from "@/components/ShareCta";

export function HostProfileShare({
  name,
  profileSlug,
}: {
  name: string;
  profileSlug: string;
}) {
  return (
    <ShareCta
      title={name}
      text={`${name} is raising for the restoration of 5 Paulett. Take a look at their pots.`}
      label={`Share ${name}'s profile`}
      size="lg"
      getUrl={() => `${window.location.origin}/hosts/${profileSlug}`}
    />
  );
}
