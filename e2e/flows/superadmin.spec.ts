/**
 * Super Admin panel flows:
 * - Login as SUPER_ADMIN redirects to /superadmin/organizations
 * - Org list page renders existing organizations
 * - Create new organization: form submission creates org and redirects to list
 * - Org detail: module toggle persists state
 * - Suspend / activate organization
 * - Clinic admin cannot access /superadmin routes
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

  // Attempt to navigate to superadmin panel
  await page.goto("/superadmin/organizations");
  await page.waitForURL("**/login", { timeout: 6000 });
  await expect(page).toHaveURL(/\/login/);
});

// ─── Organization creation ────────────────────────────────────────────────────

test("super admin can create a new organization", async ({ page }) => {
  await loginAsSuperAdmin(page);

  const slug = `e2e-org-${Date.now()}`;
  const adminEmail = `e2e-${Date.now()}@test.local`;

  await page.getByRole("link", { name: /nueva organización/i }).click();
  await page.waitForURL("**/superadmin/organizations/new", { timeout: 6000 });

  await page.getByLabel("Nombre").fill("Clínica E2E Test");
  await page.getByLabel(/slug/i).fill(slug);
  await page.getByLabel("Nombre completo").fill("Admin E2E");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel(/contraseña/i).fill("adminpass123");

  await page.getByRole("button", { name: /crear organización/i }).click();

  // Redirected back to org list
  await page.waitForURL("**/superadmin/organizations", { timeout: 10000 });

  // Org should appear in the list
  await expect(page.getByText("Clínica E2E Test")).toBeVisible();

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
  // Each AppModule should be listed
  await expect(page.getByRole("switch", { name: /citas/i })).toBeVisible();
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

  // Toggle off
  await cajaSwitch.click();
  await expect(cajaSwitch).toHaveAttribute("aria-checked", "false");

  // Verify persisted in DB
  const row = await db.orgModule.findUnique({
    where: { organizationId_module: { organizationId: testOrgId, module: AppModule.CAJA } },
  });
  expect(row?.enabled).toBe(false);

  // Toggle back on
  await cajaSwitch.click();
  await expect(cajaSwitch).toHaveAttribute("aria-checked", "true");
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

  // Status badge should change
  await expect(page.getByText("Suspendida")).toBeVisible({ timeout: 5000 });

  // Verify in DB
  const org = await db.organization.findUnique({ where: { id: testOrgId } });
  expect(org?.active).toBe(false);

  // Reactivate
  await page.getByRole("button", { name: /activar/i }).click();
  await expect(page.getByText("Activa")).toBeVisible({ timeout: 5000 });
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
