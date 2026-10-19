import {
  createAppearance,
  palettePresets,
  resolveAppearance,
} from "../../src/lib/appearance.ts";

// Keep generated CSS, the registry and the Figma handoff on the same defaults.
export function synchronizeAppearanceTokens(tokens) {
  const semanticNames = Object.keys(tokens.semantic);
  const effects = Object.entries(tokens.effects).flatMap(([group, values]) =>
    Object.keys(values).map((name) => ({
      group,
      name,
      variable: `--af-${group}-${name}`,
    })),
  );
  const effectNames = new Set(effects.map((effect) => effect.variable));
  const primitives = {};
  const byColor = new Map();
  const defaults = {};
  for (const theme of ["light", "dark"]) {
    const resolved = resolveAppearance(createAppearance("aurora", theme));
    for (const name of semanticNames) {
      const color = resolved[`--${name}`];
      let primitive = byColor.get(color);
      if (!primitive) {
        primitive = `${theme}-${name}`;
        byColor.set(color, primitive);
        primitives[primitive] = color;
      }
      tokens.semantic[name][theme] = primitive;
    }
    for (const { group, name, variable } of effects)
      tokens.effects[group][name][theme] = resolved[variable];
    defaults[theme] = Object.fromEntries(
      Object.entries(resolved).filter(
        ([name]) =>
          !semanticNames.includes(name.slice(2)) && !effectNames.has(name),
      ),
    );
  }
  tokens.primitives = primitives;
  tokens.defaults = defaults;
  const resolved = resolveAppearance(createAppearance());
  for (const size of ["sm", "md", "lg", "xl"])
    tokens.radius[size] = Number.parseFloat(resolved[`--af-radius-${size}`]);
  tokens.palettes = palettePresets.map((palette) => ({
    ...palette,
    themes: Object.fromEntries(
      ["light", "dark"].map((theme) => {
        const values = resolveAppearance(createAppearance(palette.id, theme));
        return [
          theme,
          Object.fromEntries(
            semanticNames.map((name) => [name, values[`--${name}`]]),
          ),
        ];
      }),
    ),
  }));
  for (const palette of palettePresets) {
    for (const theme of ["light", "dark"]) {
      const values = resolveAppearance(createAppearance(palette.id, theme));
      for (const [variable, color] of Object.entries(values)) {
        if (
          !/^#[0-9A-F]{6}$/.test(color) ||
          (!semanticNames.includes(variable.slice(2)) &&
            !/^--af-(color-(primary|secondary|tertiary)|(primary|secondary|tertiary)-\d+|control-color-[1-4])$/.test(
              variable,
            )) ||
          byColor.has(color)
        )
          continue;
        const name = `palette-${palette.id}-${theme}-${variable.slice(2)}`;
        primitives[name] = color;
        byColor.set(color, name);
      }
    }
  }
  return tokens;
}
