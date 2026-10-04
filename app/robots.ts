import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";

const base = siteOrigin();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/host/", "/creator/", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
