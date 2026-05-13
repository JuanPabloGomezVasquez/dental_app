import { test as setup } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "../.auth/session.json");

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@clinica.com");
  await page.getByLabel("Contraseña").fill("admin123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: AUTH_FILE });
});
