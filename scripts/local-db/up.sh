#!/usr/bin/env bash
# Local Supabase without the supabase/postgres image: system Postgres 16 + PostGIS,
# GoTrue + PostgREST containers, and a node gateway on :54321.
# Prefer `npx supabase start` when Docker can pull all Supabase images.
set -e
cd "$(dirname "$0")/../.."
JWT=super-secret-jwt-token-with-at-least-32-characters-long
PSQL="sudo -u postgres psql -q -v ON_ERROR_STOP=1"

pg_ctlcluster 16 main start 2>/dev/null || true

if [ "$1" = "--reset" ]; then
  docker rm -f wn-auth wn-rest >/dev/null 2>&1 || true
  sudo -u postgres dropdb --if-exists postgres_tmp >/dev/null
  $PSQL -c "drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists storage cascade; drop schema if exists extensions cascade; create schema public; drop publication if exists supabase_realtime;"
fi

$PSQL -f scripts/local-db/bootstrap.sql 2>&1 | grep -v "wal_level\|HINT" || true

docker rm -f wn-auth >/dev/null 2>&1 || true
docker run -d --name wn-auth --network host \
  -e GOTRUE_API_HOST=127.0.0.1 -e PORT=9999 -e API_EXTERNAL_URL=http://127.0.0.1:54321/auth/v1 \
  -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:postgres@127.0.0.1:5432/postgres?search_path=auth" \
  -e GOTRUE_SITE_URL=http://localhost:3000 -e GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**,http://127.0.0.1:3000/**" \
  -e GOTRUE_JWT_SECRET=$JWT -e GOTRUE_JWT_EXP=3600 -e GOTRUE_JWT_AUD=authenticated \
  -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=true -e GOTRUE_DISABLE_SIGNUP=false \
  supabase/gotrue:v2.197.0 >/dev/null
# GoTrue creates the auth schema; wait for auth.users before applying app migrations.
for i in $(seq 1 30); do
  sudo -u postgres psql -Atc "select to_regclass('auth.users')" | grep -q users && break
  sleep 1
done

if [ "$(sudo -u postgres psql -Atc "select to_regclass('public.profiles')")" = "" ]; then
  for f in supabase/migrations/*.sql; do $PSQL -f "$f" 2>&1 | grep -v "wal_level\|HINT" || true; done
  [ -f supabase/seed.sql ] && $PSQL -f supabase/seed.sql
fi

docker rm -f wn-rest >/dev/null 2>&1 || true
docker run -d --name wn-rest --network host \
  -e PGRST_DB_URI="postgres://authenticator:postgres@127.0.0.1:5432/postgres" -e PGRST_DB_SCHEMAS=public \
  -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET=$JWT -e PGRST_SERVER_PORT=54330 \
  -e PGRST_DB_EXTRA_SEARCH_PATH=public,extensions postgrest/postgrest:v16.4 >/dev/null

pkill -f scripts/local-db/gateway.mjs 2>/dev/null || true
nohup node scripts/local-db/gateway.mjs > /tmp/wn-gateway.log 2>&1 &
sleep 2
echo "Local Supabase ready at http://127.0.0.1:54321 (see .env.example for local keys)"
