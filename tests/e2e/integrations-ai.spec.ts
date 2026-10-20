import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { SAAS_STORAGE_KEY } from "../../src/lib/saas";

const mount = process.env.AUREFORM_BASE_URL
  ? new URL(process.env.AUREFORM_BASE_URL).pathname.replace(/\/+$/, "")
  : "";
const runNode = promisify(execFile);
const observations = new WeakMap<
  Page,
  {
    externalRequests: string[];
    errors: string[];
  }
>();

test.beforeEach(async ({ page, baseURL }) => {
  const state = { externalRequests: [] as string[], errors: [] as string[] };
  observations.set(page, state);
  page.on("pageerror", (error) => state.errors.push(error.message));
  page.on("console", (message) => {
    // Browser HTTP diagnostics have no JS arguments. Runtime/hydration failures
    // are covered by pageerror, application console errors and the UI assertions.
    if (message.type() === "error" && message.args().length)
      state.errors.push(message.text());
  });
  const origin = new URL(baseURL ?? "http://127.0.0.1:3001").origin;
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) {
      // Block before forwarding: these tests never contact a native provider.
      state.externalRequests.push(`${url.origin}${url.pathname}`);
      await route.abort("blockedbyclient");
    } else {
      await route.continue();
    }
  });
});

test.afterEach(async ({ page }) => {
  const state = observations.get(page)!;
  expect
    .soft(
      state.externalRequests,
      "Only the supplied application origin was requested",
    )
    .toEqual([]);
  expect
    .soft(state.errors, "No browser runtime or hydration errors")
    .toEqual([]);
});

async function ready(page: Page) {
  // The SSR composer is visible before its input handler is hydrated.
  // Wait for the workspace provider's existing persistence effect, not a timer.
  await expect
    .poll(() =>
      page.evaluate(
        (key) => localStorage.getItem(key) !== null,
        SAAS_STORAGE_KEY,
      ),
    )
    .toBe(true);
}

async function openRecipe(page: Page, locale = "en") {
  const response = await page.goto(
    `${mount}/${locale}/integrations/openai-responses/`,
  );
  expect(response?.status()).toBe(200);
  await ready(page);
  await expect(
    page.locator('[data-integration-workbench="openai-responses"]'),
  ).toBeVisible();
}

async function startDemo(page: Page, locale = "en") {
  const start = page.getByRole("button", {
    name: locale === "es" ? "Iniciar demo local" : "Start local demo",
    exact: true,
  });
  await expect(start).toBeEnabled();
  await start.click();
  const workspace = page.locator("[data-ai-workspace]");
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-ai-connection", "demo");
  await expect(
    workspace.getByText(locale === "es" ? "Demostración" : "Demo", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(workspace).toContainText(
    locale === "es" ? "Respuestas simuladas" : "Simulated responses",
  );
  return workspace;
}

async function send(workspace: Locator, content: string, locale = "en") {
  const field = workspace.getByRole("textbox", {
    name: locale === "es" ? "Tu mensaje" : "Your message",
    exact: true,
  });
  await field.fill(content);
  await expect(field).toHaveValue(content);
  const submit = workspace.getByRole("button", {
    name: locale === "es" ? "Enviar mensaje" : "Send message",
    exact: true,
  });
  await expect(submit).toBeEnabled();
  await submit.click();
}

async function completeDemo(workspace: Locator, locale = "en") {
  await expect(workspace.locator("[data-ai-sources]").last()).toBeVisible();
  const usage = workspace.locator("[data-ai-usage]").last();
  await expect(usage).toContainText(
    locale === "es" ? "Tokens de ejemplo" : "Demo tokens",
  );
  await expect(usage).toContainText(
    locale === "es" ? "sin consumo facturable" : "no billable usage",
  );
  await expect(usage).toContainText(
    locale === "es" ? "Completada" : "Completed",
  );
  await expect(
    workspace.getByRole("button", {
      name: locale === "es" ? "Detener" : "Stop",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    workspace.locator("[data-ai-sources]").last().getByRole("link"),
  ).toHaveAttribute("href", new RegExp(`/${locale}/docs/installation/$`));
}

async function switchWorkspace(page: Page, from: string, to: string) {
  await page
    .locator('button[aria-haspopup="menu"]:visible')
    .filter({ hasText: from })
    .click();
  await page.getByRole("menuitem", { name: to, exact: true }).click();
}

test("the default Hub opens OpenAI's local workflow with honest sources and illustrative usage", async ({
  page,
}) => {
  const response = await page.goto(`${mount}/en/integrations/`);
  expect(response?.status()).toBe(200);
  await ready(page);
  const hub = page.locator("[data-integration-hub]");
  await expect(hub).toHaveAttribute("data-integration-mode", "demo");
  await hub
    .getByRole("textbox", { name: "Find an integration", exact: true })
    .fill("OpenAI Responses");
  await hub.locator('[data-integration-card="openai-responses"]').click();
  await expect(
    page.getByRole("heading", { name: "OpenAI Responses", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open this recipe", exact: true }),
  ).toHaveAttribute("href", /\/en\/integrations\/openai-responses\/$/);
  const workspace = await startDemo(page);
  await expect(workspace).toHaveAttribute("data-ai-workspace", "studio");
  await expect(
    page.locator('[data-integration-workbench="openai-responses"] details'),
  ).toHaveJSProperty("open", false);
  await send(workspace, "Explore a thoughtful customer workspace.");
  await completeDemo(workspace);
  await expect(workspace.locator("[data-ai-sources]").last()).toContainText(
    "Example reference",
  );
  await expect(workspace.locator("[data-ai-sources]").last()).toContainText(
    "not a web search result",
  );
  await expect(workspace).toContainText(
    "This response uses the local demonstration adapter.",
  );
});

for (const approved of [true, false]) {
  test(`a tool only ${approved ? "completes after approval" : "rejects after the explicit rejection"} in the local AI workflow`, async ({
    page,
  }) => {
    await openRecipe(page);
    const workspace = await startDemo(page);
    await send(workspace, "Use a tool to prepare a local draft.");
    const approval = workspace.locator("[data-ai-approval]");
    const tool = workspace.locator("[data-ai-tool]");
    await expect(approval).toHaveAttribute(
      "data-ai-approval-state",
      "requested",
    );
    await expect(tool).toHaveAttribute("data-ai-tool-state", "pending");
    await expect(tool).toContainText("Nothing will be sent or published");
    await expect(workspace.locator("[data-ai-usage]")).toContainText(
      "Usage unavailable",
    );
    await expect(workspace.locator("[data-ai-sources]")).toHaveCount(0);
    await approval
      .getByRole("button", {
        name: approved ? "Approve tool" : "Reject tool",
        exact: true,
      })
      .click();
    await expect(approval).toHaveAttribute(
      "data-ai-approval-state",
      approved ? "approved" : "rejected",
    );
    await expect(tool).toHaveAttribute(
      "data-ai-tool-state",
      approved ? "completed" : "rejected",
    );
    await expect(tool).toContainText(
      approved ? "No external action occurred" : "Continuing with text only",
    );
    await expect(approval.getByRole("button")).toHaveCount(0);
    await completeDemo(workspace);
  });
}

test("stop closes an unanswered tool approval and a simulated failure can retry to a complete response", async ({
  page,
}) => {
  await openRecipe(page);
  const workspace = await startDemo(page);
  await send(workspace, "Approve a tool for this cancellable draft.");
  const approval = workspace.locator("[data-ai-approval]").first();
  await expect(approval).toHaveAttribute("data-ai-approval-state", "requested");
  await workspace.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(workspace.getByText("Stopped", { exact: true })).toBeVisible();
  await expect(approval).toContainText("not active in this session");
  await expect(approval.getByRole("button")).toHaveCount(0);
  await expect(
    workspace.getByText("Waiting for approval", { exact: true }),
  ).toHaveCount(0);
  await expect(
    workspace.getByText("Generating response", { exact: true }),
  ).toHaveCount(0);
  await expect(
    workspace.locator('[data-ai-tool-state="completed"]'),
  ).toHaveCount(0);
  await expect(workspace.locator("[data-ai-sources]")).toHaveCount(0);
  await expect(workspace.locator("[data-ai-usage]")).toContainText(
    "Usage unavailable",
  );

  // Injected Hub demo adapters own their behavior; the default direct route
  // exposes the existing deterministic error switch and retry controls.
  const response = await page.goto(`${mount}/en/ai/`);
  expect(response?.status()).toBe(200);
  await ready(page);
  await expect(workspace).toHaveAttribute("data-ai-connection", "demo");
  await workspace
    .getByRole("button", { name: "Conversation actions", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Simulate next error", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("menuitem", { name: "Simulate next error", exact: true })
    .click();
  const retryPrompt = "A second considered local idea.";
  await send(workspace, retryPrompt);
  await expect(
    workspace.getByRole("alert").filter({ hasText: "simulated" }),
  ).toBeVisible();
  await expect(
    workspace.getByText("Generating response", { exact: true }),
  ).toHaveCount(0);
  await workspace
    .getByRole("button", { name: "Try again", exact: true })
    .click();
  await completeDemo(workspace);
  await expect(workspace.getByRole("alert")).toHaveCount(0);
  await expect(workspace.getByText(retryPrompt, { exact: true })).toHaveCount(
    1,
  );
  await expect(workspace.locator("[data-ai-sources]")).toHaveCount(1);
  await expect(workspace.locator("[data-ai-approval]")).toHaveCount(0);
});

test("switching Hub workspaces removes the previous pending approval and scopes the next conversation", async ({
  page,
}) => {
  await openRecipe(page);
  const studio = await startDemo(page);
  const studioPrompt = "Approve a tool for studio-only context.";
  await send(studio, studioPrompt);
  await expect(studio.locator("[data-ai-approval]")).toHaveAttribute(
    "data-ai-approval-state",
    "requested",
  );
  await switchWorkspace(page, "Aureform Studio", "Personal space");
  await expect(page.getByText(studioPrompt, { exact: true })).toHaveCount(0);
  const personal = await startDemo(page);
  await expect(personal).toHaveAttribute("data-ai-workspace", "personal");
  await expect(personal.locator("[data-ai-approval]")).toHaveCount(0);
  await expect(
    personal.getByRole("button", { name: "Stop", exact: true }),
  ).toHaveCount(0);
  const personalPrompt = "An original idea for the personal workspace.";
  await send(personal, personalPrompt);
  await completeDemo(personal);
  await expect(personal.getByText(studioPrompt, { exact: true })).toHaveCount(
    0,
  );
  await switchWorkspace(page, "Personal space", "Aureform Studio");
  await expect(page.locator("[data-ai-workspace]")).toHaveAttribute(
    "data-ai-workspace",
    "studio",
  );
  await expect(page.getByText(personalPrompt, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Approve tool", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Waiting for approval", { exact: true }),
  ).toHaveCount(0);
});

test("the direct AI route also clears active workspace output and cancels its pending decision", async ({
  page,
}) => {
  const response = await page.goto(`${mount}/en/ai/`);
  expect(response?.status()).toBe(200);
  await ready(page);
  const workspace = page.locator("[data-ai-workspace]");
  await expect(workspace).toHaveAttribute("data-ai-workspace", "studio");
  const prompt = "Approve a tool for direct-route studio context.";
  await send(workspace, prompt);
  await expect(workspace.locator("[data-ai-approval]")).toHaveAttribute(
    "data-ai-approval-state",
    "requested",
  );
  await switchWorkspace(page, "Aureform Studio", "Personal space");
  await expect(workspace).toHaveAttribute("data-ai-workspace", "personal");
  await expect(workspace.getByText(prompt, { exact: true })).toHaveCount(0);
  await expect(workspace.locator("[data-ai-approval]")).toHaveCount(0);
  await expect(
    workspace.getByRole("button", { name: "Stop", exact: true }),
  ).toHaveCount(0);
  await send(workspace, "A separate personal conversation.");
  await completeDemo(workspace);
  await expect(workspace.getByText(prompt, { exact: true })).toHaveCount(0);
  await switchWorkspace(page, "Personal space", "Aureform Studio");
  await expect(workspace).toHaveAttribute("data-ai-workspace", "studio");
  await expect(workspace.getByText(prompt, { exact: true })).toBeVisible();
  await expect(workspace.getByText("Stopped", { exact: true })).toBeVisible();
  await expect(
    workspace.getByText("Waiting for approval", { exact: true }),
  ).toHaveCount(0);
  await expect(
    workspace.getByRole("button", { name: "Approve tool", exact: true }),
  ).toHaveCount(0);
  await expect(workspace).not.toContainText(
    "A separate personal conversation.",
  );
});

test("Spanish mobile approval controls remain usable and label local usage honestly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await openRecipe(page, "es");
  const workspace = await startDemo(page, "es");
  await send(
    workspace,
    "Usa una herramienta para preparar un borrador local.",
    "es",
  );
  const approval = workspace.locator("[data-ai-approval]");
  await expect(approval).toHaveAttribute("data-ai-approval-state", "requested");
  await approval
    .getByRole("button", { name: "Rechazar herramienta", exact: true })
    .click();
  await expect(approval).toHaveAttribute("data-ai-approval-state", "rejected");
  await expect(workspace.locator("[data-ai-tool]")).toHaveAttribute(
    "data-ai-tool-state",
    "rejected",
  );
  await completeDemo(workspace, "es");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(
    overflow,
    "The mobile page must not require horizontal scrolling",
  ).toBeLessThanOrEqual(1);
});

/**
 * The public site always uses demo connections. Render the real consumer empty
 * branch server-side so this test doesn't add a route, bundle or runtime test hook.
 * The browser checks the resulting native disabled controls; this is not a live
 * provider/backend test or a claim that the fixture was hydrated.
 */
async function consumerWithoutAiMarkup() {
  const source = String.raw`
    import { existsSync, readFileSync, statSync } from "node:fs";
    import { registerHooks } from "node:module";
    import { resolve, sep } from "node:path";
    import { fileURLToPath, pathToFileURL } from "node:url";
    import { createElement } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import ts from "typescript";
    const root = pathToFileURL(resolve("src") + sep);
    const hooks = registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === "next/link" || specifier === "next/dynamic") return nextResolve(specifier + ".js", context);
        if (specifier.startsWith("@/") || (specifier.startsWith(".") && context.parentURL?.startsWith(root.href))) {
          const base = specifier.startsWith("@/") ? new URL(specifier.slice(2), root) : new URL(specifier, context.parentURL);
          if (existsSync(base) && statSync(base).isFile()) return nextResolve(base.href, context);
          for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
            if (existsSync(new URL(base.href + suffix))) return nextResolve(base.href + suffix, context);
          }
        }
        return nextResolve(specifier, context);
      },
      load(url, context, nextLoad) {
        if (!url.startsWith(root.href)) return nextLoad(url, context);
        if (url.endsWith(".css")) return { format: "module", source: "export default {};", shortCircuit: true };
        if (url.endsWith(".json")) return {
          format: "module", source: "export default " + readFileSync(fileURLToPath(url), "utf8") + ";", shortCircuit: true,
        };
        if (/\.tsx?$/.test(url)) return {
          format: "module", shortCircuit: true,
          source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
            compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
          }).outputText,
        };
        return nextLoad(url, context);
      },
    });
    try {
      globalThis.fetch = async () => { throw new Error("The server fixture cannot make network calls."); };
      const { NextIntlClientProvider } = await import("next-intl");
      const { messages } = await import("@/i18n/messages");
      const { getIntegrationDefinition } = await import("@/lib/integrations/definitions");
      const { SpecializedIntegrationWorkbench } = await import("@/components/integrations/specialized-workbench");
      const { AIWorkspace } = await import("@/components/templates/ai-workspace");
      const definition = getIntegrationDefinition("openai-responses");
      if (!definition) throw new Error("OpenAI's reviewed recipe must exist.");
      const unavailable = async () => { throw new Error("No consumer transport is installed in this fixture."); };
      const adapter = {
        mode: "consumer", list: unavailable, get: unavailable, connect: unavailable,
        configure: unavailable, disconnect: unavailable, resources: unavailable,
        sync: unavailable, events: unavailable, execute: unavailable, upload: unavailable,
      };
      const scope = { workspaceId: "consumer-workspace" };
      const connection = {
        id: "connection-fixture", integrationId: definition.id,
        providerOptionId: definition.options[0].id, workspaceId: scope.workspaceId,
        status: "connected", account: { name: "Configured connection reference" },
        configuration: {}, grantedPermissions: [], resourceIds: [], revision: 1,
      };
      const element = createElement(NextIntlClientProvider, { locale: "en", messages: messages.en, timeZone: "America/Bogota" },
        createElement("main", null,
          createElement("section", { "data-fixture": "connected-consumer-without-ai" },
            createElement(SpecializedIntegrationWorkbench, { definition, connection, adapter, scope })),
          createElement("section", { "data-fixture": "selected-provider-without-ai" },
            createElement(AIWorkspace, { providerOptionId: "openai-responses", workspaceId: scope.workspaceId }))));
      process.stdout.write(renderToStaticMarkup(element));
    } finally { hooks.deregister(); }
  `;
  const { stdout } = await runNode(
    process.execPath,
    ["--input-type=module", "--eval", source],
    {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    },
  );
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Consumer AI empty-state fixture</title></head><body>${stdout}</body></html>`;
}

test("consumer server-rendered states never substitute an AI demo for a connected reports adapter", async ({
  page,
}) => {
  const html = await consumerWithoutAiMarkup();
  await page.route("**/__ai-consumer-empty-state__/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: html,
    }),
  );
  await page.goto("/__ai-consumer-empty-state__/");
  const connected = page.locator(
    '[data-fixture="connected-consumer-without-ai"]',
  );
  await expect(
    connected.getByText("Provide this workflow's adapter", { exact: true }),
  ).toBeVisible();
  await expect(connected).toContainText("The connection is available");
  await expect(
    connected.getByRole("link", { name: "Connection examples", exact: true }),
  ).toBeVisible();
  await expect(connected.locator("[data-ai-workspace]")).toHaveCount(0);
  await expect(
    connected.getByRole("button", { name: "Start local demo", exact: true }),
  ).toHaveCount(0);
  const selected = page.locator(
    '[data-fixture="selected-provider-without-ai"] [data-ai-workspace]',
  );
  await expect(selected).toHaveAttribute(
    "data-ai-workspace",
    "consumer-workspace",
  );
  await expect(selected).toHaveAttribute(
    "data-ai-provider-option",
    "openai-responses",
  );
  await expect(selected).toHaveAttribute("data-ai-connection", "unconfigured");
  await expect(
    selected.getByText("Not configured", { exact: true }),
  ).toBeVisible();
  await expect(
    selected.getByRole("textbox", { name: "Your message", exact: true }),
  ).toBeDisabled();
  await expect(
    selected.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await expect(selected).toContainText(
    "connection for integration reports does not configure AI",
  );
  await expect(selected).not.toContainText("Simulated responses");
  await expect(selected.locator("[data-ai-message-parts]")).toHaveCount(0);
  await expect(selected.locator("[data-ai-usage]")).toHaveCount(0);
});
