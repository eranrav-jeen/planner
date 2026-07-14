#!/usr/bin/env bash
# One-time (idempotent) provisioning for the Jeen Planner production server.
# Run this ON THE SERVER as a sudo-capable user (e.g. ubuntu), not on your laptop.
#
# Required environment variables (export these before running, do NOT hardcode
# them in this file or commit them anywhere):
#   DOMAIN            e.g. planner.raviv360.com
#   CERTBOT_EMAIL     contact email for Let's Encrypt expiry notices
#   GIT_BRANCH        branch to deploy, e.g. claude/new-session-6k49hf or main
#   DB_PASSWORD       password for the jeen_planner Postgres role
#   JWT_SECRET        random secret for signing session JWTs
#   ADMIN_EMAIL       bootstrap admin login email
#   ADMIN_PASSWORD    bootstrap admin login password
#   GITHUB_DEPLOY_KEY_PATH   path to the private half of the GitHub deploy key
#                            (see the companion instructions for how this gets here)
#
# Example:
#   export DOMAIN=planner.raviv360.com CERTBOT_EMAIL=you@example.com \
#          GIT_BRANCH=claude/new-session-6k49hf DB_PASSWORD=... JWT_SECRET=... \
#          ADMIN_EMAIL=admin@jeen.ai ADMIN_PASSWORD=... \
#          GITHUB_DEPLOY_KEY_PATH=~/.ssh/jeen_planner_github_deploy
#   bash bootstrap.sh

set -euo pipefail

: "${DOMAIN:?Set DOMAIN}"
: "${CERTBOT_EMAIL:?Set CERTBOT_EMAIL}"
: "${GIT_BRANCH:?Set GIT_BRANCH}"
: "${DB_PASSWORD:?Set DB_PASSWORD}"
: "${JWT_SECRET:?Set JWT_SECRET}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD}"
: "${GITHUB_DEPLOY_KEY_PATH:?Set GITHUB_DEPLOY_KEY_PATH}"

REPO_SSH_URL="git@github.com:eranrav-jeen/planner.git"
APP_DIR="/var/www/jeen-project-planner"
DB_NAME="jeen_planner"
DB_USER="jeen_planner"

echo "==> Installing system packages"
sudo apt-get update -y
sudo apt-get install -y curl git nginx postgresql postgresql-contrib \
  certbot python3-certbot-nginx build-essential

if ! command -v node >/dev/null || [[ "$(node -v)" != v20.* && "$(node -v)" != v22.* ]]; then
  echo "==> Installing Node.js 20.x"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null; then
  echo "==> Installing pm2"
  sudo npm install -g pm2
fi

echo "==> Configuring SSH access to GitHub (deploy key)"
mkdir -p ~/.ssh
GH_KEY_DEST=~/.ssh/jeen_planner_github_deploy
cp "$GITHUB_DEPLOY_KEY_PATH" "$GH_KEY_DEST"
chmod 600 "$GH_KEY_DEST"
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null || true
if ! grep -q "Host github.com" ~/.ssh/config 2>/dev/null; then
  cat >> ~/.ssh/config <<EOF

Host github.com
  HostName github.com
  User git
  IdentityFile $GH_KEY_DEST
  IdentitiesOnly yes
EOF
fi

echo "==> Cloning or updating the app"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown "$(whoami):$(whoami)" "$APP_DIR"
  git clone "$REPO_SSH_URL" "$APP_DIR"
fi
cd "$APP_DIR"
git fetch origin "$GIT_BRANCH"
git checkout "$GIT_BRANCH"
git reset --hard "origin/$GIT_BRANCH"

echo "==> Provisioning Postgres role + database"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "==> Writing apps/api/.env"
cat > "$APP_DIR/apps/api/.env" <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
PORT=4000
NODE_ENV=production
DEFAULT_CURRENCY=ILS
PLANNING_WINDOW_MONTHS=6
DEFAULT_MONTHLY_CAPACITY_HOURS=186
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
chmod 600 "$APP_DIR/apps/api/.env"

echo "==> Installing dependencies"
cd "$APP_DIR"
npm ci

echo "==> Running migrations"
set -a; source apps/api/.env; set +a
npx prisma migrate deploy

echo "==> Seeding demo data (safe to re-run — upserts only)"
npx tsx prisma/seed.ts

echo "==> Building apps"
npm run build

echo "==> Starting API under pm2"
pm2 describe jeen-planner-api >/dev/null 2>&1 && pm2 reload deploy/ecosystem.config.js || pm2 start deploy/ecosystem.config.js
pm2 save
echo "If this is the first time running pm2 on this box, run the 'sudo env ...' command"
echo "that 'pm2 startup' prints below, so the API survives a reboot:"
pm2 startup systemd -u "$(whoami)" --hp "$HOME" || true

echo "==> Configuring nginx"
sudo tee /etc/nginx/sites-available/jeen-planner.conf > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    root ${APP_DIR}/apps/web/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri /index.html;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/jeen-planner.conf /etc/nginx/sites-enabled/jeen-planner.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> Requesting TLS certificate"
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect

echo ""
echo "=================================================="
echo "Done. https://${DOMAIN} should now be live."
echo "Admin login: ${ADMIN_EMAIL} / (the ADMIN_PASSWORD you set)"
echo "=================================================="
