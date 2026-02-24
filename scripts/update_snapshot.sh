#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

node scripts/build_lotto_snapshot.mjs
node scripts/build_powerball_snapshot.mjs

git add data/lotto_draws.json data/powerball_draws.json

if git diff --cached --quiet; then
  echo "No snapshot changes to commit."
  exit 0
fi

git commit -m "Update lotto snapshot data"

git push origin main

echo "Snapshot updated and pushed."
