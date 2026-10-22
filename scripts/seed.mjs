// Seeds CLEARLY FAKE test data into a LOCAL Supabase. Refuses to run against
// anything that isn't localhost, so it can never touch production.
//   npm run db:seed
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv(file) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnv(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  console.error(`Refusing to seed non-local Supabase: ${url}`);
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
export const PASSWORD = "test-password-123";

async function user(email, full_name, role) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name, role } });
  if (error) throw error;
  return data.user.id;
}

const { data: services } = await db.from("services").select("id, slug, required_tier");
const tierRank = { basic: 1, certified: 2, master: 3 };

// Downtown Denver-ish coordinates, for local testing only.
const mechanics = [
  { email: "test.mechanic.basic@example.test", name: "Test Mechanic Basic", tier: "basic", rate: 6500, lat: 39.7392, lng: -104.9903 },
  { email: "test.mechanic.certified@example.test", name: "Test Mechanic Certified", tier: "certified", rate: 9000, lat: 39.7508, lng: -104.9966 },
  { email: "test.mechanic.pending@example.test", name: "Test Mechanic Pending", tier: "basic", rate: 7000, lat: 39.7294, lng: -104.9719, pending: true },
];

for (const m of mechanics) {
  const id = await user(m.email, m.name, "mechanic");
  const { error } = await db
    .from("mechanics")
    .update({
      display_name: m.name,
      bio: "TEST ACCOUNT — seeded for local development. Not a real mechanic.",
      years_experience: 5,
      hourly_rate_cents: m.rate,
      service_radius_miles: 25,
      location: `SRID=4326;POINT(${m.lng} ${m.lat})`,
      city: "Denver",
      has_tools: true,
      has_transport: true,
      skill_tier: m.tier,
      status: m.pending ? "pending" : "approved",
      check_status: m.pending ? "pending" : "clear",
      stripe_account_id: m.pending ? null : `acct_test_seed_${m.tier}`,
      stripe_charges_enabled: !m.pending,
      stripe_payouts_enabled: !m.pending,
      onboarding_submitted_at: new Date().toISOString(),
      agreed_terms_at: new Date().toISOString(),
      online: !m.pending,
      insurance_status: m.pending ? "submitted" : "verified",
      insurance_provider: "TEST INSURER (fake)",
      insurance_policy_number: "TEST-0000",
      insurance_expires_on: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
      insurance_submitted_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  const allowed = services.filter((s) => tierRank[s.required_tier] <= tierRank[m.tier]).map((s) => ({ mechanic_id: id, service_id: s.id }));
  await db.from("mechanic_services").upsert(allowed, { onConflict: "mechanic_id,service_id", ignoreDuplicates: true });
}

const customerId = await user("test.customer@example.test", "Test Customer", "customer");
const { count } = await db.from("vehicles").select("*", { count: "exact", head: true }).eq("owner_id", customerId);
if (!count) await db.from("vehicles").insert({ owner_id: customerId, year: 2015, make: "Testmake", model: "Testmodel" });

const adminId = await user("test.admin@example.test", "Test Admin", "customer");
await db.from("profiles").update({ role: "admin" }).eq("id", adminId);

console.log(`Seeded local test data. Log in with any *@example.test account, password: ${PASSWORD}`);
