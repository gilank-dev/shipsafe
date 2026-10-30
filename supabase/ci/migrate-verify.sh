#!/usr/bin/env bash
# ==============================================================================
# ShipSafe Migration Gate
# Applies every migration in supabase/migrations/ (lexicographic order) to a
# clean Postgres with a stubbed Supabase `auth` schema, then asserts the final
# state. Guards against: version collisions, schema drift between files, and
# migrations that were never verified against a real database.
#
# Usage: DATABASE_URL=postgres://user:pass@host:5432/db ./migrate-verify.sh
# ==============================================================================
set -euo pipefail

DB_URL="${DATABASE_URL:?DATABASE_URL is required}"
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../migrations" && pwd)"
EXPECTED_TABLES="audits findings audit_diffs cli_tokens user_quotas organizations user_profiles organization_invites redemption_codes scan_telemetry_logs admin_audit_logs"
EXPECTED_LOG_COLUMNS="actor_email actor_id target_email target_user_id action action_type metadata diff"

psql_cmd() { psql "$DB_URL" -v ON_ERROR_STOP=1 -q "$@"; }

echo "== 1. Migration version uniqueness check =="
versions=$(find "$MIGRATIONS_DIR" -name '*.sql' -printf '%f\n' |
  sed -n 's/^\([0-9]\+\)_.*/\1/p' | sort)
duplicates=$(printf '%s\n' "$versions" | sort | uniq -d)
if [ -n "$duplicates" ]; then
  echo "FAIL: duplicate migration version prefixes detected: $duplicates" >&2
  echo "Supabase CLI parses the version from leading digits only — use unique 14-digit timestamps." >&2
  exit 1
fi
echo "OK: $(printf '%s\n' "$versions" | wc -l) migrations, all versions unique"

echo "== 2. Stub Supabase auth schema =="
psql_cmd <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$ SELECT NULL::UUID $$ LANGUAGE sql;
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$ SELECT 'anon'::TEXT $$ LANGUAGE sql;
SQL

echo "== 3. Apply migrations in order =="
for file in $(find "$MIGRATIONS_DIR" -name '*.sql' | sort); do
  echo "  applying $(basename "$file")"
  psql_cmd -f "$file" > /dev/null
done

echo "== 4. Assert expected tables exist =="
missing=0
for table in $EXPECTED_TABLES; do
  exists=$(psql_cmd -tAc "SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='$table'")
  if [ "$exists" != "1" ]; then
    echo "FAIL: expected table missing: $table" >&2
    missing=1
  fi
done
[ "$missing" = "0" ] || exit 1
echo "OK: all expected tables exist"

echo "== 5. Assert admin_audit_logs union schema =="
for column in $EXPECTED_LOG_COLUMNS; do
  exists=$(psql_cmd -tAc "SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='admin_audit_logs' AND column_name='$column'")
  if [ "$exists" != "1" ]; then
    echo "FAIL: admin_audit_logs missing column: $column" >&2
    missing=1
  fi
done
[ "$missing" = "0" ] || exit 1
echo "OK: union schema materialized"

echo "MIGRATION GATE: PASS"
