// Maintenance reminders: pure rules (tested) + the server job that emails opted-in customers.

export type ReminderVehicle = { id: string; owner_id: string; label: string; reminders_opt_in: boolean };
export type ReminderJob = { id: string; vehicle_id: string | null; completed_at: string | null; service_slug: string | null };
export type DueReminder = { vehicleId: string; ownerId: string; label: string; lastJobId: string; lastDoneAt: string; daysSince: number };

/** Oil-change style services that reset the clock. */
export const OIL_SERVICES = ["oil-change"];

/**
 * Cars that are due: opted in, with a completed oil change on WrenchNow at least `intervalDays` ago and none since.
 * Cars with no oil change on record are skipped — we don't guess.
 */
export function dueReminders(vehicles: ReminderVehicle[], jobs: ReminderJob[], intervalDays: number, now: number): DueReminder[] {
  const out: DueReminder[] = [];
  for (const v of vehicles) {
    if (!v.reminders_opt_in) continue;
    const last = jobs
      .filter((j) => j.vehicle_id === v.id && j.completed_at && j.service_slug && OIL_SERVICES.includes(j.service_slug))
      .sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!))[0];
    if (!last) continue;
    const daysSince = Math.floor((now - Date.parse(last.completed_at!)) / 86_400_000);
    if (daysSince >= intervalDays) out.push({ vehicleId: v.id, ownerId: v.owner_id, label: v.label, lastJobId: last.id, lastDoneAt: last.completed_at!, daysSince });
  }
  return out;
}
