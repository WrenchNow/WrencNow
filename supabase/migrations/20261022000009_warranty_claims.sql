-- WrenchNow guarantee: warranty claims on completed jobs.
-- The platform minimum warranty (MIN_WARRANTY_DAYS) is applied in server code as
-- max(mechanic's warranty, minimum), so it holds whatever a mechanic picks.

create table public.warranty_claims (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  customer_id uuid not null references public.profiles (id),
  mechanic_id uuid not null references public.mechanics (id),
  description text not null check (char_length(description) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'mechanic_contacted', 'resolved', 'denied')),
  resolution text check (char_length(resolution) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index warranty_claims_booking_idx on public.warranty_claims (booking_id);
-- One open claim per booking at a time.
create unique index warranty_claims_one_open on public.warranty_claims (booking_id) where status in ('open', 'mechanic_contacted');

alter table public.warranty_claims enable row level security;
create policy "warranty_claims: parties read" on public.warranty_claims for select to authenticated
  using (customer_id = auth.uid() or mechanic_id = auth.uid());
create policy "warranty_claims: admin read" on public.warranty_claims for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.warranty_claims from authenticated, anon;
