import { test, expect } from "@playwright/test";

test.describe("Flujo: asistente IA", () => {
  test.beforeEach(() => {
    if (!process.env.ANTHROPIC_API_KEY) {
      test.skip();
    }
  });

  test("consultar lista de pacientes via chat", async ({ page }) => {
    await page.goto("/ai-assistant");

    await page.getByRole("textbox", { name: /Mensaje|Escribe/i }).fill("¿Cuántos pacientes tenemos?");
    await page.keyboard.press("Enter");

    await expect(page.getByText(/paciente/i)).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByText(/escribiendo|Asistente está/i)
    ).not.toBeVisible({ timeout: 20000 });

    await expect(page.getByText(/tokens usados/i)).toBeVisible();
  });

  test("acción de escritura requiere confirmación", async ({ page }) => {
    await page.goto("/ai-assistant");
    await page
      .getByRole("textbox", { name: /Mensaje|Escribe/i })
      .fill("Crea un paciente llamado María García con cédula 11111111 y teléfono 3009999999");
    await page.keyboard.press("Enter");

    await expect(
      page.getByText(/Crear paciente|crear_paciente/i)
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Confirmar/i })).toBeVisible();

    await page.getByRole("button", { name: /Cancelar/i }).click();
    await expect(page.getByText(/Crear paciente|crear_paciente/i)).not.toBeVisible();
  });
});
