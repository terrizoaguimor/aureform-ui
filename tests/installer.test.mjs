import test from "node:test";
import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { initProject, addItems } from "../bin/aureform.mjs";
import {
  entries,
  dependencyClosure,
  importsOf,
  resolveLocal,
  kitRoot,
  theme,
} from "../scripts/lib/source-graph.mjs";
import {
  createAppearance,
  palettePresets,
  resolveAppearance,
} from "../src/lib/appearance.ts";
import { synchronizeAppearanceTokens } from "../scripts/lib/appearance-tokens.mjs";

const requiredSemanticKeys = [
  "background",
  "surface",
  "surface-subtle",
  "border",
  "foreground",
  "muted-foreground",
  "primary",
  "primary-hover",
  "primary-foreground",
  "accent",
  "accent-foreground",
  "warning",
  "warning-foreground",
  "destructive",
  "destructive-foreground",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
];
const requiredEffectKeys = [
  "af-shadow-soft",
  "af-shadow-elevated",
  "af-shadow-floating",
  "af-shade-primary",
  "af-shade-outline",
  "af-shade-surface",
  "af-shade-destructive",
  "af-shade-card",
  "af-gradient-surface",
  "af-gradient-hero",
  "af-gradient-control",
  "af-motion-fast",
  "af-motion-hover",
  "af-motion-easing",
  "af-motion-lift",
];
const hexColor = /^#[A-Fa-f0-9]{6}$/;

async function sandbox(t) {
  const directory = await mkdtemp(resolve(tmpdir(), "aureform-install-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
test("every distributable entry resolves its complete source and npm dependency graph", async () => {
  for (const entry of Object.values(await entries())) {
    const graph = await dependencyClosure([entry.file]);
    assert.ok(graph.files.includes(entry.file), entry.name);
    assert.ok(graph.files.length > 0);
    for (const file of graph.files)
      for (const specifier of importsOf(
        await readFile(resolve(kitRoot, file), "utf8"),
      )) {
        const local = await resolveLocal(specifier, file);
        if (local)
          assert.ok(
            graph.files.includes(local),
            `${entry.name}: missing ${local}`,
          );
      }
  }
});
test("snippet text and comments cannot introduce false dependency imports", () => {
  assert.deepEqual(
    importsOf(
      'import {Button} from "@/components/ui/button";\nconst example=`import figma from "figma";`;\n// import "not-a-package";\nvoid import("maplibre-gl");',
    ),
    ["@/components/ui/button", "maplibre-gl"],
  );
});
test("starter is complete and protected add performs no partial source or manifest writes", async (t) => {
  const project = await sandbox(t);
  await initProject(project, { install: false });
  await readFile(resolve(project, "src/assets/fonts/Manrope.ttf"));
  await readFile(resolve(project, "src/app/layout.tsx"));
  for (const specifier of importsOf(
    await readFile(resolve(project, "src/app/page.tsx"), "utf8"),
  )) {
    if (specifier.startsWith("@/")) {
      const candidates = await Promise.allSettled(
        [".tsx", ".ts"].map((extension) =>
          access(resolve(project, `src/${specifier.slice(2)}${extension}`)),
        ),
      );
      assert.ok(
        candidates.some((candidate) => candidate.status === "fulfilled"),
        `Starter page import missing: ${specifier}`,
      );
    }
  }
  const target = resolve(project, "src/components/ui/button.tsx");
  await writeFile(target, "// product-specific component\n");
  const before = await readFile(resolve(project, "package.json"), "utf8"),
    css = await readFile(resolve(project, "src/app/globals.css"), "utf8");
  await assert.rejects(
    () => addItems(["button"], project),
    /Existing file protected/,
  );
  assert.equal(
    await readFile(target, "utf8"),
    "// product-specific component\n",
  );
  assert.equal(
    await readFile(resolve(project, "package.json"), "utf8"),
    before,
  );
  assert.equal(
    await readFile(resolve(project, "src/app/globals.css"), "utf8"),
    css,
  );
  await addItems(["button"], project, { overwrite: true });
  assert.match(await readFile(target, "utf8"), /ButtonPrimitive/);
});
test("component and block install honors root projects and customized aliases", async (t) => {
  const project = await sandbox(t);
  await mkdir(resolve(project, "app"));
  await writeFile(
    resolve(project, "app/globals.css"),
    '@import "tailwindcss";\n',
  );
  await writeFile(
    resolve(project, "package.json"),
    JSON.stringify({
      name: "consumer",
      dependencies: { react: "19.3.1", "react-dom": "19.3.1", next: "16.4.2" },
      devDependencies: {},
    }),
  );
  await writeFile(
    resolve(project, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { paths: { "~/*": ["./*"] } } }),
  );
  await writeFile(
    resolve(project, "components.json"),
    JSON.stringify({
      tailwind: { css: "app/globals.css" },
      aliases: {
        ui: "~/design/ui",
        components: "~/design",
        lib: "~/core",
        utils: "~/core/utils",
        hooks: "~/hooks",
      },
    }),
  );
  const result = await addItems(["button", "revenue-panel"], project);
  assert.ok(result.sourceFiles >= 4);
  assert.match(
    await readFile(resolve(project, "design/ui/button.tsx"), "utf8"),
    /from "~\/core\/utils"/,
  );
  assert.match(
    await readFile(resolve(project, "design/blocks/revenue-panel.tsx"), "utf8"),
    /from "~\/design\/ui\/chart"/,
  );
  const manifest = JSON.parse(
    await readFile(resolve(project, "package.json"), "utf8"),
  );
  assert.ok(manifest.dependencies.recharts);
  assert.ok(manifest.dependencies["@base-ui/react"]);
  assert.match(
    await readFile(resolve(project, "app/globals.css"), "utf8"),
    /@import "\.\/aureform.css"/,
  );
});
test("installer rejects traversal names and symlink targets outside the destination", async (t) => {
  const project = await sandbox(t),
    outside = await sandbox(t);
  await initProject(project, { install: false });
  await assert.rejects(() => addItems(["../../other"], project), /Item names/);
  await rm(resolve(project, "src/components/ui"), { recursive: true });
  await symlink(outside, resolve(project, "src/components/ui"));
  await assert.rejects(() => addItems(["button"], project), /symlink outside/);
});
test("both themes retain valid semantic colors and expose complete effect tokens", async () => {
  const css = await theme();
  assert.deepEqual(Object.keys(css.light).sort(), Object.keys(css.dark).sort());
  for (const name of ["light", "dark"]) {
    const mode = css[name];
    const config = createAppearance("aurora", name);
    const resolved = resolveAppearance(config);
    for (const key of requiredSemanticKeys) {
      assert.match(mode[key], hexColor, `${name}/${key} must be an opaque semantic color.`);
      assert.equal(mode[key], resolved[`--${key}`], `${name}/${key} differs from the studio default.`);
    }
    for (const key of requiredEffectKeys) {
      assert.equal(typeof mode[key], "string", `${name}/${key} is missing.`);
      assert(mode[key].trim(), `${name}/${key} is empty.`);
      assert.equal(mode[key], resolved[`--${key}`]);
    }
    for (const name of ["soft", "elevated", "floating"])
      assert.match(
        mode[`af-shadow-${name}`],
        /\brgb\(\d+ \d+ \d+ \/ (?:0|1|0?\.\d+)\)/,
        `${name} must contain a resolved RGB shadow color.`,
      );
    for (const name of ["surface", "hero", "control"])
      assert.match(mode[`af-gradient-${name}`], /gradient\(/);
    assert.match(mode["af-gradient-control"], /^linear-gradient\([^,]+deg in srgb,/);
    assert.equal(mode["af-gradient-primary"], mode["af-gradient-control"]);
    const controlColors = mode["af-gradient-control"].match(/#[0-9A-F]{6}/gi);
    assert.equal(controlColors?.length, config.gradient.stops.length);
    for (let index = 1; index <= 4; index++) {
      assert.match(mode[`af-control-color-${index}`], hexColor);
      assert.equal(mode[`af-control-color-${index}`], controlColors[Math.min(index - 1, controlColors.length - 1)]);
    }
    assert.match(mode["af-motion-fast"], /^\d+ms$/);
    assert.match(mode["af-motion-hover"], /^\d+ms$/);
    assert.match(mode["af-motion-easing"], /^cubic-bezier\(/);
    assert.equal(mode["af-motion-lift"], "-4px");
    assert.match(mode["font-display"], /var\(--font-manrope/);
    for (const size of ["sm", "md", "lg", "xl"]) {
      assert.equal(mode[`radius-${size}`], resolved[`--radius-${size}`]);
      assert.equal(mode[`af-radius-${size}`], resolved[`--af-radius-${size}`]);
      assert.match(css.theme[`radius-${size}`], new RegExp(`^var\\(--af-radius-${size},`));
    }
    // Appearance adds fonts, measures, material values, and shade scales. Those
    // are CSS values with their own types, not additional semantic HEX colors.
    for (const [variable, value] of Object.entries(resolved))
      assert.equal(mode[variable.slice(2)], value, `${name}/${variable}: incomplete installer theme.`);
    assert.equal(mode["af-control-height"], config.density === "compact" ? "36px" : "42px");
    assert.equal(mode["af-radius"], `${config.radius}px`);
    for (const [color, value] of Object.entries(config.colors)) {
      assert.equal(mode[`af-color-${color}`], value);
      assert.equal(mode[`af-${color}-500`], value);
    }
  }
  assert.notEqual(css.light.background, css.dark.background);
  assert.notEqual(css.light["af-shadow-soft"], css.dark["af-shadow-soft"]);
  assert.notEqual(css.light["af-gradient-hero"], css.dark["af-gradient-hero"]);
});

test("generated token primitives and all six palette themes match their appearance profiles", async () => {
  const tokens = JSON.parse(
    await readFile(resolve(kitRoot, "tokens/aureform.tokens.json"), "utf8"),
  );
  const ids = ["aurora", "violet", "ocean", "mint", "ember", "rose"];
  assert.deepEqual(tokens.palettes.map((palette) => palette.id), ids);
  assert.deepEqual(palettePresets.map((palette) => palette.id), ids);
  const primitiveColors = new Set(Object.values(tokens.primitives));
  for (const [name, value] of Object.entries(tokens.primitives))
    assert.match(value, hexColor, `${name}: invalid primitive color.`);
  for (const name of requiredSemanticKeys) {
    assert(tokens.semantic[name], `${name}: missing semantic mapping.`);
    for (const mode of ["light", "dark"]) {
      const primitive = tokens.semantic[name][mode];
      assert.equal(typeof primitive, "string");
      assert.match(tokens.primitives[primitive], hexColor, `${name}/${mode}: missing primitive reference.`);
      assert.equal(
        tokens.primitives[primitive],
        resolveAppearance(createAppearance("aurora", mode))[`--${name}`],
      );
    }
  }
  for (const [index, palette] of tokens.palettes.entries()) {
    assert.equal(palette.name, palettePresets[index].name);
    assert.deepEqual(palette.colors, palettePresets[index].colors);
    for (const mode of ["light", "dark"]) {
      const config = createAppearance(palette.id, mode);
      const resolved = resolveAppearance(config);
      assert.deepEqual(Object.values(config.colors), palette.colors);
      for (const name of requiredSemanticKeys) {
        assert.match(palette.themes[mode][name], hexColor);
        assert.equal(palette.themes[mode][name], resolved[`--${name}`], `${palette.id}/${mode}/${name}`);
        assert(primitiveColors.has(resolved[`--${name}`]), `${palette.id}/${mode}/${name}: primitive missing.`);
      }
      for (const [variable, color] of Object.entries(resolved)) {
        if (/^--af-(color-(primary|secondary|tertiary)|(primary|secondary|tertiary)-\d+|control-color-[1-4])$/.test(variable)) {
          assert.match(color, hexColor);
          assert(primitiveColors.has(color), `${palette.id}/${mode}/${variable}: generated color primitive missing.`);
        }
      }
      const controlColors = resolved["--af-gradient-control"].match(/#[0-9A-F]{6}/gi);
      assert.equal(controlColors?.length, config.gradient.stops.length);
      assert.match(resolved["--af-gradient-control"], /^linear-gradient\([^,]+deg in srgb,/);
      for (const color of controlColors)
        assert(primitiveColors.has(color), `${palette.id}/${mode}: exported control-gradient color primitive missing.`);
    }
  }
  assert.deepEqual(
    synchronizeAppearanceTokens(structuredClone(tokens)),
    tokens,
    "Generated tokens are stale; regenerate them from the appearance profiles.",
  );
});
