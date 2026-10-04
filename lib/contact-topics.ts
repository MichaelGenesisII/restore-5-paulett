import { ContactTopic } from "@prisma/client";

export const CONTACT_TOPIC_LABELS: Record<ContactTopic, string> = {
  GIVING: "Giving & Gift Aid",
  POT: "My fundraiser",
  LEGACY: "Legacy & gifts in wills",
  GRANTS: "Grants & trusts",
  ALUMNI: "Alumni",
  VOLUNTEER: "Volunteering",
  PRAYER: "Prayer request",
  MEMBERSHIP: "Visiting or joining PVN",
  HERITAGE: "Heritage & building",
  PRESS: "Press & media",
  GENERAL: "Something else",
};

const TOPIC_VALUES = new Set<string>(Object.keys(CONTACT_TOPIC_LABELS));

export function parseContactTopic(value: unknown): ContactTopic | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  if (!TOPIC_VALUES.has(trimmed)) return null;
  return trimmed as ContactTopic;
}

export function contactTopicLabel(topic: string): string {
  return (
    CONTACT_TOPIC_LABELS[topic as ContactTopic] ??
    topic.replaceAll("_", " ").toLowerCase()
  );
}
