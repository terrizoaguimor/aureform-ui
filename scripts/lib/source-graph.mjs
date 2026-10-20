import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
export const kitRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const extensions = [
  "",
  ".tsx",
  ".ts",
  ".mjs",
  ".js",
  ".css",
  "/index.tsx",
  "/index.ts",
];
export function importsOf(source) {
  const found = new Set();
  // Ignore imports shown inside demo snippets, strings and comments.
  const visible = source.split("");
  for (let i = 0; i < source.length; i++) {
    let end = i;
    if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
      const quote = source[i];
      end = i + 1;
      while (end < source.length) {
        if (source[end] === "\\") {
          end += 2;
          continue;
        }
        if (source[end++] === quote) break;
      }
    } else if (source.slice(i, i + 2) === "//") {
      end = source.indexOf("\n", i);
      if (end < 0) end = source.length;
    } else if (source.slice(i, i + 2) === "/*") {
      end = source.indexOf("*/", i + 2);
      end = end < 0 ? source.length : end + 2;
    }
    if (end > i) {
      for (let at = i; at < end; at++)
        if (visible[at] !== "\n") visible[at] = " ";
      i = end - 1;
    }
  }
  const code = visible.join("");
  for (const pattern of [
    /\b(?:import|export)\s+(?:[^;"']*?\s+from\s*)?["']([^"']+)["']/g,
    /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g,
    /@import\s+["']([^"']+)["']/g,
  ])
    for (const match of source.matchAll(pattern))
      if (code[match.index] !== " ") found.add(match[1]);
  return [...found];
}
export function packageOf(specifier) {
  return specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
}
export async function resolveLocal(specifier, from, root = kitRoot) {
  const base = specifier.startsWith("@/")
    ? resolve(root, "src", specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(resolve(root, from)), specifier)
      : null;
  if (!base) return null;
  if (!base.startsWith(root + sep))
    throw new Error(`Import escapes kit: ${specifier}`);
  for (const extension of extensions) {
    try {
      if ((await stat(base + extension)).isFile())
        return relative(root, base + extension).replaceAll(sep, "/");
    } catch {}
  }
  throw new Error(`Unresolved local import ${specifier} in ${from}`);
}
export async function entries(root = kitRoot) {
  const result = {};
  for (const [directory, type] of [
    ["ui", "registry:ui"],
    ["blocks", "registry:block"],
    ["templates", "registry:block"],
    ["effects", "registry:block"],
  ]) {
    for (const name of (
      await readdir(resolve(root, `src/components/${directory}`))
    ).sort()) {
      if (!name.endsWith(".tsx")) continue;
      const key = name.slice(0, -4);
      result[key] = {
        name: key,
        type,
        file: `src/components/${directory}/${name}`,
      };
    }
  }
  result["date-range-picker"] = {
    name: "date-range-picker",
    type: "registry:ui",
    file: "src/components/ui/date-picker.tsx",
  };
  result["customer-data-table"] = {
    name: "customer-data-table",
    type: "registry:block",
    file: "src/components/blocks/customer-table.tsx",
  };
  result["motion-system"] = {
    name: "motion-system",
    type: "registry:block",
    file: "src/components/motion-system.tsx",
  };
  result["appearance-provider"] = {
    name: "appearance-provider",
    type: "registry:block",
    file: "src/components/appearance-provider.tsx",
  };
  result["appearance-controls"] = {
    name: "appearance-controls",
    type: "registry:block",
    file: "src/components/appearance-controls.tsx",
  };
  result["workspace-provider"] = {
    name: "workspace-provider",
    type: "registry:block",
    file: "src/components/workspace-provider.tsx",
  };
  result["commerce-provider"] = {
    name: "commerce-provider",
    type: "registry:block",
    file: "src/components/commerce-provider.tsx",
  };
  for (const [name, file, type] of [
    [
      "integration-hub",
      "src/components/integrations/integration-hub.tsx",
      "registry:block",
    ],
    [
      "identity-integration-panel",
      "src/components/integrations/identity-panel.tsx",
      "registry:block",
    ],
    [
      "operational-integration-workbench",
      "src/components/integrations/operational-workbench.tsx",
      "registry:block",
    ],
    [
      "product-integration-workbench",
      "src/components/integrations/product-workbench.tsx",
      "registry:block",
    ],
    ["integrations", "src/lib/integrations/index.ts", "registry:lib"],
    [
      "integrations-http",
      "src/lib/integrations/http-adapter.ts",
      "registry:lib",
    ],
    [
      "integrations-demo",
      "src/lib/integrations/demo-adapter.ts",
      "registry:lib",
    ],
    [
      "integrations-suite",
      "src/lib/integrations/http-suite.ts",
      "registry:lib",
    ],
    ["auth-integration", "src/lib/auth-integration.ts", "registry:lib"],
    ["ai-integration", "src/lib/ai-integration.ts", "registry:lib"],
    [
      "commerce-providers",
      "src/lib/provider-commerce-adapter.ts",
      "registry:lib",
    ],
    [
      "connected-map",
      "src/components/integrations/connected-map.tsx",
      "registry:block",
    ],
    ["drive-picker", "src/lib/integrations/drive-picker.ts", "registry:lib"],
    [
      "drive-picker-panel",
      "src/components/integrations/drive-picker-panel.tsx",
      "registry:block",
    ],
    [
      "media-collection",
      "src/lib/integrations/media-collection.ts",
      "registry:lib",
    ],
    [
      "media-collection-panel",
      "src/components/integrations/media-collection-panel.tsx",
      "registry:block",
    ],
    [
      "enterprise-diagnostics",
      "src/components/integrations/enterprise-diagnostics.tsx",
      "registry:block",
    ],
    [
      "product-editor-controls",
      "src/components/integrations/product-editor-controls.tsx",
      "registry:block",
    ],
    [
      "search-bridge-command",
      "src/components/integrations/search-bridge-command.tsx",
      "registry:block",
    ],
  ])
    result[name] = { name, type, file };
  return result;
}
export async function dependencyClosure(entryFiles, root = kitRoot) {
  const manifest = JSON.parse(
    await readFile(resolve(root, "package.json"), "utf8"),
  );
  const files = new Set(),
    dependencies = new Set(),
    devDependencies = new Set(),
    assets = new Set();
  async function visit(file) {
    if (files.has(file)) return;
    files.add(file);
    const text = await readFile(resolve(root, file), "utf8");
    for (const specifier of importsOf(text)) {
      const local = await resolveLocal(specifier, file, root);
      if (local) {
        await visit(local);
        continue;
      }
      const pkg = packageOf(specifier);
      if (manifest.dependencies[pkg]) dependencies.add(pkg);
      else if (manifest.devDependencies[pkg]) devDependencies.add(pkg);
      else if (manifest.devDependencies[`@types/${pkg}`])
        devDependencies.add(`@types/${pkg}`);
      else if (!specifier.startsWith("node:"))
        throw new Error(`Undeclared package ${pkg} in ${file}`);
    }
    for (const match of text.matchAll(/["'`](\/assets\/[^"'`\s]+)["'`]/g)) {
      if (match[1].includes("${")) continue;
      const asset = `public${match[1]}`;
      try {
        if ((await stat(resolve(root, asset))).isFile()) assets.add(asset);
      } catch {}
    }
    if (file === "src/components/design-icon.tsx")
      for (const asset of await readdir(resolve(root, "public/assets/figma")))
        if (asset.endsWith(".svg")) assets.add(`public/assets/figma/${asset}`);
    if (file === "src/components/templates/media-studio.tsx")
      for (const asset of await readdir(resolve(root, "public/assets/art")))
        assets.add(`public/assets/art/${asset}`);
  }
  for (const file of entryFiles) await visit(file);
  return {
    files: [...files].sort(),
    assets: [...assets].sort(),
    dependencies: Object.fromEntries(
      [...dependencies]
        .sort()
        .map((name) => [name, manifest.dependencies[name]]),
    ),
    devDependencies: Object.fromEntries(
      [...devDependencies]
        .sort()
        .map((name) => [name, manifest.devDependencies[name]]),
    ),
  };
}
export function registryTarget(file) {
  if (file.startsWith("src/components/ui/")) return `@ui/${file.slice(18)}`;
  if (file.startsWith("src/components/"))
    return `@components/${file.slice(15)}`;
  if (file.startsWith("src/lib/")) return `@lib/${file.slice(8)}`;
  if (file.startsWith("src/hooks/")) return `@hooks/${file.slice(10)}`;
  if (file.startsWith("src/")) return `~/src/${file.slice(4)}`;
  return `~/${file}`;
}
export function registryFileType(file) {
  if (file.startsWith("src/components/ui/")) return "registry:ui";
  if (file.startsWith("src/hooks/")) return "registry:hook";
  if (file.startsWith("src/lib/")) return "registry:lib";
  if (file.startsWith("src/components/")) return "registry:component";
  return "registry:file";
}
export async function theme(root = kitRoot) {
  const tokens = JSON.parse(
    await readFile(resolve(root, "tokens/aureform.tokens.json"), "utf8"),
  );
  const colors = Object.keys(tokens.semantic),
    mode = (name) =>
      Object.fromEntries(
        colors.map((key) => [
          key,
          tokens.primitives[tokens.semantic[key][name]],
        ]),
      );
  return {
    theme: Object.fromEntries([
      ...colors.map((key) => [`color-${key}`, `var(--${key})`]),
      ["font-sans", 'var(--font-manrope, "Manrope", system-ui, sans-serif)'],
      [
        "font-editorial",
        'var(--font-instrument, "Instrument Serif", Georgia, serif)',
      ],
      ...Object.entries(tokens.radius)
        .filter(([key]) => key !== "full")
        .map(([key, value]) => [
          `radius-${key}`,
          `var(--af-radius-${key}, ${value}px)`,
        ]),
    ]),
    light: {
      ...mode("light"),
      ...Object.fromEntries(
        Object.entries(tokens.defaults?.light ?? {}).map(([key, value]) => [
          key.slice(2),
          value,
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(tokens.effects ?? {}).flatMap(([group, values]) =>
          Object.entries(values).map(([name, value]) => [
            `af-${group}-${name}`,
            value.light,
          ]),
        ),
      ),
    },
    dark: {
      ...mode("dark"),
      ...Object.fromEntries(
        Object.entries(tokens.defaults?.dark ?? {}).map(([key, value]) => [
          key.slice(2),
          value,
        ]),
      ),
      ...Object.fromEntries(
        Object.entries(tokens.effects ?? {}).flatMap(([group, values]) =>
          Object.entries(values).map(([name, value]) => [
            `af-${group}-${name}`,
            value.dark,
          ]),
        ),
      ),
    },
  };
}
export const registryCss = {
  ".editorial": {
    "font-family":
      'var(--font-display, var(--font-manrope, "Manrope", system-ui, sans-serif))',
    "font-weight": "var(--af-display-weight, 650)",
    "letter-spacing": "-.035em",
  },
  ".chart-shell .recharts-cartesian-axis-tick text": {
    fill: "var(--muted-foreground)",
    "font-size": "11px",
  },
  ".chart-shell .recharts-cartesian-grid line": {
    stroke: "var(--border)",
    "stroke-dasharray": "3 4",
  },
  "@media (prefers-reduced-motion: reduce)": {
    "*": {
      "animation-duration": ".01ms !important",
      "transition-duration": ".01ms !important",
    },
  },
  ".rdp-root": {
    "--rdp-accent-color": "var(--primary)",
    "--rdp-accent-background-color": "var(--accent)",
    "--rdp-day-height": "36px",
    "--rdp-day-width": "36px",
  },
};
export function isTextAsset(file) {
  return [".svg", ".json", ".txt", ".md", ".vtt", ".css"].includes(
    extname(file),
  );
}
