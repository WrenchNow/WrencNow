-- QA hardening (review of 2026-10-22)

-- Serialize status changes: server code claims a booking before talking to Stripe,
-- so a concurrent cancel and accept can't both move money.
alter table public.bookings add column processing_until timestamptz;

-- Mechanics must still be live (approved + check clear + Stripe ready) to accept or head out.
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
    if new.status in ('accepted', 'en_route') and not m.is_live then
      raise exception 'mechanic is not live' using errcode = 'check_violation';
    end if;
    if new.status = 'accepted' and public.tier_rank(s_tier) > public.tier_rank(m.skill_tier) then
      raise exception 'mechanic tier % cannot accept a % job', m.skill_tier, s_tier using errcode = 'check_violation';
    end if;
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

-- Reviewer names come from the customer's profile, never from the client.
create or replace function public.enforce_review_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings%rowtype;
  full_name text;
  parts text[];
begin
  select * into b from public.bookings where id = new.booking_id;
  if b.status <> 'completed' then raise exception 'can only review completed bookings'; end if;
  if b.customer_id <> new.customer_id or b.mechanic_id <> new.mechanic_id then
    raise exception 'review does not match booking';
  end if;
  select p.full_name into full_name from public.profiles p where p.id = new.customer_id;
  parts := regexp_split_to_array(trim(coalesce(full_name, '')), '\s+');
  new.reviewer_name := case
    when coalesce(parts[1], '') = '' then 'WrenchNow customer'
    when array_length(parts, 1) > 1 then parts[1] || ' ' || upper(left(parts[array_length(parts, 1)], 1)) || '.'
    else parts[1]
  end;
  return new;
end;
$$;

-- Profile photos must live in the mechanic's own storage folder.
alter table public.mechanics add constraint mechanics_photo_url_own_folder
  check (photo_url is null or position('/storage/v1/object/public/mechanic-photos/' || id::text || '/' in photo_url) > 0);

-- Only expose service lists of live mechanics (and your own).
create or replace function public.mechanic_is_live(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_live from public.mechanics where id = mid), false)
$$;
grant execute on function public.mechanic_is_live(uuid) to anon, authenticated;

drop policy "mechanic_services: public read" on public.mechanic_services;
create policy "mechanic_services: read live or own" on public.mechanic_services for select to anon, authenticated
  using (public.mechanic_is_live(mechanic_id) or mechanic_id = auth.uid());
