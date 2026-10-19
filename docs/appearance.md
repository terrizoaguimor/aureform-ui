# Aureform 1.1 appearance

The complete suite has 65 views: 64 suite routes and the landing. Appearance Studio (`/en/studio/` or `/es/studio/`), Themes (`/en/themes/` or `/es/themes/`) and Effects (`/en/effects/` or `/es/effects/`) extend the existing 44 core component families. Version 1.1 browser and native QA is pending the owner’s recorded results.

## Palettes and live editing

Choose Aurora, Violet, Ocean, Mint, Ember or Rose in Themes or the appearance drawer. Light/Dark is independent of the palette. Studio provides color inputs and shade scales, material, radius, density, typography, shadows, borders, gradient stops and direction, hover behavior, motion and shader controls.

`src/lib/appearance.ts` is the pure configuration contract. `createAppearance(palette, theme)` creates a complete configuration; `normalizeAppearance` validates choices and ranges; `resolveAppearance` derives CSS variables. The token generator calls `scripts/lib/appearance-tokens.mjs` so generated defaults, palette colors, effects, shades and radii use this same contract. Primitive and resolved-variable counts are generated, not fixed documentation constants.

The resolved values include `--af-control-color-1` through `--af-control-color-4` for gradient controls, alongside decorative color and shade variables. They follow the configured gradient stops and the control foreground. Use the provider or generated/exported CSS to obtain these values; recheck contrast in the final host after customization.

`Providers` supplies locale, tooltip/toast and appearance context. Use `useAppearance()` inside it to update the document and read the current configuration. `AppearanceScope` supplies an isolated configuration to one example without changing the document or saving it as a global preference.

## Presets and exports

Save a named preset in Studio, apply it later, duplicate it to start another variation, or delete it. Presets and the current appearance persist in browser localStorage. There is no account, remote preset database or automatic synchronization between devices.

| Export | How to use it                                                                                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON   | Copy/download a complete configuration. Paste it into Studio’s import dialog or choose the exported file. Validation runs before applying it.                                            |
| CSS    | Include the exported resolved variables with the kit’s global, token and effect styles. This supplies the appearance values; it does not install component source or JavaScript effects. |
| React  | Copy/download a complete client example with its imports, handlers, configuration and `AppearanceScope`. Copy the referenced source dependencies into your Next.js host.                 |

Appearance JSON has schema `version: 1`; the kit release is `1.1.0`. `parseAppearance` rejects invalid fields and files larger than 32 KB. `serializeAppearance` and `appearanceToCSS` provide the same pure exports to your own code. `exportConfiguredExample` wraps a complete named React example in an appearance scope.

```tsx
"use client";

import { AppearanceScope } from "@/components/appearance-provider";
import { createAppearance } from "@/lib/appearance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GradientBackground } from "@/components/effects/gradient-background";

const appearance = createAppearance("ocean", "light");

export default function ProductPreview() {
  return (
    <AppearanceScope appearance={appearance}>
      <GradientBackground
        kind={appearance.gradient.kind}
        colors={appearance.gradient.stops.map((stop) => stop.color)}
        angle={appearance.gradient.angle}
        intensity={appearance.gradient.intensity}
        className="p-6"
      >
        <Card appearance="glass">
          <CardContent className="grid gap-4">
            <Badge appearance="soft">Local preview</Badge>
            <Button appearance="gradient">Continue</Button>
          </CardContent>
        </Card>
      </GradientBackground>
    </AppearanceScope>
  );
}
```

## Additive component props

| Component | `appearance` options                            | Other source controls                                                     |
| --------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| Button    | `solid`, `soft`, `outline`, `glass`, `gradient` | `variant`, `size`, `shape`, `loading`, `disabled` and native button props |
| Badge     | `solid`, `soft`, `outline`, `glass`, `gradient` | Existing tone through `variant` and span props                            |
| Card      | `flat`, `elevated`, `glass`, `gradient`         | Existing card parts, children and div props                               |

These are separate props. For example, `<Button variant="outline" appearance="glass" size="sm">Continue</Button>` keeps the Button variant and size contracts. Warning/destructive treatments retain the source's semantic overrides. Omitting `appearance` preserves each component's normal behavior; Card can follow the provider's material.

Button's `shape` is `rounded` (default), `pill` or `square`. Use it with `size="sm"`, the default size or `size="lg"`; the current comfortable density resolves those heights to 32, 42 and 48 px. The rounded shape follows the configured medium radius, pill uses a fully rounded edge and square removes the radius. For example, `<Button shape="pill" appearance="gradient" size="sm">Continue</Button>` uses the existing Button API. Loading disables the action and exposes its busy state; the source retains the supplied accessible name.

## Reusable effects and the starter

The six source exports are GradientBackground, ShaderBackground, SpotlightCard, GlowBorder, TiltCard and MagneticButton. Use the Effects gallery for recipes and editable previews. See [the effects guide](effects.es.md) for props and [the shader guide](shaders.md) for runtime details.

The CLI starter includes its own palette, Light/Dark and motion controls, providers, all six effect sources, local fonts and the token helper. Its home is an editable product overview. The complete suite’s Studio/Themes/Effects routes remain in the full source kit. Copy more templates when your product needs those screens.

Code Connect reads only native properties recorded by the owner. A supported source `appearance` option does not invent a Figma property or master ID. Current local contracts and pending mappings are in [the manifest](../.figma/code-connect-manifest.json); live Figma execution and cloud publication are separate.
