# Accessibility

Aureform supplies accessible primitives and interaction patterns that you can preserve while adapting the source. Accessibility depends on the final composition, content, colors and services; the kit does not provide a whole-application WCAG certificate.

## Connect labels, help and errors

Use visible labels rather than placeholders as the only name. `Field` links its label and supporting text to a direct control child, and connects an error through `aria-invalid`, `aria-describedby` and an alert message.

```tsx
"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function EmailField() {
  return (
    <Field
      htmlFor="contact-email"
      label="Email"
      description="Use an email address you can access."
    >
      <Input type="email" name="email" autoComplete="email" />
    </Field>
  );
}
```

Pass an `error` string after your validation rejects a value. When composing a more complex child, verify its actual control receives the matching ID and descriptions. Icon-only actions need an explicit accessible name; decorative icons should not duplicate it.

## Preserve keyboard and focus behavior

1. Navigate the full workflow with Tab and Shift+Tab.
2. Open dialogs and menus, use their keyboard controls, close with Escape and check focus returns to the trigger.
3. Confirm loading and disabled controls cannot accidentally repeat an action.
4. Keep focus indicators visible against every chosen surface.

Base UI supplies behavior for the corresponding primitives, but caller markup can still break it. Retain titles, descriptions and documented composition. Give submit and non-submit buttons the appropriate `type`.

## Offer readable data alternatives

`DataTable` uses native headers, sorting state, selection controls and a keyboard-focusable horizontal scroll region. Supply a meaningful caption and localized labels.

`Chart` requires a descriptive `label` and renders a screen-reader data table with category and series headings. Use meaningful `valueLabel`, `secondaryLabel` and `tertiaryLabel` values. Preserve this alternative when customizing the plotted view, and avoid relying on color alone to communicate status.

## Check appearance and motion changes

Review both languages, both themes, narrow layouts and increased zoom. Write image alternatives that describe the actual content after cropping or replacement. Keep operating-system reduced motion effective; [MotionSystem](motion.md) restores visible content and native scrolling when appropriate.

Recorded automated scans have specific inputs and limitations. The [1.4 release scope](../../../docs/release-checklist-1.4.0.md) retains incomplete contrast results and does not claim full compliance. Use manual keyboard and assistive-technology review for your final application. [Component examples](../../../examples/README.md), [data-table behavior](../../../docs/data-table.md) and [chart contracts](../../../docs/charts.md) provide concrete patterns.
