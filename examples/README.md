# Aureform UI component examples

Prepared on 2026-10-18: **44 independent Client React examples**, one for each `ComponentFamily`. Each file has `"use client"`, all required imports, a named default component with no required props, and its own state, handlers, types, labels and fixtures.

Copy the **whole file** from `components/<Family>.tsx` into a Client component or an App Router page. The examples use the kit's existing `@/*` alias for `src/*`, installed dependencies, global Tailwind styles and semantic tokens. They do not depend on another example file.

## Complete copy payloads

[`src/lib/component-example-sources.ts`](../src/lib/component-example-sources.ts) exports:

```ts
import {
  componentExampleSources,
  getComponentExampleSource,
} from "@/lib/component-example-sources";

const dialogSource = getComponentExampleSource("Dialog");
const tableSource = componentExampleSources.DataTable;
```

`componentExampleSources` is a pure static `Record<ComponentFamily, string>`. Each entry is byte-identical to its corresponding `.tsx` file, including imports and `"use client"`. The optional getter only looks up the record. The component catalog's copy button returns these complete files.

After editing an example, update its matching static string as well. The local validator checks equality and compiles both representations.

## State, labels and providers

Input and Textarea use linked visible labels; Field supplies its linked description and error. The remaining controls have visible labels or legends and their actual UI naming props. All state and actions are local demonstrations: there is no auth, upload request, persistence or backend dependency.

Compound examples include all referenced primitives and Button imports. DataTable declares its `Customer` type, `ColumnDef<Customer>[]`, rows and complete `DataTableLabels`. DateRangePicker imports `DateRange` from `react-day-picker`; FileUpload declares all six `UploadLabels` fields.

Tooltip includes the real `TooltipProvider`. Toast declares a **local `ToastProvider` helper around the real `Toaster` export**: the UI module exports `Toaster` and `toast`, not a provider by that name. A per-instance toaster ID routes this example's notifications to its own host, including when the surrounding app already has a Toaster.

Navigation hrefs in TextLink, Breadcrumb and Sidebar target existing `/en/` kit routes. Adapt those hrefs to the consuming application.

## Original media assets

Carousel, Gallery and VideoPlayer reference shipped original public assets:

| Public URL                     | Used by                               |
| ------------------------------ | ------------------------------------- |
| `/assets/art/arc.svg`          | Carousel, Gallery, VideoPlayer poster |
| `/assets/art/morrow.svg`       | Carousel, Gallery                     |
| `/assets/art/studio.svg`       | Carousel, Gallery                     |
| `/assets/aureform-motion.webm` | VideoPlayer                           |
| `/assets/aureform-motion.vtt`  | VideoPlayer captions                  |

Keep these files under the same `public/assets/` paths when consuming the full kit, or replace the URLs with your own assets. The examples include image alternatives, captions and video control labels.

## Coverage

| Group      | Example files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions    | [Button](components/Button.tsx), [ButtonGroup](components/ButtonGroup.tsx), [TextLink](components/TextLink.tsx)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Navigation | [Breadcrumb](components/Breadcrumb.tsx), [Pagination](components/Pagination.tsx), [Tabs](components/Tabs.tsx), [Sidebar](components/Sidebar.tsx), [Command](components/Command.tsx)                                                                                                                                                                                                                                                                                                                                                          |
| Forms      | [Input](components/Input.tsx), [Field](components/Field.tsx), [Textarea](components/Textarea.tsx), [Select](components/Select.tsx), [Combobox](components/Combobox.tsx), [MultiSelect](components/MultiSelect.tsx), [Checkbox](components/Checkbox.tsx), [RadioGroup](components/RadioGroup.tsx), [Switch](components/Switch.tsx), [Slider](components/Slider.tsx), [DatePicker](components/DatePicker.tsx), [DateRangePicker](components/DateRangePicker.tsx), [InputOTP](components/InputOTP.tsx), [FileUpload](components/FileUpload.tsx) |
| Data       | [Card](components/Card.tsx), [Avatar](components/Avatar.tsx), [Badge](components/Badge.tsx), [Table](components/Table.tsx), [DataTable](components/DataTable.tsx), [Chart](components/Chart.tsx)                                                                                                                                                                                                                                                                                                                                             |
| Feedback   | [Alert](components/Alert.tsx), [Toast](components/Toast.tsx), [Progress](components/Progress.tsx), [Spinner](components/Spinner.tsx), [Skeleton](components/Skeleton.tsx), [Empty](components/Empty.tsx)                                                                                                                                                                                                                                                                                                                                     |
| Overlays   | [Tooltip](components/Tooltip.tsx), [Popover](components/Popover.tsx), [Dialog](components/Dialog.tsx), [Drawer](components/Drawer.tsx), [DropdownMenu](components/DropdownMenu.tsx), [Accordion](components/Accordion.tsx)                                                                                                                                                                                                                                                                                                                   |
| Media      | [Carousel](components/Carousel.tsx), [Gallery](components/Gallery.tsx), [VideoPlayer](components/VideoPlayer.tsx), [Ribbon](components/Ribbon.tsx)                                                                                                                                                                                                                                                                                                                                                                                           |

## Validation

Run from the extracted kit root after installing dependencies:

```sh
pnpm verify:examples
```

The portable validator checks all 44 families, Client directives, complete default functions, the pure typed record, byte equality, media assets and strict TypeScript compilation of both original files and copied payloads. Results are saved in `artifacts/examples-validation/validation-summary.json`.

With a production preview running, verify the actual browser copy buttons and the code dialog in both languages, both themes and three viewport widths:

```sh
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:copy
```

The recorded results include 44 matching copied files and 12 passing code-dialog combinations. See [the verification record](../docs/verification.md).

[MotionSystem.tsx](MotionSystem.tsx) is an additional complete example for GSAP entrances, optional Lenis scrolling and theme-aware effects. It supplements the 44 UI families.
