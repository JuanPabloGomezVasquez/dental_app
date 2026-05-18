import { test, expect } from "@playwright/test";
import { db, getDefaultOrgId } from "../fixtures/db";

test.describe("Mensajes de error en español", () => {
  test("formulario de paciente muestra errores en español", async ({ page }) => {
    await page.goto("/patients");
    await page.getByRole("button", { name: /Nuevo Paciente/i }).click();
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText(/requerido|obligatorio/i).first()).toBeVisible();

    await expect(page.getByText("Required")).not.toBeVisible();
    await expect(page.getByText("Invalid")).not.toBeVisible();
    await expect(page.getByText("String must contain")).not.toBeVisible();
  });

  test("error de cédula duplicada muestra mensaje claro", async ({ page }) => {
    const idNumber = `DUP-${Date.now()}`;
    const organizationId = await getDefaultOrgId();
    await db.patient.create({
      data: {
        firstName: "Existente",
        lastName: "Test",
        idNumber,
        phone: "3001111111",
        habeaDataConsent: true,
        organizationId,
      },
    });

    await page.goto("/patients");
    await page.getByRole("button", { name: /Nuevo Paciente/i }).click();

    // Use input IDs directly — getByLabel is unreliable with aria-hidden asterisk spans
    await page.locator("#firstName").fill("Otro");
    await page.locator("#lastName").fill("Paciente");
    await page.locator("#idNumber").fill(idNumber);
    await page.locator("#phone").fill("3002222222");
    await page.locator('input[name="habeaDataConsent"]').check();
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText(/cédula|ya existe/i).first()).toBeVisible({ timeout: 8000 });

    await db.patient.deleteMany({ where: { idNumber } });
  });

  test("estados vacíos muestran texto en español", async ({ page }) => {
    await page.goto("/inventory");
    await page.getByRole("searchbox").fill("xxxxxxproductonoexiste");
    await expect(page.getByText(/no hay|sin resultado|no se encontr/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/No data|No results/i)).not.toBeVisible();
  });
});
