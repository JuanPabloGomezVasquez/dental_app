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
- `lib/dal.ts` → `verifySession()` protects all dashboard routes (cached with `React.cache`)
- Every DB query includes `organizationId` — tenant data never leaks across orgs
- `lib/modules.ts` is `server-only`; `lib/module-metadata.ts` is client-safe (sidebar imports it)

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

### Session Payload (updated shape)

```typescript
type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "DOCTOR";
  organizationId: string;
  doctorId: string | null;
  expiresAt: Date;
};
```

Old sessions missing `organizationId` → `verifySession()` redirects to `/login` (one-time re-login).

### Doctor Login

- Admin enables login: POST `/api/admin/doctors/[id]/login` — creates a linked `User` with `role=DOCTOR`, hashed initial password
- Admin disables login: DELETE same route — deletes the User record
- On login (`app/actions/auth.ts`): detects role → if DOCTOR, calls `getAccessibleModules`, finds first module, redirects to its route or `/no-access`
- `/no-access` page (`app/(dashboard)/no-access/page.tsx`): shown when doctor has zero accessible modules

---

## Authentication Flow

| File | What it does |
|---|---|
| `app/actions/auth.ts` | Server Actions: `login()` validates credentials, resolves role/org/doctorId, creates JWT session, redirects by role; `logout()` clears cookie |
| `lib/session.ts` | `encrypt()` / `decrypt()` JWT with Jose HS256 7d; `createSession(payload)` includes role, organizationId, doctorId |
| `lib/dal.ts` | `verifySession()` — reads cookie, verifies JWT, redirects to `/login` if invalid or missing organizationId; `verifyAdmin()` — throws ForbiddenError if role ≠ ADMIN |
| `app/(auth)/login/page.tsx` | Login page using `useActionState(login)` |
| `app/(dashboard)/layout.tsx` | Calls `verifySession()` + `getAccessibleModules()` + `getLowStockCount()` → renders `<Sidebar enabledModules isAdmin>` |

**Cookie:** name `session`, HTTP-only, SameSite lax, 7-day expiry

---

## System Modules

### 1. Administration — Doctors and Procedures

**UI routes:** `/admin`, `/admin/doctors`, `/admin/procedures`, `/admin/rips`, `/admin/settings`
**Components:** `components/admin/`
- `doctors-page-client.tsx` — list with active/inactive toggle, opens `doctor-form.tsx`; "Permisos" button opens `doctor-permissions-panel.tsx`
- `doctor-form.tsx` — when editing: collapsible "Acceso al sistema" section to enable/disable login and set initial password
- `doctor-permissions-panel.tsx` — slide-in panel; toggles per-module grants; disabled when org hasn't enabled that module
- `doctor-table.tsx` — table row; "Permisos" action column button
- `org-module-settings.tsx` — org-level module toggle UI with optimistic updates
- `procedures-page-client.tsx` — same for procedures, includes CUPS code field
- `rips-export-form.tsx` — date range form for RIPS export

**API routes:**
- `GET/POST /api/admin/doctors` — list / create
- `GET/PUT/DELETE /api/admin/doctors/[id]` — detail / edit / deactivate
- `GET /api/admin/doctors/active` — active only (for dropdowns)
- `POST /api/admin/doctors/[id]/login` — enable doctor login (creates linked User)
- `DELETE /api/admin/doctors/[id]/login` — disable doctor login (deletes User)
- `GET/PUT /api/admin/doctors/[id]/modules` — get / set doctor module permissions
- `GET/PUT /api/admin/org-modules` — org-level module configuration
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
| `lib/session.ts` | JWT HS256 — `createSession()`, `deleteSession()`, `encrypt()`, `decrypt()` |
| `lib/dal.ts` | `verifySession()` — auth guard with React.cache; `verifyAdmin()` — ADMIN-only guard |
| `lib/crypto.ts` | AES-256-GCM field encryption |
| `lib/errors.ts` | `AppError`, `ValidationError`, `NotFoundError`, `ConflictError`, `ForbiddenError`, `handleApiError()` |
| `lib/env.ts` | Validates optional env vars in production (warn, no throw) |
| `lib/modules.ts` | `server-only` — `getAccessibleModules()`, `assertModuleAccess()`, re-exports metadata |
| `lib/module-metadata.ts` | Client-safe — `MODULE_METADATA`, `MODULE_ORDER`, `DASHBOARD_METADATA`, `AppModule` |

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
- `UserRole`: ADMIN, DOCTOR
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
| `tests/unit/services/org-modules.service.test.ts` | `getOrgModules` fills missing modules with false; `setOrgModule(false)` cascades disable to doctors; `getDoctorModulePerms` combines org + doctor state; `setDoctorModulePerm` rejects when org module disabled |
| `tests/unit/services/appointments.service.test.ts` | DOCTOR always uses own doctorId (ignores filterDoctorId); ADMIN without filter → undefined; organizationId forwarded to repository |
| `tests/unit/services/patients.service.test.ts` | DOCTOR fetches patientIds from appointments first; ADMIN does not; correct pagination (pages = ceil(total/pageSize)) |

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
| `SESSION_SECRET` | Always | JWT HS256 (≥32 chars) |
| `FIELD_ENCRYPTION_KEY` | Always | AES-256-GCM (64 hex chars) |
| `NEXTAUTH_URL` | Always | Base URL |
| `ANTHROPIC_API_KEY` | For AI | Claude SDK |
| `BLOB_READ_WRITE_TOKEN` | For file uploads | Vercel Blob |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Prod | Inngest |
| `WHATSAPP_ACCESS_TOKEN` / `_PHONE_NUMBER_ID` / `_TEMPLATE_NAME` | Prod | Meta Graph API |
| `SIIGO_API_KEY` / `SIIGO_ACCOUNT_ID` | Prod | Invoicing |
| `NIT_CONSULTORIO` / `RIPS_MUNICIPIO_CODE` / `RIPS_COD_PRESTADOR` | RIPS | RIPS export |
| `DATABASE_URL_TEST` | E2E tests | Isolated test database |

---

## Seed (`prisma/seed.ts`)

- Creates default Organization: `Clínica Dental` (slug: `clinica-dental`)
- Creates admin user: `admin@clinica.com` / `admin123` (bcrypt cost 12, role=ADMIN, linked to org)
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
