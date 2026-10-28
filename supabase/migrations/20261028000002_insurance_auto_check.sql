-- Automatic first-pass check of uploaded insurance certificates: what the certificate said vs. what the
-- mechanic typed. Written by server code only; admins see it next to the certificate.
alter table public.mechanics add column insurance_auto_check jsonb;
comment on column public.mechanics.insurance_auto_check is 'Result of the automatic certificate check: {result, checks[{key, ok, note}], at}';

-- A partial refund issued with refund_application_fee hands back a share of everything in the application
-- fee, including any deduction recovered on that job. Put that share back on the deduction so it's
-- recovered again from a later job.
create or replace function public.release_deductions_partial(p_booking_id uuid, p_cents int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  r record;
  left_to_release int := greatest(p_cents, 0);
  part int;
  released int := 0;
begin
  for r in select deduction_id, amount_cents from public.deduction_recoveries where booking_id = p_booking_id order by created_at desc loop
    exit when left_to_release <= 0;
    part := least(r.amount_cents, left_to_release);
    if part = r.amount_cents then
      delete from public.deduction_recoveries where booking_id = p_booking_id and deduction_id = r.deduction_id;
    else
      update public.deduction_recoveries set amount_cents = amount_cents - part where booking_id = p_booking_id and deduction_id = r.deduction_id;
    end if;
    update public.mechanic_deductions set recovered_cents = greatest(recovered_cents - part, 0) where id = r.deduction_id;
    left_to_release := left_to_release - part;
    released := released + part;
  end loop;
  update public.bookings set deduction_cents = greatest(deduction_cents - released, 0) where id = p_booking_id;
  return released;
end;
$$;
revoke execute on function public.release_deductions_partial(uuid, int) from public, anon, authenticated;

-- One warranty refund per problem report.
create unique index mechanic_deductions_one_per_issue on public.mechanic_deductions (issue_id) where issue_id is not null;
