import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const mount = (
  process.env.AUREFORM_BASE_URL
    ? new URL(process.env.AUREFORM_BASE_URL).pathname
    : (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
).replace(/\/+$/, "");
const route = (path: string) => `${mount}${path}`;

async function cleanPage(page: Page, path: string) {
  await page.goto(route(`/en/${path}/`));
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.locator("h1").first()).toBeVisible();
}

test("customer creation, persistence, search, edit, export and confirmed deletion", async ({
  page,
}) => {
  await cleanPage(page, "customers");
  const create = page.getByRole("button", { name: "Add customer" });
  await create.click();
  let dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Full name").fill("Aureform QA");
  await dialog.getByLabel("Email", { exact: true }).fill("qa@aureform.demo");
  await dialog.getByLabel("Company", { exact: true }).fill("Original Studio");
  await dialog.getByRole("button", { name: "Add customer" }).click();
  await expect(dialog).not.toBeVisible();

  const search = page.getByPlaceholder("Search records…");
  await search.fill("qa@aureform.demo");
  await expect(page.getByText("Aureform QA", { exact: true })).toBeVisible();
  await page.reload();
  await search.fill("Original Studio");
  await expect(page.getByText("Aureform QA", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Actions for Aureform QA" }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Aureform QA edited");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("Aureform QA edited", { exact: true }),
  ).toBeVisible();

  const exported = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export", exact: true })
    .first()
    .click();
  expect((await exported).suggestedFilename()).toBe("customers.csv");
  await page
    .getByRole("button", { name: "Actions for Aureform QA edited" })
    .click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Remove 1 record?" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByText("Aureform QA edited", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Actions for Aureform QA edited" })
    .click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByText("Aureform QA edited", { exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await search.fill("qa@aureform.demo");
  await expect(
    page.getByText("No records found", { exact: true }),
  ).toBeVisible();
});

test("table sorting, pagination, filtering and row selection change actual results", async ({
  page,
}) => {
  await cleanPage(page, "customers");
  const first = page.locator("tbody tr").first();
  await expect(first).toContainText("Olivia Rhye");
  await page.getByRole("button", { name: "Customer", exact: true }).click();
  await expect(first).toContainText("Amelia Wilson");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Page 2 of", { exact: false })).toBeVisible();
  await page.getByPlaceholder("Search records…").fill("Sisyphus");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(first).toContainText("Phoenix Baker");
  await page.getByRole("checkbox", { name: "Select this page" }).check();
  await expect(
    page.getByText("1 selected", { exact: false }).first(),
  ).toBeVisible();
  await page.getByPlaceholder("Search records…").fill("No matching company");
  await expect(
    page.getByText("No records found", { exact: true }),
  ).toBeVisible();
});

test("dialog traps focus, Escape restores it, and command search navigates by keyboard", async ({
  page,
}) => {
  await cleanPage(page, "customers");
  const trigger = page.getByRole("button", { name: "Add customer" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 15; index++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        dialog.evaluate((element) => element.contains(document.activeElement)),
      )
      .toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("combobox").fill("Calendar");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(route("/en/calendar/"));
});

test("AI streaming stops, a simulated error retries, and history persists", async ({
  page,
}) => {
  await cleanPage(page, "ai");
  const input = page.getByRole("textbox", { name: "Your message" });
  await input.fill("A considered customer workspace");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByText("Stopped", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Conversation actions" }).click();
  await page.getByRole("menuitem", { name: "Simulate next error" }).click();
  await input.fill("A second original idea");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "simulated" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText("This response uses the local demonstration adapter.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("A second original idea", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("This response uses the local demonstration adapter.", {
      exact: false,
    }),
  ).toBeVisible();
});

test("sign-up, password visibility, reset and OTP are explicit local flows", async ({
  page,
}) => {
  await cleanPage(page, "auth/sign-up");
  await page.getByLabel("Full name").fill("Original Tester");
  await page.getByLabel("Email", { exact: true }).fill("tester@aureform.demo");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page
    .getByRole("button", { name: "Create demo account", exact: true })
    .click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await page
    .getByLabel("Password", { exact: true })
    .fill("OriginalPassword123");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create demo account", exact: true })
    .click();
  await expect(page).toHaveURL(route("/en/onboarding/"));
  await expect(
    page.getByRole("heading", { name: "Build your shared workspace." }),
  ).toBeVisible();
  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("aureform:demo-session") || "{}"),
  );
  expect(session.demo).toBe(true);
  expect(session).not.toHaveProperty("password");

  await page.goto(route("/en/auth/reset-password/"));
  await page.getByLabel("Email", { exact: true }).fill("tester@aureform.demo");
  await page.getByRole("button", { name: "Preview recovery" }).click();
  await expect(
    page.getByText("No email was sent", { exact: false }),
  ).toBeVisible();
  await page.goto(route("/en/auth/verify/"));
  await page.getByRole("textbox").fill("123456");
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page).toHaveURL(route("/en/dashboard/"));
});

test("calendar creation persists and month controls update the visible calendar", async ({
  page,
}) => {
  await cleanPage(page, "calendar");
  await page.getByRole("button", { name: "New event", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Aureform calendar QA");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.getByText("Aureform calendar QA").first()).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "November 2026" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Demo today" }).click();
  await expect(
    page.getByRole("heading", { name: "October 2026" }),
  ).toBeVisible();
});

test("file uploads persist as local bytes and can be downloaded", async ({
  page,
}) => {
  await cleanPage(page, "files");
  await page
    .getByRole("button", { name: "Upload files", exact: true })
    .first()
    .click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "aureform-proof.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Original locally stored bytes."),
  });
  await page
    .getByRole("button", { name: "Save files locally", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("aureform-proof.txt", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("aureform-proof.txt", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Actions for aureform-proof.txt" })
    .click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Download", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("aureform-proof.txt");
  expect(await readFile((await download.path())!, "utf8")).toBe(
    "Original locally stored bytes.",
  );
});

test("settings save actual profile data and every shell layout can be selected", async ({
  page,
}) => {
  await cleanPage(page, "settings/profile");
  await page.getByLabel("Full name").fill("Aureform Profile QA");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Aureform Profile QA");
  await page.goto(route("/en/layouts/"));
  for (const [value, name] of [
    ["compact", "Compact navigation"],
    ["topbar", "Top navigation"],
    ["split", "Split workspace"],
    ["centered", "Centered content"],
    ["floating", "Floating sidebar"],
    ["sidebar", "Classic sidebar"],
  ]) {
    const choice = page.getByRole("button", { name: new RegExp(`^${name}`) });
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("pre")).toContainText(`layout="${value}"`);
  }
});

test("reduced motion disables decorative animation and 200% browser zoom reflows", async ({
  page,
  context,
}) => {
  await cleanPage(page, "dashboard");
  const motion = await page.locator(".page-enter").evaluate((element) => ({
    duration: getComputedStyle(element).animationDuration,
    media: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  expect(motion.media).toBe(true);
  expect(["0s", "1e-05s", "0.00001s"]).toContain(motion.duration);
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: 720,
    height: 500,
    deviceScaleFactor: 2,
    mobile: false,
    scale: 2,
  });
  await expect(page.locator("h1")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  const analysis = await new AxeBuilder({ page }).analyze();
  expect(
    analysis.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact || ""),
    ),
  ).toEqual([]);
});
