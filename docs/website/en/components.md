# Components and composition

Aureform separates UI primitives, reusable blocks and application templates. Start with the smallest layer that solves your problem. The 44 core families have independent examples; the 134 registry entries also include providers, effects and composed workflows.

## Copy a complete example

1. Install the required source through the [local CLI](cli.md) or [registry](installation.md).
2. Copy the whole relevant file from [component examples](../../../examples/README.md), including imports, state, types and handlers.
3. Replace fixtures, navigation destinations and labels with your application's values.
4. Preserve loading, empty, error, disabled and keyboard interaction states.

The examples use `@/*` for `src/*`. The local installer can rewrite imports to supported destination aliases in `components.json`; handwritten snippets must use your host's actual aliases. Copy referenced media into the appropriate public paths or provide your own assets.

## Use Button without the suite shell

With the source, dependencies, global Tailwind stylesheet and semantic styles installed, this example needs no locale, workspace or commerce provider:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function FollowButton() {
  const [following, setFollowing] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      appearance="glass"
      size="sm"
      shape="pill"
      aria-pressed={following}
      onClick={() => setFollowing((value) => !value)}
    >
      {following ? "Following updates" : "Follow updates"}
    </Button>
  );
}
```

This toggles local state only. `variant`, `appearance`, `size` and `shape` are separate props. Button supports `loading`, which disables the action and exposes its busy state. Keep a meaningful accessible name.

## Supply context where the source requires it

The full [`Providers`](../../../src/components/providers.tsx) composition is `NextIntlClientProvider` → `AppearanceProvider` → `WorkspaceProvider` → `CommerceProvider`, with tooltip and toast support inside. Translated blocks use locale context; commerce reads workspace state; appearance controls read appearance context.

For an isolated appearance specimen, use `AppearanceScope`. For a full demonstration workflow, use `Providers` or `AppPage`. Do not add the complete provider tree solely to style a core Button.

## Build on source contracts

Compound controls require their documented parts, labels and focus behavior. Application templates may contain demo routes and browser persistence; inspect their dependencies before adopting them. [Data tables](data-table.md), [Charts](charts.md), [Accessibility](accessibility.md) and the [SaaS contracts](../../../docs/saas-operations.md) explain the larger compositions and consumer-owned data boundaries.
