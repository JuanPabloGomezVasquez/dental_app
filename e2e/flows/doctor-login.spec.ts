/**
 * Doctor login flow:
 * - Doctor with at least one accessible module → redirected to that module's route
 * - Doctor with no accessible modules → redirected to /no-access
 * - Admin always → redirected to /dashboard
 *
 * These tests run without the saved admin session (fresh browser context).
 */
import { test, expect } from "@playwright/test";
import { db, getDefaultOrgId } from "../fixtures/db";
import bcrypt from "bcryptjs";
import { AppModule } from "@prisma/client";

// Override the project-level storageState so these tests start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

const DOCTOR_EMAIL = `e2e-doctor-${Date.now()}@test.local`;
const DOCTOR_PASSWORD = "Doctor123!";

let doctorId: string;
let userId: string;
let orgId: string;

test.beforeAll(async () => {
  orgId = await getDefaultOrgId();
  const hashedPassword = await bcrypt.hash(DOCTOR_PASSWORD, 12);

  const doctor = await db.doctor.create({
    data: { name: "Dr. E2E Login", active: true, organizationId: orgId },
  });
  doctorId = doctor.id;

  const user = await db.user.create({
    data: {
      email: DOCTOR_EMAIL,
      hashedPassword,
      name: "Dr. E2E Login",
      role: "DOCTOR",
      organizationId: orgId,
    },
  });
  userId = user.id;

  await db.doctor.update({ where: { id: doctorId }, data: { userId } });
});

test.afterAll(async () => {
  await db.doctorModulePermission.deleteMany({ where: { doctorId } }).catch(() => undefined);
  await db.appointment.deleteMany({ where: { doctorId } }).catch(() => undefined);
  await db.doctor.update({ where: { id: doctorId }, data: { userId: null } }).catch(() => undefined);
  await db.user.delete({ where: { id: userId } }).catch(() => undefined);
  await db.doctor.delete({ where: { id: doctorId } }).catch(() => undefined);
  await db.$disconnect();
});

test("doctor with no modules is redirected to /no-access", async ({ page }) => {
  // Ensure no module permissions exist for this doctor
  await db.doctorModulePermission.deleteMany({ where: { doctorId } });

  await page.goto("/login");
  await page.getByLabel("Email").fill(DOCTOR_EMAIL);
  await page.getByLabel("Contraseña").fill(DOCTOR_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await page.waitForURL("**/no-access", { timeout: 8000 });
  await expect(page.getByText(/sin módulos habilitados/i)).toBeVisible();
});

test("doctor with APPOINTMENTS enabled is redirected to /appointments", async ({ page }) => {
  // Enable APPOINTMENTS org module and grant to doctor
  const orgModule = await db.orgModule.findFirst({
    where: { organizationId: orgId, module: AppModule.APPOINTMENTS },
  });
  if (!orgModule?.enabled) {
    await db.orgModule.upsert({
      where: { organizationId_module: { organizationId: orgId, module: AppModule.APPOINTMENTS } },
      update: { enabled: true },
      create: { organizationId: orgId, module: AppModule.APPOINTMENTS, enabled: true },
    });
  }
  await db.doctorModulePermission.upsert({
    where: { doctorId_module: { doctorId, module: AppModule.APPOINTMENTS } },
    update: { enabled: true },
    create: { doctorId, module: AppModule.APPOINTMENTS, enabled: true },
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(DOCTOR_EMAIL);
  await page.getByLabel("Contraseña").fill(DOCTOR_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await page.waitForURL("**/appointments", { timeout: 8000 });
});
