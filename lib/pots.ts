import type { PotType, RestorationCategory } from "@prisma/client";

/**
 * Human words for the two enums a pot is built from. The database stores
 * SCREAMING_SNAKE; nobody should ever read that on a page.
 */

/** Public pot description — only on the pot details page (not on cards). */
export const MIN_POT_DESCRIPTION_WORDS = 25;

/** Personal “your story” — only on the pot details page. */
export const MIN_FOUNDER_STORY_WORDS = 40;

export function wordCount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Empty is fine (fill later). Once someone starts typing, the copy must be
 * long enough to carry the pot details page.
 */
export function optionalCopyProblem(
  value: string,
  minWords: number,
  label: string,
): string | null {
  const words = wordCount(value);
  if (words === 0) return null;
  if (words < minWords) {
    const left = minWords - words;
    return `${label} needs at least ${minWords} words for the pot page (${left} more). Or leave it blank and add it later.`;
  }
  return null;
}

export type PotTypeOption = {
  value: PotType;
  label: string;
  blurb: string;
  /** Sets the tone of the story step for this kind of pot. */
  storyHint: string;
  placeholder: string;
};

export const potTypes: PotTypeOption[] = [
  {
    value: "INDIVIDUAL",
    label: "On my own",
    blurb: "One name against one part of the wall.",
    storyHint:
      "Why does 5 Paulett matter to you? Say it plainly — the people who know you will hear it.",
    placeholder: "Tolu’s part of the wall",
  },
  {
    value: "FAMILY",
    label: "As a family",
    blurb: "One household, one section, built together.",
    storyHint:
      "What is your family’s history with this house? Name the years, the seats, the people.",
    placeholder: "The Murphy family wall",
  },
  {
    value: "ALUMNI_GROUP",
    label: "With alumni",
    blurb: "You left Belfast. You never left the story.",
    storyHint:
      "Who are you calling in? Say when you were here and where the years since have scattered you.",
    placeholder: "The 2004 leavers",
  },
  {
    value: "MINISTRY",
    label: "As a ministry",
    blurb: "A choir, a youth team, a prayer group.",
    storyHint:
      "What did this building make possible for your ministry, and what will it make possible again?",
    placeholder: "The worship team’s window",
  },
  {
    value: "OTHER_GROUP",
    label: "As a group",
    blurb: "Neighbours, colleagues, friends — any gathering.",
    storyHint:
      "Introduce the group and say what pulled you together around this restoration.",
    placeholder: "The Tuesday night crew",
  },
];

export type RestorationOption = {
  value: RestorationCategory;
  label: string;
  blurb: string;
};

export const restorationCategories: RestorationOption[] = [
  {
    value: "ROOF_STRUCTURE",
    label: "Roof & structure",
    blurb: "The bones. Everything else waits on these.",
  },
  {
    value: "STONEWORK_EXTERIOR",
    label: "Stonework & exterior",
    blurb: "The face the street sees.",
  },
  {
    value: "WINDOWS",
    label: "Windows",
    blurb: "Light back into rooms that have sat dark.",
  },
  {
    value: "HEATING_ELECTRICAL",
    label: "Heating & electrical",
    blurb: "Warmth, power, and a building fit to gather in.",
  },
  {
    value: "WORSHIP_SPACE",
    label: "Worship space",
    blurb: "The room the singing goes back into.",
  },
  {
    value: "CHILDREN_YOUTH",
    label: "Children & youth",
    blurb: "Rooms for the ones who come after us.",
  },
  {
    value: "COMMUNITY_FACILITIES",
    label: "Community facilities",
    blurb: "Doors open to the whole of Paulett Avenue.",
  },
  {
    value: "GENERAL",
    label: "Wherever it is needed most",
    blurb: "Let the builders decide as the work moves.",
  },
];

/** Sensible rungs for a pot target — modest at the bottom, ambitious at the top. */
export const POT_TARGET_PRESETS = [25_000, 50_000, 100_000, 250_000, 500_000];

export function potTypeLabel(value: PotType): string {
  return potTypes.find((option) => option.value === value)?.label ?? "A pot";
}

export function restorationLabel(value: RestorationCategory): string {
  return (
    restorationCategories.find((option) => option.value === value)?.label ??
    "Wherever it is needed most"
  );
}
