import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { componentExampleSources } from "../src/lib/component-example-sources.ts";
import {
  appearanceStorageKey,
  createAppearance,
  exportConfiguredExample,
  normalizeAppearance,
  palettePresets,
  parseAppearance,
  resolveAppearance,
  serializeAppearance,
} from "../src/lib/appearance.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { strictCheckPayloads, validateConfiguredExample } = require("./verify-component-examples.cjs");
const ts = require(process.env.AUREFORM_QA_NODE_MODULES
  ? resolve(process.env.AUREFORM_QA_NODE_MODULES, "typescript") : "typescript");
const baseURL = (process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3010").replace(/\/+$/, "");
const reportPath = resolve(
  process.env.AUREFORM_QA_REPORT_DIR || resolve(projectRoot, "artifacts"),
  "copy-examples-report.json",
);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync("/usr/bin/chromium-browser") ? "/usr/bin/chromium-browser" : undefined);
const families = Object.keys(componentExampleSources);
const phases = ["global", "local-overrides", "global-theme-change", "reset-to-global"];
const timeout = 5000;
const label = (locale, en, es) => locale === "es" ? es : en;
const sha = (value) => createHash("sha256").update(value).digest("hex");
const sourcePaths = [
  "src/lib/appearance.ts",
  "src/lib/component-example-sources.ts",
  "src/components/templates/components.tsx",
  "src/components/appearance-provider.tsx",
  "scripts/verify-copy-examples.mjs",
  "scripts/verify-component-examples.cjs",
];

const defaultButtonConfig = { shape: "rounded", size: "default", appearance: "gradient" };
const localButtonConfig = { shape: "pill", size: "sm", appearance: "glass" };

// Load only the existing pure showcase generator, without executing the React
// template module. The selected props and complete behavior are audited
// separately below, rather than approving a generator by comparing it to itself.
export async function buttonExampleSource(config, locale, root = projectRoot) {
  const filename = resolve(root, "src/components/templates/components.tsx");
  const parsed = ts.createSourceFile(filename, await readFile(filename, "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const generator = parsed.statements.find((item) =>
    ts.isFunctionDeclaration(item) && item.name?.text === "buttonShowcaseSource");
  assert(generator, "The actual Button showcase source generator is missing.");
  const compiled = ts.transpileModule(
    `${generator.getText(parsed)}\nexports.generate = buttonShowcaseSource;`,
    { fileName: "button-showcase-generator.ts", reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  );
  assert.equal(compiled.diagnostics?.length, 0);
  const exports = {};
  vm.runInNewContext(compiled.outputText, { exports }, { filename, timeout: 1000 });
  return exports.generate(config, (en, es) => locale === "es" ? es : en);
}

export function clipboardPayloadName({ locale, config, width = 1440, phase, family }) {
  return `${locale}/${config.theme}/${config.palette}/${width}/${phase}/${family}.tsx`;
}

export function validateButtonExample(source, selected, locale, filename = "Button.tsx") {
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length, 0, `${filename}: invalid TSX.`);
  const entry = parsed.statements.find((item) =>
    ts.isFunctionDeclaration(item) && item.name?.text === "ButtonExample");
  assert(entry?.body, `${filename}: complete ButtonExample is required.`);
  const nodes = [];
  const visit = (node) => { nodes.push(node); ts.forEachChild(node, visit); };
  visit(entry.body);
  const compact = (node) => node?.getText(parsed).replace(/\s+/g, "");
  const element = (tag) => {
    const matches = nodes.filter((node) =>
      (ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null)
        ?.tagName.getText(parsed) === tag);
    assert.equal(matches.length, 1, `${filename}: one ${tag} is required.`);
    return matches[0];
  };
  const attribute = (node, name) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    const attr = opening.attributes.properties.find((item) =>
      ts.isJsxAttribute(item) && item.name.getText(parsed) === name);
    assert(attr?.initializer, `${filename}: ${name} is required.`);
    return attr.initializer;
  };
  const literal = (node, name, expected) => {
    const value = attribute(node, name);
    assert(ts.isStringLiteral(value), `${filename}: ${name} must be a selected literal prop.`);
    assert.equal(value.text, expected, `${filename}: ${name} does not match the live selection.`);
  };
  const expression = (node, name, expected) => {
    const value = attribute(node, name);
    assert(ts.isJsxExpression(value));
    assert.equal(compact(value.expression), expected, `${filename}: ${name} behavior changed.`);
    return value.expression;
  };
  const button = element("Button");
  literal(button, "type", "submit");
  for (const key of ["shape", "size", "appearance"]) literal(button, key, selected[key]);
  expression(button, "loading", "pending");
  expression(button, "disabled", "!name.trim()");
  expression(button, "aria-describedby", 'id+"-status"');
  const input = element("Input");
  expression(input, "id", "id");
  expression(input, "value", "name");
  expression(input, "maxLength", "48");
  expression(input, "disabled", "pending");
  const change = expression(input, "onChange",
    '(event)=>{setName(event.target.value);setSavedName("");}');
  assert(ts.isArrowFunction(change));
  const form = element("form");
  const submit = expression(form, "onSubmit",
    "(event)=>{event.preventDefault();voidsave();}");
  assert(ts.isArrowFunction(submit));
  const states = nodes.filter(ts.isVariableDeclaration);
  for (const [name, initial] of [
    ["[name,setName]", '"Morrow"'], ["[pending,setPending]", "false"], ["[savedName,setSavedName]", '""'],
  ]) {
    const state = states.find((node) => compact(node.name) === name);
    assert.equal(compact(state?.initializer), `useState(${initial})`, `${filename}: local ${name} state missing.`);
  }
  assert.equal(compact(states.find((node) => node.name.getText(parsed) === "id")?.initializer), "useId()");
  const save = nodes.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "save");
  assert(save?.modifiers?.some((node) => node.kind === ts.SyntaxKind.AsyncKeyword));
  const statements = save.body.statements;
  assert.equal(statements.length, 6, `${filename}: complete guarded async saving is required.`);
  assert.equal(compact(statements[0]), "constnextName=name.trim();");
  assert.equal(compact(statements[1]), "if(!nextName||pending)return;");
  assert.equal(compact(statements[2]), "setPending(true);");
  assert.equal(compact(statements[3]), "awaitnewPromise<void>((resolve)=>setTimeout(resolve,900));");
  assert.equal(compact(statements[4]), "setSavedName(nextName);");
  assert.equal(compact(statements[5]), "setPending(false);");
  const labelNode = element("label");
  expression(labelNode, "htmlFor", "id");
  assert.equal(labelNode.children.filter(ts.isJsxText).map((node) => node.text).join("").trim(),
    label(locale, "Workspace name", "Nombre del espacio"));
  assert.equal(button.children.filter(ts.isJsxText).map((node) => node.text).join("").trim(),
    label(locale, "Save changes", "Guardar cambios"));
  const status = element("p");
  literal(status, "role", "status");
  expression(status, "id", 'id+"-status"');
  const conditional = status.children.find(ts.isJsxExpression)?.expression;
  assert(conditional && ts.isConditionalExpression(conditional));
  assert.equal(compact(conditional.condition), "pending");
  assert.equal(conditional.whenTrue.text, label(locale, "Saving locally…", "Guardando localmente…"));
  assert(ts.isConditionalExpression(conditional.whenFalse));
  assert.equal(compact(conditional.whenFalse.condition), "savedName");
  const saved = conditional.whenFalse.whenTrue;
  assert(ts.isBinaryExpression(saved) && saved.operatorToken.kind === ts.SyntaxKind.PlusToken);
  assert.equal(saved.left.text, label(locale, "Preview saved: ", "Vista previa guardada: "));
  assert.equal(compact(saved.right), "savedName");
  assert.equal(conditional.whenFalse.whenFalse.text, label(locale,
    "Enter a name, then save this preview.", "Escribe un nombre y guarda esta vista previa."));
  return { selectedProps: { ...selected }, locale, completeLocalSaving: true, loadingUsesPending: true };
}

function buttonControlLabels(locale) {
  return {
    shape: { name: label(locale, "Button shape", "Forma del botón"),
      values: { rounded: label(locale, "Rounded", "Curvo"), pill: label(locale, "Pill", "Píldora"),
        square: label(locale, "Square", "Cuadrado") } },
    size: { name: label(locale, "Button size", "Tamaño del botón"),
      values: { sm: label(locale, "Small", "Pequeño"), default: label(locale, "Medium", "Medio"),
        lg: label(locale, "Large", "Grande") } },
    appearance: { name: label(locale, "Button material", "Material del botón"),
      values: { solid: label(locale, "Solid", "Sólido"), soft: label(locale, "Soft", "Suave"),
        outline: label(locale, "Outline", "Contorno"), glass: label(locale, "Glass", "Cristal"),
        gradient: label(locale, "Gradient", "Degradado") } },
  };
}

async function assertButtonSelection(card, expected, locale) {
  const button = card.getByRole("button", { name: label(locale, "Save changes", "Guardar cambios"), exact: true });
  const actual = {};
  for (const [key, options] of Object.entries(buttonControlLabels(locale))) {
    actual[key] = await button.getAttribute(`data-${key}`);
    assert.equal(actual[key], expected[key], `${key}: live Button prop disagrees with the selected configuration.`);
    const trigger = card.getByRole("combobox", { name: options.name, exact: true });
    assert.equal((await trigger.textContent()).trim(), options.values[expected[key]]);
  }
  assert.deepEqual(actual, expected);
  return actual;
}

async function configureButton(page, card, config, locale) {
  for (const [key, options] of Object.entries(buttonControlLabels(locale)))
    await select(page, card.getByRole("combobox", { name: options.name, exact: true }), options.values[config[key]]);
  return assertButtonSelection(card, config, locale);
}

async function checkButtonPreview(card, locale) {
  const input = card.getByRole("textbox", { name: label(locale, "Workspace name", "Nombre del espacio"), exact: true });
  const save = card.getByRole("button", { name: label(locale, "Save changes", "Guardar cambios"), exact: true });
  const status = card.locator("form").getByRole("status");
  await input.fill("");
  assert(await save.isDisabled(), "Empty names cannot be saved.");
  await input.fill("  Aureform clipboard QA  ");
  await save.click();
  await waitForValue("Actual pending Button", () => save.getAttribute("aria-busy"), (value) => value === "true");
  assert(await input.isDisabled() && await save.isDisabled(), "Saving locks the real input and button.");
  assert.equal(await status.textContent(), label(locale, "Saving locally…", "Guardando localmente…"));
  await waitForValue("Actual completed Button save", () => status.textContent(),
    (value) => value === label(locale, "Preview saved: Aureform clipboard QA", "Vista previa guardada: Aureform clipboard QA"));
  assert(await input.isEnabled() && await save.isEnabled(), "The actual preview becomes usable after saving.");
  return { emptyNameDisabled: true, observedPending: true, trimmedNameSaved: true, controlsReenabled: true };
}

async function fingerprints() {
  return Promise.all(sourcePaths.map(async (path) => ({
    path, sha256: sha(await readFile(resolve(projectRoot, path))),
  })));
}

async function waitForValue(description, sample, matches) {
  const started = Date.now();
  let value;
  while (Date.now() - started <= timeout) {
    value = await sample();
    if (matches(value)) return value;
    await new Promise((done) => setTimeout(done, 16));
  }
  assert.fail(`${description} did not settle within ${timeout}ms: ${JSON.stringify(value)}`);
}

function observe(page, report) {
  page.on("pageerror", (error) => report.errors.push({
    check: "pageerror", url: page.url(), message: error.message,
  }));
  page.on("console", (message) => {
    if (message.type() === "error")
      report.errors.push({ check: "console", url: page.url(), message: message.text() });
  });
  page.on("requestfailed", (request) => {
    if (!/ERR_ABORTED/.test(request.failure()?.errorText || ""))
      report.errors.push({
        check: "requestfailed", url: request.url(), message: request.failure()?.errorText,
      });
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).origin === new URL(baseURL).origin)
      report.errors.push({ check: "http", url: response.url(), status: response.status() });
  });
}

async function globalProfile(page) {
  const text = await page.evaluate((key) => localStorage.getItem(key), appearanceStorageKey);
  assert(text, "The test's initial full profile must remain in real localStorage.");
  return parseAppearance(text);
}

async function waitGlobal(page, expected) {
  return waitForValue(
    "The global appearance update",
    () => globalProfile(page),
    (config) => JSON.stringify(config) === JSON.stringify(normalizeAppearance(expected)),
  );
}

async function newPage(browser, report, { locale = "en", width = 1440, config }) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: "reduce",
    colorScheme: config.theme,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  context.setDefaultTimeout(timeout);
  context.setDefaultNavigationTimeout(15000);
  await context.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, value);
  }, { key: appearanceStorageKey, value: serializeAppearance(config) });
  const page = await context.newPage();
  observe(page, report);
  try {
    const response = await page.goto(`${baseURL}/${locale}/components/`, { waitUntil: "load" });
    assert.equal(response?.status(), 200);
    await page.locator("h1").first().waitFor({ state: "visible" });
    await waitForValue(
      "The real appearance provider",
      () => page.evaluate(() => document.documentElement.style.getPropertyValue("--af-color-primary")),
      (value) => value === config.colors.primary,
    );
    assert.equal(await page.locator("html").getAttribute("lang"), locale);
    await waitGlobal(page, config);
    return { context, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}

function specimen(page, family) {
  return page.locator(`[data-slot="card"][id$="-${family}"]`);
}

async function view(card, locale, family, kind) {
  const group = card.getByRole("group", {
    name: `${family} — ${label(locale, "Example view", "Vista del ejemplo")}`,
    exact: true,
  });
  const button = group.getByRole("button", {
    name: kind === "code" ? label(locale, "Code", "Código") : label(locale, "Preview", "Vista previa"),
    exact: true,
  });
  await button.click();
  assert.equal(await button.getAttribute("aria-pressed"), "true");
}

async function assertScope(card, config) {
  const expected = resolveAppearance(config);
  await waitForValue(
    "The actual configured specimen scope",
    () => card.locator(".af-appearance-scope").first().evaluate((element) => ({
      dark: element.classList.contains("dark"),
      dataset: { ...element.dataset },
      variables: Object.fromEntries([...element.style].filter((key) => key.startsWith("--")).map(
        (key) => [key, element.style.getPropertyValue(key).trim()],
      )),
    })),
    (value) => value.dark === (config.theme === "dark") &&
      value.dataset.material === config.material &&
      value.dataset.density === config.density &&
      Object.entries(expected).every(([key, content]) => value.variables[key] === content),
  );
}

async function select(page, trigger, name) {
  await trigger.click();
  await page.getByRole("option", { name, exact: true }).click();
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
}

async function localOverrides(page, card, family, index) {
  const material = ["flat", "glass", "gradient", "elevated"][index % 4];
  const materialLabel = { flat: "Flat", glass: "Glass", gradient: "Gradient", elevated: "Elevated" }[material];
  await select(page, card.getByRole("combobox", {
    name: `${family} — Surface material`, exact: true,
  }), materialLabel);
  await card.getByRole("button", { name: "Live controls", exact: true }).click();
  const slider = card.getByRole("slider", { name: `${family} — Corner radius`, exact: true });
  const radius = [0, 3, 9, 24][index % 4];
  await slider.focus();
  await slider.press("Home");
  for (let step = 0; step < radius; step++) await slider.press("ArrowRight");
  assert.equal(Number(await slider.getAttribute("aria-valuenow")), radius);
  await select(
    page,
    card.getByRole("combobox", { name: "Control density", exact: true }),
    "Compact",
  );
  return { material, radius, density: "compact" };
}

async function capture(page, report, payloads, { family, phase, locale, config, width, buttonConfig }) {
  const card = specimen(page, family);
  await view(card, locale, family, "preview");
  await assertScope(card, config);
  let source = componentExampleSources[family];
  if (family === "Button") {
    assert(buttonConfig, "Button capture requires independently planned selected props.");
    await assertButtonSelection(card, buttonConfig, locale);
    source = await buttonExampleSource(buttonConfig, locale);
  }
  const expected = exportConfiguredExample(source, config);
  // Reset the actual browser clipboard so stale content cannot approve a click.
  await page.evaluate((sentinel) => navigator.clipboard.writeText(sentinel),
    `aureform-qa-pending-${report.copied.length}`);
  const copyNames = [
    label(locale, "Copy example", "Copiar ejemplo"),
    label(locale, "Copied example", "Ejemplo copiado"),
  ].map((prefix) => `${prefix} ${family}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const copyButton = card.getByRole("button", {
    name: new RegExp(`^(?:${copyNames.join("|")})$`),
  });
  const copyActionNameBefore = await copyButton.getAttribute("aria-label");
  await copyButton.click();
  const copied = await waitForValue(
    `${family}/${phase}: clipboard`,
    () => page.evaluate(() => navigator.clipboard.readText()),
    (value) => value === expected,
  );
  const copyActionNameAfter = await copyButton.getAttribute("aria-label");
  assert.notEqual(copied, source, "The 1.1 clipboard must include the configuration wrapper.");
  const name = clipboardPayloadName({ locale, config, width, phase, family });
  const evidence = validateConfiguredExample(
    copied, config, source, name,
  );
  const buttonEvidence = family === "Button" ? validateButtonExample(copied, buttonConfig, locale, name) : undefined;
  await view(card, locale, family, "code");
  const displayed = await card.locator("pre").textContent();
  assert.equal(displayed, copied, `${family}: displayed code and clipboard disagree.`);
  payloads.push({ name, source: copied });
  const entry = {
    family, phase, locale, theme: config.theme, palette: config.palette, width: width || 1440,
    payloadName: name,
    status: "passed", profile: config, ...evidence,
    ...(buttonEvidence ? { button: buttonEvidence } : {}),
    displayedSourceMatchesClipboard: true,
    copyActionNameBefore,
    copyActionNameAfter,
  };
  report.copied.push(entry);
  return entry;
}

async function health(page) {
  const overflow = await page.evaluate(() => Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
  ) - innerWidth);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const seriousOrCritical = accessibility.violations.filter(
    (item) => ["serious", "critical"].includes(item.impact),
  ).map((item) => ({
    id: item.id, impact: item.impact,
    nodes: item.nodes.map((node) => ({ target: node.target, failure: node.failureSummary })),
  }));
  assert(overflow <= 1, `Code view overflows by ${overflow}px.`);
  assert.equal(seriousOrCritical.length, 0, JSON.stringify(seriousOrCritical));
  return {
    overflow, seriousOrCritical,
    axeIncomplete: accessibility.incomplete.map((item) => ({
      id: item.id, nodes: item.nodes.map((node) => node.target),
    })),
  };
}

export async function runCopyVerification() {
  assert.equal(families.length, 44);
  const report = {
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: null,
    targetVersion: JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version,
    sourceRoot: projectRoot,
    sourceFingerprints: await fingerprints(),
    baseURL, executablePath: executablePath || "Playwright-managed Chromium",
    browserRuntimeTested: false,
    releaseVerified: false,
    planned: { families, phases, dynamicClipboardPayloads: 176, codeViewCombinations: 12 },
    copied: [], codeViews: [], errors: [],
  };
  const payloads = [];
  const openContexts = new Set();
  let browser;
  const write = async () => {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  };
  await write();
  try {
    browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
    report.browserVersion = browser.version();
    report.browserRuntimeTested = true;
    const initial = createAppearance("aurora", "dark");
    const { context, page } = await newPage(browser, report, { config: initial });
    openContexts.add(context);
    try {
      const overrides = new Map();
      for (const [index, family] of families.entries()) {
        await capture(page, report, payloads, {
          family, phase: "global", locale: "en", config: await globalProfile(page),
          buttonConfig: family === "Button" ? defaultButtonConfig : undefined,
        });
        const card = specimen(page, family);
        await view(card, "en", family, "preview");
        const local = await localOverrides(page, card, family, index);
        if (family === "Button") {
          await configureButton(page, card, localButtonConfig, "en");
          report.buttonPreviewInteraction = await checkButtonPreview(card, "en");
        }
        overrides.set(family, local);
        await capture(page, report, payloads, {
          family, phase: "local-overrides", locale: "en",
          config: normalizeAppearance({ ...await globalProfile(page), ...local }),
          buttonConfig: family === "Button" ? localButtonConfig : undefined,
        });
        assert.deepEqual(await globalProfile(page), initial, "Specimen controls cannot alter the global profile.");
        await write();
        if ((index + 1) % 8 === 0 || index + 1 === families.length)
          console.log(`Configured clipboard: ${index + 1}/${families.length} families captured with global and local settings.`);
      }
      const toggle = page.getByRole("button", { name: "Toggle color theme", exact: true }).first();
      await toggle.focus();
      await toggle.press("Enter");
      const changed = normalizeAppearance({ ...initial, theme: "light" });
      await waitGlobal(page, changed);
      for (const [index, family] of families.entries()) {
        await capture(page, report, payloads, {
          family, phase: "global-theme-change", locale: "en",
          config: normalizeAppearance({ ...await globalProfile(page), ...overrides.get(family) }),
          buttonConfig: family === "Button" ? localButtonConfig : undefined,
        });
        await specimen(page, family).getByRole("button", { name: "Use global settings", exact: true }).click();
        await capture(page, report, payloads, {
          family, phase: "reset-to-global", locale: "en", config: await globalProfile(page),
          buttonConfig: family === "Button" ? localButtonConfig : undefined,
        });
        assert(await specimen(page, family).getByRole("button", { name: "Use global settings", exact: true }).isDisabled());
        await write();
        if ((index + 1) % 8 === 0 || index + 1 === families.length)
          console.log(`Configured clipboard: ${index + 1}/${families.length} theme changes and resets captured.`);
      }
      report.inventoryHealth = await health(page);
    } catch (error) {
      report.errors.push({ check: "44-family-dynamic-clipboard", name: error.name, message: error.message, stack: error.stack });
    } finally {
      await context.close();
      openContexts.delete(context);
      await write();
    }

    let combination = 0;
    for (const locale of ["en", "es"])
      for (const theme of ["light", "dark"])
        for (const width of [360, 768, 1440]) {
          const config = createAppearance(palettePresets[combination++ % 6].id, theme);
          config.material = width === 360 ? "glass" : width === 768 ? "gradient" : "elevated";
          config.radius = width === 360 ? 7 : 16;
          config.density = width === 360 ? "compact" : "comfortable";
          config.typography = locale === "es" ? "editorial" : "modern";
          let current;
          let evidence;
          try {
            current = await newPage(browser, report, { locale, width, config });
            openContexts.add(current.context);
            await current.page.getByRole("textbox", {
              name: label(locale, "Search components", "Buscar componentes"), exact: true,
            }).fill("Dialog");
            const entry = await capture(current.page, report, payloads, {
              family: "Dialog", phase: "responsive-code-view", locale, width, config,
            });
            evidence = { ...entry, status: "running" };
            report.codeViews.push(evidence);
            evidence.health = await health(current.page);
            evidence.status = "passed";
          } catch (error) {
            if (evidence) {
              evidence.status = "failed";
              evidence.error = { name: error.name, message: error.message };
            }
            report.errors.push({ check: "responsive-code-view", locale, theme, width, name: error.name, message: error.message, stack: error.stack });
          } finally {
            if (current) {
              await current.context.close();
              openContexts.delete(current.context);
            }
            await write();
          }
        }
    // Compile actual captured clipboard values even when an independent layout
    // or accessibility check failed. Failure must not erase consumer evidence.
    assert(payloads.length > 0, "At least one real clipboard value must be captured.");
    const payloadArtifact = resolve(dirname(reportPath), "copy-clipboard-payloads.json");
    const payloadJSON = JSON.stringify(payloads, null, 2) + "\n";
    await writeFile(payloadArtifact, payloadJSON);
    report.actualClipboardArtifact = { path: payloadArtifact, payloads: payloads.length, sha256: sha(payloadJSON) };
    report.actualClipboardCompilation = strictCheckPayloads(payloads);
    await write();
    for (const family of families)
      for (const phase of phases)
        assert.equal(
          report.copied.filter((entry) => entry.family === family && entry.phase === phase).length,
          1,
          `${family}/${phase}: every dynamic clipboard case must run once.`,
        );
    assert.equal(report.codeViews.length, 12);
    assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  } catch (error) {
    report.errors.push({ check: "suite", name: error.name, message: error.message, stack: error.stack });
  } finally {
    for (const context of openContexts)
      await context.close().catch((error) => report.errors.push({ check: "context-close", message: error.message }));
    if (browser)
      await browser.close().catch((error) => report.errors.push({ check: "browser-close", message: error.message }));
    report.completedSourceFingerprints = await fingerprints();
    report.sourceIntegrity = { unchanged: JSON.stringify(report.completedSourceFingerprints) === JSON.stringify(report.sourceFingerprints) };
    if (!report.sourceIntegrity.unchanged)
      report.errors.push({ check: "source-integrity", message: "QA source changed during clipboard verification." });
    report.completedAt = new Date().toISOString();
    report.status = report.errors.length ? "failed" : "passed";
    report.releaseVerified = report.status === "passed" && report.sourceIntegrity.unchanged;
    report.summary = {
      families: new Set(report.copied.filter((entry) => phases.includes(entry.phase)).map((entry) => entry.family)).size,
      dynamicClipboardPayloads: report.copied.filter((entry) => phases.includes(entry.phase)).length,
      codeViewCombinations: report.codeViews.length,
      passedCodeViewCombinations: report.codeViews.filter((entry) => entry.status === "passed").length,
      actualPayloadsStrictChecked: report.actualClipboardCompilation?.payloads || 0,
      errors: report.errors.length,
    };
    await write();
  }
  console.log(JSON.stringify({ status: report.status, ...report.summary, reportPath }));
  if (report.status !== "passed")
    throw new Error(`Configured clipboard verification failed with ${report.errors.length} recorded errors. See ${reportPath}.`);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await runCopyVerification();
