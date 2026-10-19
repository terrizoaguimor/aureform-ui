import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAppearance } from "../src/lib/appearance.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(
  process.env.AUREFORM_QA_REPORT_DIR || resolve(projectRoot, "artifacts"),
  "motion-report.json",
);
const baseURL = (
  process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3010"
).replace(/\/+$/, "");
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (await access("/usr/bin/chromium-browser").then(
    () => "/usr/bin/chromium-browser",
    () => undefined,
  ));
const wrapperSelector = "[data-motion-mode][data-smooth-scroll]";
const predicateTimeout = 5000;
const sourcePaths = [
  "src/lib/appearance.ts",
  "src/components/app-page.tsx",
  "src/components/blocks/page-heading.tsx",
  "src/components/blocks/dashboard-shell.tsx",
  "src/components/motion-system.tsx",
  "src/components/templates/landing.tsx",
  "src/components/templates/catalogs.tsx",
  "src/components/document-layout.tsx",
  "src/styles/effects.css",
  "scripts/verify-motion.mjs",
];
async function sourceFingerprints() {
  return Promise.all(sourcePaths.map(async (path) => ({
    path,
    sha256: createHash("sha256").update(await readFile(resolve(projectRoot, path))).digest("hex"),
  })));
}
const report = {
  status: "running",
  startedAt: new Date().toISOString(),
  baseURL,
  executablePath: executablePath || "Playwright-managed Chromium",
  targetVersion: JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version,
  sourceRoot: projectRoot,
  sourceFingerprints: await sourceFingerprints(),
  browserRuntimeTested: false,
  releaseVerified: false,
  contract: {
    wrapperSelector,
    motionSelectors: ['[data-motion="intro"]', '[data-motion="reveal"]'],
    markerValues: "Observed at runtime; no enabled/disabled strings assumed.",
    anchor: "#kit",
    anchorActivation: "native URL fragment navigation in the current document",
    entranceAnimationRoutes: ["landing"],
    catalogReadiness: "actual route content and navigation, native scrolling, language, theme and overflow",
    defaultAppearance: createAppearance(),
    defaultHoverLiftPx: -4,
    gentleHoverLiftPx: -2,
    transformTolerancePx: 0.001,
  },
  scenarios: [],
  checks: [],
  errors: [],
};
const openContexts = new Set();
const noScriptPages = new WeakSet();
let browser;
let waitSequence = 0;

// A read-only DOM observer, installed before the application runs. It does not
// call GSAP/Lenis or change application styles, attributes, or event handlers.
function installProbe() {
  if (window.__aureformMotionQA) return;
  const motionSelector = '[data-motion="intro"], [data-motion="reveal"]';
  const animationProperties = [
    "opacity",
    "visibility",
    "transform",
    "translate",
    "scale",
    "rotate",
  ];
  const entries = [];
  const byElement = new WeakMap();
  const waits = new Map();
  let nextId = 0;

  function describe(element) {
    return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""} ${
      element.getAttribute("data-motion") || ""
    } ${element.getAttribute("aria-label") || ""} ${(element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 90)}`.trim();
  }

  function identity(transform) {
    if (!transform || transform === "none") return true;
    try {
      const matrix = new DOMMatrixReadOnly(transform);
      return [
        matrix.m11 - 1,
        matrix.m22 - 1,
        matrix.m33 - 1,
        matrix.m44 - 1,
        matrix.m12,
        matrix.m13,
        matrix.m14,
        matrix.m21,
        matrix.m23,
        matrix.m24,
        matrix.m31,
        matrix.m32,
        matrix.m34,
        matrix.m41,
        matrix.m42,
        matrix.m43,
      ].every((value) => Math.abs(value) <= 0.001);
    } catch {
      return false;
    }
  }

  function settledTransform(element) {
    const style = getComputedStyle(element);
    if (identity(style.transform)) return true;
    // A completed GSAP entrance restores the element's own CSS. An actionable
    // card may then keep the configured CSS hover/focus lift. Check both the
    // profile's independent motion policy and the actual token/matrix.
    if (
      !element.matches(".af-hover-card:is(:hover, :focus-visible)") ||
      Object.values(inlineStyles(element)).some((value) => value !== "")
    )
      return false;
    try {
      const matrix = new DOMMatrixReadOnly(style.transform);
      const lift = Number.parseFloat(
        style.getPropertyValue("--af-motion-lift"),
      );
      const contract = hoverContract(element);
      return (
        Number.isFinite(lift) &&
        Number.isFinite(contract.expectedLift) &&
        Math.abs(lift - contract.expectedLift) <= 0.001 &&
        identity(
          new DOMMatrixReadOnly(style.transform)
            .translate(0, -matrix.m42)
            .toString(),
        ) &&
        Math.abs(matrix.m42 - lift) <= 0.001
      );
    } catch {
      return false;
    }
  }

  function hoverContract(element) {
    const scope = element.closest("[data-motion-level]") || document.documentElement;
    const motion = scope.getAttribute("data-motion-level");
    const hover = scope.getAttribute("data-hover-effect");
    const expectedLift = motion === "off" || hover === "none"
      ? 0 : motion === "gentle" ? -2 : motion === "expressive" ? -4 : NaN;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return {
      motion,
      hover,
      expectedLift,
      liftToken: getComputedStyle(element).getPropertyValue("--af-motion-lift").trim(),
      actualLift: matrix.m42,
      pureVerticalTranslation: identity(matrix.translate(0, -matrix.m42).toString()),
      inlineAnimationClean: Object.values(inlineStyles(element)).every((value) => value === ""),
    };
  }

  function appearance(element) {
    const rect = element.getBoundingClientRect();
    let opacity = 1;
    let visible = rect.width > 0 && rect.height > 0;
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      opacity *= Number(style.opacity);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse"
      )
        visible = false;
    }
    return {
      visible,
      opacity,
      inViewport:
        visible &&
        rect.bottom > 0 &&
        rect.top < innerHeight &&
        rect.right > 0 &&
        rect.left < innerWidth,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    };
  }

  function inlineStyles(element) {
    return Object.fromEntries(
      animationProperties.map((property) => [
        property,
        element.style.getPropertyValue(property),
      ]),
    );
  }

  function transient(cssText) {
    const declaration = document.createElement("div").style;
    declaration.cssText = cssText || "";
    return (
      (declaration.opacity !== "" && Number(declaration.opacity) < 0.995) ||
      declaration.visibility === "hidden" ||
      !identity(declaration.transform) ||
      (declaration.translate !== "" &&
        !/^(none|0(?:px)?(?:\s+0(?:px)?){0,2})$/.test(declaration.translate)) ||
      (declaration.scale !== "" &&
        !/^(none|1(?:\s+1){0,2})$/.test(declaration.scale))
    );
  }

  function register(element) {
    if (!(element instanceof HTMLElement)) return null;
    const marker = element.closest(motionSelector);
    if (!marker) return null;
    let entry = byElement.get(element);
    if (!entry) {
      entry = {
        id: ++nextId,
        element,
        kind: marker.getAttribute("data-motion"),
        description: describe(element),
        visualMutations: 0,
        transientChanges: 0,
        samples: [],
      };
      byElement.set(element, entry);
      entries.push(entry);
    }
    return entry;
  }

  function scan(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(motionSelector)) register(node);
    node.querySelectorAll(motionSelector).forEach(register);
  }

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(scan);
        continue;
      }
      if (mutation.attributeName === "data-motion") {
        scan(mutation.target);
        continue;
      }
      if (mutation.attributeName !== "style") continue;
      const element = mutation.target;
      const entry = register(element);
      if (!entry) continue;
      const previous = mutation.oldValue || "";
      const current = element.getAttribute("style") || "";
      if (
        previous === current ||
        !/(^|;)\s*(opacity|visibility|transform|translate|scale|rotate)\s*:/.test(
          `${previous};${current}`,
        )
      )
        continue;
      entry.visualMutations++;
      if (transient(previous) || transient(current)) entry.transientChanges++;
      if (entry.samples.length < 12)
        entry.samples.push({
          at: Math.round(performance.now()),
          previous,
          current,
        });
    }
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ["style", "data-motion"],
  });
  if (document.documentElement) scan(document.documentElement);

  function targets() {
    return [
      ...new Set([
        ...document.querySelectorAll(motionSelector),
        ...entries
          .filter((entry) => entry.element.isConnected)
          .map((entry) => entry.element),
      ]),
    ];
  }

  function lenisRoots() {
    return [
      ...document.querySelectorAll(
        ".lenis, .lenis-smooth, .lenis-scrolling, .lenis-stopped",
      ),
    ];
  }

  function markers() {
    const wrapper = document.querySelector(
      "[data-motion-mode][data-smooth-scroll]",
    );
    return wrapper
      ? {
          motionMode: wrapper.getAttribute("data-motion-mode"),
          smoothScroll: wrapper.getAttribute("data-smooth-scroll"),
        }
      : null;
  }

  function trace() {
    return entries.map(({ element, ...entry }) => ({
      ...entry,
      connected: element.isConnected,
      appearance: element.isConnected ? appearance(element) : null,
      inline: element.isConnected ? inlineStyles(element) : null,
    }));
  }

  function state() {
    const scroller = document.scrollingElement || document.documentElement;
    return {
      markers: markers(),
      language: document.documentElement.lang,
      dark: document.documentElement.classList.contains("dark"),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      coarsePointer: matchMedia("(pointer: coarse)").matches,
      finePointer: matchMedia("(pointer: fine)").matches,
      hover: matchMedia("(hover: hover)").matches,
      lenisRoots: lenisRoots().map((element) => ({
        element: describe(element),
        classes: element.className,
      })),
      scrollY: scroller.scrollTop,
      maxScroll: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        document.body ? document.body.scrollWidth - innerWidth : 0,
      ),
      markerCounts: {
        intro: document.querySelectorAll('[data-motion="intro"]').length,
        reveal: document.querySelectorAll('[data-motion="reveal"]').length,
      },
      heading: document.querySelector("h1")
        ? appearance(document.querySelector("h1"))
        : null,
      animationStyles: targets().map((element) => ({
        element: describe(element),
        inline: inlineStyles(element),
        appearance: appearance(element),
        computedTransform: getComputedStyle(element).transform,
      })),
    };
  }

  function anchorTarget(selector) {
    const element = document.querySelector(selector);
    if (!element) return null;
    const scroller = document.scrollingElement || document.documentElement;
    const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
    const padding =
      parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
    return Math.max(
      0,
      Math.min(
        element.getBoundingClientRect().top +
          scroller.scrollTop -
          margin -
          padding,
        scroller.scrollHeight - scroller.clientHeight,
      ),
    );
  }

  function effect(element, pseudo = null) {
    const style = getComputedStyle(element, pseudo);
    return {
      backgroundImage: style.backgroundImage,
      backgroundColor: style.backgroundColor,
      boxShadow: style.boxShadow,
      transform: style.transform,
      translate: style.translate,
      scale: style.scale,
      color: style.color,
      filter: style.filter,
      content: pseudo ? style.content : null,
      opacity: style.opacity,
    };
  }

  function gradients() {
    return Object.fromEntries(
      [
        'main > section:first-child > div[aria-hidden="true"] > div[style*="linear-gradient"]',
        'main h1 [style*="--af-gradient-text"]',
      ].map((selector) => {
        const element = [...document.querySelectorAll(selector)].find(
          (candidate) => appearance(candidate).visible,
        );
        return [
          selector,
          element
            ? {
                element: describe(element),
                layers: {
                  self: effect(element),
                  before: effect(element, "::before"),
                  after: effect(element, "::after"),
                },
              }
            : null,
        ];
      }),
    );
  }

  function routeContent() {
    const heading = document.querySelector("main h1");
    return {
      href: location.href,
      pathname: location.pathname,
      fontsLoaded: document.fonts.status === "loaded",
      heading: heading ? {
        text: (heading.textContent || "").trim(),
        appearance: appearance(heading),
        transform: getComputedStyle(heading).transform,
        settled: settledTransform(heading),
      } : null,
      navigationControls: [...document.querySelectorAll("header a[href], header button")]
        .map((element) => ({
          name: element.getAttribute("aria-label") || (element.textContent || "").trim(),
          href: element.getAttribute("href"),
          disabled: element.matches(":disabled"),
          appearance: appearance(element),
        })),
    };
  }

  function focus() {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement) || element === document.body)
      return null;
    const style = getComputedStyle(element);
    const shown = appearance(element);
    const outline =
      parseFloat(style.outlineWidth) > 0 &&
      style.outlineStyle !== "none" &&
      !/^(transparent|rgba\([^)]*,\s*0(?:\.0*)?\))$/.test(style.outlineColor);
    const ring = style.getPropertyValue("--tw-ring-shadow").trim();
    const insetRing = style.getPropertyValue("--tw-inset-ring-shadow").trim();
    const visibleRing = [ring, insetRing].some(
      (value) =>
        value &&
        !/(#(?:[0-9a-f]{3})0|#(?:[0-9a-f]{6})00|transparent)\s*$/i.test(
          value,
        ) &&
        !/(rgba\([^)]*,\s*0(?:\.0*)?\)|\/\s*0(?:\.0*)?\))\s*$/.test(value),
    );
    return {
      element: describe(element),
      appearance: shown,
      focusVisible: element.matches(":focus-visible"),
      outline: {
        width: style.outlineWidth,
        style: style.outlineStyle,
        color: style.outlineColor,
      },
      boxShadow: style.boxShadow,
      ring,
      insetRing,
      usable:
        shown.inViewport &&
        shown.opacity >= 0.99 &&
        element.matches(":focus-visible") &&
        (outline || (visibleRing && style.boxShadow !== "none")),
    };
  }

  function wait(kind, args, key) {
    let valid = false;
    let fingerprint = "";
    const current = state();
    if (kind === "motion") {
      const nodes = targets();
      const visible = nodes.filter((element) => appearance(element).inViewport);
      valid =
        Boolean(current.markers) &&
        visible.length > 0 &&
        visible.every(
          (element) =>
            appearance(element).opacity >= 0.995 && settledTransform(element),
        );
      fingerprint = JSON.stringify(
        visible.map((element) => ({
          inline: inlineStyles(element),
          opacity: appearance(element).opacity,
          transform: getComputedStyle(element).transform,
        })),
      );
    } else if (kind === "route-content") {
      const content = routeContent();
      const heading = content.heading;
      const navigation = content.navigationControls.filter((control) =>
        (!args.navigationLabel || control.name === args.navigationLabel) &&
        !control.disabled && control.appearance.inViewport &&
        control.appearance.opacity >= 0.995);
      valid = content.pathname === args.pathname &&
        content.fontsLoaded &&
        current.language === args.locale &&
        current.dark === args.dark &&
        current.overflow <= 1 &&
        current.lenisRoots.length === 0 &&
        navigation.length > 0 &&
        Boolean(heading?.appearance.visible && heading.appearance.opacity >= 0.995 && heading.settled) &&
        (!args.heading || heading.text === args.heading) &&
        (!args.headingInViewport || heading.appearance.inViewport);
      fingerprint = JSON.stringify({ content, language: current.language, dark: current.dark, overflow: current.overflow });
    } else if (kind === "element-presentation") {
      const element = document.querySelector(args.selector);
      const shown = element ? appearance(element) : null;
      valid = Boolean(shown?.inViewport && shown.opacity >= 0.995 && settledTransform(element));
      fingerprint = JSON.stringify(element ? { shown, style: effect(element), inline: inlineStyles(element) } : null);
    } else if (kind === "scroll") {
      const delta = current.scrollY - args.before;
      const target = args.anchor ? anchorTarget(args.anchor) : args.target;
      valid =
        !document.querySelector(".lenis-scrolling") &&
        (target === undefined ||
          (target !== null && Math.abs(current.scrollY - target) <= 8)) &&
        (args.minimumDelta === undefined || delta >= args.minimumDelta);
      fingerprint = `${Math.round(current.scrollY * 10) / 10}`;
    } else if (kind === "reduced") {
      const clean = targets().every((element) =>
        Object.values(inlineStyles(element)).every((value) => value === ""),
      );
      const visible = targets().every((element) => {
        const shown = appearance(element);
        return (
          !shown.visible ||
          (shown.opacity >= 0.995 &&
            identity(getComputedStyle(element).transform))
        );
      });
      valid =
        current.reducedMotion &&
        current.lenisRoots.length === 0 &&
        clean &&
        visible &&
        current.markers?.motionMode !== args.before.motionMode &&
        current.markers?.smoothScroll !== args.before.smoothScroll &&
        current.scrollBehavior === "auto";
      fingerprint = JSON.stringify([current.markers, clean, visible]);
    } else if (kind === "active-transient") {
      valid =
        !current.reducedMotion &&
        current.lenisRoots.length > 0 &&
        targets().some((element) => transient(element.getAttribute("style")));
      return valid;
    } else if (kind === "focus") {
      const focused = focus();
      valid = Boolean(focused?.usable);
      fingerprint = JSON.stringify(focused);
    } else {
      throw new Error(`Unknown QA predicate: ${kind}`);
    }
    const previous = waits.get(key);
    const frames =
      valid && previous?.fingerprint === fingerprint ? previous.frames + 1 : 0;
    waits.set(key, { fingerprint, frames });
    return valid && frames >= 8;
  }

  window.__aureformMotionQA = {
    state,
    trace,
    gradients,
    routeContent,
    focus,
    effect,
    appearance,
    anchorTarget,
    wait,
    hoverContract,
  };
}

function serializeError(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
    stack: error?.stack || null,
  };
}

async function check(scenario, name, operation) {
  const result = {
    scenario: scenario.id,
    name,
    status: "running",
    startedAt: new Date().toISOString(),
  };
  report.checks.push(result);
  try {
    result.details = (await operation()) ?? null;
    result.status = "passed";
    return result.details;
  } catch (error) {
    result.status = "failed";
    result.error = serializeError(error);
    report.errors.push({
      scenario: scenario.id,
      check: name,
      ...result.error,
    });
    throw error;
  } finally {
    result.completedAt = new Date().toISOString();
  }
}

async function state(page) {
  return page.evaluate(() => window.__aureformMotionQA.state());
}

async function waitFor(page, kind, args = {}) {
  const key = `${kind}-${++waitSequence}`;
  if (noScriptPages.has(page)) {
    // Browser RAF callbacks are disabled with application scripting. Observe
    // native CSS scrolling from Node instead, using the same stable predicate.
    const deadline = Date.now() + predicateTimeout;
    while (Date.now() < deadline) {
      const settled = await page.evaluate(
        ({ kind, args, key }) =>
          window.__aureformMotionQA.wait(kind, args, key),
        { kind, args, key },
      );
      if (settled) return;
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    throw new Error(
      `No-script ${kind} did not settle within ${predicateTimeout}ms.`,
    );
  }
  await page.waitForFunction(
    ({ kind, args, key }) => window.__aureformMotionQA.wait(kind, args, key),
    { kind, args, key },
    { timeout: predicateTimeout, polling: "raf" },
  );
}

async function go(page, scenario, path = "") {
  const response = await page.goto(
    `${baseURL}/${scenario.locale}/${path ? `${path}/` : ""}`,
    { waitUntil: "networkidle", timeout: 30000 },
  );
  assert.equal(response?.status(), 200, "Route must return HTTP 200.");
  if (scenario.javaScriptEnabled === false) await page.evaluate(installProbe);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("h1").first().waitFor({ state: "visible" });
  if (!path)
    await page.locator(wrapperSelector).first().waitFor({ state: "attached" });
  const current = await state(page);
  assert.equal(current.language, scenario.locale);
  if (scenario.javaScriptEnabled !== false) {
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains("dark") === dark,
      scenario.theme === "dark",
      { timeout: predicateTimeout },
    );
  }
  await page.mouse.move(1, 1);
  if (!path) {
    await waitFor(page, "motion");
  } else {
    await waitFor(page, "route-content", {
      pathname: `/${scenario.locale}/${path}/`,
      locale: scenario.locale,
      dark: scenario.theme === "dark",
      headingInViewport: true,
    });
  }
  return state(page);
}

async function top(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  // Reset through actual wheel input so a still-settling Lenis wheel target
  // cannot overwrite the fixture's native Control+Home position.
  const current = await state(page);
  if (current.scrollY > 0.1) {
    const viewport = page.viewportSize();
    await page.mouse.move(Math.min(700, viewport.width / 2), Math.min(450, viewport.height / 2));
    await page.mouse.wheel(0, -(current.maxScroll + viewport.height) * 2);
  }
  await waitFor(page, "scroll", { before: 0, target: 0 });
}

async function wheel(page) {
  const before = await state(page);
  const available = before.maxScroll - before.scrollY;
  assert(available > 40, "The page must have room for a real wheel scroll.");
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, Math.min(640, available));
  await waitFor(page, "scroll", {
    before: before.scrollY,
    minimumDelta: Math.min(80, available / 2),
  });
  const after = await state(page);
  return { before, after, actualDelta: after.scrollY - before.scrollY };
}

async function settledDocumentURL(page, expectedURL) {
  const deadline = Date.now() + predicateTimeout;
  const samples = [];
  let stableObservations = 0;
  while (Date.now() < deadline) {
    const dom = await page.evaluate(() => ({
      href: location.href,
      hash: location.hash,
      timeOrigin: performance.timeOrigin,
    }));
    const playwrightURL = page.url();
    const sample = { ...dom, playwrightURL };
    samples.push(sample);
    stableObservations = dom.href === expectedURL && playwrightURL === expectedURL
      ? stableObservations + 1 : 0;
    if (stableObservations >= 8)
      return { expectedURL, stableObservations, samples };
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  throw new Error(
    `DOM and Playwright URLs did not settle at ${expectedURL}: ${JSON.stringify(samples.slice(-8))}`,
  );
}

async function anchor(page) {
  const before = await state(page);
  const links = await page.locator('a[href="#kit"]').count();
  // Version 1.1 retains the #kit destination but removed its navigation links.
  // Exercise actual native fragment navigation, and report the activation
  // honestly rather than injecting a link or claiming a nonexistent click.
  const beforeNavigation = await page.evaluate(() => ({
    href: location.href, timeOrigin: performance.timeOrigin,
  }));
  const cleanURL = new URL(beforeNavigation.href);
  cleanURL.hash = "";
  // The owner observed Next restore the cleared URL in both DOM and Playwright
  // after an immediate second fragment activation. Settle that reset first.
  if (beforeNavigation.href !== cleanURL.href)
    await page.evaluate((href) => history.replaceState(history.state, "", href), cleanURL.href);
  const cleared = await settledDocumentURL(page, cleanURL.href);
  await page.evaluate(() => { location.hash = "#kit"; });
  const targetURL = new URL(cleanURL.href);
  targetURL.hash = "#kit";
  const activated = await settledDocumentURL(page, targetURL.href);
  await waitFor(page, "scroll", { before: before.scrollY, anchor: "#kit" });
  await page.locator("#kit h2").first().waitFor({ state: "visible" });
  const after = await state(page);
  assert(
    new URL(page.url()).hash === "#kit",
    "Anchor must update the URL hash.",
  );
  const finalDOM = await page.evaluate(() => ({
    href: location.href, hash: location.hash, timeOrigin: performance.timeOrigin,
  }));
  assert.equal(finalDOM.hash, "#kit", "The DOM must retain the activated fragment.");
  assert.equal(finalDOM.href, page.url(), "DOM and Playwright URLs must agree.");
  assert.equal(finalDOM.timeOrigin, beforeNavigation.timeOrigin, "Fragment activation must retain the document.");
  assert(
    after.scrollY > before.scrollY + 40,
    "The anchor must move the page, not only change its hash.",
  );
  const heading = await page
    .locator("#kit h2")
    .first()
    .evaluate((element) => window.__aureformMotionQA.appearance(element));
  assert(heading.inViewport && heading.opacity >= 0.995);
  await waitFor(page, "motion");
  const target = await page.evaluate(() =>
    window.__aureformMotionQA.anchorTarget("#kit"),
  );
  return {
    activation: "native URL fragment",
    existingKitLinks: links,
    targetY: target,
    actualY: after.scrollY,
    heading,
    navigation: { beforeNavigation, cleared, activated, finalDOM, playwrightURL: page.url() },
  };
}

async function keyboardFocus(page) {
  await top(page);
  await page
    .locator("header")
    .locator(
      'a[href]:visible, button:not([disabled]):visible, [tabindex="0"]:visible',
    )
    .first()
    .focus();
  const focused = [];
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");
    await waitFor(page, "focus");
    focused.push(await page.evaluate(() => window.__aureformMotionQA.focus()));
  }
  assert(
    new Set(focused.map((entry) => entry.element)).size >= 4,
    "Tab must advance through usable controls.",
  );
  return focused;
}

function gradientImages(gradient) {
  if (!gradient) return [];
  return Object.entries(gradient.layers)
    .filter(
      ([layer, style]) =>
        layer === "self" ||
        (style.content !== "none" &&
          style.content !== "normal" &&
          Number(style.opacity) > 0),
    )
    .map(([layer, style]) => ({ layer, image: style.backgroundImage }));
}

async function themeGradients(page, scenario) {
  await top(page);
  const before = await page.evaluate(() =>
    window.__aureformMotionQA.gradients(),
  );
  for (const [selector, gradient] of Object.entries(before))
    assert(
      gradientImages(gradient).some((layer) => /gradient\(/.test(layer.image)),
      `${selector} must render a real gradient.`,
    );
  const button = page.getByRole("button", {
    name:
      scenario.locale === "es" ? "Cambiar tema de color" : "Toggle color theme",
    exact: true,
  });
  await button.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    scenario.theme !== "dark",
    { timeout: predicateTimeout },
  );
  const after = await page.evaluate(() =>
    window.__aureformMotionQA.gradients(),
  );
  for (const selector of Object.keys(before)) {
    assert(
      gradientImages(after[selector]).some((layer) =>
        /gradient\(/.test(layer.image),
      ),
      `${selector} must keep its gradient in the other theme.`,
    );
    assert.notDeepEqual(
      gradientImages(after[selector]),
      gradientImages(before[selector]),
      `${selector} must resolve different gradient colors in light/dark.`,
    );
  }
  await waitFor(page, "motion");
  await button.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains("dark") === dark,
    scenario.theme === "dark",
    { timeout: predicateTimeout },
  );
  return {
    beforeTheme: scenario.theme,
    before,
    after,
    restored: await state(page),
  };
}

async function hoverEffects(page, scenario) {
  // The 1.1 landing uses GlowBorder and SpotlightCard. The actual shared
  // af-hover-card contract is exercised on the template gallery.
  if (!(await page.locator(".af-hover-card").count()))
    await go(page, scenario, "templates");
  const card = page.locator(".af-hover-card").first();
  const button = page.locator(".af-button").first();
  assert((await card.count()) > 0, "A real card must use af-hover-card.");
  assert((await button.count()) > 0, "A real control must use af-button.");
  await card.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await waitFor(page, "element-presentation", { selector: ".af-hover-card" });
  const before = await card.evaluate((element) =>
    window.__aureformMotionQA.effect(element),
  );
  const configured = await card.evaluate((element) => window.__aureformMotionQA.hoverContract(element));
  assert.equal(configured.motion, "expressive", "Fresh 1.1 defaults must use expressive motion.");
  assert.equal(configured.hover, "glow", "Fresh 1.1 defaults must use glow hover.");
  assert.equal(configured.expectedLift, -4);
  assert.equal(configured.liftToken, "-4px");
  await card.hover();
  await page.waitForFunction(
    ({ selector, before }) => {
      const element = document.querySelector(selector);
      const current = window.__aureformMotionQA.effect(element);
      const contract = window.__aureformMotionQA.hoverContract(element);
      return contract.pureVerticalTranslation &&
        contract.inlineAnimationClean &&
        Math.abs(contract.actualLift - contract.expectedLift) <= 0.001 &&
        Number.parseFloat(contract.liftToken) === contract.expectedLift &&
        [
        "transform",
        "translate",
        "scale",
        "boxShadow",
        "backgroundColor",
      ].some((property) => current[property] !== before[property]);
    },
    { selector: ".af-hover-card", before },
    { timeout: predicateTimeout, polling: "raf" },
  );
  const after = await card.evaluate((element) => ({
    effect: window.__aureformMotionQA.effect(element),
    appearance: window.__aureformMotionQA.appearance(element),
    hoverContract: window.__aureformMotionQA.hoverContract(element),
  }));
  assert(after.appearance.visible && after.appearance.opacity >= 0.995);
  assert.equal(after.hoverContract.motion, "expressive");
  assert.equal(after.hoverContract.hover, "glow");
  assert(Math.abs(after.hoverContract.actualLift + 4) <= 0.001);
  assert(after.hoverContract.pureVerticalTranslation && after.hoverContract.inlineAnimationClean);
  const shadows = await page.evaluate(() =>
    [".af-shadow-soft", ".af-shadow-elevated"].map((selector) => ({
      selector,
      elements: [...document.querySelectorAll(selector)].map((element) => ({
        element: element.tagName.toLowerCase(),
        boxShadow: getComputedStyle(element).boxShadow,
      })),
    })),
  );
  for (const group of shadows)
    for (const element of group.elements)
      assert.notEqual(
        element.boxShadow,
        "none",
        `${group.selector} must resolve.`,
      );
  await page.mouse.move(1, 1);
  await waitFor(page, "element-presentation", { selector: ".af-hover-card" });
  return {
    route: page.url(),
    configured,
    before,
    after,
    shadows,
    unusedShadowClasses: shadows
      .filter((group) => !group.elements.length)
      .map((group) => group.selector),
  };
}

async function liveReducedMotion(page, scenario) {
  // Reload in the same context, then interrupt actual running intro styles.
  // This catches cleanup bugs that a preference set before navigation cannot.
  await top(page);
  await page.goto(`${baseURL}/${scenario.locale}/`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(wrapperSelector).first().waitFor({ state: "attached" });
  await waitFor(page, "active-transient");
  const running = await state(page);
  assert(running.markers?.motionMode && running.markers?.smoothScroll);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await waitFor(page, "reduced", { before: running.markers });
  const reduced = await state(page);
  assert.equal(reduced.lenisRoots.length, 0);
  assert(reduced.heading?.visible && reduced.heading.opacity >= 0.995);
  const nativeWheel = await wheel(page);
  assert.equal(nativeWheel.after.lenisRoots.length, 0);
  await top(page);
  await anchor(page);
  const stillReduced = await state(page);
  assert.equal(stillReduced.lenisRoots.length, 0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(
    () =>
      window.__aureformMotionQA.state().lenisRoots.length > 0 &&
      !window.__aureformMotionQA.state().reducedMotion,
    null,
    { timeout: predicateTimeout, polling: "raf" },
  );
  await waitFor(page, "motion");
  const resumed = await state(page);
  assert.equal(resumed.markers.motionMode, running.markers.motionMode);
  assert.equal(resumed.markers.smoothScroll, running.markers.smoothScroll);
  return { running, reduced, nativeWheel, stillReduced, resumed };
}

async function desktopLanding(page, scenario) {
  const initial = await check(scenario, "landing-ready", () =>
    go(page, scenario),
  );
  assert(
    initial.finePointer && initial.hover,
    "Desktop must emulate a fine pointer.",
  );
  await check(scenario, "lenis-running-and-gsap-intro-settled", async () => {
    await page.waitForFunction(
      () => window.__aureformMotionQA.state().lenisRoots.length > 0,
      null,
      { timeout: predicateTimeout },
    );
    const current = await state(page);
    const trace = await page.evaluate(() => window.__aureformMotionQA.trace());
    assert(current.markerCounts.intro > 0 && current.markerCounts.reveal > 0);
    assert(
      trace.some(
        (entry) => entry.kind === "intro" && entry.transientChanges > 0,
      ),
      "Observe real changing intro styles; markers alone do not prove animation.",
    );
    assert(current.heading?.inViewport && current.heading.opacity >= 0.995);
    return { current, trace };
  });
  await check(scenario, "landing-wheel-completes", () => wheel(page));
  await top(page);
  await check(scenario, "landing-native-url-fragment-completes", () =>
    anchor(page),
  );
  await check(scenario, "gsap-reveal-and-intro-run-once", async () => {
    const revealed = await page.evaluate(() =>
      window.__aureformMotionQA
        .trace()
        .filter(
          (entry) =>
            entry.kind === "reveal" &&
            entry.connected &&
            entry.appearance.inViewport &&
            entry.transientChanges > 0,
        ),
    );
    assert(revealed.length > 0, "A visible reveal must have animated.");
    const intro = await page.evaluate(() =>
      window.__aureformMotionQA
        .trace()
        .filter(
          (entry) => entry.kind === "intro" && entry.transientChanges > 0,
        ),
    );
    await top(page);
    await waitFor(page, "motion");
    await anchor(page);
    const after = await page.evaluate(() => window.__aureformMotionQA.trace());
    for (const entry of [...revealed, ...intro]) {
      const current = after.find((candidate) => candidate.id === entry.id);
      assert(current?.connected, "The animated node must remain mounted.");
      assert.equal(
        current.visualMutations,
        entry.visualMutations,
        `${entry.description}: scrolling back must not replay its animation.`,
      );
    }
    return { observed: [...revealed, ...intro], after };
  });
  await check(scenario, "keyboard-focus-visible-and-not-trapped", () =>
    keyboardFocus(page),
  );
  await check(scenario, "live-theme-gradients-and-keyboard-toggle", () =>
    themeGradients(page, scenario),
  );
  await check(scenario, "card-hover-and-applied-shadow-tokens", () =>
    hoverEffects(page, scenario),
  );
  await check(scenario, "live-reduced-motion-cleans-running-effects", () =>
    liveReducedMotion(page, scenario),
  );
}

async function mobileLanding(page, scenario) {
  await check(scenario, "coarse-pointer-landing-native-scroll", async () => {
    const current = await go(page, scenario);
    assert(current.coarsePointer && !current.finePointer && !current.hover);
    assert.equal(
      current.lenisRoots.length,
      0,
      "Touch must not initialize Lenis.",
    );
    return current;
  });
  const menu = page.locator("header").getByRole("button", {
    name: scenario.locale === "es" ? "Abrir navegación" : "Open navigation",
    exact: true,
  });
  const navigation = page.getByRole("navigation", {
    name: scenario.locale === "es" ? "Navegación móvil" : "Mobile navigation",
    exact: true,
  });
  await check(scenario, "touch-menu-toggle-and-native-fragment-usable", async () => {
    await menu.tap();
    await navigation.waitFor({ state: "visible" });
    const open = await state(page);
    assert(open.overflow <= 1);
    await menu.tap();
    await navigation.waitFor({ state: "hidden" });
    assert.equal(await menu.getAttribute("aria-expanded"), "false");
    const result = await anchor(page);
    assert.equal((await state(page)).lenisRoots.length, 0);
    return { open, anchor: result };
  });
  await check(scenario, "touch-menu-route-navigation-usable", async () => {
    await top(page);
    await menu.tap();
    await navigation.waitFor({ state: "visible" });
    const link = navigation.locator(`a[href="/${scenario.locale}/templates/"]`);
    const activatedLink = await link.evaluate((element) => ({
      href: element.getAttribute("href"),
      ...window.__aureformMotionQA.appearance(element),
    }));
    assert(activatedLink.inViewport && activatedLink.opacity >= 0.995,
      "The actual mobile Templates link must be readable in the viewport.");
    await link.tap();
    await page.waitForURL(`**/${scenario.locale}/templates/`);
    await page.locator("h1").first().waitFor({ state: "visible" });
    await navigation.waitFor({ state: "hidden" });
    await page.evaluate(() => document.fonts.ready);
    await waitFor(page, "route-content", {
      pathname: `/${scenario.locale}/templates/`,
      locale: scenario.locale,
      dark: scenario.theme === "dark",
      navigationLabel: scenario.locale === "es" ? "Abrir navegación" : "Open navigation",
      heading: scenario.locale === "es"
        ? "Un impulso para productos ambiciosos." : "A head start for ambitious products.",
    });
    const current = await state(page);
    assert.equal(current.lenisRoots.length, 0);
    assert.equal(current.language, scenario.locale);
    assert.equal(current.dark, scenario.theme === "dark");
    assert(current.overflow <= 1, "The navigated catalog must not overflow horizontally.");
    const content = await page.evaluate(() => window.__aureformMotionQA.routeContent());
    assert(content.heading?.appearance.visible && content.heading.appearance.opacity >= 0.995);
    assert.equal(new URL(page.url()).pathname, `/${scenario.locale}/templates/`);
    assert.equal(content.href, page.url(), "DOM and Playwright must agree on the actual catalog URL.");
    return {
      url: page.url(),
      current,
      activatedLink,
      content,
      readiness: { kind: "native-catalog-route-content", gsapEntranceAsserted: false },
    };
  });
}

async function dashboard(page, scenario) {
  await check(scenario, "dashboard-native-scroll-no-lenis", async () => {
    const initial = await go(page, scenario, "dashboard");
    assert.equal(initial.lenisRoots.length, 0);
    const result = await wheel(page);
    assert.equal(result.after.lenisRoots.length, 0);
    return { initial, ...result };
  });
  await check(
    scenario,
    "dashboard-keyboard-focus-and-native-page-down",
    async () => {
      const focused = await keyboardFocus(page);
      await top(page);
      const before = await state(page);
      await page.keyboard.press("PageDown");
      await waitFor(page, "scroll", {
        before: before.scrollY,
        minimumDelta: Math.min(80, before.maxScroll / 2),
      });
      const after = await state(page);
      assert.equal(after.lenisRoots.length, 0);
      return { focused, before, after };
    },
  );
}

async function noJavaScript(page, scenario) {
  await check(
    scenario,
    "server-content-visible-with-application-js-disabled",
    async () => {
      const current = await go(page, scenario);
      assert(current.heading?.visible && current.heading.opacity >= 0.995);
      assert.equal(current.lenisRoots.length, 0);
      const visible = await page
        .locator("main h1, main h2, main p")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            text: (element.textContent || "").trim().slice(0, 90),
            ...window.__aureformMotionQA.appearance(element),
          })),
        );
      assert(visible.length > 5, "Check meaningful server-rendered content.");
      for (const element of visible)
        assert(
          element.visible && element.opacity >= 0.995,
          `No-JS content must not be hidden: ${element.text}`,
        );
      for (const target of current.animationStyles)
        assert(
          Object.values(target.inline).every((value) => value === ""),
          `${target.element}: SSR must not ship animation-hidden inline styles.`,
        );
      return { current, content: visible };
    },
  );
  await check(scenario, "no-js-native-url-fragment-completes", () =>
    anchor(page),
  );
}

async function presentation(page) {
  return page.evaluate(() => {
    const heading = document.querySelector("h1");
    const hero = document.querySelector(
      'main > section:first-child > div[aria-hidden="true"] > div[style*="linear-gradient"]',
    );
    return {
      language: document.documentElement.lang,
      dark: document.documentElement.classList.contains("dark"),
      width: document.documentElement.clientWidth,
      heading: heading
        ? {
            text: heading.textContent,
            color: getComputedStyle(heading).color,
            fontFamily: getComputedStyle(heading).fontFamily,
            fontSize: getComputedStyle(heading).fontSize,
          }
        : null,
      heroBackground: hero ? getComputedStyle(hero).backgroundImage : null,
    };
  });
}

async function accessibleNoScriptSnapshot(page) {
  // Chromium suppresses the asynchronous iframe callbacks axe needs when
  // scripting is disabled. Keep the original page disabled; inspect a copy of
  // its rendered DOM with every application script removed instead.
  const before = await presentation(page);
  const snapshot = await page.evaluate(() => {
    const clone = document.documentElement.cloneNode(true);
    const scripts = clone.querySelectorAll(
      "script, link[as='script'], link[rel='modulepreload']",
    );
    const removedScripts = scripts.length;
    for (const node of scripts) node.remove();
    const base = document.createElement("base");
    base.href = location.href;
    clone.querySelector("head").prepend(base);
    return { html: "<!doctype html>" + clone.outerHTML, removedScripts };
  });
  const context = await browser.newContext({
    viewport: page.viewportSize(),
    javaScriptEnabled: true,
    colorScheme: before.dark ? "dark" : "light",
    reducedMotion: "no-preference",
  });
  openContexts.add(context);
  let blockedApplicationScripts = 0;
  const measurementErrors = [];
  try {
    await context.route("**/_next/**", async (route) => {
      if (route.request().resourceType() === "script") {
        blockedApplicationScripts++;
        await route.abort();
      } else {
        await route.continue();
      }
    });
    const measurement = await context.newPage();
    measurement.on("pageerror", (error) => measurementErrors.push({ type: "pageerror", message: error.message }));
    measurement.on("console", (message) => {
      if (message.type() === "error")
        measurementErrors.push({ type: "console", message: message.text() });
    });
    measurement.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText || "Request failed";
      const intentionallyBlocked = request.resourceType() === "script" &&
        new URL(request.url()).origin === new URL(baseURL).origin &&
        new URL(request.url()).pathname.startsWith("/_next/") &&
        /^(csp|net::ERR_BLOCKED_BY_CLIENT)$/i.test(failure);
      if (!intentionallyBlocked && !failure.includes("ERR_ABORTED"))
        measurementErrors.push({ type: "requestfailed", url: request.url(), message: failure });
    });
    measurement.on("response", (response) => {
      if (response.status() >= 400 && new URL(response.url()).origin === new URL(baseURL).origin)
        measurementErrors.push({ type: "http", url: response.url(), status: response.status() });
    });
    const snapshotURL = new URL(page.url());
    snapshotURL.searchParams.set("aureform-qa-snapshot", "motion-no-js");
    snapshotURL.hash = "";
    let servedObservedSnapshot = false;
    await measurement.route(snapshotURL.href, (route) => {
      servedObservedSnapshot = true;
      return route.fulfill({ status: 200, contentType: "text/html", body: snapshot.html });
    });
    const response = await measurement.goto(snapshotURL.href, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200);
    assert(servedObservedSnapshot, "Measure the intercepted observed DOM, including after fragment navigation.");
    const originalOrigin = new URL(page.url()).origin;
    const snapshotOrigin = await measurement.evaluate(() => location.origin);
    assert.equal(snapshotOrigin, originalOrigin, "The no-script measurement must retain the real resource origin.");
    await measurement.evaluate(() => document.fonts.ready);
    const copied = await presentation(measurement);
    assert.deepEqual(
      copied,
      before,
      "The no-script measurement must preserve presentation.",
    );
    const analysis = await new AxeBuilder({ page: measurement })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const original = await state(page);
    assert.equal(original.lenisRoots.length, 0);
    assert.equal(original.markers.motionMode, "static");
    assert.deepEqual(measurementErrors, [], "The script-free measurement must load its actual fonts and assets.");
    return {
      analysis,
      method: {
        kind: "script-free-copy-of-observed-ssr-dom",
        originalJavaScriptDisabled: true,
        removedScripts: snapshot.removedScripts,
        blockedApplicationScripts,
        presentationPreserved: true,
        originalOrigin,
        snapshotOrigin,
        snapshotURL: measurement.url(),
        servedObservedSnapshot,
        runtimeErrors: measurementErrors,
      },
    };
  } finally {
    await context.close();
    openContexts.delete(context);
  }
}

async function health(page, runtimeErrors, scenario) {
  const current = await state(page);
  const measurement =
    scenario.javaScriptEnabled === false
      ? await accessibleNoScriptSnapshot(page)
      : {
          analysis: await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze(),
          method: { kind: "original-page" },
        };
  const analysis = measurement.analysis;
  const seriousOrCritical = analysis.violations
    .filter((violation) => ["serious", "critical"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        failure: node.failureSummary,
      })),
    }));
  const details = {
    url: page.url(),
    current,
    seriousOrCritical,
    axeIncomplete: analysis.incomplete.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target),
    })),
    runtimeErrors: [...runtimeErrors],
    accessibilityMeasurement: measurement.method,
  };
  assert(
    current.overflow <= 1 &&
      seriousOrCritical.length === 0 &&
      runtimeErrors.length === 0,
    JSON.stringify(details, null, 2),
  );
  return details;
}

async function runScenario(spec, operation) {
  const scenario = {
    ...spec,
    id: `${spec.kind}-${spec.locale}-${spec.theme || "ssr-dark"}`,
    status: "running",
    startedAt: new Date().toISOString(),
    runtimeErrors: [],
    intentionallyBlockedScripts: [],
  };
  report.scenarios.push(scenario);
  let context;
  let page;
  try {
    context = await browser.newContext({
      viewport:
        spec.kind === "mobile"
          ? { width: 360, height: 800 }
          : { width: 1440, height: spec.kind === "dashboard" ? 720 : 900 },
      javaScriptEnabled: spec.javaScriptEnabled !== false,
      isMobile: spec.kind === "mobile",
      hasTouch: spec.kind === "mobile",
      reducedMotion: "no-preference",
      colorScheme: spec.theme || "light",
    });
    openContexts.add(context);
    context.setDefaultTimeout(predicateTimeout);
    context.setDefaultNavigationTimeout(30000);
    if (spec.javaScriptEnabled !== false) {
      await context.addInitScript(installProbe);
      await context.addInitScript((theme) => {
        localStorage.setItem("aureform:theme", theme);
      }, spec.theme);
    }
    page = await context.newPage();
    if (spec.javaScriptEnabled === false) noScriptPages.add(page);
    page.on("pageerror", (error) =>
      scenario.runtimeErrors.push({
        type: "pageerror",
        message: error.message,
      }),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        scenario.runtimeErrors.push({
          type: "console",
          message: message.text(),
          location: message.location(),
        });
    });
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText || "Request failed";
      if (failure.includes("ERR_ABORTED")) return;
      if (
        spec.javaScriptEnabled === false &&
        request.resourceType() === "script" &&
        new URL(request.url()).origin === new URL(baseURL).origin &&
        new URL(request.url()).pathname.startsWith("/_next/") &&
        /^(csp|net::ERR_BLOCKED_BY_CLIENT)$/i.test(failure)
      ) {
        scenario.intentionallyBlockedScripts.push({
          url: request.url(),
          reason: failure,
        });
        return;
      }
      scenario.runtimeErrors.push({
        type: "requestfailed",
        url: request.url(),
        message: failure,
      });
    });
    page.on("response", (response) => {
      if (
        response.status() >= 400 &&
        new URL(response.url()).origin === new URL(baseURL).origin
      )
        scenario.runtimeErrors.push({
          type: "http",
          url: response.url(),
          status: response.status(),
        });
    });
    await operation(page, scenario);
  } catch (error) {
    scenario.error = serializeError(error);
    if (!report.errors.some((entry) => entry.scenario === scenario.id))
      report.errors.push({
        scenario: scenario.id,
        check: "scenario",
        ...scenario.error,
      });
    if (page) {
      scenario.diagnostics = await state(page).catch((diagnosticError) => ({
        unavailable: diagnosticError.message,
      }));
    }
  } finally {
    if (page && !page.isClosed()) {
      try {
        await check(scenario, "overflow-accessibility-and-runtime-errors", () =>
          health(page, scenario.runtimeErrors, scenario),
        );
      } catch {
        // The check already records the exact failure. Continue other scenarios.
      }
    }
    if (context) {
      try {
        await context.close();
        openContexts.delete(context);
      } catch (error) {
        report.errors.push({
          scenario: scenario.id,
          check: "context-close",
          ...serializeError(error),
        });
      }
    }
    if (
      scenario.runtimeErrors.length > 0 &&
      !report.errors.some(
        (entry) =>
          entry.scenario === scenario.id &&
          entry.check === "overflow-accessibility-and-runtime-errors",
      )
    )
      report.errors.push({
        scenario: scenario.id,
        check: "late-runtime-errors",
        name: "Error",
        message: JSON.stringify(scenario.runtimeErrors),
      });
    scenario.status = report.errors.some(
      (entry) => entry.scenario === scenario.id,
    )
      ? "failed"
      : "passed";
    scenario.completedAt = new Date().toISOString();
    await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
    console.log(`${scenario.id}: ${scenario.status}`);
  }
}

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
try {
  browser = await chromium.launch({
    executablePath,
    args: ["--no-sandbox"],
  });
  report.browserVersion = browser.version();
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      await runScenario(
        { kind: "desktop-landing", locale, theme },
        desktopLanding,
      );
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      await runScenario({ kind: "mobile", locale, theme }, mobileLanding);
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      await runScenario({ kind: "dashboard", locale, theme }, dashboard);
  for (const locale of ["en", "es"])
    await runScenario(
      { kind: "no-js", locale, theme: "dark", javaScriptEnabled: false },
      noJavaScript,
    );
} catch (error) {
  report.errors.push({ check: "suite", ...serializeError(error) });
} finally {
  for (const context of openContexts) {
    try {
      await context.close();
    } catch (error) {
      report.errors.push({
        check: "final-context-close",
        ...serializeError(error),
      });
    }
  }
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      report.errors.push({ check: "browser-close", ...serializeError(error) });
    }
  }
  report.status = report.errors.length === 0 ? "passed" : "failed";
  report.completedAt = new Date().toISOString();
  report.completedSourceFingerprints = await sourceFingerprints();
  report.sourceIntegrity = { unchanged: JSON.stringify(report.completedSourceFingerprints) === JSON.stringify(report.sourceFingerprints) };
  if (!report.sourceIntegrity.unchanged) {
    report.status = "failed";
    report.errors.push({ check: "source-integrity", message: "QA source changed during browser verification." });
  }
  report.summary = {
    scenarios: report.scenarios.length,
    plannedScenarios: 14,
    passedScenarios: report.scenarios.filter(
      (scenario) => scenario.status === "passed",
    ).length,
    failedScenarios: report.scenarios.filter(
      (scenario) => scenario.status === "failed",
    ).length,
    checks: report.checks.length,
    passedChecks: report.checks.filter((result) => result.status === "passed")
      .length,
    failedChecks: report.checks.filter((result) => result.status === "failed")
      .length,
    errors: report.errors.length,
  };
  if (report.scenarios.length !== report.summary.plannedScenarios) {
    report.status = "failed";
    report.errors.push({
      check: "suite-completeness",
      message: `Executed ${report.scenarios.length}/${report.summary.plannedScenarios} scenarios.`,
    });
    report.summary.errors = report.errors.length;
  }
  report.browserRuntimeTested = report.scenarios.length > 0;
  report.releaseVerified = report.status === "passed" && report.sourceIntegrity.unchanged;
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
}

console.log(
  JSON.stringify({ status: report.status, ...report.summary, reportPath }),
);
if (report.status !== "passed")
  throw new Error(`Motion verification failed with ${report.errors.length} recorded errors. See ${reportPath}.`);
