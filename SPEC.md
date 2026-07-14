# Jeen Project Planner — Build Specification

> **Purpose of this document:** A complete, self-contained specification to hand to **Claude Code** for building an internal Project Planning web application for **Jeen.AI**. It defines the domain, features, data model, API, design system, tech stack, and a phased build plan. Read it top-to-bottom before scaffolding, then implement phase by phase (Section 12).

---

## 1. Overview & Goals

Jeen.AI runs customer delivery projects. The team needs one place to track **who is working on what, for which customer, how much it earns, and how many paid hours remain** — plus forward-looking **monthly resource plans**, **reports**, and a **Gantt** view, all exportable to **Excel** and **PDF**.

### Primary goals
1. Maintain a single source of truth for **Customers**, **Projects**, **Employees**, and the relationships between them.
2. For every project, track the **contracted income** and the **number of hours the customer paid for**, and show how those hours are being consumed.
3. Build a **monthly plan**: for each upcoming month, how much effort (hours) each employee is planned to spend on each project.
4. Produce **reports** (utilization, project burn, profitability, revenue forecast, customer portfolio) and a **Gantt** timeline.
5. **Export** any report and the Gantt to Excel (`.xlsx`) and PDF.

### Non-goals (out of scope for v1)
- Time tracking / timesheets integration (we capture *planned* hours and optional *actual* hours entered manually, not automated timesheets).
- Invoicing / accounting integration.
- Customer-facing portal (internal tool only).

---

## 2. Users & Roles

Internal-only tool behind authentication. Three roles:

| Role | Can do |
|------|--------|
| **Admin** | Everything: manage users, all CRUD, all reports/exports, settings. |
| **Manager** | CRUD on customers/projects/employees/allocations, view all reports, export. Cannot manage app users or settings. |
| **Viewer** | Read-only: view everything, run reports, export. No edits. |

- Auth: email + password (hashed with `bcrypt`), session via **JWT** (httpOnly cookie preferred; bearer token acceptable).
- **Assumption:** a `User` (login account) is separate from an `Employee` (domain record). A user *may* be linked to an employee record (`user.employeeId`), but not every employee needs a login. Flag if you'd rather unify them.

---

## 3. Domain Model

### 3.1 Entities & relationships (ERD)

```mermaid
erDiagram
    CUSTOMER ||--o{ PROJECT : "has"
    PROJECT  ||--o{ PROJECT_ASSIGNMENT : "staffed by"
    EMPLOYEE ||--o{ PROJECT_ASSIGNMENT : "assigned to"
    EMPLOYEE ||--o{ MONTHLY_ALLOCATION : "plans effort"
    PROJECT  ||--o{ MONTHLY_ALLOCATION : "receives effort"
    EMPLOYEE ||--o{ CAPACITY_OVERRIDE : "adjusts capacity"
    USER     }o--o| EMPLOYEE : "optional link"

    CUSTOMER {
        uuid id PK
        string name
        string contact_name
        string contact_email
        string status
        text notes
    }
    EMPLOYEE {
        uuid id PK
        string first_name
        string last_name
        string email
        string title
        string department
        string employment_type
        numeric monthly_capacity_hours
        numeric cost_rate_hourly
        boolean is_active
        date start_date
    }
    PROJECT {
        uuid id PK
        uuid customer_id FK
        string name
        string code
        string status
        date start_date
        date end_date
        numeric income_amount
        numeric hours_paid
        string currency
        string billing_type
        text description
    }
    PROJECT_ASSIGNMENT {
        uuid id PK
        uuid project_id FK
        uuid employee_id FK
        string role_on_project
    }
    MONTHLY_ALLOCATION {
        uuid id PK
        uuid employee_id FK
        uuid project_id FK
        date month
        numeric planned_hours
        numeric actual_hours
        text note
    }
    CAPACITY_OVERRIDE {
        uuid id PK
        uuid employee_id FK
        date month
        numeric capacity_hours
        string reason
    }
```

### 3.2 Field notes

**Customer** — `status` ∈ `active | prospect | inactive`.

**Employee**
- `monthly_capacity_hours` — default planning capacity per month (e.g. `160`). Used as the denominator for utilization.
- `cost_rate_hourly` — internal cost per hour (nullable). Used to compute project cost & margin. Restrict visibility of cost/margin to Admin + Manager.
- `employment_type` ∈ `full_time | part_time | contractor`.

**Project**
- `income_amount` — total contracted income (contract value).
- `hours_paid` — number of hours the customer paid for. Burn-down compares this against planned/actual allocated hours.
- `code` — short unique human code (e.g. `MACCABI-01`) for compact display in Gantt/reports.
- `status` ∈ `planning | active | on_hold | completed | cancelled`.
- `billing_type` ∈ `fixed_price | time_and_materials` (affects how forecast is interpreted; see §7).
- `currency` — default from app settings (see Open Questions; assume **ILS ₪**), ISO 4217 code stored.

**ProjectAssignment** — the *team* on a project (many-to-many Employee↔Project). Unique on `(project_id, employee_id)`. `role_on_project` free text or enum (e.g. `PM | Lead | Engineer | Consultant`).

**MonthlyAllocation** — **the heart of the monthly plan.** Grain = one row per `(employee, project, month)`.
- `month` stored as first-of-month `DATE` (e.g. `2026-08-01`).
- `planned_hours` — planned effort for that employee, on that project, that month.
- `actual_hours` — optional manual entry of what actually happened (for plan-vs-actual variance).
- Unique on `(employee_id, project_id, month)`.

**CapacityOverride** *(optional, Phase 2+)* — override an employee's capacity for a specific month (vacation, parental leave, part-month start). If absent, fall back to `employee.monthly_capacity_hours`.

### 3.3 Derived metrics (compute in queries/services, do **not** store)
- **Employee utilization (month)** = `Σ planned_hours (that employee, that month) / capacity(employee, month)`.
- **Project hours consumed** = `Σ planned_hours` (or `actual_hours` when present) across all months.
- **Project remaining hours** = `hours_paid − consumed`.
- **Project cost** = `Σ (hours × employee.cost_rate_hourly)`.
- **Project margin** = `income_amount − cost`; **margin %** = `margin / income_amount`.
- **Team demand vs capacity (month)** = `Σ planned_hours (all employees) vs Σ capacity`.

---

## 4. Functional Requirements

### 4.1 Customers
- List (search, filter by status, sort), create, edit, view, soft-delete/deactivate.
- Customer detail page shows all its projects with income, hours paid, status, and a portfolio summary (total income, total hours paid, active project count).

### 4.2 Employees
- List (search, filter by department/active), create, edit, view, deactivate.
- Employee detail shows current & upcoming allocations and a monthly utilization mini-chart.
- Cost rate field visible/editable only to Admin/Manager.

### 4.3 Projects
- List (filter by customer, status, date range), create, edit, view, archive.
- Project form captures: customer, name, code, status, start/end dates, income, hours paid, currency, billing type, description.
- Project detail page:
  - **Team** tab — manage assignments (add/remove employees, set role).
  - **Plan** tab — monthly allocation grid for this project's team (months × employees → planned hours).
  - **Burn** panel — hours paid vs consumed vs remaining (progress bar + number), income vs cost vs margin (Admin/Manager only).

### 4.4 Monthly Planning (core feature)
- A dedicated **Planning grid** — an editable matrix. Two useful pivots (provide a toggle):
  - **By employee:** rows = employees, columns = upcoming N months, cell = total planned hours that month (expandable to per-project breakdown).
  - **By project:** rows = employees on a project, columns = months, cell = planned hours.
- Cells editable inline; **bulk upsert** on save (single API call, see §6).
- Show a **month column footer/summary**: per employee, planned vs capacity with a color state:
  - green = under capacity, amber = near/at capacity (e.g. 90–100%), coral/red = over capacity (>100%).
- Default window: current month + next 6 months (configurable; allow choosing a range).
- Copy-forward helper: "copy this month's plan to next N months."

### 4.5 Dashboard
Landing page with at-a-glance cards + charts:
- Team utilization heatmap (employees × next 6 months).
- Active projects count, total contracted income, total paid hours vs consumed.
- Projects at risk (remaining hours < 10% or past end_date but not completed).
- Revenue by month (forecast) chart.

### 4.6 Reports (each is filterable and exportable to Excel + PDF)
1. **Employee Utilization** — per employee per month: planned hours, capacity, utilization %. Team totals row.
2. **Resource Demand vs Capacity** — per month: total demand (Σ planned) vs total capacity, gap.
3. **Project Burn** — per project: hours paid, consumed, remaining, % consumed, status, end date.
4. **Project Profitability** *(Admin/Manager)* — per project: income, cost, margin, margin %.
5. **Customer Portfolio** — per customer: # projects, active projects, total income, total hours paid.
6. **Revenue Forecast** — income recognized/expected per month (see §7 for method).

Every report supports: date-range filter, customer/employee/project filters where relevant, sortable columns, totals, and export buttons.

### 4.7 Gantt
- **Project Gantt:** one bar per project across its `start_date`–`end_date`, grouped by customer, colored by status. Show progress (= % hours consumed) as a fill within the bar. Zoom by week/month/quarter. Hover tooltip with key facts.
- Click a bar → open project detail.
- Export Gantt to **PDF** (rendered view) and **Excel** (underlying table: project, customer, start, end, status, % complete).
- *(Optional Phase 4+)* Resource Gantt showing per-employee allocation blocks over time.

### 4.8 Exports
- **Excel (`.xlsx`)** via **ExcelJS**: proper headers, frozen header row, column widths, number/currency formatting, a totals row, and a title/meta block (report name, filters, generated-at, Jeen logo optional).
- **PDF** via **Puppeteer** (server renders a print-styled HTML template to PDF for high fidelity, including charts/Gantt). *Lighter alternative:* `pdfmake` for table-only reports if Chromium deps are undesirable on the server — pick Puppeteer for v1 for Gantt fidelity, note the tradeoff.
- Exports run server-side and stream the file to the browser.

---

## 5. Non-Functional Requirements
- **Stack language:** TypeScript end-to-end.
- **Performance:** planning grid and reports should handle ~200 employees × ~300 projects × 24 months without noticeable lag; paginate/virtualize large tables; index the DB appropriately (see §3 keys and add composite indexes on `monthly_allocation(month, employee_id)` and `monthly_allocation(project_id, month)`).
- **Validation:** validate all inputs server-side with **Zod**; mirror on the client.
- **Auditability (light):** `created_at`/`updated_at` on all tables; optionally `created_by`/`updated_by`.
- **Security:** parameterized queries (Prisma handles this), role checks on every mutating endpoint, secrets only in env, HTTPS in production, rate-limit `/auth`.
- **Accessibility:** keyboard-navigable grid, sufficient contrast, semantic HTML.
- **i18n readiness:** keep UI strings centralized (Jeen is Israel-based; leave room for Hebrew/RTL later — not required for v1 but don't hardcode LTR-only layout assumptions where cheap to avoid).

---

## 6. API Design (REST, JSON, `/api` prefix)

Auth
- `POST /api/auth/login` → `{ token }` (or set cookie)
- `POST /api/auth/logout`
- `GET  /api/auth/me`

Customers / Employees / Projects (standard CRUD)
- `GET|POST /api/customers`, `GET|PUT|DELETE /api/customers/:id`
- `GET|POST /api/employees`, `GET|PUT|DELETE /api/employees/:id`
- `GET|POST /api/projects`, `GET|PUT|DELETE /api/projects/:id`
  - list endpoints accept `?search=&status=&customerId=&page=&pageSize=&sort=`

Assignments
- `GET /api/projects/:id/assignments`
- `POST /api/projects/:id/assignments` `{ employeeId, roleOnProject }`
- `DELETE /api/assignments/:id`

Allocations (monthly plan)
- `GET /api/allocations?from=YYYY-MM&to=YYYY-MM&employeeId=&projectId=` → rows for the grid
- `PUT /api/allocations` — **bulk upsert**: body `{ items: [{ employeeId, projectId, month, plannedHours, actualHours? }] }`; upsert on `(employeeId, projectId, month)`, delete rows set to 0/empty. Return the updated set.
- `POST /api/allocations/copy` `{ fromMonth, toMonths: [...], employeeId?, projectId? }` — copy-forward helper.

Reports (all accept filter query params; return JSON for the UI)
- `GET /api/reports/utilization`
- `GET /api/reports/demand-capacity`
- `GET /api/reports/project-burn`
- `GET /api/reports/profitability`  *(Admin/Manager)*
- `GET /api/reports/portfolio`
- `GET /api/reports/forecast`

Gantt
- `GET /api/gantt/projects?from=&to=&customerId=`

Exports (same filters as the source report; `format` ∈ `xlsx|pdf`)
- `GET /api/export/:report.:format` e.g. `/api/export/project-burn.xlsx`, `/api/export/gantt.pdf`

Settings / Users *(Admin)*
- `GET|PUT /api/settings` (default currency, planning window default, working hours)
- `GET|POST /api/users`, `PUT|DELETE /api/users/:id`

**Conventions:** consistent envelope `{ data, error? }`; validation errors return `422` with field messages; auth failures `401`; role failures `403`.

---

## 7. Revenue Forecast Method (make configurable)
Because billing types differ, compute forecasted/recognized revenue per month with a selectable method, defaulting sensibly per project:
- **Time & Materials** → `monthly revenue = Σ planned_hours × effective_rate`, where `effective_rate = income_amount / hours_paid` (blended rate). Recognize in the month effort is planned.
- **Fixed price** → spread `income_amount` across the project's active months, weighted by planned hours that month (fallback: even spread across `start_date`→`end_date`).

Expose the method on the forecast report so it can be sanity-checked. Keep the logic in one service (`forecast.service.ts`) so it's easy to change.

---

## 8. Design System (from the Jeen.AI logo)

The logo is a wordmark "**Jeen**" in charcoal beside an icon of three rounded tiles: a tall lavender bar, a coral tile, and an amber tile. Extracted brand colors:

| Token | Hex | Use |
|-------|-----|-----|
| `--charcoal` | `#232122` | Primary text, headers, sidebar, primary buttons |
| `--coral` | `#E45B4E` | Primary accent / key actions, "over capacity" / at-risk state |
| `--amber` | `#F3AB56` | Secondary accent, warnings, "near capacity" state |
| `--lavender` | `#E7B6EB` | Highlights, tags, selected states, chart accent |
| `--bg` | `#FAFAFA` | App background |
| `--surface` | `#FFFFFF` | Cards, tables |
| `--border` | `#E7E5E4` | Dividers, table borders |
| `--muted` | `#6B7280` | Secondary text |
| `--success` | `#3FA372` | "Under capacity", healthy states |

Suggested semantic mapping for the planning heatmap: `success` (under), `amber` (near/at 90–100%), `coral` (over >100%).

**Style direction:** clean, professional, enterprise-grade (matches Jeen's governance/enterprise positioning). Generous whitespace, **rounded corners (radius ~10–12px** to echo the logo tiles), subtle shadows, no heavy gradients.

**Typography:** **Inter** (or a similar geometric sans) for UI; charcoal for headings, `--muted` for secondary text. Tabular figures for all numeric columns.

**Layout:** left sidebar navigation (Dashboard, Customers, Projects, Employees, Planning, Reports, Gantt, Settings) + top bar (search, user menu). Content area with cards/tables.

**Assets:** the provided SVG logo goes in `apps/web/public/logo.svg`; generate a favicon from it. A small logo lockup in the sidebar header and on PDF export cover blocks.

> Before building any UI, Claude Code should read `/mnt/skills/public/frontend-design/SKILL.md` for this environment's component/styling conventions and apply the tokens above.

---

## 9. Tech Stack & Architecture

Chosen to fit the existing server (nginx, Node.js, PostgreSQL, pm2).

**Frontend**
- React 18 + TypeScript + **Vite**
- **Tailwind CSS** + **shadcn/ui** (Radix primitives) for components
- **TanStack Query** (server state) + **TanStack Table** (data grids, virtualization)
- **Recharts** for charts
- **Gantt:** `frappe-gantt` or `gantt-task-react` (evaluate; `gantt-task-react` is React-native and TS-friendly — prefer it unless it can't group by customer, in which case `frappe-gantt`)

**Backend**
- Node.js LTS (20/22) + **Express** + TypeScript
- **Prisma** ORM (migrations + typed client)
- **Zod** validation, **bcrypt** + **jsonwebtoken** auth
- **ExcelJS** (Excel export), **Puppeteer** (PDF export)

**Database:** PostgreSQL (dedicated DB + user).

**Repo:** single Git repo (monorepo) using npm workspaces.

```
jeen-project-planner/
├─ apps/
│  ├─ api/            # Express + Prisma backend
│  │  ├─ src/
│  │  │  ├─ routes/         # customers, employees, projects, allocations, reports, export, auth
│  │  │  ├─ services/       # business logic (forecast, burn, utilization, export)
│  │  │  ├─ middleware/     # auth, role guard, error handler, validation
│  │  │  ├─ lib/            # prisma client, jwt, excel, pdf
│  │  │  └─ index.ts
│  │  └─ package.json
│  └─ web/            # React + Vite frontend
│     ├─ src/
│     │  ├─ pages/         # Dashboard, Customers, Projects, Employees, Planning, Reports, Gantt, Settings
│     │  ├─ components/    # ui/, tables/, charts/, gantt/, planning-grid/
│     │  ├─ api/           # typed API client (TanStack Query hooks)
│     │  ├─ lib/           # theme tokens, formatters (currency, hours, %)
│     │  └─ main.tsx
│     ├─ public/logo.svg
│     └─ package.json
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts           # demo customers/employees/projects/allocations
├─ deploy/
│  ├─ ecosystem.config.js   # pm2
│  ├─ nginx.conf.example
│  └─ backup.sh             # pg_dump cron script
├─ .github/workflows/deploy.yml
├─ .env.example
└─ README.md
```

**Runtime topology (production):**
- **nginx** serves the built React static files and reverse-proxies `/api` → Node app on `localhost:PORT`.
- **pm2** runs the Node API (`deploy/ecosystem.config.js`), auto-restart + startup on boot.
- **PostgreSQL** local on the server; connection via `DATABASE_URL` env.
- Puppeteer needs Chromium system libs — install them on the Ubuntu host (document the `apt` packages in README) or use `puppeteer`'s bundled Chromium.

---

## 10. Deployment & Infrastructure

**GitHub:** repo under **`@eranrav-jeen`** (e.g. `eranrav-jeen/jeen-project-planner`), default branch `main`, protected.

**CI/CD (`.github/workflows/deploy.yml`):** on push to `main` → install, typecheck, build both apps, run `prisma migrate deploy`, then deploy to the Oracle Ubuntu server over **SSH** (use `appleboy/ssh-action` or an rsync step) and `pm2 reload ecosystem.config.js`. Store server host/user/SSH key and `DATABASE_URL` as **GitHub Actions secrets**.

**nginx (`deploy/nginx.conf.example`):**
- server block for the app domain, TLS (Let's Encrypt / certbot),
- `location /` → serve `apps/web/dist`,
- `location /api` → `proxy_pass http://127.0.0.1:PORT`.

**pm2 (`deploy/ecosystem.config.js`):** one app (the API), `env` for `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `JWT_SECRET`. Enable `pm2 startup` + `pm2 save`.

**Backups (`deploy/backup.sh`):** nightly `pg_dump` to a timestamped file, retain N days; add to cron. Document in README.

**Env (`.env.example`):**
```
DATABASE_URL=postgresql://USER:PASS@localhost:5432/jeen_planner
JWT_SECRET=change_me
PORT=4000
NODE_ENV=production
DEFAULT_CURRENCY=ILS
PLANNING_WINDOW_MONTHS=6
```

**Secrets:** never commit `.env`; provide `.env.example` only.

---

## 11. Seed & Demo Data
Provide `prisma/seed.ts` that inserts: 1 admin user, ~8 employees (varied capacity/cost), ~4 customers, ~6 projects (mix of statuses, income, hours paid), assignments, and 6 months of monthly allocations — enough to make the dashboard, reports, and Gantt look real on first run.

---

## 12. Build Plan (phased — implement in order)

**Phase 0 — Foundation**
- Scaffold monorepo, TypeScript, lint/format, `.env.example`, README.
- Prisma schema (§3) + first migration + seed.
- Express server skeleton, health check, error handler, Zod setup.
- Auth (login, JWT, `me`, role middleware). React app shell: sidebar/topbar, routing, theme tokens (§8), login page.
- pm2 + nginx example + GitHub Actions deploy skeleton.

**Phase 1 — Core CRUD**
- Customers, Employees, Projects CRUD (API + UI: list/detail/forms).
- Project assignments (team management).

**Phase 2 — Monthly Planning**
- Allocations API (bulk upsert, range query, copy-forward).
- Planning grid UI (both pivots), inline edit, capacity color states, month summaries.
- Capacity overrides (optional here or Phase 3).

**Phase 3 — Reports & Dashboard**
- Report services (utilization, demand/capacity, burn, profitability, portfolio, forecast).
- Report pages (filters, sortable tables, totals) + dashboard cards/charts.

**Phase 4 — Gantt**
- Project Gantt grouped by customer, colored by status, progress fill, zoom, click-through.

**Phase 5 — Exports**
- ExcelJS export for every report + Gantt table.
- Puppeteer PDF export (print templates, logo header) for reports + Gantt.

**Phase 6 — Polish & Ops**
- Role-based UI gating, empty/loading/error states, table virtualization.
- Backup script + cron, deploy hardening, docs.

Each phase should end in a working, deployable state.

---

## 13. Acceptance Criteria (v1 "done")
- [ ] Auth with 3 roles; role checks enforced server-side.
- [ ] Full CRUD for customers, employees, projects; team assignment works.
- [ ] Every project stores income + hours paid; burn (paid vs consumed vs remaining) is visible.
- [ ] Monthly planning grid: edit planned hours per employee/project/month, capacity color states, copy-forward, bulk save.
- [ ] All six reports render with correct numbers and totals, respect filters.
- [ ] Dashboard shows utilization heatmap, active projects, income totals, at-risk projects, revenue-by-month.
- [ ] Gantt renders projects grouped by customer with status colors and progress.
- [ ] Excel and PDF export work for every report and the Gantt.
- [ ] Deployed on the Oracle Ubuntu server via nginx + pm2, with GitHub Actions deploying from `main`.
- [ ] Nightly Postgres backup configured.

---

## 14. Open Questions / Assumptions to Confirm
1. **Default currency** — assumed **ILS (₪)**. Single currency app-wide, or per-project currency with display conversion? (Per-project field exists; multi-currency reporting not built unless confirmed.)
Answer: ILS
2. **Working-hours basis** — assumed **160 h/month** default capacity, editable per employee. Confirm.
Answer: 186
3. **Actual hours** — captured as *optional manual* entry for plan-vs-actual. Is that enough, or do you want timesheet import later?
Answer: This is enough
4. **Cost & margin** — do you track internal `cost_rate_hourly` per employee for profitability? If not, drop the profitability report (or make it optional).
Answer: optional
5. **User vs Employee** — kept separate with optional link. Prefer unified (every employee logs in)?
Answer: it is required for admins only
6. **Auth provider** — email/password assumed. Would you rather use Google Workspace SSO (Jeen domain)? 
Answer: Simple auth (user and password provided in the .env) is enough
7. **PDF engine** — Puppeteer (best fidelity, needs Chromium on host) vs pdfmake (lighter, table-only). Assumed Puppeteer.
Answer: yes
8. **Hebrew / RTL** — not required for v1; built "i18n-ready." Confirm English-only is fine to start. 
Answer: Heb/RTL from the first version
9. **Domain/host** — what domain will nginx serve, and is TLS via certbot acceptable?
Answer: planner.raviv360.com

---

*Prepared for Claude Code. Brand colors sampled directly from the supplied Jeen.AI logo. Adjust Section 14 answers, then build Phase 0 → Phase 6.*
