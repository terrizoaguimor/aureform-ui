# Tokens and appearance

Aureform uses semantic CSS variables rather than fixed colors inside each component. Utilities such as `bg-surface`, `text-foreground` and `border-border` resolve through the host's Tailwind theme. Keep that global stylesheet even when installing a single component.

## Follow the source pipeline

[`src/lib/appearance.ts`](../../../src/lib/appearance.ts) defines the pure configuration contract. `createAppearance` produces a complete configuration; `normalizeAppearance` validates choices and ranges; `resolveAppearance` derives CSS variables.

1. Change palette and appearance defaults in that contract.
2. Edit independent spacing or typography values in [`tokens/aureform.tokens.json`](../../../tokens/aureform.tokens.json) when needed.
3. Run the generator from the checkout:

```sh
pnpm tokens
```

The generator synchronizes appearance-derived colors, effects, palettes and radii before writing [`src/styles/tokens.css`](../../../src/styles/tokens.css). Editing those generated values directly will not survive regeneration. The [token helper](../../../scripts/lib/appearance-tokens.mjs) describes which values are derived.

## Scope a configured example

Palette IDs are `aurora`, `violet`, `ocean`, `mint`, `ember` and `rose`. Theme is independently `light` or `dark`.

```tsx
"use client";

import { AppearanceScope } from "@/components/appearance-provider";
import { createAppearance } from "@/lib/appearance";
import { Button } from "@/components/ui/button";

const appearance = createAppearance("ocean", "light");
appearance.motion = "gentle";

export default function AppearanceExample() {
  return (
    <AppearanceScope appearance={appearance} className="p-6">
      <Button appearance="gradient">Continue</Button>
    </AppearanceScope>
  );
}
```

The scope applies resolved variables to this example without saving a document-wide preference. For application-wide editing, use `AppearanceProvider` and `useAppearance().setAppearance`, or the full suite's `Providers`. Settings include material, radius, density, typography, gradients, shadows, borders, hover and motion.

## Export and validate settings

Studio saves named presets locally and exports JSON, CSS or React. `serializeAppearance` writes validated JSON; `parseAppearance` validates imported text and rejects inputs longer than 32,768 characters. Appearance schema `version: 1` is independent of the kit's release number.

`appearanceToCSS` exports resolved variables; it does not install components, Tailwind mappings or effect runtimes. Presets are browser preferences, not synchronized account data.

## Verify the final presentation

Review text, focus rings, charts and interactive gradients in both themes after customization. Decorative colors and control colors have different roles. The application token format is not a guaranteed Tokens Studio import or a native Figma variable export. Consult the [appearance guide](../../../docs/appearance.md) for API details and the [design token notes](../../../design/tokens/README.md) for the distinct design evidence scope.
