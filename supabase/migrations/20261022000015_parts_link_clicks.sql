-- Mechanics' "price check" clicks to parts stores (AutoZone, O'Reilly, Advance, NAPA).
-- Used to reconcile affiliate/referral reports and to see which stores mechanics prefer.
create table public.parts_link_clicks (
  id bigint generated always as identity primary key,
  mechanic_id uuid not null references public.mechanics (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  retailer text not null check (retailer in ('autozone', 'oreilly', 'advance', 'napa')),
  query text not null check (char_length(query) <= 200),
  created_at timestamptz not null default now()
);
create index parts_link_clicks_created_idx on public.parts_link_clicks (created_at desc);
alter table public.parts_link_clicks enable row level security;
create policy "parts_link_clicks: mechanic read own" on public.parts_link_clicks for select to authenticated using (mechanic_id = auth.uid());
create policy "parts_link_clicks: admin read" on public.parts_link_clicks for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.parts_link_clicks from authenticated, anon;
