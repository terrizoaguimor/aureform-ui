import { test, expect } from "@playwright/test";

const mount = (
  process.env.AUREFORM_BASE_URL
    ? new URL(process.env.AUREFORM_BASE_URL).pathname
    : (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
).replace(/\/+$/, "");
const route = (path: string) => `${mount}${path}`;

test("Spanish mobile navigation, language and persistent theme controls", async ({
  page,
}) => {
  await page.goto(route("/en/dashboard/"));
  await expect(page.locator("h1")).toHaveText("Your next growth chapter.");
  await page.goto(route("/es/dashboard/"));
  await expect(page.locator("h1")).toHaveText(
    "Tu próxima etapa de crecimiento.",
  );
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(page).toHaveURL(route("/es/customers/"));
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Cambiar tema de color" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "ES — Idioma", exact: true }).click();
  await page.getByRole("menuitem", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(route("/en/customers/"));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
