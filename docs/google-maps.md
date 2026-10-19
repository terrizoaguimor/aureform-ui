# Maps workspace / Espacio de mapas

`MapsWorkspace` is a frontend application block. It starts with free, local
demo geometry and the existing shipment fixtures. There is no API key,
Google request, tracking service or navigation calculation in the default mode.
Filters, selection, route details, map/list views, GeoJSON export and layer
controls work with the same illustrative records.

```tsx
import { MapsWorkspace } from "@/components/blocks/maps-workspace";

// Render inside Aureform's existing language and appearance providers.
export default function MapsPage() {
  return <MapsWorkspace />;
}
```

The block is available on the application's Maps route and as an installable
registry item. It uses the existing providers and adds no package dependency.
Historic native Figma evidence retains its original scope.

## Optional Google Maps

Use **Map settings → Connect Google Maps** to enter a browser key and map ID for
the mounted view. The password field clears on close. Its configuration stays in
React memory; the components never write keys to `localStorage`, `sessionStorage`,
cookies, exports or logs. Disconnecting returns to the demo. An SDK already
loaded into the document cannot be unloaded; its page-wide key remains in memory
and in Google's script request until a full reload.

Consumers can also set build configuration in their own untracked `.env.local`:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_RESTRICTED_BROWSER_KEY
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=YOUR_MAP_ID
```

The workspace remains in demo mode even when those variables are configured.
Clicking **Google Maps** opts in. Mounting a configured standalone `GoogleMap`
also opts in. Loading a real map uses the consumer's Maps Platform project,
quotas and billing; it is not a mocked Google response.

`NEXT_PUBLIC_*` values are embedded in the browser bundle **at build time**,
including static exports. They are public browser configuration, not a place for
server secrets. Rebuild after changing them. A session configuration allows
trying a restricted browser key without rebuilding the static demo.

Enable Maps JavaScript API in the consuming project, configure billing as
required by Google, restrict the key to the consuming website's HTTP referrers
and restrict its API access. Keep server-side credentials out of this UI.
Use the consumer's own production map ID for advanced markers;
`DEMO_MAP_ID` is for examples. These requirements follow Google's
[loading guide](https://developers.google.com/maps/documentation/javascript/load-maps-js-api),
[advanced markers guide](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)
and [API security guidance](https://developers.google.com/maps/api-security-best-practices).

## Reusable component

```tsx
"use client";

import { useState } from "react";
import { GoogleMap } from "@/components/blocks/google-map";
import type { GoogleMapLocation, GoogleMapRoute } from "@/lib/google-maps";

const locations: GoogleMapLocation[] = [
  { id: "bogota", title: "Bogotá", position: { lat: 4.711, lng: -74.0721 } },
  {
    id: "medellin",
    title: "Medellín",
    position: { lat: 6.2442, lng: -75.5812 },
  },
];
const routes: GoogleMapRoute[] = [
  {
    id: "sample-route",
    path: locations.map((location) => location.position),
  },
];

export function ConsumerMap() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <GoogleMap
      label="Sample delivery locations"
      locations={locations}
      routes={routes}
      selectedLocationId={selected}
      onLocationSelect={setSelected}
      language="en"
      theme="dark"
      onFallback={() => {
        /* Show the consuming application's offline view. */
      }}
    />
  );
}
```

`GoogleMapProps` is exported from the component module. Data, SDK types,
`GoogleMapsLoaderOptions`, `GoogleMapsLoadError`, `loadGoogleMaps`,
`subscribeGoogleMapsErrors`, `googleMapsCamera`, `googleMapsError` and
`isGoogleMapPosition` are exported from `src/lib/google-maps.ts`.

| Props                                                       | Behavior                                                                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`                                                     | Required accessible region name.                                                                                                                                                |
| `apiKey`, `mapId`                                           | Explicit configuration overrides public environment defaults.                                                                                                                   |
| `locations`, `routes`                                       | Typed coordinates and authored polylines; no geocoding or directions calls.                                                                                                     |
| `selectedLocationId`, `selectedRouteId`, `onLocationSelect` | Controlled selection and camera focus.                                                                                                                                          |
| `showLocations`, `showRoutes`, `showTraffic`, `mapType`     | Actual marker, route and traffic layers; road, satellite, hybrid or terrain maps. Traffic defaults off.                                                                         |
| `language`, `region`                                        | First SDK call initializes page-wide language/region; subsequent map labels and custom controls follow the current language. Reload to change Google's own SDK language.        |
| `theme`, `accentColor`, `motion`                            | Light/dark map, custom marker/route color and optional marker transitions. Theme changes recreate the map view because Google's `colorScheme` is an initialization-only option. |
| `fitToData`, `center`, `zoom`, `viewResetKey`               | Fit data by default; opt out for a controlled starting camera; increment the reset key to refit.                                                                                |
| `onReady`, `onStatusChange`, `onError`                      | SDK-view lifecycle and sanitized error codes. Ready means the map was constructed; it does not certify that every tile loaded.                                                  |
| `fallback`, `onFallback`                                    | Offline content and a “Use free demo” action when initialization fails.                                                                                                         |
| `nonce`, `timeoutMs`, `className`                           | Host CSP nonce, finite loading timeout (default 20 seconds per stage) and container styling.                                                                                    |

The adapter intentionally types only the SDK surface used here, without a new
dependency. It loads the script lazily with `loading=async`, then imports
`maps`, `marker` and `core` concurrently through `importLibrary`. It uses
`AdvancedMarkerElement`, its DOM children and the accessible `gmp-click` event;
no legacy `Marker`, legacy `Loader` or deprecated marker content API is used.
The DOM API follows Google's
[current marker reference](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers).

One shared promise prevents repeated SDK loads across concurrent maps,
React Strict Mode and theme changes. Different API keys in a single document
are rejected with `key-conflict`. A foreign Google loader is rejected with
`existing-sdk`; remove the competing loader rather than adding a second script.
Network failures can retry with the same key. Library failures retry imports
without another SDK script. Timeout, authentication and key replacement require
a reload to avoid partially initialized or duplicate SDKs.
Late `gm_authFailure` notifications also reach mounted maps; an existing host
authentication-failure hook is preserved.

## Demo, accessibility and deployment

The default overview reuses `RouteMap` and its WebGL/schematic fallback.
Its composition gives the canvas a distinct accessible name and connects
overview marker clicks to the directory's selection without changing `RouteMap`.
Focused or filtered views and editable demo layers use the same original land,
grid and shipment data in an accessible SVG. This path does not require WebGL or
remote map tiles. Use the directory to select a route or location, or focus the
schematic and use arrow keys to pan, `+`/`-` to zoom and `Home` to reset.
Visible SVG markers work with Enter/Space. The directory remains usable when map
layers are hidden. Search ignores accents and matches authored cities, IDs and
drivers. Map/list views adapt to narrow screens.

The block follows EN/ES, the existing appearance palette and light/dark theme.
Google marker updates preserve their DOM identity and keyboard focus.
Camera fitting and zoom controls use `moveCamera`, which is immediate; they do
not use animated `fitBounds`. Marker transitions respect both motion-off appearance and
`prefers-reduced-motion`. Polylines, DOM listeners and traffic layers are detached
on cleanup. Google's map attribution stays in the SDK view.

No server routes, server actions or runtime environment endpoint are needed.
The demo works with `output: "export"` and a Next.js `basePath`. Existing avatars
use Aureform's `Avatar` public-path handling; Google SDK URLs are absolute
external URLs. Consumers decide whether and how to supply real operational
locations, delivery tracking or a Routes API backend.

## Validation without credentials

```bash
node --experimental-strip-types --test tests/google-maps.test.mjs
pnpm exec eslint src/lib/google-maps.ts src/components/blocks/google-map.tsx \
  src/components/blocks/maps-workspace.tsx tests/google-maps.test.mjs
```

The loader tests use an inert browser/SDK double. They check concurrency, foreign
loaders, key conflicts, retry paths, timeouts, late authentication errors,
sanitization, CSP nonce and camera fitting without contacting Google or reading
credentials. Real restricted-key/billing checks belong to the consuming project.

## Guía rápida en español

`MapsWorkspace()` no necesita props. Usa los proveedores existentes de idioma,
tema y apariencia. La demo es local y gratuita por defecto, incluso si hay una
clave configurada en el build. Ofrece búsqueda, filtros por estado, selección,
detalles, capas, vistas de mapa/lista y exportación de las rutas filtradas.

Para Google, abre **Configurar mapa → Conectar Google Maps**, o define las dos
variables públicas del ejemplo en tu propio `.env.local`. Una clave de navegador
es visible para quien usa el sitio: restringe sitios y APIs en Google Cloud.
El formulario conserva su configuración solo en memoria, limpia el campo al
cerrar y nunca la exporta ni la guarda en almacenamiento del navegador.
Al recargar o desmontar el espacio se pierde la configuración del formulario;
un SDK ya cargado conserva su clave en el documento hasta recargar.

Los errores de red permiten reintentar. Un error de autenticación, timeout o
cambio de clave pide recargar; siempre se puede volver a la demo. El consumidor
conecta sus datos y resuelve cuotas, facturación, navegación y cualquier backend.
Los envíos de Aureform, fechas, progreso y líneas de rutas son ilustrativos.
La interfaz Google utiliza el SDK real únicamente al conectarlo; no simula una
respuesta de Google ni contacta las APIs de Directions, Places o geocodificación.
