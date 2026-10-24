-- Customer no-show (mechanic arrived, customer didn't respond) and off-platform payment reports.

alter type public.booking_status add value if not exists 'customer_no_show';

alter table public.bookings
  add column arrived_at timestamptz,
  add column arrived_location extensions.geography(point, 4326),
  add column arrived_distance_m int,
  add column customer_no_show_fee_cents int check (customer_no_show_fee_cents > 0);

-- Status machine, now with the mechanic's "customer didn't show" path:
-- en_route → customer_no_show requires a check-in at the address (arrived_at) and a
-- wait of at least 15 minutes after both the check-in and the booked time.
create or replace function public.enforce_booking_rules()
returns trigger language plpgsql set search_path = '' as $$
declare
  m public.mechanics%rowtype;
  s_tier public.skill_tier;
  allowed boolean;
  bookable boolean;
begin
  select * into m from public.mechanics where id = new.mechanic_id;
  select required_tier into s_tier from public.services where id = new.service_id;
  bookable := m.is_live and m.insurance_expires_on >= current_date;

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
    return new;
  end if;

  if new.customer_id <> old.customer_id or new.mechanic_id <> old.mechanic_id or new.service_id <> old.service_id then
    raise exception 'booking parties and service are immutable';
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
    if new.status in ('completed', 'customer_no_show') and new.payment_status <> 'captured' then
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
-- "Asked to pay outside WrenchNow?" reports
-- ─────────────────────────────────────────────────────────────
create table public.payment_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  reporter_id uuid not null references public.profiles (id),
  mechanic_id uuid references public.mechanics (id),
  method text check (char_length(method) <= 60),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
alter table public.payment_reports enable row level security;
create policy "payment_reports: reporter reads own" on public.payment_reports for select to authenticated using (reporter_id = auth.uid());
create policy "payment_reports: admin read" on public.payment_reports for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.payment_reports from authenticated, anon;

-- Distance (meters) from a point to the booking's address, or null if the address wasn't geocoded.
create or replace function public.distance_to_booking_m(p_booking_id uuid, p_lat double precision, p_lng double precision)
returns int language sql stable security definer set search_path = '' as $$
  select round(extensions.st_distance(b.location, extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography))::int
  from public.bookings b where b.id = p_booking_id and b.location is not null
$$;
revoke execute on function public.distance_to_booking_m(uuid, double precision, double precision) from public, anon, authenticated;
