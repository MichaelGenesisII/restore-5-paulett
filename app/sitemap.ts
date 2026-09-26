import type { MetadataRoute } from "next";
import { PotStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteOrigin } from "@/lib/seo";

const base = siteOrigin();

/** Public marketing pages + live pots. Dashboards stay out (robots disallow). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/give", changeFrequency: "daily", priority: 0.9 },
    { path: "/fundraisers", changeFrequency: "daily", priority: 0.85 },
    { path: "/fundraisers/create", changeFrequency: "weekly", priority: 0.7 },
    { path: "/the-wall", changeFrequency: "daily", priority: 0.7 },
    { path: "/alumni", changeFrequency: "weekly", priority: 0.65 },
    { path: "/our-story", changeFrequency: "monthly", priority: 0.6 },
    { path: "/our-new-home", changeFrequency: "monthly", priority: 0.55 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/accessibility", changeFrequency: "yearly", priority: 0.3 },
  ];

  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = paths.map(
    ({ path, changeFrequency, priority }) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );

  let potEntries: MetadataRoute.Sitemap = [];
  try {
    const pots = await prisma.pot.findMany({
      where: {
        status: { in: [PotStatus.ACTIVE, PotStatus.PENDING] },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    potEntries = pots.map((pot) => ({
      url: `${base}/pots/${pot.slug}`,
      lastModified: pot.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    potEntries = [];
  }

  let hostEntries: MetadataRoute.Sitemap = [];
  try {
    const hosts = await prisma.fundraiser.findMany({
      where: {
        profilePublic: true,
        profileSlug: { not: null },
      },
      select: { profileSlug: true, createdAt: true },
      take: 2000,
    });
    hostEntries = hosts
      .filter((h): h is { profileSlug: string; createdAt: Date } =>
        Boolean(h.profileSlug),
      )
      .map((host) => ({
        url: `${base}/hosts/${host.profileSlug}`,
        lastModified: host.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.55,
      }));
  } catch {
    hostEntries = [];
  }

  return [...staticEntries, ...potEntries, ...hostEntries];
}
