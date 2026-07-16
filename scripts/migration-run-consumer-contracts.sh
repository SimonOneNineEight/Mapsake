#!/usr/bin/env bash
# G1 — consumer contracts. Run every *.contract.sql against the migrated database. Each is a rolled-back
# set of the reads/writes a consumer performs; a dropped/renamed column makes a statement error, failing
# the gate. Proves the migration didn't break the web client or the vendored iOS consumer.
set -euo pipefail

DB="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

shopt -s nullglob
contracts=(supabase/contracts/*.contract.sql)
[ "${#contracts[@]}" -gt 0 ] || { echo "❌ G1: no consumer contracts found"; exit 1; }

for c in "${contracts[@]}"; do
  echo "→ $c"
  psql "$DB" -q -v ON_ERROR_STOP=1 -f "$c" >/dev/null
done
echo "✅ G1 consumer contracts: all pass against the migrated schema."
