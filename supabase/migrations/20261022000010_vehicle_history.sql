-- Vehicle service history: optional mileage on each vehicle and a maintenance-reminder opt-in.
-- History itself comes from completed bookings (bookings.vehicle_id), so no new table is needed.
-- vehicles already has owner-only RLS for select/insert/update/delete.

alter table public.vehicles
  add column mileage int check (mileage between 0 and 2000000),
  add column mileage_updated_at timestamptz,
  add column reminders_opt_in boolean not null default false,
  add column reminders_opt_in_at timestamptz;

-- Customers record the odometer reading at booking (optional); kept on the booking for history.
alter table public.bookings add column odometer int check (odometer between 0 and 2000000);
