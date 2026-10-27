"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function UseLocationButton() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "locating" | "denied">("idle");

  function locate() {
    if (!("geolocation" in navigator)) return setState("denied");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = new URLSearchParams(params.toString());
        next.set("loc", `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`);
        router.push(`/search?${next.toString()}`);
        setState("idle");
      },
      () => setState("denied"),
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={locate} disabled={state === "locating"} className="text-sm font-semibold text-ore hover:underline disabled:opacity-60">
        {state === "locating" ? "Finding you…" : "📍 Use my location"}
      </button>
      {state === "denied" && <span className="text-xs text-muted">Location unavailable — type an address or ZIP instead.</span>}
    </span>
  );
}
