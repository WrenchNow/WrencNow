import type { MetadataRoute } from "next";
import { THEME } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WrenchNow — Mobile Mechanics",
    short_name: "WrenchNow",
    description: "Book a vetted mobile mechanic who comes to you.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME.bg,
    theme_color: THEME.bg,
    categories: ["auto", "lifestyle", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Find a mechanic", url: "/search" },
      { name: "My bookings", url: "/account/bookings" },
    ],
  };
}
