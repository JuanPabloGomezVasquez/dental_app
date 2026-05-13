import { test, expect } from "@playwright/test";
import { db } from "../fixtures/db";

test.describe("Flujo: registro de pago completo", () => {
  let patientId: string | undefined;

  test.beforeAll(async () => {
    const patient = await db.patient.create({
      data: {
        firstName: "Paciente",
        lastName: "Test",
        idNumber: `CAJA-${Date.now()}`,
        phone: "3009999999",
        habeaDataConsent: true,
      },
    });
    patientId = patient.id;
  });

  test.afterAll(async () => {
    if (patientId) {
      await db.payment
        .deleteMany({ where: { cajaRecord: { patientId } } })
        .catch(() => undefined);
      await db.cajaRecord.deleteMany({ where: { patientId } }).catch(() => undefined);
      await db.patient.delete({ where: { id: patientId } }).catch(() => undefined);
    }
    await db.$disconnect();
  });

  test("crear registro, abonar y verificar estado PAGADO", async ({ page }) => {
    await page.goto("/caja");
    await page.getByRole("button", { name: /Nuevo/i }).click();

    // Wait for patients to load in select and pick the test patient
    const patientSelect = page.locator('select[name="patientId"]');
    await expect(patientSelect.locator("option").nth(1)).toBeAttached({ timeout: 5000 });
    await patientSelect.selectOption({ label: "Test, Paciente" });

    await page.locator('textarea[name="description"]').fill("Limpieza dental E2E");
    await page.locator('input[name="total"]').fill("200000");
    await page.locator('input[name="initialPayment"]').fill("50000");

    // Payment method select appears when initialPayment > 0
    const methodSelect = page.locator('select[name="paymentMethod"]');
    await expect(methodSelect).toBeVisible({ timeout: 3000 });
    await methodSelect.selectOption("EFECTIVO");

    await page.getByRole("button", { name: "Crear registro" }).click();

    await expect(page.getByText(/Abono Parcial/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/150\.000|150,000/i)).toBeVisible();

    // Target the specific row by description to avoid clicking on other records
    const recordRow = page.locator("tr").filter({ hasText: "Limpieza dental E2E" });
    await recordRow.getByRole("button", { name: "Ver detalle" }).click();

    // PaymentForm is embedded directly in the detail panel
    await page.locator('input[name="amount"]').fill("150000");
    await page.locator('select[name="method"]').selectOption("TRANSFERENCIA");
    await page.getByRole("button", { name: "Registrar abono" }).click();

    // Exact match avoids strict mode collision with the "Pagados" tab button
    await expect(page.getByText("Pagado", { exact: true })).toBeVisible({ timeout: 10000 });

    // Verify invoice column: shows MOCK-... number in dev mode
    await page.goto("/caja");
    await expect(
      page.getByText(/Pendiente|MOCK-/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
