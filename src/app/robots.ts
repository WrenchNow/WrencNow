import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/book", "/mechanic", "/admin", "/api", "/auth", "/onboarding"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
