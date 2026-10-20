import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { integrationRouteIndex } from "../../src/lib/integrations/route-index";

const mount = process.env.AUREFORM_BASE_URL
  ? new URL(process.env.AUREFORM_BASE_URL).pathname.replace(/\/+$/, "")
  : "";
for (const recipe of [
  "",
  "supabase-data",
  "better-auth",
  "stripe",
  "cloudinary",
  "google-drive",
  "resend-react-email",
  "posthog",
  "notification-inboxes",
  "background-jobs",
  "microsoft-365",
  "liveblocks",
  "tiptap",
  "algolia",
  "existing-maps",
  "openai-responses",
  "pgvector",
  "openai-agents",
  "jira",
  "n8n",
] satisfies ("" | (typeof integrationRouteIndex)[number]["id"])[]) {
  test(`integration accessibility: ${recipe || "hub"}`, async ({ page }) => {
    await page.goto(`${mount}/en/integrations/${recipe ? `${recipe}/` : ""}`);
    const hub = page.locator("[data-integration-hub]");
    await expect(hub).toBeVisible();
    if (recipe) {
      await hub
        .getByRole("button", { name: "Start local demo", exact: true })
        .click();
      await expect(
        hub.getByText("Local preview configured.", { exact: true }),
      ).toBeVisible();
      if (recipe === "cloudinary") {
        await expect(
          hub
            .getByRole("region", {
              name: "Public media collection",
              exact: true,
            })
            .getByRole("img")
            .first(),
        ).toBeVisible();
      } else {
        await expect(
          hub
            .locator(
              "[data-product-workbench], [data-integration-domain], section[aria-labelledby]",
            )
            .first(),
        ).toBeVisible();
      }
    }
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });
}
