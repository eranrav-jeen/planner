#!/usr/bin/env bash
# Fast redeploy for routine code changes. Run this ON THE SERVER from the app
# directory (or anywhere — it cds itself), as the user that owns the checkout.
#
# Unlike doing every step by hand, this skips `npm ci` and `npm run build`
# when nothing relevant changed, since those are the two slow steps
# (npm ci alone is ~2 minutes) and most commits don't touch dependencies.
#
# What counts as "changed" is tracked via a marker file (.deploy/last-built-sha),
# NOT git HEAD — HEAD only tells you what's checked out, not what was actually
# built. If that marker is missing, or the working tree doesn't match it (e.g.
# someone ran `git reset --hard` by hand, or a previous run partially failed),
# this does a full rebuild rather than guessing. Silently skipping a build is
# far worse than an unnecessary one.
#
# Usage:
#   bash deploy/redeploy.sh [branch]     # branch defaults to main
set -euo pipefail

APP_DIR="/var/www/jeen-project-planner"
BRANCH="${1:-main}"
MARKER_FILE="$APP_DIR/.deploy/last-built-sha"

cd "$APP_DIR"
mkdir -p "$(dirname "$MARKER_FILE")"

echo "==> Fetching origin/${BRANCH}"
git fetch origin "$BRANCH"

CURRENT_HEAD="$(git rev-parse HEAD)"
NEW_SHA="$(git rev-parse "origin/${BRANCH}")"
LAST_BUILT_SHA=""
[ -f "$MARKER_FILE" ] && LAST_BUILT_SHA="$(cat "$MARKER_FILE")"

if [ -n "$LAST_BUILT_SHA" ] && [ "$LAST_BUILT_SHA" = "$NEW_SHA" ] && [ "$CURRENT_HEAD" = "$NEW_SHA" ]; then
  echo "==> Already built ${NEW_SHA:0:7} — nothing to deploy."
  exit 0
fi

if [ -z "$LAST_BUILT_SHA" ]; then
  echo "==> No record of what was last built here — doing a full rebuild to be safe."
  CHANGED_FILES="$(printf 'apps/\nprisma/\npackage-lock.json\n')"
else
  CHANGED_FILES="$(git diff --name-only "$LAST_BUILT_SHA" "$NEW_SHA")"
  echo "==> Deploying ${LAST_BUILT_SHA:0:7} -> ${NEW_SHA:0:7}"
  echo "$CHANGED_FILES" | sed 's/^/    /'
fi

git reset --hard "origin/${BRANCH}"

if echo "$CHANGED_FILES" | grep -q '^package-lock\.json$'; then
  echo "==> package-lock.json changed — running npm ci"
  npm ci
else
  echo "==> No dependency changes — skipping npm ci"
fi

echo "==> Regenerating Prisma Client"
# @prisma/client normally regenerates itself via its own postinstall hook during
# `npm ci`, which we often skip. `prisma migrate deploy` does NOT regenerate it,
# so a schema change without a package.json change would otherwise leave the
# server running a stale client (e.g. "Unknown argument" errors on new fields).
# This is cheap (a couple seconds, no network), so just always run it.
npx prisma generate

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

echo "$NEW_SHA" > "$MARKER_FILE"
echo "==> Done. Recorded ${NEW_SHA:0:7} as last built."
