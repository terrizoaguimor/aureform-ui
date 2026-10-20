import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

const mount = process.env.AUREFORM_BASE_URL
  ? new URL(process.env.AUREFORM_BASE_URL).pathname.replace(/\/+$/, "")
  : "";
const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [
    async ({ page }, use, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      await info.attach("uncaught-browser-errors", {
        body: JSON.stringify(errors),
        contentType: "application/json",
      });
      expect(
        errors,
        "Operational workflows have no uncaught browser errors",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

function hub(page: Page) {
  return page.locator("[data-integration-hub]");
}

function panel(root: Page | Locator, name: string) {
  return root.getByRole("region", { name, exact: true });
}

function workflow(page: Page, locale: "en" | "es" = "en") {
  return hub(page).getByRole("tabpanel", {
    name: locale === "es" ? "Flujo" : "Workflow",
    exact: true,
  });
}

async function assertFitsViewport(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Configure a viewport for responsive checks.");
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(
    dimensions.document,
    `The workflow fits a ${viewport.width}px viewport without horizontal overflow`,
  ).toBeLessThanOrEqual(viewport.width + 1);
  expect(dimensions.viewport).toBe(viewport.width);
}

async function openDemo(
  page: Page,
  recipe: string,
  locale: "en" | "es" = "en",
  options: { touch?: boolean } = {},
) {
  await page.goto(`${mount}/${locale}/integrations/${recipe}/`);
  await expect(hub(page)).toHaveAttribute("data-integration-mode", "demo");
  const start = hub(page).getByRole("button", {
    name: locale === "es" ? "Iniciar demo local" : "Start local demo",
    exact: true,
  });
  await expect(start).toBeEnabled();
  if (options.touch) {
    await assertFitsViewport(page);
    await start.tap();
  } else {
    await start.click();
  }
  await expect(
    hub(page).getByText(
      locale === "es" ? "Demo local configurada." : "Local preview configured.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(workflow(page, locale)).toContainText(
    locale === "es" ? "Datos demo locales." : "Local demo data.",
  );
}

async function choose(page: Page, control: Locator, name: string) {
  await control.click();
  await page.getByRole("option", { name, exact: true }).click();
}

async function reviewDialog(page: Page, locale: "en" | "es" = "en") {
  const dialog = page.getByRole("dialog", {
    name:
      locale === "es" ? "Revisa antes de ejecutar" : "Review before running",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: locale === "es" ? "Confirmar y ejecutar" : "Confirm and run",
      exact: true,
    }),
  ).toBeDisabled();
  return dialog;
}

async function confirmReview(page: Page, locale: "en" | "es" = "en") {
  const dialog = await reviewDialog(page, locale);
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", {
      name: locale === "es" ? "Confirmar y ejecutar" : "Confirm and run",
      exact: true,
    })
    .click();
  await expect(dialog).not.toBeVisible();
}

async function pauseDemoTimers(page: Page) {
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

async function advanceDemo(page: Page) {
  await page.clock.runFor(1500);
}

async function fillEmail(page: Page, subject: string, content: string) {
  const composer = panel(workflow(page), "Compose an email");
  await composer.getByLabel(/^Recipient email\b/).fill("qa@example.com");
  await composer.getByLabel(/^Subject\b/).fill(subject);
  await composer.getByLabel(/^Content\b/).fill(content);
  return composer;
}

async function fillNotification(page: Page, subject: string) {
  // The connection notice precedes the initial read. Loaded records keep the
  // inbox's loading placeholder from moving the tab during the pointer click.
  const inbox = panel(workflow(page), "Notification inbox");
  await expect(
    inbox.getByRole("button", { name: /^Inbox \d+\b/ }).first(),
  ).toBeVisible();
  await expect(
    inbox.getByRole("button", { name: "Refresh", exact: true }),
  ).toBeEnabled();
  const createTab = workflow(page).getByRole("tab", {
    name: "Create notification",
    exact: true,
  });
  await createTab.click();
  await expect(createTab).toHaveAttribute("aria-selected", "true");
  const composer = panel(workflow(page), "Create a notification");
  await composer
    .getByLabel(/^Workflow reference\b/)
    .fill("approved-demo-notification");
  await composer.getByLabel(/^Notification subject\b/).fill(subject);
  await composer
    .getByLabel(/^Content\b/)
    .fill("A reviewed local notification fixture.");
  return composer;
}

async function switchWorkspace(page: Page, from: "studio" | "personal") {
  await page
    .getByRole("button", {
      name:
        from === "studio"
          ? /^Aureform Studio\s+Aureform$/
          : /^Personal space\s+Personal$/,
    })
    .click();
  // The clock is paused to keep the old workspace's adapter request pending.
  // Advance the menu's opening timers without reaching the demo adapter delay.
  await page.clock.runFor(32);
  await page
    .getByRole("menuitem", {
      name: from === "studio" ? "Personal space" : "Aureform Studio",
      exact: true,
    })
    .click();
}

test("files: actual File preview, alt validation, indeterminate upload, cancellation and retry", async ({
  page,
}) => {
  await openDemo(page, "cloudinary");
  const current = workflow(page);
  const upload = panel(current, "Upload a file");
  const library = panel(current, "File library");
  await expect(
    library.getByRole("button", { name: /^View / }).first(),
  ).toBeVisible();
  await pauseDemoTimers(page);

  const filename = "operations-preview.png";
  await upload.getByLabel("Choose file", { exact: true }).setInputFiles({
    name: filename,
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jh4kAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(panel(current, "File preview")).toContainText(filename);
  await expect(panel(current, "File preview").getByRole("img")).toHaveAttribute(
    "src",
    /^blob:/,
  );

  await upload
    .getByRole("button", { name: "Upload file", exact: true })
    .click();
  await expect(
    upload.getByText("Add alternative text for this image.", { exact: true }),
  ).toBeVisible();
  await expect(
    current.getByRole("heading", { name: "Confirmed uploads", exact: true }),
  ).toHaveCount(0);

  await upload
    .getByLabel("Alternative text / description", { exact: true })
    .fill("A one-pixel test image.");
  await upload
    .getByRole("button", { name: "Upload file", exact: true })
    .click();
  const progress = upload.getByRole("progressbar");
  await expect(progress).toHaveAttribute(
    "aria-valuetext",
    "Waiting for the upload response",
  );
  expect(await progress.getAttribute("aria-valuenow")).toBeNull();
  await current
    .getByRole("button", { name: "Cancel request", exact: true })
    .click();
  await expect(
    current.getByText("The action was cancelled.", { exact: true }),
  ).toBeVisible();
  await expect(
    upload.getByLabel("Alternative text / description", { exact: true }),
  ).toHaveValue("A one-pixel test image.");
  await advanceDemo(page);
  await expect(
    current.getByRole("heading", { name: "Confirmed uploads", exact: true }),
  ).toHaveCount(0);

  await upload
    .getByRole("button", { name: "Upload file", exact: true })
    .click();
  await advanceDemo(page);
  const confirmed = panel(current, "Confirmed uploads");
  await expect(confirmed.getByText(filename, { exact: true })).toBeVisible();
  await expect(
    upload.getByRole("button", { name: "Upload confirmed", exact: true }),
  ).toBeDisabled();
  await expect(
    confirmed.getByRole("link", { name: "Open file", exact: true }),
  ).toHaveAttribute("href", /^\//);

  await library.getByRole("button", { name: "Refresh", exact: true }).click();
  await advanceDemo(page);
  await library
    .getByRole("textbox", { name: "Search loaded records…", exact: true })
    .fill(filename);
  await expect(
    library.getByRole("button", { name: `View ${filename}`, exact: true }),
  ).toBeVisible();
});

test("email: variables resolve in the preview, review can be rejected, and a response stays queued", async ({
  page,
}) => {
  await openDemo(page, "resend-react-email");
  const current = workflow(page);
  const composer = panel(current, "Compose an email");
  const queue = panel(current, "Delivery queue");
  await expect(
    composer.getByRole("button", { name: "Review email", exact: true }),
  ).toBeEnabled();
  await composer.getByLabel(/^Recipient email\b/).fill("qa@example.com");
  await choose(
    page,
    composer.getByRole("combobox", { name: "Draft example", exact: true }),
    "Welcome",
  );
  await composer
    .getByRole("button", { name: "Review email", exact: true })
    .click();
  await expect(
    composer.getByText("Complete this variable.", { exact: true }),
  ).toHaveCount(3);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await composer.getByLabel("name", { exact: true }).fill("Casey");
  await composer
    .getByLabel("workspace", { exact: true })
    .fill("Operations lab");
  await composer
    .getByLabel("url", { exact: true })
    .fill("https://example.com/workspace");
  await expect(panel(current, "Content preview")).toContainText(
    "Welcome, Casey",
  );
  await expect(panel(current, "Content preview")).toContainText(
    "Your Operations lab workspace is ready.",
  );
  await composer
    .getByRole("button", { name: "Review email", exact: true })
    .click();
  const review = await reviewDialog(page);
  await expect(review).toContainText("qa@example.com");
  await expect(review).toContainText("Welcome, Casey");
  await review
    .getByRole("button", { name: "Back to editing", exact: true })
    .click();
  await expect(review).not.toBeVisible();
  await expect(composer.getByLabel(/^Recipient email\b/)).toHaveValue(
    "qa@example.com",
  );
  await expect(
    queue.getByText("No email responses in this session yet.", { exact: true }),
  ).toBeVisible();

  await composer
    .getByRole("button", { name: "Review email", exact: true })
    .click();
  await confirmReview(page);
  await expect(queue.getByText("Queued", { exact: true })).toBeVisible();
  await expect(
    queue.getByText("Welcome, Casey", { exact: true }),
  ).toBeVisible();
  await expect(queue.getByText("Sent", { exact: true })).toHaveCount(0);
  await expect(queue).toContainText(
    "Demo status; no email was sent externally.",
  );
});

test("observability: returned metrics, reviewed flag changes and consent-gated event submission", async ({
  page,
}) => {
  await openDemo(page, "posthog");
  const current = workflow(page);
  await expect(panel(current, "Signals overview")).toContainText("Demo events");
  const explorer = panel(current, "Event explorer");
  await expect(
    explorer.getByRole("button", { name: /^View / }).first(),
  ).toBeVisible();

  await current
    .getByRole("tab", { name: "Feature flags", exact: true })
    .click();
  const flag = panel(current, "Update a flag");
  await flag.getByLabel(/^Flag key\b/).fill("operations-inbox-badge");
  await flag.getByRole("switch", { name: /^Enabled\b/ }).check();
  await flag
    .getByRole("button", { name: "Review flag update", exact: true })
    .click();
  await expect(await reviewDialog(page)).toContainText(
    "operations-inbox-badge",
  );
  await confirmReview(page);
  await expect(panel(current, "Backend response")).toContainText(
    "Demo feature flag enabled",
  );
  await expect(panel(current, "Reported flag states")).not.toContainText(
    "operations-inbox-badge",
  );

  await current
    .getByRole("tab", { name: "Submit an event", exact: true })
    .click();
  const submission = panel(current, "Controlled event submission");
  const submit = submission.getByRole("button", {
    name: "Review and submit event",
    exact: true,
  });
  await submission
    .getByLabel(/^Allowlisted event name\b/)
    .fill("workspace.operations.e2e");
  await expect(submit).toBeDisabled();
  await submission.getByRole("switch").check();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(await reviewDialog(page)).toContainText(
    "workspace.operations.e2e",
  );
  await confirmReview(page);
  // The receipt contains aggregate metrics; read the persisted event explicitly.
  await panel(current, "Signals overview")
    .getByRole("button", { name: "Refresh", exact: true })
    .click();

  await current.getByRole("tab", { name: /^Events\b/ }).click();
  await explorer
    .getByRole("textbox", { name: "Search loaded records…", exact: true })
    .fill("workspace.operations.e2e");
  await explorer
    .getByRole("button", { name: "View workspace.operations.e2e", exact: true })
    .click();
  await expect(
    explorer.getByRole("heading", {
      name: "workspace.operations.e2e",
      exact: true,
    }),
  ).toBeVisible();
  await expect(explorer).toContainText(
    "Local event fixture; no analytics were transmitted.",
  );
});

test("notifications: reviewed creation, explicit local read state and acknowledged preferences", async ({
  page,
}) => {
  await openDemo(page, "notification-inboxes");
  const current = workflow(page);
  const inbox = panel(current, "Notification inbox");
  await expect(
    panel(current, "Delivery preferences").getByRole("button", {
      name: "Review preferences",
      exact: true,
    }),
  ).toBeEnabled();
  const subject = "Operations notification receipt";
  const composer = await fillNotification(page, subject);
  await expect(panel(current, "Notification preview")).toContainText(subject);
  await composer
    .getByRole("button", { name: "Review notification", exact: true })
    .click();
  await expect(await reviewDialog(page)).toContainText(subject);
  await confirmReview(page);
  const card = inbox.getByRole("button", {
    name: new RegExp(`^${subject}\\b`),
  });
  await expect(card).toBeVisible();
  await card.click();
  await inbox
    .getByRole("button", { name: "Mark seen in this view", exact: true })
    .click();
  await expect(card).toContainText("Seen here");
  await expect(inbox).toContainText("Local to this view.");
  await choose(
    page,
    inbox.getByRole("combobox", { name: "Inbox filter", exact: true }),
    "Reported read",
  );
  await expect(card).toHaveCount(0);
  await expect(inbox).toContainText("No notifications match this filter.");

  await current.getByRole("tab", { name: "Preferences", exact: true }).click();
  const preferences = panel(current, "Delivery preferences");
  await preferences.getByRole("switch", { name: /^Enabled\b/ }).check();
  await preferences
    .getByRole("button", { name: "Review preferences", exact: true })
    .click();
  await confirmReview(page);
  await expect(panel(current, "Backend response")).toContainText(
    "Demo notification preferences saved.",
  );
});

test("jobs: cancel a wait, retain inputs, refresh actual progress, cancel the job and review a new retry", async ({
  page,
}) => {
  await openDemo(page, "background-jobs");
  const current = workflow(page);
  const runner = panel(current, "Start a job");
  const detail = panel(current, "Run detail");
  const queue = panel(current, "Job queue");
  await expect(
    runner.getByRole("button", { name: "Review job", exact: true }),
  ).toBeEnabled();
  await pauseDemoTimers(page);
  const name = "Operations report run";
  const payload = '{"format":"csv","limit":0,"includeArchived":false}';
  await runner.getByLabel(/^Name\b/).fill(name);
  await runner.getByLabel(/^Task input \(JSON\)/).fill(payload);
  await runner.getByRole("button", { name: "Review job", exact: true }).click();
  await confirmReview(page);
  await current
    .getByRole("button", { name: "Cancel request", exact: true })
    .click();
  await expect(
    current.getByText("The action was cancelled.", { exact: true }),
  ).toBeVisible();
  await expect(runner.getByLabel(/^Name\b/)).toHaveValue(name);
  await expect(runner.getByLabel(/^Task input \(JSON\)/)).toHaveValue(payload);
  await advanceDemo(page);
  await expect(detail.getByRole("progressbar")).toHaveCount(0);

  await runner.getByRole("button", { name: "Review job", exact: true }).click();
  await confirmReview(page);
  await advanceDemo(page);
  await expect(
    detail.getByRole("heading", { name, exact: true }),
  ).toBeVisible();
  await expect(detail).toContainText("Inputs validated.");
  const progress = detail.getByRole("progressbar");
  const before = Number(await progress.getAttribute("aria-valuenow"));
  expect(before).toBeGreaterThan(0);
  expect(before).toBeLessThan(100);
  await page.clock.runFor(10_000);
  await expect(progress).toHaveAttribute("aria-valuenow", String(before));
  await detail.getByRole("button", { name: "Refresh", exact: true }).click();
  await advanceDemo(page);
  expect(Number(await progress.getAttribute("aria-valuenow"))).toBeGreaterThan(
    before,
  );

  await detail
    .getByRole("button", { name: "Request job cancellation", exact: true })
    .click();
  await confirmReview(page);
  await advanceDemo(page);
  await expect(detail.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(detail).toContainText("Demo run cancelled.");
  await detail
    .getByRole("button", { name: "Review a new retry run", exact: true })
    .click();
  const retry = await reviewDialog(page);
  await expect(retry).toContainText(payload);
  await confirmReview(page);
  await advanceDemo(page);
  await expect(queue.locator("tbody tr")).toHaveCount(2);
  await expect(
    detail.getByText("Running", { exact: true }).first(),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Refresh", exact: true }).click();
  await advanceDemo(page);
  await detail.getByRole("button", { name: "Refresh", exact: true }).click();
  await advanceDemo(page);
  await expect(progress).toHaveAttribute("aria-valuenow", "100");
  await expect(
    detail.getByText("Completed", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    detail.getByRole("button", {
      name: "Request job cancellation",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("automation: actual source mapping, conversion preview, reviewed mapping/trigger and typed run history", async ({
  page,
}) => {
  await openDemo(page, "n8n");
  const current = workflow(page);
  // This recipe requires a run reference before reading its local fixtures.
  await current.getByLabel(/^Job reference\b/).fill("local-demo-source");
  await current
    .getByRole("button", { name: "Load records", exact: true })
    .click();
  const studio = panel(current, "Workflow studio");
  const source = studio.getByRole("combobox", {
    name: "Source record",
    exact: true,
  });
  await expect(source).not.toBeDisabled();
  const sourceName = (await source.innerText()).trim();
  await studio
    .getByRole("button", { name: "Add mapping", exact: true })
    .click();
  await studio.getByLabel("Destination field", { exact: true }).fill("title");
  await choose(
    page,
    studio.getByRole("combobox", { name: "Transform", exact: true }),
    "Lowercase",
  );
  await expect(
    studio.getByText(sourceName.toLowerCase(), { exact: true }),
  ).toBeVisible();

  await current.getByRole("tab", { name: "Save mapping", exact: true }).click();
  const mapping = panel(current, "Save a mapping");
  await mapping
    .getByRole("button", { name: "Review mapping request", exact: true })
    .click();
  const mapReview = await reviewDialog(page);
  await expect(mapReview).toContainText("name");
  await expect(mapReview).toContainText("title");
  await confirmReview(page);
  await expect(panel(current, "Backend response")).toContainText(
    "Demo field mapping saved.",
  );

  await studio
    .getByRole("button", { name: "Add mapping", exact: true })
    .click();
  await studio
    .getByLabel("Destination field", { exact: true })
    .nth(1)
    .fill("title");
  await expect(
    studio.getByText("Each destination must be unique.", { exact: true }),
  ).toBeVisible();
  await current
    .getByRole("tab", { name: "Review trigger", exact: true })
    .click();
  const trigger = panel(current, "Trigger an approved workflow");
  await expect(
    trigger.getByRole("button", {
      name: "Review workflow request",
      exact: true,
    }),
  ).toBeDisabled();
  await studio
    .getByRole("button", { name: "Remove mapping 2", exact: true })
    .click();
  await trigger.getByLabel(/^Name\b/).fill("Operations mapped workflow");
  await trigger
    .getByRole("button", { name: "Review workflow request", exact: true })
    .click();
  const request = await reviewDialog(page);
  await expect(request).toContainText(`"title":"${sourceName.toLowerCase()}"`);
  await request
    .getByRole("button", { name: "Back to editing", exact: true })
    .click();
  await expect(
    current.getByRole("heading", {
      name: "Reported workflow runs",
      exact: true,
    }),
  ).toHaveCount(0);
  await trigger
    .getByRole("button", { name: "Review workflow request", exact: true })
    .click();
  await confirmReview(page);
  await expect(
    panel(current, "Reported workflow runs").getByRole("progressbar"),
  ).toBeVisible();
  await expect(panel(current, "Reported workflow runs")).toContainText(
    "Operations mapped workflow",
  );
  await current.getByRole("tab", { name: "Run history", exact: true }).click();
  const history = panel(current, "Responses in this session");
  const responses = history
    .locator("article")
    .filter({ has: page.locator("summary") });
  await expect(responses).toHaveCount(2);
  await expect(
    history.getByText("Response received", { exact: true }),
  ).toHaveCount(1);
  await responses.locator("summary").first().click();
  await expect(history.getByRole("progressbar")).toBeVisible();
  await expect(history).toContainText("Inputs validated.");
});

test("permissions: revoke a send grant, block submission with feedback, then regrant and send only after review", async ({
  page,
}) => {
  await openDemo(page, "resend-react-email");
  await hub(page).getByRole("tab", { name: "Connection", exact: true }).click();
  const sendGrant = hub(page)
    .locator("label")
    .filter({ hasText: "Send transactional messages" })
    .getByRole("checkbox");
  await expect(sendGrant).toBeChecked();
  await sendGrant.uncheck();
  await hub(page)
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(
    hub(page).getByText("Configuration saved.", { exact: true }),
  ).toBeVisible();
  await hub(page).getByRole("tab", { name: "Workflow", exact: true }).click();
  const composer = await fillEmail(
    page,
    "Permission-gated email",
    "Only send after the grant is restored.",
  );
  await expect(
    composer.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  await expect(composer).toContainText(
    "This connection needs permission for this action.",
  );
  await composer.locator("form").dispatchEvent("submit");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    panel(workflow(page), "Delivery queue").getByText("Queued", {
      exact: true,
    }),
  ).toHaveCount(0);

  await hub(page).getByRole("tab", { name: "Connection", exact: true }).click();
  await sendGrant.check();
  await hub(page)
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(
    hub(page).getByText("Configuration saved.", { exact: true }),
  ).toBeVisible();
  await hub(page).getByRole("tab", { name: "Workflow", exact: true }).click();
  await fillEmail(
    page,
    "Permission-gated email",
    "Only send after the grant is restored.",
  );
  await composer
    .getByRole("button", { name: "Review email", exact: true })
    .click();
  await confirmReview(page);
  await expect(
    panel(workflow(page), "Delivery queue").getByText("Queued", {
      exact: true,
    }),
  ).toBeVisible();
});

test("workspaces: isolate committed records, clear drafts and ignore a late outcome after switching", async ({
  page,
}) => {
  await openDemo(page, "notification-inboxes");
  const committed = "Studio-only operations notice";
  let composer = await fillNotification(page, committed);
  await composer
    .getByRole("button", { name: "Review notification", exact: true })
    .click();
  await confirmReview(page);
  await expect(
    panel(workflow(page), "Notification inbox").getByRole("button", {
      name: new RegExp(`^${committed}\\b`),
    }),
  ).toBeVisible();
  await pauseDemoTimers(page);

  const unconfirmed = "Never show this pending Studio notice in Personal";
  composer = await fillNotification(page, unconfirmed);
  await composer
    .getByRole("button", { name: "Review notification", exact: true })
    .click();
  await confirmReview(page);
  await expect(
    workflow(page).getByRole("button", { name: "Cancel request", exact: true }),
  ).toBeVisible();
  await switchWorkspace(page, "studio");
  await advanceDemo(page);
  const personalStart = hub(page).getByRole("button", {
    name: "Start local demo",
    exact: true,
  });
  await expect(personalStart).toBeEnabled();
  await expect(hub(page)).not.toContainText(committed);
  await expect(hub(page)).not.toContainText(unconfirmed);
  await personalStart.click();
  await advanceDemo(page);
  await expect(panel(workflow(page), "Notification inbox")).toBeVisible();
  await workflow(page)
    .getByRole("tab", { name: "Create notification", exact: true })
    .click();
  await expect(
    panel(workflow(page), "Create a notification").getByLabel(
      /^Notification subject\b/,
    ),
  ).toHaveValue("");
  await expect(hub(page)).not.toContainText(committed);
  await expect(hub(page)).not.toContainText(unconfirmed);

  await switchWorkspace(page, "personal");
  await advanceDemo(page);
  const studioInbox = panel(workflow(page), "Notification inbox");
  await expect(
    studioInbox.getByRole("button", { name: new RegExp(`^${committed}\\b`) }),
  ).toBeVisible();
  await expect(studioInbox).not.toContainText(unconfirmed);
  await workflow(page)
    .getByRole("tab", { name: "Create notification", exact: true })
    .click();
  await expect(
    panel(workflow(page), "Create a notification").getByLabel(
      /^Notification subject\b/,
    ),
  ).toHaveValue("");
});

test.describe("Spanish touch viewport", () => {
  test.use({
    viewport: { width: 360, height: 900 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });

  test("review acknowledgment and localized queued status remain usable", async ({
    page,
  }) => {
    await openDemo(page, "resend-react-email", "es", { touch: true });
    const current = workflow(page, "es");
    const composer = panel(current, "Redactar un correo");
    await composer
      .getByLabel(/^Email del destinatario\b/)
      .fill("qa@example.com");
    await composer.getByLabel(/^Asunto\b/).fill("Correo desde el workbench");
    await composer
      .getByLabel(/^Contenido\b/)
      .fill("Vista previa local revisada.");
    await composer
      .getByRole("button", { name: "Revisar correo", exact: true })
      .tap();
    await expect(await reviewDialog(page, "es")).toContainText(
      "Vista previa local revisada.",
    );
    await confirmReview(page, "es");
    await expect(
      panel(current, "Cola de entrega").getByText("En cola", { exact: true }),
    ).toBeVisible();
    await assertFitsViewport(page);
  });
});
