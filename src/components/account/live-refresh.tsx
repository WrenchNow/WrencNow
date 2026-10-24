"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Re-renders the page when a booking changes. Uses Supabase Realtime (RLS-scoped)
 * with a slow poll as a fallback if the socket can't connect.
 */
export function LiveRefresh({ bookingId, mechanicId }: { bookingId?: string; mechanicId?: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const filter = bookingId ? `id=eq.${bookingId}` : mechanicId ? `mechanic_id=eq.${mechanicId}` : undefined;
    const channel = supabase
      .channel(`bookings:${bookingId ?? mechanicId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", ...(filter ? { filter } : {}) }, () => router.refresh())
      .subscribe();
    const poll = setInterval(() => router.refresh(), 30_000);
    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [bookingId, mechanicId, router]);
  return null;
}
