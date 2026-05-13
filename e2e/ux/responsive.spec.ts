import { test, expect } from "@playwright/test";

test.describe("Responsividad en tablet", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("sidebar es navegable en tablet", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("tabla de pacientes es legible en tablet", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.getByText("Nombre")).toBeVisible();
    await expect(page.getByText("N° Identificación")).toBeVisible();
  });

  test("tabla de inventario es legible en tablet", async ({ page }) => {
    await page.goto("/inventory");
    // Tab controls are always rendered regardless of inventory data
    await expect(page.getByRole("button", { name: "Todos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Activos", exact: true })).toBeVisible();
  });

  test("tabla de caja es legible en tablet", async ({ page }) => {
    await page.goto("/caja");
    await expect(page.getByText(/Paciente|Estado/i).first()).toBeVisible();
  });

  test("formulario de cita es usable en tablet", async ({ page }) => {
    await page.goto("/appointments");
    await page.getByRole("button", { name: "Nueva Cita" }).click();
    // PatientSearch has aria-label="Buscar paciente"
    await expect(page.getByLabel("Buscar paciente")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Agendar cita" })
    ).toBeVisible();
  });
});
