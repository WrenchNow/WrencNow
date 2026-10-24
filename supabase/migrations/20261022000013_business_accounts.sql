-- Fleet accounts (MVP): a customer can add a business profile, tag bookings to it,
-- and see a monthly statement. One owner per business for now (no team seats).

create table public.business_accounts (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  company_name text not null check (char_length(company_name) between 2 and 120),
  billing_email text check (billing_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(billing_email) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.business_accounts enable row level security;
create policy "business_accounts: owner read" on public.business_accounts for select to authenticated using (owner_id = auth.uid());
create policy "business_accounts: owner insert" on public.business_accounts for insert to authenticated with check (owner_id = auth.uid());
create policy "business_accounts: owner update" on public.business_accounts for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "business_accounts: owner delete" on public.business_accounts for delete to authenticated using (owner_id = auth.uid());
create policy "business_accounts: admin read" on public.business_accounts for select to authenticated using (public.is_admin());
grant select, insert, update, delete on public.business_accounts to authenticated;

-- Bookings remember the business name at booking time (statements stay correct if the name changes).
alter table public.bookings add column business_name text check (char_length(business_name) <= 120);
