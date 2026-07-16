#!/usr/bin/env bash
# G4 — expand/contract lint. Migrations must be additive (EXPAND) unless a destructive op is explicitly
# justified. Flags DROP / ALTER…DROP / SET NOT NULL / ADD CONSTRAINT / type change that appears as
# EXECUTABLE SQL (not inside a commented `-- Down` block) and lacks an `-- expand-contract-ok: <reason>`
# annotation in the same file. Additive-only migrations pass with no annotation.
set -euo pipefail

fail=0
shopt -s nullglob
for f in supabase/migrations/*.sql; do
  # Strip full-line SQL comments so commented Down blocks don't trip the lint.
  exec_sql=$(grep -vE '^[[:space:]]*--' "$f" || true)
  if printf '%s\n' "$exec_sql" | grep -iqE 'drop[[:space:]]+(table|column|function|trigger|policy|index)|alter[[:space:]].*[[:space:]]drop[[:space:]]|set[[:space:]]+not[[:space:]]+null|add[[:space:]]+constraint|alter[[:space:]]+column[[:space:]].*[[:space:]]type[[:space:]]'; then
    if ! grep -qE 'expand-contract-ok:' "$f"; then
      echo "❌ $(basename "$f"): destructive/tightening op without an '-- expand-contract-ok: <reason>' annotation"
      fail=1
    fi
  fi
done

[ "$fail" -eq 0 ] && echo "✅ G4 expand/contract lint: all migrations additive-only (or annotated)."
exit "$fail"
