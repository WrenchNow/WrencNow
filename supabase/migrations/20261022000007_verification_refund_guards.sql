-- Stop mechanics from earning back the verification fee with fake/tiny jobs.
-- A job only counts toward a refund installment if:
--   * its final amount is at least the minimum (passed in from VERIFICATION_REFUND_MIN_JOB_CENTS),
--   * it was completed at least p_mature_days ago and is still captured (not refunded or disputed),
--   * it's from a customer not already counted for this mechanic,
--   * it wasn't paid with the card the mechanic used for the fee, or a card already counted.

alter table public.bookings add column card_fingerprint text;
alter table public.mechanics add column verification_card_fingerprint text;

alter table public.verification_refunds
  add column customer_id uuid references public.profiles (id),
  add column card_fingerprint text;

drop function if exists public.claim_verification_refund(uuid, int);

create or replace function public.claim_verification_refund(
  p_booking_id uuid,
  p_per_job_cents int,
  p_min_job_cents int,
  p_mature_days int
)
returns int language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings%rowtype;
  m public.mechanics%rowtype;
  already int;
  amount int;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null or b.status <> 'completed' or b.payment_status <> 'captured' then return 0; end if;
  if coalesce(b.final_amount_cents, 0) < p_min_job_cents then return 0; end if;
  if b.completed_at is null or b.completed_at > now() - make_interval(days => p_mature_days) then return 0; end if;

  select * into m from public.mechanics where id = b.mechanic_id for update;
  if m.verification_fee_status <> 'paid' or m.verification_payment_intent_id is null then return 0; end if;
  if exists (select 1 from public.verification_refunds where booking_id = p_booking_id) then return 0; end if;
  if exists (select 1 from public.verification_refunds where mechanic_id = m.id and customer_id = b.customer_id) then return 0; end if;
  if b.card_fingerprint is not null and (
       b.card_fingerprint = m.verification_card_fingerprint
       or exists (select 1 from public.verification_refunds where mechanic_id = m.id and card_fingerprint = b.card_fingerprint)
     ) then
    return 0;
  end if;

  select coalesce(sum(amount_cents), 0) into already from public.verification_refunds where mechanic_id = m.id;
  amount := least(p_per_job_cents, m.verification_paid_cents - already);
  if amount <= 0 then return 0; end if;
  insert into public.verification_refunds (booking_id, mechanic_id, amount_cents, customer_id, card_fingerprint)
    values (p_booking_id, m.id, amount, b.customer_id, b.card_fingerprint);
  update public.mechanics set verification_refunded_cents = already + amount where id = m.id;
  return amount;
end;
$$;
revoke execute on function public.claim_verification_refund(uuid, int, int, int) from public, anon, authenticated;
