export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "en_route",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "customer_no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Mirrors public.enforce_booking_rules() in the database. */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["accepted", "cancelled"],
  accepted: ["en_route", "cancelled", "no_show"],
  en_route: ["in_progress", "cancelled", "no_show", "customer_no_show"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
  customer_no_show: [],
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
    case "customer_no_show":
      return actor === "mechanic";
    case "cancelled":
      return true; // further limited by canCancel()
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
  no_show: "Mechanic no-show",
  customer_no_show: "Customer no-show",
};

export const NO_SHOW_GRACE_MINUTES = 30;

/**
 * Customers can report a mechanic no-show once the grace period after the start time has
 * passed — unless the mechanic checked in at the address.
 */
export function noShowReportable(status: BookingStatus, scheduledStart: string, arrivedAt: string | null = null, now: number = Date.now()): boolean {
  if (arrivedAt) return false;
  return (status === "accepted" || status === "en_route") && now > new Date(scheduledStart).getTime() + NO_SHOW_GRACE_MINUTES * 60_000;
}

/** How long a mechanic must wait after checking in (and after the booked time) before marking a customer no-show. */
export const CUSTOMER_WAIT_MINUTES = 15;
/** Mechanic must be within this distance of the address to check in. */
export const ARRIVAL_RADIUS_METERS = 400;

/** When the mechanic may mark the customer as a no-show (mirrors the DB trigger). */
export function customerNoShowAt(arrivedAt: string, scheduledStart: string): number {
  return Math.max(Date.parse(arrivedAt), Date.parse(scheduledStart)) + CUSTOMER_WAIT_MINUTES * 60_000;
}

/**
 * Who can cancel when:
 * - mechanics can only decline a request — once they accept, they're committed (support can step in);
 * - customers cancel free until the mechanic is on the way;
 * - after that only an admin can cancel; the arrival code or a no-show report settles it.
 */
export function canCancel(actor: Actor, from: BookingStatus): boolean {
  if (actor === "admin") return from === "requested" || from === "accepted" || from === "en_route";
  if (actor === "mechanic") return from === "requested";
  return from === "requested" || from === "accepted";
}

export const ARRIVAL_CODE_MAX_ATTEMPTS = 5;
