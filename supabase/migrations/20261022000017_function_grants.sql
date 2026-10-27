-- Supabase security advisor fixes.
-- 1) Pin search_path on the two helper functions that lacked it.
alter function public.tier_rank(public.skill_tier) set search_path = '';
alter function public.touch_updated_at() set search_path = '';

-- 2) Postgres grants EXECUTE to PUBLIC by default. Trigger functions and internal helpers
--    shouldn't be callable over the REST API at all.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.trg_refresh_mechanic_stats() from public, anon, authenticated;
revoke execute on function public.enforce_review_rules() from public, anon, authenticated;
revoke execute on function public.booking_photos_limit() from public, anon, authenticated;

-- choose_role: signed-in users only.
revoke execute on function public.choose_role(public.user_role) from public, anon;
grant execute on function public.choose_role(public.user_role) to authenticated;

-- is_admin() is used inside RLS policies for signed-in users; logged-out visitors don't need it.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Intentionally public (safe columns, live mechanics only): search_mechanics, get_public_mechanic,
-- mechanic_busy_slots, mechanic_is_live, mechanic_warranty_days, typical_parts_cost.
