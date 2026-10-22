-- WrenchNow core schema
-- Every table has RLS enabled with explicit policies. Writes that change money,
-- booking status, vetting state, or skill tier happen only through server code
-- (service role) and are additionally guarded by triggers below.

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
create type public.user_role as enum ('customer', 'mechanic', 'admin');
create type public.skill_tier as enum ('basic', 'certified', 'master');
create type public.mechanic_status as enum ('pending', 'approved', 'paused', 'rejected', 'suspended');
create type public.check_status as enum ('not_started', 'invited', 'pending', 'clear', 'consider', 'suspended', 'canceled');
create type public.booking_status as enum ('requested', 'accepted', 'en_route', 'in_progress', 'completed', 'cancelled', 'no_show');
create type public.payment_status as enum ('unpaid', 'authorized', 'captured', 'canceled', 'refunded', 'partially_refunded', 'disputed', 'failed');
create type public.urgency as enum ('flexible', 'soon', 'today', 'stranded');
create type public.ledger_type as enum ('charge', 'platform_fee', 'refund', 'dispute', 'subscription');

-- Numeric rank for tiers so "required tier <= mechanic tier" is a simple comparison.
create or replace function public.tier_rank(t public.skill_tier)
returns int language sql immutable as $$
  select case t when 'basic' then 1 when 'certified' then 2 when 'master' then 3 end
$$;

-- ─────────────────────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role,               -- null until the user picks customer/mechanic
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- New auth user → profile. Role may come from signup metadata, but never 'admin'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when requested in ('customer', 'mechanic') then requested::public.user_role else null end,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  if requested = 'mechanic' then
    insert into public.mechanics (id) values (new.id);
  end if;
  return new;
end;
$$;

-- Lets a user who signed up without a role (e.g. Google) choose one, exactly once.
create or replace function public.choose_role(r public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if r not in ('customer', 'mechanic') then raise exception 'invalid role'; end if;
  update public.profiles set role = r, updated_at = now() where id = auth.uid() and role is null;
  if not found then raise exception 'role already chosen'; end if;
  if r = 'mechanic' then
    insert into public.mechanics (id) values (auth.uid()) on conflict do nothing;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Mechanics
-- ─────────────────────────────────────────────────────────────
create table public.mechanics (
  id uuid primary key references public.profiles (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  bio text check (char_length(bio) <= 2000),
  photo_url text,
  years_experience int check (years_experience between 0 and 60),
  certifications text[] not null default '{}',
  specialties text[] not null default '{}',
  hourly_rate_cents int check (hourly_rate_cents between 2000 and 50000),
  service_radius_miles int not null default 15 check (service_radius_miles between 1 and 100),
  location extensions.geography(point, 4326),
  city text check (char_length(city) <= 80),
  has_tools boolean not null default false,
  has_transport boolean not null default false,
  agreed_terms_at timestamptz,
  onboarding_submitted_at timestamptz,

  -- Set only by admins / server code
  skill_tier public.skill_tier not null default 'basic',
  status public.mechanic_status not null default 'pending',
  check_status public.check_status not null default 'not_started',
  checkr_candidate_id text unique,
  checkr_invitation_id text,
  checkr_report_id text,
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  featured_until timestamptz,

  -- Availability toggle (mechanic controlled)
  online boolean not null default false,

  -- Derived stats, maintained by triggers. Start empty — never seeded with fake numbers.
  rating_avg numeric(3, 2),
  review_count int not null default 0,
  completed_jobs int not null default 0,
  no_show_count int not null default 0,

  -- Business rule: can't go live until vetted, approved, and able to get paid.
  is_live boolean generated always as (
    status = 'approved' and check_status = 'clear' and stripe_charges_enabled and stripe_payouts_enabled
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mechanics_location_idx on public.mechanics using gist (location);
create index mechanics_live_idx on public.mechanics (is_live) where is_live;

-- ─────────────────────────────────────────────────────────────
-- Services catalog + which services a mechanic offers
-- ─────────────────────────────────────────────────────────────
create table public.services (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  required_tier public.skill_tier not null,
  est_minutes_min int not null check (est_minutes_min > 0),
  est_minutes_max int not null check (est_minutes_max >= est_minutes_min),
  icon text not null default '🔧',
  active boolean not null default true,
  sort int not null default 100
);

create table public.mechanic_services (
  mechanic_id uuid not null references public.mechanics (id) on delete cascade,
  service_id int not null references public.services (id) on delete cascade,
  primary key (mechanic_id, service_id)
);

-- A mechanic can only list services at or below their tier.
create or replace function public.enforce_mechanic_service_tier()
returns trigger language plpgsql set search_path = '' as $$
declare
  m_tier public.skill_tier;
  s_tier public.skill_tier;
begin
  select skill_tier into m_tier from public.mechanics where id = new.mechanic_id;
  select required_tier into s_tier from public.services where id = new.service_id;
  if public.tier_rank(s_tier) > public.tier_rank(m_tier) then
    raise exception 'skill tier % cannot offer a % service', m_tier, s_tier using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger mechanic_services_tier before insert or update on public.mechanic_services
  for each row execute function public.enforce_mechanic_service_tier();

-- If an admin lowers a mechanic's tier, drop services they no longer qualify for.
create or replace function public.prune_services_on_tier_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.skill_tier is distinct from old.skill_tier then
    delete from public.mechanic_services ms
      using public.services s
      where ms.service_id = s.id and ms.mechanic_id = new.id
        and public.tier_rank(s.required_tier) > public.tier_rank(new.skill_tier);
  end if;
  return new;
end;
$$;
create trigger mechanics_prune_services after update of skill_tier on public.mechanics
  for each row execute function public.prune_services_on_tier_change();

-- ─────────────────────────────────────────────────────────────
-- Vehicles (customer garage)
-- ─────────────────────────────────────────────────────────────
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  year int not null check (year between 1950 and 2100),
  make text not null check (char_length(make) between 1 and 40),
  model text not null check (char_length(model) between 1 and 60),
  trim text check (char_length(trim) <= 60),
  nickname text check (char_length(nickname) <= 40),
  created_at timestamptz not null default now()
);
create index vehicles_owner_idx on public.vehicles (owner_id);

-- ─────────────────────────────────────────────────────────────
-- Bookings
-- ─────────────────────────────────────────────────────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  mechanic_id uuid not null references public.mechanics (id),
  service_id int not null references public.services (id),
  vehicle_id uuid references public.vehicles (id) on delete set null,
  vehicle_desc text not null,
  address text not null check (char_length(address) <= 300),
  location extensions.geography(point, 4326),
  problem_description text check (char_length(problem_description) <= 2000),
  urgency public.urgency not null default 'flexible',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status public.booking_status not null default 'requested',

  hourly_rate_cents int not null,
  estimated_max_cents int not null check (estimated_max_cents > 0),
  final_amount_cents int check (final_amount_cents > 0),
  platform_fee_cents int,
  currency text not null default 'usd',
  stripe_payment_intent_id text unique,
  payment_status public.payment_status not null default 'unpaid',
  refunded_cents int not null default 0,

  cancelled_by uuid references public.profiles (id),
  cancel_reason text,
  accepted_at timestamptz,
  en_route_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (scheduled_end > scheduled_start),
  check (final_amount_cents is null or final_amount_cents <= estimated_max_cents),
  -- A mechanic can't be double-booked for overlapping active jobs.
  constraint bookings_no_overlap exclude using gist (
    mechanic_id with =,
    tstzrange(scheduled_start, scheduled_end) with &&
  ) where (status in ('requested', 'accepted', 'en_route', 'in_progress'))
);
create index bookings_customer_idx on public.bookings (customer_id, scheduled_start desc);
create index bookings_mechanic_idx on public.bookings (mechanic_id, scheduled_start desc);

-- Status machine + skill-tier rule, enforced for every writer (including service role).
create or replace function public.enforce_booking_rules()
returns trigger language plpgsql set search_path = '' as $$
declare
  m public.mechanics%rowtype;
  s_tier public.skill_tier;
  allowed boolean;
begin
  select * into m from public.mechanics where id = new.mechanic_id;
  select required_tier into s_tier from public.services where id = new.service_id;

  if tg_op = 'INSERT' then
    if new.status <> 'requested' then
      raise exception 'new bookings must start as requested';
    end if;
    if not m.is_live then
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

  -- UPDATE
  if new.customer_id <> old.customer_id or new.mechanic_id <> old.mechanic_id or new.service_id <> old.service_id then
    raise exception 'booking parties and service are immutable';
  end if;

  if new.status is distinct from old.status then
    allowed := case old.status
      when 'requested'   then new.status in ('accepted', 'cancelled')
      when 'accepted'    then new.status in ('en_route', 'cancelled', 'no_show')
      when 'en_route'    then new.status in ('in_progress', 'cancelled', 'no_show')
      when 'in_progress' then new.status in ('completed')
      else false
    end;
    if not allowed then
      raise exception 'invalid booking transition % -> %', old.status, new.status using errcode = 'check_violation';
    end if;
    if new.status = 'accepted' and public.tier_rank(s_tier) > public.tier_rank(m.skill_tier) then
      raise exception 'mechanic tier % cannot accept a % job', m.skill_tier, s_tier using errcode = 'check_violation';
    end if;
    -- All payments go through the platform: no job starts without a card hold.
    if new.status = 'accepted' and new.payment_status <> 'authorized' then
      raise exception 'booking payment is not authorized' using errcode = 'check_violation';
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
create trigger bookings_rules before insert or update on public.bookings
  for each row execute function public.enforce_booking_rules();

-- ─────────────────────────────────────────────────────────────
-- Reviews & no-shows
-- ─────────────────────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  customer_id uuid not null references public.profiles (id),
  mechanic_id uuid not null references public.mechanics (id),
  reviewer_name text not null,
  rating int not null check (rating between 1 and 5),
  body text check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index reviews_mechanic_idx on public.reviews (mechanic_id, created_at desc);

create table public.no_shows (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  mechanic_id uuid not null references public.mechanics (id),
  reported_by uuid not null references public.profiles (id),
  reason text check (char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);

-- Keep mechanic stats in sync.
create or replace function public.refresh_mechanic_stats(mid uuid)
returns void language sql security definer set search_path = '' as $$
  update public.mechanics m set
    rating_avg = (select round(avg(rating)::numeric, 2) from public.reviews where mechanic_id = mid),
    review_count = (select count(*) from public.reviews where mechanic_id = mid),
    completed_jobs = (select count(*) from public.bookings where mechanic_id = mid and status = 'completed'),
    no_show_count = (select count(*) from public.no_shows where mechanic_id = mid)
  where m.id = mid
$$;

create or replace function public.trg_refresh_mechanic_stats()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_mechanic_stats(old.mechanic_id);
  else
    perform public.refresh_mechanic_stats(new.mechanic_id);
  end if;
  return null;
end;
$$;
create trigger reviews_stats after insert or update or delete on public.reviews
  for each row execute function public.trg_refresh_mechanic_stats();
create trigger no_shows_stats after insert or delete on public.no_shows
  for each row execute function public.trg_refresh_mechanic_stats();
create trigger bookings_stats after update of status on public.bookings
  for each row when (new.status = 'completed' and old.status <> 'completed')
  execute function public.trg_refresh_mechanic_stats();

-- Only a customer with a completed booking may review it, once.
create or replace function public.enforce_review_rules()
returns trigger language plpgsql set search_path = '' as $$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = new.booking_id;
  if b.status <> 'completed' then raise exception 'can only review completed bookings'; end if;
  if b.customer_id <> new.customer_id or b.mechanic_id <> new.mechanic_id then
    raise exception 'review does not match booking';
  end if;
  return new;
end;
$$;
create trigger reviews_rules before insert on public.reviews
  for each row execute function public.enforce_review_rules();

-- ─────────────────────────────────────────────────────────────
-- Money ledger, webhook idempotency, audit log
-- ─────────────────────────────────────────────────────────────
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id),
  mechanic_id uuid references public.mechanics (id),
  type public.ledger_type not null,
  amount_cents int not null,
  currency text not null default 'usd',
  stripe_object_id text,
  created_at timestamptz not null default now(),
  unique (type, stripe_object_id)
);
create index ledger_mechanic_idx on public.ledger_entries (mechanic_id, created_at desc);

create table public.webhook_events (
  provider text not null check (provider in ('stripe', 'checkr')),
  event_id text not null,
  type text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id),
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Triggers that need the tables above
-- ─────────────────────────────────────────────────────────────
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger mechanics_touch before update on public.mechanics for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.mechanics enable row level security;
alter table public.services enable row level security;
alter table public.mechanic_services enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.no_shows enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "profiles: read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: admin read all" on public.profiles for select to authenticated using (public.is_admin());
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Column-level: users may edit their name/phone but never their role.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- mechanics: private row (Stripe/Checkr ids) is visible to the owner and admins only.
-- The public sees mechanics through search_mechanics() / get_public_mechanic().
create policy "mechanics: read own" on public.mechanics for select to authenticated using (id = auth.uid());
create policy "mechanics: admin read all" on public.mechanics for select to authenticated using (public.is_admin());
create policy "mechanics: update own profile" on public.mechanics for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.mechanics from authenticated, anon;
grant update (display_name, bio, photo_url, years_experience, certifications, specialties, hourly_rate_cents,
              service_radius_miles, location, city, has_tools, has_transport, online)
  on public.mechanics to authenticated;

-- services: public catalog
create policy "services: public read" on public.services for select to anon, authenticated using (active);
revoke insert, update, delete on public.services from authenticated, anon;

-- mechanic_services: public read for live mechanics; owners manage their own (tier trigger applies)
create policy "mechanic_services: public read" on public.mechanic_services for select to anon, authenticated using (true);
create policy "mechanic_services: owner insert" on public.mechanic_services for insert to authenticated with check (mechanic_id = auth.uid());
create policy "mechanic_services: owner delete" on public.mechanic_services for delete to authenticated using (mechanic_id = auth.uid());

-- vehicles: owner only
create policy "vehicles: owner read" on public.vehicles for select to authenticated using (owner_id = auth.uid());
create policy "vehicles: owner insert" on public.vehicles for insert to authenticated with check (owner_id = auth.uid());
create policy "vehicles: owner update" on public.vehicles for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "vehicles: owner delete" on public.vehicles for delete to authenticated using (owner_id = auth.uid());

-- bookings: read by the two parties and admins; all writes go through server code.
create policy "bookings: customer read" on public.bookings for select to authenticated using (customer_id = auth.uid());
create policy "bookings: mechanic read" on public.bookings for select to authenticated using (mechanic_id = auth.uid());
create policy "bookings: admin read" on public.bookings for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.bookings from authenticated, anon;

-- reviews: public read; customer inserts for their own completed booking (trigger checks)
create policy "reviews: public read" on public.reviews for select to anon, authenticated using (true);
create policy "reviews: customer insert" on public.reviews for insert to authenticated with check (customer_id = auth.uid());
revoke update, delete on public.reviews from authenticated, anon;

-- no_shows: public read (shown on profiles); written by server code
create policy "no_shows: public read" on public.no_shows for select to anon, authenticated using (true);
revoke insert, update, delete on public.no_shows from authenticated, anon;

-- ledger: mechanic reads own; admin reads all
create policy "ledger: mechanic read own" on public.ledger_entries for select to authenticated using (mechanic_id = auth.uid());
create policy "ledger: admin read" on public.ledger_entries for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.ledger_entries from authenticated, anon;

-- webhook events & audit log: admin read only
create policy "webhook_events: admin read" on public.webhook_events for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.webhook_events from authenticated, anon;
create policy "audit_log: admin read" on public.audit_log for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.audit_log from authenticated, anon;

-- ─────────────────────────────────────────────────────────────
-- Public read functions (safe columns only, live mechanics only)
-- ─────────────────────────────────────────────────────────────
create or replace function public.search_mechanics(
  lat double precision,
  lng double precision,
  service_slug text default null,
  max_results int default 200
)
returns table (
  id uuid,
  display_name text,
  photo_url text,
  city text,
  skill_tier public.skill_tier,
  hourly_rate_cents int,
  years_experience int,
  specialties text[],
  rating_avg numeric,
  review_count int,
  completed_jobs int,
  no_show_count int,
  featured boolean,
  online boolean,
  distance_miles double precision
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.display_name, m.photo_url, m.city, m.skill_tier, m.hourly_rate_cents, m.years_experience,
         m.specialties, m.rating_avg, m.review_count, m.completed_jobs, m.no_show_count,
         coalesce(m.featured_until > now(), false) as featured, m.online,
         extensions.st_distance(m.location, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) / 1609.344 as distance_miles
  from public.mechanics m
  where m.is_live
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
  id uuid,
  display_name text,
  photo_url text,
  bio text,
  city text,
  skill_tier public.skill_tier,
  hourly_rate_cents int,
  years_experience int,
  certifications text[],
  specialties text[],
  service_radius_miles int,
  rating_avg numeric,
  review_count int,
  completed_jobs int,
  no_show_count int,
  featured boolean,
  online boolean,
  check_clear boolean,
  member_since timestamptz
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.display_name, m.photo_url, m.bio, m.city, m.skill_tier, m.hourly_rate_cents, m.years_experience,
         m.certifications, m.specialties, m.service_radius_miles, m.rating_avg, m.review_count, m.completed_jobs,
         m.no_show_count, coalesce(m.featured_until > now(), false), m.online, m.check_status = 'clear', m.created_at
  from public.mechanics m
  where m.id = mechanic_id and m.is_live
$$;

-- Busy windows for a live mechanic (no customer details), used by the booking time picker.
create or replace function public.mechanic_busy_slots(mechanic_id uuid, from_ts timestamptz, to_ts timestamptz)
returns table (scheduled_start timestamptz, scheduled_end timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.scheduled_start, b.scheduled_end from public.bookings b
  join public.mechanics m on m.id = b.mechanic_id
  where b.mechanic_id = mechanic_busy_slots.mechanic_id and m.is_live
    and b.status in ('requested', 'accepted', 'en_route', 'in_progress')
    and b.scheduled_end > from_ts and b.scheduled_start < to_ts
$$;

revoke execute on function public.refresh_mechanic_stats(uuid) from public, anon, authenticated;
grant execute on function public.search_mechanics(double precision, double precision, text, int) to anon, authenticated;
grant execute on function public.get_public_mechanic(uuid) to anon, authenticated;
grant execute on function public.mechanic_busy_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.choose_role(public.user_role) to authenticated;
revoke execute on function public.choose_role(public.user_role) from anon;

-- ─────────────────────────────────────────────────────────────
-- Storage: mechanic profile photos (public read, owner write to own folder)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mechanic-photos', 'mechanic-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "mechanic photos: public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'mechanic-photos');
create policy "mechanic photos: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'mechanic-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mechanic photos: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'mechanic-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mechanic photos: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'mechanic-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- Realtime: live booking status for customers and mechanics (RLS applies)
-- ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.bookings;
