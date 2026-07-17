# Jeen Solution OS

Internal project planning tool for Jeen.AI — customers, projects, employees, monthly resourcing plans, reports, and a Gantt view, exportable to Excel and PDF.

Built per `SPEC.md` (Phase 0–6 implemented; see **Build status** below).

## Stack

- **API**: Node.js + Express + TypeScript, Prisma (PostgreSQL), Zod validation, JWT auth (httpOnly cookie).
- **Web**: React + Vite + TypeScript, Tailwind CSS, TanStack Query, Radix primitives. RTL/Hebrew by default, English toggle in the top bar.
- **DB**: PostgreSQL.

## Local development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

npm run prisma:migrate   # create the schema
npm run prisma:seed      # admin user + app settings; set SEED_DEMO_DATA=true for sample customers/employees/projects/allocations too

npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:5173 (proxies /api to the API)
```

Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (defaults to `admin@jeen.ai` / whatever you set).

## Environment variables

See `.env.example`. Notable ones:

- `DEFAULT_MONTHLY_CAPACITY_HOURS=186` — default employee capacity per month.
- `PLANNING_WINDOW_MONTHS=6` — default window shown in the planning grid (Phase 2).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — bootstrap admin account created by `prisma/seed.ts`. Auth is simple email+password (bcrypt + JWT), no external SSO. Additional users (any role) are managed afterward from `/settings` in the app itself.
- `SEED_DEMO_DATA` — set to `true` to have `prisma/seed.ts` also insert sample customers/employees/projects/allocations. Leave unset/`false` in production.

## Build status (phased per SPEC.md §12)

- [x] **Phase 0 — Foundation**: monorepo, Prisma schema + seed, Express skeleton, JWT auth + roles, React shell (sidebar/topbar, RTL-ready i18n, login), deploy skeleton.
- [x] **Phase 1 — Core CRUD**: Customers, Employees, Projects (API + list/detail/forms), project team assignments. Customers also track an optional Jeen Solution OS license (has license, annual amount, current period start/end, whether the current period is paid, platform version, and the AI models installed) — editable from the customer form, shown in a "License" card on the customer detail page. Projects can have one purchase-order file attached (PDF/Word/Excel/image, 20MB max) — a "Purchase order" card on the project detail page lets Admin/Manager upload, replace, or remove it; anyone who can view the project can download it.
- [x] **Phase 2 — Monthly Planning**: allocations API (range query, bulk upsert, copy-forward), capacity overrides API, planning grid UI (by-employee and by-project pivots, inline edit, utilization heatmap colors, month window controls, copy-forward).
- [x] **Phase 3 — Reports & Dashboard**: six report services (utilization, demand/capacity, project burn, profitability, customer portfolio, revenue forecast) + filterable/sortable report pages, and a dashboard with live cards, at-risk list, revenue chart, and team utilization heatmap. The dashboard also reflects customer licensing: a "Licensed customers" stat card (count + total annual license revenue) and a "Licenses needing attention" list flagging any licensed customer whose current period is unpaid, expired, or expiring within 30 days — each links through to that customer.
- [x] **Phase 4 — Gantt**: `GET /api/gantt/projects` + a project Gantt at `/gantt` (`gantt-task-react`) grouped by customer (collapsible), colored by status, progress fill from hours consumed, week/month/quarter zoom, hover tooltip, click-through to project detail. Resource Gantt (per-employee) is out of scope for v1 per spec §4.7.
- [x] **Phase 5 — Exports**: `GET /api/export/:report.:format` (xlsx via ExcelJS — frozen header, column formats, totals row, title/meta block; pdf via Puppeteer — print-styled HTML template with the Jeen logo) for all six reports plus the Gantt and the Planning grid. Excel/PDF buttons on every report page and the Gantt page trigger real downloads; the Planning grid has an Excel-only button.
- [x] **Phase 6 — Polish & Ops**: Admin-only user management (`/settings` — create/edit/deactivate/delete logins, assign roles); consistent loading/error/empty states everywhere (with retry) instead of silent or stuck-loading failures; pagination controls on the Customers/Employees/Projects lists (previously silently capped at 25 rows with no way to see more — now fixed); `helmet` security headers on the API. Table virtualization was attempted for the Utilization report but reverted after it produced a rendering bug (rows and totals interleaving incorrectly) — see the Notes below for the reasoning and current scale limits.

## Deployment (Oracle Ubuntu host: nginx + pm2 + Postgres)

`deploy/bootstrap.sh` automates all of the below (Node, Postgres, nginx, certbot, pm2, and the Chromium system libs Puppeteer needs for PDF export) — see the script header for usage. The manual steps it replaces:

1. Provision PostgreSQL locally on the host, create a dedicated DB + user, set `DATABASE_URL`.
2. Puppeteer (used for PDF export) needs Chromium system libs on Ubuntu 24.04 (package names shifted to the `t64` suffix on this release):
   ```bash
   sudo apt-get install -y libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libxkbcommon0 \
     libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0
   ```
3. Copy `deploy/nginx.conf.example` to `/etc/nginx/sites-available/`, adjust, symlink into `sites-enabled`, obtain a TLS cert with `certbot --nginx -d planner.raviv360.com`.
4. Copy `deploy/ecosystem.config.js`, run `pm2 start deploy/ecosystem.config.js`, then `pm2 save && pm2 startup`.
5. Add `deploy/backup.sh` to root's crontab for nightly `pg_dump` backups (14-day retention by default) — it also tars up `apps/api/uploads` (uploaded PO files) alongside the DB dump, since those live on disk and aren't in Postgres.
6. CI/CD: `.github/workflows/deploy.yml` runs on push to `main` — installs, typechecks, builds, runs `prisma migrate deploy`, then deploys over SSH and reloads pm2. Configure these repo secrets: `DATABASE_URL`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`. Until those secrets are set, redeploy manually on the server instead (see below).

### Redeploying manually

For routine code changes (no new dependencies), run `bash deploy/redeploy.sh` on the server — it fetches `main`, and skips `npm ci`/`npm run build` when the diff since the last deploy shows no `package-lock.json`/`apps/`/`prisma/` changes, which is the common case and saves the ~2 minutes `npm ci` otherwise costs. It still always runs `prisma generate` and `prisma migrate deploy` (both fast no-ops when the schema hasn't changed) and `pm2 reload`. The `prisma generate` step matters even on schema-only changes with no dependency bump: `@prisma/client` normally regenerates itself via its own postinstall hook during `npm ci`, which this script often skips, and `prisma migrate deploy` does not regenerate the client on its own — skipping generate after a schema change leaves the server running a stale client (e.g. `Unknown argument` errors on newly-added fields). Pass a branch name as an argument to deploy something other than `main`.

"What changed" is tracked via a marker file (`.deploy/last-built-sha`, git-ignored), not git HEAD — HEAD only reflects what's checked out, not what was actually built. If that marker is missing, or doesn't match both the current HEAD and `origin/main` (e.g. someone ran `git reset --hard` by hand outside the script, or a previous run failed partway and never reached the end), it does a full rebuild rather than guessing — a redundant `npm ci`/build costs a couple of minutes; silently skipping a needed one ships stale code.

If you'd rather do it by hand, or `redeploy.sh` isn't present yet on the server, the equivalent full sequence is:
```bash
cd /var/www/jeen-project-planner
git fetch origin main
git reset --hard origin/main
npm ci
set -a; source apps/api/.env; set +a
npx prisma migrate deploy
npm run build
pm2 reload deploy/ecosystem.config.js
```
The `source apps/api/.env` step matters — `DATABASE_URL` lives there, not at the repo root, so `prisma migrate deploy` can't find it without that line.

## Notes

- Default currency is ILS; per-project currency field exists but multi-currency reporting isn't built.
- `cost_rate_hourly` / profitability figures are hidden from the `VIEWER` role.
- RTL (Hebrew) is the default locale; toggle to English from the top bar. UI strings are centralized in `apps/web/src/lib/i18n.tsx`.
- The Gantt chart itself always renders left-to-right (a `dir="ltr"` wrapper) regardless of app language — `gantt-task-react`'s own `rtl` mode has a bug that throws on render, and timelines conventionally stay LTR even in RTL apps. Its "Quarter" zoom maps to the library's `Year` view mode, the coarsest one it offers (it has no native quarter granularity).
- Deleting a customer, employee, or project is a **real, permanent delete** (not a soft deactivate) — Admin/Manager only. Deleting a project cascades its team assignments and monthly allocations. Deleting a customer is blocked while it still has projects (delete/reassign those first) so financial history is never silently orphaned. To mark something inactive without deleting it, just edit its status field instead.
- `prisma/seed.ts` always ensures the admin user and app settings exist, but only inserts sample customers/employees/projects/allocations when `SEED_DEMO_DATA=true` is set — so re-running it in production (e.g. via `deploy/bootstrap.sh` on every deploy) never resurrects demo data you've since deleted.
- Only Admins can reach `/settings` (user management); everyone else sees a plain "Admins only" message rather than a broken page. Users can't delete their own account or view others' passwords (obviously) — password resets go through the same form, leave it blank to keep the current one.
- The Planning grid has a Hours/% toggle: switch it to enter/view planned effort as a percentage of each employee's monthly capacity instead of raw hours (e.g. 50% of a 186h employee = 93h). Storage is always in hours underneath — the toggle is purely a display/input convenience, converted client-side, so no API or schema changes were needed. Parent (rollup) rows always show both, e.g. "77h (64%)".
- The Planning grid has a third "By customer" pivot alongside "By employee"/"By project": expanding an employee shows their hours rolled up per customer (summed across that customer's projects) instead of per individual project. It's read-only/display-only (a customer row can span several projects/allocations, so there's no single cell to edit) — use "By employee" or "By project" to actually enter hours.
- The Planning grid's Excel button (`GET /api/export/planning.xlsx`) exports whichever pivot/month window is currently selected, as a flat table (one row per employee+project, employee+customer, or per-project-employee depending on the active pivot) with a month column per visible month and a totals row/column — so the export never drifts from what's on screen. PDF export wasn't added for this one since a fixed-layout print page doesn't suit an arbitrary month window well.
- The Dashboard's "Contracted income" card combines project income with license revenue from customers whose current license period is active *today* (both `licensePeriodStart`/`licensePeriodEnd` set and today falls between them) — shown as one total with a breakdown subtitle (e.g. "₪1.69M projects + ₪225K active licenses"). This is deliberately narrower than the "Licensed customers" card's total annual license revenue, which counts every licensed customer regardless of whether their current period has actually started or already lapsed.
- A licensed customer's platform version is a fixed dropdown (`LICENSE_PLATFORM_VERSIONS` in `apps/api/src/schemas/customer.schema.ts`, mirrored in `apps/web/src/lib/licenseOptions.ts` — keep both in sync by hand, there's no shared package between the two workspaces) rather than a Prisma enum, so adding a new version later is a one-line change in both places instead of an enum migration. Models installed is a free-form `String[]`: the form shows a curated checklist grouped by vendor (Claude/OpenAI/Gemini/on-prem) plus a comma-separated "Other" field for anything not listed, since a hardcoded model enum would go stale the moment a new model ships.
- Customers/Employees/Projects lists paginate at 25 rows per page. The Planning grid and Gantt don't paginate — at the spec's target scale (~200 employees × ~300 projects) they still render comfortably as plain tables since only the *parent* rows are always mounted (project/employee detail rows only mount when expanded), so a virtualization library isn't pulled in for something DOM-light. The one place row count could genuinely explode — the Employee Utilization report (up to employees × months rows) — got a virtualization pass with `@tanstack/react-virtual` that was reverted after shipping a real bug (rows and the totals footer interleaving mid-scroll); it's back to a plain table. If utilization data grows into the thousands of rows, revisit virtualization there specifically, testing the scroll-container height measurement carefully before shipping it.
- The API sets standard security headers via `helmet` (CSP, HSTS, `X-Frame-Options`, etc.). CORS is locked to same-origin in production (`origin: false`) since nginx serves both the API and the static frontend from the same domain; only the `/auth` routes are rate-limited (20 requests / 15 min) per spec.
- Project PO uploads (`POST/GET/DELETE /api/projects/:id/po`) are stored as plain files on local disk under `apps/api/uploads/po/` (git-ignored, `multer` diskStorage with UUID-based filenames — the original filename/mime/size/upload date live in the `projects` table, not in the filename). This directory is untracked so `git reset --hard` during a redeploy won't touch it, but it also means it isn't covered by the git history — that's why `deploy/backup.sh` tars it up alongside the `pg_dump`. Accepted types: PDF, Word, Excel, JPEG/PNG, capped at 20MB. Uploading/replacing/deleting requires Admin/Manager; downloading is open to any authenticated role (same visibility as the rest of the project page, unlike cost/profitability which are Admin/Manager-only).
