/** Pot lifecycle helpers — string-safe so they work before/after Prisma regenerate. */

export type PotLifecycleStatus =
  | "PENDING"
  | "ACTIVE"
  | "PAUSED"
  | "DISABLED"
  | "CLOSED";

export function asPotStatus(value: string): PotLifecycleStatus | null {
  if (
    value === "PENDING" ||
    value === "ACTIVE" ||
    value === "PAUSED" ||
    value === "DISABLED" ||
    value === "CLOSED"
  ) {
    return value;
  }
  return null;
}

/** Browse /fundraisers lists only live pots. */
export function isListedOnBrowse(status: string): boolean {
  return status === "ACTIVE";
}

/** Soft-visible statuses still render a public pot page (not 404). */
export function isPubliclyVisible(status: string): boolean {
  return status !== "DISABLED";
}

/** Whether checkout may accept a gift for this pot. */
export function acceptsGifts(status: string): boolean {
  return status === "ACTIVE" || status === "PENDING";
}

const TRANSITIONS: Record<PotLifecycleStatus, readonly PotLifecycleStatus[]> = {
  PENDING: ["DISABLED"],
  ACTIVE: ["PAUSED", "CLOSED", "DISABLED"],
  PAUSED: ["ACTIVE", "CLOSED", "DISABLED"],
  CLOSED: ["ACTIVE", "DISABLED"],
  DISABLED: ["ACTIVE"],
};

export function canTransitionPotStatus(from: string, to: string): boolean {
  if (from === to) return false;
  const fromStatus = asPotStatus(from);
  const toStatus = asPotStatus(to);
  if (!fromStatus || !toStatus) return false;
  return TRANSITIONS[fromStatus].includes(toStatus);
}

/** Statuses the pot may move to from its current status. */
export function allowedPotTransitions(from: string): PotLifecycleStatus[] {
  const fromStatus = asPotStatus(from);
  if (!fromStatus) return [];
  return [...TRANSITIONS[fromStatus]];
}

export function potStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Needs seed";
    case "ACTIVE":
      return "Live";
    case "PAUSED":
      return "Paused";
    case "CLOSED":
      return "Closed";
    case "DISABLED":
      return "Hidden";
    default:
      return status.replaceAll("_", " ");
  }
}

/** Confirm copy for creator status changes. */
export function statusChangeCopy(to: PotLifecycleStatus): {
  title: string;
  body: string;
  confirmLabel: string;
} {
  switch (to) {
    case "PAUSED":
      return {
        title: "Pause this pot?",
        body: "The story stays visible, but gifts pause and it leaves the browse list. You can resume anytime.",
        confirmLabel: "Pause pot",
      };
    case "CLOSED":
      return {
        title: "Close this pot?",
        body: "Visitors can still read the story as finished. No new gifts. You can reopen later if needed.",
        confirmLabel: "Close pot",
      };
    case "DISABLED":
      return {
        title: "Hide this pot?",
        body: "The public page will 404 and it will not appear on browse. Resume later to bring it back.",
        confirmLabel: "Hide pot",
      };
    case "ACTIVE":
      return {
        title: "Make this pot live again?",
        body: "It will accept gifts and appear on browse once more.",
        confirmLabel: "Go live",
      };
    default:
      return {
        title: "Change status?",
        body: "Confirm this status change.",
        confirmLabel: "Confirm",
      };
  }
}
