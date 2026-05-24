# PROJECT_MAP — DentApp

Quick-reference document. Read this first; then navigate to the specific files named here.

---

## Layered Architecture

```
Browser (React Client Components)
  ↓ fetch / form actions
app/api/**/route.ts          — HTTP handlers, HTTP concerns only
  ↓
lib/services/*.service.ts    — business logic, validation, orchestration
  ↓
lib/repositories/*.repository.ts  — DB access, PII encryption/decryption
  ↓
lib/db.ts (PrismaClient singleton)
```

**Hard rules:**
- Services never import `db` directly
- API routes contain no business logic
- PII encryption happens **only** in the patients repository (`phone`, `email`, `address`, `guardianPhone`)
- `lib/dal.ts` → `verifySession()` protects all dashboard routes; `verifySuperAdmin()` protects `/superadmin/**` routes (both cached with `React.cache`)
- Every DB query includes `organizationId` — tenant data never leaks across orgs
- `lib/modules.ts` is `server-only`; `lib/module-metadata.ts` is client-safe (sidebar imports it)
- `SUPER_ADMIN` users have `organizationId = null`; `verifySession()` rejects them; `verifySuperAdmin()` accepts only them

---

## Multi-tenancy & Module Gating

### Organization (tenant root)

Every entity in the system carries `organizationId`. The `Organization` model is the root anchor. Seed creates one default org; the backfill script links all existing data to it before the column became NOT NULL.

**Key files:**
- `lib/repositories/organizations.repository.ts` — findById, findBySlug, create
- `lib/repositories/org-modules.repository.ts` — findOrgModules, setOrgModule, findDoctorPerms, setDoctorPerm
- `lib/services/org-modules.service.ts` — getOrgModules (fills missing with false), setOrgModule (cascades disable to doctors), getDoctorModulePerms, setDoctorModulePerm

### Module Access

`AppModule` enum: `APPOINTMENTS | PATIENTS | INVENTORY | CAJA | AI_ASSISTANT`

Two-level gate:
1. **Org level** (`OrgModule`): admin sets which modules the clinic contracted
2. **Doctor level** (`DoctorModulePermission`): ADMIN gets all org-enabled; DOCTOR gets intersection of org and their granted set

`getAccessibleModules(orgId, role, doctorId) → Set<AppModule>` in `lib/modules.ts` (server-only, wrapped with `React.cache`).

`assertModuleAccess(accessible, module)` throws `ForbiddenError` (→ HTTP 403) when a module is not in the set. Called in:
- `app/(dashboard)/layout.tsx` — reads result and passes `enabledModules[]` to Sidebar
- Every `app/(dashboard)/*/page.tsx` — each page asserts its own module
- Every relevant `app/api/**/route.ts` handler

**Client-safe metadata** (`lib/module-metadata.ts`): `MODULE_METADATA`, `MODULE_ORDER`, `DASHBOARD_METADATA` — imported by Sidebar and dashboard page without violating `server-only`.

### Session Payload (current shape)

```typescript
// lib/session.ts
type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "DOCTOR";
  organizationId: string | null;   // null for SUPER_ADMIN
  doctorId: string | null;
  expiresAt: Date;
};

// lib/dal.ts — two session types to keep dashboard code clean
type DashboardSessionUser = {
  userId: string; email: string; name: string;
  role: "ADMIN" | "DOCTOR";
  organizationId: string;   // guaranteed non-null after verifySession
  doctorId: string | null;
};

type SuperAdminSessionUser = {
  userId: string; email: string; name: string;
  role: "SUPER_ADMIN";
};
```

- `verifySession()` → `DashboardSessionUser`: redirects to `/login` if missing `organizationId` OR if role is `SUPER_ADMIN`
- `verifySuperAdmin()` → `SuperAdminSessionUser`: redirects to `/login` if role ≠ `SUPER_ADMIN`

Old sessions missing `organizationId` → `verifySession()` redirects to `/login` (one-time re-login).

### Doctor Login

- Admin enables login: POST `/api/admin/doctors/[id]/login` — creates a linked `User` with `role=DOCTOR`, hashed initial password
- Admin disables login: DELETE same route — deletes the User record
- On login (`app/actions/auth.ts`): detects role → if DOCTOR, calls `getAccessibleModules`, finds first module, redirects to its route or `/no-access`
- `/no-access` page (`app/(dashboard)/no-access/page.tsx`): shown when doctor has zero accessible modules

---

## Super Admin Panel

**Route group:** `app/(superadmin)/` — isolated layout with nav bar (`components/superadmin/superadmin-nav.tsx`), `verifySuperAdmin()` only, no shared code with dashboard

**Routes:**
| Route | Handler |
|---|---|
| `GET /superadmin/organizations` | `app/(superadmin)/superadmin/organizations/page.tsx` — org list |
| `GET /superadmin/organizations/new` | `app/(superadmin)/superadmin/organizations/new/page.tsx` — create form |
| `GET /superadmin/organizations/[id]` | `app/(superadmin)/superadmin/organizations/[id]/page.tsx` — detail |
| `GET /superadmin/audit-logs` | `app/(superadmin)/superadmin/audit-logs/page.tsx` — audit log viewer with filters, pagination, org name resolution |
| `GET /superadmin/security` | `app/(superadmin)/superadmin/security/page.tsx` — 2FA settings for the superadmin account |
| `GET /api/superadmin/organizations` | List all orgs with counts and enabled modules |
| `POST /api/superadmin/organizations` | Create org (validates slug + email uniqueness, atomic tx) |
| `GET /api/superadmin/organizations/[id]` | Org detail with all 5 modules |
| `PUT /api/superadmin/organizations/[id]` | Update name or active status |
| `PUT /api/superadmin/organizations/[id]/modules` | Toggle a module on/off (cascade disable to doctor perms) |

**Audit log viewer (`/superadmin/audit-logs`):**
- Server-rendered page — reads `searchParams` (action, organizationId, from, to, page), calls `auditRepository.findMany()` directly
- Filters: action dropdown (all 12 `AuditAction` values), org dropdown (all orgs), date range (from/to)
- Table: timestamp | email | action badge (color-coded) | resource | org name | IP
- Pagination: prev/next links that preserve active filters in URL query string
- Page size: 25 rows

**Client components (`components/superadmin/`):**
- `org-list-client.tsx` — org table with active badge, user/doctor/patient counts, module chips
- `org-form.tsx` — create form; POST to API, toast + redirect on success
- `org-detail-client.tsx` — module toggle switches (optimistic + rollback) + suspend/activate button
- `superadmin-nav.tsx` — client nav with `usePathname()` active-link highlighting; links to organizations, audit-logs, security

**Service (`lib/services/superadmin.service.ts`):**
- `listOrganizations()` — DTOs with counts and `enabledModules[]`
- `getOrgDetail(orgId)` — throws `NotFoundError`; fills all 5 modules (disabled if absent in DB)
- `createOrganization(data)` — slug+email uniqueness check; `db.$transaction(org + user + 5 OrgModule rows)`
- `updateOrganization(orgId, data)` — guards `NotFoundError` before update
- `setOrgModule(orgId, module, enabled)` — upserts OrgModule; if disabling, cascades to `DoctorModulePermission.updateMany`

**Repository (`lib/repositories/superadmin.repository.ts`):** listOrganizations, findById, slugExists, create, update, setModule

**Validation (`lib/validations/organization.schema.ts`):** `createOrganizationSchema`, `updateOrganizationSchema`, `setOrgModuleSchema`

**Suspended org enforcement:** `app/actions/auth.ts` checks `org.active` after credential validation; returns an error string if false — suspended clinic users cannot log in.

**Clinic admin restriction:** `PUT /api/admin/org-modules` returns 403. The `/admin/settings` page is now read-only (static status badges, no toggles).

---

## Authentication Flow

| File | What it does |
|---|---|
| `app/actions/auth.ts` | `login()`: validates credentials, checks org active, if `totpEnabled` sets `pending_2fa` cookie and returns `requires2fa: true`; otherwise creates session and redirects by role. `verify2fa()`: reads (but does NOT consume) `pending_2fa` cookie, decrypts TOTP secret, verifies code with ±30s tolerance, then deletes cookie and creates full session. `logout()` writes audit log then clears cookie. |
| `lib/session.ts` | `encrypt()` / `decrypt()` JWT with Jose HS256 8h; `createSession(payload)` includes `lastActivity` unix ms for inactivity tracking |
| `lib/session-edge.ts` | Edge-safe (`encryptEdge` / `decryptEdge`) — used only by `proxy.ts` |
| `proxy.ts` | Replaces `middleware.ts`. Runs on every request (except static/image/favicon). Checks `lastActivity` (30 min inactivity limit) and absolute session age (8 h). On valid session: re-signs JWT with updated `lastActivity` (sliding window). Exempts `/api/auth/**` and `/api/inngest` from auth redirect. |
| `lib/dal.ts` | `verifySession()` — reads cookie, verifies JWT, redirects to `/login` if missing `organizationId` or role is `SUPER_ADMIN`; `verifySuperAdmin()` — redirects if role ≠ `SUPER_ADMIN`; `verifyAuthenticated()` — accepts any authenticated role (used by TOTP routes so SUPER_ADMIN can also manage their 2FA); `assertAdmin()` — throws ForbiddenError if role ≠ ADMIN; `getSession()` — non-throwing reader used by logout audit |
| `app/(auth)/login/login-form.tsx` | `useActionState(login)` / `useActionState(verify2fa)`. When `state.requires2fa === true` shows TOTP input step (6-digit, digit-only, monospace). |
| `app/(dashboard)/layout.tsx` | Calls `verifySession()` + `getAccessibleModules()` + `getLowStockCount()` → renders `<Sidebar enabledModules isAdmin>` |

**Cookies:**
- `session` — HTTP-only, SameSite lax, `maxAge: SESSION_INACTIVITY_MS / 1000` (30 min sliding). Re-signed on every proxied request.
- `pending_2fa` — HTTP-only, 5 min TTL, signed JWT containing `userId`. Created by `login()` when 2FA is required; read (non-consuming) on each `verify2fa()` attempt; deleted only on success.

**Session constants (`lib/session.ts`):**
- `SESSION_INACTIVITY_MS` = 30 min — idle timeout enforced by proxy
- `SESSION_MAX_AGE_MS` = 8 h — absolute maximum regardless of activity

---

## Security Module

### Audit Logs

**Coverage:** Every authentication event (LOGIN, LOGIN_FAILED, LOGOUT) and all patient data operations (PATIENT_CREATED/UPDATED/VIEWED/ANONYMIZED/EXPORTED, CLINICAL_NOTE_CREATED/DELETED, FILE_UPLOADED/DELETED) write an `AuditLog` row.

| File | Role |
|---|---|
| `lib/audit.ts` | `writeAuditLog(params)` — fire-and-forget, never throws. `requestMeta(req)` extracts IP + UA from HTTP request. `serverActionMeta()` extracts IP + UA from `next/headers` (server actions). |
| `lib/repositories/audit.repository.ts` | `auditRepository.create()` — write. `auditRepository.findMany(params)` — read with filters (action, organizationId, date range) and offset pagination. |
| `prisma/schema.prisma` | `AuditLog` model + `AuditAction` enum. |

**Reading audit logs:** `/superadmin/audit-logs` — superadmin-only page with filter form (GET-based, full server render) and paginated table. Clinic admins cannot access; their audit data is visible per-org to the superadmin via the org filter.

**Key invariant:** `writeAuditLog` uses `.catch(() => {})` — a DB failure writing an audit log must NEVER propagate to the caller.

### Two-Factor Authentication (TOTP)

**UI routes:**
- `/security` — dashboard users (ADMIN, DOCTOR) manage their 2FA
- `/superadmin/security` — SUPER_ADMIN manages their 2FA (same `SecurityPageClient` component, guarded by `verifySuperAdmin()`)

**TOTP API routes accept all authenticated roles** via `verifyAuthenticated()` (replaced `verifySession()`) so the superadmin's setup/enable/disable API calls are not rejected.

**API routes:**
| Route | Method | What it does |
|---|---|---|
| `/api/auth/totp/setup` | GET | Generates secret, stores PLAIN temporarily in `user.totpSecret`, returns QR data URL |
| `/api/auth/totp/enable` | POST | Verifies first code against plain secret, then AES-encrypts and saves; sets `totpEnabled = true` |
| `/api/auth/totp/disable` | DELETE | Requires current password + valid TOTP code; clears `totpSecret` and sets `totpEnabled = false` |

**Service (`lib/services/totp.service.ts`):**
- `generateSecret()` / `getOtpauthUrl(email, secret)` / `getQrDataUrl(url)` — setup helpers
- `verifyToken(token, secret)` — checks current ±1 time step (±30s tolerance for clock drift)
- `encryptSecret(plain)` / `decryptSecret(encrypted)` — AES-256-GCM via `lib/crypto.ts`

**Secret lifecycle:**
1. `GET /setup` → plain secret stored in `user.totpSecret`
2. `POST /enable` → verified against plain, then encrypted; `totpEnabled = true`
3. Login `verify2fa` → decrypts, verifies, creates session
4. `DELETE /disable` → password + TOTP confirmed, fields cleared

**Client components (`components/security/`, `components/auth/`):**
- `security-page-client.tsx` — wraps server-read state + `router.refresh()` on change
- `totp-setup.tsx` — 3-step UI: idle → QR scan → enter code to confirm

### Backups (3 levels)

| Level | Mechanism | Config needed |
|---|---|---|
| 1 — PITR | Neon Scale plan → Point-in-Time Recovery (up to 30 days) | Upgrade plan in console.neon.tech |
| 2 — Weekly JSON | `inngest/weekly-backup.ts` cron (Sun 02:00 UTC): exports all Prisma models to `backups/{ts}/database.json` in Cloudflare R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| 3 — Blob index | Same Inngest function: paginates Vercel Blob `list()` and writes index to `backups/{ts}/blob-index.json` in R2 | Same R2 env vars |

**Inngest function:** `weeklyBackupFn` registered in `app/api/inngest/route.ts`.

---

## System Modules

### 1. Administration — Doctors and Procedures

**UI routes:** `/admin`, `/admin/doctors`, `/admin/procedures`, `/admin/rips`, `/admin/settings`
**Components:** `components/admin/`
- `doctors-page-client.tsx` — list with active/inactive toggle, opens `doctor-form.tsx`; "Permisos" button opens `doctor-permissions-panel.tsx`
- `doctor-form.tsx` — when editing: collapsible "Acceso al sistema" section to enable/disable login and set initial password
- `doctor-permissions-panel.tsx` — slide-in panel; toggles per-module grants; disabled when org hasn't enabled that module
- `doctor-table.tsx` — table row; "Permisos" action column button
- `org-module-settings.tsx` — read-only module status view (toggles removed; only super admin can change org modules)
- `procedures-page-client.tsx` — same for procedures, includes CUPS code field
- `rips-export-form.tsx` — date range form for RIPS export

**API routes:**
- `GET/POST /api/admin/doctors` — list / create
- `GET/PUT/DELETE /api/admin/doctors/[id]` — detail / edit / deactivate
- `GET /api/admin/doctors/active` — active only (for dropdowns)
- `POST /api/admin/doctors/[id]/login` — enable doctor login (creates linked User)
- `DELETE /api/admin/doctors/[id]/login` — disable doctor login (deletes User)
- `GET/PUT /api/admin/doctors/[id]/modules` — get / set doctor module permissions
- `GET /api/admin/org-modules` — read org-level module config (PUT returns 403 — only super admin can change)
- Same pattern for `/api/admin/procedures`
- `GET /api/rips/export?from=&to=` — generates RIPS JSON

**Services/Repos:**
- `lib/services/doctors.service.ts` → `lib/repositories/doctors.repository.ts`
  - `enableLogin(doctorId, email, initialPassword, orgId)` — creates User with role=DOCTOR
  - `disableLogin(doctorId)` — removes linked User
  - `setModulePerm(doctorId, module, enabled)` — updates DoctorModulePermission
- `lib/services/procedures.service.ts` → `lib/repositories/procedures.repository.ts`
- Guard: cannot deactivate a doctor/procedure that has future appointments

---

### 2. Patients

**UI routes:** `/patients` (list), `/patients/[id]` (detail + clinical history)
**Components:** `components/patients/`
- `patients-page-client.tsx` — paginated table with search; opens `patient-form.tsx`
- `patient-form.tsx` — fields: `#firstName`, `#lastName`, `#idNumber`, `#phone`, email, birthDate, address, guardianName/Relation/Phone, `input[name="habeaDataConsent"]`; labels have `aria-hidden *` span → use IDs directly in E2E tests
- `patient-detail-client.tsx` — tabs: Clinical History, Files, Odontogram
- `guardian-fields.tsx` — shown when `isMinor(birthDate) === true`
- `patient-privacy-actions.tsx` — export data and anonymize buttons (Habeas Data)

**API routes:**
- `GET/POST /api/patients` — paginated list (query: `search`, `page`) / create
- `GET/PUT /api/patients/[id]` — detail / update
- `GET /api/patients/[id]/export-data` — full data export (Habeas Data)
- `POST /api/patients/[id]/anonymize` — anonymizes PII

**Service:** `lib/services/patients.service.ts`
- `create()` encrypts `phone`, `email`, `address`, `guardianPhone` before persisting
- `list()` decrypts PII in results
- `anonymize()` replaces PII with random tokens
- `exportData()` decrypts and returns full history

**Repository:** `lib/repositories/patients.repository.ts`
- `createClinicalHistory()` called automatically when a patient is created

**Validation:** `lib/validations/patient.schema.ts`
- `createPatientSchema` / `updatePatientSchema`
- `isMinor(birthDate)` — helper to show guardian fields

---

### 3. Clinical History

**UI routes:** `/patients/[id]` (tabs inside patient detail)
**Components:** `components/clinical-history/`
- `clinical-history-tabs.tsx` — orchestrates Notes, Odontogram, Files tabs
- `clinical-timeline.tsx` — notes sorted descending by date
- `clinical-note-form.tsx` — types: `INGRESO | EVOLUCION | PROCEDIMIENTO | INTERCONSULTA | EGRESO`
- `odontogram.tsx` + `tooth-svg.tsx` + `tooth-detail.tsx` — 32-tooth × 5-surface map
- `file-upload-section.tsx` — uploads to Vercel Blob; `pdf-export-button.tsx` generates PDF

**API routes:**
- `GET/PUT /api/patients/[id]/clinical-history` — background/anamnesis field
- `POST/DELETE /api/patients/[id]/notes`
- `POST/DELETE /api/patients/[id]/odontogram`
- `POST/DELETE /api/patients/[id]/files` — Vercel Blob (`@vercel/blob`)

**Service:** `lib/services/clinical-history.service.ts`
- Validates tooth numbers (11-18, 21-28, 31-38, 41-48)

**Repository:** `lib/repositories/clinical-history.repository.ts`
- `upsertOdontogramEntry()` — updates if entry already exists for (tooth, surface)

---

### 4. Appointments / Scheduling

**UI routes:** `/appointments`
**Components:** `components/appointments/`
- `appointments-page-client.tsx` — mounts the calendar
- `appointment-calendar.tsx` — uses `react-big-calendar` with week/month views
- `appointment-form.tsx` — selects: `#apt-doctor`, `#apt-date`, `#apt-slot`, `#apt-procedure`; patient search: `getByLabel("Buscar paciente")`
- `doctor-filter.tsx` — `<select aria-label="Filtrar por doctor">` (distinct from form select)
- `patient-search.tsx` — real-time search input

**API routes:**
- `GET /api/appointments?start=&end=&doctorId=` — by date range
- `POST /api/appointments` — create appointment → fires Inngest event
- `GET /api/appointments/available-slots?doctorId=&date=` — available time slots
- `DELETE /api/appointments/[id]` — cancel → fires Inngest cancellation event

**Service:** `lib/services/appointments.service.ts`
- Slots: 08:00–18:00, 30-min duration, removes already-booked slots
- On create: `inngest.send({ name: "dental/appointment.created", data: { appointmentId, appointmentDate } })`
- On cancel: `inngest.send({ name: "dental/appointment.cancelled", data: { appointmentId } })`

**Repository:** `lib/repositories/appointments.repository.ts`
- `updateReminderJobId()` — persists Inngest job ID in `Appointment.reminderJobId`

---

### 5. Inventory

**UI routes:** `/inventory`
**Components:** `components/inventory/`
- `inventory-page-client.tsx` — tabs: Todos / Activos / Inactivos (use `exact: true` in E2E)
- `inventory-table.tsx` — shows low-stock alerts
- `inventory-form.tsx` — create/edit item; SKU field is unique
- `stock-update-modal.tsx` — quantity adjustment; writes `StockLog`

**API routes:**
- `GET/POST /api/inventory` — filtered list / create
- `GET/PUT /api/inventory/[id]` — detail / edit
- `POST /api/inventory/[id]/stock` — stock adjustment

**Service:** `lib/services/inventory.service.ts`
- `getLowStockCount()` → used by `DashboardLayout` for sidebar badge
- 7 preset categories (from seed): Anestesia, Material Dental, etc.

**Enum:** `InventoryUnit`: UNIDAD, CAJA, PAQUETE, FRASCO, TUBO, ML, G

---

### 6. Billing (Caja)

**UI routes:** `/caja`
**Components:** `components/caja/`
- `caja-page-client.tsx` — table with status/search filters
- `caja-form.tsx` — `select[name="patientId"]`, `textarea[name="description"]`, `input[name="total"]`, `input[name="initialPayment"]`, `select[name="paymentMethod"]`
- `caja-detail.tsx` — modal with payment history and add-payment button
- `payment-form.tsx` — `input[name="amount"]`, `select[name="method"]`

**API routes:**
- `GET/POST /api/caja` — paginated list / create record
- `POST /api/caja/[id]/payments` — add payment

**Service:** `lib/services/caja.service.ts`
- State machine: `PENDIENTE → ABONO_PARCIAL → PAGADO` (calculated from balance)
- When fully paid: calls `createInvoice()` from Siigo integration (mock in dev)

**Repository:** `lib/repositories/caja.repository.ts`

**Types:** `CajaStatus`: PENDIENTE, ABONO_PARCIAL, PAGADO | `PaymentMethod`: EFECTIVO, TRANSFERENCIA, TARJETA_DEBITO, TARJETA_CREDITO

---

### 7. AI Assistant

**UI routes:** `/ai-assistant`
**Components:** `components/ai-assistant/`
- `ai-assistant-page-client.tsx` — chat state, manages SSE stream
- `chat-window.tsx` + `message-bubble.tsx` — conversation UI
- `tool-confirm-modal.tsx` — human-in-the-loop for write tools
- `token-bar.tsx` — token usage indicator
- `chat-input.tsx` — submit input

**API route:** `POST /api/ai/chat` — receives `{ messages, confirmedToolCall? }`, returns SSE

**Service:** `lib/services/ai-agent.service.ts`
- Model: `claude-sonnet-4-6`, max 4096 tokens, up to 10 agentic loop iterations
- SSE events: `text_delta`, `tool_call` (needs confirmation), `tool_result`, `done`, `error`
- Write tools require `confirmedToolCall` in request body to execute

**Anthropic integration:** `lib/integrations/anthropic/`
- `client.ts` — SDK instance
- `system-prompt.ts` — dental clinic context
- `tools/read-tools.ts` — `read_pacientes`, `read_citas`, `read_inventario`, `read_caja`
- `tools/write-tools.ts` — `create_paciente`, `create_cita`, `update_stock`, `create_caja_record`, `create_payment`, `create_doctor`, `create_procedure` (all `requiresConfirmation: true`)

---

### 8. Legal Compliance

**Habeas Data (Law 1581/2012):**
- `GET /api/patients/[id]/export-data` — exports full patient history
- `POST /api/patients/[id]/anonymize` — anonymizes PII (names, phone, email, address)
- Component: `components/patients/patient-privacy-actions.tsx`
- Consent: `habeaDataConsent` field on `Patient`, required at creation

**RIPS (Resolution 2275/2023):**
- `GET /api/rips/export?from=&to=` → `lib/integrations/rips/mapper.ts`
- Requires env: `NIT_CONSULTORIO`, `RIPS_MUNICIPIO_CODE`, `RIPS_COD_PRESTADOR`
- Generates `RipsJson` structure (usuarios + consultas per appointment)

**PII Encryption:**
- `lib/crypto.ts` — AES-256-GCM, format `ivHex:authTagHex:cipherHex`
- Encrypted fields: `Patient.phone`, `email`, `address`, `guardianPhone`
- `decryptOptional()` handles legacy unencrypted data (pass-through)
- Key: `FIELD_ENCRYPTION_KEY` (64 hex chars = 32 bytes)

---

### 9. WhatsApp (Appointment Reminders)

**Integration:** `lib/integrations/whatsapp/client.ts`
- In dev: mock (console.warn). In prod: Meta Graph API v20.0
- Normalizes Colombian phone numbers to `57XXXXXXXXXX` format
- Uses a Meta-approved template with 4 parameters

**Job queue:** `inngest/whatsapp-reminder.ts`
- Trigger: `dental/appointment.created` event
- Cancel on: `dental/appointment.cancelled` event (matched by `appointmentId`)
- Sleeps until 24h before the appointment (`step.sleepUntil`), then sends
- Decrypts `patient.phone` before sending

**Inngest:** `inngest/client.ts` | Route: `app/api/inngest/route.ts`

---

## Shared Libraries

| File | Purpose |
|---|---|
| `lib/db.ts` | PrismaClient singleton (hot-reload safe) |
| `lib/session.ts` | JWT HS256 — `createSession()`, `deleteSession()`, `encrypt()`, `decrypt()`, `SESSION_INACTIVITY_MS`, `SESSION_MAX_AGE_MS` |
| `lib/session-edge.ts` | Edge-safe JWT helpers — `encryptEdge()`, `decryptEdge()` — used only by `proxy.ts` |
| `lib/dal.ts` | `verifySession()` → `DashboardSessionUser`; `verifySuperAdmin()` → `SuperAdminSessionUser`; `verifyAuthenticated()` → `{ userId }` (any role — used by TOTP routes); `assertAdmin()`; `getSession()` (non-throwing) |
| `lib/crypto.ts` | AES-256-GCM field encryption — `encrypt()`, `decrypt()`, `encryptOptional()`, `decryptOptional()`. Key: `FIELD_ENCRYPTION_KEY` (64 hex chars) |
| `lib/audit.ts` | Fire-and-forget audit log writer + `requestMeta()` + `serverActionMeta()` |
| `lib/errors.ts` | `AppError`, `ValidationError`, `NotFoundError`, `ConflictError`, `ForbiddenError`, `handleApiError()` |
| `lib/env.ts` | Validates optional env vars in production (warn, no throw) |
| `lib/modules.ts` | `server-only` — `getAccessibleModules()`, `assertModuleAccess()`, re-exports metadata |
| `lib/module-metadata.ts` | Client-safe — `MODULE_METADATA`, `MODULE_ORDER`, `DASHBOARD_METADATA`, `AppModule` |
| `proxy.ts` | Next.js 16 proxy (replaces `middleware.ts`). Sliding-window session + inactivity/absolute expiry checks. Exports `proxy` function (not `middleware`). |

---

## Zod Validation Schemas (`lib/validations/`)

| Schema file | Key exports |
|---|---|
| `patient.schema.ts` | `createPatientSchema`, `updatePatientSchema`, `isMinor()` |
| `appointment.schema.ts` | `createAppointmentSchema`, type `AppointmentWithRelations` |
| `caja.schema.ts` | `createCajaRecordSchema`, `createPaymentSchema`, type `CajaRecordWithDetails` |
| `clinical-history.schema.ts` | `CreateNoteInput`, `CreateOdontogramEntryInput` |
| `inventory.schema.ts` | `CreateInventoryItemInput`, `UpdateStockInput` |
| `doctor.schema.ts` | `CreateDoctorInput`, `UpdateDoctorInput`, `enableLoginSchema`, `EnableLoginInput` |
| `procedure.schema.ts` | `CreateProcedureInput`, `UpdateProcedureInput` |

---

## Database — Key Models

```
Organization   — tenant root (one per clinic)
  ├── OrgModule[]              (@@unique [organizationId, module])
  ├── User[]                   — role: ADMIN | DOCTOR, organizationId
  └── Doctor[]                 — userId? (nullable FK → User), organizationId
        └── DoctorModulePermission[]  (@@unique [doctorId, module])

Procedure      — @@unique [name, organizationId], cupsCode?, active
Patient        — @@unique [idNumber, organizationId], PII encrypted, habeaDataConsent, organizationId
  ├── ClinicalHistory (1:1, auto-created with patient)
  │     ├── ClinicalNote[]      (type: NoteType enum)
  │     ├── OdontogramEntry[]   (toothNumber + Surface + ToothStatus)
  │     └── PatientFile[]       (url → Vercel Blob)
  ├── Appointment[]             — organizationId, doctorId, reminderJobId?
  └── CajaRecord[]              — organizationId
        └── Payment[]

InventoryCategory → InventoryItem → StockLog[]   (all with organizationId)
```

**Key enums:**
- `UserRole`: SUPER_ADMIN, ADMIN, DOCTOR
- `AppModule`: APPOINTMENTS, PATIENTS, INVENTORY, CAJA, AI_ASSISTANT
- `NoteType`: INGRESO, EVOLUCION, PROCEDIMIENTO, INTERCONSULTA, EGRESO
- `Surface`: OCLUSAL, MESIAL, DISTAL, VESTIBULAR, LINGUAL
- `ToothStatus`: SANO, CARIES, OBTURACION, CORONA, ENDODONCIA, IMPLANTE, AUSENTE, EXTRAIDO, FRACTURA
- `CajaStatus`: PENDIENTE, ABONO_PARCIAL, PAGADO
- `PaymentMethod`: EFECTIVO, TRANSFERENCIA, TARJETA_DEBITO, TARJETA_CREDITO

---

## Unit Testing (`tests/unit/`)

**Runner:** Vitest 4.1 with `vite-tsconfig-paths` for `@/*` alias
**Config:** `vitest.config.ts` — environment: node, globals: true, setupFiles: `tests/setup.ts`
**Coverage:** V8 provider; `lib/services/**` and `lib/modules.ts` included

**Global setup (`tests/setup.ts`):**
- Mocks `server-only` as empty module (allows importing server-only files in tests)
- Mocks `React.cache` as a pass-through function (no cross-test caching)

**Test files:**

| File | What it covers |
|---|---|
| `tests/unit/lib/modules.test.ts` | `getAccessibleModules` (ADMIN returns org modules; DOCTOR returns intersection; null doctorId → empty); `assertModuleAccess` (pass / throw ForbiddenError) |
| `tests/unit/lib/audit.test.ts` | `writeAuditLog` calls repository with correct params; never throws when repository fails; coerces null organizationId. `requestMeta` extracts IP (x-forwarded-for / x-real-ip fallback) and user-agent. |
| `tests/unit/services/org-modules.service.test.ts` | `getOrgModules` fills missing modules with false; `setOrgModule(false)` cascades disable to doctors; `getDoctorModulePerms` combines org + doctor state; `setDoctorModulePerm` rejects when org module disabled |
| `tests/unit/services/appointments.service.test.ts` | DOCTOR always uses own doctorId (ignores filterDoctorId); ADMIN without filter → undefined; organizationId forwarded to repository |
| `tests/unit/services/patients.service.test.ts` | DOCTOR fetches patientIds from appointments first; ADMIN does not; correct pagination (pages = ceil(total/pageSize)) |
| `tests/unit/services/superadmin.service.test.ts` | `listOrganizations` maps counts + enabledModules; `getOrgDetail` fills all modules; `createOrganization` checks slug+email uniqueness, creates all 5 OrgModule rows; `updateOrganization` guards NotFoundError; `setOrgModule` cascades disable to doctor perms |
| `tests/unit/services/totp.service.test.ts` | `generateSecret` / `getOtpauthUrl` / `getQrDataUrl`; `verifyToken` correct/incorrect/rejects-gracefully, checks 3 time steps (±30s drift), short-circuits on first match, uses epoch in seconds; `encryptSecret`/`decryptSecret` round-trip |
| `tests/unit/repositories/audit.repository.test.ts` | `create` delegates to `db.auditLog.create`; `findMany` — no-filter returns all; action/organizationId/from/to filters applied to `where`; combined filters; skip=(page-1)×pageSize calculation for pages 1/2/3; always orders by `createdAt desc`; returns logs+total from parallel queries |

**Mock contract:** Prisma queries filter with `where: { enabled: true }` — mocks must only return enabled=true rows to accurately simulate DB behavior.

---

## E2E Testing (`e2e/`)

**Config:** `playwright.config.ts` — `baseURL: http://localhost:3000`, workers: 1, sequential
**Projects:** `setup` (auth) → `chromium` (1280×720) + `tablet` (768×1024, touch)
**Session:** `e2e/fixtures/auth.setup.ts` — logs in as `admin@clinica.com`/`admin123`, saves to `e2e/.auth/session.json`
**DB Fixture:** `e2e/fixtures/db.ts` — PrismaClient pointing to `DATABASE_URL_TEST ?? DATABASE_URL`; exports `{ db, getDefaultOrgId }`; `getDefaultOrgId()` returns the first active organization's ID

**Test files:**
- `e2e/flows/appointment.spec.ts` — creates patient + schedules appointment (uses direct IDs `#apt-*`)
- `e2e/flows/payment.spec.ts` — creates billing record + full payment cycle
- `e2e/flows/module-gating.spec.ts` — sidebar shows/hides Caja link when module toggled; direct URL to disabled module → 403; admin panel always accessible; afterAll re-enables CAJA
- `e2e/flows/doctor-login.spec.ts` — `test.use({ storageState: { cookies: [], origins: [] } })` (no admin session); creates Doctor + User via Prisma; doctor with no modules → `/no-access`; doctor with APPOINTMENTS → `/appointments`
- `e2e/flows/superadmin.spec.ts` — super admin login → `/superadmin/organizations`; clinic admin blocked from superadmin routes; org creation (slug + admin user); module toggle persists in DB; org suspension/activation; suspended org blocks user login; nav to `/superadmin/audit-logs` (table + filter controls visible); action filter shows only matching rows; nav to `/superadmin/security` (2FA settings visible); setup button triggers QR image
- `e2e/flows/security.spec.ts` — "Seguridad" link visible in sidebar; `/security` page renders; 2FA status shown; clicking setup shows QR image. Full 2FA login flow (requires live TOTP code) is covered by unit tests + manual QA.
- `e2e/a11y/accessibility.spec.ts` — axe-playwright, WCAG 2.1 A/AA, critical/serious impacts only
- `e2e/ux/error-messages.spec.ts` — Spanish error messages, duplicate ID number
- `e2e/ux/responsive.spec.ts` — patient/inventory/billing tables visible at 768px

**Known E2E gotchas:**
- Patient form labels have `aria-hidden *` span → accessible name ≠ visible text → use `#firstName`, `#lastName`, `#idNumber`, `#phone` directly
- `getByRole("button", { name: "Activos" })` needs `exact: true` to avoid matching "Inactivos"
- `getByText(/cédula|ya existe/)` appears in both `<p role="alert">` AND Sonner toast → add `.first()`
- `react-big-calendar` generates non-conforming ARIA roles → exclude `.rbc-calendar` from axe
- Doctor login tests override the project-level `storageState` with `test.use({ storageState: { cookies: [], origins: [] } })` to start unauthenticated

---

## External Integrations

| Integration | File | Dev behavior | Prod behavior |
|---|---|---|---|
| WhatsApp | `lib/integrations/whatsapp/client.ts` | Mock (console.warn) | Meta Graph API v20.0 |
| Siigo (invoicing) | `lib/integrations/siigo/client.ts` | Mock (`MOCK-{id}`) | Siigo REST API |
| RIPS | `lib/integrations/rips/mapper.ts` | Generates real JSON | Same |
| Anthropic | `lib/integrations/anthropic/` | Real (needs API key) | Real |
| Inngest | `inngest/` | Local dev server | app.inngest.com |
| Vercel Blob | `@vercel/blob` in API routes | Needs token | Needs token |

---

## Environment Variables

| Variable | Required | Used by |
|---|---|---|
| `DATABASE_URL` | Always | Prisma |
| `SESSION_SECRET` | Always | JWT HS256 session + `pending_2fa` cookie (≥32 chars) |
| `FIELD_ENCRYPTION_KEY` | Always | AES-256-GCM for PII fields AND TOTP secrets (64 hex chars) |
| `NEXTAUTH_URL` | Always | Base URL |
| `ANTHROPIC_API_KEY` | For AI | Claude SDK |
| `BLOB_READ_WRITE_TOKEN` | For file uploads | Vercel Blob |
| `INNGEST_SIGNING_KEY` | Prod | Inngest webhook auth — required for `/api/inngest` to accept calls |
| `INNGEST_EVENT_KEY` | Prod (optional) | Only needed if sending events via `inngest.send()` from app code |
| `R2_ACCOUNT_ID` | Backups | Cloudflare R2 — weekly database backup |
| `R2_ACCESS_KEY_ID` | Backups | Cloudflare R2 API key |
| `R2_SECRET_ACCESS_KEY` | Backups | Cloudflare R2 secret |
| `R2_BUCKET_NAME` | Backups | R2 bucket name (e.g. `dentapp-backups`) |
| `WHATSAPP_ACCESS_TOKEN` / `_PHONE_NUMBER_ID` / `_TEMPLATE_NAME` | Prod | Meta Graph API |
| `SIIGO_API_KEY` / `SIIGO_ACCOUNT_ID` | Prod | Invoicing |
| `NIT_CONSULTORIO` / `RIPS_MUNICIPIO_CODE` / `RIPS_COD_PRESTADOR` | RIPS | RIPS export |
| `DATABASE_URL_TEST` | E2E tests | Isolated test database |

---

## Seed (`prisma/seed.ts`)

- Creates default Organization: `Clínica Dental` (slug: `clinica-dental`)
- Creates admin user: `admin@clinica.com` / `admin123` (bcrypt cost 12, role=ADMIN, linked to org)
- Creates super admin user: `superadmin@dentapp.com` / `superadmin123` (role=SUPER_ADMIN, `organizationId=null`)
- Creates all 5 OrgModules enabled: APPOINTMENTS, PATIENTS, INVENTORY, CAJA, AI_ASSISTANT
- Creates 7 inventory categories: Anestesia, Material Dental, Instrumental, Medicamentos, Radiología, Protección Personal, Administrativo (all linked to org)
- Idempotent: uses `upsert`

---

## npm Scripts

```
npm run dev                  → next dev
npm run build                → prisma generate + next build
npm run lint                 → eslint
npm run test:unit            → vitest run (single pass)
npm run test:unit:watch      → vitest (watch mode)
npm run test:unit:coverage   → vitest run --coverage (V8)
npm run test:e2e             → playwright test
npm run lighthouse           → lhci autorun
npx prisma db push           → sync schema to database
npx prisma db seed           → create Organization + admin + categories
npx prisma studio            → database GUI
npx tsx prisma/scripts/backfill-default-org.ts → one-time migration (existing data → org)
```
