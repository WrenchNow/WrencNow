-- Colorado sales tax on parts, collected by WrenchNow as the marketplace facilitator.
-- The rate is snapshotted per booking from the job address (city limits) or ZIP, so later
-- rate changes never rewrite an old receipt. Writes go through the server only (see the
-- revoke on public.bookings in the core schema).

alter table public.bookings
  add column tax_zip text,
  add column tax_county text,
  add column tax_place text,
  add column tax_rate_mpct int not null default 0 check (tax_rate_mpct between 0 and 20000),
  add column tax_components jsonb not null default '[]'::jsonb,
  add column tax_source text check (tax_source in ('address', 'zip', 'provisional')),
  add column tax_review_note text,
  add column tax_reviewed_at timestamptz,
  add column sales_tax_cents int not null default 0 check (sales_tax_cents >= 0),
  add column sales_tax_refunded_cents int not null default 0 check (sales_tax_refunded_cents >= 0);

comment on column public.bookings.tax_rate_mpct is 'Combined sales tax rate in thousandths of a percent (9.15% = 9150)';
comment on column public.bookings.sales_tax_cents is 'Sales tax collected on parts (and handling) at capture; kept by the platform for remittance';

create index bookings_tax_review_idx on public.bookings (created_at desc)
  where tax_review_note is not null and tax_reviewed_at is null;
