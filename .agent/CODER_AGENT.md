# CODER AGENT — Code Quality Standards
## Role: Senior Developer

> **Purpose:** This document defines the rules, patterns, and conventions that apply to every line of code written in this project. This agent acts as a senior developer and code reviewer. All generated code must meet these standards before being considered done. There is no concept of "we'll fix it later" — correct code is written the first time.

> **Mandatory dependency:** This agent operates under the authority of the **Architect Agent** (`ARCHITECT_AGENT.md`). Before writing any code, verify that the solution to implement complies with the architectural principles defined there. If there is a conflict between a code standard in this document and an architectural principle, **the architectural principle takes precedence**. When facing any design doubt not covered by this document, consult the Architect Agent first.

> **Expected input:** This agent receives as input a technical task decomposed by the Story Manager Agent. Do not implement anything that does not come from an approved user story and a defined technical task.

---

## 1. Project Base Configuration

### TypeScript — Strict Mode Required

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Rule:** `any` is forbidden. If TypeScript cannot infer the type, it is defined explicitly. The only allowed `unknown` is in catch blocks.

### ESLint + Prettier

```json
// .eslintrc.json — critical rules
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "import/order": ["error", { "groups": ["builtin", "external", "internal"] }]
  }
}
```

---

## 2. Naming Conventions

### Files and Folders

| Type | Convention | Example |
|---|---|---|
| React components | PascalCase | `OdontogramViewer.tsx` |
| Hooks | camelCase with `use-` prefix | `use-appointments.ts` |
| Services | camelCase with `.service` suffix | `scheduling.service.ts` |
| Repositories | camelCase with `.repository` suffix | `appointments.repository.ts` |
| Server Actions | camelCase with `.actions` suffix | `scheduling.actions.ts` |
| Types/Schemas | camelCase with `.types` suffix | `appointments.types.ts` |
| Utilities | camelCase | `date-utils.ts` |
| Constants | SCREAMING_SNAKE_CASE in file | `MAX_TOKENS_TIER1 = 50000` |

### Variables and Functions

```typescript
// Variables: descriptive camelCase — no abbreviations
const selectedPatient = ...    // ✅
const pat = ...                // ❌

// Functions: verb + noun
function createAppointment() {} // ✅
function appointment() {}       // ❌
function handleAppointment() {} // ❌ (only for React event handlers)

// Booleans: is/has/can/should prefix
const isLoading = true
const hasConsent = false
const canEditRecord = true

// Arrays: plural noun
const appointments = []
const patients = []

// React events: on or handle prefix
<Button onClick={handleSaveAppointment} />
function handleSaveAppointment() {}
```

---

## 3. Next.js 14 Patterns (App Router)

### Server vs Client Components

**Golden rule:** Everything is a Server Component by default. Only add `'use client'` when strictly necessary.

```typescript
// ✅ Server Component — no directive, fetches data directly
// app/(dashboard)/scheduling/page.tsx
import { appointmentsRepository } from '@/repositories/appointments.repository'

export default async function SchedulingPage() {
  const appointments = await appointmentsRepository.findUpcoming()
  return <AppointmentCalendar appointments={appointments} />
}

// ✅ Client Component — only when interactivity is needed
// components/modules/scheduling/AppointmentCalendar.tsx
'use client'
import { useState } from 'react'

interface Props {
  appointments: Appointment[]
}

export function AppointmentCalendar({ appointments }: Props) {
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('week')
  // ...
}
```

**When to use `'use client'`:**
- React hooks (`useState`, `useEffect`, `useRef`)
- Browser event listeners
- Libraries requiring DOM (interactive odontogram)
- AI chat streaming responses

### Server Actions — Standard pattern

```typescript
// actions/scheduling.actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { CreateAppointmentSchema } from '@/types/appointments.types'
import { schedulingService } from '@/services/scheduling.service'
import { BusinessError } from '@/lib/errors'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createAppointmentAction(
  formData: unknown
): Promise<ActionResult<Appointment>> {
  // 1. Validate input
  const parsed = CreateAppointmentSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.message }
  }

  // 2. Call service
  try {
    const appointment = await schedulingService.createAppointment(parsed.data)
    revalidatePath('/scheduling')
    return { success: true, data: appointment }
  } catch (error) {
    if (error instanceof BusinessError) {
      return { success: false, error: error.message }
    }
    console.error('[createAppointmentAction]', error)
    return { success: false, error: 'Unexpected error. Please try again.' }
  }
}
```

### Data Fetching — Hierarchy

```typescript
// Preference order (best to worst):

// 1. Server Component with direct repository fetch — most efficient
async function Page() {
  const data = await myRepository.findAll()
  return <MyComponent data={data} />
}

// 2. React Query in Client Component — for frequently changing data
'use client'
import { useQuery } from '@tanstack/react-query'

function InventoryTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => fetch('/api/inventory').then(r => r.json())
  })
}

// ❌ NEVER: manual useEffect + fetch
useEffect(() => {
  fetch('/api/data').then(...)  // Anti-pattern
}, [])
```

---

## 4. UI State Management

### Loading, error, and empty states — always all three

```typescript
// ✅ Every component that loads data handles all 3 states
export function PatientList() {
  const { data: patients, isLoading, error } = usePatients()

  if (isLoading) return <PatientsSkeleton />
  if (error) return <ErrorState message={error.message} onRetry={...} />
  if (patients.length === 0) return <EmptyState message="No patients registered" />

  return <ResultsTable data={patients} />
}
```

### Optimistic Updates for frequent actions

```typescript
// Update UI immediately, revert if it fails
// Applies to: cancel appointment, update stock, register payment
const mutation = useMutation({
  mutationFn: cancelAppointment,
  onMutate: async (appointmentId) => {
    await queryClient.cancelQueries({ queryKey: ['appointments'] })
    const snapshot = queryClient.getQueryData(['appointments'])
    queryClient.setQueryData(['appointments'], (old) =>
      old.filter(a => a.id !== appointmentId)
    )
    return { snapshot }
  },
  onError: (err, appointmentId, context) => {
    queryClient.setQueryData(['appointments'], context.snapshot)
    toast.error('Could not cancel appointment')
  },
})
```

---

## 5. React Components — Rules

### Internal component structure

```typescript
// Order inside a component (always this order):
export function MyComponent({ prop1, prop2 }: Props) {
  // 1. Hooks (always first, no conditionals)
  const [state, setState] = useState(...)
  const { data } = useQuery(...)
  const router = useRouter()

  // 2. Derived variables from state
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = record.total - totalPaid

  // 3. Handlers (functions that handle events)
  function handleSave() { ... }
  function handleCancel() { ... }

  // 4. Effects (at end of logic, before return)
  useEffect(() => { ... }, [])

  // 5. Render
  return (...)
}
```

### Props always typed with interface

```typescript
// ✅ Explicit interface with JSDoc for non-obvious props
interface OdontogramToothProps {
  /** Tooth number per FDI nomenclature (11-18, 21-28, 31-38, 41-48) */
  toothNumber: number
  surfaces: SurfaceState[]
  onSurfaceClick: (surface: Surface) => void
  /** If true, component is read-only (Clinical Record view) */
  readOnly?: boolean
}
```

### Small and focused components

```typescript
// A component does ONE thing.
// If a component has more than 150 lines, split it.

// ✅ Clear composition
<AppointmentForm>
  <PatientSelector />
  <DoctorSelector />
  <DateTimePicker />
  <AppointmentActions />
</AppointmentForm>

// ❌ A component that does everything
<GiantAppointmentForm /> // 400 lines, impossible to maintain
```

---

## 6. Form Handling

### React Hook Form + Zod — project standard

```typescript
// ✅ Standard pattern for all forms
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateAppointmentSchema, type CreateAppointmentDTO } from '@/types/appointments.types'

export function NewAppointmentForm() {
  const form = useForm<CreateAppointmentDTO>({
    resolver: zodResolver(CreateAppointmentSchema),
    defaultValues: {
      patientId: '',
      doctorId: '',
      procedureId: '',
    }
  })

  async function onSubmit(data: CreateAppointmentDTO) {
    const result = await createAppointmentAction(data)
    if (!result.success) {
      form.setError('root', { message: result.error })
      return
    }
    toast.success('Appointment scheduled successfully')
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* fields */}
      </form>
    </Form>
  )
}
```

---

## 7. Accessibility (a11y) — Minimum Required

- All interactive elements have `aria-label` if they have no visible text.
- Forms have `htmlFor` on labels and `id` on inputs.
- Validation errors are announced with `role="alert"`.
- Interactive odontogram has keyboard navigation.
- Minimum WCAG AA contrast (4.5:1) on text over backgrounds.

```typescript
// ✅
<button aria-label="Cancel appointment for patient John Smith">
  <X className="h-4 w-4" />
</button>

// ❌
<button onClick={cancel}>
  <X className="h-4 w-4" />
</button>
```

---

## 8. Testing — Strategy and Requirements

### What to test and with what

| Layer | Tool | Minimum coverage |
|---|---|---|
| Services | Vitest (unit) | 80% — all business logic |
| Repositories | Vitest + in-memory DB | Critical queries |
| Server Actions | Vitest (integration) | Happy path + expected errors |
| Critical components | React Testing Library | Odontogram, AI chat, appointment form |
| Complete flows | Playwright (e2e) | Create appointment, register payment, AI chat |

### Test naming — always descriptive

```typescript
// ✅ Describes expected behavior
describe('schedulingService.createAppointment', () => {
  it('creates the appointment and queues the WhatsApp reminder', async () => { ... })
  it('throws ConflictError if doctor already has an appointment at that time', async () => { ... })
  it('creates an empty clinical record if the patient is new', async () => { ... })
})

// ❌
describe('createAppointment', () => {
  it('works', async () => { ... })
  it('test 1', async () => { ... })
})
```

---

## 9. Commits — Conventional Commits

Format: `type(scope): description`

| Type | Use |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fix |
| `refactor` | Refactoring without behavior change |
| `test` | Add or modify tests |
| `docs` | Documentation |
| `chore` | Configuration, dependencies |
| `style` | Formatting, no logic change |

```bash
# Examples
feat(scheduling): add new appointment form with validation
fix(billing): correct balance calculation when multiple payments exist
feat(ai): implement assistant response streaming
test(appointments): add tests for doctor schedule conflict
refactor(inventory): extract alert logic to service layer
```

---

## 10. Code Review Checklist

Before marking any task as done, verify line by line:

- [ ] TypeScript with no `any` anywhere
- [ ] All UI states handled: loading, error, empty
- [ ] Forms with React Hook Form + Zod validation
- [ ] Server Actions return typed `ActionResult<T>`
- [ ] No business logic in React components
- [ ] No direct Prisma calls outside repositories
- [ ] Descriptive names in variables, functions, and components
- [ ] Component under 150 lines (if not, split it)
- [ ] Tests written for all new business logic
- [ ] Commit in Conventional Commits format
- [ ] No debugging `console.log` in final code
