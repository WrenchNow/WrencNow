-- Winter and logistics: where the car is and whether it's under cover (mobile work is done outdoors),
-- and a per-service flag for jobs that may need a lift or a shop.

alter table public.bookings
  add column car_location text check (car_location in ('driveway', 'street', 'garage', 'parking_lot')),
  add column car_covered boolean not null default false;

alter table public.services add column needs_lift boolean not null default false;
update public.services set needs_lift = true where slug in ('transmission', 'timing-belt');
