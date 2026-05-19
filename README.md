# DentApp — Dental Clinic Management System

A full-stack practice management system for dental clinics built with Next.js 16, Prisma and PostgreSQL. Covers the complete patient lifecycle: scheduling, clinical records, inventory, billing, legal compliance, and automated communications.

---

## Features

| Module | Description |
|---|---|
| **Multi-tenancy** | Each clinic is an isolated tenant (Organization); all data scoped by `organizationId`; module activation per clinic |
| **Super Admin Panel** | Platform-owner panel at `/superadmin`; create/suspend organizations, configure contracted modules per clinic |
| **Authentication** | JWT sessions with bcrypt password hashing, HTTP-only cookies, 7-day expiry; `SUPER_ADMIN`, `ADMIN`, and `DOCTOR` roles |
| **Module Gating** | Two-level: org enables modules (contracted features), doctor gets granted subset; sidebar and routes enforce access |
| **Doctor Login** | Doctors log in via the same `/login` page; redirected to first accessible module or `/no-access`; managed by admin |
| **Administration** | Doctors and procedures CRUD with soft-delete and active/inactive toggle; doctor login and module permission management |
| **Patients** | Registration, search/pagination, minor guardianship, Habeas Data consent tracking; doctors see only their own patients |
| **Clinical History** | Odontogram (32 teeth × 5 surfaces), clinical notes by type, file attachments via Vercel Blob, PDF export |
| **Scheduling** | Weekly/monthly calendar (react-big-calendar), doctor-based availability slots, appointment management |
| **Inventory** | Stock control, low-stock alerts, audit log, 7 built-in categories, multiple units |
| **Billing (Caja)** | Payment records, partial payments, `PENDIENTE → ABONO_PARCIAL → PAGADO` state machine, electronic invoicing hook |
| **AI Assistant** | Claude-powered chat with read/write tools and human-in-the-loop confirmation for write actions; org-scoped |
| **Legal Compliance** | AES-256-GCM field-level encryption for PII, data export, patient anonymization, RIPS export (Resolution 2275/2023) |
| **WhatsApp** | Automated 24-hour appointment reminders via Inngest job queue + Meta Graph API |
| **QA Suite** | Vitest unit tests + Playwright E2E tests: user flows, module gating, doctor login, WCAG 2.1 accessibility audits |

---

## Tech Stack

**Runtime & Framework**
- [Next.js 16](https://nextjs.org) (App Router) + React 19
- TypeScript 5 with `strict` and `noUncheckedIndexedAccess`

**Data**
- [PostgreSQL](https://postgresql.org) via [Prisma 5](https://prisma.io) ORM
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for file storage

**Auth & Security**
- [Jose](https://github.com/panva/jose) — JWT HS256 signed sessions
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — password hashing (cost factor 12)
- AES-256-GCM field encryption for all patient PII (`lib/crypto.ts`)

**UI**
- [Tailwind CSS 4](https://tailwindcss.com)
- [Lucide React](https://lucide.dev) — icons
- [Sonner](https://sonner.emilkowal.ski) — toast notifications
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) — form validation
- [React Big Calendar](https://jquense.github.io/react-big-calendar/) — scheduling calendar
- [@react-pdf/renderer](https://react-pdf.org) — clinical history PDF export

**Integrations**
- [Anthropic Claude SDK](https://docs.anthropic.com) — AI assistant
- [Inngest](https://inngest.com) — durable job queue for WhatsApp reminders
- Meta Graph API v20.0 — WhatsApp Business messaging
- Siigo — electronic invoicing (mock in development)

**Testing**
- [Vitest](https://vitest.dev) 4.1 — unit tests for services and core logic (`tests/unit/`)
- [Playwright](https://playwright.dev) 1.59 — E2E tests (chromium + tablet viewports)
- [axe-playwright](https://github.com/abhinaba-ghosh/axe-playwright) — WCAG 2.1 A/AA accessibility audits
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) — performance budgets

---

## Architecture

The project follows a clean layered architecture with strict dependency direction:

```
UI (React Server / Client Components)
    ↓
API Routes (app/api/**/route.ts)
    ↓
Services (lib/services/*.service.ts)      ← business logic only
    ↓
Repositories (lib/repositories/*.repository.ts)  ← data access only
    ↓
Prisma Client (lib/db.ts)
```

Key conventions:
- Services never import `db` directly — always through a repository
- API routes handle HTTP concerns only; business logic lives in services
- All PII fields are encrypted/decrypted at the repository boundary
- External integrations are isolated in `lib/integrations/`
- Every data-access call carries `organizationId` — full tenant isolation at the DB layer
- `lib/modules.ts` (`server-only`) gates access; `lib/module-metadata.ts` (client-safe) holds display metadata
- Super admin routes (`/superadmin/**`) live under the `(superadmin)` route group with its own layout; they call `verifySuperAdmin()` and never share code with the clinic dashboard

### Super Admin Panel

The platform owner (role `SUPER_ADMIN`) manages all clinics from `/superadmin/organizations`. The panel lets the owner:
- Create new organizations (atomically creates org + admin user + all 5 OrgModule rows in one transaction)
- Suspend or reactivate organizations (suspended org users cannot log in)
- Toggle which AppModules a clinic has contracted (cascades: disabling a module also revokes all DoctorModulePermissions for that module)

`SUPER_ADMIN` users have `organizationId = null`. `verifySession()` blocks them from the clinic dashboard; `verifySuperAdmin()` blocks everyone else from the super admin panel.

### Multi-tenancy & Module Gating

Each clinic is an **Organization**. All models carry `organizationId`; Prisma queries always include it in `where` clauses.

Module access uses two levels:
1. **Org-level** (`OrgModule`): admin toggles which features the clinic has contracted
2. **Doctor-level** (`DoctorModulePermission`): admin grants a subset to each doctor

`getAccessibleModules(orgId, role, doctorId)` returns a `Set<AppModule>`. Layout calls it once (cached with `React.cache`); pages call `assertModuleAccess()` which throws `ForbiddenError` (HTTP 403) if the module is not accessible.

### Doctor Login

Admin enables login for a doctor via the doctor edit form → `POST /api/admin/doctors/[id]/login` creates a linked `User` with `role=DOCTOR`. On login, the action detects role, resolves the first accessible module, and redirects to it. Doctors with no modules land on `/no-access`.

---

## Prerequisites

- Node.js 20+
- PostgreSQL database (free options: [Neon](https://neon.tech) or [Supabase](https://supabase.com))
- npm 10+

---

## Getting Started

### 1. Clone and install

```bash
git clone git@github.com:JuanPabloGomezVasquez/dental_app.git
cd dental_app
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the required values (see [Environment Variables](#environment-variables) below).

### 3. Set up the database

```bash
# Push schema to your database
npx prisma db push

# Seed the admin user and default inventory categories
npx prisma db seed
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Default credentials** (created by the seed):

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@dentapp.com` | `superadmin123` |
| Clinic Admin | `admin@clinica.com` | `admin123` |

> Change these credentials immediately in any environment exposed to the internet.

---

## Environment Variables

Copy `.env.example` to `.env.local` and set the following:

### Required — core

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random secret ≥ 32 chars for JWT signing (`openssl rand -base64 32`) |
| `FIELD_ENCRYPTION_KEY` | 64-char hex string for AES-256-GCM PII encryption (`openssl rand -hex 32`) |
| `NEXTAUTH_URL` | Public URL of the app (e.g. `http://localhost:3000`) |

### Required in production — integrations

| Variable | Description |
|---|---|
| `INNGEST_EVENT_KEY` | Inngest event key — [app.inngest.com](https://app.inngest.com) |
| `INNGEST_SIGNING_KEY` | Inngest signing key |
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API permanent token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `WHATSAPP_TEMPLATE_NAME` | Approved Meta message template name |

### Optional — legal / invoicing

| Variable | Description |
|---|---|
| `DATABASE_URL_TEST` | Separate DB for E2E tests (avoids polluting dev data) |
| `NIT_CONSULTORIO` | Clinic NIT for RIPS export |
| `RIPS_MUNICIPIO_CODE` | Municipality code (RIPS Resolution 2275/2023) |
| `RIPS_COD_PRESTADOR` | Healthcare provider code |
| `SIIGO_API_KEY` | Siigo electronic invoicing API key |
| `SIIGO_ACCOUNT_ID` | Siigo account ID |

> Integrations that are not configured (WhatsApp, Siigo) run in **mock/no-op mode** in development — appointments and payments work normally without them.

---

## Database Schema

```
Organization         — one per clinic; root tenant anchor
  ├── OrgModule[]    — which AppModules the clinic has enabled
  ├── User[]         — ADMIN or DOCTOR role; always linked to an Organization
  └── Doctor[]       — userId? → linked User for login; organizationId
        └── DoctorModulePermission[] — per-module grant for this doctor

Patient              — patients (PII fields encrypted at rest; organizationId)
  └── ClinicalHistory
        ├── ClinicalNote     — INGRESO / EVOLUCION / PROCEDIMIENTO / INTERCONSULTA / EGRESO
        ├── OdontogramEntry  — per-tooth, per-surface status
        └── PatientFile      — Vercel Blob references
Appointment          — links Patient + Doctor + Procedure + DateTime; organizationId
Procedure            — treatments (with optional CUPS code for RIPS); organizationId
InventoryCategory → InventoryItem → StockLog[]   (all with organizationId)
CajaRecord           — billing record (PENDIENTE → ABONO_PARCIAL → PAGADO); organizationId
  └── Payment        — individual payment entries (EFECTIVO / TRANSFERENCIA / TARJETA_*)
```

**AppModule enum:** `APPOINTMENTS | PATIENTS | INVENTORY | CAJA | AI_ASSISTANT`
**UserRole enum:** `SUPER_ADMIN | ADMIN | DOCTOR`

`SUPER_ADMIN` users have `organizationId = null` and access only `/superadmin/**` routes. `ADMIN` and `DOCTOR` have a non-null `organizationId` and access only `/(dashboard)/**` routes. The session layer enforces this split via `verifySuperAdmin()` and `verifySession()` respectively.

---

## Available Scripts

```bash
npm run dev                  # Start development server
npm run build                # Generate Prisma client + Next.js production build
npm run start                # Start production server
npm run lint                 # Run ESLint
npm run test:unit            # Run Vitest unit tests (single run)
npm run test:unit:watch      # Run Vitest in watch mode
npm run test:unit:coverage   # Run Vitest with V8 coverage report
npm run test:e2e             # Run Playwright E2E test suite
npm run lighthouse           # Run Lighthouse CI performance audit
npx prisma db seed           # Seed admin user and default categories
npx prisma studio            # Open Prisma visual DB editor
```

---

## Running Tests

### Unit Tests (Vitest)

Unit tests run without a database — all dependencies are mocked.

```bash
npm run test:unit            # Single run
npm run test:unit:watch      # Watch mode (re-runs on save)
npm run test:unit:coverage   # Coverage report (V8)
```

**Test files:**
- `tests/unit/lib/modules.test.ts` — `getAccessibleModules`, `assertModuleAccess`
- `tests/unit/services/org-modules.service.test.ts` — org + doctor module permission logic
- `tests/unit/services/appointments.service.test.ts` — doctor-scoped data isolation
- `tests/unit/services/patients.service.test.ts` — doctor scoping + pagination
- `tests/unit/services/superadmin.service.test.ts` — org creation, suspension, module cascade disable

**Setup:** `tests/setup.ts` mocks `server-only` and `React.cache` (pass-through) so server-only imports and cached functions work in the test environment.

### E2E Tests (Playwright)

The E2E suite requires a running dev server and a configured database.

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run all tests
npm run test:e2e

# Run a specific file
npx playwright test e2e/flows/appointment.spec.ts

# Open Playwright UI mode
npx playwright test --ui
```

**Test projects:**
- `chromium` — desktop (1280×720), authenticated admin session
- `tablet` — 768×1024 with touch events, authenticated admin session

**Test coverage:**
- `e2e/flows/` — full user flows (patient creation, appointment scheduling, payment cycle)
- `e2e/flows/module-gating.spec.ts` — sidebar shows/hides modules; direct URL to disabled module → 403
- `e2e/flows/doctor-login.spec.ts` — doctor with modules → redirected; no modules → `/no-access`
- `e2e/flows/superadmin.spec.ts` — super admin login, org creation, module toggles, org suspension, suspended-org login block
- `e2e/a11y/` — WCAG 2.1 A/AA accessibility audit on all main routes
- `e2e/ux/` — Spanish error messages, responsive layout on tablet

> Configure `DATABASE_URL_TEST` in `.env.local` to run E2E tests against an isolated database.

---

## Project Structure

```
dental-app/
├── app/
│   ├── (auth)/login/          # Login page and server action
│   ├── (dashboard)/           # Clinic dashboard (ADMIN and DOCTOR roles)
│   │   ├── admin/             # Doctors, procedures, RIPS, settings
│   │   │   └── settings/      # Read-only module view (configured by super admin)
│   │   ├── appointments/      # Calendar and scheduling
│   │   ├── caja/              # Billing
│   │   ├── inventory/         # Stock management
│   │   ├── patients/          # Patient list and clinical history
│   │   ├── ai-assistant/      # Claude chat interface
│   │   └── no-access/         # Doctor with zero accessible modules
│   ├── (superadmin)/          # Platform owner panel (SUPER_ADMIN role only)
│   │   └── superadmin/organizations/
│   │       ├── page.tsx       # Org list
│   │       ├── new/           # Create org form
│   │       └── [id]/          # Org detail: module toggles + suspend/activate
│   ├── actions/auth.ts        # Login / logout server actions (role-aware redirect)
│   └── api/                   # API route handlers
│       ├── admin/doctors/[id]/
│       │   ├── login/         # POST (enable) / DELETE (disable doctor login)
│       │   └── modules/       # GET + PUT doctor module permissions
│       └── superadmin/organizations/
│           ├── route.ts       # GET (list) + POST (create)
│           ├── [id]/route.ts  # GET (detail) + PUT (update name/active)
│           └── [id]/modules/  # PUT (set module enabled)
├── components/
│   ├── admin/
│   │   ├── org-module-settings.tsx    # Read-only module view for clinic admin
│   │   └── doctor-permissions-panel.tsx # Per-doctor module grant panel
│   ├── superadmin/
│   │   ├── org-list-client.tsx        # Organization table with module chips
│   │   ├── org-form.tsx               # Create organization form
│   │   └── org-detail-client.tsx      # Module toggles + suspend/activate
│   └── layout/sidebar.tsx             # Dynamic sidebar driven by enabledModules[]
├── lib/
│   ├── crypto.ts              # AES-256-GCM field encryption
│   ├── session.ts             # JWT session management (role, orgId, doctorId)
│   ├── dal.ts                 # verifySession (→ DashboardSessionUser), verifySuperAdmin (→ SuperAdminSessionUser)
│   ├── modules.ts             # server-only: getAccessibleModules, assertModuleAccess
│   ├── module-metadata.ts     # client-safe: MODULE_METADATA, MODULE_ORDER
│   ├── repositories/          # Data access layer
│   │   ├── superadmin.repository.ts   # listOrganizations, findById, slugExists, create, update, setModule
│   │   └── ...
│   ├── services/              # Business logic layer
│   │   ├── superadmin.service.ts      # listOrganizations, getOrgDetail, createOrganization (tx), setOrgModule (cascade)
│   │   └── ...
│   ├── validations/           # Zod schemas (shared client + server)
│   │   └── organization.schema.ts     # createOrganizationSchema, updateOrganizationSchema, setOrgModuleSchema
│   └── integrations/
│       ├── anthropic/         # Claude AI tools and system prompt (org-scoped)
│       ├── rips/              # RIPS JSON mapper (Resolution 2275/2023)
│       ├── siigo/             # Electronic invoicing client
│       └── whatsapp/          # Meta Graph API client
├── inngest/
│   ├── client.ts              # Inngest instance
│   └── whatsapp-reminder.ts   # Durable reminder job function
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Organization + admin user + super admin + inventory categories
│   └── scripts/
│       └── backfill-default-org.ts  # One-time migration: link existing data to org
├── tests/
│   ├── setup.ts               # Vitest global setup (server-only + React.cache mocks)
│   └── unit/
│       ├── lib/modules.test.ts
│       └── services/
│           ├── superadmin.service.test.ts
│           ├── org-modules.service.test.ts
│           ├── appointments.service.test.ts
│           └── patients.service.test.ts
├── e2e/                       # Playwright test suite
│   ├── fixtures/              # Auth setup and DB helpers (getDefaultOrgId)
│   ├── flows/                 # User journey tests
│   │   ├── superadmin.spec.ts
│   │   ├── module-gating.spec.ts
│   │   └── doctor-login.spec.ts
│   ├── a11y/                  # Accessibility audits
│   └── ux/                    # Error messages and responsive tests
└── .agent/                    # AI agent behavior directives
    ├── ARCHITECT_AGENT.md
    └── CODER_AGENT.md
```

---

## Legal Compliance (Colombia)

This system implements the following Colombian regulatory requirements:

- **Habeas Data — Law 1581/2012**: explicit consent tracking per patient, data export endpoint (`GET /api/patients/[id]/export-data`), and patient anonymization (`POST /api/patients/[id]/anonymize`)
- **RIPS — Resolution 2275/2023**: structured JSON export of healthcare service records for regulatory reporting (`GET /api/rips/export`)
- **PII Encryption**: phone numbers and other sensitive fields are encrypted with AES-256-GCM before storage; legacy unencrypted values are handled transparently during migration

---

## Deployment

The application is ready for deployment on [Vercel](https://vercel.com). The `build` script runs `prisma generate` automatically.

1. Connect the GitHub repository to Vercel
2. Set all required environment variables in the Vercel dashboard
3. Run `npx prisma db push` against your production database once
4. Run `npx prisma db seed` to create the initial admin user

For the Inngest job queue, register the `/api/inngest` endpoint in your [Inngest dashboard](https://app.inngest.com) after the first deployment.

---

## License

Private — all rights reserved.
