#!/usr/bin/env bash
# End-to-end booking → payment → refund test against a local fake Stripe.
# Needs the local DB stack up and seeded. Builds the app itself: NEXT_PUBLIC_* values are inlined at build time.
# Afterwards: `npm run build`, and reset + seed the local DB (it leaves a completed job and review behind).
set -euo pipefail
cd "$(dirname "$0")/.."
export STRIPE_WEBHOOK_SECRET=whsec_test_lifecycle
export CHECKR_API_KEY=checkr_test_lifecycle # signs the test background-check webhooks
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_lifecycle
export SALES_TAX_GEO_LOOKUP=off # no network here: the ZIP fallback picks the rate
npx next build > /tmp/next-lifecycle-build.log 2>&1 || { tail -30 /tmp/next-lifecycle-build.log; exit 1; }
FAKE_PORT=12112
fuser -k 3000/tcp "$FAKE_PORT/tcp" 2>/dev/null || true
FAKE_STRIPE_PORT=$FAKE_PORT APP_WEBHOOK_URL=http://localhost:3000/api/stripe/webhook node scripts/fake-stripe/server.mjs > /tmp/fake-stripe.log 2>&1 &
FAKE_PID=$!
E2E_FAKE_STRIPE=1 STRIPE_SECRET_KEY=sk_test_lifecycle STRIPE_API_BASE=http://127.0.0.1:$FAKE_PORT \
  STRIPE_CONNECT_WEBHOOK_SECRET= npx next start -p 3000 > /tmp/next-lifecycle.log 2>&1 &
APP_PID=$!
trap 'kill $FAKE_PID $APP_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000 && break; sleep 0.5; done
E2E_FAKE_STRIPE=http://127.0.0.1:$FAKE_PORT npx playwright test tests/e2e/lifecycle.spec.ts --project=desktop "$@"
