import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

const PUBLIC_ROUTES = ["/", "/how-it-works", "/for-mechanics", "/pricing", "/faq", "/payment-protection", "/guarantee", "/search", "/terms", "/privacy", "/mechanic-agreement", "/login", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_ROUTES.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
