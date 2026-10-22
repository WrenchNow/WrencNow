import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "WrenchNow — Mobile Mechanics At Your Door",
    template: "%s · WrenchNow",
  },
  description:
    "Skip the shop. Book a vetted mobile mechanic who comes to your driveway, parking lot, or office. Upfront rates, real reviews, pay through the app.",
  openGraph: {
    title: "WrenchNow — Mobile Mechanics At Your Door",
    description: "Skip the shop. A vetted mechanic comes to you.",
    url: "/",
    siteName: "WrenchNow",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0e0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
