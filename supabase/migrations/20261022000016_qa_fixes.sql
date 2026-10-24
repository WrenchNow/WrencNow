-- QA fixes for weekend features.

-- 1) Job photos: mechanics may only upload into <their id>/<booking id>/ for their own ACTIVE job
--    (previously any signed-in user could upload anything under their own id folder).
drop policy "job photos: mechanic write own" on storage.objects;
create policy "job photos: mechanic write own active job" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[2]
        and b.mechanic_id = auth.uid()
        and b.status in ('accepted', 'en_route', 'in_progress')
    )
  );

-- 2) Browsers other than Safari can't show HEIC; accept web formats only (iOS converts to JPEG on upload).
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'job-photos';

-- 3) Max 6 photos of each kind per job, enforced in the database (no race between parallel uploads).
create or replace function public.booking_photos_limit() returns trigger language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.booking_id::text || new.kind));
  if (select count(*) from public.booking_photos where booking_id = new.booking_id and kind = new.kind) >= 6 then
    raise exception 'booking_photos_limit: at most 6 % photos per job', new.kind;
  end if;
  return new;
end $$;
create trigger booking_photos_limit before insert on public.booking_photos for each row execute function public.booking_photos_limit();

-- 4) Snapshot the mechanic's own warranty on each booking so later profile edits don't rewrite history.
alter table public.bookings add column warranty_days int check (warranty_days between 0 and 365);
update public.bookings b set warranty_days = m.warranty_days from public.mechanics m where m.id = b.mechanic_id and b.warranty_days is null;
