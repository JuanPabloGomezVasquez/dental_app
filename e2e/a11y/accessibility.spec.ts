import { test } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

const routes = [
  { name: "Dashboard",    path: "/" },
  { name: "Pacientes",    path: "/patients" },
  {
    name: "Agendamiento",
    path: "/appointments",
    // react-big-calendar genera roles ARIA no conformes internamente — excluir el widget
    exclude: [".rbc-calendar"],
  },
  { name: "Inventario",   path: "/inventory" },
  { name: "Caja",         path: "/caja" },
];

for (const route of routes) {
  test(`${route.name} no tiene violaciones de accesibilidad críticas`, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    await injectAxe(page);

    const context = route.exclude ? { exclude: [route.exclude] } : undefined;

    await checkA11y(page, context, {
      includedImpacts: ["critical", "serious"],
      axeOptions: {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      },
    });
  });
}
