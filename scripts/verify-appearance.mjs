import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  appearanceToCSS,
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
const {
  strictCheckPayloads,
  studioExampleSource,
  validateConfiguredExample,
} = require("./verify-component-examples.cjs");
const profileKey = "aureform:appearance:v1";
const presetsKey = "aureform:presets:v1";
const scopeSelector = ".af-appearance-scope";
const shaderSelector = `${scopeSelector} [data-slot="shader-background"]`;
const waitLimit = 5000;
const navigationLimit = 15000;
const stableObservations = 8;
const pollInterval = 16;
const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 360, height: 900 };
export const appearanceBaseURL = (
  process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3010"
).replace(/\/+$/, "");
export const appearanceReportPath = resolve(
  process.env.AUREFORM_QA_REPORT_DIR || resolve(projectRoot, "artifacts"),
  "appearance-report.json",
);
export const appearanceRunID = process.env.AUREFORM_QA_RUN_ID || randomUUID();
process.env.AUREFORM_QA_RUN_ID = appearanceRunID;
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync("/usr/bin/chromium-browser")
    ? "/usr/bin/chromium-browser"
    : undefined);
export const appearanceLaunchOptions = {
  executablePath,
  args: [
    "--no-sandbox",
    ...(process.env.AUREFORM_QA_SWIFTSHADER === "1"
      ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
      : []),
  ],
};

const label = (locale, en, es) => (locale === "es" ? es : en);
const names = {
  aurora: ["Aurora", "Aurora"],
  violet: ["Violet", "Violeta"],
  ocean: ["Ocean", "Océano"],
  mint: ["Mint", "Menta"],
  ember: ["Ember", "Brasa"],
  rose: ["Rose", "Rosa"],
};
const specialKinds = [
  "controls",
  "persistence",
  "interchange",
  "shader-lifecycle",
  "no-webgl",
  "reduced-motion",
  "offscreen-initial",
  "no-js",
  "mobile",
  "storage-recovery",
];
export const allAppearanceCases = ["en", "es"].flatMap((locale) => [
  ...["light", "dark"].flatMap((theme) =>
    palettePresets.map(({ id: palette }) => ({
      id: `${locale}-${palette}-${theme}`,
      kind: "palette",
      locale,
      palette,
      theme,
    })),
  ),
  ...specialKinds.map((kind) => ({ id: `${locale}-${kind}`, kind, locale })),
]);

export function selectAppearanceCases(cases, selection = "") {
  if (!selection.trim()) return cases;
  const requested = selection.split(",").map((id) => id.trim());
  assert(requested.every(Boolean), "Appearance case selection contains an empty ID.");
  assert.equal(new Set(requested).size, requested.length, "Appearance case IDs must be unique.");
  const unknown = requested.filter((id) => !cases.some((item) => item.id === id));
  assert.equal(unknown.length, 0, `Unknown appearance case IDs: ${unknown.join(", ")}`);
  return cases.filter((item) => requested.includes(item.id));
}

export const appearanceCases = selectAppearanceCases(
  allAppearanceCases, process.env.AUREFORM_QA_CASE_IDS || "",
);

// This observer preserves the real WebGL and RAF implementations. Canvas draw
// calls associate a scheduler callback with that canvas; unrelated GSAP/React
// callbacks are never counted as a shader loop.
function installAppearanceProbe({ forceNoWebGL }) {
  if (window.__aureformAppearanceQA) return;
  const records = new Map();
  const locations = new WeakMap();
  const callbacks = new WeakMap();
  const pending = new Map();
  const events = [];
  const storageEvents = [];
  const wrapped = new WeakSet();
  let existingToasts = new WeakSet();
  let currentCallback = null;
  let currentTimestamp = null;
  let visibility = null;
  let nextId = 0;
  const getRecord = (canvas) => {
    if (!records.has(canvas))
      records.set(canvas, {
        id: ++nextId,
        canvas,
        context: null,
        extension: null,
        requests: 0,
        draws: 0,
        rafExecutions: 0,
        programsCreated: 0,
        programsDeleted: 0,
        arraysDeleted: 0,
        drawTimes: [],
        contextOptions: [],
        uniforms: {},
      });
    return records.get(canvas);
  };
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = function (callback) {
    let metadata = callbacks.get(callback);
    if (!metadata) {
      metadata = { canvases: new Set() };
      callbacks.set(callback, metadata);
    }
    const id = nativeRAF((timestamp) => {
      pending.delete(id);
      const previous = currentCallback;
      const previousTimestamp = currentTimestamp;
      currentCallback = metadata;
      currentTimestamp = timestamp;
      for (const record of metadata.canvases) record.rafExecutions++;
      try {
        callback(timestamp);
      } finally {
        currentCallback = previous;
        currentTimestamp = previousTimestamp;
      }
    });
    pending.set(id, metadata);
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    pending.delete(id);
    return nativeCancel(id);
  };
  const nativeContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
    if (!["webgl", "webgl2", "experimental-webgl"].includes(kind))
      return nativeContext.call(this, kind, ...args);
    const record = getRecord(this);
    record.requests++;
    record.contextOptions.push({ kind, options: args[0] ?? null });
    if (forceNoWebGL) return null;
    const context = nativeContext.call(this, kind, ...args);
    if (context) record.context = context;
    return context;
  };
  for (const prototype of [
    window.WebGLRenderingContext?.prototype,
    window.WebGL2RenderingContext?.prototype,
  ].filter(Boolean)) {
    const wrap = (name, observe) => {
      const original = prototype[name];
      if (typeof original !== "function" || wrapped.has(original)) return;
      const replacement = function (...args) {
        const result = original.apply(this, args);
        observe(getRecord(this.canvas), args, result);
        return result;
      };
      wrapped.add(replacement);
      prototype[name] = replacement;
    };
    for (const name of ["drawArrays", "drawElements"])
      wrap(name, (record) => {
        record.draws++;
        record.drawTimes.push(currentTimestamp ?? performance.now());
        currentCallback?.canvases.add(record);
      });
    wrap("createProgram", (record) => record.programsCreated++);
    wrap("deleteProgram", (record) => record.programsDeleted++);
    wrap("deleteVertexArray", (record) => record.arraysDeleted++);
    wrap("getUniformLocation", (_record, args, result) => {
      if (result) locations.set(result, args[1]);
    });
    for (const name of ["uniform1f", "uniform2f", "uniform3fv"])
      wrap(name, (record, args) => {
        const uniform = locations.get(args[0]);
        if (uniform)
          record.uniforms[uniform] =
            name === "uniform3fv" ? Array.from(args[1]) : args.slice(1);
      });
  }
  window.addEventListener("aureform:appearance-change", (event) => {
    events.push({ at: performance.now(), config: event.detail });
  });
  window.addEventListener("storage", (event) => {
    storageEvents.push({ key: event.key, trusted: event.isTrusted, at: performance.now() });
  });
  const snapshot = (record) => ({
    id: record.id,
    connected: record.canvas.isConnected,
    requests: record.requests,
    draws: record.draws,
    rafExecutions: record.rafExecutions,
    pendingRAF: [...pending.values()].filter((entry) => entry.canvases.has(record)).length,
    programsCreated: record.programsCreated,
    programsDeleted: record.programsDeleted,
    arraysDeleted: record.arraysDeleted,
    contextOptions: record.contextOptions,
    drawTimes: record.drawTimes,
  });
  const find = (selector) => {
    const host = document.querySelector(selector);
    const canvas = host?.querySelector("canvas");
    return { host, canvas, record: records.get(canvas) };
  };
  window.__aureformAppearanceQA = {
    events,
    storageEvents,
    records() { return [...records.values()].map(snapshot); },
    markExistingToasts() {
      existingToasts = new WeakSet(document.querySelectorAll("[data-sonner-toast]"));
    },
    freshToasts() {
      return [...document.querySelectorAll("[data-sonner-toast]")]
        .filter((toast) => !existingToasts.has(toast))
        .map((toast) => ({
          text: toast.textContent,
          type: toast.dataset.type,
          mounted: toast.dataset.mounted,
          visible: toast.dataset.visible,
          opacity: Number(getComputedStyle(toast).opacity),
        }));
    },
    shader(selector) {
      const { host, canvas, record } = find(selector);
      if (!host) return null;
      const style = getComputedStyle(host);
      const bounds = host.getBoundingClientRect();
      return {
        kind: host.dataset.shaderKind,
        state: host.dataset.shaderState,
        frame: Number(host.dataset.shaderFrame || 0),
        ready: canvas?.dataset.ready === "true",
        width: canvas?.width || 0,
        height: canvas?.height || 0,
        canvasId: record?.id || null,
        requests: record?.requests || 0,
        draws: record?.draws || 0,
        rafExecutions: record?.rafExecutions || 0,
        pendingRAF: [...pending.values()].filter((entry) =>
          entry.canvases.has(record),
        ).length,
        programsCreated: record?.programsCreated || 0,
        programsDeleted: record?.programsDeleted || 0,
        drawTimes: record?.drawTimes || [],
        contextOptions: record?.contextOptions || [],
        uniforms: record?.uniforms || {},
        cssWidth: canvas?.getBoundingClientRect().width || 0,
        cssHeight: canvas?.getBoundingClientRect().height || 0,
        dpr: devicePixelRatio,
        now: performance.now(),
        actualHostStyle: {
          visibility: style.visibility,
          opacity: style.opacity,
          contentVisibility: style.contentVisibility,
          display: style.display,
        },
        intersectionGeometry: { top: bounds.top, bottom: bounds.bottom, viewportHeight: innerHeight },
      };
    },
    loseContext(selector) {
      const { record } = find(selector);
      if (!record?.context) throw new Error("No live WebGL context to lose.");
      record.extension = record.context.getExtension("WEBGL_lose_context");
      if (!record.extension)
        throw new Error("WEBGL_lose_context is unavailable in this browser.");
      record.extension.loseContext();
    },
    restoreContext(selector) {
      const { record } = find(selector);
      if (!record?.extension) throw new Error("No lost context to restore.");
      record.extension.restoreContext();
    },
    setVisibility(next) {
      // A controlled visibility signal tests the real event listener and draw
      // teardown. It does not claim that the OS actually hid a headless tab.
      if (visibility === null) {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => visibility,
        });
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => visibility === "hidden",
        });
      }
      visibility = next;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    clearVisibility() {
      if (visibility !== null) {
        delete document.visibilityState;
        delete document.hidden;
        visibility = null;
        document.dispatchEvent(new Event("visibilitychange"));
      }
    },
  };
}

function serializeError(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
    stack: error?.stack,
  };
}

function compactObservation(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.drawTimes)) return value;
  return { ...value, drawTimes: { count: value.drawTimes.length, lastFive: value.drawTimes.slice(-5) } };
}

// The same stable predicate is sampled from Node in every context, including
// scripting-disabled pages and controlled hidden documents. There is no RAF
// callback dependency and no fixed settle sleep.
async function waitStable(description, sample, predicate, limit = waitLimit) {
  const started = Date.now();
  let consecutive = 0;
  let last;
  let previous;
  let observations = 0;
  while (Date.now() - started <= limit) {
    last = await sample();
    observations++;
    consecutive = predicate(last, previous) ? consecutive + 1 : 0;
    if (consecutive >= stableObservations)
      return {
        value: last,
        observations,
        stableObservations,
        elapsedMs: Date.now() - started,
      };
    previous = last;
    await new Promise((done) => setTimeout(done, pollInterval));
  }
  assert.fail(
    `${description} did not satisfy ${stableObservations} stable observations within ${limit}ms. Last observation: ${JSON.stringify(compactObservation(last))}`,
  );
}

function installPointerEvidence(element) {
  window.__aureformPointerEvidence?.stop();
  const identities = new WeakMap();
  let nextIdentity = 0;
  const identity = (node) => {
    if (!node || typeof node !== "object") return null;
    if (!identities.has(node)) identities.set(node, ++nextIdentity);
    return identities.get(node);
  };
  const originalIdentity = identity(element);
  const events = [];
  let lastPoint = null;
  const describe = (node) => node instanceof Element ? {
    identity: identity(node), tag: node.tagName, id: node.id,
    slot: node.getAttribute("data-slot"),
    text: node.textContent?.trim().slice(0, 80),
  } : { tag: Object.prototype.toString.call(node) };
  const geometry = (node) => {
    const rect = node.getBoundingClientRect();
    const point = { x: rect.left + rect.width * 0.3, y: rect.top + rect.height * 0.5 };
    const hit = document.elementFromPoint(point.x, point.y);
    const style = getComputedStyle(node);
    return {
      identity: identity(node), originalIdentity, originalConnected: element.isConnected,
      connected: node.isConnected,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
        width: rect.width, height: rect.height },
      viewport: { width: innerWidth, height: innerHeight },
      scroll: { x: scrollX, y: scrollY }, point,
      hit: describe(hit), hitIsTarget: Boolean(hit && node.contains(hit)),
      hovered: node.matches(":hover"), focused: node.contains(document.activeElement),
      pointer: node.getAttribute("data-afx-pointer"), motion: node.getAttribute("data-afx-motion"),
      transform: style.transform,
      variables: [style.getPropertyValue("--afx-magnetic-x").trim(), style.getPropertyValue("--afx-magnetic-y").trim()],
    };
  };
  const record = (source, event, detail) => {
    if (event && "clientX" in event)
      lastPoint = { x: event.clientX, y: event.clientY };
    events.push({
      source, type: event?.type || null, time: performance.now(),
      trusted: event?.isTrusted ?? null, pointerType: event?.pointerType || null,
      buttons: event?.buttons ?? null, point: lastPoint,
      target: event ? describe(event.target) : null,
      buttonIdentity: event?.target instanceof Element ? identity(event.target.closest("button")) : null,
      targetWithinButton: Boolean(event?.target instanceof Node && element.contains(event.target)),
      detail: detail || null,
      observed: geometry(element),
    });
    if (events.length > 192) events.shift();
  };
  const pointer = (event) => record("native-event", event);
  const reset = (event) => record("native-reset-signal", event);
  const pointerTypes = ["pointerenter", "pointermove", "pointerleave", "pointercancel", "pointerdown", "focusin", "focusout"];
  for (const type of pointerTypes)
    document.addEventListener(type, pointer, { passive: true, capture: true });
  for (const type of ["scroll", "resize"])
    window.addEventListener(type, reset, { passive: true, capture: true });
  const mutations = new MutationObserver((changes) => record("attribute-change", null,
    changes.map((change) => ({ target: describe(change.target), attribute: change.attributeName }))));
  mutations.observe(element, {
    attributes: true, attributeFilter: ["style", "class", "data-afx-pointer", "data-afx-motion", "disabled", "aria-disabled"],
  });
  const scope = element.closest("[data-motion-level]");
  if (scope && scope !== element)
    mutations.observe(scope, {
      attributes: true, attributeFilter: ["style", "class", "data-motion-level", "data-hover-effect"],
    });
  window.__aureformPointerEvidence = {
    geometry,
    mark: (phase, detail) => record("qa-phase", null, { phase, ...detail }),
    read: (current = element) => ({ geometry: geometry(current), lastPoint, events: events.slice() }),
    stop() {
      for (const type of pointerTypes) document.removeEventListener(type, pointer, true);
      for (const type of ["scroll", "resize"]) window.removeEventListener(type, reset, true);
      mutations.disconnect();
    },
  };
  record("qa-phase", null, { phase: "probe-installed" });
}

async function check(result, id, execute) {
  const entry = { id, status: "running", startedAt: new Date().toISOString() };
  result.checks.push(entry);
  try {
    entry.evidence = await execute();
    entry.status = "passed";
    return entry.evidence;
  } catch (error) {
    entry.status = "failed";
    entry.error = serializeError(error);
    result.errors.push({ check: id, ...entry.error });
    throw error;
  } finally {
    entry.completedAt = new Date().toISOString();
  }
}

function isNextScript(url, type, baseURL) {
  const parsed = new URL(url);
  return (
    type === "script" &&
    parsed.origin === new URL(baseURL).origin &&
    parsed.pathname.startsWith("/_next/")
  );
}

function observeErrors(page, result, { noJS = false, blocked = false } = {}) {
  page.on("pageerror", (error) =>
    result.runtimeErrors.push({ type: "pageerror", ...serializeError(error) }),
  );
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    result.runtimeErrors.push({
      type: "console",
      message: message.text(),
      location: message.location(),
    });
  });
  page.on("requestfailed", (request) => {
    const message = request.failure()?.errorText || "Request failed";
    if (
      (noJS || blocked) &&
      isNextScript(request.url(), request.resourceType(), result.baseURL) &&
      /^(csp|net::ERR_BLOCKED_BY_CLIENT)$/i.test(message)
    ) {
      result.intentionallyBlockedScripts.push({
        url: request.url(),
        reason: message,
      });
    } else if (!/net::ERR_ABORTED/.test(message)) {
      result.runtimeErrors.push({
        type: "requestfailed",
        url: request.url(),
        message,
      });
    }
  });
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      new URL(response.url()).origin === new URL(result.baseURL).origin
    )
      result.runtimeErrors.push({
        type: "http",
        url: response.url(),
        status: response.status(),
      });
  });
}

async function presentation(page) {
  return page.evaluate((selector) => {
    const root = document.documentElement;
    const heading = document.querySelector("h1");
    const scope = document.querySelector(selector);
    const gradient = scope?.querySelector(
      '[data-slot="gradient-background"] > .afx-background-field',
    );
    const visible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      for (let node = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (
          style.display === "none" ||
          style.visibility !== "visible" ||
          Number(style.opacity) < 0.99
        )
          return false;
      }
      return true;
    };
    return {
      language: root.lang,
      dark: root.classList.contains("dark"),
      palette: root.dataset.palette,
      colorScheme: getComputedStyle(root).colorScheme,
      viewport: { width: innerWidth, height: innerHeight },
      overflow: Math.max(root.scrollWidth, document.body.scrollWidth) - innerWidth,
      body: {
        color: getComputedStyle(document.body).color,
        background: getComputedStyle(document.body).backgroundColor,
      },
      heading: heading
        ? {
            text: heading.textContent.trim(),
            color: getComputedStyle(heading).color,
            fontFamily: getComputedStyle(heading).fontFamily,
            fontSize: getComputedStyle(heading).fontSize,
            visible: visible(heading),
          }
        : null,
      gradient: gradient
        ? {
            kind: gradient.parentElement.dataset.gradientKind,
            image: getComputedStyle(gradient).backgroundImage,
            opacity: Number(getComputedStyle(gradient).opacity),
          }
        : null,
      lenis: [...document.querySelectorAll('[class*="lenis"]')].map(
        (node) => node.className,
      ),
      motion: [...document.querySelectorAll("[data-motion-mode]")].map((node) => ({
        mode: node.dataset.motionMode,
        smoothScroll: node.dataset.smoothScroll,
      })),
      shaders: [...document.querySelectorAll('[data-slot="shader-background"]')].map(
        (node) => ({
          state: node.dataset.shaderState,
          frame: Number(node.dataset.shaderFrame || 0),
          canvasReady: node.querySelector("canvas")?.dataset.ready || null,
        }),
      ),
    };
  }, scopeSelector);
}

async function storedAppearance(page) {
  const text = await page.evaluate((key) => localStorage.getItem(key), profileKey);
  return text ? parseAppearance(text) : null;
}

async function assertApplied(page, config, { scope = true } = {}) {
  const expected = resolveAppearance(config);
  const observed = await page.evaluate(
    ({ selector, properties }) =>
      [document.documentElement, document.querySelector(selector)].map((node) =>
        node
          ? {
              dark: node.classList.contains("dark"),
              dataset: { ...node.dataset },
              colorScheme: getComputedStyle(node).colorScheme,
              variables: Object.fromEntries(
                properties.map((key) => [
                  key,
                  node.style.getPropertyValue(key).trim(),
                ]),
              ),
            }
          : null,
      ),
    { selector: scopeSelector, properties: Object.keys(expected) },
  );
  for (const node of scope ? observed : observed.slice(0, 1)) {
    assert(node, "The application must render its appearance scope.");
    assert.equal(node.dark, config.theme === "dark");
    assert.equal(node.colorScheme, config.theme);
    for (const [key, value] of [
      ["palette", config.palette],
      ["material", config.material],
      ["motionLevel", config.motion],
      ["hoverEffect", config.hover],
      ["density", config.density],
      ["typography", config.typography],
    ])
      assert.equal(node.dataset[key], value, key);
    for (const [key, value] of Object.entries(expected))
      assert.equal(node.variables[key], value, key);
  }
  return { config, root: observed[0], preview: scope ? observed[1] : undefined };
}

async function waitApplied(page, expected, options) {
  await waitStable(
    "The validated profile is applied",
    () => storedAppearance(page),
    (value) => JSON.stringify(value) === JSON.stringify(normalizeAppearance(expected)),
  );
  return assertApplied(page, normalizeAppearance(expected), options);
}

function labeledContainer(page, name) {
  return page.locator(`[aria-label=${JSON.stringify(name)}]`);
}

async function pane(page, locale, kind) {
  const bar = labeledContainer(
    page,
    label(locale, "Studio sections", "Secciones del estudio"),
  );
  if (!(await bar.isVisible())) return;
  const text = {
    editor: label(locale, "Editor", "Editor"),
    preview: label(locale, "Live preview", "Vista en vivo"),
    library: label(locale, "Save & export", "Guardar y exportar"),
  }[kind];
  await bar.getByRole("button", { name: text, exact: true }).click();
}

async function editor(page, locale, kind) {
  await pane(page, locale, "editor");
  const text = {
    colors: label(locale, "Colors", "Colores"),
    surfaces: label(locale, "Surfaces", "Superficies"),
    motion: label(locale, "Motion", "Movimiento"),
  }[kind];
  await labeledContainer(
    page,
    label(locale, "Editor sections", "Secciones del editor"),
  )
    .getByRole("button", { name: text, exact: true })
    .click();
}

async function choice(page, name, value) {
  const group = page.getByRole("group", { name, exact: true });
  const button = group.getByRole("button", { name: value, exact: true });
  await button.click();
  assert.equal(await button.getAttribute("aria-pressed"), "true");
}

async function choosePalette(page, locale, palette) {
  await editor(page, locale, "colors");
  await choice(
    page,
    label(locale, "Color palette", "Paleta de color"),
    label(locale, ...names[palette]),
  );
}

async function chooseTheme(page, locale, theme) {
  await editor(page, locale, "colors");
  await choice(
    page,
    label(locale, "Theme", "Tema"),
    theme === "dark"
      ? label(locale, "Dark", "Oscuro")
      : label(locale, "Light", "Claro"),
  );
}

async function chooseMotion(page, locale, motion) {
  await editor(page, locale, "motion");
  await choice(
    page,
    label(locale, "Motion", "Movimiento"),
    {
      off: label(locale, "Off", "Ninguno"),
      gentle: label(locale, "Gentle", "Suave"),
      expressive: label(locale, "Expressive", "Expresivo"),
    }[motion],
  );
}

async function range(page, name, value) {
  const slider = page.getByRole("slider", { name, exact: true });
  const bounds = await slider.evaluate((element) => ({
    min: Number(element.min),
    max: Number(element.max),
    step: Number(element.step),
  }));
  assert(value >= bounds.min && value <= bounds.max);
  const fromMinimum = Math.round((value - bounds.min) / bounds.step);
  const fromMaximum = Math.round((bounds.max - value) / bounds.step);
  await slider.focus();
  await slider.press(fromMinimum <= fromMaximum ? "Home" : "End");
  for (let i = 0; i < Math.min(fromMinimum, fromMaximum); i++)
    await slider.press(fromMinimum <= fromMaximum ? "ArrowRight" : "ArrowLeft");
  assert(Math.abs(Number(await slider.inputValue()) - value) < bounds.step / 2);
}

async function preview(page, locale, kind) {
  await pane(page, locale, "preview");
  await labeledContainer(
    page,
    label(locale, "Preview content", "Contenido de vista previa"),
  )
    .getByRole("button", {
      name: {
        product: label(locale, "Product", "Producto"),
        components: label(locale, "Components", "Componentes"),
        background: label(locale, "Background", "Fondo"),
      }[kind],
      exact: true,
    })
    .click();
}

async function go(page, spec, baseURL, path = "studio") {
  const response = await page.goto(`${baseURL}/${spec.locale}/${path}/`, {
    waitUntil: "load",
  });
  assert(response?.ok(), `${path} must return a successful document.`);
  await page.locator("h1").first().waitFor({ state: "visible" });
  await waitStable(
    "Fonts and visible server content",
    () =>
      page.evaluate(() => ({
        fonts: document.fonts.status,
        text: document.querySelector("h1")?.textContent?.trim(),
      })),
    (value) => value.fonts === "loaded" && Boolean(value.text),
  );
  if (spec.kind !== "no-js")
    await waitStable(
      "The appearance provider has applied its initial profile",
      () =>
        page.evaluate(() => ({
          primary: document.documentElement.style.getPropertyValue("--af-color-primary"),
          events: window.__aureformAppearanceQA?.events.length || 0,
        })),
      (value) => Boolean(value.primary) && value.events > 0,
    );
  const value = (await waitStable(
    "The studio entrance finishes with a visible heading",
    () => presentation(page),
    (view) => view.heading?.visible === true,
  )).value;
  assert.equal(value.language, spec.locale);
  assert(value.heading?.visible);
  if (path === "studio")
    assert.equal(
      value.heading.text,
      label(spec.locale, "Build your signature.", "Diseña tu identidad."),
    );
  return value;
}

async function shader(page) {
  return page.evaluate(
    (selector) => window.__aureformAppearanceQA.shader(selector),
    shaderSelector,
  );
}

async function runningShader(page, expectedKind) {
  await page.locator(shaderSelector).scrollIntoViewIfNeeded();
  const initial = await shader(page);
  return waitStable(
    "The shader draws on its real WebGL canvas",
    () => shader(page),
    (value, previous) =>
      value?.kind === expectedKind &&
      value.state === "running" &&
      value.ready &&
      value.draws > 0 &&
      (value.canvasId !== initial?.canvasId || value.draws > initial.draws) &&
      value.frame > 0 &&
      value.width > 0 &&
      value.height > 0 &&
      (!previous || value.draws >= previous.draws),
  );
}

async function stoppedShader(page, acceptedStates) {
  return waitStable(
    "The shader has no remaining draw or owned RAF loop",
    () => shader(page),
    (value, previous) =>
      value &&
      acceptedStates.includes(value.state) &&
      value.pendingRAF === 0 &&
      previous?.canvasId === value.canvasId &&
      previous.draws === value.draws &&
      previous.frame === value.frame &&
      previous.rafExecutions === value.rafExecutions,
  );
}

function independentRGB(color) {
  let values;
  if (Array.isArray(color)) values = color;
  else if (/^#[0-9a-f]{6}$/i.test(color))
    values = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  else {
    assert.match(color, /^rgba?\(/, `A real rendered RGB color is required: ${color}`);
    const channels = color.match(/[\d.]+/g).map(Number);
    assert(channels.length === 3 || (channels.length === 4 && channels[3] === 1),
      `Transparent color cannot approve contrast: ${color}`);
    values = channels.slice(0, 3);
  }
  assert(values.length === 3 && values.every((value) => Number.isFinite(value) && value >= 0 && value <= 255));
  return values;
}

function independentLuminance(color) {
  const linear = independentRGB(color).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function independentContrast(a, b) {
  const values = [independentLuminance(a), independentLuminance(b)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function gradientContrastEvidence(foreground, colors) {
  assert(colors.length >= 2);
  const text = independentLuminance(foreground);
  const ratios = [];
  const segments = [];
  for (let segment = 0; segment < colors.length - 1; segment++) {
    const start = independentRGB(colors[segment]);
    const end = independentRGB(colors[segment + 1]);
    const change = start.map((channel, index) => end[index] - channel);
    const at = (position) => start.map((channel, index) => channel + change[index] * position);
    for (let step = 0; step <= 100; step++) {
      ratios.push(independentContrast(foreground, at(step / 100)));
    }
    const derivative = (position) => at(position).reduce((sum, channel, index) => {
      const value = channel / 255;
      const slope = value <= 0.04045 ? 1 / 12.92
        : (2.4 / 1.055) * ((value + 0.055) / 1.055) ** 1.4;
      return sum + [0.2126, 0.7152, 0.0722][index] * slope * change[index] / 255;
    }, 0);
    let low = 0, high = 1;
    for (let iteration = 0; iteration < 64; iteration++) {
      const middle = (low + high) / 2;
      if (derivative(middle) < 0) low = middle;
      else high = middle;
    }
    const stationary = (low + high) / 2;
    const positions = [0, stationary, 1];
    for (let channel = 0; channel < 3; channel++) {
      const breakpoint = (0.04045 * 255 - start[channel]) / change[channel];
      if (breakpoint > 0 && breakpoint < 1) positions.push(breakpoint);
    }
    const luminances = positions.map((position) => independentLuminance(at(position)));
    const minimum = text >= Math.min(...luminances) && text <= Math.max(...luminances)
      ? 1 : Math.min(...positions.map((position) => independentContrast(foreground, at(position))));
    segments.push({ segment, stationary, minimum });
  }
  const sampledMinimum = Math.min(...ratios);
  const continuousMinimum = Math.min(...segments.map((segment) => segment.minimum));
  const minimum = Math.min(sampledMinimum, continuousMinimum);
  assert(minimum >= 4.5, `Continuous sRGB control gradient contrast: ${minimum.toFixed(8)}`);
  return { samples: ratios.length, minimum, sampledMinimum, continuousMinimum, segments,
    interpolation: "unrounded sRGB; 101 samples plus derivative bisection and transfer breakpoints per adjacent pair" };
}

async function contrastEvidence(page) {
  const colors = await page.locator(scopeSelector).evaluate((element) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(
      [
        "--foreground",
        "--muted-foreground",
        "--background",
        "--surface",
        "--surface-subtle",
        "--primary",
        "--primary-hover",
        "--primary-foreground",
        "--accent",
        "--accent-foreground",
        "--warning",
        "--warning-foreground",
        "--destructive",
        "--destructive-foreground",
        "--ring",
        "--chart-1",
        "--chart-2",
        "--chart-3",
        "--chart-4",
        "--chart-5",
        "--af-gradient-control",
        "--af-gradient-primary",
        "--af-control-color-1",
        "--af-control-color-2",
        "--af-control-color-3",
        "--af-control-color-4",
        "--af-color-primary",
      ].map((key) => [key, style.getPropertyValue(key).trim()]),
    );
  });
  const ratios = [];
  const expectRatio = (foreground, background, minimum) => {
    const ratio = independentContrast(colors[foreground], colors[background]);
    ratios.push({ foreground, background, minimum, ratio });
    assert(ratio >= minimum, `${foreground}/${background}: ${ratio.toFixed(3)}`);
  };
  for (const surface of ["--background", "--surface", "--surface-subtle"]) {
    expectRatio("--foreground", surface, 4.5);
    expectRatio("--muted-foreground", surface, 4.5);
  }
  for (const [foreground, background] of [
    ["--primary-foreground", "--primary"],
    ["--primary-foreground", "--primary-hover"],
    ["--accent-foreground", "--accent"],
    ["--warning-foreground", "--warning"],
    ["--destructive-foreground", "--destructive"],
  ])
    expectRatio(foreground, background, 4.5);
  for (const background of ["--background", "--surface", "--surface-subtle", "--accent"])
    expectRatio("--primary", background, 4.5);
  const config = await storedAppearance(page);
  const alpha = config.theme === "dark" ? 0.27 : 0.16;
  const channels = (color) => [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  const base = channels(colors["--surface"]);
  const brand = channels(colors["--af-color-primary"]);
  const backgroundRGB = base.map((channel, index) => channel * (1 - alpha) + brand[index] * alpha);
  const ratio = independentContrast(colors["--primary"], backgroundRGB);
  assert(ratio >= 4.5, `Actual primary on ${alpha * 100}% raw-brand tint: ${ratio}`);
  ratios.push({ foreground: "--primary", background: "unrounded raw-brand tint over surface", backgroundRGB, alpha, minimum: 4.5, ratio });
  for (const key of ["--ring", "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"])
    expectRatio(key, "--surface", 3);
  assert.match(colors["--af-gradient-control"], /^linear-gradient\([^,]+deg in srgb,/,
    "The real scoped control gradient must explicitly choose the audited sRGB space.");
  assert.equal(colors["--af-gradient-primary"], colors["--af-gradient-control"]);
  const gradientColors = colors["--af-gradient-control"].match(/#[\da-f]{6}/gi);
  assert.equal(gradientColors?.length, config.gradient.stops.length);
  for (let index = 1; index <= 4; index++)
    assert.equal(colors[`--af-control-color-${index}`], gradientColors[Math.min(index - 1, gradientColors.length - 1)]);
  for (const color of gradientColors) {
    const ratio = independentContrast(colors["--primary-foreground"], color);
    assert(ratio >= 4.5);
    ratios.push({ foreground: "--primary-foreground", background: color, minimum: 4.5, ratio });
  }
  return {
    colors, ratios,
    gradient: gradientContrastEvidence(colors["--primary-foreground"], gradientColors),
    minimumTextRatio: Math.min(...ratios.filter((entry) => entry.minimum === 4.5).map((entry) => entry.ratio)),
  };
}

async function renderedControlContrast(page, locale) {
  await preview(page, locale, "components");
  const evidence = [];
  for (const [appearance, en, es] of [
    ["solid", "Solid", "Sólido"], ["gradient", "Gradient", "Degradado"],
  ]) {
    const button = page.locator(scopeSelector).getByRole("button", {
      name: label(locale, en, es), exact: true,
    });
    await page.mouse.move(0, 0);
    const read = () => button.evaluate((element) => {
      const style = getComputedStyle(element);
      const gradientToken = style.getPropertyValue("--af-gradient-control").trim();
      // Native CSSOM can omit a default interpolation space in serialization.
      // Compare the actual image with the browser's computed form of the
      // explicit sRGB declaration; this does not replace the rendered button.
      const reference = document.createElement("span");
      reference.style.display = "none";
      reference.style.backgroundImage = gradientToken;
      document.body.appendChild(reference);
      const serializedGradient = getComputedStyle(reference).backgroundImage;
      reference.remove();
      return { text: style.color, background: style.backgroundColor, image: style.backgroundImage,
        gradientToken, serializedGradient,
        supportsExplicitSRGB: CSS.supports("background-image", "linear-gradient(0deg in srgb, #000000, #FFFFFF)") };
    });
    const before = (await waitStable("The rendered button settles", read,
      (value, previous) => JSON.stringify(value) === JSON.stringify(previous))).value;
    await button.hover();
    const hover = (await waitStable("The rendered hover colors settle", read,
      (value, previous) => JSON.stringify(value) === JSON.stringify(previous))).value;
    for (const [state, colors] of [["rest", before], ["hover", hover]]) {
      const solidRatio = independentContrast(colors.text, colors.background);
      assert(solidRatio >= 4.5, `${appearance}/${state} button contrast ${solidRatio}`);
      assert(colors.supportsExplicitSRGB, "The production browser must support explicit sRGB interpolation.");
      assert.match(colors.gradientToken, /^linear-gradient\([^,]+deg in srgb,/);
      const gradientColors = colors.image.match(/rgba?\([^)]*\)/g) || [];
      if (appearance === "gradient") assert(gradientColors.length >= 2);
      if (gradientColors.length)
        assert.equal(colors.image, colors.serializedGradient,
          "The actual control must render the explicit sRGB gradient, using native CSSOM serialization.");
      const gradient = gradientColors.length ? gradientContrastEvidence(colors.text, gradientColors) : null;
      evidence.push({ appearance, state, colors, solidRatio, gradient });
    }
  }
  await page.mouse.move(0, 0);
  await preview(page, locale, "product");
  return evidence;
}

async function keyboardPreview(page, locale) {
  await preview(page, locale, "product");
  const scope = page.locator(scopeSelector);
  const input = scope.getByRole("textbox", {
    name: label(locale, "Try your next interaction", "Prueba tu próxima interacción"),
    exact: true,
  });
  await input.focus();
  const focused = await input.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      active: document.activeElement === element,
      focusVisible: element.matches(":focus-visible"),
      outline: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0,
      shadow: style.boxShadow,
      opacity: Number(style.opacity),
      visible: rect.width > 0 && rect.height > 0,
    };
  });
  assert(focused.active && focused.focusVisible && focused.visible && focused.opacity >= 0.99);
  assert(focused.outline || focused.shadow !== "none", "Keyboard focus needs a visible indicator.");
  await input.fill("qa@example.test");
  await input.press("Tab");
  const submit = scope.getByRole("button", {
    name: label(locale, "Try the preview", "Probar vista previa"),
    exact: true,
  });
  assert(await submit.evaluate((element) => document.activeElement === element));
  await submit.press("Enter");
  await scope.getByRole("status").filter({
    hasText: label(locale, "Preview submitted. Looking good.", "Vista previa enviada. Se ve bien."),
  }).waitFor({ state: "visible" });
  return { focused, keyboardSubmission: true };
}

const sourcePaths = [
  "package.json", "src/lib/appearance.ts", "src/components/appearance-provider.tsx",
  "src/components/templates/appearance-studio.tsx", "src/components/effects/shader-background.tsx",
  "src/components/effects/shader-runtime.ts", "src/components/effects/effect-motion.ts",
  "src/components/effects/effect-utils.ts", "src/components/effects/shaders.ts",
  "src/components/effects/effects.css", "src/components/effects/spotlight-card.tsx",
  "src/components/effects/tilt-card.tsx", "src/components/effects/glow-border.tsx",
  "src/components/effects/magnetic-button.tsx", "src/components/ui/button.tsx",
  "src/components/ui/card.tsx", "src/components/document-layout.tsx", "src/styles/tokens.css",
  "src/styles/effects.css", "tests/appearance.spec.ts",
  "scripts/verify-appearance.mjs", "scripts/verify-component-examples.cjs",
];
async function sourceFingerprints() {
  return Promise.all(sourcePaths.map(async (path) => ({
      path,
      sha256: createHash("sha256").update(await readFile(resolve(projectRoot, path))).digest("hex"),
    })));
}

export async function createAppearanceReport(baseURL = appearanceBaseURL, runner = "standalone") {
  return {
    status: "running",
    runID: appearanceRunID,
    targetVersion: "1.1.0",
    packageVersion: JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version,
    browserRuntimeTested: false,
    releaseVerified: false,
    startedAt: new Date().toISOString(),
    completedAt: null,
    runner,
    baseURL,
    sourceRoot: projectRoot,
    sourceFingerprints: await sourceFingerprints(),
    executablePath: executablePath || "Playwright-managed Chromium",
    swiftShaderRequested: process.env.AUREFORM_QA_SWIFTSHADER === "1",
    plannedCases: appearanceCases.map((spec) => spec.id),
    fullMatrixCases: allAppearanceCases.map((spec) => spec.id),
    limits: { predicateMs: waitLimit, navigationMs: navigationLimit, stableObservations, pollIntervalMs: pollInterval },
    scenarios: [],
    errors: [],
  };
}

export async function writeAppearanceReport(report) {
  await mkdir(dirname(appearanceReportPath), { recursive: true });
  await writeFile(appearanceReportPath, JSON.stringify(report, null, 2) + "\n");
}

export function finishAppearanceReport(report) {
  report.errors = report.errors.filter((entry) => entry.check !== "suite-completeness");
  const missing = report.plannedCases.filter(
    (id) => !report.scenarios.some((scenario) => scenario.id === id),
  );
  const duplicate = report.scenarios.filter(
    (scenario, index) => report.scenarios.findIndex((entry) => entry.id === scenario.id) !== index,
  );
  const unexpected = report.scenarios.filter((scenario) => !report.plannedCases.includes(scenario.id));
  if (missing.length || duplicate.length || unexpected.length)
    report.errors.push({ check: "suite-completeness", message: "Every planned case must run exactly once.",
      missing, duplicate: duplicate.map((scenario) => scenario.id), unexpected: unexpected.map((scenario) => scenario.id) });
  const checks = report.scenarios.flatMap((scenario) => scenario.checks);
  report.completedAt = new Date().toISOString();
  report.status = !report.errors.length && report.scenarios.every((scenario) => scenario.status === "passed") ? "passed" : "failed";
  report.summary = {
    plannedScenarios: report.plannedCases.length,
    scenarios: report.scenarios.length,
    passedScenarios: report.scenarios.filter((scenario) => scenario.status === "passed").length,
    failedScenarios: report.scenarios.filter((scenario) => scenario.status !== "passed").length,
    checks: checks.length,
    passedChecks: checks.filter((entry) => entry.status === "passed").length,
    failedChecks: checks.filter((entry) => entry.status !== "passed").length,
    errors: report.errors.length + report.scenarios.reduce((count, scenario) => count + scenario.errors.length, 0),
  };
  report.browserRuntimeTested = report.scenarios.some((scenario) => scenario.runtimeTested);
  const completeMatrix = allAppearanceCases.map((spec) => spec.id);
  report.fullMatrixComplete = completeMatrix.every((id) =>
    report.scenarios.filter((scenario) => scenario.id === id).length === 1);
  report.releaseVerified = report.status === "passed" && report.sourceIntegrity?.unchanged === true &&
    report.fullMatrixComplete && report.scenarios.every((scenario) => scenario.runtimeTested === true);
  return report;
}

export async function loadAppearanceReport(baseURL = appearanceBaseURL, runner = "playwright") {
  try {
    const report = JSON.parse(await readFile(appearanceReportPath, "utf8"));
    if (report.runID === appearanceRunID) return report;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return createAppearanceReport(baseURL, runner);
}

export async function verifyAppearanceSourceIntegrity(report) {
  const after = await sourceFingerprints();
  report.sourceIntegrity = {
    unchanged: JSON.stringify(after) === JSON.stringify(report.sourceFingerprints),
    completedFingerprints: after,
  };
  if (!report.sourceIntegrity.unchanged)
    report.errors.push({ check: "source-integrity", message: "Sources changed during this browser run; rerun before accepting results." });
}

function configuredProfile() {
  return normalizeAppearance({
    ...createAppearance("mint", "light"),
    colors: { primary: "#D946EF", secondary: "#06B6D4", tertiary: "#F59E0B" },
    material: "glass",
    radius: 7,
    density: "compact",
    typography: "editorial",
    motion: "gentle",
    hover: "magnetic",
    shadow: 0.27,
    border: 0.83,
    gradient: {
      kind: "linear",
      angle: 231,
      intensity: 0.34,
      stops: [
        { color: "#123456", position: 0 },
        { color: "#56789A", position: 0.4 },
        { color: "#ABCDEF", position: 1 },
      ],
    },
    shader: { kind: "waves", speed: 0.17, scale: 2.75, intensity: 0.41, paused: true },
  });
}

async function importProfile(page, locale, config, file = false) {
  await page.getByRole("button", {
    name: label(locale, "Import", "Importar"), exact: true,
  }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  const text = serializeAppearance(config);
  if (file) {
    await dialog.getByLabel(label(locale, "Appearance JSON file", "Archivo JSON de apariencia"), { exact: true }).setInputFiles({
      name: "profile.json", mimeType: "application/json", buffer: Buffer.from(text),
    });
    await dialog.getByRole("status").waitFor({ state: "visible" });
  } else {
    await dialog.getByRole("textbox", {
      name: label(locale, "Or paste JSON", "O pega el JSON"), exact: true,
    }).fill(text);
  }
  await dialog.getByRole("button", {
    name: label(locale, "Import appearance", "Importar apariencia"), exact: true,
  }).click();
  await dialog.waitFor({ state: "hidden" });
  return waitApplied(page, config);
}

async function clickRoute(page, locale, path) {
  const link = page.locator(`a[href="/${locale}/${path}/"]`).filter({ visible: true }).first();
  await link.click();
  await page.waitForURL(`**/${locale}/${path}/`);
  await page.locator("h1").first().waitFor({ state: "visible" });
  assert.equal((await presentation(page)).language, locale);
}

async function paletteCase(page, spec, result) {
  const { locale, palette, theme } = spec;
  const config = createAppearance(palette, theme);
  config.motion = "off";
  await check(result, "palette-theme-update-real-root-and-preview-styles", async () => {
    await chooseMotion(page, locale, "off");
    await choosePalette(page, locale, palette);
    await chooseTheme(page, locale, theme);
    await editor(page, locale, "colors");
    const applied = await waitApplied(page, config);
    const view = await presentation(page);
    assert(view.gradient?.image && view.gradient.image !== "none");
    return { applied, view, appearanceEvents: await page.evaluate(() => window.__aureformAppearanceQA.events.length) };
  });
  await check(result, "independent-contrast-for-applied-semantic-colors-and-safe-stops", () => contrastEvidence(page));
  await check(result, "actual-solid-and-gradient-buttons-rest-hover-and-interpolation-contrast", () => renderedControlContrast(page, locale));
  await check(result, "theme-updates-surface-and-hero-gradient-tokens", async () => {
    const before = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      gradient: getComputedStyle(document.documentElement).getPropertyValue("--af-gradient-hero").trim(),
    }));
    config.theme = theme === "dark" ? "light" : "dark";
    await chooseTheme(page, locale, config.theme);
    await waitApplied(page, config);
    const after = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      gradient: getComputedStyle(document.documentElement).getPropertyValue("--af-gradient-hero").trim(),
    }));
    assert.notEqual(before.background, after.background);
    assert.notEqual(before.gradient, after.gradient);
    config.theme = theme;
    await chooseTheme(page, locale, theme);
    await waitApplied(page, config);
    return { before, after, restoredTheme: theme };
  });
  await check(result, "keyboard-focus-and-functional-preview-form", () => keyboardPreview(page, locale));
}

async function cardStyle(page) {
  return page.locator(`${scopeSelector} [data-slot="card"][data-appearance]`).last().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      material: element.dataset.appearance,
      radius: style.borderRadius,
      background: style.backgroundColor,
      image: style.backgroundImage,
      blur: style.backdropFilter,
      webkitBlur: style.getPropertyValue("-webkit-backdrop-filter"),
      blurVariable: style.getPropertyValue("--af-card-blur").trim(),
      supportsStandardBlur: CSS.supports("backdrop-filter", "blur(18px)"),
      supportsWebkitBlur: CSS.supports("-webkit-backdrop-filter", "blur(18px)"),
      classes: element.className,
      shadow: style.boxShadow,
      border: style.borderColor,
    };
  });
}

async function controlsCase(page, spec, result) {
  const { locale } = spec;
  let config = createAppearance();
  config.motion = "off";
  await chooseMotion(page, locale, "off");
  await waitApplied(page, config);
  await check(result, "color-controls-validate-and-normalize-without-overwriting-valid-profile", async () => {
    await editor(page, locale, "colors");
    const primary = page.getByRole("textbox", { name: label(locale, "Primary", "Principal"), exact: true });
    await primary.fill("invalid");
    await primary.press("Tab");
    assert.equal(await primary.getAttribute("aria-invalid"), "true");
    await waitApplied(page, config);
    await primary.fill("#abc");
    await primary.press("Tab");
    config.colors.primary = "#AABBCC";
    await waitApplied(page, config);
    for (const [key, en, es, color] of [
      ["primary", "Primary", "Principal", "#D946EF"],
      ["secondary", "Secondary", "Secundario", "#06B6D4"],
      ["tertiary", "Tertiary", "Terciario", "#F59E0B"],
    ]) {
      await page.getByRole("textbox", { name: label(locale, en, es), exact: true }).fill(color);
      config.colors[key] = color;
      await waitApplied(page, config);
    }
    return { colors: config.colors, invalidRejected: true, shortHexNormalized: true };
  });
  await check(result, "gradient-controls-change-rendered-kind-angle-opacity-and-stops", async () => {
    const field = page.locator(`${scopeSelector} [data-slot="gradient-background"] > .afx-background-field`).first();
    const images = {};
    for (const [kind, en, es] of [
      ["linear", "Linear", "Lineal"], ["radial", "Radial", "Radial"], ["mesh", "Mesh", "Malla"],
    ]) {
      await choice(page, label(locale, "Gradient type", "Tipo de degradado"), label(locale, en, es));
      config.gradient.kind = kind;
      await waitApplied(page, config);
      images[kind] = await field.evaluate((element) => getComputedStyle(element).backgroundImage);
    }
    assert.equal(new Set(Object.values(images)).size, 3);
    await choice(page, label(locale, "Gradient type", "Tipo de degradado"), label(locale, "Linear", "Lineal"));
    config.gradient.kind = "linear";
    await range(page, label(locale, "Angle", "Ángulo"), 231);
    config.gradient.angle = 231;
    await range(page, label(locale, "Gradient intensity", "Intensidad del degradado"), 0.34);
    config.gradient.intensity = 0.34;
    await page.getByRole("textbox", { name: label(locale, "Stop 1 color", "Color de parada 1"), exact: true }).fill("#102030");
    config.gradient.stops[0].color = "#102030";
    await waitApplied(page, config);
    assert((await field.evaluate((element) => getComputedStyle(element).backgroundImage)).includes("231deg"));
    assert(Math.abs(await field.evaluate((element) => Number(getComputedStyle(element).opacity)) - 0.34) < 0.001);
    const add = page.getByRole("button", { name: new RegExp(`^${label(locale, "Add color stop", "Añadir parada de color")}`) });
    const originalStops = structuredClone(config.gradient.stops);
    await add.click();
    const expanded = await storedAppearance(page);
    assert.equal(expanded.gradient.stops.length, 4);
    assert.deepEqual({ ...expanded, gradient: { ...expanded.gradient, stops: originalStops } }, config,
      "Adding a stop must preserve every other appearance setting.");
    const addedStops = [];
    let preserved = 0;
    for (const stop of expanded.gradient.stops) {
      if (isDeepStrictEqual(stop, originalStops[preserved])) preserved++;
      else addedStops.push(stop);
    }
    assert.equal(preserved, originalStops.length, "All original stops remain in order.");
    assert.equal(addedStops.length, 1);
    assert.equal(addedStops[0].color, config.colors.tertiary);
    const largestGap = Math.max(...originalStops.slice(1).map((stop, index) => stop.position - originalStops[index].position));
    assert(originalStops.slice(1).some((stop, index) =>
      Math.abs(stop.position - originalStops[index].position - largestGap) < 1e-9 &&
      Math.abs(addedStops[0].position - (stop.position + originalStops[index].position) / 2) < 1e-9),
    "A new stop must lie at the midpoint of an existing widest gap.");
    config = expanded;
    await waitApplied(page, config);
    assert(await add.isDisabled());
    const fourStops = { config: structuredClone(config), contrast: await contrastEvidence(page),
      controls: await renderedControlContrast(page, locale) };
    for (let removal = 0; removal < 2; removal++) {
      const expected = structuredClone(config);
      expected.gradient.stops.splice(1, 1);
      await page.getByRole("button", { name: label(locale, "Remove stop 2", "Eliminar parada 2"), exact: true }).click();
      await waitApplied(page, expected);
      config = expected;
    }
    assert.equal(config.gradient.stops.length, 2);
    assert(await page.getByRole("button", { name: label(locale, "Remove stop 1", "Eliminar parada 1"), exact: true }).isDisabled());
    await range(page, label(locale, "Stop 2 position", "Posición de parada 2"), 0.75);
    config.gradient.stops[1].position = 0.75;
    await waitApplied(page, config);
    const twoStops = { config: structuredClone(config), contrast: await contrastEvidence(page),
      controls: await renderedControlContrast(page, locale) };
    return { images, applied: await waitApplied(page, config), stopBounds: [2, 4],
      addedStop: addedStops[0], widestGap: largestGap, fourStops, twoStops };
  });
  try {
    await check(result, "materials-radius-density-typography-shadows-and-borders-change-real-css", async () => {
    await editor(page, locale, "surfaces");
    const materials = {};
    for (const [material, en, es] of [
      ["flat", "Flat", "Plano"], ["elevated", "Elevated", "Elevado"], ["glass", "Glass", "Cristal"], ["gradient", "Gradient", "Degradado"],
    ]) {
      await choice(page, label(locale, "Surface material", "Material de superficie"), label(locale, en, es));
      config.material = material;
      await waitApplied(page, config);
      materials[material] = await cardStyle(page);
      assert.equal(materials[material].material, material);
    }
    result.checks.at(-1).partialEvidence = { materials };
    const before = await cardStyle(page);
    await range(page, label(locale, "Corner radius", "Radio de las esquinas"), 7);
    config.radius = 7;
    await range(page, label(locale, "Shadow", "Sombra"), 0.27);
    config.shadow = 0.27;
    await range(page, label(locale, "Border", "Borde"), 0.83);
    config.border = 0.83;
    await choice(page, label(locale, "Density", "Densidad"), label(locale, "Compact", "Compacta"));
    config.density = "compact";
    const heading = page.locator(scopeSelector).getByRole("heading", {
      name: label(locale, "Your next big thing.", "Tu próxima gran idea."), exact: true,
    });
    const fontBefore = await heading.evaluate((element) => getComputedStyle(element).fontFamily);
    await choice(page, label(locale, "Typography", "Tipografía"), "Editorial");
    config.typography = "editorial";
    await waitApplied(page, config);
    const after = await cardStyle(page);
    const fontAfter = await heading.evaluate((element) => getComputedStyle(element).fontFamily);
    assert.equal(after.radius, "7px");
    assert.notEqual(before.shadow, after.shadow);
    assert.notEqual(before.border, after.border);
    assert.notEqual(fontBefore, fontAfter);
    const inputHeight = await page.locator(`${scopeSelector} #appearance-preview-email`).evaluate((element) => getComputedStyle(element).height);
    result.checks.at(-1).partialEvidence = { materials, before, after, fontBefore, fontAfter, inputHeight };
    assert.equal(inputHeight, "36px");
    assert.notEqual(materials.flat.shadow, materials.elevated.shadow);
    assert(materials.glass.blur.includes("blur("), JSON.stringify(materials.glass));
    assert.notEqual(materials.gradient.image, "none");
    return { materials, before, after, fontBefore, fontAfter, inputHeight };
    });
  } catch {
    // Preserve the failed CSS check while continuing independent interactions.
    config = await storedAppearance(page);
  }
  await chooseMotion(page, locale, "gentle");
  config.motion = "gentle";
  await choice(page, "Shader", label(locale, "None", "Ninguno"));
  config.shader.kind = "none";
  for (const [hover, en, es] of [
      ["none", "None", "Ninguno"], ["lift", "Lift", "Elevación"], ["glow", "Glow", "Brillo"],
      ["spotlight", "Spotlight", "Foco"], ["tilt", "Tilt", "Inclinación"], ["magnetic", "Magnetic", "Magnético"],
  ]) {
    try {
      await check(result, `real-${hover}-pointer-and-keyboard-interaction`, async () => {
      await editor(page, locale, "motion");
      await choice(page, label(locale, "Hover effect", "Efecto al pasar el cursor"), label(locale, en, es));
      config.hover = hover;
      await waitApplied(page, config);
      await preview(page, locale, "components");
      const heading = page.locator(scopeSelector).getByRole("heading", {
        name: label(locale, "Feel the interaction", "Siente la interacción"), exact: true,
      });
      const card = heading.locator('xpath=ancestor::*[@data-slot="card"][1]');
      const action = card.getByRole("button", { name: label(locale, "Try me", "Pruébame"), exact: true });
      await page.mouse.move(0, 0);
      await card.scrollIntoViewIfNeeded();
      await card.hover({ position: { x: 25, y: 25 } });
      const readPointer = () =>
        card.evaluate((element) => {
          const effect = element.closest("[data-afx-pointer], .afx-glow-border") || element;
          const action = element.querySelector("button");
          const border = getComputedStyle(effect, "::before");
          return {
            pointer: effect.getAttribute("data-afx-pointer"),
            motion: effect.getAttribute("data-afx-motion"),
            transform: getComputedStyle(effect).transform,
            cardTransform: getComputedStyle(element).transform,
            liftToken: getComputedStyle(element).getPropertyValue("--af-motion-lift").trim(),
            cardMatrix: [...new DOMMatrixReadOnly(getComputedStyle(element).transform).toFloat64Array()],
            actionTransform: action ? getComputedStyle(action).transform : "none",
            glow: effect.classList.contains("afx-glow-border"),
            animation: border.animationPlayState,
            animationName: border.animationName,
            animationDuration: border.animationDuration,
            orbit: border.getPropertyValue("--afx-orbit").trim(),
            borderImage: border.backgroundImage,
            borderOpacity: Number(border.opacity),
          };
        });
      const response = await waitStable(`The ${hover} effect responds to the pointer`, readPointer, (value) => {
          if (hover === "none") return value.cardTransform === "none";
          if (hover === "lift") {
            const matrix = value.cardMatrix;
            return value.liftToken === "-2px" && Math.abs(matrix[13] + 2) < 0.06 &&
              Math.abs(matrix[12]) < 0.01 && matrix[0] === 1 && matrix[5] === 1;
          }
          if (hover === "glow") return value.glow && value.motion === "running" &&
            value.animation === "running" && value.animationName === "afx-border-orbit" &&
            Number.parseFloat(value.animationDuration) > 0 && value.borderOpacity > 0 &&
            value.borderImage.includes("conic-gradient(");
          if (hover === "magnetic") return true; // Its own button receives the pointer below.
          return value.pointer === "active" && (hover !== "tilt" || value.transform !== "none");
        });
      let glowAnimation, magneticPointer;
      if (hover === "glow") {
        const initialOrbit = Number.parseFloat(response.value.orbit);
        assert(Number.isFinite(initialOrbit), "The real glow border exposes its animated orbit angle.");
        const advanced = await waitStable("The actual glow border angle advances", readPointer,
          (value) => value.motion === "running" && value.animationName === "afx-border-orbit" &&
            value.animation === "running" && Number.isFinite(Number.parseFloat(value.orbit)) &&
            Math.abs(Number.parseFloat(value.orbit) - initialOrbit) >= 0.5);
        glowAnimation = { initialOrbit: response.value.orbit, advancedOrbit: advanced.value.orbit,
          observations: advanced.observations, elapsedMs: advanced.elapsedMs };
      }
      if (hover === "magnetic") {
        await action.evaluate(installPointerEvidence);
        const readMagnetic = () => action.evaluate((element) => {
          const style = getComputedStyle(element);
          const matrix = new DOMMatrixReadOnly(style.transform);
          const scope = element.closest("[data-motion-level]") || document.documentElement;
          return {
            x: matrix.m41, y: matrix.m42, transform: style.transform, translate: style.translate,
            magneticX: style.getPropertyValue("--afx-magnetic-x").trim(),
            magneticY: style.getPropertyValue("--afx-magnetic-y").trim(),
            classes: element.className, focused: element.contains(document.activeElement),
            focusWithin: element.matches(":focus-within"),
            activeElement: document.activeElement instanceof HTMLElement
              ? { tag: document.activeElement.tagName, id: document.activeElement.id,
                text: document.activeElement.textContent?.trim().slice(0, 100) } : null,
            pointer: element.getAttribute("data-afx-pointer"), motion: element.getAttribute("data-afx-motion"),
            motionLevel: scope.getAttribute("data-motion-level"),
            finePointer: matchMedia("(hover: hover) and (pointer: fine)").matches,
            reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            disabled: element.matches(":disabled, [data-disabled], [aria-disabled='true']"),
            geometry: window.__aureformPointerEvidence.geometry(element),
          };
        });
        const beforePointer = await readMagnetic();
        // The source deliberately suppresses pointer displacement while a
        // control has keyboard focus. Establish an unfocused pointer phase;
        // the following keyboard phase still requires displacement to stop.
        await action.evaluate((element) => {
          if (element.contains(document.activeElement) && document.activeElement instanceof HTMLElement)
            document.activeElement.blur();
        });
        // Scrolling resets the real pointer hook. Leave the target, finish its
        // scroll/layout changes, then enter it through measured native input.
        await page.mouse.move(0, 0);
        await action.scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready);
        const ready = await waitStable("The unfocused magnetic effect is active",
          readMagnetic, (value, previous) => !value.focused && !value.focusWithin && value.motion === "running" &&
            value.motionLevel === "gentle" && value.finePointer && !value.reducedMotion && !value.disabled &&
            value.geometry.connected && value.geometry.hitIsTarget &&
            value.geometry.point.x > 0 && value.geometry.point.x < value.geometry.viewport.width &&
            value.geometry.point.y > 0 && value.geometry.point.y < value.geometry.viewport.height &&
            previous?.geometry.identity === value.geometry.identity &&
            ["left", "top", "width", "height"].every((key) =>
              Math.abs(value.geometry.rect[key] - previous.geometry.rect[key]) < 0.1) &&
            ["x", "y"].every((key) =>
              Math.abs(value.geometry.scroll[key] - previous.geometry.scroll[key]) < 0.1));
        result.checks.at(-1).partialEvidence = { beforePointer, pointerReady: ready.value };
        const plannedPoint = ready.value.geometry.point;
        result.checks.at(-1).partialEvidence.plannedPointer = plannedPoint;
        await page.evaluate((point) => window.__aureformPointerEvidence.mark("native-mouse-entry", { point }), plannedPoint);
        await page.mouse.move(plannedPoint.x, plannedPoint.y, { steps: 4 });
        const movement = await waitStable("The magnetic button moves", async () => {
          const value = await readMagnetic();
          result.checks.at(-1).partialEvidence.lastPointerObservation = value;
          return value;
        }, (value) => !value.focused && !value.focusWithin && value.pointer === "active" &&
          (Math.abs(Number.parseFloat(value.magneticX)) > 0.1 || Math.abs(Number.parseFloat(value.magneticY)) > 0.1) &&
          (Math.abs(value.x) > 0.1 || Math.abs(value.y) > 0.1));
        result.checks.at(-1).partialEvidence.pointerMovement = movement.value;
        const timeline = await action.evaluate((element) => window.__aureformPointerEvidence.read(element));
        assert(timeline.events.some((event) => event.source === "native-event" && event.trusted &&
          event.type === "pointermove" && event.buttonIdentity === timeline.geometry.identity),
        "Native pointer movement must reach the actual magnetic button.");
        magneticPointer = { ready, plannedPoint, movement, timeline };
      }
      await action.focus();
      await action.press("Tab");
      await page.keyboard.press("Shift+Tab");
      assert(await action.evaluate((element) => document.activeElement === element && element.matches(":focus-visible")));
      if (["tilt", "magnetic"].includes(hover))
        await waitStable("Focused controls stop pointer displacement", () => card.evaluate((element) => {
          const effect = element.closest(".afx-tilt") || element.querySelector(".afx-magnetic-button");
          const matrix = new DOMMatrixReadOnly(getComputedStyle(effect).transform);
          return { x: matrix.m41, y: matrix.m42, rotation: [matrix.m12, matrix.m13, matrix.m21, matrix.m23, matrix.m31, matrix.m32] };
        }), (value) => Math.abs(value.x) < 0.01 && Math.abs(value.y) < 0.01 && value.rotation.every((entry) => Math.abs(entry) < 0.001));
      await page.evaluate(() => window.__aureformAppearanceQA.markExistingToasts());
      await action.press("Enter");
      const message = label(locale, "A little detail makes a difference.", "Un pequeño detalle marca la diferencia.");
      const toasts = (await waitStable("Enter creates a new visible success toast",
        () => page.evaluate(() => window.__aureformAppearanceQA.freshToasts()),
        (values) => values.some((toast) => toast.text.includes(message) && toast.type === "success" &&
          toast.mounted === "true" && toast.visible === "true" && toast.opacity >= 0.99))).value;
      return { hover, pointer: response.value, glowAnimation, magneticPointer, keyboardActivation: true, newSuccessToasts: toasts };
      });
    } catch {
      // Keep testing the other independent hover choices; this failure remains
      // in the scenario and makes the suite fail.
    } finally {
      if (hover === "magnetic") {
        const timeline = await page.evaluate(() => {
          const probe = window.__aureformPointerEvidence;
          if (!probe) return null;
          const observed = probe.read();
          probe.stop();
          return observed;
        });
        const entry = result.checks.at(-1);
        entry.partialEvidence = { ...entry.partialEvidence, pointerEventTimeline: timeline };
      }
    }
  }
  await preview(page, locale, "product");
  await chooseMotion(page, locale, "off");
  config.motion = "off";
  await waitApplied(page, config);
}

async function storedPresets(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "[]"), presetsKey);
}

async function waitPresets(page, predicate) {
  return (await waitStable("Saved preset snapshots are persisted", () => storedPresets(page), predicate)).value;
}

async function presetAction(page, locale, action, name) {
  await pane(page, locale, "library");
  const verbs = {
    apply: ["Apply", "Aplicar"], duplicate: ["Duplicate", "Duplicar"], delete: ["Delete", "Eliminar"],
  };
  await page.getByRole("button", {
    name: `${label(locale, ...verbs[action])} ${name}`, exact: true,
  }).click();
}

async function savePreset(page, locale, name) {
  await pane(page, locale, "library");
  await page.getByRole("textbox", {
    name: label(locale, "Preset name", "Nombre del ajuste"), exact: true,
  }).fill(name);
  await page.getByRole("button", {
    name: label(locale, "Save preset", "Guardar ajuste"), exact: true,
  }).click();
}

async function persistenceCase(page, spec, result) {
  const { locale } = spec;
  const original = configuredProfile();
  const alternative = normalizeAppearance({
    ...createAppearance("ember", "dark"), radius: 24, density: "comfortable",
    motion: "off", shader: { kind: "iridescent", speed: 0.71, scale: 0.5, intensity: 0.88, paused: false },
  });
  const name = `QA ${locale} signature`;
  let snapshot;
  let duplicates;
  await check(result, "save-validates-name-and-persists-a-complete-detached-snapshot", async () => {
    await importProfile(page, locale, original);
    await savePreset(page, locale, "   ");
    const input = page.getByRole("textbox", {
      name: label(locale, "Preset name", "Nombre del ajuste"), exact: true,
    });
    assert.equal(await input.getAttribute("aria-invalid"), "true");
    assert(await input.evaluate((element) => document.activeElement === element));
    assert.equal((await storedPresets(page)).length, 0);
    await savePreset(page, locale, `  ${name}  `);
    const presets = await waitPresets(page, (value) => value.length === 1 && value[0].name === name);
    snapshot = presets[0];
    assert.match(snapshot.id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
    assert.deepEqual(snapshot.config, original);
    await importProfile(page, locale, alternative);
    assert.deepEqual((await storedPresets(page))[0], snapshot, "Editing the active profile cannot mutate a saved snapshot.");
    return { snapshot, activeAfterSave: alternative, blankNameRejected: true };
  });
  await check(result, "duplicate-uses-the-saved-source-when-the-active-profile-differs", async () => {
    await presetAction(page, locale, "duplicate", name);
    const first = `${name} ${label(locale, "copy", "copia")}`;
    await waitPresets(page, (value) => value.length === 2 && value.some((item) => item.name === first));
    await waitApplied(page, original);
    await importProfile(page, locale, alternative);
    await presetAction(page, locale, "duplicate", name);
    const second = `${first} 2`;
    const presets = await waitPresets(page, (value) => value.length === 3 && value.some((item) => item.name === second));
    assert.equal(new Set(presets.map((item) => item.id)).size, 3);
    for (const preset of presets) assert.deepEqual(preset.config, original);
    assert.deepEqual(presets.find((item) => item.id === snapshot.id), snapshot);
    duplicates = [first, second];
    await waitApplied(page, original);
    return { presets, duplicateNames: duplicates, inactiveSourceTested: true };
  });
  await check(result, "apply-and-delete-survive-reload-and-route-navigation", async () => {
    await importProfile(page, locale, alternative);
    await presetAction(page, locale, "apply", duplicates[0]);
    await waitApplied(page, original);
    await presetAction(page, locale, "delete", name);
    await waitPresets(page, (value) => value.length === 2 && !value.some((item) => item.id === snapshot.id));
    await page.reload({ waitUntil: "load" });
    await waitApplied(page, original);
    assert.equal(await page.getByRole("button", {
      name: `${label(locale, "Delete", "Eliminar")} ${name}`, exact: true,
    }).count(), 0);
    const routes = [];
    for (const path of ["themes", "studio", "components", "studio"]) {
      await clickRoute(page, locale, path);
      await waitApplied(page, original, { scope: path === "studio" });
      routes.push({ path, palette: (await presentation(page)).palette });
    }
    return { routes, persistedPresets: await storedPresets(page), profile: await storedAppearance(page) };
  });
  await check(result, "native-cross-tab-storage-events-sync-profiles-presets-and-deletions", async () => {
    const peer = await page.context().newPage();
    observeErrors(peer, result);
    try {
      await go(peer, spec, result.baseURL);
      await waitApplied(peer, original);
      await importProfile(page, locale, alternative);
      await waitApplied(peer, alternative);
      const peerName = `QA ${locale} peer`;
      await savePreset(peer, locale, peerName);
      await waitPresets(page, (value) => value.some((item) => item.name === peerName));
      await page.getByRole("button", {
        name: `${label(locale, "Apply", "Aplicar")} ${peerName}`, exact: true,
      }).waitFor({ state: "visible" });
      await presetAction(page, locale, "delete", peerName);
      await waitPresets(peer, (value) => !value.some((item) => item.name === peerName));
      const events = await peer.evaluate(() => window.__aureformAppearanceQA.storageEvents);
      assert(events.some((event) => event.key === profileKey && event.trusted));
      assert(events.some((event) => event.key === presetsKey && event.trusted));
      for (const duplicate of duplicates) await presetAction(page, locale, "delete", duplicate);
      await waitPresets(peer, (value) => value.length === 0);
      await page.reload({ waitUntil: "load" });
      await waitApplied(page, alternative);
      assert.deepEqual(await storedPresets(page), []);
      return { events, allDeletesPersisted: true, finalProfile: alternative };
    } finally {
      await peer.close();
    }
  });
}

async function readExport(page, locale, format, config, result) {
  await pane(page, locale, "library");
  const group = labeledContainer(page, label(locale, "Export format", "Formato de exportación"));
  await group.getByRole("button", { name: format === "react" ? "React" : format.toUpperCase(), exact: true }).click();
  const code = labeledContainer(page, label(locale, "Appearance export code", "Código de exportación de apariencia"));
  const original = format === "react" ? studioExampleSource(config, locale, projectRoot) : null;
  const expected = {
    json: () => serializeAppearance(config),
    css: () => appearanceToCSS(config),
    react: () => exportConfiguredExample(original, config),
  }[format]();
  await waitStable("The export view contains the current complete configuration",
    () => code.textContent(), (value) => value === expected);
  const card = code.locator('xpath=ancestor::*[@data-slot="card"][1]');
  const sentinel = `pending-${locale}-${format}-${randomUUID()}`;
  await page.evaluate((text) => navigator.clipboard.writeText(text), sentinel);
  await card.getByRole("button", {
    name: new RegExp(`^(${label(locale, "Copy", "Copiar")}|${label(locale, "Copied", "Copiado")})$`),
  }).click();
  const copied = (await waitStable("The real system clipboard contains the complete current export",
    () => page.evaluate(() => navigator.clipboard.readText()), (value) => value === expected)).value;
  const downloadPromise = page.waitForEvent("download");
  await card.getByRole("button", { name: label(locale, "Download", "Descargar"), exact: true }).click();
  const download = await downloadPromise;
  assert.equal(await download.failure(), null);
  const filename = {
    json: "aureform-appearance.json", css: "aureform-appearance.css", react: "aureform-example.tsx",
  }[format];
  assert.equal(download.suggestedFilename(), filename);
  const savedPath = resolve(dirname(appearanceReportPath), "appearance-exports", appearanceRunID, result.id, filename);
  await mkdir(dirname(savedPath), { recursive: true });
  await download.saveAs(savedPath);
  const downloaded = await readFile(savedPath, "utf8");
  assert.equal(downloaded, copied);
  assert.equal(downloaded, await code.textContent());
  const evidence = {
    format, savedPath, bytes: Buffer.byteLength(downloaded),
    sha256: createHash("sha256").update(downloaded).digest("hex"),
    clipboardEqualsDownloadAndView: true,
  };
  if (format === "json") assert.deepEqual(parseAppearance(downloaded), config);
  if (format === "css") {
    const variables = resolveAppearance(config);
    for (const [property, value] of Object.entries(variables))
      assert(downloaded.includes(`${property}: ${value};`), `${property} must export its actual value.`);
    evidence.resolvedProperties = Object.keys(variables).length;
  }
  if (format === "react") {
    evidence.completeExample = validateConfiguredExample(downloaded, config, original, filename);
    evidence.compilation = strictCheckPayloads([
      { name: `${locale}/actual-clipboard.tsx`, source: copied },
      { name: `${locale}/actual-download.tsx`, source: downloaded },
    ], { root: projectRoot });
    result.exportedTSX.push({ savedPath, sha256: evidence.sha256, ...evidence.compilation });
  }
  return evidence;
}

async function interchangeCase(page, spec, result) {
  const { locale } = spec;
  const config = configuredProfile();
  await check(result, "paste-import-applies-the-complete-profile-atomically", () => importProfile(page, locale, config));
  await check(result, "invalid-imports-preserve-the-valid-profile-and-show-localized-errors", async () => {
    await page.getByRole("button", { name: label(locale, "Import", "Importar"), exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    const input = dialog.getByRole("textbox", { name: label(locale, "Or paste JSON", "O pega el JSON"), exact: true });
    const before = await page.evaluate((key) => localStorage.getItem(key), profileKey);
    const invalid = [
      ["syntax", "{", label(locale, "This JSON couldn't be read.", "No se pudo leer el JSON.")],
      ["version", JSON.stringify({ ...config, version: 2 }), label(locale, "This appearance version isn't supported.", "Esta versión de apariencia no es compatible.")],
      ["missing", JSON.stringify({ version: 1 }), null],
      ["enum", JSON.stringify({ ...config, material: "metal" }), null],
      ["color", JSON.stringify({ ...config, colors: { ...config.colors, primary: "red" } }), label(locale, "Check the colors.", "Revisa los colores.")],
      ["radius", JSON.stringify({ ...config, radius: 25 }), label(locale, "A number is outside its range.", "Un número está fuera de rango.")],
      ["gradient", JSON.stringify({ ...config, gradient: { ...config.gradient, stops: [] } }), label(locale, "Check the gradient:", "Revisa el degradado:")],
      ["shader", JSON.stringify({ ...config, shader: { ...config.shader, paused: "false" } }), null],
    ];
    const evidence = [];
    for (const [kind, text, message] of invalid) {
      await input.fill(text);
      await dialog.getByRole("button", { name: label(locale, "Import appearance", "Importar apariencia"), exact: true }).click();
      const alert = dialog.getByRole("alert");
      await alert.waitFor({ state: "visible" });
      const error = await alert.textContent();
      assert(error.trim().length > 20);
      if (message) assert(error.includes(message), error);
      assert.equal(await input.getAttribute("aria-invalid"), "true");
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), profileKey), before);
      await assertApplied(page, config);
      evidence.push({ kind, error, unchanged: true });
    }
    await dialog.getByLabel(label(locale, "Appearance JSON file", "Archivo JSON de apariencia"), { exact: true }).setInputFiles({
      name: "oversized.json", mimeType: "application/json", buffer: Buffer.from(" ".repeat(32769)),
    });
    await dialog.getByRole("alert").filter({ hasText: "32 KB" }).waitFor({ state: "visible" });
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), profileKey), before);
    const readFocus = () => dialog.evaluate((element) => ({
      contained: element.contains(document.activeElement),
      active: document.activeElement instanceof HTMLElement
        ? { tag: document.activeElement.tagName, id: document.activeElement.id,
          label: document.activeElement.getAttribute("aria-label") } : null,
    }));
    const focus = [(await waitStable("File validation retains focus in the import dialog",
      readFocus, (value) => value.contained)).value];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      focus.push((await waitStable("Tab focus settles inside the import dialog",
        readFocus, (value) => value.contained)).value);
    }
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    return { invalid: evidence, oversizeFileRejected: true, focusTrapped: true, focus };
  });
  await check(result, "actual-file-import-validates-before-applying-all-fields", async () => {
    const modified = normalizeAppearance({ ...config, palette: "rose", radius: 0, density: "comfortable" });
    await importProfile(page, locale, modified);
    await importProfile(page, locale, config, true);
    return { fileRestored: await storedAppearance(page) };
  });
  for (const format of ["json", "css", "react"])
    await check(result, `complete-${format}-export-view-clipboard-download-and-validation`,
      () => readExport(page, locale, format, config, result));
}

async function probeRecords(page) {
  return page.evaluate(() => window.__aureformAppearanceQA.records());
}

async function detachedShadersStopped(page) {
  return waitStable("Detached shader canvases retain no draw loop", async () =>
    (await probeRecords(page)).filter((record) => !record.connected).map((record) => ({
      id: record.id, draws: record.draws, rafExecutions: record.rafExecutions,
      pendingRAF: record.pendingRAF, programsCreated: record.programsCreated,
      programsDeleted: record.programsDeleted, arraysDeleted: record.arraysDeleted,
    })), (value, previous) => value.every((record) => record.pendingRAF === 0) &&
      previous && JSON.stringify(value) === JSON.stringify(previous));
}

function assertBufferBudget(value) {
  const cappedDPR = Math.min(value.dpr, 1.5);
  const rawWidth = Math.max(1, value.cssWidth * cappedDPR);
  const rawHeight = Math.max(1, value.cssHeight * cappedDPR);
  const fit = Math.min(1, Math.sqrt(1_300_000 / (rawWidth * rawHeight)), 2048 / rawWidth, 2048 / rawHeight);
  const expected = { width: Math.max(1, Math.floor(rawWidth * fit)), height: Math.max(1, Math.floor(rawHeight * fit)) };
  assert.deepEqual({ width: value.width, height: value.height }, expected);
  assert(value.width * value.height <= 1_300_000 && value.width <= 2048 && value.height <= 2048);
  return { cssWidth: value.cssWidth, cssHeight: value.cssHeight, dpr: value.dpr, cappedDPR, expected, pixels: value.width * value.height };
}

async function shaderPerformance(page, kind) {
  const start = (await runningShader(page, kind)).value;
  const started = Date.now();
  let end;
  do {
    end = await shader(page);
    assert.equal(end.canvasId, start.canvasId);
    assert(end.pendingRAF <= 1, "Each canvas owns at most one scheduled callback.");
    await new Promise((done) => setTimeout(done, 16));
  } while (Date.now() - started < 1100);
  const timestamps = end.drawTimes.filter((time) => time > start.now);
  assert(timestamps.length >= 2, "A running shader must continue drawing.");
  const intervals = timestamps.slice(1).map((time, index) => time - timestamps[index]);
  assert(intervals.every((interval) => interval >= 1000 / 30 - 0.2),
    `Actual draw intervals exceed the 30 Hz cap: ${JSON.stringify(intervals)}`);
  const elapsedMs = end.now - start.now;
  assert(end.draws - start.draws <= Math.ceil(elapsedMs * 30 / 1000) + 1);
  const options = end.contextOptions.find((entry) => entry.kind === "webgl2")?.options;
  assert.equal(options?.powerPreference, "low-power");
  assert.equal(options?.antialias, false);
  assert.equal(options?.preserveDrawingBuffer, false);
  return {
    kind, elapsedMs, actualDraws: end.draws - start.draws,
    observedDrawHz: (end.draws - start.draws) * 1000 / elapsedMs,
    minimumNativeRAFDrawIntervalMs: Math.min(...intervals),
    ownedPendingRAF: end.pendingRAF, contextOptions: options, budget: assertBufferBudget(end),
    hardwareBenchmark: false,
  };
}

async function shaderLifecycleCase(page, spec, result) {
  const { locale } = spec;
  const config = createAppearance();
  await preview(page, locale, "background");
  await check(result, "real-default-aurora-draws-at-most-30-hz-with-one-owned-raf", () => shaderPerformance(page, "aurora"));
  await check(result, "live-color-scale-speed-and-intensity-update-uniforms-without-recompilation", async () => {
    const before = await shader(page);
    await editor(page, locale, "colors");
    await page.getByRole("textbox", { name: label(locale, "Primary", "Principal"), exact: true }).fill("#D946EF");
    config.colors.primary = "#D946EF";
    await editor(page, locale, "motion");
    for (const [key, en, es, value] of [
      ["speed", "Speed", "Velocidad", 0.17], ["scale", "Scale", "Escala", 2.75],
      ["intensity", "Shader intensity", "Intensidad del shader", 0.41],
    ]) {
      await range(page, label(locale, en, es), value);
      config.shader[key] = value;
    }
    await waitApplied(page, config);
    const after = (await runningShader(page, "aurora")).value;
    assert.equal(after.canvasId, before.canvasId);
    assert.equal(after.programsCreated, before.programsCreated);
    assert(Math.abs(after.uniforms.uScale[0] - 2.75) < 0.001);
    assert(Math.abs(after.uniforms.uIntensity[0] - 0.41) < 0.001);
    const expectedRGB = [0xD9, 0x46, 0xEF].map((channel) => channel / 255);
    assert(after.uniforms.uColorA.every((channel, index) => Math.abs(channel - expectedRGB[index]) < 0.00001));
    return { before, after, actualConfiguredProfile: config, noRecompile: true };
  });
  await check(result, "pause-keeps-the-last-frame-and-resume-preserves-phase-after-resize", async () => {
    await preview(page, locale, "background");
    await page.locator(scopeSelector).getByRole("button", {
      name: label(locale, "Pause shader", "Pausar shader"), exact: true,
    }).click();
    config.shader.paused = true;
    await waitApplied(page, config);
    const paused = (await stoppedShader(page, ["paused"])).value;
    assert(paused.ready, "Pause must retain the already drawn decorative frame.");
    const oldViewport = page.viewportSize();
    await page.setViewportSize({ width: 1280, height: 900 });
    const resized = (await stoppedShader(page, ["paused"])).value;
    assert.equal(resized.frame, paused.frame);
    assert.equal(resized.width, paused.width, "Dormant buffers must not be cleared by resize.");
    assert.equal(resized.height, paused.height);
    assert(resized.ready);
    await page.locator(scopeSelector).getByRole("button", {
      name: label(locale, "Resume shader", "Reanudar shader"), exact: true,
    }).click();
    config.shader.paused = false;
    await waitApplied(page, config);
    const resumed = (await runningShader(page, "aurora")).value;
    assert.equal(resumed.canvasId, paused.canvasId);
    assert.equal(resumed.programsCreated, paused.programsCreated);
    assert(resumed.uniforms.uTime[0] >= paused.uniforms.uTime[0]);
    assert(resumed.uniforms.uTime[0] - paused.uniforms.uTime[0] <=
      (resumed.now - resized.now) / 1000 * config.shader.speed + 0.03,
    "Paused wall time cannot jump the shader phase.");
    const budget = assertBufferBudget(resumed);
    await page.setViewportSize(oldViewport);
    return { paused, resized, resumed, budget };
  });
  await check(result, "actual-offscreen-intersection-cancels-the-owned-loop", async () => {
    await page.setViewportSize({ width: 1440, height: 280 });
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    const stopped = (await stoppedShader(page, ["paused"])).value;
    await page.setViewportSize(desktopViewport);
    await runningShader(page, "aurora");
    return { signal: "real viewport intersection", stopped };
  });
  for (const [property, hidden, restored] of [
      ["visibility", "hidden", ""], ["opacity", "0", ""], ["contentVisibility", "hidden", ""],
  ]) {
    try {
      await check(result, `actual-host-css-${property}-cancels-the-owned-loop`, async () => {
        await page.locator(shaderSelector).evaluate((element, update) => { element.style[update.property] = update.value; },
          { property, value: hidden });
        return { signal: `actual host CSS ${property}`, stopped: (await stoppedShader(page, ["paused"])).value };
      });
    } catch {
      // Restore the host and continue the other independent lifecycle checks.
    } finally {
      await page.locator(shaderSelector).evaluate((element, update) => { element.style[update.property] = update.value; },
        { property, value: restored });
      await runningShader(page, "aurora");
    }
  }
  await check(result, "controlled-document-visibility-event-cancels-the-owned-loop", async () => {
    await page.evaluate(() => window.__aureformAppearanceQA.setVisibility("hidden"));
    const stopped = (await stoppedShader(page, ["paused"])).value;
    await page.evaluate(() => window.__aureformAppearanceQA.clearVisibility());
    await runningShader(page, "aurora");
    return { signal: "controlled document visibility event (not OS tab hiding)", stopped };
  });
  await check(result, "live-reduced-motion-forced-colors-and-motion-off-prevent-drawing", async () => {
    const evidence = [];
    for (const [media, value, restore] of [
      ["reducedMotion", "reduce", "no-preference"], ["forcedColors", "active", "none"],
    ]) {
      await page.emulateMedia({ [media]: value });
      evidence.push({ signal: media, stopped: (await stoppedShader(page, ["off"])).value });
      await page.emulateMedia({ [media]: restore });
      await runningShader(page, "aurora");
    }
    await chooseMotion(page, locale, "off");
    config.motion = "off";
    await waitApplied(page, config);
    evidence.push({ signal: "real studio motion off", stopped: (await stoppedShader(page, ["off"])).value });
    await chooseMotion(page, locale, "expressive");
    config.motion = "expressive";
    await waitApplied(page, config);
    await runningShader(page, "aurora");
    return evidence;
  });
  await check(result, "zero-speed-and-zero-intensity-have-no-residual-raf", async () => {
    const evidence = [];
    await editor(page, locale, "motion");
    for (const [property, en, es, restore, state] of [
      ["speed", "Speed", "Velocidad", 0.17, "paused"],
      ["intensity", "Shader intensity", "Intensidad del shader", 0.41, "off"],
    ]) {
      await range(page, label(locale, en, es), 0);
      config.shader[property] = 0;
      await waitApplied(page, config);
      evidence.push({ property, stopped: (await stoppedShader(page, [state])).value });
      await range(page, label(locale, en, es), restore);
      config.shader[property] = restore;
      await waitApplied(page, config);
      await runningShader(page, "aurora");
    }
    return evidence;
  });
  await check(result, "native-webgl-context-loss-shows-static-fallback-and-restores-a-single-loop", async () => {
    const before = await shader(page);
    await page.evaluate((selector) => window.__aureformAppearanceQA.loseContext(selector), shaderSelector);
    const lost = (await stoppedShader(page, ["fallback"])).value;
    assert.equal(lost.ready, false);
    const fallback = await page.locator(`${scopeSelector} [data-slot="gradient-background"] > .afx-background-field`).evaluate(
      (element) => ({ image: getComputedStyle(element).backgroundImage, opacity: getComputedStyle(element).opacity }),
    );
    assert(fallback.image !== "none" && Number(fallback.opacity) > 0);
    await page.evaluate((selector) => window.__aureformAppearanceQA.restoreContext(selector), shaderSelector);
    const restored = (await runningShader(page, "aurora")).value;
    assert.equal(restored.canvasId, before.canvasId);
    assert.equal(restored.programsCreated, before.programsCreated + 1);
    assert.equal(restored.pendingRAF, 1);
    return { before, lost, fallback, restored, nativeExtension: "WEBGL_lose_context" };
  });
  await check(result, "shader-kind-switches-release-old-resources-and-removal-cleans-detached-canvases", async () => {
    const evidence = [];
    for (const [kind, en, es] of [
      ["waves", "Waves", "Ondas"], ["iridescent", "Iridescent", "Iridiscente"],
    ]) {
      await editor(page, locale, "motion");
      const before = await shader(page);
      await choice(page, "Shader", label(locale, en, es));
      config.shader.kind = kind;
      await waitApplied(page, config);
      const performance = await shaderPerformance(page, kind);
      const after = await shader(page);
      assert.notEqual(after.canvasId, before.canvasId);
      evidence.push({ performance, detached: (await detachedShadersStopped(page)).value });
    }
    await editor(page, locale, "motion");
    await choice(page, "Shader", label(locale, "None", "Ninguno"));
    config.shader.kind = "none";
    await waitApplied(page, config);
    assert.equal(await page.locator(shaderSelector).count(), 0, "Studio None removes its optional shader layer.");
    const detached = (await detachedShadersStopped(page)).value;
    const released = detached.filter((record) => record.programsCreated === 1);
    assert(released.length >= 2);
    assert(released.every((record) => record.programsDeleted === 1 && record.arraysDeleted === 1));
    for (const [en, es] of [["Speed", "Velocidad"], ["Scale", "Escala"], ["Shader intensity", "Intensidad del shader"]])
      assert(await page.getByRole("slider", { name: label(locale, en, es), exact: true }).isDisabled());
    return { kinds: evidence, allDetached: detached, noneRemovesCanvas: true, unavailableControlsDisabled: true };
  });
}

async function noWebGLCase(page, spec, result) {
  await check(result, "missing-webgl-retains-the-real-gradient-fallback-without-an-owned-loop", async () => {
    await preview(page, spec.locale, "background");
    await page.locator(shaderSelector).scrollIntoViewIfNeeded();
    const stopped = (await stoppedShader(page, ["fallback"])).value;
    assert(stopped.requests > 0);
    assert.equal(stopped.draws, 0);
    assert.equal(stopped.programsCreated, 0);
    assert.equal(stopped.ready, false);
    const image = await page.locator(`${scopeSelector} [data-slot="gradient-background"] > .afx-background-field`).evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    assert.notEqual(image, "none");
    return { stopped, image, boundary: "Canvas.getContext returns null; all application logic remains real" };
  });
  await check(result, "fallback-profile-remains-editable-and-its-preview-form-works", async () => {
    const config = createAppearance("ocean", "light");
    config.motion = "off";
    await choosePalette(page, spec.locale, "ocean");
    await chooseTheme(page, spec.locale, "light");
    await chooseMotion(page, spec.locale, "off");
    await waitApplied(page, config);
    return { applied: config, form: await keyboardPreview(page, spec.locale) };
  });
}

async function reducedMotionCase(page, spec, result) {
  const { locale } = spec;
  const config = createAppearance();
  await check(result, "initial-reduced-preference-does-not-request-webgl-or-schedule-draws", async () => {
    await preview(page, locale, "background");
    await page.locator(shaderSelector).scrollIntoViewIfNeeded();
    const initial = (await stoppedShader(page, ["off"])).value;
    assert.equal(initial.requests, 0);
    assert.equal(initial.draws, 0);
    assert.equal(initial.ready, false);
    return initial;
  });
  await check(result, "restoring-preference-cannot-bypass-explicit-off-and-running-remains-lazy", async () => {
    await chooseMotion(page, locale, "off");
    config.motion = "off";
    await waitApplied(page, config);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const explicitOff = (await stoppedShader(page, ["off"])).value;
    assert.equal(explicitOff.requests, 0);
    await chooseMotion(page, locale, "gentle");
    config.motion = "gentle";
    await waitApplied(page, config);
    const running = (await runningShader(page, "aurora")).value;
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedAgain = (await stoppedShader(page, ["off"])).value;
    assert.equal(reducedAgain.canvasId, running.canvasId);
    assert.equal(reducedAgain.ready, false);
    return { explicitOff, running, reducedAgain };
  });
  await check(result, "reduced-motion-keeps-functional-keyboard-content", () => keyboardPreview(page, locale));
}

async function offscreenInitialCase(page, spec, result) {
  await check(result, "initial-offscreen-canvas-does-not-allocate-webgl-until-real-intersection", async () => {
    const rect = await page.locator(shaderSelector).boundingBox();
    assert(rect.y >= page.viewportSize().height);
    const initial = (await stoppedShader(page, ["paused"])).value;
    assert.equal(initial.requests, 0);
    assert.equal(initial.draws, 0);
    await page.setViewportSize(desktopViewport);
    const entered = (await runningShader(page, "aurora")).value;
    assert.equal(entered.requests, 1);
    await page.setViewportSize({ width: 1440, height: 280 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const left = (await stoppedShader(page, ["paused"])).value;
    assert.equal(left.canvasId, entered.canvasId);
    await page.setViewportSize(desktopViewport);
    const resumed = (await runningShader(page, "aurora")).value;
    assert.equal(resumed.programsCreated, entered.programsCreated);
    assert.equal(resumed.canvasId, entered.canvasId);
    return { initialRect: rect, initial, entered, left, resumed };
  });
  await check(result, "preview-section-unmount-releases-the-real-program", async () => {
    await preview(page, spec.locale, "components");
    assert.equal(await page.locator(shaderSelector).count(), 0);
    const detached = (await detachedShadersStopped(page)).value;
    assert(detached.length > 0);
    assert(detached.every((record) => record.programsCreated === record.programsDeleted));
    return detached;
  });
}

async function mobileCase(page, spec, result) {
  const { locale } = spec;
  const config = createAppearance("ocean", "light");
  config.motion = "off";
  config.radius = 0;
  config.material = "glass";
  config.density = "compact";
  await check(result, "360px-editor-and-mobile-panes-apply-real-controls-without-page-overflow", async () => {
    assert(await labeledContainer(page, label(locale, "Studio sections", "Secciones del estudio")).isVisible());
    await choosePalette(page, locale, "ocean");
    await chooseTheme(page, locale, "light");
    await chooseMotion(page, locale, "off");
    await editor(page, locale, "surfaces");
    await choice(page, label(locale, "Surface material", "Material de superficie"), label(locale, "Glass", "Cristal"));
    await range(page, label(locale, "Corner radius", "Radio de las esquinas"), 0);
    await choice(page, label(locale, "Density", "Densidad"), label(locale, "Compact", "Compacta"));
    await waitApplied(page, config);
    const views = [];
    for (const kind of ["product", "components", "background"]) {
      await preview(page, locale, kind);
      const current = await presentation(page);
      assert(current.overflow <= 1, `${kind} preview overflows by ${current.overflow}px`);
      views.push({ kind, overflow: current.overflow, scope: await assertApplied(page, config) });
    }
    return { views, width: 360, touch: await page.evaluate(() => navigator.maxTouchPoints) };
  });
  await check(result, "mobile-keyboard-form-and-coarse-pointer-remain-functional", async () => {
    const form = await keyboardPreview(page, locale);
    assert.equal(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches), false);
    await chooseMotion(page, locale, "gentle");
    config.motion = "gentle";
    await choice(page, label(locale, "Hover effect", "Efecto al pasar el cursor"), label(locale, "Magnetic", "Magnético"));
    config.hover = "magnetic";
    await waitApplied(page, config);
    await preview(page, locale, "components");
    const action = page.locator(scopeSelector).getByRole("button", { name: label(locale, "Try me", "Pruébame"), exact: true });
    await action.hover({ position: { x: 6, y: 6 } });
    const pointer = (await waitStable("A coarse pointer does not displace the action", () =>
      action.evaluate((element) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
        return { pointer: element.getAttribute("data-afx-pointer"), x: matrix.m41, y: matrix.m42 };
      }), (value) => value.pointer === "idle" && Math.abs(value.x) < 0.01 && Math.abs(value.y) < 0.01)).value;
    await chooseMotion(page, locale, "off");
    config.motion = "off";
    await waitApplied(page, config);
    return { form, coarsePointer: pointer };
  });
  await check(result, "mobile-save-and-reload-retain-the-complete-profile", async () => {
    await savePreset(page, locale, `QA ${locale} mobile`);
    const saved = await waitPresets(page, (value) => value.length === 1);
    assert.deepEqual(saved[0].config, config);
    await page.reload({ waitUntil: "load" });
    await waitApplied(page, config);
    await pane(page, locale, "library");
    await page.getByRole("button", { name: `${label(locale, "Apply", "Aplicar")} QA ${locale} mobile`, exact: true }).waitFor({ state: "visible" });
    return { saved, restoredProfile: config };
  });
  for (const format of ["json", "css", "react"])
    await check(result, `mobile-${format}-actual-clipboard-download-and-contained-code`,
      async () => {
        const exportEvidence = await readExport(page, locale, format, config, result);
        const code = labeledContainer(page, label(locale, "Appearance export code", "Código de exportación de apariencia"));
        await code.focus();
        assert(await code.evaluate((element) => document.activeElement === element));
        assert((await presentation(page)).overflow <= 1, "Scrollable export code must not overflow the document.");
        return exportEvidence;
      });
}

async function storageRecoveryCase(page, spec, result) {
  const { locale } = spec;
  const config = configuredProfile();
  await check(result, "corrupt-profile-and-invalid-preset-entries-recover-with-validated-ui-state", async () => {
    await assertApplied(page, createAppearance());
    await page.getByRole("button", { name: `${label(locale, "Apply", "Aplicar")} Recovered`, exact: true }).waitFor({ state: "visible" });
    assert.equal(await page.getByRole("button", { name: /^(Apply|Aplicar) Invalid$/, exact: true }).count(), 0);
    await presetAction(page, locale, "apply", "Recovered");
    await waitApplied(page, config);
    await savePreset(page, locale, "Recovered again");
    const presets = await waitPresets(page, (value) => value.length === 2 && value.every((item) => item.name.startsWith("Recovered")));
    for (const preset of presets) assert.deepEqual(normalizeAppearance(preset.config), config);
    await page.reload({ waitUntil: "load" });
    await waitApplied(page, config);
    assert.deepEqual(await storedPresets(page), presets);
    return { validatedPresets: presets, corruptedProfileReplacedByValidSelection: true };
  });
  await check(result, "blocked-localstorage-leaves-editor-preview-form-and-in-memory-presets-usable", async () => {
    const context = await page.context().browser().newContext({
      viewport: desktopViewport, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"],
    });
    context.setDefaultTimeout(waitLimit);
    context.setDefaultNavigationTimeout(navigationLimit);
    await context.addInitScript(installAppearanceProbe, { forceNoWebGL: false });
    await context.addInitScript(() => {
      for (const name of ["getItem", "setItem", "removeItem"]) {
        const original = Storage.prototype[name];
        Storage.prototype[name] = function (key, ...args) {
          if (/^aureform:(appearance|presets|theme)/.test(key))
            throw new DOMException("QA storage boundary is blocked", "SecurityError");
          return original.call(this, key, ...args);
        };
      }
    });
    const blocked = await context.newPage();
    observeErrors(blocked, result);
    try {
      await go(blocked, { ...spec, kind: "blocked-storage" }, result.baseURL);
      const expected = createAppearance("rose", "light");
      expected.motion = "off";
      await choosePalette(blocked, locale, "rose");
      await chooseTheme(blocked, locale, "light");
      await chooseMotion(blocked, locale, "off");
      await waitStable("The blocked-storage editor still applies its complete CSS",
        () => blocked.locator("html").evaluate((element) => element.dataset.palette),
        (value) => value === "rose");
      const applied = await assertApplied(blocked, expected);
      const form = await keyboardPreview(blocked, locale);
      await savePreset(blocked, locale, "In memory");
      await blocked.getByRole("button", { name: `${label(locale, "Apply", "Aplicar")} In memory`, exact: true }).waitFor({ state: "visible" });
      const exported = labeledContainer(blocked, label(locale, "Appearance export code", "Código de exportación de apariencia"));
      assert.deepEqual(parseAppearance(await exported.textContent()), expected);
      const health = await pageHealth(blocked);
      return { applied, form, inMemoryPresetVisible: true, exportStillUsable: true, health,
        boundary: "Storage throws SecurityError for Aureform persistence keys" };
    } finally {
      await context.close();
    }
  });
}

async function pageHealth(page) {
  const view = (await waitStable(
    "The current page entrance finishes before accessibility auditing",
    () => presentation(page),
    (value) => value.heading?.visible === true,
  )).value;
  assert(view.heading?.visible, "The page heading must remain visible.");
  assert(view.overflow <= 1, `The document overflows horizontally by ${view.overflow}px.`);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const violations = accessibility.violations.map(({ id, impact, description, helpUrl, nodes }) => ({
    id, impact, description, helpUrl,
    nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })),
  }));
  assert.equal(violations.length, 0, `Accessibility violations: ${JSON.stringify(violations)}`);
  return { view, accessibility: { violations, passes: accessibility.passes.length, incomplete: accessibility.incomplete.map((item) => item.id) } };
}

async function noJavaScriptCase(page, spec, result) {
  const before = await presentation(page);
  await check(result, "scripting-disabled-studio-has-visible-localized-ssr-content-and-static-fallback", async () => {
    assert.equal(before.dark, true, "The actual SSR document defaults to dark.");
    assert(before.heading.visible);
    assert(before.gradient?.image && before.gradient.image !== "none");
    assert(before.shaders.length > 0);
    assert(before.shaders.every((item) => item.frame === 0 && item.canvasReady !== "true"));
    assert(before.motion.every((item) => item.smoothScroll !== "running"));
    const input = page.locator(scopeSelector).getByRole("textbox", {
      name: label(spec.locale, "Try your next interaction", "Prueba tu próxima interacción"), exact: true,
    });
    await input.fill("not-an-email");
    assert.equal(await input.evaluate((element) => element.validity.typeMismatch), true);
    await input.fill("qa@example.test");
    assert.equal(await input.evaluate((element) => element.checkValidity()), true);
    return { before, nativeEmailValidation: true, javaScriptEnabled: false, interactiveStudioNotClaimed: true };
  });
  await check(result, "axe-audits-a-script-free-copy-identical-to-the-original-disabled-document", async () => {
    const html = await page.evaluate(() => {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('script, link[rel="preload"][as="script"], link[rel="modulepreload"]').forEach((node) => node.remove());
      const base = document.createElement("base");
      base.href = location.href;
      clone.querySelector("head").prepend(base);
      return `<!doctype html>${clone.outerHTML}`;
    });
    const context = await page.context().browser().newContext({
      viewport: desktopViewport, javaScriptEnabled: true, reducedMotion: "no-preference", colorScheme: "dark",
    });
    context.setDefaultTimeout(waitLimit);
    context.setDefaultNavigationTimeout(navigationLimit);
    const snapshot = await context.newPage();
    observeErrors(snapshot, result, { blocked: true });
    await snapshot.route("**/*", async (route) => {
      const request = route.request();
      if (isNextScript(request.url(), request.resourceType(), result.baseURL)) await route.abort("blockedbyclient");
      else await route.continue();
    });
    try {
      const snapshotURL = new URL(page.url());
      snapshotURL.searchParams.set("aureform-qa-snapshot", spec.id);
      await snapshot.route(snapshotURL.href, (route) =>
        route.fulfill({ status: 200, contentType: "text/html", body: html }));
      const response = await snapshot.goto(snapshotURL.href, { waitUntil: "load" });
      assert.equal(response?.status(), 200);
      const originalOrigin = new URL(page.url()).origin;
      const snapshotOrigin = await snapshot.evaluate(() => location.origin);
      assert.equal(snapshotOrigin, originalOrigin, "The no-JS measurement must retain the real resource origin.");
      await waitStable("The script-free snapshot's fonts load",
        () => snapshot.evaluate(() => document.fonts.status), (value) => value === "loaded");
      const copied = (await waitStable("The script-free snapshot settles to the actual no-JS presentation",
        () => presentation(snapshot), (value) => isDeepStrictEqual(value, before))).value;
      assert.deepEqual(copied, before, "Axe's script-enabled copy must preserve the actual no-JS presentation.");
      const health = await pageHealth(snapshot);
      const originalAfterAudit = await presentation(page);
      assert.deepEqual(originalAfterAudit, before, "The real scripting-disabled page remains unmodified.");
      return { copied, health, scriptsRemoved: true, originalJavaScriptStillDisabled: true,
        originalOrigin, snapshotOrigin, snapshotURL: snapshot.url() };
    } finally {
      await context.close();
    }
  });
  await check(result, "native-no-js-navigation-keeps-readable-themed-content", async () => {
    await clickRoute(page, spec.locale, "themes");
    const initial = await presentation(page);
    result.checks.at(-1).partialEvidence = { initial };
    const settled = await waitStable("The native no-JS route finishes its actual font and layout loading",
      async () => ({ view: await presentation(page), fonts: await page.evaluate(() => document.fonts.status) }),
      (value, previous) => value.fonts === "loaded" && value.view.dark &&
        value.view.heading?.visible && value.view.overflow <= 1 && isDeepStrictEqual(value, previous));
    return { initial, after: settled.value.view, observations: settled.observations, fonts: settled.value.fonts };
  });
}

const caseFunctions = {
  palette: paletteCase,
  controls: controlsCase,
  persistence: persistenceCase,
  interchange: interchangeCase,
  "shader-lifecycle": shaderLifecycleCase,
  "no-webgl": noWebGLCase,
  "no-js": noJavaScriptCase,
  mobile: mobileCase,
  "storage-recovery": storageRecoveryCase,
  "reduced-motion": reducedMotionCase,
  "offscreen-initial": offscreenInitialCase,
};

export async function runAppearanceCase(browser, spec, baseURL = appearanceBaseURL) {
  assert(caseFunctions[spec.kind], `No executable case for ${spec.kind}.`);
  const result = {
    ...spec, baseURL, status: "running", runtimeTested: false,
    startedAt: new Date().toISOString(), completedAt: null,
    checks: [], errors: [], runtimeErrors: [], intentionallyBlockedScripts: [], exportedTSX: [],
  };
  let context;
  let page;
  try {
    const noJS = spec.kind === "no-js";
    const mobile = spec.kind === "mobile";
    context = await browser.newContext({
      viewport: mobile ? mobileViewport : spec.kind === "offscreen-initial" ? { width: 1440, height: 280 } : desktopViewport,
      javaScriptEnabled: !noJS,
      reducedMotion: spec.kind === "reduced-motion" || mobile ? "reduce" : "no-preference",
      colorScheme: "dark",
      deviceScaleFactor: spec.kind === "shader-lifecycle" ? 3 : 1,
      ...(mobile ? { isMobile: true, hasTouch: true } : {}),
      permissions: ["clipboard-read", "clipboard-write"],
      acceptDownloads: true,
    });
    context.setDefaultTimeout(waitLimit);
    context.setDefaultNavigationTimeout(navigationLimit);
    if (!noJS) await context.addInitScript(installAppearanceProbe, { forceNoWebGL: spec.kind === "no-webgl" });
    if (spec.kind === "storage-recovery")
      await context.addInitScript(({ marker, profile, presets, config }) => {
        if (localStorage.getItem(marker)) return;
        localStorage.setItem(marker, "1");
        localStorage.setItem(profile, "{");
        localStorage.setItem(presets, JSON.stringify([
          { id: "recovered-valid", name: "Recovered", config },
          { id: "bad-profile", name: "Invalid", config: { version: 2 } },
          { id: 42, name: "Invalid id", config },
          null,
        ]));
      }, { marker: `aureform:qa:seeded:${appearanceRunID}`, profile: profileKey, presets: presetsKey, config: configuredProfile() });
    page = await context.newPage();
    observeErrors(page, result, { noJS });
    await check(result, "successful-production-studio-document-and-initial-provider", async () => {
      const view = await go(page, spec, baseURL);
      result.runtimeTested = true;
      return view;
    });
    await caseFunctions[spec.kind](page, spec, result);
  } catch (error) {
    if (!result.errors.some((entry) => entry.message === error.message))
      result.errors.push({ check: "scenario", ...serializeError(error) });
  } finally {
    if (page && !page.isClosed()) {
      if (spec.kind !== "no-js") {
        try { await check(result, "final-layout-and-accessibility", () => pageHealth(page)); } catch { /* Recorded by check. */ }
      }
      try {
        await check(result, "no-browser-console-page-network-or-http-errors", async () => {
          assert.deepEqual(result.runtimeErrors, []);
          return { runtimeErrors: result.runtimeErrors, intentionallyBlockedScripts: result.intentionallyBlockedScripts };
        });
      } catch { /* Recorded by check. */ }
      if (result.errors.length) {
        const prefix = resolve(dirname(appearanceReportPath), "appearance-failures", appearanceRunID, spec.id);
        await mkdir(dirname(prefix), { recursive: true });
        try {
          await page.screenshot({ path: `${prefix}.png`, fullPage: true, animations: "disabled", timeout: waitLimit });
          await writeFile(`${prefix}.html`, await page.content());
          result.failureArtifacts = { screenshot: `${prefix}.png`, html: `${prefix}.html` };
        } catch (error) {
          result.failureArtifactError = serializeError(error);
        }
      }
    }
    await context?.close();
    result.status = result.errors.length ? "failed" : "passed";
    result.completedAt = new Date().toISOString();
  }
  return result;
}

export async function runAppearanceSuite(baseURL = appearanceBaseURL) {
  const report = await createAppearanceReport(baseURL);
  await writeAppearanceReport(report);
  let browser;
  try {
    browser = await chromium.launch(appearanceLaunchOptions);
    report.browserVersion = browser.version();
    for (const spec of appearanceCases) {
      const scenario = await runAppearanceCase(browser, spec, baseURL);
      report.scenarios.push(scenario);
      await writeAppearanceReport(report);
      console.log(`${scenario.status}: ${scenario.id} (${scenario.checks.filter((entry) => entry.status === "passed").length}/${scenario.checks.length} checks)`);
    }
  } catch (error) {
    report.errors.push({ check: "suite", ...serializeError(error) });
  } finally {
    await browser?.close();
    await verifyAppearanceSourceIntegrity(report);
    finishAppearanceReport(report);
    await writeAppearanceReport(report);
  }
  console.log(JSON.stringify({ status: report.status, ...report.summary, reportPath: appearanceReportPath }, null, 2));
  if (report.status !== "passed") throw new Error(`Appearance verification failed. Actual report: ${appearanceReportPath}`);
  return report;
}

// Kept in this scoped runner so the dedicated spec can run against the owner's
// existing 3010 production build without touching the repository's 3001 config.
const appearancePlaywrightConfig = {
  testDir: resolve(projectRoot, "tests"),
  testMatch: "appearance.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180000,
  reporter: [
    ["list"],
    ["json", { outputFile: resolve(dirname(appearanceReportPath), "appearance-playwright-results.json") }],
  ],
  outputDir: resolve(dirname(appearanceReportPath), "appearance-playwright"),
  use: {
    baseURL: appearanceBaseURL,
    launchOptions: appearanceLaunchOptions,
    actionTimeout: waitLimit,
    navigationTimeout: navigationLimit,
  },
};
export default appearancePlaywrightConfig;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  runAppearanceSuite().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
