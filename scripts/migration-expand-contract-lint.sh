#!/usr/bin/env bash
# G4 — expand/contract lint. Migrations must be additive (EXPAND) unless a destructive op is explicitly
# justified. Flags the destructive/consumer-breaking ops below when they appear as EXECUTABLE SQL (not in
# a commented `-- Down` block) and lack an `-- expand-contract-ok: <reason>` annotation in the same file.
# Additive-only migrations pass with no annotation.
# Known limitations (a grep can't parse SQL): a multi-line-split statement, and `ADD COLUMN … NOT NULL`
# without a default (safe on a new table, breaking on an existing one) — the latter is caught by G1's
# write-shape check only if the column is one a consumer writes.
set -euo pipefail

fail=0
shopt -s nullglob
for f in supabase/migrations/*.sql; do
  # Strip full-line SQL comments so commented Down blocks don't trip the lint.
  exec_sql=$(grep -vE '^[[:space:]]*--' "$f" || true)
  if printf '%s\n' "$exec_sql" | grep -iqE 'drop[[:space:]]+(table|column|function|trigger|policy|index|view|type|schema|sequence|materialized)|alter[[:space:]].*[[:space:]]drop[[:space:]]|[[:space:]]rename[[:space:]]|truncate[[:space:]]|set[[:space:]]+not[[:space:]]+null|add[[:space:]]+constraint|alter[[:space:]]+column[[:space:]].*[[:space:]]type[[:space:]]|disable[[:space:]]+row[[:space:]]+level|revoke[[:space:]]'; then
    if ! grep -qE 'expand-contract-ok:' "$f"; then
      echo "❌ $(basename "$f"): destructive/tightening op without an '-- expand-contract-ok: <reason>' annotation"
      fail=1
    fi
  fi
done

[ "$fail" -eq 0 ] && echo "✅ G4 expand/contract lint: all migrations additive-only (or annotated)."
exit "$fail"
