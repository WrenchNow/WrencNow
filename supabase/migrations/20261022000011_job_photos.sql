-- Before/after photos: the mechanic photographs the car at the start and end of a job;
-- the customer sees them on the booking. Files live in a private bucket; the server hands
-- out short-lived signed links. Rows are written by the server only.

create table public.booking_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  mechanic_id uuid not null references public.mechanics (id),
  kind text not null check (kind in ('before', 'after')),
  path text not null unique check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index booking_photos_booking_idx on public.booking_photos (booking_id);
alter table public.booking_photos enable row level security;
create policy "booking_photos: parties read" on public.booking_photos for select to authenticated using (
  exists (select 1 from public.bookings b where b.id = booking_id and (b.customer_id = auth.uid() or b.mechanic_id = auth.uid()))
);
create policy "booking_photos: admin read" on public.booking_photos for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.booking_photos from authenticated, anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;
create policy "job photos: mechanic write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "job photos: mechanic read own" on storage.objects for select to authenticated
  using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
