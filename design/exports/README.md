# Actual Figma SVG exports

These files were downloaded directly from Aureform's Figma file on 2026-10-19. [manifest.json](manifest.json) records each exact node, byte count and SHA-256. Temporary download URLs are deliberately absent.

| Export | Native node | Scope |
| --- | --- | --- |
| [Dashboard](svg/dashboard.svg) | `5:2` | SaaS overview template |
| [Customers](svg/customers.svg) | `237:18891` | Customers template, Dark |
| [Onboarding](svg/onboarding.svg) | `237:16692` | Onboarding template, Dark |
| [Palettes, Light](svg/palettes-light.svg) | `101:726` | Six native palette specimens |
| [Palettes, Dark](svg/palettes-dark.svg) | `101:25` | Six native palette specimens |
| [Button Shapes](svg/button-shapes.svg) | `176:4598` | Nine native shape/size variants |
| [Chart](svg/chart-library.svg) | `23:501` | Thirteen native chart kinds |
| [Table](svg/table-library.svg) | `23:355` | Sixteen native table variants |

Drag an SVG onto a Figma canvas or open it in a vector editor. Shapes and paths remain editable. Photos are embedded raster content; the surrounding interface is vector geometry. All eight files are self-contained and have no external image dependencies.

Text was outlined by Figma's export. Auto-layout, semantic bindings, variant relationships, original node IDs and prototype behavior do not survive SVG import. The sets above appear as vector specimens after import, not as native interactive variant sets.

This is a selected export, not an export of all 69 routes, a native `.fig` backup or a new full visual certification. Use the [rebuild plugin](../rebuild-plugin/README.md) for native foundations and starter variants, and the [route map](../maps/routes.md) to navigate the original file.
