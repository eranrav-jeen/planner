# Jeen Project Planner

Internal project planning tool for Jeen.AI — customers, projects, employees, monthly resourcing plans, reports, and a Gantt view, exportable to Excel and PDF.

Built per `SPEC.md` (Phase 0–4 implemented so far; see **Build status** below).

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
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — bootstrap admin account created by `prisma/seed.ts`. Auth is simple email+password (bcrypt + JWT), no external SSO.

## Build status (phased per SPEC.md §12)

- [x] **Phase 0 — Foundation**: monorepo, Prisma schema + seed, Express skeleton, JWT auth + roles, React shell (sidebar/topbar, RTL-ready i18n, login), deploy skeleton.
- [x] **Phase 1 — Core CRUD**: Customers, Employees, Projects (API + list/detail/forms), project team assignments.
- [x] **Phase 2 — Monthly Planning**: allocations API (range query, bulk upsert, copy-forward), capacity overrides API, planning grid UI (by-employee and by-project pivots, inline edit, utilization heatmap colors, month window controls, copy-forward).
- [x] **Phase 3 — Reports & Dashboard**: six report services (utilization, demand/capacity, project burn, profitability, customer portfolio, revenue forecast) + filterable/sortable report pages, and a dashboard with live cards, at-risk list, revenue chart, and team utilization heatmap.
- [x] **Phase 4 — Gantt**: `GET /api/gantt/projects` + a project Gantt at `/gantt` (`gantt-task-react`) grouped by customer (collapsible), colored by status, progress fill from hours consumed, week/month/quarter zoom, hover tooltip, click-through to project detail. Resource Gantt (per-employee) is out of scope for v1 per spec §4.7.
- [ ] **Phase 5 — Exports** (Excel via ExcelJS, PDF via Puppeteer).
- [ ] **Phase 6 — Polish & Ops** (virtualization, hardening, docs).

## Deployment (Oracle Ubuntu host: nginx + pm2 + Postgres)

1. Provision PostgreSQL locally on the host, create a dedicated DB + user, set `DATABASE_URL`.
2. Puppeteer (Phase 5) needs Chromium system libs on Ubuntu:
   ```bash
   sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
     libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0
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
