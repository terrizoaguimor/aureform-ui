import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

type WebsiteLocale = "en" | "es";
const locales = ["en", "es"] as const;
const defaultBaseURL = "http://127.0.0.1:3001";
// This is a public identity assertion, never a URL these tests visit.
const expectedSiteOrigin = new URL(
  process.env.AUREFORM_EXPECTED_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://aureformui.com",
).origin;

const copy = {
  en: {
    docs: "Documentation",
    introduction: "Introduction",
    installation: "Installation",
    firstSection: "Run the complete suite",
    lastSection: "Prepare your own deployment",
    productNavigation: "Product navigation",
    mainNavigation: "Main navigation",
    sections: "Documentation sections",
    contents: "On this page",
    skip: "Skip to documentation",
    search: "Search documentation",
    landingTitle:
      "Aureform UI — Open-source Next.js UI kit & dashboard templates",
    sourceLink: "View this page on GitHub",
  },
  es: {
    docs: "Documentación",
    introduction: "Introducción",
    installation: "Instalación",
    firstSection: "Ejecuta la suite completa",
    lastSection: "Prepara tu despliegue",
    productNavigation: "Navegación del producto",
    mainNavigation: "Navegación principal",
    sections: "Secciones de documentación",
    contents: "En esta página",
    skip: "Saltar a la documentación",
    search: "Buscar documentación",
    landingTitle:
      "Aureform UI — UI kit y plantillas de Next.js de código abierto",
    sourceLink: "Ver esta página en GitHub",
  },
} as const;

// Independent publication expectations: 23 bilingual chapters plus 2 fallbacks.
const bilingualChapters = [
  "",
  "installation",
  "components",
  "cli",
  "tokens",
  "effects",
  "motion",
  "charts",
  "data-table",
  "saas",
  "commerce",
  "authentication",
  "maps",
  "adapters",
  "integration-research",
  "integrations",
  "communications",
  "figma",
  "accessibility",
  "deployment",
  "license",
  "roadmap",
  "research",
] as const;

function targetURL(baseURL?: string) {
  return new URL(baseURL || defaultBaseURL);
}

for (const locale of locales) {
  test(`${locale}: public quality evidence has localized metadata, six real route/profile rows and a maintainer sponsorship link`, async ({
    page,
    request,
    baseURL,
  }) => {
    const url = localPage(baseURL, locale, "quality");
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    const source = await response.text();
    const metadata = await readHTML(page, source);
    expectPublishedAlternates(metadata, locale, "quality");
    expect(metadata.documentLanguage).toBe(locale);
    expect(metadata.robots).not.toMatch(/\bnoindex\b/);
    const rendered = await page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return {
        rows: Array.from(
          doc.querySelectorAll(
            "#quality-measurements tbody tr[data-quality-route]",
          ),
          (row) => ({
            route: row.getAttribute("data-quality-route"),
            profile: row.getAttribute("data-quality-profile"),
            status: row.getAttribute("data-quality-status"),
          }),
        ),
        reportLinks: Array.from(
          doc.querySelectorAll<HTMLAnchorElement>(
            '#quality-measurements a[href*="/quality-reports/"]',
          ),
          (link) => link.getAttribute("href"),
        ),
      };
    }, source);
    expect(rendered.rows).toHaveLength(6);
    expect(
      rendered.rows.map((row) => `${row.route}:${row.profile}`).sort(),
    ).toEqual([
      "dashboard:desktop",
      "dashboard:mobile",
      "documentation:desktop",
      "documentation:mobile",
      "landing:desktop",
      "landing:mobile",
    ]);

    const history = JSON.parse(
      await readFile("docs/quality/lighthouse/index.json", "utf8"),
    ) as Array<{
      id: string;
      createdAt: string;
      sourceCommit: string;
      targetOrigin: string;
      environment: { lighthouse: string };
      results: Array<{
        pathname: string;
        runs: Array<{
          json: string;
          html: string;
          sha256: { json: string; html: string };
        }>;
      }>;
    }>;
    const snapshot = history.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    )[0];
    if (snapshot) {
      expect(rendered.rows.every((row) => row.status === "recorded")).toBe(
        true,
      );
      expect(rendered.reportLinks).toHaveLength(36);
      if (locale === "en") {
        // Fetch the actual published bytes, not only rendered summary values.
        for (const result of snapshot.results) {
          for (const run of result.runs) {
            for (const format of ["json", "html"] as const) {
              const report = await request.get(
                localResource(
                  baseURL,
                  `quality-reports/${snapshot.id}/${run[format]}`,
                ),
              );
              expect(report.status()).toBe(200);
              const bytes = await report.body();
              expect(createHash("sha256").update(bytes).digest("hex")).toBe(
                run.sha256[format],
              );
              if (format === "json") {
                const raw = JSON.parse(bytes.toString("utf8"));
                expect(raw.lighthouseVersion).toBe(
                  snapshot.environment.lighthouse,
                );
                expect(raw.runtimeError).toBeUndefined();
                expect(raw.finalDisplayedUrl ?? raw.finalUrl).toBe(
                  `${snapshot.targetOrigin}${result.pathname}`,
                );
              }
            }
          }
        }
      }
    } else {
      expect(rendered.rows.every((row) => row.status === "unmeasured")).toBe(
        true,
      );
      expect(rendered.reportLinks).toEqual([]);
    }

    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page
        .locator('a[href="https://github.com/sponsors/terrizoaguimor"]')
        .first(),
    ).toBeVisible();
    if (snapshot) {
      await expect(
        page
          .locator(
            `a[href="https://github.com/terrizoaguimor/aureform-ui/commit/${snapshot.sourceCommit}"]`,
          )
          .first(),
      ).toBeVisible();
    }
  });
}

test("Spanish quality remains readable on touch in both themes and keyboard navigation reaches its evidence", async ({
  browser,
  baseURL,
}, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 900 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    localStorage.setItem("aureform:theme", "light");
  });
  const page = await context.newPage();
  try {
    await page.goto(localPage(baseURL, "es", "quality"));
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Saltar a los informes de calidad" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    for (const appearance of ["light", "dark"]) {
      const bounds = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        rows: document.querySelectorAll("[data-quality-route]").length,
      }));
      expect(bounds.document).toBeLessThanOrEqual(bounds.viewport + 1);
      expect(bounds.rows).toBeGreaterThanOrEqual(6);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await testInfo.attach(`quality-${appearance}-axe.json`, {
        body: Buffer.from(JSON.stringify(result)),
        contentType: "application/json",
      });
      expect(
        result.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
        ),
      ).toEqual([]);
      if (appearance === "light") {
        await page.getByRole("button", { name: /theme|tema/i }).click();
        await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      }
    }
  } finally {
    await context.close();
  }
});

function localResource(baseURL: string | undefined, resource: string) {
  const target = targetURL(baseURL);
  const mount = target.pathname.replace(/\/+$/, "");
  return new URL(`${mount}/${resource.replace(/^\/+/, "")}`, target.origin)
    .href;
}

function localPage(
  baseURL: string | undefined,
  locale: WebsiteLocale,
  path = "",
) {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return localResource(
    baseURL,
    `${locale}/${normalized ? `${normalized}/` : ""}`,
  );
}

function publishedPage(locale: WebsiteLocale, path = "") {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return `${expectedSiteOrigin}/${locale}/${normalized ? `${normalized}/` : ""}`;
}

async function restrictRequestsToWebsite(
  context: BrowserContext,
  baseURL: string | undefined,
) {
  const allowedOrigin = targetURL(baseURL).origin;
  await context.route(/^https?:\/\//, async (route) => {
    const requested = new URL(route.request().url());
    // Reading the website never opts into Google, Stripe, OAuth or CF APIs.
    // Do not log URLs or query strings from blocked requests.
    if (
      requested.origin !== allowedOrigin ||
      /\/api(?:\/|$)/.test(requested.pathname)
    ) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
}

async function readHTML(page: Page, source: string) {
  // Parse the actual response DOM. Text inside RSC/bootstrap scripts cannot
  // satisfy article assertions, and application scripts never run here.
  return page.evaluate((html) => {
    const document = new DOMParser().parseFromString(html, "text/html");
    const article = document.querySelector("main article");
    return {
      title: document.querySelector("head > title")?.textContent ?? "",
      description:
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") ?? "",
      canonicals: Array.from(
        document.querySelectorAll('link[rel="canonical"]'),
        (link) => link.getAttribute("href"),
      ),
      alternates: Object.fromEntries(
        Array.from(
          document.querySelectorAll('link[rel="alternate"][hreflang]'),
          (link) => [link.getAttribute("hreflang"), link.getAttribute("href")],
        ),
      ),
      openGraphURL:
        document
          .querySelector('meta[property="og:url"]')
          ?.getAttribute("content") ?? "",
      robots:
        document
          .querySelector('meta[name="robots"]')
          ?.getAttribute("content") ?? "",
      documentLanguage: document.documentElement.lang,
      articleLanguage: article?.getAttribute("lang") ?? "",
      articleHeading: article?.querySelector("h1")?.textContent ?? "",
      articleText: article?.textContent ?? "",
      sectionHeadings: Array.from(
        article?.querySelectorAll("h2, h3") ?? [],
        (heading) => heading.textContent ?? "",
      ),
      code: Array.from(
        article?.querySelectorAll("pre code") ?? [],
        (block) => block.textContent ?? "",
      ),
    };
  }, source);
}

function expectPublishedAlternates(
  metadata: Awaited<ReturnType<typeof readHTML>>,
  locale: WebsiteLocale,
  path: string,
) {
  const canonical = publishedPage(locale, path);
  expect(metadata.canonicals).toEqual([canonical]);
  expect(metadata.openGraphURL).toBe(canonical);
  expect(metadata.alternates).toEqual({
    en: publishedPage("en", path),
    es: publishedPage("es", path),
    "x-default": path ? publishedPage("en", path) : `${expectedSiteOrigin}/`,
  });
  expect(metadata.robots).not.toMatch(/\bnoindex\b/);
}

test.beforeEach(async ({ context, baseURL }) => {
  await restrictRequestsToWebsite(context, baseURL);
});

for (const locale of locales) {
  const text = copy[locale];

  test(`${locale}: a visitor opens complete documentation from the landing navigation`, async ({
    page,
    baseURL,
  }) => {
    await page.goto(localPage(baseURL, locale));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const docsLink = page
      .getByRole("banner")
      .getByRole("link", { name: text.docs, exact: true });
    await expect(docsLink).toHaveAttribute(
      "href",
      new URL(localPage(baseURL, locale, "docs")).pathname,
    );
    await docsLink.click();

    await expect(page).toHaveURL(localPage(baseURL, locale, "docs"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      text.introduction,
    );
    await expect(
      page
        .getByRole("navigation", { name: text.mainNavigation, exact: true })
        .getByRole("link", { name: text.docs, exact: true }),
    ).toHaveAttribute("aria-current", "true");

    const guides = page.getByRole("navigation", {
      name: text.sections,
      exact: true,
    });
    await expect(guides.getByRole("link")).toHaveCount(25);
    await guides
      .getByRole("link", { name: text.installation, exact: true })
      .click();
    await expect(page).toHaveURL(
      localPage(baseURL, locale, "docs/installation"),
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      text.installation,
    );
    await expect(
      page.getByRole("main").getByRole("heading", {
        name: text.lastSection,
        exact: true,
      }),
    ).toBeVisible();
  });

  test(`${locale}: direct installation contains the full article in HTTP HTML and works without application JavaScript`, async ({
    browser,
    page,
    request,
    baseURL,
  }) => {
    const url = localPage(baseURL, locale, "docs/installation");
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
    const html = await readHTML(page, await response.text());
    expect(html.articleHeading).toBe(text.installation);
    expect(html.articleLanguage).toBe(locale);
    expect(html.sectionHeadings).toContain(text.firstSection);
    expect(html.sectionHeadings).toContain(text.lastSection);
    expect(html.articleText).toContain("Node.js 22.18");
    expect(html.code[0]).toContain("pnpm install --frozen-lockfile");
    expect(html.code[1]).toContain("node bin/aureform.mjs init");

    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    try {
      await restrictRequestsToWebsite(context, baseURL);
      const reader = await context.newPage();
      await reader.goto(url);
      await expect(reader.getByRole("heading", { level: 1 })).toHaveText(
        text.installation,
      );
      await expect(
        reader.getByRole("main").getByRole("heading", {
          name: text.lastSection,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        reader.getByRole("link", { name: text.sourceLink, exact: true }),
      ).toBeVisible();
      await reader
        .getByRole("navigation", { name: text.sections, exact: true })
        .getByRole("link", { name: text.introduction, exact: true })
        .click();
      await expect(reader).toHaveURL(localPage(baseURL, locale, "docs"));
      await expect(reader.getByRole("heading", { level: 1 })).toHaveText(
        text.introduction,
      );
    } finally {
      await context.close();
    }
  });
}

test("explicit article translations preserve their language and resolve an English contract anchor from Spanish", async ({
  page,
  baseURL,
}) => {
  await page.goto(localPage(baseURL, "es", "docs/adapters"));
  const contract = page.getByRole("main").getByRole("link", {
    name: "contrato completo",
    exact: true,
  });
  await expect(contract).toHaveAttribute(
    "href",
    `${new URL(localPage(baseURL, "en", "docs/adapters")).pathname}#endpoint-contract`,
  );
  await contract.click();
  await expect(page).toHaveURL(
    `${localPage(baseURL, "en", "docs/adapters")}#endpoint-contract`,
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#endpoint-contract")).toBeVisible();

  const spanish = page.getByRole("main").getByRole("link", {
    name: "Español",
    exact: true,
  });
  await spanish.click();
  await expect(page).toHaveURL(localPage(baseURL, "es", "docs/adapters"));
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test("installation links keep the actual external GitHub Pages backup in both languages", async ({
  page,
  baseURL,
}) => {
  for (const locale of locales) {
    await page.goto(localPage(baseURL, locale, "docs/installation"));
    const backup = page.getByRole("main").getByRole("link", {
      name: "GitHub Pages",
      exact: true,
    });
    await expect(backup).toHaveAttribute(
      "href",
      "https://terrizoaguimor.github.io/aureform-ui/",
    );
    await expect(backup).toHaveAttribute("target", "_blank");
  }
});

test("landing and deep-doc metadata publish localized titles, canonical URLs and reciprocal hreflang in HTTP HTML", async ({
  page,
  request,
  baseURL,
}) => {
  for (const locale of locales) {
    for (const path of ["", "docs/installation"]) {
      const response = await request.get(localPage(baseURL, locale, path));
      expect(response.status()).toBe(200);
      const html = await readHTML(page, await response.text());
      expect(html.title).toBe(
        path
          ? `${copy[locale].installation} · ${copy[locale].docs} · Aureform UI`
          : copy[locale].landingTitle,
      );
      expect(html.documentLanguage).toBe(locale);
      expect(html.description.length).toBeGreaterThan(30);
      expectPublishedAlternates(html, locale, path);
    }
  }
});

test("sitemap and robots use the public domain and only publish available chapter languages", async ({
  page,
  request,
  baseURL,
}) => {
  const sitemapResponse = await request.get(
    localResource(baseURL, "sitemap.xml"),
  );
  expect(sitemapResponse.status()).toBe(200);
  const entries = await page.evaluate(
    (source) => {
      const xml = new DOMParser().parseFromString(source, "application/xml");
      if (xml.querySelector("parsererror"))
        throw new Error("Invalid sitemap XML");
      return Array.from(xml.getElementsByTagName("url"), (entry) => ({
        url: entry.getElementsByTagName("loc")[0]?.textContent ?? "",
        alternates: Object.fromEntries(
          Array.from(
            entry.getElementsByTagNameNS(
              "http://www.w3.org/1999/xhtml",
              "link",
            ),
            (link) => [
              link.getAttribute("hreflang"),
              link.getAttribute("href"),
            ],
          ),
        ),
      }));
    },
    await sitemapResponse.text(),
  );

  const locations = entries.map((entry) => entry.url);
  expect(new Set(locations).size).toBe(locations.length);
  const expectedDocs = [
    ...locales.flatMap((locale) =>
      bilingualChapters.map((slug) =>
        publishedPage(locale, `docs${slug ? `/${slug}` : ""}`),
      ),
    ),
    publishedPage("en", "docs/registry"),
    publishedPage("en", "docs/contributing"),
  ];
  expect(
    locations.filter((url) => new URL(url).pathname.includes("/docs/")).sort(),
  ).toEqual(expectedDocs.sort());
  expect(locations).toEqual(
    expect.arrayContaining(locales.map((locale) => publishedPage(locale))),
  );
  for (const entry of entries) {
    expect(new URL(entry.url).origin).toBe(expectedSiteOrigin);
    for (const alternative of Object.values(entry.alternates)) {
      expect(new URL(String(alternative)).origin).toBe(expectedSiteOrigin);
      expect(locations).toContain(alternative);
    }
  }
  expect(
    entries.find(
      (entry) => entry.url === publishedPage("en", "docs/installation"),
    )?.alternates,
  ).toEqual({
    en: publishedPage("en", "docs/installation"),
    es: publishedPage("es", "docs/installation"),
  });
  expect(
    entries.find((entry) => entry.url === publishedPage("en", "docs/registry"))
      ?.alternates,
  ).toEqual({ en: publishedPage("en", "docs/registry") });
  expect(
    entries.find((entry) => entry.url === publishedPage("es", "docs/research"))
      ?.alternates,
  ).toEqual({
    en: publishedPage("en", "docs/research"),
    es: publishedPage("es", "docs/research"),
  });

  const robotsResponse = await request.get(
    localResource(baseURL, "robots.txt"),
  );
  expect(robotsResponse.status()).toBe(200);
  const robots = await robotsResponse.text();
  expect(robots).toMatch(/^User-Agent:\s*\*/im);
  expect(robots).toMatch(/^Allow:\s*\/\s*$/im);
  expect(robots.match(/^Sitemap:\s*(\S+)\s*$/im)?.[1]).toBe(
    `${expectedSiteOrigin}/sitemap.xml`,
  );
});

test("Spanish registry and contributing retain Spanish navigation with an explicit English-content notice and English canonical", async ({
  page,
  request,
  baseURL,
}) => {
  const notice =
    "La referencia técnica de este capítulo está en inglés. La navegación permanece en español.";
  for (const chapter of [
    { slug: "registry", title: "Registry de shadcn" },
    { slug: "contributing", title: "Contribuir" },
  ]) {
    const url = localPage(baseURL, "es", `docs/${chapter.slug}`);
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    const html = await readHTML(page, await response.text());
    const canonical = publishedPage("en", `docs/${chapter.slug}`);
    expect(html.documentLanguage).toBe("es");
    expect(html.articleLanguage).toBe("en");
    expect(html.articleText).toContain(notice);
    expect(html.canonicals).toEqual([canonical]);
    expect(html.alternates).toEqual({ en: canonical });
    expect(html.robots).toMatch(/\bnoindex\b/);

    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      chapter.title,
    );
    await expect(
      page.getByRole("main").getByText(notice, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", {
        name: copy.es.sections,
        exact: true,
      }),
    ).toBeVisible();
  }
});

test("the grounded research is available in English with its own canonical and reciprocal Spanish hreflang", async ({
  page,
  request,
  baseURL,
}) => {
  const url = localPage(baseURL, "en", "docs/research");
  const response = await request.get(url);
  expect(response.status()).toBe(200);
  const html = await readHTML(page, await response.text());
  expect(html.documentLanguage).toBe("en");
  expect(html.articleLanguage).toBe("en");
  expect(html.articleText).toContain("Gemini 4 Argon High");
  expect(html.articleText).not.toContain(
    "This research chapter is currently available in Spanish.",
  );
  expectPublishedAlternates(html, "en", "docs/research");
  expect(html.robots).not.toMatch(/\bnoindex\b/);

  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Product gap research",
  );
  await expect(page.locator("main article")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("navigation", { name: copy.en.sections, exact: true }),
  ).toBeVisible();
});

test("a Markdown code block copies its complete multiline source into the real Chromium clipboard", async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: targetURL(baseURL).origin,
  });
  await page.goto(localPage(baseURL, "en", "docs/installation"));
  const expectedCode = [
    "git clone https://github.com/terrizoaguimor/aureform-ui.git",
    "cd aureform-ui",
    "corepack enable",
    "pnpm install --frozen-lockfile",
    "pnpm dev",
  ].join("\n");
  const block = page.locator("main article .af-doc-code").first();
  await expect(block.locator("pre code")).toHaveText(expectedCode, {
    useInnerText: false,
  });
  const button = block.getByRole("button", { name: "Copy code", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(block.getByRole("status")).toHaveText("Copied");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(expectedCode);
});

test("local search finds an inactive chapter by heading keywords, and its outline opens a real Markdown anchor", async ({
  page,
  baseURL,
}) => {
  await page.goto(localPage(baseURL, "en", "docs"));
  const trigger = page.getByRole("button", {
    name: copy.en.search,
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: copy.en.search,
    exact: true,
  });
  const input = dialog.getByRole("combobox", {
    name: copy.en.search,
    exact: true,
  });
  await expect(input).toBeFocused();
  // This is a heading in registry-compatibility.md, not its title/description.
  const heading = "Fresh official consumer result";
  await input.fill(heading);
  await expect(
    dialog.getByRole("option", { name: /shadcn registry/ }),
  ).toHaveCount(1);
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(localPage(baseURL, "en", "docs/registry"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "shadcn registry",
  );
  const outlineLink = page
    .getByRole("navigation", { name: copy.en.contents, exact: true })
    .getByRole("link", { name: heading, exact: true });
  const anchor = await outlineLink.getAttribute("href");
  expect(anchor).toBe("#fresh-official-consumer-result");
  await outlineLink.click();
  await expect(page).toHaveURL(
    `${localPage(baseURL, "en", "docs/registry")}${anchor}`,
  );
  await expect(
    page.getByRole("main").getByRole("heading", { name: heading, exact: true }),
  ).toHaveAttribute("id", anchor!.slice(1));
});

test("Spanish touch navigation contains focus, restores the trigger on Escape and renders a scrollable Markdown table within mobile bounds", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 900 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    await restrictRequestsToWebsite(context, baseURL);
    const page = await context.newPage();
    await page.goto(localPage(baseURL, "es", "docs/installation"));
    const trigger = page.getByRole("button", {
      name: "Abrir menú de documentación",
      exact: true,
    });
    await trigger.tap();
    const drawer = page.getByRole("dialog", {
      name: copy.es.docs,
      exact: true,
    });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link")).toHaveCount(25);
    await page.keyboard.press("Tab");
    expect(
      await drawer.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    await page.keyboard.press("Shift+Tab");
    expect(
      await drawer.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();

    await trigger.tap();
    await drawer
      .getByRole("link", { name: "Operaciones SaaS", exact: true })
      .tap();
    await expect(page).toHaveURL(localPage(baseURL, "es", "docs/saas"));
    await expect(drawer).not.toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Operaciones SaaS",
    );
    const table = page
      .getByRole("region", { name: "Tabla de referencia", exact: true })
      .first();
    await table.scrollIntoViewIfNeeded();
    await expect(table.getByRole("table")).toBeVisible();
    await expect(table).toHaveAttribute("tabindex", "0");
    await table.focus();
    await expect(table).toBeFocused();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
  }
});

test("switching EN and ES preserves the active documentation chapter and its current navigation item", async ({
  page,
  baseURL,
}) => {
  await page.goto(localPage(baseURL, "en", "docs/charts"));
  await page.getByRole("link", { name: "ES — Español", exact: true }).click();
  await expect(page).toHaveURL(localPage(baseURL, "es", "docs/charts"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gráficos");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page
      .getByRole("navigation", { name: copy.es.sections, exact: true })
      .getByRole("link", { name: "Gráficos", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "EN — English", exact: true }).click();
  await expect(page).toHaveURL(localPage(baseURL, "en", "docs/charts"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Charts");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page
      .getByRole("navigation", { name: copy.en.sections, exact: true })
      .getByRole("link", { name: "Charts", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("landing and docs share the selected light/dark mode across reloads, locales and provider boundaries", async ({
  page,
  baseURL,
}) => {
  await page.goto(localPage(baseURL, "en"));
  const root = page.locator("html");
  await expect(root).toHaveClass(/\bdark\b/);
  await page
    .locator("header")
    .getByRole("button", { name: "Toggle color theme", exact: true })
    .click();
  await expect(root).not.toHaveClass(/\bdark\b/);
  await page
    .getByRole("banner")
    .getByRole("link", { name: copy.en.docs, exact: true })
    .click();
  await expect(page).toHaveURL(localPage(baseURL, "en", "docs"));
  await expect(root).not.toHaveClass(/\bdark\b/);
  await expect(
    page.getByRole("button", { name: "Switch to dark mode", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(root).not.toHaveClass(/\bdark\b/);
  await page.getByRole("link", { name: "ES — Español", exact: true }).click();
  await expect(root).not.toHaveClass(/\bdark\b/);
  await page
    .getByRole("button", { name: "Cambiar al modo oscuro", exact: true })
    .click();
  await expect(root).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(root).toHaveClass(/\bdark\b/);
  await page
    .getByRole("link", { name: "Inicio de Aureform UI", exact: true })
    .click();
  await expect(page).toHaveURL(localPage(baseURL, "es"));
  await expect(root).toHaveClass(/\bdark\b/);
});

for (const sitePath of ["", "docs/installation", "quality"]) {
  test(`${sitePath || "landing"}: application code loads only after opening the demo`, async ({
    page,
    request,
    baseURL,
  }, testInfo) => {
    const siteURL = localPage(baseURL, "en", sitePath);
    const demoURL = localPage(baseURL, "en", "dashboard");
    const scriptPaths = (html: string) =>
      [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"/g)].map(
        ([, src]) => new URL(src, siteURL).pathname,
      );
    const [siteResponse, demoResponse] = await Promise.all([
      request.get(siteURL),
      request.get(demoURL),
    ]);
    expect(siteResponse.ok()).toBe(true);
    expect(demoResponse.ok()).toBe(true);
    const siteScripts = scriptPaths(await siteResponse.text());
    const demoOnlyScripts = scriptPaths(await demoResponse.text()).filter(
      (path) => !siteScripts.includes(path),
    );
    expect(demoOnlyScripts.length).toBeGreaterThan(0);

    const requestedScripts = new Set<string>();
    page.on("request", (resource) => {
      if (resource.resourceType() === "script")
        requestedScripts.add(new URL(resource.url()).pathname);
    });
    await page.goto(siteURL);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const demoLink = page.locator('a[href$="/en/dashboard/"]').first();
    await demoLink.scrollIntoViewIfNeeded();
    await demoLink.hover();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const prematureDownloads = demoOnlyScripts.filter((path) =>
      requestedScripts.has(path),
    );
    await testInfo.attach("application-loading.json", {
      body: Buffer.from(
        JSON.stringify({
          sitePath,
          initialScriptRequests: requestedScripts.size,
          demoOnlyScripts,
          prematureDownloads,
          scope:
            "Cold local Chromium context, visible links and hover, before an explicit demo navigation.",
        }),
      ),
      contentType: "application/json",
    });
    expect(prematureDownloads).toEqual([]);

    await demoLink.click();
    await expect(page).toHaveURL(demoURL);
    await expect(page.getByRole("main")).toBeVisible();
    await expect
      .poll(() => demoOnlyScripts.some((path) => requestedScripts.has(path)))
      .toBe(true);
  });
}

for (const scenario of [
  { locale: "en", theme: "dark" },
  { locale: "es", theme: "light" },
] as const) {
  const { locale, theme } = scenario;
  test(`${locale} ${theme}: documentation main and navigation have no serious/critical Axe violations and keyboard search restores focus`, async ({
    page,
    baseURL,
  }, testInfo) => {
    await page.addInitScript((selectedTheme) => {
      localStorage.setItem("aureform:theme", selectedTheme);
    }, theme);
    await page.goto(localPage(baseURL, locale, "docs/installation"));
    if (theme === "dark")
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    const scan = async (state: string, dialog = false) => {
      const builder = new AxeBuilder({ page }).withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
      ]);
      if (dialog) builder.include('[role="dialog"]');
      else builder.include("main").include("nav[aria-label]");
      const result = await builder.analyze();
      await testInfo.attach(`website-axe-${locale}-${theme}-${state}.json`, {
        body: Buffer.from(
          JSON.stringify(
            {
              scope: dialog
                ? "documentation search dialog"
                : "docs main and nav",
              locale,
              theme,
              state,
              violations: result.violations,
              incomplete: result.incomplete,
              limits:
                "Scoped automated evidence only. Incomplete color-contrast is unresolved, not a pass or accessibility certification.",
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      });
      expect(
        result.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
        ),
      ).toEqual([]);
    };
    await scan("article");

    const skip = page.getByRole("link", {
      name: copy[locale].skip,
      exact: true,
    });
    await skip.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    const trigger = page.getByRole("button", {
      name: copy[locale].search,
      exact: true,
    });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: copy[locale].search,
      exact: true,
    });
    await expect(
      dialog.getByRole("combobox", {
        name: copy[locale].search,
        exact: true,
      }),
    ).toBeFocused();
    await scan("search-open", true);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
}
