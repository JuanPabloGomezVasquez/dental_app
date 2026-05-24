/**
 * Super Admin panel flows:
 * - Login as SUPER_ADMIN redirects to /superadmin/organizations
 * - Org list page renders existing organizations
 * - Create new organization: form submission creates org and redirects to list
 * - Org detail: module toggle persists state
 * - Suspend / activate organization
 * - Clinic admin cannot access /superadmin routes
 * - /superadmin/audit-logs renders the logs table with filter controls
 * - /superadmin/security renders 2FA settings
 *
 * These tests use a fresh browser context (no pre-saved admin session).
 */
import { test, expect } from "@playwright/test";
import { db } from "../fixtures/db";
import bcrypt from "bcryptjs";
import { AppModule } from "@prisma/client";

// Run without the saved admin session cookie
test.use({ storageState: { cookies: [], origins: [] } });

const SUPER_ADMIN_EMAIL = "superadmin@dentapp.com";
const SUPER_ADMIN_PASSWORD = "superadmin123";

// Org created during tests — cleaned up in afterAll
let testOrgId: string | null = null;

async function loginAsSuperAdmin(page: import("@playwright/test").Page) {
  // Clear 2FA so automated login is never blocked by the TOTP step
  await db.user.updateMany({
    where: { email: SUPER_ADMIN_EMAIL },
    data: { totpEnabled: false, totpSecret: null },
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill(SUPER_ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(SUPER_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/superadmin/organizations", { timeout: 10000 });
}

test.afterAll(async () => {
  if (testOrgId) {
    await db.orgModule.deleteMany({ where: { organizationId: testOrgId } }).catch(() => undefined);
    await db.user.deleteMany({ where: { organizationId: testOrgId } }).catch(() => undefined);
    await db.organization.delete({ where: { id: testOrgId } }).catch(() => undefined);
  }
  await db.$disconnect();
});

// ─── Authentication ───────────────────────────────────────────────────────────

test("super admin login redirects to /superadmin/organizations", async ({ page }) => {
  await loginAsSuperAdmin(page);
  await expect(page).toHaveURL(/\/superadmin\/organizations/);
});

test("super admin sees the organizations list page", async ({ page }) => {
  await loginAsSuperAdmin(page);
  // At least the default seeded org should appear
  await expect(page.getByRole("heading", { level: 1, name: /organizaciones/i })).toBeVisible();
});

test("clinic admin cannot access /superadmin routes and is redirected to login", async ({ page }) => {
  // Login as regular clinic admin
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@clinica.com");
  await page.getByLabel("Contraseña").fill("admin123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/dashboard", { timeout: 10000 });

  // Attempt to navigate to superadmin panel — authenticated users without SUPER_ADMIN are redirected to /dashboard
  await page.goto("/superadmin/organizations");
  await page.waitForURL("**/dashboard", { timeout: 6000 });
  await expect(page).toHaveURL(/\/dashboard/);
});

// ─── Organization creation ────────────────────────────────────────────────────

test("super admin can create a new organization", async ({ page }) => {
  await loginAsSuperAdmin(page);

  const slug = `e2e-org-${Date.now()}`;
  const adminEmail = `e2e-${Date.now()}@test.local`;

  await page.getByRole("link", { name: /nueva organización/i }).click();
  await page.waitForURL("**/superadmin/organizations/new", { timeout: 6000 });

  await page.getByLabel("Nombre", { exact: true }).fill("Clínica E2E Test");
  await page.getByLabel(/slug/i).fill(slug);
  await page.getByLabel("Nombre completo").fill("Admin E2E");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel(/contraseña/i).fill("adminpass123");

  await page.getByRole("button", { name: /crear organización/i }).click();

  // Redirected back to org list
  await page.waitForURL("**/superadmin/organizations", { timeout: 10000 });

  // Org should appear in the list (use first() to handle leftover orgs from prior runs)
  await expect(page.getByText("Clínica E2E Test").first()).toBeVisible();

  // Store ID for cleanup
  const org = await db.organization.findUnique({ where: { slug } });
  testOrgId = org?.id ?? null;
});

// ─── Org detail and module toggles ───────────────────────────────────────────

test("super admin can navigate to org detail and see module list", async ({ page }) => {
  await loginAsSuperAdmin(page);

  // Click on the first org in the list
  await page.getByRole("link", { name: /clinica|clínica/i }).first().click();
  await page.waitForURL("**/superadmin/organizations/**", { timeout: 6000 });

  await expect(page.getByText(/módulos contratados/i)).toBeVisible();
  // Each AppModule should be listed (label is "Agendamiento", not "Citas")
  await expect(page.getByRole("switch", { name: /agendamiento/i })).toBeVisible();
});

test("super admin can toggle a module off and on", async ({ page }) => {
  // Use the test org if available, otherwise skip
  if (!testOrgId) {
    test.skip();
    return;
  }

  // Ensure CAJA starts enabled for the test org
  await db.orgModule.upsert({
    where: { organizationId_module: { organizationId: testOrgId, module: AppModule.CAJA } },
    update: { enabled: true },
    create: { organizationId: testOrgId, module: AppModule.CAJA, enabled: true },
  });

  await loginAsSuperAdmin(page);
  await page.goto(`/superadmin/organizations/${testOrgId}`);

  const cajaSwitch = page.getByRole("switch", { name: /caja/i });
  await expect(cajaSwitch).toBeVisible();
  await expect(cajaSwitch).toHaveAttribute("aria-checked", "true");

  // Toggle off — wait for the API PUT response (handles cold Next.js dev-mode compilation)
  const offResponsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/superadmin/organizations/${testOrgId}/modules`) &&
      resp.request().method() === "PUT",
    { timeout: 15000 }
  );
  await cajaSwitch.click();
  await expect(cajaSwitch).toHaveAttribute("aria-checked", "false");
  const offResponse = await offResponsePromise;
  expect(offResponse.ok()).toBe(true);
  await expect(page.getByText(/módulo desactivado/i)).toBeVisible({ timeout: 5000 });

  // Verify persisted in DB
  const row = await db.orgModule.findUnique({
    where: { organizationId_module: { organizationId: testOrgId, module: AppModule.CAJA } },
  });
  expect(row?.enabled).toBe(false);

  // Toggle back on — same pattern
  const onResponsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/superadmin/organizations/${testOrgId}/modules`) &&
      resp.request().method() === "PUT",
    { timeout: 15000 }
  );
  await cajaSwitch.click();
  await expect(cajaSwitch).toHaveAttribute("aria-checked", "true");
  const onResponse = await onResponsePromise;
  expect(onResponse.ok()).toBe(true);
  await expect(page.getByText(/módulo activado/i)).toBeVisible({ timeout: 5000 });
});

// ─── Org suspension ───────────────────────────────────────────────────────────

test("super admin can suspend and reactivate an organization", async ({ page }) => {
  if (!testOrgId) {
    test.skip();
    return;
  }

  // Ensure org is active to start
  await db.organization.update({ where: { id: testOrgId }, data: { active: true } });

  await loginAsSuperAdmin(page);
  await page.goto(`/superadmin/organizations/${testOrgId}`);

  const suspendBtn = page.getByRole("button", { name: /suspender/i });
  await expect(suspendBtn).toBeVisible();
  await suspendBtn.click();

  // Wait for toast confirmation (API call completes), then check badge
  await expect(page.getByText(/organización suspendida/i)).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Suspendida", { exact: true })).toBeVisible({ timeout: 5000 });

  // Verify in DB
  const org = await db.organization.findUnique({ where: { id: testOrgId } });
  expect(org?.active).toBe(false);

  // Reactivate
  await page.getByRole("button", { name: /activar/i }).click();
  await expect(page.getByText(/organización activada/i)).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Activa", { exact: true })).toBeVisible({ timeout: 5000 });
});

// ─── Suspended org blocks login ───────────────────────────────────────────────

test("user from suspended organization cannot log in", async ({ page }) => {
  // Create a temp org + user, then suspend the org
  const hashedPassword = await bcrypt.hash("TestPass123!", 12);
  const slug = `suspended-e2e-${Date.now()}`;
  const email = `suspended-${Date.now()}@test.local`;

  const org = await db.organization.create({
    data: { name: "Suspendida E2E", slug, active: false },
  });
  const user = await db.user.create({
    data: {
      email,
      hashedPassword,
      name: "Usuario Suspendido",
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill("TestPass123!");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    // Should remain on /login with an error message
    await expect(page).toHaveURL(/\/login/, { timeout: 6000 });
    await expect(page.getByText(/suspendida/i)).toBeVisible();
  } finally {
    await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await db.organization.delete({ where: { id: org.id } }).catch(() => undefined);
  }
});

// ─── Audit logs ───────────────────────────────────────────────────────────────

test("super admin can navigate to audit logs and see the table", async ({ page }) => {
  await loginAsSuperAdmin(page);

  await page.getByRole("link", { name: /logs de auditoría/i }).click();
  await page.waitForURL("**/superadmin/audit-logs", { timeout: 8000 });

  await expect(
    page.getByRole("heading", { name: /logs de auditoría/i })
  ).toBeVisible({ timeout: 5000 });

  // Filter controls must be present
  await expect(page.locator('select[name="action"]')).toBeVisible();
  await expect(page.locator('select[name="organizationId"]')).toBeVisible();
  await expect(page.locator('input[type="date"][name="from"]')).toBeVisible();

  // Table or empty-state must render (login events were created during test setup)
  const table = page.locator("table");
  const emptyState = page.getByText(/sin resultados|no hay registros/i);
  await expect(table.or(emptyState)).toBeVisible({ timeout: 5000 });
});

test("audit logs filter by action shows only matching rows", async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto("/superadmin/audit-logs?action=LOGIN");

  // Every visible action badge should say "Inicio de sesión"
  const badges = page.locator("table tbody td").filter({ hasText: /inicio de sesión/i });
  const count = await badges.count();

  // If there are rows, they must all be LOGIN; if no rows, empty state is acceptable
  if (count > 0) {
    // All badges in the table should be LOGIN (no other actions visible)
    const allBadges = await page.locator("table tbody tr td:nth-child(3) span").allTextContents();
    for (const badge of allBadges) {
      expect(badge).toMatch(/inicio de sesión/i);
    }
  } else {
    await expect(page.getByText(/sin resultados|no hay registros/i)).toBeVisible();
  }
});

// ─── Security / 2FA settings ──────────────────────────────────────────────────

test("super admin can navigate to security settings", async ({ page }) => {
  await loginAsSuperAdmin(page);

  await page.getByRole("link", { name: /seguridad/i }).click();
  await page.waitForURL("**/superadmin/security", { timeout: 8000 });

  await expect(
    page.getByRole("heading", { name: /seguridad/i })
  ).toBeVisible({ timeout: 5000 });

  await expect(
    page.getByText(/autenticación de dos factores/i).first()
  ).toBeVisible();
});

test("super admin security page shows 2FA status and allows setup", async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto("/superadmin/security");

  // Either the configure button (2FA off) or the status label (2FA on) must be visible
  const configureBtn = page.getByRole("button", { name: /configurar 2fa/i });
  const statusText = page.getByText(/2fa habilitado/i);
  await expect(configureBtn.or(statusText)).toBeVisible({ timeout: 5000 });
});

test("super admin can start 2FA setup and QR code appears", async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto("/superadmin/security");

  const setupBtn = page.getByRole("button", { name: /configurar 2fa/i });
  const isPresent = await setupBtn.isVisible().catch(() => false);
  if (!isPresent) {
    test.skip();
    return;
  }

  await setupBtn.click();

  // QR code data-URL image should appear
  await expect(page.locator("img[src^='data:image']")).toBeVisible({ timeout: 10000 });
});
