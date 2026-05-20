/**
 * Module gating: sidebar and direct URL access reflect org module state.
 * Runs with admin session.
 */
import { test, expect } from "@playwright/test";
import { db, getDefaultOrgId } from "../fixtures/db";
import { AppModule } from "@prisma/client";

let orgId: string;

test.beforeAll(async () => {
  orgId = await getDefaultOrgId();
});

test.afterAll(async () => {
  // Ensure CAJA is always re-enabled after tests in this file
  await db.orgModule.upsert({
    where: { organizationId_module: { organizationId: orgId, module: AppModule.CAJA } },
    update: { enabled: true },
    create: { organizationId: orgId, module: AppModule.CAJA, enabled: true },
  });
  await db.$disconnect();
});

test("sidebar shows Caja link when module is enabled", async ({ page }) => {
  await db.orgModule.upsert({
    where: { organizationId_module: { organizationId: orgId, module: AppModule.CAJA } },
    update: { enabled: true },
    create: { organizationId: orgId, module: AppModule.CAJA, enabled: true },
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Caja", exact: true }).first()).toBeVisible({ timeout: 5000 });
});

test("sidebar hides Caja link when module is disabled for the org", async ({ page }) => {
  await db.orgModule.upsert({
    where: { organizationId_module: { organizationId: orgId, module: AppModule.CAJA } },
    update: { enabled: false },
    create: { organizationId: orgId, module: AppModule.CAJA, enabled: false },
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Caja" })).not.toBeVisible({ timeout: 5000 });
});

test("navigating directly to a disabled module's URL returns 403", async ({ page }) => {
  await db.orgModule.upsert({
    where: { organizationId_module: { organizationId: orgId, module: AppModule.CAJA } },
    update: { enabled: false },
    create: { organizationId: orgId, module: AppModule.CAJA, enabled: false },
  });

  const response = await page.goto("/caja");
  // ForbiddenError is thrown by assertModuleAccess; Next.js returns 403
  expect(response?.status()).toBe(403);
});

test("admin can access admin panel regardless of module config", async ({ page }) => {
  await page.goto("/admin/doctors");
  // Admin section is always accessible to ADMIN role
  await expect(page).toHaveURL(/\/admin\/doctors/);
  await expect(page.getByRole("heading", { name: "Doctores" })).toBeVisible();
});
