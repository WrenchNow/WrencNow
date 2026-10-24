-- Arrival codes (prove the mechanic showed up) and verified proof of insurance.

-- ─────────────────────────────────────────────────────────────
-- Proof of insurance
-- ─────────────────────────────────────────────────────────────
create type public.insurance_status as enum ('none', 'submitted', 'verified', 'rejected');

alter table public.mechanics
  add column insurance_status public.insurance_status not null default 'none',
  add column insurance_provider text check (char_length(insurance_provider) <= 120),
  add column insurance_policy_number text check (char_length(insurance_policy_number) <= 80),
  add column insurance_expires_on date,
  add column insurance_doc_path text,
  add column insurance_submitted_at timestamptz,
  add column insurance_reviewed_at timestamptz;

-- Going live now also requires verified insurance. (Expiry is checked at query time
-- below because a generated column can't depend on today's date.)
drop index if exists public.mechanics_live_idx;
alter table public.mechanics drop column is_live;
alter table public.mechanics add column is_live boolean generated always as (
  status = 'approved' and check_status = 'clear' and stripe_charges_enabled and stripe_payouts_enabled
  and insurance_status = 'verified'
) stored;
create index mechanics_live_idx on public.mechanics (is_live) where is_live;

-- One definition of "can take work right now": live and insurance not expired.
create or replace function public.mechanic_is_live(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_live and insurance_expires_on >= current_date from public.mechanics where id = mid), false)
$$;

-- Insurance fields are set by server code (upload) and admins (review) only.
-- (Column grants from the core migration don't include them, so nothing to revoke.)

-- Private bucket for insurance certificates: mechanics upload to their own folder; only admins (service role) read others.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mechanic-docs', 'mechanic-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "mechanic docs: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'mechanic-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mechanic docs: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'mechanic-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Public search and profiles hide mechanics whose insurance has lapsed.
create or replace function public.search_mechanics(
  lat double precision,
  lng double precision,
  service_slug text default null,
  max_results int default 200
)
returns table (
  id uuid, display_name text, photo_url text, city text, skill_tier public.skill_tier, hourly_rate_cents int,
  years_experience int, specialties text[], rating_avg numeric, review_count int, completed_jobs int,
  no_show_count int, featured boolean, online boolean, distance_miles double precision
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.display_name, m.photo_url, m.city, m.skill_tier, m.hourly_rate_cents, m.years_experience,
         m.specialties, m.rating_avg, m.review_count, m.completed_jobs, m.no_show_count,
         coalesce(m.featured_until > now(), false) as featured, m.online,
         extensions.st_distance(m.location, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) / 1609.344 as distance_miles
  from public.mechanics m
  where m.is_live
    and m.insurance_expires_on >= current_date
    and m.location is not null
    and extensions.st_dwithin(
          m.location,
          extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
          m.service_radius_miles * 1609.344)
    and (
      service_slug is null or exists (
        select 1 from public.mechanic_services ms join public.services s on s.id = ms.service_id
        where ms.mechanic_id = m.id and s.slug = service_slug
          and public.tier_rank(s.required_tier) <= public.tier_rank(m.skill_tier)
      )
    )
  limit least(greatest(max_results, 1), 500)
$$;

create or replace function public.get_public_mechanic(mechanic_id uuid)
returns table (
  id uuid, display_name text, photo_url text, bio text, city text, skill_tier public.skill_tier,
  hourly_rate_cents int, years_experience int, certifications text[], specialties text[], service_radius_miles int,
  rating_avg numeric, review_count int, completed_jobs int, no_show_count int, featured boolean, online boolean,
  check_clear boolean, member_since timestamptz
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.display_name, m.photo_url, m.bio, m.city, m.skill_tier, m.hourly_rate_cents, m.years_experience,
         m.certifications, m.specialties, m.service_radius_miles, m.rating_avg, m.review_count, m.completed_jobs,
         m.no_show_count, coalesce(m.featured_until > now(), false), m.online, m.check_status = 'clear', m.created_at
  from public.mechanics m
  where m.id = mechanic_id and m.is_live and m.insurance_expires_on >= current_date
$$;

-- ─────────────────────────────────────────────────────────────
-- Arrival codes
-- ─────────────────────────────────────────────────────────────
-- Created when a mechanic accepts. Only the CUSTOMER can read it; the mechanic must
-- get it from the customer in person to start the job. Verified by server code.
create table public.booking_codes (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4}$'),
  attempts int not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.booking_codes enable row level security;
create policy "booking_codes: customer reads own" on public.booking_codes for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));
create policy "booking_codes: admin read" on public.booking_codes for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.booking_codes from authenticated, anon;

-- ─────────────────────────────────────────────────────────────
-- Booking rules: insurance must be current to be booked / accept / head out;
-- starting a job requires the arrival code; nobody but an admin cancels once en route.
-- ─────────────────────────────────────────────────────────────
-- Set by server code when an admin makes the change (allows cancelling en route or starting without a code).
alter table public.bookings add column admin_override boolean not null default false;

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
      when 'en_route'    then new.status in ('in_progress', 'no_show') or (new.status = 'cancelled' and new.admin_override)
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
    if new.status = 'completed' and new.payment_status <> 'captured' then
      raise exception 'booking payment must be captured before completion' using errcode = 'check_violation';
    end if;
    case new.status
      when 'accepted' then new.accepted_at := now();
      when 'en_route' then new.en_route_at := now();
      when 'in_progress' then new.started_at := now();
      when 'completed' then new.completed_at := now();
      when 'cancelled' then new.cancelled_at := now();
      else null;
    end case;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Renewals: a verified mechanic can upload a new certificate without going offline;
-- the new expiry waits here until an admin reviews it.
alter table public.mechanics add column insurance_pending_expires_on date;
