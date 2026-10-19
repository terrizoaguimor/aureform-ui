import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import {
  appearanceToCSS,
  createAppearance,
  defaultAppearance,
  exportConfiguredExample,
  normalizeAppearance,
  palettePresets,
  parseAppearance,
  resolveAppearance,
  serializeAppearance,
  shadeScale,
} from "../src/lib/appearance.ts";

const require = createRequire(import.meta.url);
const ts = require(
  process.env.AUREFORM_QA_NODE_MODULES
    ? resolve(process.env.AUREFORM_QA_NODE_MODULES, "typescript")
    : "typescript",
);
const {
  configuredProfiles,
  validateConfiguredExample,
  strictCheckPayloads,
  assertStrictNegativeControl,
} = require("../scripts/verify-component-examples.cjs");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paletteIds = ["aurora", "violet", "ocean", "mint", "ember", "rose"];
const hex = /^#[0-9A-F]{6}$/i;

// Independent WCAG relative luminance calculation: do not use the library's
// own contrast helper to approve the colors it produced.
function luminance(color) {
  assert.match(color, hex, "Contrast assertions require opaque sRGB colors.");
  return luminanceRGB(
    [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16)),
  );
}

function luminanceRGB(rgb) {
  const channels = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function gradientContrast(foreground, stops) {
  const text = luminance(foreground);
  const colors = stops.map((color) =>
    [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16)),
  );
  let minimum = Infinity;
  let sampledMinimum = Infinity;
  let samples = 0;
  const segments = [];
  for (let stop = 1; stop < colors.length; stop++) {
    const start = colors[stop - 1];
    const change = start.map((channel, index) => colors[stop][index] - channel);
    const at = (position) => start.map((channel, index) => channel + change[index] * position);
    const ratioAt = (position) => {
      const background = luminanceRGB(at(position));
      return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
    };
    for (let position = 0; position <= 100; position++) {
      sampledMinimum = Math.min(sampledMinimum, ratioAt(position / 100));
      samples++;
    }
    // Find the stationary luminance using the transfer-function derivative and
    // bisection, independently of the application's ternary color search.
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
    const backgroundRange = positions.map((position) => luminanceRGB(at(position)));
    const continuousMinimum = text >= Math.min(...backgroundRange) && text <= Math.max(...backgroundRange)
      ? 1 : Math.min(...positions.map(ratioAt));
    minimum = Math.min(minimum, continuousMinimum);
    segments.push({ segment: stop - 1, stationary, minimum: continuousMinimum });
  }
  return { minimum: Math.min(minimum, sampledMinimum), continuousMinimum: minimum, sampledMinimum, samples, segments };
}

function controlGradientStops(config, values) {
  const expression = values["--af-gradient-control"];
  assert(expression.startsWith(`linear-gradient(${config.gradient.angle}deg in srgb, `),
    "Control gradients must explicitly select the sRGB space audited for contrast.");
  assert.equal(values["--af-gradient-primary"], expression);
  const stops = [...expression.matchAll(/(#[0-9A-F]{6}) (\d+)%/gi)];
  const positions = [...config.gradient.stops].sort((left, right) => left.position - right.position)
    .map((stop) => Math.round(stop.position * 100));
  assert.equal(stops.length, config.gradient.stops.length);
  assert.deepEqual(stops.map((stop) => Number(stop[2])), positions);
  assert.equal(expression,
    `linear-gradient(${config.gradient.angle}deg in srgb, ${stops.map((stop) => `${stop[1]} ${stop[2]}%`).join(", ")})`);
  const colors = stops.map((stop) => stop[1]);
  for (let index = 1; index <= 4; index++) {
    assert.match(values[`--af-control-color-${index}`], hex);
    assert.equal(values[`--af-control-color-${index}`], colors[Math.min(index - 1, colors.length - 1)],
      `Control color ${index} must match the exported stop or repeat its last valid color.`);
  }
  return colors;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function primaryBackdropContrast(config, values) {
  const ratios = [];
  for (const background of ["--background", "--surface", "--surface-subtle", "--accent"]) {
    const ratio = contrast(values["--primary"], values[background]);
    assert(ratio >= 4.5,
      `${config.palette}/${config.theme}/${config.colors.primary}: --primary ${values["--primary"]} on ${background} ${values[background]} is ${ratio.toFixed(5)}:1.`);
    ratios.push({ background, ratio });
  }
  // Model the actual sRGB tint independently, including fractional channels.
  // Do not round to HEX or ask resolveAppearance to pick its own backdrop.
  const alpha = config.theme === "dark" ? 0.27 : 0.16;
  const channels = (color) => [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  const base = channels(values["--surface"]);
  const paint = channels(config.colors.primary);
  const backgroundRGB = base.map((channel, index) => channel * (1 - alpha) + paint[index] * alpha);
  const background = luminanceRGB(backgroundRGB);
  const foreground = luminance(values["--primary"]);
  const ratio = (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
  assert(ratio >= 4.5,
    `${config.palette}/${config.theme}/${config.colors.primary}: --primary ${values["--primary"]} on ${alpha * 100}% raw-brand tint is ${ratio.toFixed(5)}:1.`);
  ratios.push({ background: "raw-brand tint over surface", alpha, backgroundRGB, ratio });
  assert.equal(values["--af-color-primary"], config.colors.primary, "Semantic correction must preserve the raw brand color.");
  assert.equal(shadeScale(config.colors.primary).find((shade) => shade.step === 500).color, config.colors.primary);
  return ratios;
}

function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value))
    if (child && typeof child === "object" && !Object.isFrozen(child))
      deepFreeze(child);
  return value;
}

function replace(path, value) {
  const config = structuredClone(defaultAppearance);
  const keys = path.split(".");
  const last = keys.pop();
  let target = config;
  for (const key of keys) target = target[key];
  target[last] = value;
  return config;
}

test("the public presets contain six unique palettes and detached defaults", () => {
  assert.deepEqual(palettePresets.map((preset) => preset.id), paletteIds);
  assert.equal(new Set(palettePresets.map((preset) => preset.name)).size, 6);
  for (const preset of palettePresets) {
    assert.equal(preset.colors.length, 3);
    for (const color of preset.colors) assert.match(color, hex);
  }
  assert.equal(defaultAppearance.palette, "aurora");
  assert.equal(defaultAppearance.theme, "dark");
  assert.equal(defaultAppearance.version, 1);
  assert.equal(defaultAppearance.motion, "expressive");
  assert.equal(defaultAppearance.hover, "glow");
  assert.equal(resolveAppearance(defaultAppearance)["--af-motion-lift"], "-4px");
  assert.deepEqual(createAppearance(), defaultAppearance);
  const first = createAppearance();
  const second = createAppearance();
  first.colors.primary = "#000000";
  first.gradient.stops[0].color = "#000000";
  first.shader.paused = true;
  assert.deepEqual(second, defaultAppearance);
  assert.notEqual(first.colors.primary, palettePresets[0].colors[0]);
});

for (const preset of palettePresets) {
  for (const theme of ["light", "dark"]) {
    test(`${preset.id}/${theme}: readable semantic colors, controls, and gradient stops`, () => {
      const config = createAppearance(preset.id, theme);
      assert.equal(config.palette, preset.id);
      assert.equal(config.theme, theme);
      assert.deepEqual(Object.values(config.colors), preset.colors);
      const before = structuredClone(config);
      const values = resolveAppearance(deepFreeze(config));
      assert.deepEqual(config, before);
      primaryBackdropContrast(config, values);
      const textPairs = [
        ["--foreground", "--background"],
        ["--foreground", "--surface"],
        ["--foreground", "--surface-subtle"],
        ["--muted-foreground", "--background"],
        ["--muted-foreground", "--surface"],
        ["--muted-foreground", "--surface-subtle"],
        ["--primary", "--surface"],
        ["--primary-foreground", "--primary"],
        ["--primary-foreground", "--primary-hover"],
        ["--accent-foreground", "--accent"],
        ["--warning-foreground", "--warning"],
        ["--destructive-foreground", "--destructive"],
      ];
      for (const [foreground, background] of textPairs) {
        const ratio = contrast(values[foreground], values[background]);
        assert(
          ratio >= 4.5,
          `${foreground}/${background}: ${ratio.toFixed(3)} is below 4.5.`,
        );
      }
      for (const property of ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--ring"])
        assert(
          contrast(values[property], values["--surface"]) >= 3,
          `${property} needs 3:1 against its surface.`,
        );
      const gradientColors = controlGradientStops(config, values);
      for (const color of gradientColors)
        assert(contrast(values["--primary-foreground"], color) >= 4.5);
      const gradient = gradientContrast(values["--primary-foreground"], gradientColors);
      assert(gradient.samples >= 101);
      assert(
        gradient.minimum >= 4.5,
        `Interpolated control gradient reaches only ${gradient.minimum.toFixed(3)}:1.`,
      );
      const css = appearanceToCSS(config);
      assert(css.includes(`color-scheme: ${theme};`));
      for (const [property, value] of Object.entries(values)) {
        assert(property.startsWith("--"));
        assert(!/undefined|NaN|Infinity/.test(value));
        assert(
          css.includes(`${property}: ${value};`),
          `${property} must export the resolved value.`,
        );
      }
    });
  }
}

const extremeColors = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00",
  "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF",
  "#808080", "#010101", "#FEFEFE", "#0B0F18",
];
for (const theme of ["light", "dark"]) {
  for (const [index, primary] of extremeColors.entries()) {
    test(`custom ${primary}/${theme}: primary is readable on every surface and raw-brand tint; complete button gradient stays readable`, () => {
      const config = createAppearance(paletteIds[index % paletteIds.length], theme);
      config.colors = {
        primary,
        secondary: extremeColors[(index + 3) % extremeColors.length],
        tertiary: extremeColors[(index + 7) % extremeColors.length],
      };
      config.gradient = {
        kind: ["linear", "radial", "mesh"][index % 3],
        angle: index * 29,
        intensity: 1,
        stops: Object.values(config.colors).map((color, stop) => ({ color, position: [0, 0.37, 1][stop] })),
      };
      const before = structuredClone(config);
      const values = resolveAppearance(deepFreeze(config));
      primaryBackdropContrast(config, values);
      for (const background of ["--primary", "--primary-hover"])
        assert(contrast(values["--primary-foreground"], values[background]) >= 4.5,
          `${primary}/${theme}: solid button ${background} contrast is below 4.5:1.`);
      const stops = controlGradientStops(config, values);
      assert.equal(stops.length, 3);
      const gradient = gradientContrast(values["--primary-foreground"], stops);
      assert(gradient.minimum >= 4.5,
        `${primary}/${theme}: actual exported control gradient interpolation is ${gradient.minimum.toFixed(5)}:1.`);
      assert.deepEqual(config, before);
      assert.deepEqual(parseAppearance(serializeAppearance(config)), before);
    });
  }
}

for (const theme of ["light", "dark"]) {
  for (const length of [2, 4]) {
    test(`${theme}/${length}-stop control gradients: explicit sRGB, readable continuous interiors and complete color aliases`, () => {
      const stopSets = length === 2 ? [
        ["#00FF00", "#FF00FF"],
        ["#000000", "#FFFFFF"],
        ["#0000FF", "#FF0000"],
      ] : [
        ["#00FF00", "#FF00FF", "#0000FF", "#0B0F18"],
        ["#000000", "#FFFFFF", "#010101", "#FEFEFE"],
        ["#FF0000", "#00FFFF", "#FFFF00", "#0000FF"],
      ];
      for (const kind of ["linear", "radial", "mesh"]) {
        for (const [index, colors] of stopSets.entries()) {
          const config = createAppearance("aurora", theme);
          config.colors.primary = theme === "dark" ? "#000000" : "#FFFFFF";
          config.gradient = {
            kind, angle: [0, 123.5, 360][index], intensity: index / 2,
            stops: colors.map((color, stop) => ({
              color, position: (length === 2 ? [0, 1] : [0, 0.13, 0.77, 1])[stop],
            })).reverse(),
          };
          const before = structuredClone(config);
          const values = resolveAppearance(deepFreeze(config));
          primaryBackdropContrast(config, values);
          const foreground = values["--primary-foreground"];
          assert(theme === "dark" ? luminance(foreground) < 0.01 : luminance(foreground) > 0.95,
            "These edge profiles must exercise both dark and light button text.");
          const stops = controlGradientStops(config, values);
          const gradient = gradientContrast(foreground, stops);
          assert.equal(gradient.samples, (length - 1) * 101);
          assert.equal(gradient.segments.length, length - 1);
          assert(gradient.minimum >= 4.5,
            `${theme}/${length}/${kind}/${index}: complete continuous gradient reaches ${gradient.minimum.toFixed(8)}:1.`);
          if (theme === "dark" && length === 2 && index === 0) {
            assert(colors.every((color) => contrast(foreground, color) >= 4.5));
            assert(gradientContrast(foreground, colors).minimum < 4.5,
              "The unchanged green/magenta regression fixture must expose the insufficient endpoint-only check.");
          }
          assert.deepEqual(config, before);
          const css = appearanceToCSS(config);
          assert(css.includes(`--af-gradient-control: ${values["--af-gradient-control"]};`));
          for (let control = 1; control <= 4; control++)
            assert(css.includes(`--af-control-color-${control}: ${values[`--af-control-color-${control}`]};`));
          for (const color of colors)
            assert(values["--af-gradient-color"].includes(color), "Decorative stops preserve the original colors.");
        }
      }
    });
  }
}

test("normalization canonicalizes colors and stops without retaining mutable references", () => {
  const input = createAppearance("ocean", "light");
  input.colors.primary = "#abc";
  input.gradient.stops = [
    { color: "#f0a", position: 1 },
    { color: "#12abef", position: 0 },
  ];
  const frozen = deepFreeze(structuredClone(input));
  const normalized = normalizeAppearance(frozen);
  assert.equal(normalized.colors.primary, "#AABBCC");
  assert.deepEqual(normalized.gradient.stops, [
    { color: "#12ABEF", position: 0 },
    { color: "#FF00AA", position: 1 },
  ]);
  normalized.gradient.stops[0].color = "#000000";
  normalized.shader.paused = true;
  assert.deepEqual(frozen, input);
});

test("all documented numeric boundaries are accepted and out-of-range input is rejected", () => {
  for (const [path, minimum, maximum] of [
    ["radius", 0, 24],
    ["shadow", 0, 1],
    ["border", 0, 1],
    ["gradient.angle", 0, 360],
    ["gradient.intensity", 0, 1],
    ["shader.speed", 0, 1],
    ["shader.scale", 0.25, 4],
    ["shader.intensity", 0, 1],
  ]) {
    for (const value of [minimum, maximum])
      assert.doesNotThrow(() => normalizeAppearance(replace(path, value)));
    for (const value of [minimum - 0.01, maximum + 0.01, NaN, Infinity, -Infinity, String(minimum), null])
      assert.throws(
        () => normalizeAppearance(replace(path, value)),
        undefined,
        `${path} must reject ${String(value)}.`,
      );
  }
});

test("every enum, required object, color, and shader pause value is validated", () => {
  for (const [path, value] of [
    ["version", 2],
    ["theme", "system"],
    ["palette", "missing"],
    ["material", "plastic"],
    ["density", "tiny"],
    ["typography", "comic"],
    ["motion", "unlimited"],
    ["hover", "spin"],
    ["gradient.kind", "conic"],
    ["shader.kind", "remote"],
    ["shader.paused", "false"],
    ["shader.paused", 0],
    ["colors.primary", "red; display: none"],
    ["colors.secondary", "#FFFF"],
    ["colors.tertiary", "#GGGGGG"],
    ["colors", null],
    ["gradient", []],
    ["shader", null],
  ])
    assert.throws(() => normalizeAppearance(replace(path, value)), undefined, path);
  for (const value of [null, [], true, "{}", 1])
    assert.throws(() => normalizeAppearance(value));
  for (const key of Object.keys(defaultAppearance)) {
    const incomplete = structuredClone(defaultAppearance);
    delete incomplete[key];
    assert.throws(() => normalizeAppearance(incomplete), undefined, key);
  }
});

test("gradient stop counts, positions, and colors stay within the public contract", () => {
  for (const length of [2, 3, 4]) {
    const config = createAppearance();
    config.gradient.stops = Array.from({ length }, (_, index) => ({
      color: palettePresets[index % palettePresets.length].colors[0],
      position: index / (length - 1),
    }));
    assert.doesNotThrow(() => normalizeAppearance(config));
  }
  for (const stops of [
    [],
    [{ color: "#123456", position: 0 }],
    Array.from({ length: 5 }, () => ({ color: "#123456", position: 0.5 })),
    [{ color: "#123456", position: -0.1 }, { color: "#ABCDEF", position: 1 }],
    [{ color: "#123456", position: 0 }, { color: "#ABCDEF", position: 1.1 }],
    [{ color: "#123456", position: 0 }, { color: "#ABCDEF", position: "1" }],
    [{ color: "url(javascript:alert(1))", position: 0 }, { color: "#ABCDEF", position: 1 }],
    [null, { color: "#ABCDEF", position: 1 }],
  ])
    assert.throws(() => normalizeAppearance(replace("gradient.stops", stops)));
});

test("import/export is lossless for a fully customized profile and rejects malformed imports", () => {
  const config = normalizeAppearance({
    ...createAppearance("rose", "light"),
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
    shader: {
      kind: "waves",
      speed: 0.17,
      scale: 2.75,
      intensity: 0.41,
      paused: true,
    },
  });
  const text = serializeAppearance(config);
  assert.deepEqual(JSON.parse(text), config);
  assert.deepEqual(parseAppearance(text), config);
  assert.equal(serializeAppearance(parseAppearance(text)), text);
  for (const invalid of ["", "{", "null", "[]", '{"version":1}', JSON.stringify(replace("radius", 100))])
    assert.throws(() => parseAppearance(invalid));
  assert.deepEqual(parseAppearance(text), config, "A rejected import must not mutate the previous profile.");
  const atLimit = text + " ".repeat(32768 - text.length);
  assert.deepEqual(parseAppearance(atLimit), config);
  assert.throws(() => parseAppearance(atLimit + " "), /large|size|length/i);
});

test("shade scales keep the base hue and monotonically reduce luminance", () => {
  for (const color of palettePresets.flatMap((preset) => preset.colors)) {
    const scale = shadeScale(color);
    assert.equal(new Set(scale.map((shade) => shade.step)).size, scale.length);
    assert(scale.length >= 5);
    assert.equal(scale.find((shade) => shade.step === 500)?.color, color);
    for (let index = 0; index < scale.length; index++) {
      assert.match(scale[index].color, hex);
      if (index) {
        assert(scale[index].step > scale[index - 1].step);
        assert(luminance(scale[index].color) <= luminance(scale[index - 1].color));
      }
    }
  }
  assert.throws(() => shadeScale("var(--primary)"));
});

test("custom values change the exported styles while input stays immutable", () => {
  const before = createAppearance();
  const after = normalizeAppearance({
    ...before,
    colors: { primary: "#D946EF", secondary: "#06B6D4", tertiary: "#F59E0B" },
    radius: 3,
    density: "compact",
    typography: "editorial",
    motion: "off",
    hover: "none",
    shadow: 0,
    material: "glass",
    gradient: { ...before.gradient, kind: "linear", angle: 271 },
  });
  const first = resolveAppearance(before);
  const second = resolveAppearance(deepFreeze(after));
  assert.notEqual(first["--primary"], second["--primary"]);
  assert.notEqual(first["--af-control-height"], second["--af-control-height"]);
  assert.notEqual(first["--font-display"], second["--font-display"]);
  assert.notEqual(first["--af-gradient-color"], second["--af-gradient-color"]);
  assert.equal(second["--af-radius"], "3px");
  assert.equal(second["--af-motion-hover"], "0ms");
  assert.equal(second["--af-motion-lift"], "0px");
  assert.deepEqual(before, defaultAppearance);
});

test("configured examples remain parsable TSX, preserve behavior, and embed the complete profile", () => {
  const source = `"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function OriginalCounter() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>{count}</Button>;
}
`;
  const config = createAppearance("mint", "light");
  config.shader.kind = "iridescent";
  config.hover = "tilt";
  config.radius = 9;
  const output = exportConfiguredExample(source, config);
  const parsed = ts.createSourceFile("configured.tsx", output, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const defaults = parsed.statements.filter(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword),
  );
  assert.equal(defaults.length, 1);
  assert(output.startsWith('"use client";'));
  assert(output.includes('import { useState } from "react";'));
  assert(output.includes("setCount(count + 1)"));
  assert(output.includes("<AppearanceScope appearance={appearance}>"));
  assert(output.includes("<OriginalCounter />"));
  const declaration = parsed.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((variable) => variable.name.getText(parsed) === "appearance");
  assert(declaration?.initializer);
  assert.deepEqual(JSON.parse(declaration.initializer.getText(parsed)), normalizeAppearance(config));
  const compiled = ts.transpileModule(output, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    fileName: "configured.tsx",
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error).length, 0);
  assert(compiled.outputText.includes("OriginalCounter"));
  assert.throws(() => exportConfiguredExample("export default () => null;", config));
});

test("all 44 shipped examples preserve complete behavior and imports across 14 configured profiles", async () => {
  const directory = new URL("../examples/components/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".tsx")).sort();
  assert.equal(files.length, 44);
  const sources = await Promise.all(
    files.map(async (name) => ({ name, source: await readFile(new URL(name, directory), "utf8") })),
  );
  const profiles = configuredProfiles({
    createAppearance, normalizeAppearance, palettePresets,
  });
  assert.equal(profiles.length, 14);
  let exports = 0;
  for (const { name, source } of sources)
    for (const { id, config } of profiles) {
      const before = structuredClone(config);
      const output = exportConfiguredExample(source, deepFreeze(config));
      const evidence = validateConfiguredExample(output, config, source, `${id}/${name}`);
      assert.equal(evidence.entry, `Configured${name.slice(0, -4)}Example`);
      assert.deepEqual(config, before, "Export cannot mutate a caller's profile.");
      exports++;
    }
  assert.equal(exports, 616);
});

function loadCopyAuditors() {
  const filename = resolve(projectRoot, "scripts/verify-copy-examples.mjs");
  const parsed = ts.createSourceFile(filename, readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = ["buttonExampleSource", "clipboardPayloadName", "validateButtonExample"];
  const functions = names.map((name) => {
    const node = parsed.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
    assert(node, `${filename}: ${name} is missing.`);
    return node.getText(parsed);
  });
  const compiled = ts.transpileModule(functions.join("\n"), {
    fileName: "clipboard-auditors.ts",
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.length, 0);
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, assert, ts, vm, resolve, readFile, projectRoot,
    label: (locale, en, es) => locale === "es" ? es : en,
  }, { filename });
  return exports;
}

test("live Button examples retain selected props, localized saving, and strict real imports", async () => {
  const { buttonExampleSource, clipboardPayloadName, validateButtonExample } = loadCopyAuditors();
  const combinations = [
    { locale: "en", shape: "rounded", size: "default", appearance: "gradient" },
    { locale: "en", shape: "pill", size: "sm", appearance: "glass" },
    { locale: "en", shape: "square", size: "lg", appearance: "solid" },
    { locale: "es", shape: "rounded", size: "lg", appearance: "outline" },
    { locale: "es", shape: "pill", size: "default", appearance: "soft" },
    { locale: "es", shape: "square", size: "sm", appearance: "gradient" },
  ];
  const payloads = [];
  for (const [index, { locale, ...selected }] of combinations.entries()) {
    const config = normalizeAppearance({
      ...createAppearance(paletteIds[index], index % 2 ? "light" : "dark"),
      material: ["flat", "glass", "gradient", "elevated"][index % 4],
      radius: [0, 3, 9, 24][index % 4], density: index % 2 ? "compact" : "comfortable",
      typography: locale === "es" ? "editorial" : "modern",
    });
    const source = await buttonExampleSource(selected, locale);
    const output = exportConfiguredExample(source, config);
    const name = clipboardPayloadName({ locale, config, phase: "pure-live-button", family: "Button" });
    const evidence = validateConfiguredExample(output, config, source, name);
    assert.equal(evidence.entry, "ConfiguredButtonExample");
    const button = validateButtonExample(output, selected, locale, name);
    assert.deepEqual(JSON.parse(JSON.stringify(button.selectedProps)), selected);
    assert.equal(button.completeLocalSaving, true);
    assert.equal(button.loadingUsesPending, true);
    payloads.push({ name, source: output });
  }
  const compilation = strictCheckPayloads(payloads);
  assert.equal(compilation.payloads, 6);
  assert.equal(compilation.diagnostics, 0);
  assert.equal(compilation.strict, true);
  assert(compilation.canonicalSourceFiles >= 4, "Compile against the real provider, Button, Input, and appearance API.");
});

test("Button clipboard audit rejects stale selected props and incomplete async saving", async () => {
  const { buttonExampleSource, validateButtonExample } = loadCopyAuditors();
  const selected = { shape: "pill", size: "sm", appearance: "glass" };
  const config = createAppearance("violet", "light");
  const original = await buttonExampleSource(selected, "es");
  const output = exportConfiguredExample(original, config);
  assert.doesNotThrow(() => validateButtonExample(output, selected, "es"));
  for (const [before, after] of [
    ['shape="pill"', 'shape="rounded"'],
    ['size="sm"', 'size="lg"'],
    ['appearance="glass"', 'appearance="solid"'],
    ["loading={pending}", "loading={false}"],
    ["setPending(false);", ""],
    ["if (!nextName || pending) return;", "if (!nextName) return;"],
    ["void save();", "void 0;"],
    ["Guardando localmente…", "Saving locally…"],
  ]) {
    assert(output.includes(before), `Negative control must mutate actual source: ${before}`);
    assert.throws(() => validateButtonExample(output.replace(before, after), selected, "es"));
  }
  assert.throws(() => validateConfiguredExample(output, { ...config, radius: 24 }, original),
    /configured-example\.tsx/);
});

test("responsive clipboard filenames distinguish all twelve locale/theme/width configurations", () => {
  const { clipboardPayloadName } = loadCopyAuditors();
  const names = [], oldNames = [];
  let index = 0;
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const width of [360, 768, 1440]) {
        const config = createAppearance(paletteIds[index++ % 6], theme);
        const args = { locale, config, width, phase: "responsive-code-view", family: "Dialog" };
        const name = clipboardPayloadName(args);
        assert(name.includes(`/${theme}/${config.palette}/`));
        names.push(name);
        oldNames.push(`${locale}/${width}/responsive-code-view/Dialog.tsx`);
      }
  assert.equal(new Set(names).size, 12);
  assert.equal(new Set(oldNames).size, 6, "This fixture must reproduce the original identity collision.");
  const args = { locale: "en", config: createAppearance("aurora", "light"), width: 360,
    phase: "responsive-code-view", family: "Dialog" };
  assert.notEqual(clipboardPayloadName(args),
    clipboardPayloadName({ ...args, config: createAppearance("rose", "light") }));
});

test("targeted appearance reports enforce their selection without certifying the full release", () => {
  const filename = resolve(projectRoot, "scripts/verify-appearance.mjs");
  const parsed = ts.createSourceFile(filename, readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const functions = ["selectAppearanceCases", "finishAppearanceReport"].map((name) => {
    const declaration = parsed.statements.find((node) =>
      ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert(declaration);
    return declaration.getText(parsed);
  });
  const constants = ["specialKinds", "allAppearanceCases"].map((name) => {
    const statement = parsed.statements.find((node) => ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((item) => item.name.getText(parsed) === name));
    assert(statement);
    return statement.getText(parsed);
  });
  const compiled = ts.transpileModule([...constants, ...functions].join("\n"), {
    fileName: "appearance-reporting.ts",
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.length, 0);
  const exports = {};
  vm.runInNewContext(compiled.outputText, { exports, assert, palettePresets }, { filename });
  const { allAppearanceCases, selectAppearanceCases, finishAppearanceReport } = exports;
  const ids = [...allAppearanceCases].map((item) => item.id);
  assert.equal(ids.length, 44);
  const selected = selectAppearanceCases(allAppearanceCases, "en-controls,es-no-js");
  assert.deepEqual([...selected].map((item) => item.id), ["en-controls", "es-no-js"]);
  for (const invalid of ["unknown", "en-controls,en-controls", "en-controls,"])
    assert.throws(() => selectAppearanceCases(allAppearanceCases, invalid));
  const scenario = ({ id }) => ({
    id, status: "passed", runtimeTested: true, errors: [],
    checks: [{ id: "real-runtime-check", status: "passed" }],
  });
  const report = (cases) => ({
    plannedCases: [...cases].map((item) => item.id), fullMatrixCases: ids,
    scenarios: [...cases].map(scenario), errors: [], sourceIntegrity: { unchanged: true },
  });
  const targeted = finishAppearanceReport(report(selected));
  assert.equal(targeted.status, "passed");
  assert.equal(targeted.fullMatrixComplete, false);
  assert.equal(targeted.releaseVerified, false);
  const incompleteMetadata = report(selected);
  incompleteMetadata.fullMatrixCases = [];
  assert.equal(finishAppearanceReport(incompleteMetadata).releaseVerified, false);
  const missing = report(selected);
  missing.scenarios.pop();
  assert.equal(finishAppearanceReport(missing).status, "failed");
  const duplicate = report(selected);
  duplicate.scenarios.push(scenario(selected[0]));
  assert.equal(finishAppearanceReport(duplicate).status, "failed");
  const complete = finishAppearanceReport(report(allAppearanceCases));
  assert.equal(complete.fullMatrixComplete, true);
  assert.equal(complete.releaseVerified, true);
  const metadataOnly = report(allAppearanceCases);
  metadataOnly.scenarios.forEach((item) => { item.runtimeTested = false; });
  assert.equal(finishAppearanceReport(metadataOnly).releaseVerified, false);
});

test("strict consumer compilation resolves real imports and rejects wrong exported prop/config types", () => {
  const config = createAppearance("ocean", "light");
  const source = `"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export default function Counter() {
  const [count, setCount] = useState(0);
  return <Button appearance="gradient" onClick={() => setCount(count + 1)}>{count}</Button>;
}`;
  const valid = strictCheckPayloads([
    { name: "counter.tsx", source: exportConfiguredExample(source, config) },
  ]);
  assert.equal(valid.strict, true);
  assert.equal(valid.diagnostics, 0);
  assert(valid.canonicalSourceFiles >= 3, "Use the real provider and component types.");
  const invalid = assertStrictNegativeControl(config);
  assert.equal(invalid.diagnostics, 4);
});

function loadSourceModule(filename, globals = {}, overrides = {}, cache = new Map()) {
  const absolute = resolve(projectRoot, filename);
  if (cache.has(absolute)) return cache.get(absolute);
  const compiled = ts.transpileModule(readFileSync(absolute, "utf8"), {
    fileName: absolute,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.length, 0);
  const loadedModule = { exports: {} };
  cache.set(absolute, loadedModule.exports);
  vm.runInNewContext(compiled.outputText, {
    ...globals,
    exports: loadedModule.exports,
    module: loadedModule,
    require(specifier) {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      assert(specifier.startsWith("."), `Unexpected runtime dependency: ${specifier}`);
      return loadSourceModule(
        resolve(dirname(absolute), `${specifier}.ts`),
        globals, overrides, cache,
      );
    },
  }, { filename: absolute });
  return loadedModule.exports;
}

// A deterministic clock and GPU boundary drive the actual shader-runtime.ts.
// These unit tests prove scheduling/resource logic, not visual GLSL rendering.
function rendererHarness({ width = 400, height = 200, dpr = 1, fail, noWebGL = false, lost = false } = {}) {
  let now = 0;
  let nextRAF = 0;
  let contextLost = lost;
  let frames = 0;
  const pending = new Map();
  const deleted = new Set();
  const draws = [];
  const uniforms = {};
  const counts = {
    contexts: 0, programs: 0, deletedPrograms: 0,
    shaders: 0, deletedShaders: 0, arrays: 0, deletedArrays: 0,
  };
  const removeResource = (resource, count) => {
    assert(resource && !deleted.has(resource), "Resources must be released once.");
    deleted.add(resource);
    counts[count]++;
  };
  const host = {
    bounds: { width, height },
    appendChild() {},
    getBoundingClientRect() { return this.bounds; },
  };
  const canvas = { width: 1, height: 1 };
  const gl = {
    canvas,
    VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713, LINK_STATUS: 35714, TRIANGLES: 4,
    DEPTH_TEST: 2929, BLEND: 3042, CULL_FACE: 2884,
    isContextLost: () => contextLost,
    createShader(type) { counts.shaders++; return { type }; },
    shaderSource(shader, source) { assert(source.includes("#version 300 es")); shader.source = source; },
    compileShader() {},
    getShaderParameter: () => fail !== "compile",
    getShaderInfoLog: () => "controlled compile failure",
    deleteShader: (shader) => removeResource(shader, "deletedShaders"),
    createProgram() { if (fail === "program") return null; counts.programs++; return {}; },
    attachShader() {}, detachShader() {}, linkProgram() {},
    getProgramParameter: () => fail !== "link",
    getProgramInfoLog: () => "controlled link failure",
    deleteProgram: (program) => removeResource(program, "deletedPrograms"),
    createVertexArray() { if (fail === "array") return null; counts.arrays++; return {}; },
    deleteVertexArray: (array) => removeResource(array, "deletedArrays"),
    getUniformLocation: (_program, name) => ({ name }),
    disable() {}, viewport() {}, useProgram() {}, bindVertexArray() {},
    uniform1f(location, value) { uniforms[location.name] = value; },
    uniform2f(location, x, y) { uniforms[location.name] = [x, y]; },
    uniform3fv(location, value) { uniforms[location.name] = Array.from(value); },
    drawArrays(mode, first, count) {
      assert.equal(contextLost, false);
      assert.equal(mode, 4); assert.equal(first, 0); assert.equal(count, 3);
      draws.push(now);
    },
  };
  canvas.getContext = (kind, options) => {
    counts.contexts++;
    assert.equal(kind, "webgl2");
    assert.equal(options.powerPreference, "low-power");
    assert.equal(options.antialias, false);
    assert.equal(options.preserveDrawingBuffer, false);
    return noWebGL ? null : gl;
  };
  const colorContext = {
    fillStyle: "#000000",
    clearRect() {}, fillRect() {},
    getImageData() {
      const color = this.fillStyle.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number);
      return { data: Uint8ClampedArray.from([...color, 255]) };
    },
  };
  const colorCanvas = { width: 0, height: 0, getContext: () => colorContext };
  const globals = {
    window: { devicePixelRatio: dpr },
    performance: { now: () => now },
    requestAnimationFrame(callback) {
      const id = ++nextRAF;
      pending.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => pending.delete(id),
    document: {
      createElement(name) {
        if (name === "canvas") return colorCanvas;
        assert.equal(name, "span");
        return { style: {}, setAttribute() {}, remove() {} };
      },
    },
    CSS: { supports: (_property, color) => hex.test(color) },
    getComputedStyle(element) {
      const rgb = [1, 3, 5].map((offset) => Number.parseInt(element.style.color.slice(offset, offset + 2), 16));
      return { color: `rgb(${rgb.join(", ")})` };
    },
  };
  const { createShaderRenderer } = loadSourceModule(
    "src/components/effects/shader-runtime.ts", globals,
  );
  const config = {
    colors: ["#8B5CF6", "#22D3EE", "#34D399"],
    speed: 0.2, scale: 1, intensity: 0.55, paused: false,
  };
  const create = (kind = "aurora") =>
    createShaderRenderer(canvas, host, kind, config, () => frames++);
  return {
    create, config, host, canvas, colorCanvas, counts, uniforms, pending, draws,
    get frames() { return frames; },
    get time() { return now; },
    loseContext() { contextLost = true; },
    step(milliseconds) {
      now += milliseconds;
      const callbacks = [...pending.values()];
      pending.clear();
      for (const callback of callbacks) callback(now);
    },
  };
}

for (const kind of ["aurora", "waves", "iridescent"])
  test(`${kind}: real renderer caps draws at 30 Hz and owns one cancellable RAF`, () => {
    const harness = rendererHarness();
    const renderer = harness.create(kind);
    assert(renderer);
    assert.equal(harness.counts.programs, 1);
    assert.equal(harness.counts.deletedShaders, 2);
    renderer.start();
    renderer.start();
    assert.equal(harness.pending.size, 1);
    for (let tick = 0; tick < 240; tick++) harness.step(1000 / 240);
    assert(harness.draws.length >= 28, "A live renderer must actually draw.");
    assert(harness.draws.length <= 31, "240 Hz callbacks cannot cause more than 30 Hz draws plus the first frame.");
    assert.equal(harness.frames, harness.draws.length);
    assert.equal(harness.pending.size, 1);
    renderer.stop();
    assert.equal(harness.pending.size, 0);
    const stopped = harness.frames;
    harness.step(1000);
    assert.equal(harness.frames, stopped);
    renderer.dispose();
    renderer.dispose();
    renderer.start();
    assert.equal(harness.pending.size, 0);
    assert.equal(harness.counts.deletedPrograms, 1);
    assert.equal(harness.counts.deletedArrays, 1);
    assert.equal(harness.colorCanvas.width, 0);
    assert.equal(harness.colorCanvas.height, 0);
  });

test("shader uniforms update without recompilation; stalls and pause/resume preserve bounded phase", () => {
  const harness = rendererHarness();
  const renderer = harness.create();
  renderer.start();
  harness.step(40);
  const firstTime = harness.uniforms.uTime;
  harness.step(1000);
  assert(Math.abs(harness.uniforms.uTime - firstTime - 0.02) < 0.000001);
  const programs = harness.counts.programs;
  renderer.configure({
    ...harness.config,
    colors: ["#D946EF", "#06B6D4", "#F59E0B"],
    speed: 0.17, scale: 2.75, intensity: 0.41,
  });
  harness.step(40);
  assert.equal(harness.counts.programs, programs);
  assert.equal(harness.uniforms.uScale, 2.75);
  assert.equal(harness.uniforms.uIntensity, 0.41);
  assert.deepEqual(harness.uniforms.uColorA, [217, 70, 239].map((channel) => channel / 255));
  const phase = harness.uniforms.uTime;
  renderer.stop();
  harness.step(5000);
  renderer.start();
  harness.step(40);
  assert(Math.abs(harness.uniforms.uTime - phase - 0.0068) < 0.000001);
  assert.equal(harness.counts.programs, programs);
  renderer.dispose();
});

test("shader buffer budgets survive high DPR, wide/tall/large canvases and repeated resize", () => {
  for (const bounds of [
    { width: 400, height: 200, dpr: 3 },
    { width: 3840, height: 2160, dpr: 2 },
    { width: 8000, height: 50, dpr: 1 },
    { width: 50, height: 8000, dpr: 1.5 },
    { width: 0, height: 0, dpr: 3 },
  ]) {
    const harness = rendererHarness(bounds);
    const renderer = harness.create();
    const { width, height } = harness.canvas;
    assert(width >= 1 && height >= 1);
    assert(width <= 2048 && height <= 2048);
    assert(width * height <= 1_300_000);
    if (bounds.width === 400) {
      assert.equal(width, 600, "DPR is capped at 1.5.");
      assert.equal(height, 300);
    }
    assert.equal(renderer.resize(), false);
    harness.host.bounds = { width: 200, height: 100 };
    assert.equal(renderer.resize(), true);
    renderer.dispose();
    assert.equal(renderer.resize(), false);
  }
});

test("missing or already-lost WebGL allocates no renderer resources", () => {
  for (const options of [{ noWebGL: true }, { lost: true }]) {
    const harness = rendererHarness(options);
    assert.equal(harness.create(), null);
    assert.equal(harness.counts.programs, 0);
    assert.equal(harness.counts.shaders, 0);
    assert.equal(harness.pending.size, 0);
  }
});

test("shader compile/link/allocation failures release every partially allocated resource", () => {
  for (const fail of ["compile", "link", "program", "array"]) {
    const harness = rendererHarness({ fail });
    assert.throws(() => harness.create(), /failure|allocation/i);
    assert.equal(harness.counts.deletedShaders, harness.counts.shaders, fail);
    assert.equal(harness.counts.deletedPrograms, harness.counts.programs, fail);
    assert.equal(harness.counts.deletedArrays, harness.counts.arrays, fail);
    assert.equal(harness.pending.size, 0, fail);
  }
});

test("lost renderer cannot draw and its loop is cancellable without invalid GPU deletion", () => {
  const harness = rendererHarness();
  const renderer = harness.create();
  renderer.start();
  harness.step(40);
  const frames = harness.frames;
  harness.loseContext();
  harness.step(40);
  assert.equal(harness.frames, frames);
  renderer.dispose();
  assert.equal(harness.pending.size, 0);
  assert.equal(harness.counts.deletedPrograms, 0, "Context-lost resources are already invalid.");
  renderer.start();
  harness.step(100);
  assert.equal(harness.frames, frames);
});

function environmentHarness({ intersection = true, scoped = false, nativeVisibility = true } = {}) {
  const mutationObservers = [];
  const intersections = [];
  class Media extends EventTarget {
    matches = false;
    change(value) { this.matches = value; this.dispatchEvent(new Event("change")); }
  }
  class Element {
    attributes = new Map();
    isConnected = true;
    shown = true;
    constructor(parentElement = null) {
      this.parentElement = parentElement;
      const values = new Map();
      this.style = {
        [Symbol.iterator]: () => values.keys(),
        getPropertyValue: (name) => values.get(name)?.value ?? "",
        getPropertyPriority: (name) => values.get(name)?.priority ?? "",
        setProperty: (name, value, priority = "") => {
          values.set(name, { value: String(value), priority });
          this.mutate("style");
        },
        removeProperty: (name) => {
          values.delete(name);
          this.mutate("style");
        },
      };
    }
    bounds = { width: 100, height: 100, top: 10, left: 10, right: 110, bottom: 110 };
    getBoundingClientRect() { return this.bounds; }
    getClientRects() {
      if (!this.shown || !this.isConnected || this.style.getPropertyValue("display") === "none") return [];
      return [this.bounds];
    }
    checkVisibility() {
      const hidden = (element) => !element.shown || !element.isConnected || element.attributes.has("hidden") ||
            element.style.getPropertyValue("display") === "none" ||
            element.style.getPropertyValue("opacity") === "0" ||
            ["hidden", "collapse"].includes(element.style.getPropertyValue("visibility"));
      if (hidden(this)) return false;
      // Native checkVisibility sees the host box even when that host suppresses
      // its own content. Descendants of a content-hidden ancestor are hidden.
      for (let parent = this.parentElement; parent; parent = parent.parentElement)
        if (hidden(parent) || parent.style.getPropertyValue("content-visibility") === "hidden") return false;
      return true;
    }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    setAttribute(name, value) {
      this.attributes.set(name, value);
      this.mutate(name);
    }
    mutate(name) {
      for (const observer of mutationObservers)
        if (!observer.disposed && observer.targets.some(
          ([target, options]) => target === this && options.attributeFilter.includes(name),
        )) observer.callback([{ target: this, attributeName: name }]);
    }
    closest() {
      if (this.attributes.has("data-motion-level")) return this;
      for (let parent = this.parentElement; parent; parent = parent.parentElement)
        if (parent.attributes.has("data-motion-level")) return parent;
      return null;
    }
  }
  const root = new Element();
  root.setAttribute("data-motion-level", "expressive");
  const scope = scoped ? new Element(root) : root;
  if (scoped) scope.setAttribute("data-motion-level", "gentle");
  const host = new Element(scope);
  if (!nativeVisibility) host.checkVisibility = undefined;
  const document = Object.assign(new EventTarget(), {
    documentElement: root,
    visibilityState: "visible",
  });
  const media = new Map([
    ["(prefers-reduced-motion: reduce)", new Media()],
    ["(hover: hover) and (pointer: fine)", new Media()],
    ["(forced-colors: active)", new Media()],
  ]);
  media.get("(hover: hover) and (pointer: fine)").matches = true;
  const window = Object.assign(new EventTarget(), {
    innerWidth: 1440, innerHeight: 1000,
    matchMedia: (query) => media.get(query),
  });
  class MutationObserver {
    targets = [];
    disposed = false;
    constructor(callback) { this.callback = callback; mutationObservers.push(this); }
    observe(target, options) { this.targets.push([target, options]); }
    disconnect() { this.disposed = true; }
  }
  class IntersectionObserver {
    disposed = false;
    constructor(callback) { this.callback = callback; intersections.push(this); }
    observe() {}
    disconnect() { this.disposed = true; }
    deliver(inView) {
      if (!this.disposed)
        this.callback([{ isIntersecting: inView, intersectionRatio: inView ? 1 : 0 }]);
    }
  }
  const changes = [];
  const { watchEffectEnvironment } = loadSourceModule(
    "src/components/effects/effect-motion.ts",
    {
      window, document, MutationObserver,
      getComputedStyle: (element) => ({
        visibility: element.style.getPropertyValue("visibility") || "visible",
        opacity: element.style.getPropertyValue("opacity") || "1",
        contentVisibility: element.style.getPropertyValue("content-visibility") || "visible",
      }),
      IntersectionObserver: intersection ? IntersectionObserver : undefined,
    },
    { react: { useEffect() { assert.fail("watchEffectEnvironment must not call React hooks."); } } },
  );
  const remove = watchEffectEnvironment(host, (value) => changes.push(JSON.parse(JSON.stringify(value))));
  return {
    root, scope, host, document, window, media, changes, remove, intersections, mutationObservers,
    get current() { return changes.at(-1); },
  };
}

test("real effect environment reacts to offscreen, reduced/off/forced motion, hidden documents and coarse pointers", () => {
  const harness = environmentHarness();
  assert.deepEqual(harness.current, { inView: false, visible: true, motion: true, finePointer: true });
  harness.intersections[0].deliver(true);
  assert.equal(harness.current.inView, true);
  harness.intersections[0].deliver(false);
  assert.equal(harness.current.inView, false);
  harness.media.get("(prefers-reduced-motion: reduce)").change(true);
  assert.equal(harness.current.motion, false);
  harness.media.get("(prefers-reduced-motion: reduce)").change(false);
  assert.equal(harness.current.motion, true);
  harness.root.setAttribute("data-motion-level", "off");
  assert.equal(harness.current.motion, false);
  harness.root.setAttribute("data-motion-level", "gentle");
  assert.equal(harness.current.motion, true);
  harness.media.get("(forced-colors: active)").change(true);
  assert.equal(harness.current.motion, false);
  harness.media.get("(forced-colors: active)").change(false);
  harness.document.visibilityState = "hidden";
  harness.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(harness.current.visible, false);
  harness.document.visibilityState = "visible";
  harness.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(harness.current.visible, true);
  harness.media.get("(hover: hover) and (pointer: fine)").change(false);
  assert.equal(harness.current.finePointer, false);
  harness.remove();
  assert(harness.intersections[0].disposed);
  assert(harness.mutationObservers.every((observer) => observer.disposed));
  const count = harness.changes.length;
  harness.media.get("(prefers-reduced-motion: reduce)").change(true);
  harness.document.dispatchEvent(new Event("visibilitychange"));
  harness.window.dispatchEvent(new Event("aureform:appearance-change"));
  harness.root.setAttribute("data-motion-level", "off");
  harness.intersections[0].deliver(true);
  assert.equal(harness.changes.length, count, "Disposed listeners cannot continue notifying.");
});

test("nearest appearance scope controls motion while reduced preference still overrides it", () => {
  const harness = environmentHarness({ scoped: true });
  harness.root.setAttribute("data-motion-level", "off");
  assert.equal(harness.current.motion, true);
  harness.scope.setAttribute("data-motion-level", "off");
  assert.equal(harness.current.motion, false);
  harness.scope.setAttribute("data-motion-level", "expressive");
  assert.equal(harness.current.motion, true);
  harness.media.get("(prefers-reduced-motion: reduce)").change(true);
  assert.equal(harness.current.motion, false);
  harness.remove();
});

test("actual visibility gating reacts to hidden ancestors and ignores its own pointer variable writes", () => {
  const harness = environmentHarness({ scoped: true });
  harness.intersections[0].deliver(true);
  const notifications = harness.changes.length;
  harness.host.style.setProperty("--afx-pointer-x", "23%");
  harness.host.style.setProperty("--afx-rotate-x", "4deg");
  assert.equal(harness.changes.length, notifications, "Pointer writes must not feed their own observer.");
  for (const [property, hidden, visible] of [
    ["opacity", "0", "1"],
    ["visibility", "hidden", "visible"],
    ["content-visibility", "hidden", "visible"],
    ["display", "none", "block"],
  ]) {
    harness.scope.style.setProperty(property, hidden);
    assert.equal(harness.current.visible, false, `Hidden ancestor ${property}`);
    harness.scope.style.setProperty(property, visible);
    assert.equal(harness.current.visible, true, `Restored ancestor ${property}`);
  }
  harness.host.style.setProperty("content-visibility", "hidden");
  assert.equal(harness.host.checkVisibility(), true, "Native host-box visibility alone misses hidden host content.");
  assert.equal(harness.current.visible, false);
  harness.host.style.setProperty("content-visibility", "visible");
  assert.equal(harness.current.visible, true);
  harness.host.isConnected = false;
  harness.window.dispatchEvent(new Event("resize"));
  assert.equal(harness.current.visible, false);
  harness.remove();
});

test("without native checkVisibility the real fallback checks geometry, opacity and hidden ancestor content", () => {
  const harness = environmentHarness({ scoped: true, nativeVisibility: false });
  assert.equal(harness.current.visible, true);
  harness.scope.style.setProperty("content-visibility", "hidden");
  assert.equal(harness.current.visible, false);
  harness.scope.style.setProperty("content-visibility", "visible");
  harness.scope.style.setProperty("opacity", "0");
  assert.equal(harness.current.visible, false);
  harness.scope.style.setProperty("opacity", "1");
  assert.equal(harness.current.visible, true);
  harness.host.style.setProperty("display", "none");
  assert.equal(harness.current.visible, false);
  harness.host.style.setProperty("display", "block");
  assert.equal(harness.current.visible, true);
  harness.remove();
});

test("without IntersectionObserver the actual fallback measures scroll/resize and removes its listeners", () => {
  const harness = environmentHarness({ intersection: false });
  assert.equal(harness.current.inView, true);
  harness.host.bounds = { width: 100, height: 100, top: 1100, bottom: 1200, left: 10, right: 110 };
  harness.window.dispatchEvent(new Event("scroll"));
  assert.equal(harness.current.inView, false);
  harness.host.bounds = { width: 100, height: 100, top: 10, bottom: 110, left: 10, right: 110 };
  harness.window.dispatchEvent(new Event("resize"));
  assert.equal(harness.current.inView, true);
  harness.remove();
  const count = harness.changes.length;
  harness.window.dispatchEvent(new Event("scroll"));
  harness.window.dispatchEvent(new Event("resize"));
  assert.equal(harness.changes.length, count);
});
