import { readFile, mkdir, writeFile } from "node:fs/promises";
import { synchronizeAppearanceTokens } from "./lib/appearance-tokens.mjs";
const tokens = synchronizeAppearanceTokens(JSON.parse(
  await readFile(
    new URL("../tokens/aureform.tokens.json", import.meta.url),
    "utf8",
  ),
));
await writeFile(
  new URL("../tokens/aureform.tokens.json", import.meta.url),
  `${JSON.stringify(tokens, null, 2)}\n`,
);
const declarations = (mode) =>
  Object.entries(tokens.semantic)
    .map(([name, value]) => `  --${name}: var(--primitive-${value[mode]});`)
    .join("\n");
const effectDeclarations = (mode) =>
  Object.entries(tokens.effects)
    .flatMap(([group, values]) =>
      Object.entries(values).map(
        ([name, value]) => `  --af-${group}-${name}: ${value[mode]};`,
      ),
    )
    .join("\n");
const appearanceDeclarations = (mode) =>
  Object.entries(tokens.defaults?.[mode] ?? {})
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
const primitives = Object.entries(tokens.primitives)
  .map(([name, value]) => `  --primitive-${name}: ${value};`)
  .join("\n");
const measures = [
  ...Object.entries(tokens.spacing).map(([k, v]) => `  --space-${k}: ${v}px;`),
  ...Object.entries(tokens.radius).map(([k, v]) => `  --radius-${k}: ${v}px;`),
  ...Object.entries(tokens.typography.sizes).map(
    ([k, v]) => `  --text-${k}: ${v}px;`,
  ),
].join("\n");
await mkdir(new URL("../src/styles", import.meta.url), { recursive: true });
await writeFile(
  new URL("../src/styles/tokens.css", import.meta.url),
  `/* Generated from tokens/aureform.tokens.json. Run pnpm tokens. */\n:root {\n${primitives}\n${declarations("light")}\n${measures}\n${effectDeclarations("light")}\n${appearanceDeclarations("light")}\n}\n.dark {\n${declarations("dark")}\n${effectDeclarations("dark")}\n${appearanceDeclarations("dark")}\n}\n`,
);
console.log(
  `Generated ${Object.keys(tokens.semantic).length} semantic colors, two themes, ${Object.keys(tokens.spacing).length} spacing tokens and ${Object.values(tokens.effects).reduce((count, values) => count + Object.keys(values).length, 0)} effects.`,
);
