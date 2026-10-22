-- Onboarding fee: covers the mechanic's background check. Nothing is paid up front;
-- WrenchNow keeps an extra installment (e.g. $10) from the mechanic's share of each
-- completed job, on top of the platform fee, until the total (e.g. $50) is collected.
-- Customers never pay it.

alter table public.mechanics
  add column onboarding_fee_total_cents int not null default 5000 check (onboarding_fee_total_cents >= 0),
  add column onboarding_fee_collected_cents int not null default 0 check (onboarding_fee_collected_cents >= 0),
  add constraint mechanics_onboarding_fee_le_total check (onboarding_fee_collected_cents <= onboarding_fee_total_cents);

alter table public.bookings add column onboarding_fee_cents int not null default 0 check (onboarding_fee_cents >= 0);

-- One installment per job (primary key = idempotency on retries).
create table public.onboarding_fee_charges (
  booking_id uuid primary key references public.bookings (id),
  mechanic_id uuid not null references public.mechanics (id),
  amount_cents int not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);
create index onboarding_fee_charges_mechanic_idx on public.onboarding_fee_charges (mechanic_id);
alter table public.onboarding_fee_charges enable row level security;
create policy "onboarding_fee_charges: mechanic reads own" on public.onboarding_fee_charges for select to authenticated using (mechanic_id = auth.uid());
create policy "onboarding_fee_charges: admin read" on public.onboarding_fee_charges for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.onboarding_fee_charges from authenticated, anon;

-- Reserve this job's installment before capture. Locks the mechanic row so two jobs
-- finishing together can't over-collect. Never takes more than the mechanic's share
-- (final amount minus platform fee). Re-running for the same job returns the same amount.
create or replace function public.claim_onboarding_fee(p_booking_id uuid, p_per_job_cents int, p_final_cents int, p_platform_fee_cents int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings%rowtype;
  m public.mechanics%rowtype;
  existing int;
  amount int;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then return 0; end if;
  select amount_cents into existing from public.onboarding_fee_charges where booking_id = p_booking_id;
  if existing is not null then return existing; end if;
  select * into m from public.mechanics where id = b.mechanic_id for update;
  amount := least(p_per_job_cents, m.onboarding_fee_total_cents - m.onboarding_fee_collected_cents, greatest(p_final_cents - p_platform_fee_cents, 0));
  if amount <= 0 then return 0; end if;
  insert into public.onboarding_fee_charges (booking_id, mechanic_id, amount_cents) values (p_booking_id, m.id, amount);
  update public.mechanics set onboarding_fee_collected_cents = onboarding_fee_collected_cents + amount where id = m.id;
  return amount;
end;
$$;
revoke execute on function public.claim_onboarding_fee(uuid, int, int, int) from public, anon, authenticated;

-- Give an installment back (capture failed, or the job was fully refunded).
create or replace function public.release_onboarding_fee(p_booking_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare r public.onboarding_fee_charges%rowtype;
begin
  delete from public.onboarding_fee_charges where booking_id = p_booking_id returning * into r;
  if r.booking_id is null then return 0; end if;
  update public.mechanics set onboarding_fee_collected_cents = greatest(onboarding_fee_collected_cents - r.amount_cents, 0) where id = r.mechanic_id;
  update public.bookings set onboarding_fee_cents = 0 where id = p_booking_id;
  return r.amount_cents;
end;
$$;
revoke execute on function public.release_onboarding_fee(uuid) from public, anon, authenticated;
