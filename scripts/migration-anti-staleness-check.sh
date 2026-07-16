#!/usr/bin/env bash
# G3 — anti-staleness gate. The live iOS consumer is a DISTRIBUTION of shipped App Store builds, so
# schema can only be retired once the ios-consumer contract covers the union of field versions with
# live traffic. This gate reads the field-support manifest; a destructive migration goes red if the
# contract is behind either edge (min-supported OR latest-released).
#
# Until an iOS build ships, both edges are null: the gate is ARMED but trivially satisfied. When
# versions populate, extend this to diff the ios-consumer contract against the min/latest requirements.
set -euo pipefail

MANIFEST="supabase/contracts/field-support-manifest.json"
[ -f "$MANIFEST" ] || { echo "❌ G3: missing field-support manifest ($MANIFEST)"; exit 1; }

min=$(grep -oE '"min_supported"[[:space:]]*:[[:space:]]*[^,}]+' "$MANIFEST" | sed -E 's/.*:[[:space:]]*//')
latest=$(grep -oE '"latest_released"[[:space:]]*:[[:space:]]*[^,}]+' "$MANIFEST" | sed -E 's/.*:[[:space:]]*//')

if [ "$min" = "null" ] && [ "$latest" = "null" ]; then
  echo "✅ G3 anti-staleness: armed — no shipped iOS build yet (both edges null)."
  exit 0
fi

echo "G3: field edges min_supported=$min latest_released=$latest"
echo "⚠️  G3 not yet implemented for populated edges — extend before the first destructive migration."
# Fail closed once versions exist but the check isn't implemented, so a real contraction can't slip through.
exit 1
