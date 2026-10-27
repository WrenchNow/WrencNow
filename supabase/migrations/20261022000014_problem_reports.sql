-- Mechanics are independent contractors: WrenchNow doesn't warranty their work.
-- "Warranty claims" become plain problem reports that support mediates (RLS unchanged).
alter table public.warranty_claims rename to job_issues;
alter index public.warranty_claims_one_open rename to job_issues_one_open;
alter table public.job_issues rename constraint warranty_claims_customer_id_fkey to job_issues_customer_id_fkey;
alter table public.job_issues rename constraint warranty_claims_mechanic_id_fkey to job_issues_mechanic_id_fkey;
alter table public.job_issues rename constraint warranty_claims_booking_id_fkey to job_issues_booking_id_fkey;
alter policy "warranty_claims: parties read" on public.job_issues rename to "job_issues: parties read";
alter policy "warranty_claims: admin read" on public.job_issues rename to "job_issues: admin read";
