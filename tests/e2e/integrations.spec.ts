import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  integrationDefinitions,
  integrationFamilies,
} from "../../src/lib/integrations/definitions";
import { integrationRouteIndex } from "../../src/lib/integrations/route-index";
import type {
  IntegrationDefinition,
  IntegrationFamily,
  IntegrationRecord,
  IntegrationAction,
} from "../../src/lib/integrations/contracts";
import {
  connectorDomainValues,
  connectorComparisonRows,
  connectorPullRequestProblem,
  connectorReportedTransitionChoices,
  connectorReviewSnapshot,
  connectorTargetRecord,
  connectorTransitionChoices,
  connectorTransitionFieldsProblem,
} from "../../src/components/integrations/product-connector-actions";

type Locale = "en" | "es";
const supplied = process.env.AUREFORM_BASE_URL;
const mount = supplied ? new URL(supplied).pathname.replace(/\/+$/, "") : "";
const route = (path: string, locale: Locale = "en") =>
  `${mount}/${locale}/${path ? `${path}/` : ""}`;
const definitions = new Map(
  integrationDefinitions.map((definition) => [definition.id, definition]),
);

// Use isolated anonymous demos. A native preview must neither contact a vendor
// nor fall through to a consumer HTTP endpoint, including through a popup.
const test = base.extend<{ localBoundary: void }>({
  localBoundary: [
    async ({ context, page, baseURL }, use) => {
      const origin = new URL(baseURL ?? supplied ?? "http://127.0.0.1:3124")
        .origin;
      const external: string[] = [];
      const consumer: string[] = [];
      const errors: string[] = [];
      await context.route(/^https?:\/\//, async (request) => {
        const url = new URL(request.request().url());
        if (url.origin !== origin) {
          external.push(url.href);
          await request.abort("blockedbyclient");
          return;
        }
        if (
          /\/api\/(?:integrations|commerce|stripe|identity|ai)(?:\/|$)/.test(
            url.pathname,
          )
        )
          consumer.push(`${request.request().method()} ${url.pathname}`);
        await request.continue();
      });
      await context.routeWebSocket(/.*/, (socket) => {
        const url = new URL(socket.url());
        const httpOrigin = `${url.protocol === "wss:" ? "https:" : "http:"}//${url.host}`;
        if (httpOrigin !== origin) {
          external.push(url.href);
          socket.close({ code: 1008, reason: "Local demo only" });
        } else socket.connectToServer();
      });
      page.on("pageerror", (error) => errors.push(error.message));
      context.on("page", (popup) => {
        popup.on("pageerror", (error) => errors.push(error.message));
      });
      await context.addInitScript(() => {
        if (!sessionStorage.getItem("aureform-integration-hub-test")) {
          localStorage.clear();
          sessionStorage.setItem("aureform-integration-hub-test", "local-demo");
        }
      });
      await use();
      expect(
        external,
        "Local recipes must not contact external services",
      ).toEqual([]);
      expect(consumer, "Native demos must not call consumer endpoints").toEqual(
        [],
      );
      expect(
        errors,
        "Integration workbenches must not throw page errors",
      ).toEqual([]);
      expect(
        context.pages(),
        "Local workflows do not open account popups",
      ).toHaveLength(1);
    },
    { auto: true },
  ],
});

async function choose(page: Page, control: Locator, label: string) {
  await control.click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await expect(control).toContainText(label);
}

async function openHub(page: Page, locale: Locale = "en") {
  await page.goto(route("integrations", locale));
  const hub = page.locator("[data-integration-hub]");
  await expect(hub).toHaveAttribute("data-integration-mode", "demo");
  await expect(hub).toHaveAttribute("data-integration-count", "65");
  await expect(
    hub.getByText(
      locale === "en"
        ? "Configuration and workflows included"
        : "Configuración y flujos incluidos",
      { exact: true },
    ),
  ).toBeVisible();
  return hub;
}

async function listedIds(hub: Locator) {
  return hub
    .locator("[data-integration-card]")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-integration-card")).sort(),
    );
}

async function openRecipe(page: Page, id: string, locale: Locale = "en") {
  const response = await page.goto(route(`integrations/${id}`, locale));
  expect(response?.status(), `${id} has a public route`).toBe(200);
  const bench = page.locator(`[data-integration-workbench="${id}"]`);
  await expect(bench).toBeVisible();
  await expect(
    bench.getByRole("heading", {
      name: definitions.get(id)!.name,
      exact: true,
    }),
  ).toBeVisible();
  // Enabled only after the initial connection/event request and workspace
  // hydration finish, so the following clicks exercise live React handlers.
  await expect(
    bench.getByRole("button", {
      name: locale === "en" ? "Start local demo" : "Iniciar demo local",
      exact: true,
    }),
  ).toBeEnabled();
  return bench;
}

async function connect(bench: Locator, locale: Locale = "en") {
  await bench
    .getByRole("button", {
      name: locale === "en" ? "Start local demo" : "Iniciar demo local",
      exact: true,
    })
    .click();
  await expect(
    bench.getByRole("button", {
      name: locale === "en" ? "Sync resources" : "Sincronizar recursos",
      exact: true,
    }),
  ).toBeEnabled();
}

async function connectionTab(bench: Locator) {
  await bench.getByRole("tab", { name: "Connection", exact: true }).click();
  await expect(
    bench.getByRole("heading", { name: "Connection details", exact: true }),
  ).toBeVisible();
}

async function availableActions(
  page: Page,
  bench: Locator,
  locale: Locale = "en",
) {
  const details = bench.locator("details").filter({
    hasText:
      locale === "es"
        ? "Explorar todas las acciones disponibles"
        : "Explore all available actions",
  });
  if ((await details.getAttribute("open")) === null)
    await details.locator("summary").click();
  const control = bench.getByLabel(
    locale === "es" ? "Acción disponible" : "Available action",
    { exact: true },
  );
  await control.click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole("option").first()).toBeVisible();
  const labels = await listbox.getByRole("option").allTextContents();
  await page.keyboard.press("Escape");
  await expect(listbox).not.toBeVisible();
  return labels;
}

async function changeProvider(page: Page, bench: Locator, name: string) {
  await connectionTab(bench);
  await choose(
    page,
    bench.getByLabel("Provider choice", { exact: true }),
    name,
  );
  await bench
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(
    bench.getByRole("tab", { name: "Workflow", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeEnabled();
}

async function switchWorkspace(page: Page, from: string, to: string) {
  await page
    .locator('button[aria-haspopup="menu"]:visible')
    .filter({ hasText: from })
    .click();
  await page.getByRole("menuitem", { name: to, exact: true }).click();
  await expect(
    page
      .locator('button[aria-haspopup="menu"]:visible')
      .filter({ hasText: to }),
  ).toBeVisible();
}

async function updateThroughExplorer(
  page: Page,
  bench: Locator,
  action: IntegrationAction,
  values: Record<string, string>,
  locale: Locale = "en",
) {
  const es = locale === "es";
  await availableActions(page, bench, locale);
  const explorer = bench.locator("details").filter({
    hasText: es
      ? "Explorar todas las acciones disponibles"
      : "Explore all available actions",
  });
  await choose(
    page,
    explorer.getByLabel(es ? "Acción disponible" : "Available action", {
      exact: true,
    }),
    action.label[locale],
  );
  for (const [key, value] of Object.entries(values)) {
    const field = action.fields.find((field) => field.id === key)!;
    expect(field, `${key} is a declared update field`).toBeTruthy();
    await explorer
      .getByLabel(field.label[locale], { exact: false })
      .fill(value);
  }
  await explorer
    .getByRole("button", { name: action.label[locale], exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: es ? "Revisa antes de ejecutar" : "Review before running",
    exact: true,
  });
  await review
    .getByRole("checkbox", {
      name: es
        ? "Revisé el destinatario, el recurso y el contenido de esta acción."
        : "I reviewed the recipient, resource and content of this action.",
      exact: true,
    })
    .check();
  await review
    .getByRole("button", {
      name: es ? "Confirmar y ejecutar" : "Confirm and run",
      exact: true,
    })
    .click();
  await expect(explorer.getByText(values.value, { exact: true })).toBeVisible();
  return explorer;
}

const workbenchHeading: Record<IntegrationFamily, string> = {
  data: "Explore your data",
  identity: "Identity & access",
  commerce: "Your product collection",
  files: "Upload a file",
  email: "Compose an email",
  observability: "Signals overview",
  notifications: "Notification inbox",
  jobs: "Start a job",
  collaboration: "Shared workspace",
  content: "Document workspace",
  search: "Search connected sources",
  maps: "Location workbench",
  ai: "AI workspace",
  knowledge: "Knowledge sources",
  agents: "Agent and tool discovery",
  connectors: "Resource scope",
  automation: "Workflow studio",
};

async function expectWorkbench(
  bench: Locator,
  definition: IntegrationDefinition,
) {
  const special = ["identity", "commerce", "ai"].includes(definition.family);
  const product = [
    "data",
    "collaboration",
    "content",
    "search",
    "maps",
    "knowledge",
    "agents",
    "connectors",
  ].includes(definition.family);
  if (special)
    await expect(
      bench.locator(`[data-integration-domain="${definition.family}"]`),
    ).toBeVisible();
  else if (product)
    await expect(
      bench.locator(
        `[data-product-workbench="${definition.family}"][data-integration-mode="demo"]`,
      ),
    ).toBeVisible();
  else
    await expect(
      bench.getByText(
        "Local demo data. Uploads, messages, tracking and triggers stay in the preview.",
        { exact: true },
      ),
    ).toBeVisible();
  await expect(
    bench.getByRole("heading", {
      name: workbenchHeading[definition.family],
      exact: true,
    }),
  ).toBeVisible();
}

test("Hub lists all 65 recipes and combines family, search and connection filters", async ({
  page,
}) => {
  const hub = await openHub(page);
  expect(integrationRouteIndex).toHaveLength(65);
  expect(integrationDefinitions).toHaveLength(65);
  const expectedIds = integrationRouteIndex.map((item) => item.id).sort();
  expect(new Set(expectedIds).size).toBe(65);
  expect(await listedIds(hub)).toEqual(expectedIds);
  const family = hub.getByLabel("Integration family", { exact: true });
  for (const item of integrationFamilies) {
    await choose(page, family, item.name.en);
    await expect
      .poll(() => listedIds(hub))
      .toEqual(
        integrationDefinitions
          .filter((definition) => definition.family === item.id)
          .map((definition) => definition.id)
          .sort(),
      );
  }
  await choose(page, family, "All categories");
  const search = hub.getByLabel("Find an integration", { exact: true });
  await search.fill("  cLeRk  ");
  await expect.poll(() => listedIds(hub)).toEqual(["clerk"]);
  await search.fill("Microsoft Teams");
  await expect.poll(() => listedIds(hub)).toEqual(["microsoft-365"]);
  await choose(page, family, "Commerce");
  await expect(
    hub.getByText("No integrations match", { exact: true }),
  ).toBeVisible();
  await hub.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(family).toHaveText("All categories");
  await expect.poll(() => listedIds(hub)).toEqual(expectedIds);
  const health = hub.getByLabel("Connection health", { exact: true });
  for (const label of ["Connected", "Needs attention"]) {
    await choose(page, health, label);
    await expect(hub.locator("[data-integration-card]")).toHaveCount(0);
    await expect(
      hub.getByText("No integrations match", { exact: true }),
    ).toBeVisible();
  }
  await hub.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(health).toHaveText("All statuses");
  await expect.poll(() => listedIds(hub)).toEqual(expectedIds);
});

test("Spanish Hub localizes search, filters and empty-state recovery", async ({
  page,
}) => {
  const hub = await openHub(page, "es");
  await expect(
    hub.getByRole("heading", { name: "Integraciones", exact: true }),
  ).toBeVisible();
  const search = hub.getByLabel("Buscar integración", { exact: true });
  await choose(
    page,
    hub.getByLabel("Familia de integración", { exact: true }),
    "Comercio",
  );
  await expect
    .poll(() => listedIds(hub))
    .toEqual(["lemon-squeezy", "paddle", "polar", "stripe"]);
  await search.fill("PADDLE");
  await expect.poll(() => listedIds(hub)).toEqual(["paddle"]);
  await choose(
    page,
    hub.getByLabel("Estado de conexión", { exact: true }),
    "Conectadas",
  );
  await expect(
    hub.getByText("No hay integraciones coincidentes", { exact: true }),
  ).toBeVisible();
  await hub
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(hub.locator("[data-integration-card]")).toHaveCount(65);
});

test("Configuration saves grants and authorized resources, then disconnect requires review", async ({
  page,
}) => {
  const bench = await openRecipe(page, "slack");
  await connectionTab(bench);
  const reference = bench.getByLabel("Backend connection reference *", {
    exact: true,
  });
  await reference.fill("slack-studio-preview");
  const required = bench.getByRole("checkbox", {
    name: /^Inspect selected Slack channels/,
  });
  const publish = bench.getByRole("checkbox", {
    name: /^Post reviewed Slack messages/,
  });
  await expect(required).toBeChecked();
  await expect(required).toBeDisabled();
  await publish.uncheck();
  await bench.getByRole("checkbox", { name: /^Release project 1/ }).check();
  await bench.getByRole("checkbox", { name: /^Shared documents 1/ }).check();
  await expect(bench.getByText("2 selected", { exact: true })).toBeVisible();
  const resourceSearch = bench.getByLabel("Find an authorized resource", {
    exact: true,
  });
  await resourceSearch.fill("Release project 1");
  await expect(
    bench.getByRole("checkbox", { name: /^Release project/ }),
  ).toHaveCount(1);
  await resourceSearch.fill("no-resource-has-this-name");
  await expect(
    bench.getByText("No matching authorized resources.", { exact: true }),
  ).toBeVisible();
  await resourceSearch.fill("");
  await expect(
    bench.getByRole("checkbox", { name: /^Shared documents 1/ }),
  ).toBeChecked();
  await bench
    .getByRole("button", { name: "Connect local demo", exact: true })
    .click();
  const scope = bench.getByRole("region", {
    name: "Resource scope",
    exact: true,
  });
  await expect(scope.getByRole("checkbox")).toHaveCount(2);
  await expect(
    scope.getByRole("checkbox", { name: /Release project 1/ }),
  ).toBeChecked();
  await availableActions(page, bench);
  await choose(
    page,
    bench.getByLabel("Available action", { exact: true }),
    "Post a Slack message",
  );
  await expect(
    bench.getByRole("button", { name: "Post a Slack message", exact: true }),
  ).toBeDisabled();
  await connectionTab(bench);
  await expect(reference).toHaveValue("slack-studio-preview");
  await expect(publish).not.toBeChecked();
  await publish.check();
  await bench
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(
    bench.getByText("Configuration saved.", { exact: true }),
  ).toBeVisible();
  await bench.getByRole("tab", { name: "Workflow", exact: true }).click();
  await availableActions(page, bench);
  await choose(
    page,
    bench.getByLabel("Available action", { exact: true }),
    "Post a Slack message",
  );
  await expect(
    bench.getByRole("button", { name: "Post a Slack message", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "All integrations", exact: true })
    .click();
  const hub = page.locator("[data-integration-hub]");
  await choose(
    page,
    hub.getByLabel("Connection health", { exact: true }),
    "Connected",
  );
  await expect.poll(() => listedIds(hub)).toEqual(["slack"]);
  await hub.locator('[data-integration-card="slack"]').click();
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeEnabled();
  await bench.getByRole("button", { name: "Disconnect", exact: true }).click();
  const review = page.getByRole("dialog", {
    name: "Disconnect this account?",
    exact: true,
  });
  await review
    .getByRole("button", { name: "Keep connection", exact: true })
    .click();
  await expect(review).not.toBeVisible();
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeEnabled();
  await bench.getByRole("button", { name: "Disconnect", exact: true }).click();
  await review.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeDisabled();
  await expect(bench.getByText("Disconnected", { exact: true })).toBeVisible();
  await bench.getByRole("tab", { name: "Activity", exact: true }).click();
  await bench
    .getByRole("button", { name: "Refresh activity", exact: true })
    .click();
  await expect(
    bench.getByText("Demo connection disconnected.", { exact: true }),
  ).toBeVisible();
  await expect(
    bench.getByText("Demo permissions and selected resources updated.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "All integrations", exact: true })
    .click();
  await expect(
    hub.getByLabel("Connection health", { exact: true }),
  ).toContainText("Connected");
  await expect(hub.locator("[data-integration-card]")).toHaveCount(0);
});

test("Connections, grants and resources remain scoped to the active workspace", async ({
  page,
}) => {
  const bench = await openRecipe(page, "slack");
  await connectionTab(bench);
  const reference = bench.getByLabel("Backend connection reference *", {
    exact: true,
  });
  await reference.fill("studio-only-slack");
  await bench
    .getByRole("checkbox", { name: /^Post reviewed Slack messages/ })
    .uncheck();
  await bench.getByRole("checkbox", { name: /^Release project 1/ }).check();
  await bench
    .getByRole("button", { name: "Connect local demo", exact: true })
    .click();
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeEnabled();
  await switchWorkspace(page, "Aureform Studio", "Personal space");
  await expect(
    bench.getByRole("button", { name: "Start local demo", exact: true }),
  ).toBeEnabled();
  await connectionTab(bench);
  await expect(reference).toHaveValue("demo-slack");
  await expect(
    bench.getByRole("checkbox", { name: /^Post reviewed Slack messages/ }),
  ).toBeChecked();
  await expect(bench.getByText("0 selected", { exact: true })).toBeVisible();
  await reference.fill("personal-only-slack");
  await bench.getByRole("checkbox", { name: /^Support queue 1/ }).check();
  await bench
    .getByRole("button", { name: "Connect local demo", exact: true })
    .click();
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeEnabled();
  await switchWorkspace(page, "Personal space", "Aureform Studio");
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeEnabled();
  await connectionTab(bench);
  await expect(reference).toHaveValue("studio-only-slack");
  await expect(
    bench.getByRole("checkbox", { name: /^Post reviewed Slack messages/ }),
  ).not.toBeChecked();
  await expect(
    bench.getByRole("checkbox", { name: /^Release project 1/ }),
  ).toBeChecked();
  await expect(
    bench.getByRole("checkbox", { name: /^Support queue 1/ }),
  ).not.toBeChecked();
  await switchWorkspace(page, "Aureform Studio", "Personal space");
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeEnabled();
  await connectionTab(bench);
  await expect(reference).toHaveValue("personal-only-slack");
  await expect(
    bench.getByRole("checkbox", { name: /^Support queue 1/ }),
  ).toBeChecked();
});

test("Microsoft 365 provider choices expose SharePoint, Teams and Outlook capabilities separately", async ({
  page,
}) => {
  const bench = await openRecipe(page, "microsoft-365");
  await connect(bench);
  expect(await availableActions(page, bench)).toEqual([
    "Test connection",
    "Inspect selected documents",
    "Rename an authorized document",
  ]);
  await changeProvider(page, bench, "Microsoft Teams");
  expect(await availableActions(page, bench)).toEqual([
    "Test connection",
    "Inspect a Teams channel",
    "Post a Teams message",
  ]);
  await changeProvider(page, bench, "Outlook Calendar");
  expect(await availableActions(page, bench)).toEqual([
    "Test connection",
    "Read calendar events",
    "Create a calendar event",
  ]);
  await changeProvider(page, bench, "SharePoint");
  expect(await availableActions(page, bench)).toEqual([
    "Test connection",
    "Inspect selected documents",
    "Rename an authorized document",
  ]);
});

test("MapLibre and Google expose only their supported map actions", async ({
  page,
}) => {
  const bench = await openRecipe(page, "existing-maps");
  await connect(bench);
  const maps = bench.getByRole("region", {
    name: "Location workbench",
    exact: true,
  });
  await maps.getByLabel("Address or place", { exact: true }).fill("Bogotá");
  await expect(
    maps.getByRole("button", { name: "Resolve address", exact: true }),
  ).toBeDisabled();
  await expect(
    bench
      .getByRole("region", { name: "Route request", exact: true })
      .getByRole("button", { name: "Request route", exact: true }),
  ).toBeDisabled();
  expect(await availableActions(page, bench)).toEqual([
    "Test connection",
    "Inspect map layers",
  ]);
  await changeProvider(page, bench, "Google Maps");
  await maps.getByLabel("Address or place", { exact: true }).fill("Bogotá");
  await expect(
    maps.getByRole("button", { name: "Resolve address", exact: true }),
  ).toBeEnabled();
  expect(await availableActions(page, bench)).toEqual([
    "Test connection",
    "Inspect map layers",
    "Resolve an address",
    "Request route geometry",
  ]);
  await changeProvider(page, bench, "MapLibre");
  expect(await availableActions(page, bench)).toEqual([
    "Test connection",
    "Inspect map layers",
  ]);
  await expect(
    maps.getByRole("button", { name: "Resolve address", exact: true }),
  ).toBeDisabled();
});

test("LangSmith evaluations disappear when the grouped recipe uses Helicone", async ({
  page,
}) => {
  const bench = await openRecipe(page, "alternative-ai-observability");
  await connect(bench);
  expect(await availableActions(page, bench)).toEqual([
    "Test connection",
    "Inspect traces",
    "Inspect usage report",
    "Run a LangSmith evaluation",
  ]);
  await changeProvider(page, bench, "Helicone");
  expect(await availableActions(page, bench)).toEqual([
    "Test connection",
    "Inspect traces",
    "Inspect usage report",
  ]);
  await changeProvider(page, bench, "LangSmith");
  expect(await availableActions(page, bench)).toContain(
    "Run a LangSmith evaluation",
  );
});

test("Cancelling a pending connection keeps its draft and permits an explicit retry", async ({
  page,
}) => {
  const bench = await openRecipe(page, "slack");
  await connectionTab(bench);
  const reference = bench.getByLabel("Backend connection reference *", {
    exact: true,
  });
  await reference.fill("cancelled-preview-reference");
  const input = bench.getByLabel("Backend event subscription", { exact: true });
  await input.fill("retain-this-local-draft");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await bench
    .getByRole("button", { name: "Connect local demo", exact: true })
    .click();
  await bench.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.clock.runFor(500);
  await expect(
    bench.getByText("Request cancelled.", { exact: true }),
  ).toBeVisible();
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeDisabled();
  await expect(reference).toHaveValue("cancelled-preview-reference");
  await expect(input).toHaveValue("retain-this-local-draft");
  await page.clock.resume();
  await bench
    .getByRole("button", { name: "Connect local demo", exact: true })
    .click();
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeEnabled();
  await bench.getByRole("tab", { name: "Activity", exact: true }).click();
  await bench
    .getByRole("button", { name: "Refresh activity", exact: true })
    .click();
  await expect(
    bench.getByText(
      "Demo connection configured; no external account was accessed.",
      {
        exact: true,
      },
    ),
  ).toHaveCount(1);
});

test("Required configuration rejects whitespace, preserves a failed draft and supports reload then retry", async ({
  page,
}) => {
  const bench = await openRecipe(page, "slack");
  await connectionTab(bench);
  const reference = bench.getByLabel("Backend connection reference *", {
    exact: true,
  });
  const subscription = bench.getByLabel("Backend event subscription", {
    exact: true,
  });
  await reference.fill("   ");
  await subscription.fill("draft-after-validation-error");
  await bench
    .getByRole("button", { name: "Connect local demo", exact: true })
    .click();
  await expect(
    bench.getByText("The action could not finish", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeDisabled();
  await expect(reference).toHaveValue("   ");
  await expect(subscription).toHaveValue("draft-after-validation-error");
  await bench
    .getByRole("button", { name: "Reload connection", exact: true })
    .click();
  await expect(
    bench.getByRole("button", { name: "Connect local demo", exact: true }),
  ).toBeEnabled();
  await expect(reference).toHaveValue("   ");
  await expect(subscription).toHaveValue("draft-after-validation-error");
  await reference.fill("valid-preview-reference");
  await bench
    .getByRole("button", { name: "Connect local demo", exact: true })
    .click();
  await expect(
    bench.getByRole("button", { name: "Sync resources", exact: true }),
  ).toBeEnabled();
});

test("Email review, validation, cancellation and retry preserve the draft without external delivery", async ({
  page,
}) => {
  const bench = await openRecipe(page, "resend-react-email");
  await connect(bench);
  const compose = bench.getByRole("region", {
    name: "Compose an email",
    exact: true,
  });
  const queue = bench.getByRole("region", {
    name: "Delivery queue",
    exact: true,
  });
  const recipient = compose.getByLabel("Recipient email *", { exact: true });
  const subject = compose.getByLabel("Subject *", { exact: true });
  const body = compose.getByLabel("Content *", { exact: true });
  await recipient.fill("invalid-email");
  await subject.fill("Preserved local draft");
  await body.fill("This message stays in the local demo.");
  await compose
    .getByRole("button", { name: "Review email", exact: true })
    .click();
  await expect(
    compose.getByText("Enter a valid recipient email address.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await recipient.fill("preview@example.com");
  await compose
    .getByRole("button", { name: "Review email", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Review before running",
    exact: true,
  });
  await expect(
    review.getByText("Preserved local draft", { exact: true }),
  ).toBeVisible();
  await expect(
    review.getByRole("button", { name: "Confirm and run", exact: true }),
  ).toBeDisabled();
  await review
    .getByRole("button", { name: "Back to editing", exact: true })
    .click();
  await expect(subject).toHaveValue("Preserved local draft");
  await expect(body).toHaveValue("This message stays in the local demo.");
  await expect(
    queue.getByText("Preserved local draft", { exact: true }),
  ).toHaveCount(0);
  await compose
    .getByRole("button", { name: "Review email", exact: true })
    .click();
  await review
    .getByRole("checkbox", {
      name: "I reviewed the recipient, resource and content of this action.",
      exact: true,
    })
    .check();
  await expect(
    bench.getByRole("button", { name: "Cancel request", exact: true }),
  ).toHaveCount(0);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await review
    .getByRole("button", { name: "Confirm and run", exact: true })
    .click();
  await bench
    .getByRole("button", { name: "Cancel request", exact: true })
    .click();
  await page.clock.runFor(500);
  await expect(
    bench.getByText("The action was cancelled.", { exact: true }),
  ).toBeVisible();
  await expect(
    queue.getByText("Preserved local draft", { exact: true }),
  ).toHaveCount(0);
  await expect(recipient).toHaveValue("preview@example.com");
  await expect(subject).toHaveValue("Preserved local draft");
  await expect(body).toHaveValue("This message stays in the local demo.");
  await page.clock.resume();
  await compose
    .getByRole("button", { name: "Review email", exact: true })
    .click();
  await review
    .getByRole("checkbox", {
      name: "I reviewed the recipient, resource and content of this action.",
      exact: true,
    })
    .check();
  await review
    .getByRole("button", { name: "Confirm and run", exact: true })
    .click();
  await expect(
    queue.getByText("Preserved local draft", { exact: true }),
  ).toHaveCount(1);
  await expect(queue.getByText("Queued", { exact: true })).toBeVisible();
  await expect(queue.getByText("Delivered", { exact: true })).toHaveCount(0);
});

test("G3 consumes reported transition IDs and preserves issue fields and revision", async () => {
  const jiraAction = definitions
    .get("jira")!
    .actions.find((action) => action.kind === "transition-issue")!;
  expect(jiraAction).toBeTruthy();
  const issue: IntegrationRecord = {
    id: "QA-42",
    name: "Keep the existing summary",
    description: "Keep the existing issue description",
    type: "jira-issue",
    status: "In progress",
    updatedAt: "2026-10-20T10:00:00.000Z",
    fields: { allowedTransitionIds: [], priority: "high" },
  };
  const declared = {
    ...jiraAction,
    fields: jiraAction.fields.map((field) =>
      field.id === "transitionId"
        ? {
            ...field,
            options: [
              { value: "unreported", label: { en: "Done", es: "Hecho" } },
            ],
          }
        : field,
    ),
  };
  expect(connectorTransitionChoices(declared, issue)).toEqual([]);
  expect(
    connectorTransitionChoices(declared, {
      ...issue,
      fields: {
        allowedTransitionIds: ["31", "31", "41"],
        allowedTransitionLabels: ["Start review", "Start review", "Reopen"],
      },
    }).map((choice) => choice.value),
  ).toEqual(["31", "41"]);
  expect(
    connectorReportedTransitionChoices(
      {
        kind: "records",
        total: 3,
        records: [
          { ...issue, id: "unrelated", type: "record" },
          {
            ...issue,
            id: "31",
            name: "Start review",
            type: "jira-transition",
            fields: { recordId: issue.id },
          },
          {
            ...issue,
            id: "41",
            type: "jira-transition",
            fields: { recordId: "OTHER-3" },
          },
        ],
      },
      issue,
    ),
  ).toEqual([
    { value: "31", label: { en: "Start review", es: "Start review" } },
  ]);
  expect(
    connectorReportedTransitionChoices(
      { kind: "receipt", id: "read-accepted", message: "Query accepted" },
      issue,
    ),
  ).toEqual([]);
  const values = connectorDomainValues(
    jiraAction,
    {
      title: "",
      status: "Done",
      transitionId: "31",
      fields: '{"priority":"normal"}',
    },
    "approved-project",
    issue,
  );
  expect(values).toEqual({
    resourceId: "approved-project",
    recordId: "QA-42",
    transitionId: "31",
    expectedUpdatedAt: issue.updatedAt,
    fields: '{"priority":"normal"}',
  });
  expect(connectorTransitionFieldsProblem(values)).toBeNull();
  expect(
    connectorTransitionFieldsProblem({ fields: "not JSON" }),
  ).not.toBeNull();
  expect(
    connectorTransitionFieldsProblem({ fields: '{"__proto__":"invalid"}' }),
  ).not.toBeNull();
  const prAction = definitions
    .get("github-apps")!
    .actions.find((action) => action.kind === "create-pull-request")!;
  expect(prAction).toBeTruthy();
  expect(
    connectorPullRequestProblem(prAction, { base: "main", head: "main" }),
  ).not.toBeNull();
  expect(
    connectorPullRequestProblem(prAction, {
      base: "main",
      head: "main",
      headRepositoryRef: "authorized-fork",
    }),
  ).toBeNull();
});

test("G13 review snapshots isolate drafts and use reported revisions, while refresh rejects unrelated records", async () => {
  const hubspot = definitions
    .get("hubspot")!
    .actions.find((action) => action.kind === "update-record")!;
  const salesforce = definitions
    .get("salesforce")!
    .actions.find((action) => action.kind === "update-record")!;
  const before: IntegrationRecord = {
    id: "crm-record-42",
    name: "Authorized CRM record",
    type: "crm-object",
    description: "Original description",
    status: "active",
    updatedAt: "2026-10-20T09:00:00.000Z",
    fields: {
      resourceId: "selected-object",
      priority: "high",
      owner: "Original owner",
    },
  };
  const remote = structuredClone(before);
  remote.updatedAt = "2026-10-20T09:10:00.000Z";
  remote.fields!.priority = "remote-priority";
  remote.fields!.owner = "Remote owner";
  const draft = {
    propertyRef: "priority",
    value: "preserved-draft",
    expectedUpdatedAt: "client-generated-revision",
    resourceIds: ["selected-object"],
  };
  const snapshot = connectorReviewSnapshot(hubspot, draft, before);
  draft.value = "edited-after-review";
  draft.resourceIds.push("another-object");
  before.fields!.priority = "mutated-input";
  before.updatedAt = "2026-10-20T09:20:00.000Z";
  expect(snapshot.values.value).toBe("preserved-draft");
  expect(snapshot.values.resourceIds).toEqual(["selected-object"]);
  expect(snapshot.target?.fields?.priority).toBe("high");
  expect(snapshot.values.expectedUpdatedAt).toBe("2026-10-20T09:00:00.000Z");
  const values = connectorDomainValues(
    salesforce,
    {
      fieldRef: "priority",
      value: "preserved-draft",
      title: "",
      description: "",
    },
    "selected-object",
    remote,
  );
  expect(values).toEqual({
    fieldRef: "priority",
    value: "preserved-draft",
    resourceId: "selected-object",
    recordId: "crm-record-42",
    expectedUpdatedAt: remote.updatedAt,
  });
  const row = connectorComparisonRows(
    hubspot,
    snapshot.target!,
    remote,
    snapshot.values,
  ).find((item) => item.id === "value")!;
  expect({ before: row.before, remote: row.remote, draft: row.draft }).toEqual({
    before: "high",
    remote: "remote-priority",
    draft: "preserved-draft",
  });
  expect(
    connectorTargetRecord(
      { kind: "records", records: [{ ...remote, id: "neighbor" }], total: 1 },
      remote.id,
      "selected-object",
    ),
  ).toBeUndefined();
  expect(
    connectorTargetRecord(
      { kind: "record", record: remote },
      remote.id,
      "another-object",
    ),
  ).toBeUndefined();
  const refreshed = connectorTargetRecord(
    { kind: "record", record: remote },
    remote.id,
    "selected-object",
  )!;
  remote.fields!.priority = "mutated-after-read";
  expect(refreshed.fields?.priority).toBe("remote-priority");
});

for (const variant of [
  { locale: "en" as const, draft: true },
  { locale: "es" as const, draft: false },
]) {
  test(`G3 GitHub ${variant.locale} reviews repository, branches and ${variant.draft ? "draft" : "open"} PR, preserving edits`, async ({
    page,
  }) => {
    const es = variant.locale === "es";
    const bench = await openRecipe(page, "github-apps", variant.locale);
    await connect(bench, variant.locale);
    await choose(
      page,
      bench.getByLabel(es ? "Acción de destino" : "Destination action", {
        exact: true,
      }),
      es ? "Crear un pull request revisado" : "Create a reviewed pull request",
    );
    const form = bench.getByRole("region", {
      name: es ? "Crear un pull request" : "Create a pull request",
      exact: true,
    });
    const title = form.getByLabel(
      es ? "Título del pull request" : "Pull request title",
      { exact: true },
    );
    const description = form.getByLabel(
      es ? "Descripción del pull request" : "Pull request description",
      { exact: true },
    );
    const baseBranch = form.getByLabel(
      es ? "Rama destino permitida" : "Approved target branch",
      { exact: false },
    );
    const headBranch = form.getByLabel(
      es ? "Rama origen permitida" : "Approved source branch",
      { exact: false },
    );
    const draft = form.getByRole("checkbox", {
      name: es ? "Solicitar PR borrador" : "Request a draft PR",
      exact: true,
    });
    const reviewButton = form.getByRole("button", {
      name: es ? "Revisar pull request" : "Review pull request",
      exact: true,
    });
    const result = form.getByRole("region", {
      name: es
        ? "Resultado reportado del pull request"
        : "Reported pull request result",
      exact: true,
    });
    await title.fill("Local branch review");
    await description.fill("A reviewed preview with no GitHub API call.");
    await baseBranch.fill("main");
    await headBranch.fill("main");
    await expect(reviewButton).toBeDisabled();
    await expect(
      form.getByText(
        es
          ? "Elige ramas base y de origen diferentes."
          : "Choose different base and head branches.",
        { exact: true },
      ),
    ).toBeVisible();
    await headBranch.fill("feature/local-preview");
    if (variant.draft) await draft.check();
    else await draft.uncheck();
    await expect(reviewButton).toBeEnabled();
    await expect(result).toHaveCount(0);
    await reviewButton.click();
    const review = bench.getByRole("region", {
      name: es ? "Revisa esta acción" : "Review this action",
      exact: true,
    });
    await expect(review.getByText("main", { exact: true })).toBeVisible();
    await expect(
      review.getByText("feature/local-preview", { exact: true }),
    ).toBeVisible();
    await expect(
      review.getByText(es ? /^Repositorio:/ : /^Repository:/),
    ).toBeVisible();
    await expect(
      review.getByText(
        variant.draft
          ? "Create as a draft pull request"
          : "Crear como pull request abierto",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(result).toHaveCount(0);
    await review
      .getByRole("button", {
        name: es ? "Volver a editar" : "Back to editing",
        exact: true,
      })
      .click();
    await expect(title).toHaveValue("Local branch review");
    await expect(description).toHaveValue(
      "A reviewed preview with no GitHub API call.",
    );
    await expect(headBranch).toHaveValue("feature/local-preview");
    if (variant.draft) await expect(draft).toBeChecked();
    else await expect(draft).not.toBeChecked();
    await reviewButton.click();
    await review
      .getByRole("button", {
        name: es ? "Confirmar acción" : "Confirm action",
        exact: true,
      })
      .click();
    await expect(
      result.getByText("Local branch review", { exact: true }),
    ).toBeVisible();
    await expect(
      result.getByText(
        variant.draft ? "Reported state: Draft" : "Estado reportado: Abierto",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await expect(
      result.getByText(
        es
          ? "Estado informado por esta conexión. Un trabajo en cola o una confirmación de recepción no acredita que haya terminado."
          : "State reported by this connection. A queued job or acknowledgement does not confirm completion.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(title).toHaveValue("Local branch review");
    const source = bench.getByRole("region", {
      name: es ? "Vista previa de la fuente" : "Source preview",
      exact: true,
    });
    await choose(
      page,
      source.getByLabel(es ? "Operación de la fuente" : "Source operation", {
        exact: true,
      }),
      es
        ? "Leer pull requests del repositorio"
        : "Read repository pull requests",
    );
    await choose(
      page,
      source.getByLabel(es ? "Estado del pull request" : "Pull request state", {
        exact: true,
      }),
      es ? "Todos los estados" : "All states",
    );
    await expect(title).toHaveValue("Local branch review");
    await expect(description).toHaveValue(
      "A reviewed preview with no GitHub API call.",
    );
    await expect(baseBranch).toHaveValue("main");
    await expect(headBranch).toHaveValue("feature/local-preview");
    if (variant.draft) await expect(draft).toBeChecked();
    else await expect(draft).not.toBeChecked();
    await source
      .getByRole("button", {
        name: es ? "Cargar vista previa" : "Load source preview",
        exact: true,
      })
      .click();
    const createdPullRequest = source.getByRole("row").filter({
      hasText: "Local branch review",
      has: page.getByRole("button", {
        name: es ? "Usar registro" : "Use record",
        exact: true,
      }),
    });
    await expect(createdPullRequest).toHaveCount(1);
    await expect(
      createdPullRequest.getByText(variant.draft ? "draft" : "open", {
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("G3 Jira loads issue-specific transitions, reviews the reported choice and preserves issue content", async ({
  page,
}) => {
  const bench = await openRecipe(page, "jira");
  await connect(bench);
  await choose(
    page,
    bench.getByLabel("Destination action", { exact: true }),
    "Apply a reviewed Jira transition",
  );
  const form = bench.getByRole("region", {
    name: "Transition a Jira issue",
    exact: true,
  });
  const transition = form.getByLabel("Allowed issue transition", {
    exact: true,
  });
  const reviewButton = form.getByRole("button", {
    name: "Review issue transition",
    exact: true,
  });
  const discover = form.getByRole("button", {
    name: "Load allowed transitions",
    exact: true,
  });
  await expect(transition).toBeDisabled();
  await expect(transition).toContainText("Choose a reported transition");
  await expect(discover).toBeDisabled();
  await expect(reviewButton).toBeDisabled();
  await form
    .getByRole("button", { name: "Load Jira issues", exact: true })
    .click();
  const row = form.getByRole("listitem").first();
  await expect(
    row.getByRole("button", { name: "Open", exact: true }),
  ).toBeEnabled();
  const originalName = await row.locator("p").nth(0).innerText();
  const originalDescription = await row.locator("p").nth(1).innerText();
  const originalStatus = await row.locator(":scope > span").innerText();
  await row.getByRole("button", { name: "Open", exact: true }).click();
  await expect(
    form.getByText("Reported status", { exact: true }),
  ).toBeVisible();
  const selected = form.getByText(/^Selected issue:/);
  const issueId = (await selected.innerText()).replace(
    /^Selected issue:\s*/,
    "",
  );
  expect(issueId).not.toBe("—");
  await discover.click();
  await expect(
    transition,
    "The native Jira query must report real demo transition choices",
  ).toBeEnabled();
  await transition.click();
  const choices = page.getByRole("listbox").getByRole("option");
  await expect(choices.first()).toBeVisible();
  const selectedChoice = await choices.first().innerText();
  await choices.first().click();
  const fields = form.getByLabel("Transition-screen fields (JSON)", {
    exact: true,
  });
  await fields.fill("invalid JSON");
  await expect(reviewButton).toBeDisabled();
  await fields.fill('{"priority":"normal"}');
  await expect(reviewButton).toBeEnabled();
  await reviewButton.click();
  const review = bench.getByRole("region", {
    name: "Review this action",
    exact: true,
  });
  await expect(
    review.getByText("Jira issue transition review", { exact: true }),
  ).toBeVisible();
  await expect(review.getByText(/^Issue:/)).toContainText(issueId);
  await expect(review.getByText(/^Selected transition:/)).toContainText(
    selectedChoice,
  );
  await expect(review.getByText(/^Transition fields:/)).toContainText(
    '{"priority":"normal"}',
  );
  await review
    .getByRole("button", { name: "Back to editing", exact: true })
    .click();
  await expect(fields).toHaveValue('{"priority":"normal"}');
  await expect(transition).toContainText(selectedChoice);
  await reviewButton.click();
  await review
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  const result = form.getByRole("region", {
    name: "Reported issue transition result",
    exact: true,
  });
  await expect(result.getByText(originalName, { exact: true })).toBeVisible();
  await expect(
    result.getByText(originalDescription, { exact: true }),
  ).toBeVisible();
  await expect(result.getByText(issueId, { exact: false })).toBeVisible();
  const reportedStatus = await result.locator("li > span").innerText();
  expect(reportedStatus).not.toBe(originalStatus);
  await expect(review).toHaveCount(0);
  await expect(reviewButton).toBeDisabled();
  await expect(transition).toContainText("Choose a reported transition");
  await form
    .getByRole("button", { name: "Load Jira issues", exact: true })
    .click();
  const escapedId = issueId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const refreshed = form
    .locator("li")
    .filter({
      has: page.getByRole("button", { name: "Open", exact: true }),
    })
    .filter({ hasText: new RegExp(`\\b${escapedId}\\b`) });
  await expect(
    refreshed.getByText(originalName, { exact: true }),
  ).toBeVisible();
  await expect(
    refreshed.getByText(originalDescription, { exact: true }),
  ).toBeVisible();
  await expect(refreshed.locator(":scope > span")).toHaveText(reportedStatus);
});

for (const variant of [
  { id: "hubspot", locale: "en" as const },
  { id: "salesforce", locale: "es" as const },
]) {
  test(`G13 ${variant.id} keeps its draft through a real local conflict, compares remote values and requires a fresh review`, async ({
    page,
  }) => {
    const es = variant.locale === "es";
    const definition = definitions.get(variant.id)!;
    const update = definition.actions.find(
      (action) => action.kind === "update-record",
    )!;
    const reference = update.fields.find((field) =>
      ["propertyRef", "fieldRef"].includes(field.id),
    )!;
    const valueField = update.fields.find((field) => field.id === "value")!;
    const bench = await openRecipe(page, variant.id, variant.locale);
    await connect(bench, variant.locale);
    const form = bench.getByRole("region", {
      name: es ? "Actualizar un campo CRM" : "Update a CRM field",
      exact: true,
    });
    await form
      .getByRole("button", {
        name: es ? "Cargar registros destino" : "Load destination records",
        exact: true,
      })
      .click();
    const row = form.getByRole("listitem").last();
    await expect(
      row.getByRole("button", { name: es ? "Abrir" : "Open", exact: true }),
    ).toBeEnabled();
    const originalName = await row.locator("p").first().innerText();
    const originalDescription = await row.locator("p").nth(1).innerText();
    await row
      .getByRole("button", { name: es ? "Abrir" : "Open", exact: true })
      .click();
    const targetId = (
      await form.getByText(es ? /^ID de destino:/ : /^Target ID:/).innerText()
    ).replace(es ? /^ID de destino:\s*/ : /^Target ID:\s*/, "");
    const observed = form.getByText(
      es ? /^Revisión observada del registro:/ : /^Observed record revision:/,
    );
    const originalRevision = (await observed.innerText()).replace(
      es
        ? /^Revisión observada del registro:\s*/
        : /^Observed record revision:\s*/,
      "",
    );
    const property = form.getByRole("textbox", {
      name: reference.label[variant.locale],
      exact: true,
    });
    const value = form.getByRole("textbox", {
      name: valueField.label[variant.locale],
      exact: true,
    });
    // "value" is an explicitly local fixture field, not a vendor CRM property.
    await property.fill("value");
    await value.fill("preserved-local-draft");
    const reviewButton = form.getByRole("button", {
      name: es ? "Revisar cambio CRM" : "Review CRM update",
      exact: true,
    });
    await expect(reviewButton).toBeEnabled();
    await reviewButton.click();
    const review = bench.getByRole("region", {
      name: es ? "Revisa esta acción" : "Review this action",
      exact: true,
    });
    await expect(
      review.locator("[data-reviewed-target-revision]"),
    ).toHaveAttribute("data-reviewed-target-revision", originalRevision);
    await review
      .getByRole("button", {
        name: es ? "Volver a editar" : "Back to editing",
        exact: true,
      })
      .click();
    await updateThroughExplorer(
      page,
      bench,
      update,
      {
        recordId: targetId,
        [reference.id]: "value",
        value: "reported-remote-value",
      },
      variant.locale,
    );
    await expect(value).toHaveValue("preserved-local-draft");
    await reviewButton.click();
    await expect(
      review.locator("[data-reviewed-target-revision]"),
    ).toHaveAttribute("data-reviewed-target-revision", originalRevision);
    await review
      .getByRole("button", {
        name: es ? "Confirmar acción" : "Confirm action",
        exact: true,
      })
      .click();
    const comparison = form.getByRole("region", {
      name: es ? "Comparar cambios remotos" : "Compare remote changes",
      exact: true,
    });
    await expect(comparison).toBeVisible();
    await expect(review).toHaveCount(0);
    await expect(value).toHaveValue("preserved-local-draft");
    await expect(reviewButton).toBeDisabled();
    const rebase = comparison.getByRole("button", {
      name: es
        ? "Conservar mi borrador sobre la última revisión"
        : "Keep my draft on the latest revision",
      exact: true,
    });
    await expect(rebase).toBeDisabled();
    await form
      .getByRole("button", {
        name: es ? "Leer registro más reciente" : "Read latest record",
        exact: true,
      })
      .click();
    await expect(rebase).toBeEnabled();
    await expect(
      comparison.getByText("reported-remote-value", { exact: true }),
    ).toBeVisible();
    await expect(
      comparison.getByText("preserved-local-draft", { exact: true }),
    ).toBeVisible();
    await expect(value).toHaveValue("preserved-local-draft");
    await expect(observed).toContainText(originalRevision);
    await rebase.click();
    await expect(comparison).toHaveCount(0);
    await expect(value).toHaveValue("preserved-local-draft");
    const refreshedRevision = (await observed.innerText()).replace(
      es
        ? /^Revisión observada del registro:\s*/
        : /^Observed record revision:\s*/,
      "",
    );
    expect(refreshedRevision).not.toBe(originalRevision);
    await expect(review).toHaveCount(0);
    await reviewButton.click();
    await expect(
      review.locator("[data-reviewed-target-revision]"),
    ).toHaveAttribute("data-reviewed-target-revision", refreshedRevision);
    await expect(
      review.getByText("preserved-local-draft", { exact: true }),
    ).toBeVisible();
    await review
      .getByRole("button", {
        name: es ? "Confirmar acción" : "Confirm action",
        exact: true,
      })
      .click();
    const result = form.getByRole("region", {
      name: es ? "Resultado de acción de destino" : "Destination action result",
      exact: true,
    });
    await expect(result.getByText(originalName, { exact: true })).toBeVisible();
    await expect(
      result.getByText(originalDescription, { exact: true }),
    ).toBeVisible();
    await expect(value).toHaveValue("preserved-local-draft");
    await expect(property).toHaveValue("value");
    await expect(review).toHaveCount(0);
  });
}

test("G13 a newer target disables its immutable review until the preserved draft is reviewed again", async ({
  page,
}) => {
  const update = definitions
    .get("hubspot")!
    .actions.find((action) => action.kind === "update-record")!;
  const bench = await openRecipe(page, "hubspot");
  await connect(bench);
  const form = bench.getByRole("region", {
    name: "Update a CRM field",
    exact: true,
  });
  const load = form.getByRole("button", {
    name: "Load destination records",
    exact: true,
  });
  await load.click();
  const row = form.getByRole("listitem").first();
  await row.getByRole("button", { name: "Open", exact: true }).click();
  const targetId = (await form.getByText(/^Target ID:/).innerText()).replace(
    /^Target ID:\s*/,
    "",
  );
  const observed = form.getByText(/^Observed record revision:/);
  const before = (await observed.innerText()).replace(
    /^Observed record revision:\s*/,
    "",
  );
  const value = form.getByRole("textbox", {
    name: "Property value",
    exact: true,
  });
  await form
    .getByRole("textbox", { name: "Allowed property", exact: true })
    .fill("value");
  await value.fill("immutable-review-draft");
  const reviewButton = form.getByRole("button", {
    name: "Review CRM update",
    exact: true,
  });
  await reviewButton.click();
  const review = bench.getByRole("region", {
    name: "Review this action",
    exact: true,
  });
  await expect(
    review.locator("[data-reviewed-target-revision]"),
  ).toHaveAttribute("data-reviewed-target-revision", before);
  await updateThroughExplorer(page, bench, update, {
    recordId: targetId,
    propertyRef: "value",
    value: "new-remote-revision",
  });
  await load.click();
  await expect(observed).not.toContainText(before);
  await expect(
    review.locator("[data-reviewed-target-revision]"),
  ).toHaveAttribute("data-reviewed-target-revision", before);
  await expect(
    review.getByRole("button", { name: "Confirm action", exact: true }),
  ).toBeDisabled();
  await expect(
    review.getByText(
      "The target changed after this review. Read it again and review your preserved draft.",
      { exact: true },
    ),
  ).toBeVisible();
  await review
    .getByRole("button", { name: "Back to editing", exact: true })
    .click();
  await expect(value).toHaveValue("immutable-review-draft");
  await reviewButton.click();
  const after = (await observed.innerText()).replace(
    /^Observed record revision:\s*/,
    "",
  );
  await expect(
    review.locator("[data-reviewed-target-revision]"),
  ).toHaveAttribute("data-reviewed-target-revision", after);
  await expect(
    review.getByRole("button", { name: "Confirm action", exact: true }),
  ).toBeEnabled();
  await expect(
    review.getByText("immutable-review-draft", { exact: true }),
  ).toBeVisible();
});

for (const recipe of integrationRouteIndex) {
  test(`smoke: ${recipe.id} route opens its ${definitions.get(recipe.id)!.family} workbench`, async ({
    page,
  }) => {
    const definition = definitions.get(recipe.id)!;
    const bench = await openRecipe(page, recipe.id);
    await expect(
      page.getByRole("link", { name: "Open this recipe", exact: true }),
    ).toHaveAttribute("href", route(`integrations/${recipe.id}`));
    await bench.getByRole("tab", { name: "Setup guide", exact: true }).click();
    await expect(
      bench.getByRole("link", {
        name: "Integration documentation",
        exact: true,
      }),
    ).toHaveAttribute("href", route("docs/integrations"));
    await expect(
      bench.getByRole("link", { name: "Provider documentation", exact: true }),
    ).toHaveAttribute("href", definition.documentationUrl);
    await bench.getByRole("tab", { name: "Workflow", exact: true }).click();
    await connect(bench);
    await expectWorkbench(bench, definition);
    await expect(
      bench.getByText("The action could not finish", {
        exact: true,
      }),
    ).toHaveCount(0);
  });
}
