import { test as setup } from "@playwright/test";
import path from "path";
import { db } from "./db";

const AUTH_FILE = path.join(__dirname, "../.auth/session.json");

setup("authenticate", async ({ page }) => {
  // Ensure the test admin has no 2FA active — 2FA would block the automated
  // login and there is no way to generate a live TOTP code in setup scripts.
  await db.user.updateMany({
    where: { email: "admin@clinica.com" },
    data: { totpEnabled: false, totpSecret: null },
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@clinica.com");
  await page.getByLabel("Contraseña").fill("admin123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: AUTH_FILE });
});
