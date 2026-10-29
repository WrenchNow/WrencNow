-- Customers pay card processing as a service fee on top of the job; mechanics no longer have it taken
-- from their share. The rate is snapshotted per booking so holds stay valid if the rate changes later.
-- NULL = booked under the old model (processing taken from the mechanic's share).
alter table public.bookings
  add column service_fee_bps int check (service_fee_bps between 0 and 2000),
  add column service_fee_fixed_cents int check (service_fee_fixed_cents between 0 and 500);
comment on column public.bookings.service_fee_bps is 'Customer service fee rate (bps of the job subtotal) at booking; NULL = mechanic paid processing (pre Oct 29 2026)';
comment on column public.bookings.processing_fee_cents is 'Card processing: the customer service fee (service_fee_bps set) or the amount taken from the mechanic share (older bookings)';
