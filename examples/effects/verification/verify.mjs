import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  root,
  installed,
  browserBundle,
  serverModule,
  staticChecks,
  verificationCss,
} from "./support.mjs";
import { runtimeChecks } from "./runtime.mjs";

const artifacts = process.env.AUREFORM_EFFECTS_ARTIFACTS
  ? resolve(process.env.AUREFORM_EFFECTS_ARTIFACTS)
  : resolve(root, "examples/effects/verification/artifacts");
const harnessFile = resolve(root, "examples/effects/verification/harness.tsx");
const results = [];
const browsers = [];

async function check(name, operation) {
  const started = performance.now();
  try {
    const detail = await operation();
    results.push({
      name,
      passed: true,
      milliseconds: Math.round(performance.now() - started),
      detail,
    });
    console.log(`PASS ${name}`);
    return detail;
  } catch (error) {
    results.push({
      name,
      passed: false,
      milliseconds: Math.round(performance.now() - started),
      error: String(error.stack ?? error),
    });
    console.error(`FAIL ${name}\n${error.stack ?? error}`);
    throw error;
  }
}

function installProbe(options = {}) {
  const stats = {
    gpuAttempts: 0,
    gpuContexts: 0,
    draws: 0,
    captureCalls: 0,
    pendingRaf: new Set(),
    pendingIdle: new Set(),
    observers: new Set(),
    listeners: new Map(),
    programs: new Map(),
    shaders: new Map(),
    arrays: new Map(),
    uniforms: {},
    samples: {},
    pointerTimes: [],
  };
  window.afxStats = stats;
  const setProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
    if (name === "--afx-pointer-x" && value !== "50%")
      stats.pointerTimes.push(performance.now());
    return setProperty.call(this, name, value, priority);
  };
  const request = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    const id = request((time) => {
      stats.pendingRaf.delete(id);
      callback(time);
    });
    stats.pendingRaf.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    stats.pendingRaf.delete(id);
    cancel(id);
  };
  if (window.requestIdleCallback) {
    const idle = window.requestIdleCallback.bind(window);
    const cancelIdle = window.cancelIdleCallback.bind(window);
    const held = new Map();
    let nextHeld = 1;
    window.requestIdleCallback = (callback, settings) => {
      if (options.holdIdle) {
        const id = nextHeld++;
        held.set(id, callback);
        stats.pendingIdle.add(id);
        return id;
      }
      const id = idle((deadline) => {
        stats.pendingIdle.delete(id);
        callback(deadline);
      }, settings);
      stats.pendingIdle.add(id);
      return id;
    };
    window.cancelIdleCallback = (id) => {
      stats.pendingIdle.delete(id);
      if (options.holdIdle) held.delete(id);
      else cancelIdle(id);
    };
    window.afxReleaseIdle = () => {
      for (const [id, callback] of held) {
        held.delete(id);
        stats.pendingIdle.delete(id);
        callback({ didTimeout: false, timeRemaining: () => 50 });
      }
    };
  }
  for (const name of [
    "IntersectionObserver",
    "ResizeObserver",
    "MutationObserver",
  ]) {
    const Original = window[name];
    if (!Original) continue;
    window[name] = class extends Original {
      constructor(...args) {
        super(...args);
        this.afxObserverDetails = { name, stack: new Error().stack };
      }
      observe(...args) {
        // Playwright and axe keep their own observers after inspection. The
        // harness application is served from bundle.js; count its owners only.
        if (this.afxObserverDetails.stack?.includes("/bundle.js:")) {
          stats.observers.add(this);
        }
        return super.observe(...args);
      }
      disconnect() {
        stats.observers.delete(this);
        return super.disconnect();
      }
    };
  }
  const ownedNames = new Set([
    "report",
    "measureView",
    "move",
    "reset",
    "focus",
    "resize",
    "contextLost",
    "contextRestored",
  ]);
  const ids = new WeakMap();
  let nextId = 1;
  const idOf = (value) => {
    if (!ids.has(value)) ids.set(value, nextId++);
    return ids.get(value);
  };
  const keyOf = (target, type, callback, settings) =>
    `${idOf(target)}:${type}:${idOf(callback)}:${typeof settings === "boolean" ? settings : Boolean(settings?.capture)}`;
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, callback, settings) {
    if (typeof callback === "function" && ownedNames.has(callback.name)) {
      stats.listeners.set(keyOf(this, type, callback, settings), callback.name);
    }
    return add.call(this, type, callback, settings);
  };
  EventTarget.prototype.removeEventListener = function (
    type,
    callback,
    settings,
  ) {
    if (typeof callback === "function" && ownedNames.has(callback.name)) {
      stats.listeners.delete(keyOf(this, type, callback, settings));
    }
    return remove.call(this, type, callback, settings);
  };
  if (Element.prototype.setPointerCapture) {
    const capture = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = function (...args) {
      stats.captureCalls += 1;
      return capture.apply(this, args);
    };
  }
  const getContext = HTMLCanvasElement.prototype.getContext;
  const contexts = new WeakSet();
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (type === "webgl2") {
      stats.gpuAttempts += 1;
      if (options.noWebGL) return null;
    }
    const context = getContext.call(this, type, ...args);
    if (type === "webgl2" && context && !contexts.has(context)) {
      contexts.add(context);
      stats.gpuContexts += 1;
    }
    return context;
  };
  const proto = window.WebGL2RenderingContext?.prototype;
  if (!proto) return;
  for (const [createName, deleteName, field] of [
    ["createProgram", "deleteProgram", "programs"],
    ["createShader", "deleteShader", "shaders"],
    ["createVertexArray", "deleteVertexArray", "arrays"],
  ]) {
    const create = proto[createName];
    const dispose = proto[deleteName];
    proto[createName] = function (...args) {
      const resource = create.apply(this, args);
      if (resource) stats[field].set(resource, this);
      return resource;
    };
    proto[deleteName] = function (resource) {
      stats[field].delete(resource);
      return dispose.call(this, resource);
    };
  }
  if (options.compileFailure) {
    const parameter = proto.getShaderParameter;
    proto.getShaderParameter = function (shader, property) {
      return property === this.COMPILE_STATUS
        ? false
        : parameter.call(this, shader, property);
    };
  }
  const names = new WeakMap();
  const location = proto.getUniformLocation;
  proto.getUniformLocation = function (program, name) {
    const result = location.call(this, program, name);
    if (result) names.set(result, name);
    return result;
  };
  const uniform = proto.uniform3fv;
  proto.uniform3fv = function (location, values, ...args) {
    const kind = this.canvas.dataset.shaderKind;
    stats.uniforms[kind] ??= {};
    stats.uniforms[kind][names.get(location)] = Array.from(values);
    return uniform.call(this, location, values, ...args);
  };
  const draw = proto.drawArrays;
  const perCanvas = new WeakMap();
  proto.drawArrays = function (...args) {
    const result = draw.apply(this, args);
    stats.draws += 1;
    const count = (perCanvas.get(this.canvas) ?? 0) + 1;
    perCanvas.set(this.canvas, count);
    if (count === 1 || count % 30 === 0) {
      const pixels = [];
      for (const y of [0.2, 0.5, 0.8]) {
        for (const x of [0.15, 0.35, 0.55, 0.75, 0.9]) {
          const pixel = new Uint8Array(4);
          this.readPixels(
            Math.floor((this.drawingBufferWidth - 1) * x),
            Math.floor((this.drawingBufferHeight - 1) * y),
            1,
            1,
            this.RGBA,
            this.UNSIGNED_BYTE,
            pixel,
          );
          pixels.push(Array.from(pixel));
        }
      }
      stats.samples[this.canvas.dataset.shaderKind] = pixels;
    }
    return result;
  };
  document.addEventListener(
    "webglcontextlost",
    (event) => {
      for (const resources of [stats.programs, stats.shaders, stats.arrays]) {
        for (const [resource, context] of resources) {
          if (context.canvas === event.target) resources.delete(resource);
        }
      }
    },
    true,
  );
}

function snapshot(page) {
  return page.evaluate(() => {
    const stats = window.afxStats;
    return {
      gpuAttempts: stats.gpuAttempts,
      gpuContexts: stats.gpuContexts,
      draws: stats.draws,
      captureCalls: stats.captureCalls,
      raf: stats.pendingRaf.size,
      idle: stats.pendingIdle.size,
      observers: stats.observers.size,
      observerDetails: [...stats.observers].map(
        (observer) => observer.afxObserverDetails,
      ),
      listeners: stats.listeners.size,
      programs: stats.programs.size,
      shaders: stats.shaders.size,
      arrays: stats.arrays.size,
      uniforms: stats.uniforms,
      samples: stats.samples,
      pointerTimes: stats.pointerTimes,
    };
  });
}

async function state(page, expected) {
  await page.waitForFunction(
    (value) =>
      document
        .querySelector('[data-slot="shader-background"]')
        ?.getAttribute("data-shader-state") === value,
    expected,
    { timeout: 10000 },
  );
}

function patch(page, value) {
  return page.evaluate((next) => window.afxHarness.patchShader(next), value);
}

async function assertStopped(page) {
  await page.waitForTimeout(80);
  const before = await snapshot(page);
  await page.waitForTimeout(250);
  const after = await snapshot(page);
  assert.equal(after.draws, before.draws, "GPU draw count must stop");
  assert.equal(after.raf, 0, "No owned RAF should remain");
}

async function assertCleanup(page) {
  await page.evaluate(() => window.afxHarness.setMounted(false));
  await page.waitForTimeout(100);
  const after = await snapshot(page);
  for (const field of [
    "raf",
    "idle",
    "observers",
    "listeners",
    "programs",
    "shaders",
    "arrays",
  ]) {
    assert.equal(
      after[field],
      0,
      `Cleanup must release ${field}${field === "observers" ? ": " + JSON.stringify(after.observerDetails) : ""}`,
    );
  }
  assert.equal(after.captureCalls, 0, "Effects must never capture a pointer");
  return after;
}

await mkdir(artifacts, { recursive: true });
let server;
let browser;
try {
  await check("TypeScript and Next/React lint, bounded files", staticChecks);
  await check("Actual draw spacing, quick resume and setup failure cleanup", runtimeChecks);
  await check("Registry CSS and lazy GLSL dependency closure", async () => {
    const { dependencyClosure } = await import(
      resolve(root, "scripts/lib/source-graph.mjs")
    );
    const names = [
      "gradient-background",
      "shader-background",
      "spotlight-card",
      "glow-border",
      "tilt-card",
      "magnetic-button",
    ];
    return Promise.all(
      names.map(async (name) => {
        const graph = await dependencyClosure([
          `src/components/effects/${name}.tsx`,
        ]);
        assert(graph.files.includes("src/components/effects/effects.css"));
        assert.equal(
          graph.files.includes("src/components/effects/shaders.ts"),
          name === "shader-background",
        );
        return { name, files: graph.files.length, css: true };
      }),
    );
  });
  const React = installed("react");
  const { renderToString } = installed("react-dom/server");
  const effects = await serverModule(
    resolve(root, "src/components/effects/index.ts"),
  );
  const Harness = (await serverModule(harnessFile)).default;
  await check("SSR defaults without window, document or provider", () => {
    assert.equal(typeof globalThis.window, "undefined");
    const names = [
      "GradientBackground",
      "ShaderBackground",
      "SpotlightCard",
      "GlowBorder",
      "TiltCard",
      "MagneticButton",
    ];
    for (const name of names) {
      const html = renderToString(
        React.createElement(effects[name], {}, `Default ${name}`),
      );
      assert(html.includes(`Default ${name}`));
      if (name === "ShaderBackground") {
        assert(html.includes('aria-hidden="true"'));
        assert(html.includes("radial-gradient"));
      }
    }
    const none = renderToString(
      React.createElement(effects.ShaderBackground, { kind: "none" }, "Still"),
    );
    assert(!none.includes("<canvas"));
    return names;
  });
  const entry = `
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import Harness from "./harness";
const mode = new URLSearchParams(location.search).get("mode") || "shader";
hydrateRoot(document.getElementById("root"), <StrictMode><Harness mode={mode} /></StrictMode>);
`;
  const [bundle, css] = await Promise.all([
    browserBundle(
      resolve(root, "examples/effects/verification/entry.tsx"),
      entry,
    ),
    verificationCss(),
  ]);
  server = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/bundle.js") {
      response.writeHead(200, { "content-type": "application/javascript" });
      response.end(bundle);
    } else if (url.pathname === "/verify.css") {
      response.writeHead(200, { "content-type": "text/css" });
      response.end(css);
    } else if (url.pathname === "/favicon.ico") {
      response.writeHead(204);
      response.end();
    } else {
      const mode = url.searchParams.get("mode") || "shader";
      const html = renderToString(
        React.createElement(
          React.StrictMode,
          {},
          React.createElement(Harness, { mode }),
        ),
      );
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aureform effects verification</title><link rel="stylesheet" href="/verify.css"></head><body><div id="root">${html}</div><script src="/bundle.js"></script></body></html>`,
      );
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { chromium, firefox, webkit } = installed("@playwright/test");
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  browsers.push({
    name: "Chromium",
    version: browser.version(),
    backend: "ANGLE SwiftShader (software WebGL2)",
  });
  const contexts = [];
  async function pageFor(mode = "shader", probe = {}, settings = {}) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 960 },
      reducedMotion: "no-preference",
      ...settings,
    });
    contexts.push(context);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.afxErrors = errors;
    await page.addInitScript(installProbe, probe);
    await page.goto(`${base}/?mode=${mode}`);
    await page.waitForFunction(() => Boolean(window.afxHarness));
    return page;
  }

  const page = await pageFor();
  await check(
    "All original GLSL kinds compile, draw distinct visible color and cap at 30 Hz",
    async () => {
      const signatures = [];
      for (const kind of ["aurora", "waves", "iridescent"]) {
        await patch(page, { kind });
        await state(page, "running");
        const started = performance.now();
        const before = await snapshot(page);
        await page.waitForTimeout(1250);
        const after = await snapshot(page);
        const elapsed = performance.now() - started;
        assert(after.draws > before.draws + 4);
        assert(
          after.draws - before.draws <= Math.ceil((elapsed / 1000) * 30) + 1,
        );
        const pixels = after.samples[kind];
        const channels = pixels.flatMap((pixel) => pixel.slice(0, 3));
        assert(
          Math.max(...channels) > 60,
          "Shader must contain visibly luminous color",
        );
        assert(
          Math.max(...channels) - Math.min(...channels) > 25,
          "Shader must have spatial/color variation",
        );
        signatures.push(
          pixels.map((pixel) => pixel.slice(0, 3).join(",")).join(";"),
        );
        const metadata = await page.locator("canvas").evaluate((canvas) => ({
          decorative: canvas.getAttribute("aria-hidden"),
          kind: canvas.dataset.shaderKind,
          frame: Number(canvas.dataset.shaderFrame),
          pixels: canvas.width * canvas.height,
          dimension: Math.max(canvas.width, canvas.height),
        }));
        assert.equal(metadata.decorative, "true");
        assert.equal(metadata.kind, kind);
        assert(
          metadata.frame > 0 &&
            metadata.pixels <= 1_300_000 &&
            metadata.dimension <= 2048,
        );
        await page.screenshot({ path: resolve(artifacts, `${kind}.png`) });
      }
      assert.equal(new Set(signatures).size, 3);
      assert.deepEqual(page.afxErrors, []);
      return {
        kinds: 3,
        cap: 30,
        signatures: "distinct",
        screenshots: ["aurora.png", "waves.png", "iridescent.png"],
      };
    },
  );
  await check("Pause, zero speed and none stop GPU work", async () => {
    await patch(page, { paused: true });
    await state(page, "paused");
    await assertStopped(page);
    await patch(page, { paused: false, speed: 0 });
    await state(page, "paused");
    await assertStopped(page);
    await patch(page, { speed: 0.2 });
    await state(page, "running");
    await patch(page, { kind: "none" });
    await state(page, "off");
    assert.equal(await page.locator("canvas").count(), 0);
    await assertStopped(page);
    await patch(page, { kind: "aurora" });
    await state(page, "running");
  });
  await check("Pending idle work cancels when eligibility changes", async () => {
    const held = await pageFor("shader", { holdIdle: true });
    await state(held, "loading");
    assert.equal((await snapshot(held)).idle, 1);
    assert(
      (await snapshot(held)).observers >= 3,
      "The probe must track the application's intersection, resize and motion observers",
    );
    assert.equal((await snapshot(held)).gpuAttempts, 0);
    await patch(held, { paused: true });
    await state(held, "paused");
    assert.equal((await snapshot(held)).idle, 0);
    await held.evaluate(() => window.afxReleaseIdle());
    assert.equal((await snapshot(held)).gpuAttempts, 0);
    await patch(held, { paused: false });
    await state(held, "loading");
    assert.equal((await snapshot(held)).idle, 1);
    await held.evaluate(() => window.afxReleaseIdle());
    await state(held, "running");
    await assertCleanup(held);
    assert.deepEqual(held.afxErrors, []);
  });
  await check("Every dormant gate avoids initial GPU allocation", async () => {
    for (const gate of ["paused", "speed", "intensity", "scope", "offscreen", "hidden"]) {
      const dormant = await pageFor("shader", {}, { reducedMotion: "reduce" });
      await state(dormant, "off");
      if (gate === "paused") await patch(dormant, { paused: true });
      if (gate === "speed") await patch(dormant, { speed: 0 });
      if (gate === "intensity") await patch(dormant, { intensity: 0 });
      if (gate === "scope")
        await dormant.evaluate(() => window.afxHarness.setScope({ motion: "off" }));
      if (gate === "offscreen")
        await dormant.evaluate(() => {
          document.body.style.minHeight = "2400px";
          window.scrollTo(0, 1400);
        });
      if (gate === "hidden")
        await dormant.getByTestId("scope").evaluate((element) => {
          element.style.visibility = "hidden";
        });
      await dormant.waitForTimeout(80);
      await dormant.emulateMedia({ reducedMotion: "no-preference" });
      await state(dormant, gate === "intensity" || gate === "scope" ? "off" : "paused");
      await assertStopped(dormant);
      assert.equal((await snapshot(dormant)).gpuAttempts, 0, gate);
      await assertCleanup(dormant);
      assert.deepEqual(dormant.afxErrors, []);
    }
    return { initialGpuAttempts: 0, gates: 6 };
  });
  await check("CSS-hidden hosts pause and dormant resize preserves the buffer", async () => {
    await patch(page, { paused: true });
    await state(page, "paused");
    const before = await page.locator("canvas").evaluate((canvas) => ({
      width: canvas.width,
      height: canvas.height,
      frame: Number(canvas.dataset.shaderFrame),
    }));
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(100);
    const dormant = await page.locator("canvas").evaluate((canvas) => ({
      width: canvas.width,
      height: canvas.height,
      frame: Number(canvas.dataset.shaderFrame),
    }));
    assert.equal(dormant.width, before.width);
    assert.equal(dormant.height, before.height);
    assert.equal(dormant.frame, before.frame);
    await patch(page, { paused: false });
    await state(page, "running");
    const resumed = await page.locator("canvas").evaluate((canvas) => canvas.width);
    assert(resumed < before.width);
    const host = page.locator('[data-slot="shader-background"]');
    for (const css of ["visibility:hidden", "opacity:0", "content-visibility:hidden", "display:none"]) {
      await host.evaluate((element, style) => {
        element.style.cssText += `;${style}`;
      }, css);
      try {
        await state(page, "paused");
      } catch (error) {
        const observed = await host.evaluate((element) => ({
          state: element.dataset.shaderState,
          inline: element.style.cssText,
          nativeVisible: element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
            contentVisibilityAuto: true,
          }),
          currentVisible: element.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
            contentVisibilityAuto: true,
          }),
        }));
        throw new Error(`CSS ${css}: ${JSON.stringify(observed)}`, {
          cause: error,
        });
      }
      await assertStopped(page);
      await host.evaluate((element) => {
        for (const property of ["visibility", "opacity", "content-visibility", "display"])
          element.style.removeProperty(property);
      });
      await state(page, "running");
    }
    await page.getByTestId("scope").evaluate((element) => {
      element.hidden = true;
    });
    await state(page, "paused");
    await assertStopped(page);
    await page.getByTestId("scope").evaluate((element) => {
      element.hidden = false;
    });
    await state(page, "running");
    await page.setViewportSize({ width: 1280, height: 960 });
    await state(page, "running");
  });
  await check(
    "Offscreen and simulated visibility-change suspend and resume RAF",
    async () => {
      await page.evaluate(() => {
        document.body.style.minHeight = "2400px";
        window.scrollTo(0, 1400);
      });
      await state(page, "paused");
      await assertStopped(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await state(page, "running");
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "hidden",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await state(page, "paused");
      await assertStopped(page);
      await page.evaluate(() => {
        delete document.visibilityState;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await state(page, "running");
      return {
        hiddenDocument: "visibilityState and visibilitychange simulated",
      };
    },
  );
  await check(
    "Root and closest scope motion plus appearance event and scoped colors",
    async () => {
      await page.evaluate(() => {
        document.documentElement.dataset.motionLevel = "off";
        window.dispatchEvent(new Event("aureform:appearance-change"));
      });
      await state(page, "off");
      await assertStopped(page);
      await page.evaluate(() =>
        window.afxHarness.setScope({
          motion: "gentle",
          colors: ["#f97316", "#ec4899", "#3b82f6"],
        }),
      );
      await state(page, "running");
      await page.waitForTimeout(80);
      const colors = (await snapshot(page)).uniforms.aurora;
      assert(Math.abs(colors.uColorA[0] - 249 / 255) < 0.001);
      assert(Math.abs(colors.uColorB[1] - 72 / 255) < 0.001);
      assert(Math.abs(colors.uColorC[2] - 246 / 255) < 0.001);
      await page.evaluate(() => window.afxHarness.setScope({ motion: "off" }));
      await state(page, "off");
      await assertStopped(page);
      await page.evaluate(() => {
        delete document.documentElement.dataset.motionLevel;
        window.afxHarness.setScope({});
      });
      await state(page, "running");
    },
  );
  await check(
    "Reduced motion starts with zero GPU allocation and responds live",
    async () => {
      const reduced = await pageFor("shader", {}, { reducedMotion: "reduce" });
      await state(reduced, "off");
      await assertStopped(reduced);
      assert.equal((await snapshot(reduced)).gpuAttempts, 0);
      await reduced.screenshot({
        path: resolve(artifacts, "reduced-motion.png"),
      });
      await reduced.emulateMedia({ reducedMotion: "no-preference" });
      await state(reduced, "running");
      await reduced.emulateMedia({ reducedMotion: "reduce" });
      await state(reduced, "off");
      await assertStopped(reduced);
      await assertCleanup(reduced);
      assert.deepEqual(reduced.afxErrors, []);
    },
  );
  await check(
    "Missing WebGL2 and compilation failure retain a visible CSS field",
    async () => {
      for (const probe of [{ noWebGL: true }, { compileFailure: true }]) {
        const fallback = await pageFor("shader", probe);
        await state(fallback, "fallback");
        await fallback.waitForTimeout(200);
        const visual = await fallback
          .locator(".afx-background-field")
          .evaluate((field) => ({
            image: getComputedStyle(field).backgroundImage,
            opacity: Number(getComputedStyle(field).opacity),
            height: field.getBoundingClientRect().height,
          }));
        assert(
          visual.image.includes("radial-gradient") &&
            visual.opacity > 0.4 &&
            visual.height > 200,
        );
        assert.equal((await snapshot(fallback)).draws, 0);
        await fallback.screenshot({
          path: resolve(
            artifacts,
            probe.noWebGL ? "no-webgl.png" : "compile-fallback.png",
          ),
        });
        await assertCleanup(fallback);
        assert.deepEqual(fallback.afxErrors, []);
      }
    },
  );
  await check("Forced colors starts without a GPU context", async () => {
    const forced = await pageFor("shader", {}, { forcedColors: "active" });
    await state(forced, "off");
    await assertStopped(forced);
    assert.equal((await snapshot(forced)).gpuAttempts, 0);
    assert.equal(
      await forced.locator(".afx-background-field").evaluate((element) => getComputedStyle(element).display),
      "none",
    );
    await assertCleanup(forced);
    assert.deepEqual(forced.afxErrors, []);
  });
  await check(
    "Real WebGL context loss falls back and restoration rebuilds",
    async () => {
      const supported = await page.locator("canvas").evaluate((canvas) => {
        const gl = canvas.getContext("webgl2");
        const extension = gl.getExtension("WEBGL_lose_context");
        if (!extension) return false;
        window.afxRestore = () => extension.restoreContext();
        extension.loseContext();
        return true;
      });
      assert(
        supported,
        "SwiftShader must support WEBGL_lose_context for this check",
      );
      await state(page, "fallback");
      await assertStopped(page);
      await page.screenshot({ path: resolve(artifacts, "context-loss.png") });
      await page.evaluate(() => window.afxRestore());
      await state(page, "running");
      assert((await snapshot(page)).programs === 1);
    },
  );
  await check(
    "Strict Mode, unmount/remount and pending lazy initialization clean up",
    async () => {
      await assertCleanup(page);
      for (let cycle = 0; cycle < 3; cycle++) {
        await page.evaluate(() => window.afxHarness.setMounted(true));
        await state(page, "running");
        await assertCleanup(page);
      }
      const idle = await pageFor("shader", {}, { reducedMotion: "reduce" });
      await idle.emulateMedia({ reducedMotion: "no-preference" });
      await idle.evaluate(() => window.afxHarness.setMounted(false));
      await assertCleanup(idle);
      return { remounts: 3, strictMode: true, resourcesAfterUnmount: 0 };
    },
  );
  await check(
    "Semantic composition, fine-pointer effects, keyboard cues and no capture",
    async () => {
      const interactions = await pageFor("interactions");
      await interactions.waitForTimeout(150);
      const tilt = interactions.getByTestId("tilt");
      const magnetic = interactions.getByTestId("magnetic");
      assert.equal(await tilt.evaluate((element) => element.tagName), "A");
      assert.equal(
        await interactions.evaluate(() => window.afxHarness.refTag()),
        "A",
      );
      assert.equal(
        await magnetic.evaluate((element) => element.type),
        "button",
      );
      await interactions.waitForFunction(() =>
        document.querySelector('[data-testid="tilt"]')?.dataset.afxMotion === "running",
      );
      const cadence = await interactions.evaluate(async () => {
        const glow = document.querySelector('[data-testid="glow"]');
        const animation = getComputedStyle(glow, "::before");
        const steps = Number(animation.animationTimingFunction.match(/steps\((\d+)/)?.[1]);
        const duration = Number.parseFloat(animation.animationDuration);
        const element = document.querySelector('[data-testid="tilt"]');
        const bounds = element.getBoundingClientRect();
        const first = window.afxStats.pointerTimes.length;
        const started = performance.now();
        await new Promise((done) => {
          const emit = (now) => {
            element.dispatchEvent(new PointerEvent("pointermove", {
              pointerType: "mouse",
              clientX: bounds.left + bounds.width * .85,
              clientY: bounds.top + bounds.height * .2,
              bubbles: true,
            }));
            if (now - started < 650) requestAnimationFrame(emit);
            else done();
          };
          requestAnimationFrame(emit);
        });
        return { first, elapsed: performance.now() - started, glowRate: steps / duration };
      });
      await interactions.waitForTimeout(50);
      const writes = (await snapshot(interactions)).pointerTimes.slice(cadence.first);
      assert(writes.length > 0, "An eligible pointer must produce an update");
      assert(writes.length <= Math.ceil((cadence.elapsed + 50) / 1000 * 30) + 1);
      assert(cadence.glowRate > 0 && cadence.glowRate <= 30);
      const bounds = await tilt.boundingBox();
      await interactions.mouse.move(
        bounds.x + bounds.width * 0.85,
        bounds.y + bounds.height * 0.2,
      );
      await interactions.waitForTimeout(250);
      assert.equal(await tilt.getAttribute("data-afx-pointer"), "active");
      assert.notEqual(
        await tilt.evaluate((element) => getComputedStyle(element).transform),
        "none",
      );
      await tilt.focus();
      await interactions.waitForTimeout(200);
      assert.equal(
        await tilt.evaluate((element) => getComputedStyle(element).transform),
        "none",
      );
      assert.equal(
        await tilt.evaluate(
          (element) => getComputedStyle(element).outlineStyle,
        ),
        "solid",
      );
      await magnetic.focus();
      await interactions.keyboard.press("Enter");
      assert.equal(
        await interactions.getByTestId("clicks").textContent(),
        "Outer actions: 1",
      );
      await interactions.getByTestId("magnetic-link").click();
      assert.equal(
        await interactions.getByTestId("clicks").textContent(),
        "Outer actions: 2",
      );
      assert.equal(
        await interactions.getByTestId("child-clicks").textContent(),
        "Child actions: 1",
      );
      const input = interactions.getByLabel("Project notes");
      await input.fill("Native text entry still works.");
      assert.equal(await input.inputValue(), "Native text entry still works.");
      const disabled = interactions.getByTestId("disabled");
      assert(await disabled.isDisabled());
      await interactions.evaluate(() => {
        document.documentElement.dataset.motionLevel = "off";
        window.dispatchEvent(new Event("aureform:appearance-change"));
      });
      assert.equal(
        await magnetic.evaluate(
          (element) => getComputedStyle(element).transform,
        ),
        "none",
      );
      assert.equal(
        await interactions
          .getByTestId("glow")
          .evaluate(
            (element) =>
              getComputedStyle(element, "::before").animationPlayState,
          ),
        "paused",
      );
      await interactions.screenshot({
        path: resolve(artifacts, "interactions.png"),
      });
      await assertCleanup(interactions);
      assert.deepEqual(interactions.afxErrors, []);
    },
  );
  await check(
    "Coarse pointer and reduced motion preserve static interaction decoration",
    async () => {
      const coarse = await pageFor(
        "interactions",
        {},
        {
          isMobile: true,
          hasTouch: true,
          viewport: { width: 390, height: 844 },
        },
      );
      await coarse.waitForTimeout(150);
      const tilt = coarse.getByTestId("tilt");
      const bounds = await tilt.boundingBox();
      await coarse.mouse.move(bounds.x + 20, bounds.y + 20);
      await coarse.waitForTimeout(100);
      assert.equal(
        await tilt.evaluate((element) => getComputedStyle(element).transform),
        "none",
      );
      await coarse.screenshot({
        path: resolve(artifacts, "mobile.png"),
        fullPage: true,
      });
      await assertCleanup(coarse);
      const reduced = await pageFor(
        "interactions",
        {},
        { reducedMotion: "reduce" },
      );
      assert.equal(
        await reduced
          .getByTestId("glow")
          .evaluate(
            (element) => getComputedStyle(element, "::before").animationName,
          ),
        "none",
      );
      await assertCleanup(reduced);
    },
  );
  await check(
    "Six complete examples hydrate, controls work and axe passes",
    async () => {
      const examples = await pageFor(
        "examples",
        {},
        { reducedMotion: "reduce" },
      );
      assert.equal(await examples.locator("[data-slot]").count(), 6);
      await examples
        .getByRole("button", { name: "Linear", exact: true })
        .click();
      assert.equal(
        await examples
          .locator('[data-slot="gradient-background"]')
          .getAttribute("data-gradient-kind"),
        "linear",
      );
      await examples
        .getByRole("button", { name: "Waves", exact: true })
        .click();
      assert.equal(
        await examples
          .locator('[data-slot="shader-background"]')
          .getAttribute("data-shader-kind"),
        "waves",
      );
      await examples
        .getByRole("button", { name: "Pin these notes", exact: true })
        .click();
      assert.equal(
        await examples
          .getByRole("button", { name: "Unpin these notes", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await examples
        .getByRole("button", { name: "Collect inspiration", exact: true })
        .click();
      assert(
        await examples
          .getByRole("status")
          .filter({ hasText: "1 idea collected" })
          .count(),
      );
      const AxeBuilder = installed("@axe-core/playwright").default;
      const accessibility = await new AxeBuilder({ page: examples })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        accessibility.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target),
        })),
        [],
      );
      await examples.screenshot({
        path: resolve(artifacts, "examples.png"),
        fullPage: true,
      });
      await assertCleanup(examples);
      assert.deepEqual(examples.afxErrors, []);
      return { completeExamples: 6, axeViolations: 0 };
    },
  );
  await check(
    "Gallery screenshot and provider-free browser defaults",
    async () => {
      const gallery = await pageFor("gallery");
      await gallery.waitForFunction(() =>
        [...document.querySelectorAll('[data-slot="shader-background"]')].every(
          (element) => element.dataset.shaderState === "running",
        ),
      );
      await gallery.waitForTimeout(600);
      await gallery.screenshot({ path: resolve(artifacts, "gallery.png") });
      await assertCleanup(gallery);
      const defaults = await pageFor(
        "defaults",
        {},
        { reducedMotion: "reduce" },
      );
      assert.equal(await defaults.locator("[data-slot]").count(), 6);
      assert.deepEqual(defaults.afxErrors, []);
      await assertCleanup(defaults);
    },
  );
  await check(
    "Firefox and WebKit pointer effects, scoped motion, examples and shader availability",
    async () => {
      const outcome = [];
      for (const [name, engine] of [
        ["Firefox", firefox],
        ["WebKit", webkit],
      ]) {
        const other = await engine.launch({
          headless: true,
          executablePath: process.env[
            name === "Firefox"
              ? "PLAYWRIGHT_FIREFOX_EXECUTABLE"
              : "PLAYWRIGHT_WEBKIT_EXECUTABLE"
          ],
        });
        try {
          const browserInfo = {
            name,
            version: other.version(),
            backend: "headless default; fallback, pointer, motion and example controls",
          };
          browsers.push(browserInfo);
          const context = await other.newContext({
            reducedMotion: "reduce",
            viewport: { width: 1280, height: 960 },
          });
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(String(error)));
          await page.addInitScript(installProbe);
          await page.goto(`${base}/?mode=shader`);
          await page.waitForFunction(() => Boolean(window.afxHarness));
          await state(page, "off");
          assert.equal((await snapshot(page)).gpuAttempts, 0);
          assert(
            (
              await page
                .locator(".afx-background-field")
                .evaluate(
                  (element) => getComputedStyle(element).backgroundImage,
                )
            ).includes("radial-gradient"),
          );
          await assertCleanup(page);
          await page.goto(`${base}/?mode=interactions`);
          await page.waitForFunction(() => Boolean(window.afxHarness));
          assert.equal(
            await page
              .getByTestId("tilt")
              .evaluate((element) => element.tagName),
            "A",
          );
          assert.equal(await page.evaluate(() => window.afxHarness.refTag()), "A");
          await page.emulateMedia({ reducedMotion: "no-preference" });
          await page.waitForFunction(() =>
            document.querySelector('[data-testid="tilt"]')?.dataset.afxMotion === "running",
          );
          const tilt = page.getByTestId("tilt");
          const bounds = await tilt.boundingBox();
          await page.mouse.move(bounds.x + bounds.width * .85, bounds.y + bounds.height * .2);
          await page.waitForFunction(() =>
            document.querySelector('[data-testid="tilt"]')?.dataset.afxPointer === "active",
          );
          await tilt.focus();
          await page.waitForFunction(() =>
            getComputedStyle(document.querySelector('[data-testid="tilt"]')).transform === "none",
          );
          assert.equal(
            await tilt.evaluate((element) => getComputedStyle(element).outlineStyle),
            "solid",
          );
          await page.getByTestId("magnetic").focus();
          await page.keyboard.press("Enter");
          assert.equal(await page.getByTestId("clicks").textContent(), "Outer actions: 1");
          await page.getByTestId("magnetic-link").click();
          assert.equal(await page.getByTestId("clicks").textContent(), "Outer actions: 2");
          assert.equal(await page.getByTestId("child-clicks").textContent(), "Child actions: 1");
          assert(await page.getByTestId("disabled").isDisabled());
          await page.getByLabel("Project notes").fill(`${name} native text entry`);
          assert.equal(await page.getByLabel("Project notes").inputValue(), `${name} native text entry`);
          await page.evaluate(() => {
            document.documentElement.dataset.motionLevel = "off";
            window.dispatchEvent(new Event("aureform:appearance-change"));
            window.scrollTo(0, 0);
          });
          await page.waitForFunction(() =>
            document.querySelector('[data-testid="glow"]')?.dataset.afxMotion === "paused",
          );
          assert.equal(
            await page.getByTestId("glow").evaluate((element) => getComputedStyle(element, "::before").animationPlayState),
            "paused",
          );
          await page.evaluate(() => window.afxHarness.setScope({ motion: "gentle" }));
          await page.waitForFunction(() =>
            document.querySelector('[data-testid="glow"]')?.dataset.afxMotion === "running",
          );
          await page.emulateMedia({ reducedMotion: "reduce" });
          await page.waitForFunction(() =>
            document.querySelector('[data-testid="glow"]')?.dataset.afxMotion === "paused",
          );
          assert.equal(
            await page.getByTestId("glow").evaluate((element) => getComputedStyle(element, "::before").animationName),
            "none",
          );
          await assertCleanup(page);
          await page.goto(`${base}/?mode=examples`);
          await page.waitForFunction(() => Boolean(window.afxHarness));
          assert.equal(await page.locator("[data-slot]").count(), 6);
          await page.getByRole("button", { name: "Radial", exact: true }).click();
          assert.equal(
            await page.locator('[data-slot="gradient-background"]').getAttribute("data-gradient-kind"),
            "radial",
          );
          await page.getByRole("button", { name: "Iridescent", exact: true }).click();
          await page.getByRole("button", { name: "Pause atmosphere", exact: true }).click();
          assert.equal(
            await page.getByRole("button", { name: "Resume atmosphere", exact: true }).getAttribute("aria-pressed"),
            "true",
          );
          await page.getByRole("button", { name: "Still", exact: true }).click();
          assert(await page.getByRole("button", { name: "Resume atmosphere", exact: true }).isDisabled());
          assert.equal(await page.locator('[data-slot="shader-background"] canvas').count(), 0);
          await page.getByRole("button", { name: "Aurora", exact: true }).click();
          await page.getByRole("button", { name: "Resume atmosphere", exact: true }).click();
          await page.getByRole("button", { name: "Pin these notes", exact: true }).click();
          assert.equal(
            await page.getByRole("button", { name: "Unpin these notes", exact: true }).getAttribute("aria-pressed"),
            "true",
          );
          await page.getByRole("button", { name: "Choose this collection", exact: true }).click();
          assert.equal(
            await page.getByRole("button", { name: "Collection selected", exact: true }).getAttribute("aria-pressed"),
            "true",
          );
          const details = await page.locator('section[aria-label="About Objects in orbit"]').getAttribute("id");
          await page.locator('[data-slot="tilt-card"]').click();
          assert.equal(await page.evaluate(() => decodeURIComponent(location.hash.slice(1))), details);
          await page.getByRole("button", { name: "Collect inspiration", exact: true }).click();
          assert.equal(await page.getByRole("status").filter({ hasText: "1 idea collected" }).count(), 1);
          await page.getByRole("button", { name: "Clear the collection", exact: true }).click();
          assert.equal(await page.getByRole("status").filter({ hasText: "Your inspiration collection starts here." }).count(), 1);
          const AxeBuilder = installed("@axe-core/playwright").default;
          const accessibility = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          assert.deepEqual(
            accessibility.violations.map(({ id, nodes }) => ({
              id,
              targets: nodes.map((node) => node.target),
            })),
            [],
          );
          await page.screenshot({
            path: resolve(artifacts, `${name.toLowerCase()}-examples.png`),
            fullPage: true,
          });
          await assertCleanup(page);
          await page.goto(`${base}/?mode=shader`);
          await page.waitForFunction(() => Boolean(window.afxHarness));
          await state(page, "off");
          assert.equal((await snapshot(page)).gpuAttempts, 0);
          await page.emulateMedia({ reducedMotion: "no-preference" });
          await page.waitForFunction(() =>
            ["running", "fallback"].includes(
              document.querySelector('[data-slot="shader-background"]')?.dataset.shaderState,
            ),
          );
          const nativeShaderState = await page.locator('[data-slot="shader-background"]').getAttribute("data-shader-state");
          let nativeKinds = 0;
          if (nativeShaderState === "running") {
            for (const kind of ["aurora", "waves", "iridescent"]) {
              await patch(page, { kind });
              await page.waitForFunction((expected) => {
                const host = document.querySelector('[data-slot="shader-background"]');
                return host?.dataset.shaderKind === expected
                  && host.dataset.shaderState === "running"
                  && Number(host.dataset.shaderFrame) > 0
                  && window.afxStats.samples[expected]?.length > 0;
              }, kind);
              const before = await snapshot(page);
              const started = performance.now();
              await page.waitForTimeout(750);
              const after = await snapshot(page);
              const elapsed = performance.now() - started;
              assert(after.draws > before.draws, `${name} ${kind} must keep drawing`);
              assert(after.draws - before.draws <= Math.ceil(elapsed / 1000 * 30) + 1);
              const channels = after.samples[kind].flatMap((pixel) => pixel.slice(0, 3));
              assert(Math.max(...channels) > 60, `${name} ${kind} must have visible light`);
              assert(Math.max(...channels) - Math.min(...channels) > 25);
              nativeKinds += 1;
            }
            await patch(page, { paused: true });
            await state(page, "paused");
          }
          await assertStopped(page);
          await assertCleanup(page);
          assert.deepEqual(errors, []);
          browserInfo.backend = nativeKinds
            ? "headless WebGL2; three shader kinds, pointer, motion and examples"
            : "native WebGL2 unavailable; CSS fallback, pointer, motion and examples";
          outcome.push({
            name,
            passed: true,
            nativeShaderState,
            nativeKinds,
            completeExamples: 6,
            axeViolations: accessibility.violations.length,
          });
          await context.close();
        } finally {
          await other.close();
        }
      }
      return outcome;
    },
  );
  for (const context of contexts) await context.close();
} catch {
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((done) => server.close(done));
  const report = {
    generatedAt: new Date().toISOString(),
    workspace: root,
    isolation:
      "SSR React harness; in-memory bundle; existing dependencies read only",
    browsers,
    passed: results.every((result) => result.passed),
    results,
  };
  await writeFile(
    resolve(artifacts, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(`Report: ${resolve(artifacts, "report.json")}`);
}
