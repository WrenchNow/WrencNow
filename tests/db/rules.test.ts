/**
 * Database rule tests: RLS, column grants, and the booking / skill-tier triggers.
 * Runs against the LOCAL database (npm run db:reset:local && npm run db:seed).
 * Every test runs in a transaction that is rolled back.
 * Skipped automatically when no local database is reachable.
 */
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

let client: pg.Client | null = null;
let ids: Record<string, string> = {};
let services: Record<string, number> = {};

async function connect() {
  const c = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 2000 });
  try {
    await c.connect();
    const { rows } = await c.query("select to_regclass('public.bookings') as t, (select count(*) from auth.users where email like '%@example.test') as n");
    if (!rows[0].t || Number(rows[0].n) === 0) {
      await c.end();
      return null;
    }
    return c;
  } catch {
    return null;
  }
}

client = await connect();
const run = client ? describe : describe.skip;

beforeAll(async () => {
  if (!client) return;
  const u = await client.query("select id, email from auth.users where email like '%@example.test'");
  ids = Object.fromEntries(u.rows.map((r) => [r.email.split("@")[0].replace("test.", ""), r.id]));
  const s = await client.query("select id, slug from public.services");
  services = Object.fromEntries(s.rows.map((r) => [r.slug, r.id]));
});

afterAll(async () => {
  await client?.end();
});

/** Run fn inside a rolled-back transaction, optionally as an RLS-scoped user. */
async function tx<T>(fn: (q: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>) => Promise<T>, as?: { role: "anon" | "authenticated"; sub?: string }) {
  const c = client!;
  await c.query("begin");
  try {
    if (as) {
      await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: as.sub, role: as.role })]);
      await c.query(`set local role ${as.role}`);
    }
    return await fn((sql, params) => c.query(sql, params));
  } finally {
    await c.query("rollback");
  }
}

const asUser = (sub: string) => ({ role: "authenticated" as const, sub });
const anon = { role: "anon" as const };

/** Insert a booking as the server would (service role bypasses RLS; triggers still apply). */
async function insertBooking(q: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>, mechanic: string, service: string, startIso: string) {
  const r = await q(
    `insert into public.bookings (customer_id, mechanic_id, service_id, vehicle_desc, address, scheduled_start, scheduled_end, hourly_rate_cents, estimated_max_cents)
     values ($1, $2, $3, '2015 Testmake Testmodel', '1 Test St', $4, $4::timestamptz + interval '1 hour', 9000, 9000) returning id`,
    [ids["customer"], mechanic, services[service], startIso],
  );
  return r.rows[0].id as string;
}

/** Simulate the mechanic having entered the customer's arrival code. */
async function verifiedCode(q: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>, bookingId: string) {
  await q("insert into public.booking_codes (booking_id, code, verified_at) values ($1, '1234', now())", [bookingId]);
}

const future = (days: number, hour = 16) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

run("RLS", () => {
  it("anon can read the service catalog but no private tables", async () => {
    await tx(async (q) => {
      expect((await q("select count(*)::int as n from public.services")).rows[0].n).toBeGreaterThan(0);
      expect((await q("select count(*)::int as n from public.mechanics")).rows[0].n).toBe(0);
      expect((await q("select count(*)::int as n from public.bookings")).rows[0].n).toBe(0);
      expect((await q("select count(*)::int as n from public.vehicles")).rows[0].n).toBe(0);
      expect((await q("select count(*)::int as n from public.profiles")).rows[0].n).toBe(0);
    }, anon);
  });

  it("public search only returns live mechanics and hides private columns", async () => {
    await tx(async (q) => {
      const r = await q("select * from public.search_mechanics(39.7392, -104.9903)");
      const names = r.rows.map((x) => x.display_name);
      expect(names).toContain("Test Mechanic Basic");
      expect(names).not.toContain("Test Mechanic Pending");
      expect(Object.keys(r.rows[0])).not.toContain("stripe_account_id");
      expect(Object.keys(r.rows[0])).not.toContain("checkr_candidate_id");
    }, anon);
  });

  it("search by service respects skill tier", async () => {
    await tx(async (q) => {
      const r = await q("select display_name from public.search_mechanics(39.7392, -104.9903, 'brakes')");
      expect(r.rows.map((x) => x.display_name)).toEqual(["Test Mechanic Certified"]);
    }, anon);
  });

  it("users cannot change their own role", async () => {
    await expect(tx((q) => q("update public.profiles set role = 'admin' where id = auth.uid()"), asUser(ids["customer"]))).rejects.toThrow(/permission denied/);
  });

  it("users can update their own name", async () => {
    await tx(async (q) => {
      const r = await q("update public.profiles set full_name = 'Renamed' where id = auth.uid() returning id");
      expect(r.rowCount).toBe(1);
    }, asUser(ids["customer"]));
  });

  it("customers cannot create or edit bookings directly", async () => {
    await expect(
      tx(
        (q) =>
          q(
            `insert into public.bookings (customer_id, mechanic_id, service_id, vehicle_desc, address, scheduled_start, scheduled_end, hourly_rate_cents, estimated_max_cents)
             values (auth.uid(), $1, $2, 'x', 'x', now() + interval '1 day', now() + interval '25 hours', 1, 1)`,
            [ids["mechanic.basic"], services["oil-change"]],
          ),
        asUser(ids["customer"]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("customers only see their own vehicles", async () => {
    await tx(async (q) => {
      expect((await q("select count(*)::int as n from public.vehicles")).rows[0].n).toBe(0);
    }, asUser(ids["mechanic.basic"]));
    await tx(async (q) => {
      expect((await q("select count(*)::int as n from public.vehicles")).rows[0].n).toBeGreaterThan(0);
    }, asUser(ids["customer"]));
  });

  it("mechanics cannot change their tier, status, vetting, or Stripe fields", async () => {
    for (const col of ["skill_tier = 'master'", "status = 'approved'", "check_status = 'clear'", "stripe_charges_enabled = true", "featured_until = now() + interval '1 year'"]) {
      await expect(tx((q) => q(`update public.mechanics set ${col} where id = auth.uid()`), asUser(ids["mechanic.pending"]))).rejects.toThrow(/permission denied/);
    }
  });

  it("mechanics can edit their own profile fields", async () => {
    await tx(async (q) => {
      const r = await q("update public.mechanics set bio = 'Updated bio for test', online = false where id = auth.uid() returning id");
      expect(r.rowCount).toBe(1);
    }, asUser(ids["mechanic.basic"]));
  });

  it("basic mechanics cannot list certified services", async () => {
    await expect(
      tx((q) => q("insert into public.mechanic_services (mechanic_id, service_id) values (auth.uid(), $1)", [services["brakes"]]), asUser(ids["mechanic.basic"])),
    ).rejects.toThrow(/tier/);
  });

  it("customers only see their own bookings; mechanics only theirs", async () => {
    await tx(async (q) => {
      await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
      await q(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: ids["mechanic.certified"], role: "authenticated" })]);
      await q("set local role authenticated");
      expect((await q("select count(*)::int as n from public.bookings")).rows[0].n).toBe(0);
      await q(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: ids["mechanic.basic"], role: "authenticated" })]);
      expect((await q("select count(*)::int as n from public.bookings")).rows[0].n).toBe(1);
      await q(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: ids["customer"], role: "authenticated" })]);
      expect((await q("select count(*)::int as n from public.bookings")).rows[0].n).toBe(1);
    });
  });
});

run("booking rules (enforced by triggers for every writer)", () => {
  it("a basic mechanic can't be booked for a certified job", async () => {
    await expect(tx((q) => insertBooking(q, ids["mechanic.basic"], "brakes", future(2)))).rejects.toThrow(/tier/);
  });

  it("a mechanic who isn't live can't be booked", async () => {
    await expect(tx((q) => insertBooking(q, ids["mechanic.pending"], "oil-change", future(2)))).rejects.toThrow(/not live/);
  });

  it("a job can't be accepted before the card hold is authorized", async () => {
    await expect(
      tx(async (q) => {
        const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
        await q("update public.bookings set status = 'accepted' where id = $1", [id]);
      }),
    ).rejects.toThrow(/not authorized/);
  });

  it("statuses can't skip steps", async () => {
    await expect(
      tx(async (q) => {
        const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
        await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
        await q("update public.bookings set status = 'in_progress' where id = $1", [id]);
      }),
    ).rejects.toThrow(/invalid booking transition/);
  });

  it("can't complete without captured payment", async () => {
    await expect(
      tx(async (q) => {
        const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
        await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
        await verifiedCode(q, id);
        for (const s of ["accepted", "en_route", "in_progress", "completed"]) await q("update public.bookings set status = $2 where id = $1", [id, s]);
      }),
    ).rejects.toThrow(/captured/);
  });

  it("full happy path updates stats, and only then allows one review", async () => {
    await tx(async (q) => {
      const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
      await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
      await verifiedCode(q, id);
      for (const s of ["accepted", "en_route", "in_progress"]) await q("update public.bookings set status = $2 where id = $1", [id, s]);
      await q("update public.bookings set payment_status = 'captured', final_amount_cents = 8000, status = 'completed' where id = $1", [id]);
      const m = await q("select completed_jobs from public.mechanics where id = $1", [ids["mechanic.basic"]]);
      expect(m.rows[0].completed_jobs).toBe(1);

      await q("insert into public.reviews (booking_id, customer_id, mechanic_id, reviewer_name, rating) values ($1, $2, $3, 'Test C.', 5)", [id, ids["customer"], ids["mechanic.basic"]]);
      const r = await q("select rating_avg::float as avg, review_count from public.mechanics where id = $1", [ids["mechanic.basic"]]);
      expect(r.rows[0]).toEqual({ avg: 5, review_count: 1 });
    });
  });

  it("reviews are rejected for bookings that aren't completed", async () => {
    await expect(
      tx(async (q) => {
        const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
        await q("insert into public.reviews (booking_id, customer_id, mechanic_id, reviewer_name, rating) values ($1, $2, $3, 'Test C.', 5)", [id, ids["customer"], ids["mechanic.basic"]]);
      }),
    ).rejects.toThrow(/completed/);
  });

  it("a mechanic can't be double-booked", async () => {
    await expect(
      tx(async (q) => {
        const start = future(3);
        await insertBooking(q, ids["mechanic.basic"], "oil-change", start);
        await insertBooking(q, ids["mechanic.basic"], "battery", start);
      }),
    ).rejects.toThrow(/bookings_no_overlap/);
  });

  it("cancelled bookings free the slot", async () => {
    await tx(async (q) => {
      const start = future(4);
      const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", start);
      await q("update public.bookings set status = 'cancelled' where id = $1", [id]);
      await insertBooking(q, ids["mechanic.basic"], "battery", start);
    });
  });

  it("no-shows are recorded on the mechanic's public stats", async () => {
    await tx(async (q) => {
      const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
      await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
      await q("update public.bookings set status = 'accepted' where id = $1", [id]);
      await q("update public.bookings set status = 'no_show', payment_status = 'canceled' where id = $1", [id]);
      await q("insert into public.no_shows (booking_id, mechanic_id, reported_by) values ($1, $2, $3)", [id, ids["mechanic.basic"], ids["customer"]]);
      const r = await q("select no_show_count from public.get_public_mechanic($1)", [ids["mechanic.basic"]]);
      expect(r.rows[0].no_show_count).toBe(1);
    });
  });

  it("losing the background check takes a mechanic offline immediately", async () => {
    await tx(async (q) => {
      await q("update public.mechanics set check_status = 'consider' where id = $1", [ids["mechanic.basic"]]);
      const r = await q("select is_live from public.mechanics where id = $1", [ids["mechanic.basic"]]);
      expect(r.rows[0].is_live).toBe(false);
    });
  });

  it("new signups can't make themselves admin through metadata", async () => {
    await tx(async (q) => {
      const r = await q(
        `insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
         values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sneaky@example.test', '{"role":"admin"}', now(), now()) returning id`,
      );
      const p = await q("select role from public.profiles where id = $1", [r.rows[0].id]);
      expect(p.rows[0].role).toBeNull();
    });
  });

  it("a mechanic who stops being live can't accept or head out", async () => {
    await expect(
      tx(async (q) => {
        const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
        await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
        await q("update public.mechanics set status = 'suspended' where id = $1", [ids["mechanic.basic"]]);
        await q("update public.bookings set status = 'accepted' where id = $1", [id]);
      }),
    ).rejects.toThrow(/not live/);
  });

  it("reviewer names come from the profile, not the client", async () => {
    await tx(async (q) => {
      const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
      await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
      await verifiedCode(q, id);
      for (const st of ["accepted", "en_route", "in_progress"]) await q("update public.bookings set status = $2 where id = $1", [id, st]);
      await q("update public.bookings set payment_status = 'captured', final_amount_cents = 8000, status = 'completed' where id = $1", [id]);
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ids["customer"], role: "authenticated" })]);
      await q("set local role authenticated");
      const r = await q("insert into public.reviews (booking_id, customer_id, mechanic_id, reviewer_name, rating) values ($1, auth.uid(), $2, 'WrenchNow Team', 5) returning reviewer_name", [id, ids["mechanic.basic"]]);
      expect(r.rows[0].reviewer_name).toBe("Test C.");
    });
  });
});

run("QA hardening", () => {
  it("photo URLs must point at the mechanic's own storage folder", async () => {
    await expect(
      tx((q) => q("update public.mechanics set photo_url = 'https://evil.example/x.png' where id = auth.uid()"), asUser(ids["mechanic.basic"])),
    ).rejects.toThrow(/mechanics_photo_url_own_folder/);
    await tx(async (q) => {
      const ok = `http://127.0.0.1:54321/storage/v1/object/public/mechanic-photos/${ids["mechanic.basic"]}/a.png`;
      const r = await q("update public.mechanics set photo_url = $1 where id = auth.uid() returning id", [ok]);
      expect(r.rowCount).toBe(1);
    }, asUser(ids["mechanic.basic"]));
  });

  it("service lists of mechanics who aren't live are hidden from the public", async () => {
    await tx(async (q) => {
      const r = await q("select count(*)::int as n from public.mechanic_services where mechanic_id = $1", [ids["mechanic.pending"]]);
      expect(r.rows[0].n).toBe(0);
      const live = await q("select count(*)::int as n from public.mechanic_services where mechanic_id = $1", [ids["mechanic.basic"]]);
      expect(live.rows[0].n).toBeGreaterThan(0);
    }, anon);
    await tx(async (q) => {
      const r = await q("select count(*)::int as n from public.mechanic_services where mechanic_id = auth.uid()");
      expect(r.rows[0].n).toBeGreaterThan(0);
    }, asUser(ids["mechanic.pending"]));
  });

  it("en route jobs can't be cancelled except by an admin", async () => {
    await expect(
      tx(async (q) => {
        const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
        await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
        for (const st of ["accepted", "en_route"]) await q("update public.bookings set status = $2 where id = $1", [id, st]);
        await q("update public.bookings set status = 'cancelled' where id = $1", [id]);
      }),
    ).rejects.toThrow(/invalid booking transition/);
    await tx(async (q) => {
      const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
      await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
      for (const st of ["accepted", "en_route"]) await q("update public.bookings set status = $2 where id = $1", [id, st]);
      await q("update public.bookings set status = 'cancelled', admin_override = true where id = $1", [id]);
    });
  });
});

run("arrival codes", () => {
  it("a job can't start without a verified arrival code", async () => {
    await expect(
      tx(async (q) => {
        const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
        await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
        for (const st of ["accepted", "en_route"]) await q("update public.bookings set status = $2 where id = $1", [id, st]);
        await q("insert into public.booking_codes (booking_id, code) values ($1, '4821')", [id]);
        await q("update public.bookings set status = 'in_progress' where id = $1", [id]);
      }),
    ).rejects.toThrow(/arrival code not verified/);
  });

  it("only the customer can read the code — never the mechanic", async () => {
    await tx(async (q) => {
      const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(2));
      await q("insert into public.booking_codes (booking_id, code) values ($1, '4821')", [id]);
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ids["mechanic.basic"], role: "authenticated" })]);
      await q("set local role authenticated");
      expect((await q("select count(*)::int as n from public.booking_codes")).rows[0].n).toBe(0);
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ids["customer"], role: "authenticated" })]);
      expect((await q("select code from public.booking_codes where booking_id = $1", [id])).rows[0].code).toBe("4821");
      await expect(q("update public.booking_codes set verified_at = now() where booking_id = $1", [id])).rejects.toThrow(/permission denied/);
    });
  });
});

run("insurance", () => {
  it("mechanics without verified insurance aren't live", async () => {
    await tx(async (q) => {
      await q("update public.mechanics set insurance_status = 'submitted' where id = $1", [ids["mechanic.basic"]]);
      expect((await q("select is_live from public.mechanics where id = $1", [ids["mechanic.basic"]])).rows[0].is_live).toBe(false);
    });
  });

  it("expired insurance hides a mechanic from search and blocks bookings", async () => {
    await tx(async (q) => {
      await q("update public.mechanics set insurance_expires_on = current_date - 1 where id = $1", [ids["mechanic.basic"]]);
      const r = await q("select display_name from public.search_mechanics(39.7392, -104.9903)");
      expect(r.rows.map((x) => x.display_name)).not.toContain("Test Mechanic Basic");
      expect((await q("select count(*)::int as n from public.get_public_mechanic($1)", [ids["mechanic.basic"]])).rows[0].n).toBe(0);
      await expect(insertBooking(q, ids["mechanic.basic"], "oil-change", future(2))).rejects.toThrow(/not live/);
    });
  });

  it("mechanics can't mark their own insurance verified", async () => {
    await expect(
      tx((q) => q("update public.mechanics set insurance_status = 'verified', insurance_expires_on = '2099-01-01' where id = auth.uid()"), asUser(ids["mechanic.pending"])),
    ).rejects.toThrow(/permission denied/);
  });
});

run("verification fee refunds", () => {
  async function completedJob(q: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>, day: number) {
    const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", future(day, 15));
    await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
    await verifiedCode(q, id);
    for (const st of ["accepted", "en_route", "in_progress"]) await q("update public.bookings set status = $2 where id = $1", [id, st]);
    await q("update public.bookings set payment_status = 'captured', final_amount_cents = 5000, status = 'completed' where id = $1", [id]);
    return id;
  }

  it("refunds $10 per completed job until the $50 is back, never twice for one job", async () => {
    await tx(async (q) => {
      await q(
        "update public.mechanics set verification_fee_status = 'paid', verification_payment_intent_id = 'pi_test_fee', verification_paid_cents = 5000 where id = $1",
        [ids["mechanic.basic"]],
      );
      const amounts: number[] = [];
      for (let day = 1; day <= 6; day++) {
        const id = await completedJob(q, day);
        amounts.push((await q("select public.claim_verification_refund($1, 1000) as a", [id])).rows[0].a);
        if (day === 1) expect((await q("select public.claim_verification_refund($1, 1000) as a", [id])).rows[0].a).toBe(0); // same job again
      }
      expect(amounts).toEqual([1000, 1000, 1000, 1000, 1000, 0]);
      const m = await q("select verification_refunded_cents from public.mechanics where id = $1", [ids["mechanic.basic"]]);
      expect(m.rows[0].verification_refunded_cents).toBe(5000);
    });
  });

  it("a failed Stripe refund releases the installment so it can be retried", async () => {
    await tx(async (q) => {
      await q(
        "update public.mechanics set verification_fee_status = 'paid', verification_payment_intent_id = 'pi_test_fee', verification_paid_cents = 5000 where id = $1",
        [ids["mechanic.basic"]],
      );
      const id = await completedJob(q, 1);
      expect((await q("select public.claim_verification_refund($1, 1000) as a", [id])).rows[0].a).toBe(1000);
      await q("select public.release_verification_refund($1)", [id]);
      expect((await q("select verification_refunded_cents from public.mechanics where id = $1", [ids["mechanic.basic"]])).rows[0].verification_refunded_cents).toBe(0);
      expect((await q("select public.claim_verification_refund($1, 1000) as a", [id])).rows[0].a).toBe(1000);
    });
  });

  it("waived or unpaid fees are never refunded", async () => {
    await tx(async (q) => {
      const id = await completedJob(q, 1); // seed mechanic's fee is waived
      expect((await q("select public.claim_verification_refund($1, 1000) as a", [id])).rows[0].a).toBe(0);
    });
  });

  it("users can't call the refund functions or mark their fee paid", async () => {
    await expect(
      tx((q) => q("select public.claim_verification_refund(gen_random_uuid(), 1000)"), asUser(ids["mechanic.basic"])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      tx((q) => q("update public.mechanics set verification_fee_status = 'paid' where id = auth.uid()"), asUser(ids["mechanic.pending"])),
    ).rejects.toThrow(/permission denied/);
  });
});

run("customer no-shows", () => {
  async function enRoute(q: (sql: string, params?: unknown[]) => Promise<pg.QueryResult>, startIso: string) {
    const id = await insertBooking(q, ids["mechanic.basic"], "oil-change", startIso);
    await q("update public.bookings set payment_status = 'authorized' where id = $1", [id]);
    for (const st of ["accepted", "en_route"]) await q("update public.bookings set status = $2 where id = $1", [id, st]);
    return id;
  }
  const past = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

  it("requires the mechanic to have checked in at the address", async () => {
    await expect(
      tx(async (q) => {
        const id = await enRoute(q, future(2));
        await q("update public.bookings set payment_status = 'captured', status = 'customer_no_show' where id = $1", [id]);
      }),
    ).rejects.toThrow(/has not checked in/);
  });

  it("requires a 15-minute wait after check-in and the booked time", async () => {
    await expect(
      tx(async (q) => {
        const id = await enRoute(q, future(2));
        await q("update public.bookings set arrived_at = now() where id = $1", [id]);
        await q("update public.bookings set payment_status = 'captured', status = 'customer_no_show' where id = $1", [id]);
      }),
    ).rejects.toThrow(/wait has not passed/);
  });

  it("allows it after the wait, and then the customer can't report the mechanic", async () => {
    await tx(async (q) => {
      // Booked and en route earlier; checked in 20 minutes ago, 20 minutes after the start time.
      const id = await enRoute(q, future(2));
      await q("update public.bookings set scheduled_start = $2, scheduled_end = $3, arrived_at = $4 where id = $1", [id, past(40), past(-20), past(20)]);
      await q("update public.bookings set payment_status = 'captured', final_amount_cents = 2500, customer_no_show_fee_cents = 2500, status = 'customer_no_show' where id = $1", [id]);
      expect((await q("select status from public.bookings where id = $1", [id])).rows[0].status).toBe("customer_no_show");
    });
    await expect(
      tx(async (q) => {
        const id = await enRoute(q, future(2));
        await q("update public.bookings set arrived_at = now() where id = $1", [id]);
        await q("update public.bookings set status = 'no_show', payment_status = 'canceled' where id = $1", [id]);
      }),
    ).rejects.toThrow(/checked in at the address/);
  });
});

run("off-platform payment reports", () => {
  it("customers can't write reports directly (server only) but can read their own", async () => {
    await expect(
      tx((q) => q("insert into public.payment_reports (reporter_id, method) values (auth.uid(), 'Venmo')"), asUser(ids["customer"])),
    ).rejects.toThrow(/permission denied/);
    await tx(async (q) => {
      await q("insert into public.payment_reports (reporter_id, method) values ($1, 'Venmo')", [ids["customer"]]);
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ids["customer"], role: "authenticated" })]);
      await q("set local role authenticated");
      expect((await q("select count(*)::int as n from public.payment_reports")).rows[0].n).toBe(1);
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ids["mechanic.basic"], role: "authenticated" })]);
      expect((await q("select count(*)::int as n from public.payment_reports")).rows[0].n).toBe(0);
    });
  });
});

