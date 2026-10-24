import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { SERVICE_PAGES } from "@/lib/service-pages";

const PUBLIC_ROUTES = ["/", "/how-it-works", "/for-mechanics", "/pricing", "/faq", "/payment-protection", "/booking-protection", "/services", "/about", "/search", "/terms", "/privacy", "/mechanic-agreement", "/login", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [...PUBLIC_ROUTES, ...SERVICE_PAGES.map((s) => `/services/${s.slug}`)].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/services") ? 0.8 : 0.6,
  }));
}
