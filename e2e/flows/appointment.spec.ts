import { test, expect } from "@playwright/test";
import { db } from "../fixtures/db";

test.describe("Flujo: crear paciente y agendar cita", () => {
  let createdPatientId: string | undefined;
  let doctorId: string | undefined;
  let procedureId: string | undefined;

  test.beforeAll(async () => {
    const doctor = await db.doctor.create({
      data: { name: "Dr. Playwright", specialty: "Odontología General", active: true },
    });
    const procedure = await db.procedure.create({
      data: { name: "Revisión E2E", active: true },
    });
    doctorId = doctor.id;
    procedureId = procedure.id;
  });

  test.afterAll(async () => {
    if (createdPatientId) {
      await db.appointment
        .deleteMany({ where: { patientId: createdPatientId } })
        .catch(() => undefined);
      await db.patient.delete({ where: { id: createdPatientId } }).catch(() => undefined);
    }
    if (procedureId) {
      await db.procedure.delete({ where: { id: procedureId } }).catch(() => undefined);
    }
    if (doctorId) {
      await db.doctor.delete({ where: { id: doctorId } }).catch(() => undefined);
    }
    await db.$disconnect();
  });

  test("crear nuevo paciente", async ({ page }) => {
    await page.goto("/patients");
    await page.getByRole("button", { name: /Nuevo Paciente/i }).click();

    // Use input IDs directly — getByLabel is unreliable with aria-hidden asterisk spans
    await page.locator("#firstName").fill("Juan");
    await page.locator("#lastName").fill("Prueba");
    await page.locator("#idNumber").fill("99999999");
    await page.locator("#phone").fill("3001234567");
    await page.locator('input[name="habeaDataConsent"]').check();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Prueba, Juan")).toBeVisible({ timeout: 10000 });

    const patient = await db.patient.findFirst({ where: { idNumber: "99999999" } });
    createdPatientId = patient?.id;
  });

  test("agendar cita para el paciente creado", async ({ page }) => {
    await page.goto("/appointments");
    await page.getByRole("button", { name: "Nueva Cita" }).click();

    // Use IDs to avoid strict mode violation with calendar-page filter selects
    await page.locator("#apt-doctor").selectOption({ label: "Dr. Playwright" });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator("#apt-date").fill(tomorrow.toISOString().slice(0, 10));

    // Wait for slot select to load then pick first available
    const slotSelect = page.locator("#apt-slot");
    await expect(slotSelect).not.toBeDisabled({ timeout: 8000 });
    await expect(slotSelect.locator("option").nth(1)).toBeAttached({ timeout: 5000 });
    await slotSelect.selectOption({ index: 1 });

    await page.locator("#apt-procedure").selectOption({ label: "Revisión E2E" });

    // PatientSearch has aria-label="Buscar paciente"
    await page.getByLabel("Buscar paciente").fill("Prueba");
    await expect(page.getByText(/Prueba, Juan/)).toBeVisible({ timeout: 5000 });
    await page.getByText(/Prueba, Juan/).first().click();

    await page.getByRole("button", { name: "Agendar cita" }).click();
    await expect(page.getByText(/cita agendada/i)).toBeVisible({ timeout: 10000 });
  });
});
