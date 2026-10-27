-- Features carried over from the site-v12 prototype.

-- More catalog services (backing the /services pages).
insert into public.services (slug, name, description, required_tier, est_minutes_min, est_minutes_max, icon, sort) values
  ('pre-purchase-inspection', 'Pre-purchase inspection', 'Inspect a used car at the seller before you buy.', 'certified', 60, 90, '🔎', 135),
  ('cooling-system', 'Cooling system repair', 'Hoses, thermostat, radiator, and water pump repairs.', 'certified', 60, 240, '🌡', 145),
  ('serpentine-belt', 'Serpentine belt', 'Replace a worn or squealing drive belt and tensioner.', 'certified', 30, 90, '➰', 147)
on conflict (slug) do nothing;

-- ── Reviews: one per customer per mechanic; only real, paid jobs count ──────────
-- A repeat customer updates their review instead of stacking another.
-- Ratings and job counts ignore refunded or charged-back jobs.
delete from public.reviews r using public.reviews r2
  where r.customer_id = r2.customer_id and r.mechanic_id = r2.mechanic_id and r.created_at < r2.created_at;
alter table public.reviews add constraint reviews_one_per_customer_mechanic unique (customer_id, mechanic_id);
alter table public.reviews add column updated_at timestamptz not null default now();
grant update (rating, body, booking_id, updated_at) on public.reviews to authenticated;
create policy "reviews: customer updates own" on public.reviews for update to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Re-validate on update too (the new booking must be the customer's own completed job with this mechanic).
drop trigger if exists reviews_rules on public.reviews;
create trigger reviews_rules before insert or update on public.reviews
  for each row execute function public.enforce_review_rules();

create or replace function public.refresh_mechanic_stats(mid uuid)
returns void language sql security definer set search_path = '' as $$
  update public.mechanics m set
    rating_avg = (
      select round(avg(r.rating)::numeric, 2) from public.reviews r
      join public.bookings b on b.id = r.booking_id
      where r.mechanic_id = mid and b.payment_status = 'captured'
    ),
    review_count = (
      select count(*) from public.reviews r
      join public.bookings b on b.id = r.booking_id
      where r.mechanic_id = mid and b.payment_status = 'captured'
    ),
    completed_jobs = (select count(*) from public.bookings where mechanic_id = mid and status = 'completed' and payment_status = 'captured'),
    no_show_count = (select count(*) from public.no_shows where mechanic_id = mid)
  where m.id = mid
$$;

-- Refunds/chargebacks change what counts, so refresh stats when payment status changes.
drop trigger if exists bookings_stats on public.bookings;
create trigger bookings_stats after update of status, payment_status on public.bookings
  for each row when (new.status is distinct from old.status or new.payment_status is distinct from old.payment_status)
  execute function public.trg_refresh_mechanic_stats();

-- ── Colorado Motor Vehicle Repair Act: estimate consent, old parts, itemized receipts, warranty ──
alter table public.bookings
  add column estimate_approved_at timestamptz,
  add column return_old_parts boolean not null default false,
  add column labor_cents int check (labor_cents >= 0),
  add column parts_cents int check (parts_cents >= 0);

alter table public.mechanics
  add column warranty_days int not null default 0 check (warranty_days in (0, 30, 90, 180, 365));
grant update (warranty_days) on public.mechanics to authenticated;

-- Warranty shows on public cards and profiles.
create or replace function public.mechanic_warranty_days(mid uuid)
returns int language sql stable security definer set search_path = '' as $$
  select warranty_days from public.mechanics where id = mid and is_live
$$;
grant execute on function public.mechanic_warranty_days(uuid) to anon, authenticated;

-- ── Requests nobody nearby can take yet (match by hand) ──────────────────────────
create table public.open_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles (id),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 32),
  location_text text not null check (char_length(location_text) <= 200),
  service_slug text,
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'matched', 'closed')),
  matched_mechanic_id uuid references public.mechanics (id),
  created_at timestamptz not null default now()
);
alter table public.open_requests enable row level security;
create policy "open_requests: requester reads own" on public.open_requests for select to authenticated using (customer_id = auth.uid());
create policy "open_requests: admin read" on public.open_requests for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.open_requests from authenticated, anon;

-- ── Notifications log (email/SMS), for audit and to avoid duplicates ─────────────
create table public.notifications (
  id bigint generated always as identity primary key,
  key text not null unique,            -- e.g. 'booking:<id>:arrived:customer'
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  template text not null,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications: admin read" on public.notifications for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.notifications from authenticated, anon;

-- Card processing pass-through (Stripe's card + payout costs) is taken from the mechanic's share, like the platform fee.
alter table public.bookings add column processing_fee_cents int not null default 0 check (processing_fee_cents >= 0);
