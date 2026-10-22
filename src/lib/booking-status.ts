export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "en_route",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Mirrors public.enforce_booking_rules() in the database. */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["accepted", "cancelled"],
  accepted: ["en_route", "cancelled", "no_show"],
  en_route: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: BookingStatus): readonly BookingStatus[] {
  return TRANSITIONS[from];
}

export function isActive(status: BookingStatus): boolean {
  return status === "requested" || status === "accepted" || status === "en_route" || status === "in_progress";
}

export function isTerminal(status: BookingStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export type Actor = "customer" | "mechanic" | "admin";

/** Who may move a booking into each status. */
export function actorMayTransition(actor: Actor, to: BookingStatus): boolean {
  if (actor === "admin") return true;
  switch (to) {
    case "accepted":
    case "en_route":
    case "in_progress":
    case "completed":
      return actor === "mechanic";
    case "no_show":
      return actor === "customer";
    case "cancelled":
      return true;
    default:
      return false;
  }
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  en_route: "On the way",
  in_progress: "Working on it",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const NO_SHOW_GRACE_MINUTES = 30;

/** Customers can report a no-show once the grace period after the start time has passed. */
export function noShowReportable(status: BookingStatus, scheduledStart: string, now: number = Date.now()): boolean {
  return (status === "accepted" || status === "en_route") && now > new Date(scheduledStart).getTime() + NO_SHOW_GRACE_MINUTES * 60_000;
}
