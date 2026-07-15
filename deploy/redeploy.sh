#!/usr/bin/env bash
# Fast redeploy for routine code changes. Run this ON THE SERVER from the app
# directory (or anywhere — it cds itself), as the user that owns the checkout.
#
# Unlike doing every step by hand, this skips `npm ci` and `npm run build`
# when nothing relevant changed, since those are the two slow steps
# (npm ci alone is ~2 minutes) and most commits don't touch dependencies.
#
# Usage:
#   bash deploy/redeploy.sh [branch]     # branch defaults to main
set -euo pipefail

APP_DIR="/var/www/jeen-project-planner"
BRANCH="${1:-main}"

cd "$APP_DIR"

echo "==> Fetching origin/${BRANCH}"
git fetch origin "$BRANCH"

OLD_SHA="$(git rev-parse HEAD)"
NEW_SHA="$(git rev-parse "origin/${BRANCH}")"

if [ "$OLD_SHA" = "$NEW_SHA" ]; then
  echo "==> Already up to date at ${OLD_SHA:0:7} — nothing to deploy."
  exit 0
fi

CHANGED_FILES="$(git diff --name-only "$OLD_SHA" "$NEW_SHA")"
echo "==> Deploying ${OLD_SHA:0:7} -> ${NEW_SHA:0:7}"
echo "$CHANGED_FILES" | sed 's/^/    /'

git reset --hard "origin/${BRANCH}"

if echo "$CHANGED_FILES" | grep -q '^package-lock\.json$'; then
  echo "==> package-lock.json changed — running npm ci"
  npm ci
else
  echo "==> No dependency changes — skipping npm ci"
fi

echo "==> Running migrations"
set -a; source apps/api/.env; set +a
npx prisma migrate deploy

if echo "$CHANGED_FILES" | grep -qE '^(apps/|prisma/)'; then
  echo "==> App or schema files changed — running build"
  npm run build
else
  echo "==> No app/schema changes — skipping build"
fi

echo "==> Reloading pm2"
pm2 reload deploy/ecosystem.config.js

echo "==> Done."
