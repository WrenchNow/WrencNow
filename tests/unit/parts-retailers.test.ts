import { describe, expect, it } from "vitest";
import { isRetailer, partsQuery, partsRetailerUrl } from "@/lib/parts-retailers";

describe("parts store price-check links", () => {
  it("builds a store search URL with an encoded query", () => {
    expect(partsRetailerUrl("oreilly", partsQuery("Front brake pads", "Honda Civic"))).toBe("https://www.oreillyauto.com/search?q=Front%20brake%20pads%20Honda%20Civic");
    expect(partsRetailerUrl("autozone", "  oil   filter & gasket ")).toBe("https://www.autozone.com/searchresult?searchText=oil%20filter%20%26%20gasket");
  });

  it("wraps the destination in an affiliate deep link when one is configured", () => {
    const url = partsRetailerUrl("napa", "battery", { affiliateTemplate: "https://network.example/c/123?u={url}" });
    expect(url).toBe(`https://network.example/c/123?u=${encodeURIComponent("https://www.napaonline.com/search?text=battery")}`);
  });

  it("lets the search URL be overridden, and rejects unknown stores", () => {
    expect(partsRetailerUrl("advance", "wipers", { searchOverride: "https://example.test/s?k={q}" })).toBe("https://example.test/s?k=wipers");
    expect(isRetailer("autozone")).toBe(true);
    expect(isRetailer("evil.example")).toBe(false);
  });

  it("caps very long queries", () => {
    expect(decodeURIComponent(partsRetailerUrl("autozone", "x".repeat(500)).split("=")[1]!)).toHaveLength(120);
  });
});
