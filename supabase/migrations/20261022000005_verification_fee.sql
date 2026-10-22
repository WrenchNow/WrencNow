-- Verification fee: mechanics pay it when they apply (it covers the background check),
-- and get it back in installments after each of their first completed jobs.
create type public.verification_fee_status as enum ('unpaid', 'paid', 'waived');

alter table public.mechanics
  add column verification_fee_status public.verification_fee_status not null default 'unpaid',
  add column verification_payment_intent_id text unique,
  add column verification_paid_cents int not null default 0 check (verification_paid_cents >= 0),
  add column verification_refunded_cents int not null default 0 check (verification_refunded_cents >= 0),
  add column verification_paid_at timestamptz,
  add constraint mechanics_verification_refund_le_paid check (verification_refunded_cents <= verification_paid_cents);

-- One refund installment per completed job (primary key = idempotency).
create table public.verification_refunds (
  booking_id uuid primary key references public.bookings (id),
  mechanic_id uuid not null references public.mechanics (id),
  amount_cents int not null check (amount_cents > 0),
  stripe_refund_id text unique,
  created_at timestamptz not null default now()
);
create index verification_refunds_mechanic_idx on public.verification_refunds (mechanic_id);
alter table public.verification_refunds enable row level security;
create policy "verification_refunds: mechanic reads own" on public.verification_refunds for select to authenticated using (mechanic_id = auth.uid());
create policy "verification_refunds: admin read" on public.verification_refunds for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.verification_refunds from authenticated, anon;

-- Reserve the next refund installment for a completed job. Locks the mechanic row so two
-- jobs finishing at the same moment can't both refund the last $10. Returns 0 when
-- nothing is owed (already refunded, fee waived/unpaid, or this job already counted).
create or replace function public.claim_verification_refund(p_booking_id uuid, p_per_job_cents int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings%rowtype;
  m public.mechanics%rowtype;
  already int;
  amount int;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null or b.status <> 'completed' or b.payment_status <> 'captured' then return 0; end if;
  select * into m from public.mechanics where id = b.mechanic_id for update;
  if m.verification_fee_status <> 'paid' or m.verification_payment_intent_id is null then return 0; end if;
  if exists (select 1 from public.verification_refunds where booking_id = p_booking_id) then return 0; end if;
  select coalesce(sum(amount_cents), 0) into already from public.verification_refunds where mechanic_id = m.id;
  amount := least(p_per_job_cents, m.verification_paid_cents - already);
  if amount <= 0 then return 0; end if;
  insert into public.verification_refunds (booking_id, mechanic_id, amount_cents) values (p_booking_id, m.id, amount);
  update public.mechanics set verification_refunded_cents = already + amount where id = m.id;
  return amount;
end;
$$;
revoke execute on function public.claim_verification_refund(uuid, int) from public, anon, authenticated;

-- Undo a reservation if Stripe rejects the refund, so a later retry can claim it again.
create or replace function public.release_verification_refund(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.verification_refunds%rowtype;
begin
  delete from public.verification_refunds where booking_id = p_booking_id and stripe_refund_id is null returning * into r;
  if r.booking_id is not null then
    update public.mechanics set verification_refunded_cents = verification_refunded_cents - r.amount_cents where id = r.mechanic_id;
  end if;
end;
$$;
revoke execute on function public.release_verification_refund(uuid) from public, anon, authenticated;
