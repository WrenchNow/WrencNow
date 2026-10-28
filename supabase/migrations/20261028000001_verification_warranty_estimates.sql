-- Overnight fix list (Oct 28):
--   * Background checks become optional. Verified mechanics pay the check fee up front and get it back
--     $10 per completed job (first five jobs). Unverified mechanics can go live, but customers must
--     acknowledge it before booking. A check that comes back flagged still blocks going live.
--   * Mechanic warranties say what they cover (labor / parts / both) as well as how long.
--   * Admins can refund a customer for an unhonored warranty and recover it from the mechanic's next payout.
--   * In-person estimate visits: each mechanic sets an estimate fee, offers them free, or doesn't offer them.

-- ─────────────────────────────────────────────────────────────
-- 1) Going live no longer requires a clear background check
-- ─────────────────────────────────────────────────────────────
drop index if exists public.mechanics_live_idx;
alter table public.mechanics drop column is_live;
alter table public.mechanics add column is_live boolean generated always as (
  status = 'approved' and stripe_charges_enabled and stripe_payouts_enabled
  and insurance_status = 'verified'
  and check_status not in ('consider', 'suspended')
) stored;
create index mechanics_live_idx on public.mechanics (is_live) where is_live;

-- The old model (fee taken from the first jobs' payouts) stops: nothing more is collected that way.
alter table public.mechanics alter column onboarding_fee_total_cents set default 0;
update public.mechanics set onboarding_fee_total_cents = onboarding_fee_collected_cents
  where onboarding_fee_collected_cents < onboarding_fee_total_cents;

-- ─────────────────────────────────────────────────────────────
-- 2) Background check fee paid up front, refunded per completed job
-- ─────────────────────────────────────────────────────────────
alter table public.mechanics
  add column check_fee_payment_intent_id text unique,
  add column check_fee_paid_cents int not null default 0 check (check_fee_paid_cents >= 0),
  add column check_fee_paid_at timestamptz,
  add column check_fee_refunded_cents int not null default 0 check (check_fee_refunded_cents >= 0),
  add constraint mechanics_check_fee_refund_le_paid check (check_fee_refunded_cents <= check_fee_paid_cents);

create table public.check_fee_refunds (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  mechanic_id uuid not null references public.mechanics (id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  stripe_refund_id text unique,
  created_at timestamptz not null default now()
);
create index check_fee_refunds_mechanic_idx on public.check_fee_refunds (mechanic_id);
alter table public.check_fee_refunds enable row level security;
create policy "check_fee_refunds: mechanic reads own" on public.check_fee_refunds for select to authenticated using (mechanic_id = auth.uid());
create policy "check_fee_refunds: admin read" on public.check_fee_refunds for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.check_fee_refunds from authenticated, anon;

-- Reserves this job's check-fee refund (server code then refunds it in Stripe). Idempotent per booking:
-- a repeat call returns the amount already reserved. Returns 0 when nothing is due.
create or replace function public.claim_check_fee_refund(p_booking_id uuid, p_per_job_cents int, p_max_jobs int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings%rowtype;
  m public.mechanics%rowtype;
  existing int;
  jobs int;
  amount int;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found or b.status <> 'completed' or b.payment_status not in ('captured', 'partially_refunded') then
    return 0;
  end if;
  select * into m from public.mechanics where id = b.mechanic_id for update;
  select amount_cents into existing from public.check_fee_refunds where booking_id = p_booking_id;
  if existing is not null then return existing; end if;
  if m.check_fee_paid_cents <= 0 or m.check_fee_payment_intent_id is null then return 0; end if;
  select count(*) into jobs from public.check_fee_refunds where mechanic_id = m.id;
  if jobs >= p_max_jobs then return 0; end if;
  amount := least(p_per_job_cents, m.check_fee_paid_cents - m.check_fee_refunded_cents);
  if amount <= 0 then return 0; end if;
  insert into public.check_fee_refunds (booking_id, mechanic_id, amount_cents) values (p_booking_id, m.id, amount);
  update public.mechanics set check_fee_refunded_cents = check_fee_refunded_cents + amount where id = m.id;
  return amount;
end;
$$;
revoke execute on function public.claim_check_fee_refund(uuid, int, int) from public, anon, authenticated;

-- Undo a reservation whose Stripe refund failed, so a later retry can claim it again.
create or replace function public.release_check_fee_refund(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.check_fee_refunds%rowtype;
begin
  delete from public.check_fee_refunds where booking_id = p_booking_id and stripe_refund_id is null returning * into r;
  if not found then return; end if;
  update public.mechanics set check_fee_refunded_cents = greatest(check_fee_refunded_cents - r.amount_cents, 0) where id = r.mechanic_id;
end;
$$;
revoke execute on function public.release_check_fee_refund(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3) Customers acknowledge booking a mechanic who isn't background checked
-- ─────────────────────────────────────────────────────────────
alter table public.bookings add column unverified_ack_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 4) Warranty coverage (the mechanic's own warranty, never WrenchNow's)
-- ─────────────────────────────────────────────────────────────
alter table public.mechanics add column warranty_covers text not null default 'labor'
  check (warranty_covers in ('labor', 'parts', 'both'));
grant update (warranty_covers) on public.mechanics to authenticated;
alter table public.bookings add column warranty_covers text check (warranty_covers in ('labor', 'parts', 'both'));
update public.bookings b set warranty_covers = m.warranty_covers
  from public.mechanics m where m.id = b.mechanic_id and b.warranty_covers is null and coalesce(b.warranty_days, 0) > 0;

-- ─────────────────────────────────────────────────────────────
-- 5) Deductions: money refunded to a customer on a mechanic's behalf, recovered from later payouts
-- ─────────────────────────────────────────────────────────────
create table public.mechanic_deductions (
  id uuid primary key default gen_random_uuid(),
  mechanic_id uuid not null references public.mechanics (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  issue_id uuid references public.job_issues (id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  amount_cents int not null check (amount_cents > 0),
  recovered_cents int not null default 0 check (recovered_cents >= 0),
  stripe_refund_id text unique,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint mechanic_deductions_recovered_le_amount check (recovered_cents <= amount_cents)
);
create index mechanic_deductions_open_idx on public.mechanic_deductions (mechanic_id, created_at) where recovered_cents < amount_cents;
alter table public.mechanic_deductions enable row level security;
create policy "mechanic_deductions: mechanic reads own" on public.mechanic_deductions for select to authenticated using (mechanic_id = auth.uid());
create policy "mechanic_deductions: admin read" on public.mechanic_deductions for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.mechanic_deductions from authenticated, anon;

-- Which later job each deduction was recovered from.
create table public.deduction_recoveries (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  deduction_id uuid not null references public.mechanic_deductions (id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  primary key (booking_id, deduction_id)
);
create index deduction_recoveries_deduction_idx on public.deduction_recoveries (deduction_id);
alter table public.deduction_recoveries enable row level security;
create policy "deduction_recoveries: mechanic reads own" on public.deduction_recoveries for select to authenticated
  using (exists (select 1 from public.mechanic_deductions d where d.id = deduction_id and d.mechanic_id = auth.uid()));
create policy "deduction_recoveries: admin read" on public.deduction_recoveries for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.deduction_recoveries from authenticated, anon;

alter table public.bookings add column deduction_cents int not null default 0 check (deduction_cents >= 0);

-- Takes up to p_available_cents of outstanding deductions (oldest first) out of this job's payout.
-- Idempotent per booking: a repeat call returns what was already taken.
create or replace function public.claim_deductions(p_booking_id uuid, p_available_cents int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings%rowtype;
  d record;
  taken int := 0;
  part int;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then return 0; end if;
  perform 1 from public.mechanics where id = b.mechanic_id for update;
  if exists (select 1 from public.deduction_recoveries where booking_id = p_booking_id) then
    return (select coalesce(sum(amount_cents), 0)::int from public.deduction_recoveries where booking_id = p_booking_id);
  end if;
  for d in
    select id, amount_cents - recovered_cents as open from public.mechanic_deductions
    where mechanic_id = b.mechanic_id and recovered_cents < amount_cents and booking_id is distinct from p_booking_id
    order by created_at
  loop
    exit when taken >= p_available_cents;
    part := least(d.open, p_available_cents - taken);
    insert into public.deduction_recoveries (booking_id, deduction_id, amount_cents) values (p_booking_id, d.id, part);
    update public.mechanic_deductions set recovered_cents = recovered_cents + part where id = d.id;
    taken := taken + part;
  end loop;
  return taken;
end;
$$;
revoke execute on function public.claim_deductions(uuid, int) from public, anon, authenticated;

-- Give back what a job took (its capture failed, or it was fully refunded).
create or replace function public.release_deductions(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in delete from public.deduction_recoveries where booking_id = p_booking_id returning deduction_id, amount_cents loop
    update public.mechanic_deductions set recovered_cents = greatest(recovered_cents - r.amount_cents, 0) where id = r.deduction_id;
  end loop;
  update public.bookings set deduction_cents = 0 where id = p_booking_id;
end;
$$;
revoke execute on function public.release_deductions(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6) In-person estimate visits
-- ─────────────────────────────────────────────────────────────
-- null = doesn't offer estimate visits; 0 = free (card hold covers only the customer no-show fee).
alter table public.mechanics add column estimate_fee_cents int check (estimate_fee_cents between 0 and 50000);
grant update (estimate_fee_cents) on public.mechanics to authenticated;

alter table public.services add column is_estimate_visit boolean not null default false;
insert into public.services (slug, name, description, required_tier, est_minutes_min, est_minutes_max, icon, sort, is_estimate_visit)
values ('estimate-visit', 'In-person estimate', 'The mechanic comes out, looks at the car, and gives you a written estimate for the repair. No repair work on this visit.', 'basic', 30, 60, '📋', 0, true)
on conflict (slug) do nothing;

alter table public.bookings
  add column is_estimate_visit boolean not null default false,
  add column estimate_fee_cents int check (estimate_fee_cents >= 0),
  add column estimate_notes text check (char_length(estimate_notes) <= 4000);

-- ─────────────────────────────────────────────────────────────
-- 7) Booking rules: unverified acknowledgement + free estimate visits
-- ─────────────────────────────────────────────────────────────
create or replace function public.enforce_booking_rules()
returns trigger language plpgsql set search_path = '' as $$
declare
  m public.mechanics%rowtype;
  s_tier public.skill_tier;
  allowed boolean;
  bookable boolean;
  free_estimate boolean;
begin
  select * into m from public.mechanics where id = new.mechanic_id;
  select required_tier into s_tier from public.services where id = new.service_id;
  bookable := m.is_live and m.insurance_expires_on >= current_date;
  free_estimate := new.is_estimate_visit and coalesce(new.estimate_fee_cents, 0) = 0;

  if tg_op = 'INSERT' then
    if new.status <> 'requested' then
      raise exception 'new bookings must start as requested';
    end if;
    if not bookable then
      raise exception 'mechanic is not live' using errcode = 'check_violation';
    end if;
    if public.tier_rank(s_tier) > public.tier_rank(m.skill_tier) then
      raise exception 'mechanic tier % cannot take a % job', m.skill_tier, s_tier using errcode = 'check_violation';
    end if;
    if new.customer_id = new.mechanic_id then
      raise exception 'cannot book yourself';
    end if;
    -- Customers must knowingly book a mechanic who hasn't passed a background check.
    if m.check_status <> 'clear' and new.unverified_ack_at is null then
      raise exception 'customer must acknowledge the mechanic is not background checked' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.customer_id <> old.customer_id or new.mechanic_id <> old.mechanic_id or new.service_id <> old.service_id then
    raise exception 'booking parties and service are immutable';
  end if;
  if new.is_estimate_visit is distinct from old.is_estimate_visit or new.estimate_fee_cents is distinct from old.estimate_fee_cents then
    raise exception 'estimate visit terms are immutable';
  end if;

  if new.status is distinct from old.status then
    allowed := case old.status
      when 'requested'   then new.status in ('accepted', 'cancelled')
      when 'accepted'    then new.status in ('en_route', 'cancelled', 'no_show')
      when 'en_route'    then new.status in ('in_progress', 'no_show', 'customer_no_show') or (new.status = 'cancelled' and new.admin_override)
      when 'in_progress' then new.status in ('completed')
      else false
    end;
    if not allowed then
      raise exception 'invalid booking transition % -> %', old.status, new.status using errcode = 'check_violation';
    end if;
    if new.status in ('accepted', 'en_route') and not bookable then
      raise exception 'mechanic is not live' using errcode = 'check_violation';
    end if;
    if new.status = 'accepted' and public.tier_rank(s_tier) > public.tier_rank(m.skill_tier) then
      raise exception 'mechanic tier % cannot accept a % job', m.skill_tier, s_tier using errcode = 'check_violation';
    end if;
    if new.status = 'accepted' and new.payment_status <> 'authorized' then
      raise exception 'booking payment is not authorized' using errcode = 'check_violation';
    end if;
    if new.status = 'in_progress' and not exists (
      select 1 from public.booking_codes c where c.booking_id = new.id and c.verified_at is not null
    ) and not new.admin_override then
      raise exception 'arrival code not verified' using errcode = 'check_violation';
    end if;
    -- A mechanic who checked in at the address can't be reported as a no-show.
    if new.status = 'no_show' and old.arrived_at is not null and not new.admin_override then
      raise exception 'mechanic checked in at the address' using errcode = 'check_violation';
    end if;
    if new.status = 'customer_no_show' and not new.admin_override then
      if old.arrived_at is null then
        raise exception 'mechanic has not checked in at the address' using errcode = 'check_violation';
      end if;
      if now() < greatest(old.arrived_at, old.scheduled_start) + interval '15 minutes' then
        raise exception 'customer no-show wait has not passed' using errcode = 'check_violation';
      end if;
    end if;
    -- A free estimate visit completes with its no-show hold released; everything else is captured.
    if new.status = 'completed' and free_estimate then
      if new.payment_status <> 'canceled' then
        raise exception 'release the hold to complete a free estimate visit' using errcode = 'check_violation';
      end if;
      if coalesce(char_length(trim(new.estimate_notes)), 0) = 0 then
        raise exception 'write the estimate before completing the visit' using errcode = 'check_violation';
      end if;
    elsif new.status in ('completed', 'customer_no_show') and new.payment_status <> 'captured' then
      raise exception 'booking payment must be captured' using errcode = 'check_violation';
    end if;
    case new.status
      when 'accepted' then new.accepted_at := now();
      when 'en_route' then new.en_route_at := now();
      when 'in_progress' then new.started_at := now();
      when 'completed' then new.completed_at := now();
      when 'cancelled' then new.cancelled_at := now();
      when 'customer_no_show' then new.completed_at := now();
      else null;
    end case;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 8) Public profile extras (badge, warranty, estimate fee) for live mechanics
-- ─────────────────────────────────────────────────────────────
create or replace function public.mechanic_public_extras(ids uuid[])
returns table (id uuid, background_checked boolean, warranty_days int, warranty_covers text, estimate_fee_cents int)
language sql stable security definer set search_path = '' as $$
  select m.id, m.check_status = 'clear', m.warranty_days, m.warranty_covers, m.estimate_fee_cents
  from public.mechanics m
  where m.id = any (ids) and m.is_live
$$;
revoke execute on function public.mechanic_public_extras(uuid[]) from public;
grant execute on function public.mechanic_public_extras(uuid[]) to anon, authenticated;
