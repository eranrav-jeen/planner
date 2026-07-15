# Jeen Project Planner

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
- [x] **Phase 1 — Core CRUD**: Customers, Employees, Projects (API + list/detail/forms), project team assignments.
- [x] **Phase 2 — Monthly Planning**: allocations API (range query, bulk upsert, copy-forward), capacity overrides API, planning grid UI (by-employee and by-project pivots, inline edit, utilization heatmap colors, month window controls, copy-forward).
- [x] **Phase 3 — Reports & Dashboard**: six report services (utilization, demand/capacity, project burn, profitability, customer portfolio, revenue forecast) + filterable/sortable report pages, and a dashboard with live cards, at-risk list, revenue chart, and team utilization heatmap.
- [x] **Phase 4 — Gantt**: `GET /api/gantt/projects` + a project Gantt at `/gantt` (`gantt-task-react`) grouped by customer (collapsible), colored by status, progress fill from hours consumed, week/month/quarter zoom, hover tooltip, click-through to project detail. Resource Gantt (per-employee) is out of scope for v1 per spec §4.7.
- [x] **Phase 5 — Exports**: `GET /api/export/:report.:format` (xlsx via ExcelJS — frozen header, column formats, totals row, title/meta block; pdf via Puppeteer — print-styled HTML template with the Jeen logo) for all six reports plus the Gantt. Excel/PDF buttons on every report page and the Gantt page trigger real downloads.
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
5. Add `deploy/backup.sh` to root's crontab for nightly `pg_dump` backups (14-day retention by default).
6. CI/CD: `.github/workflows/deploy.yml` runs on push to `main` — installs, typechecks, builds, runs `prisma migrate deploy`, then deploys over SSH and reloads pm2. Configure these repo secrets: `DATABASE_URL`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.

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
- Customers/Employees/Projects lists paginate at 25 rows per page. The Planning grid and Gantt don't paginate — at the spec's target scale (~200 employees × ~300 projects) they still render comfortably as plain tables since only the *parent* rows are always mounted (project/employee detail rows only mount when expanded), so a virtualization library isn't pulled in for something DOM-light. The one place row count could genuinely explode — the Employee Utilization report (up to employees × months rows) — got a virtualization pass with `@tanstack/react-virtual` that was reverted after shipping a real bug (rows and the totals footer interleaving mid-scroll); it's back to a plain table. If utilization data grows into the thousands of rows, revisit virtualization there specifically, testing the scroll-container height measurement carefully before shipping it.
- The API sets standard security headers via `helmet` (CSP, HSTS, `X-Frame-Options`, etc.). CORS is locked to same-origin in production (`origin: false`) since nginx serves both the API and the static frontend from the same domain; only the `/auth` routes are rate-limited (20 requests / 15 min) per spec.
