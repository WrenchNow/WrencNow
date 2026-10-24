-- Parts: itemized quotes the customer approves, receipts the mechanic uploads, and
-- typical-cost learning from real receipts.
--
-- Money model:
--   * The estimate shown at booking = labor (rate × max time) + a parts estimate
--     (mechanic's typical parts price for the service, or what similar jobs actually cost).
--   * Before buying, the mechanic sends an itemized parts quote. The customer approves it
--     in the app (timestamped consent). If it pushes the total past the card hold, the
--     customer authorizes the difference (a second, "top-up" PaymentIntent).
--   * Parts are billed at the RECEIPT amount (never above what the customer approved),
--     plus a disclosed handling percentage that goes to the mechanic.

create type public.part_status as enum ('quoted', 'approved', 'declined', 'purchased', 'removed');

-- Labor/parts split of the estimate, and the quote/approval trail.
alter table public.bookings
  add column labor_max_cents int,
  add column parts_estimate_cents int not null default 0 check (parts_estimate_cents >= 0),
  add column parts_quote_sent_at timestamptz,
  add column parts_approved_at timestamptz,
  add column parts_approved_cents int check (parts_approved_cents >= 0),
  add column parts_handling_cents int check (parts_handling_cents >= 0),
  add column hold_cents int check (hold_cents >= 0), -- amount authorized by the original card hold
  add column topup_payment_intent_id text unique,
  add column topup_authorized_cents int not null default 0 check (topup_authorized_cents >= 0),
  add column vehicle_make text,
  add column vehicle_model text;

update public.bookings set labor_max_cents = estimated_max_cents, hold_cents = estimated_max_cents where labor_max_cents is null;

-- (final_amount_cents <= estimated_max_cents still applies; approving a parts quote raises
-- estimated_max_cents, backed by the original hold plus any top-up authorization.)

-- Mechanic's typical parts price per service (used until real receipts exist).
alter table public.mechanic_services add column typical_parts_cents int check (typical_parts_cents between 0 and 500000);
grant update (typical_parts_cents) on public.mechanic_services to authenticated;
create policy "mechanic_services: owner update" on public.mechanic_services for update to authenticated
  using (mechanic_id = auth.uid()) with check (mechanic_id = auth.uid());

create table public.booking_parts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  mechanic_id uuid not null references public.mechanics (id),
  name text not null check (char_length(name) between 1 and 120),
  part_number text check (char_length(part_number) <= 60),
  quantity int not null default 1 check (quantity between 1 and 50),
  quoted_unit_cents int not null check (quoted_unit_cents between 0 and 500000),
  status public.part_status not null default 'quoted',
  receipt_cents int check (receipt_cents between 0 and 2500000),
  receipt_path text,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index booking_parts_booking_idx on public.booking_parts (booking_id);
alter table public.booking_parts enable row level security;
create policy "booking_parts: parties read" on public.booking_parts for select to authenticated using (
  exists (select 1 from public.bookings b where b.id = booking_id and (b.customer_id = auth.uid() or b.mechanic_id = auth.uid()))
);
create policy "booking_parts: admin read" on public.booking_parts for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.booking_parts from authenticated, anon;

-- Private receipts: mechanics upload to <their id>/<booking id>/…; customers see them via signed links from the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('part-receipts', 'part-receipts', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;
create policy "part receipts: mechanic write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'part-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "part receipts: mechanic read own" on storage.objects for select to authenticated
  using (bucket_id = 'part-receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Typical parts cost learned from real receipts on completed, paid jobs.
-- Uses the make/model match when there are at least 5 jobs, else the service overall, else null.
create or replace function public.typical_parts_cost(p_service_id int, p_make text, p_model text)
returns table (cents int, sample int, basis text)
language sql stable security definer set search_path = '' as $$
  with per_job as (
    select b.id, b.vehicle_make, b.vehicle_model, sum(p.receipt_cents)::int as parts
    from public.bookings b
    join public.booking_parts p on p.booking_id = b.id and p.status = 'purchased' and p.receipt_cents is not null
    where b.service_id = p_service_id and b.status = 'completed' and b.payment_status = 'captured'
    group by b.id
  ),
  model as (
    select percentile_cont(0.5) within group (order by parts)::int as cents, count(*)::int as sample
    from per_job where lower(vehicle_make) = lower(p_make) and lower(vehicle_model) = lower(p_model)
  ),
  service as (
    select percentile_cont(0.5) within group (order by parts)::int as cents, count(*)::int as sample from per_job
  )
  select cents, sample, 'model' from model where sample >= 5
  union all
  select cents, sample, 'service' from service where sample >= 5 and not exists (select 1 from model where sample >= 5)
$$;
grant execute on function public.typical_parts_cost(int, text, text) to anon, authenticated;
