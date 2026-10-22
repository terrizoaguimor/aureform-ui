import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { getCommunicationsBrand } from "../../src/lib/communications/brands";

type Locale = "en" | "es";
type Theme = "light" | "dark";
type SetupProbe = {
  microphoneRequests: number;
  storageWrites: Array<{ kind: "local" | "session"; key: string }>;
};
type ProbeWindow = typeof window & { __communicationsSetupProbe: SetupProbe };

// Root development and mounted static exports exercise the same route.
const mount = (
  (process.env.AUREFORM_BASE_URL
    ? new URL(process.env.AUREFORM_BASE_URL).pathname
    : "") ||
  process.env.NEXT_PUBLIC_BASE_PATH ||
  ""
).replace(/\/+$/, "");
const softphoneRoute = (locale: Locale) => `${mount}/${locale}/softphone/`;
const wizard = (page: Page) => page.getByTestId("communications-setup");
const control = (page: Page, name: string) => page.getByTestId(`setup-${name}`);
const connectionBadge = (page: Page) =>
  page.getByTestId("softphone-connection").locator('[data-slot="badge"]');
const copy = {
  en: {
    configure: "Configure provider",
    provider: "Voice provider",
    title: "Your provider credentials",
    authToken: "Auth token",
    apiKey: "API key",
    publicKey: "Public key",
    numbers: "Choose an existing number",
    review: "Review the setup plan",
    explore: "Explore demo setup",
    finished: "Demo setup complete",
    disconnected: "Disconnected",
    close: "Close setup",
    checks: "Setup checks",
  },
  es: {
    configure: "Configurar proveedor",
    provider: "Proveedor de voz",
    title: "Credenciales del proveedor",
    authToken: "Token de autenticación",
    apiKey: "Clave API",
    publicKey: "Clave pública",
    numbers: "Elige un número existente",
    review: "Revisa el plan de configuración",
    explore: "Explorar configuración demo",
    finished: "Configuración demo completada",
    disconnected: "Desconectada",
    close: "Cerrar configuración",
    checks: "Comprobaciones de configuración",
  },
} as const;
const browserErrors = new WeakMap<Page, string[]>();
const setupRequests = new WeakMap<
  Page,
  Array<{ method: string; path: string }>
>();
const failedResources = new WeakMap<
  Page,
  Array<{ origin: string; path: string; status: number }>
>();

test.beforeEach(async ({ page, context, baseURL }) => {
  const allowedOrigin = new URL(
    baseURL || process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3001",
  ).origin;
  const errors: string[] = [];
  const requests: Array<{ method: string; path: string }> = [];
  const failures: Array<{ origin: string; path: string; status: number }> = [];
  browserErrors.set(page, errors);
  setupRequests.set(page, requests);
  failedResources.set(page, failures);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = new URL(response.url());
    failures.push({
      origin: url.origin,
      path: url.pathname,
      status: response.status(),
    });
  });
  await context.routeWebSocket(
    (url) => url.origin !== allowedOrigin.replace(/^http/, "ws"),
    (socket) =>
      socket.close({ code: 1000, reason: "Fixture-only setup tests" }),
  );
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (/\/v1\/communications(?:\/|$)/.test(url.pathname)) {
      // Record only non-secret path/method, never bodies, query values or auth.
      requests.push({ method: request.method(), path: url.pathname });
      await route.abort("blockedbyclient");
    } else if (
      ["http:", "https:"].includes(url.protocol) &&
      url.origin !== allowedOrigin
    ) {
      await route.abort("blockedbyclient");
    } else {
      await route.continue();
    }
  });
  await page.addInitScript(() => {
    const probe: SetupProbe = { microphoneRequests: 0, storageWrites: [] };
    (window as ProbeWindow).__communicationsSetupProbe = probe;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      probe.storageWrites.push({
        kind: this === window.localStorage ? "local" : "session",
        key,
      });
      return originalSetItem.call(this, key, value);
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: async () => [],
        getUserMedia: async () => {
          probe.microphoneRequests++;
          throw new DOMException(
            "Fixture tests do not access devices.",
            "NotAllowedError",
          );
        },
      },
    });
  });
});

test.afterEach(async ({ page }, info) => {
  const errors = browserErrors.get(page) ?? [];
  const requests = setupRequests.get(page) ?? [];
  const failures = failedResources.get(page) ?? [];
  const probe =
    !page.isClosed() && page.url().startsWith("http")
      ? await page
          .evaluate(() => {
            const value = (window as ProbeWindow).__communicationsSetupProbe;
            return value
              ? {
                  microphoneRequests: value.microphoneRequests,
                  storageWriteKeys: value.storageWrites.map(
                    (write) => write.key,
                  ),
                }
              : null;
          })
          .catch(() => null)
      : null;
  await info.attach("fixture-setup-boundary", {
    body: JSON.stringify(
      { errors, failedResources: failures, requests, probe },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect
    .soft(errors, "The real local UI has no browser or hydration errors")
    .toEqual([]);
  expect
    .soft(
      requests,
      "The default public setup never reaches a communications API",
    )
    .toEqual([]);
  if (probe) {
    expect
      .soft(
        probe.microphoneRequests,
        "Opening and completing setup never requests a microphone",
      )
      .toBe(0);
  }
});

async function openSetup(page: Page, locale: Locale, theme: Theme = "light") {
  await page.addInitScript((mode) => {
    // Appearance fixtures are independent of onboarding's no-secret storage.
    localStorage.removeItem("aureform:appearance:v1");
    localStorage.removeItem("aureform:appearance-paint:v1");
    localStorage.setItem("aureform:theme", mode);
  }, theme);
  const response = await page.goto(softphoneRoute(locale));
  expect(response?.status(), "The integrated source route is available").toBe(
    200,
  );
  await expect(
    page.getByTestId("communications-configure-provider"),
  ).toHaveAccessibleName(copy[locale].configure);
  await page
    .getByRole("button", { name: copy[locale].configure, exact: true })
    .click();
  await expect(wizard(page)).toBeVisible();
  await expect(wizard(page)).toHaveAttribute("data-mode", "demo");
  await expect(wizard(page)).toHaveAttribute("data-phase", "credentials");
  await expect(page.locator("html")).toHaveClass(
    theme === "dark"
      ? /(?:^|\s)dark(?:\s|$)/
      : /^(?!.*(?:^|\s)dark(?:\s|$)).*$/,
  );
  return wizard(page);
}

async function chooseProvider(
  page: Page,
  provider: "Twilio" | "Telnyx",
  locale: Locale,
) {
  const selector = wizard(page).getByRole("combobox", {
    name: copy[locale].provider,
    exact: true,
  });
  await selector.click();
  await page.getByRole("option", { name: provider, exact: true }).click();
  await expect(selector).toContainText(provider);
}

async function reviewNumber(
  page: Page,
  locale: Locale,
  existingRouting = false,
) {
  await control(page, "inspect").click();
  await expect(
    wizard(page).getByRole("heading", {
      name: copy[locale].numbers,
      exact: true,
    }),
  ).toBeVisible();
  await expect(control(page, "plan")).toBeDisabled();
  const radios = wizard(page).getByRole("radio");
  await expect(radios).toHaveCount(3);
  await expect(radios.nth(2)).toBeDisabled();
  await radios.nth(existingRouting ? 1 : 0).check();
  await expect(control(page, "plan")).toBeEnabled();
  await control(page, "plan").click();
  await expect(
    wizard(page).getByRole("heading", {
      name: copy[locale].review,
      exact: true,
    }),
  ).toBeVisible();
  await expect(wizard(page)).toHaveAttribute("data-phase", "review");
  await expect(control(page, "plan-steps").locator("li")).toHaveCount(3);
  await expect(control(page, "checks")).toHaveCount(0);
}

async function expectConfigured(page: Page, locale: Locale) {
  await expect(
    wizard(page).getByRole("heading", {
      name: copy[locale].finished,
      exact: true,
    }),
  ).toBeVisible();
  await expect(wizard(page)).toHaveAttribute("data-phase", "configured");
  // Assert the source's individual check states rather than a generic badge.
  await expect(
    control(page, "checks").locator('[data-check="credentials"]'),
  ).toHaveAttribute("data-check-state", "passed");
  await expect(
    control(page, "checks").locator('[data-check="webhooks"]'),
  ).toHaveAttribute("data-check-state", "passed");
  await expect(
    control(page, "checks").locator('[data-check="webhooks"] dt'),
  ).toHaveText(
    locale === "en" ? "Webhook configuration" : "Configuración de webhooks",
  );
  await expect(
    control(page, "checks").locator('[data-check="browser"]'),
  ).toHaveAttribute("data-check-state", "pending");
  await expect(
    control(page, "checks").locator('[data-check="testCall"]'),
  ).toHaveAttribute("data-check-state", "pending");
  await expect(control(page, "checks")).toHaveAccessibleName(
    copy[locale].checks,
  );
  await expect(connectionBadge(page)).toHaveText(copy[locale].disconnected);
}

async function storageCount(page: Page) {
  return page.evaluate(
    () =>
      (window as ProbeWindow).__communicationsSetupProbe.storageWrites.length,
  );
}

async function assertBrand(page: Page, provider: "twilio" | "telnyx") {
  const marks = wizard(page).locator(
    `[data-communications-brand="${provider}"]`,
  );
  await expect(marks).toHaveCount(3); // Hero, selected provider and summary.
  for (const image of await marks.locator("img").all()) {
    await expect(image).toHaveAttribute(
      "src",
      `${mount}${getCommunicationsBrand(provider).src}`,
    );
    await expect
      .poll(() =>
        image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    const box = await image.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  }
}

for (const locale of ["en", "es"] as const) {
  test(`${locale}: public entry uses exactly two read-only Twilio fixture fields and original marks`, async ({
    page,
  }) => {
    const setup = await openSetup(page, locale);
    await expect(
      setup.getByRole("heading", { name: copy[locale].title, exact: true }),
    ).toBeVisible();
    await expect(
      setup.locator('[data-testid^="setup-credential-"]'),
    ).toHaveCount(2);
    await expect(control(page, "credential-first")).toHaveAccessibleName(
      "Account SID",
    );
    await expect(control(page, "credential-first")).toHaveValue(
      "AC00000000000000000000000000000000",
    );
    await expect(control(page, "credential-second")).toHaveAccessibleName(
      copy[locale].authToken,
    );
    await expect(control(page, "credential-second")).toHaveAttribute(
      "type",
      "password",
    );
    for (const input of await setup
      .locator('[data-testid^="setup-credential-"]')
      .all()) {
      await expect(input).toHaveJSProperty("readOnly", true);
      await expect(input).not.toHaveAttribute("name");
    }
    await expect(control(page, "inspect")).toHaveText(copy[locale].explore);
    await expect(control(page, "credentials-note")).toContainText(
      locale === "en"
        ? "read-only fixture credentials"
        : "credenciales ficticias de sólo lectura",
    );
    await assertBrand(page, "twilio");
    expect(new URL(page.url()).search).toBe("");
  });

  test(`${locale}: reviewed Twilio setup configures fixtures only and opens an unconnected softphone`, async ({
    page,
  }) => {
    await openSetup(page, locale);
    const writes = await storageCount(page);
    await reviewNumber(page, locale);
    await expect(control(page, "replace-routing")).toHaveCount(0);
    await expect(control(page, "apply")).toBeEnabled();
    await control(page, "apply").click();
    await expect(control(page, "progress")).toBeVisible();
    await expectConfigured(page, locale);
    expect(await storageCount(page)).toBe(writes);
    await control(page, "open-softphone").click();
    await expect(wizard(page)).toHaveCount(0);
    await expect(connectionBadge(page)).toHaveText(copy[locale].disconnected);
  });

  test(`${locale}: Telnyx switches both fixture labels and masked inputs before review`, async ({
    page,
  }) => {
    await openSetup(page, locale);
    await chooseProvider(page, "Telnyx", locale);
    await expect(control(page, "credential-first")).toHaveAccessibleName(
      copy[locale].apiKey,
    );
    await expect(control(page, "credential-second")).toHaveAccessibleName(
      copy[locale].publicKey,
    );
    await expect(control(page, "credential-first")).toHaveAttribute(
      "type",
      "password",
    );
    await expect(control(page, "credential-second")).toHaveAttribute(
      "type",
      "password",
    );
    await expect(control(page, "credential-first")).toHaveJSProperty(
      "readOnly",
      true,
    );
    await expect(control(page, "credential-second")).toHaveJSProperty(
      "readOnly",
      true,
    );
    await assertBrand(page, "telnyx");
    await reviewNumber(page, locale);
    await expect(control(page, "summary")).toContainText("Telnyx demo account");
    await control(page, "apply").click();
    await expectConfigured(page, locale);
  });

  test(`${locale}: existing routing requires the explicit reviewed replacement checkbox`, async ({
    page,
  }) => {
    await openSetup(page, locale);
    await reviewNumber(page, locale, true);
    const replacement = control(page, "replace-routing");
    await expect(replacement).not.toBeChecked();
    await expect(control(page, "apply")).toBeDisabled();
    await replacement.click();
    await expect(replacement).toBeChecked();
    await expect(control(page, "apply")).toBeEnabled();
    await control(page, "back").click();
    await expect(wizard(page)).toHaveAttribute("data-phase", "select-number");
    await control(page, "plan").click();
    await expect(replacement).not.toBeChecked();
    await expect(control(page, "apply")).toBeDisabled();
    await replacement.click();
    await control(page, "apply").click();
    await expectConfigured(page, locale);
  });

  test(`${locale}: 390px wizard remains contained through provider selection, review and checks`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSetup(page, locale);
    await chooseProvider(page, "Telnyx", locale);
    const credentialInputs = wizard(page).locator(
      '[data-testid^="setup-credential-"]',
    );
    await expect(credentialInputs).toHaveCount(2);
    for (const input of await credentialInputs.all()) {
      const box = await input.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    const contained = async () => {
      const bounds = await wizard(page).evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          viewport: innerWidth,
          scroll: document.documentElement.scrollWidth,
          width: document.documentElement.clientWidth,
          ownScroll: element.scrollWidth,
          ownWidth: element.clientWidth,
        };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
      expect(bounds.ownScroll).toBeLessThanOrEqual(bounds.ownWidth + 1);
    };
    await contained();
    await reviewNumber(page, locale);
    await contained();
    await control(page, "apply").click();
    await expectConfigured(page, locale);
    await contained();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`${locale}/${theme}: scoped accessibility passes credentials, review and configured checks`, async ({
      page,
    }, info) => {
      await openSetup(page, locale, theme);
      const check = async (stage: string) => {
        const result = await new AxeBuilder({ page })
          .include('[data-testid="communications-setup"]')
          .analyze();
        await info.attach(`setup-axe-${stage}`, {
          body: JSON.stringify(
            result.violations.map((item) => ({
              id: item.id,
              impact: item.impact,
              nodes: item.nodes.map((node) => node.target),
            })),
          ),
          contentType: "application/json",
        });
        expect(
          result.violations.filter(
            (item) => item.impact === "critical" || item.impact === "serious",
          ),
        ).toEqual([]);
      };
      await check("credentials");
      await reviewNumber(page, locale, true);
      await check("review");
      await control(page, "replace-routing").click();
      await control(page, "apply").click();
      await expectConfigured(page, locale);
      await check("configured");
    });
  }
}

test("keyboard-only fixture flow focuses the next stage and preserves native number selection", async ({
  page,
}) => {
  await openSetup(page, "en");
  await control(page, "inspect").focus();
  await page.keyboard.press("Enter");
  const heading = wizard(page).getByRole("heading", {
    name: copy.en.numbers,
    exact: true,
  });
  await expect(heading).toBeFocused();
  const radios = wizard(page).getByRole("radio");
  await radios.nth(0).focus();
  await page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toBeChecked();
  await control(page, "plan").focus();
  await page.keyboard.press("Enter");
  await expect(
    wizard(page).getByRole("heading", { name: copy.en.review, exact: true }),
  ).toBeFocused();
  await control(page, "replace-routing").focus();
  await page.keyboard.press("Space");
  await expect(control(page, "replace-routing")).toBeChecked();
  await control(page, "apply").focus();
  await page.keyboard.press("Enter");
  await expectConfigured(page, "en");
});

test("closing a pending fixture inspection retires that wizard; reopening starts cleanly", async ({
  page,
}) => {
  await openSetup(page, "en");
  await control(page, "inspect").click();
  await page.keyboard.press("Escape");
  await expect(wizard(page)).toHaveCount(0);
  await page.getByTestId("communications-configure-provider").click();
  await expect(wizard(page)).toHaveAttribute("data-phase", "credentials");
  await expect(control(page, "credential-first")).toHaveValue(
    "AC00000000000000000000000000000000",
  );
  await expect(control(page, "credential-first")).toHaveJSProperty(
    "readOnly",
    true,
  );
  await expect(connectionBadge(page)).toHaveText(copy.en.disconnected);
});
