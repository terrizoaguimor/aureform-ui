# Maps

`MapsWorkspace` is an application block with local schematic routes and locations. The default mode needs no key, remote tiles, tracking service or Google request. Shipment geometry, dates and progress are illustrative demonstration data.

## Mount the local workspace

Install `maps-workspace` and its reached dependencies through the CLI or registry. Include the global styles and supply the existing providers:

```tsx
"use client";

import { Providers } from "@/components/providers";
import { MapsWorkspace } from "@/components/blocks/maps-workspace";

export default function MapsPage() {
  return (
    <Providers locale="en">
      <MapsWorkspace />
    </Providers>
  );
}
```

`MapsWorkspace` takes no props. It reads language, theme and appearance context. The full provider wrapper is a convenient demo composition; the block's dataset comes from the supplied fixtures.

1. Search cities, route IDs or drivers and filter shipment status.
2. Select a route or location from the directory to inspect its details.
3. Switch map/list views, adjust layers and export filtered routes as GeoJSON.
4. Use the schematic's arrow keys to pan, `+`/`-` to zoom and Home to reset; visible markers accept Enter/Space.

The overview uses local MapLibre geometry with a fallback; the SVG schematic and directory preserve access without remote mapping services.

## Opt into Google Maps

The workspace remains local even when a browser key is configured. Select Google Maps explicitly, using Map settings to enter a restricted browser key and map ID for the mounted view.

The [environment example](../../../.env.example) also provides optional build settings:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=
```

Leave them blank for local mode. For your own Google connection, configure Maps JavaScript API, your project's billing and quotas, website referrer restrictions and API restrictions. Use your own production map ID. `NEXT_PUBLIC_*` values are public build-time configuration; rebuild after changing them.

## Handle configuration and fallback correctly

Entered keys stay in React memory. They are never persisted to localStorage, sessionStorage, cookies, logs or exports; the entry field clears on close. Disconnect returns to the demo, but an already loaded SDK keeps its document-wide key until a full reload.

Network failures can retry with the same key. Authentication, timeout and key replacement require reload. Keep the local fallback available and Google's attribution intact.

## Supply real data deliberately

For reusable consumer maps, [`GoogleMap`](../../../src/components/blocks/google-map.tsx) accepts typed locations and authored route polylines from [`src/lib/google-maps.ts`](../../../src/lib/google-maps.ts). It does not call geocoding, Places or Directions. Your application supplies licensed operational data and any routing backend. The [full Maps guide](../../../docs/google-maps.md) documents SDK lifecycle, selection, camera controls and errors.
