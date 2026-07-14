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
#
# The GitHub deploy key (for `git clone`/`git pull` access to this private repo)
# is generated locally on THIS machine the first time you run the script — its
# private half never needs to leave the server. The script will print a public
# key and pause; add that as a read-only Deploy Key in the GitHub repo's
# Settings -> Deploy keys, then re-run this script to continue.
#
# Example:
#   export DOMAIN=planner.raviv360.com CERTBOT_EMAIL=you@example.com \
#          GIT_BRANCH=claude/new-session-6k49hf DB_PASSWORD=... JWT_SECRET=... \
#          ADMIN_EMAIL=admin@jeen.ai ADMIN_PASSWORD=...
#   bash bootstrap.sh

set -euo pipefail

: "${DOMAIN:?Set DOMAIN}"
: "${CERTBOT_EMAIL:?Set CERTBOT_EMAIL}"
: "${GIT_BRANCH:?Set GIT_BRANCH}"
: "${DB_PASSWORD:?Set DB_PASSWORD}"
: "${JWT_SECRET:?Set JWT_SECRET}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD}"

REPO_SSH_URL="git@github.com:eranrav-jeen/planner.git"
APP_DIR="/var/www/jeen-project-planner"
DB_NAME="jeen_planner"
DB_USER="jeen_planner"
GH_KEY_PATH=~/.ssh/jeen_planner_github_deploy

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
sudo -E apt-get update -y
sudo -E apt-get install -y -o Dpkg::Options::="--force-confdef" curl git nginx postgresql postgresql-contrib \
  certbot python3-certbot-nginx build-essential \
  libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0

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
chmod 700 ~/.ssh
if [ ! -f "$GH_KEY_PATH" ]; then
  ssh-keygen -t ed25519 -f "$GH_KEY_PATH" -N "" -C "jeen-planner-server-$(hostname)"
fi
chmod 600 "$GH_KEY_PATH"
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null || true
if ! grep -q "Host github.com" ~/.ssh/config 2>/dev/null; then
  cat >> ~/.ssh/config <<EOF

Host github.com
  HostName github.com
  User git
  IdentityFile $GH_KEY_PATH
  IdentitiesOnly yes
EOF
  chmod 600 ~/.ssh/config
fi

ssh_output=$(ssh -T git@github.com -o BatchMode=yes -o StrictHostKeyChecking=accept-new 2>&1 || true)
if [[ "$ssh_output" != *"successfully authenticated"* ]]; then
  echo ""
  echo "=================================================="
  echo "Add this deploy key to the GitHub repo (read-only is fine),"
  echo "then re-run this script: Settings -> Deploy keys -> Add deploy key"
  echo "--------------------------------------------------"
  cat "${GH_KEY_PATH}.pub"
  echo "=================================================="
  exit 1
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
