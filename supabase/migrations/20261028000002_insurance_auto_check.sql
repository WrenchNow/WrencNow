-- Automatic first-pass check of uploaded insurance certificates: what the certificate said vs. what the
-- mechanic typed. Written by server code only; admins see it next to the certificate.
alter table public.mechanics add column insurance_auto_check jsonb;
comment on column public.mechanics.insurance_auto_check is 'Result of the automatic certificate check: {result, checks[{key, ok, note}], at}';
