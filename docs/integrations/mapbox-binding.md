# Optional native Mapbox renderer

Install `mapbox-gl` in the adopting application after accepting its current SDK
and service terms. It is optional and is not included in Aureform's mandatory
dependencies. The binding below uses actual returned locations/geometry,
retains Mapbox attribution, receives an approved style and restricted public
browser token, and removes the native map on scope change. Geocoding/directions
remain separate integration actions.

See [Mapbox's installation guide](https://docs.mapbox.com/mapbox-gl-js/guides/get-started/)
and [GeoJSON sources](https://docs.mapbox.com/mapbox-gl-js/example/geojson-line/).
The application resolves `styleUrl` from its allowed map profile; it does not
accept arbitrary style or tile URLs from a text input.

Copy this Client Component into your application:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as NativeMap, Marker, GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/use-language";
import type { IntegrationMapRendererProps } from "@/lib/integrations/map-renderer";

export function NativeMapboxRenderer({
  publicAccessToken, styleUrl, attribution, ...input
}: IntegrationMapRendererProps & {
  publicAccessToken: string;
  styleUrl: string;
  attribution: string;
}) {
  const { l } = useLanguage();
  const container = useRef<HTMLDivElement>(null);
  const native = useRef<NativeMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const select = useRef(input.onLocationSelect);
  useEffect(() => { select.current = input.onLocationSelect; }, [input.onLocationSelect]);
  useEffect(() => {
    let disposed = false;
    let map: NativeMap | undefined;
    let resize: ResizeObserver | undefined;
    const markers: Marker[] = [];
    setFailed(false);
    if (useFallback || input.scope.signal?.aborted) return;
    const timer = setTimeout(() => {
      if (!disposed && !map?.loaded()) setFailed(true);
    }, 15_000);
    const abort = () => {
      disposed = true;
      clearTimeout(timer);
      resize?.disconnect();
      for (const marker of markers) marker.remove();
      map?.remove();
      native.current = null;
    };
    input.scope.signal?.addEventListener("abort", abort, { once: true });
    void import("mapbox-gl").then(({ default: library }) => {
      if (disposed || !container.current) return;
      try {
        map = new library.Map({
          container: container.current,
          accessToken: publicAccessToken,
          style: styleUrl,
          center: input.locations[0]
            ? [input.locations[0].longitude, input.locations[0].latitude]
            : [0, 0],
          zoom: 4,
          scrollZoom: false,
          attributionControl: true,
        });
        native.current = map;
        map.addControl(new library.NavigationControl({ showCompass: false }), "top-right");
        map.getCanvas().setAttribute("aria-label", l("Connected Mapbox map", "Mapa Mapbox conectado"));
        map.on("error", () => { if (!disposed) setFailed(true); });
        map.on("load", () => {
          if (disposed || !map) return;
          clearTimeout(timer);
          const bounds = new library.LngLatBounds();
          for (const location of input.locations) {
            bounds.extend([location.longitude, location.latitude]);
            const element = document.createElement("button");
            element.type = "button";
            element.className = "size-7 rounded-full border-2 border-surface bg-primary shadow-md";
            element.setAttribute("aria-label", location.name);
            element.setAttribute("aria-pressed", String(location.id === input.selectedLocationId));
            element.addEventListener("click", () => select.current(location.id));
            markers.push(new library.Marker({ element })
              .setLngLat([location.longitude, location.latitude]).addTo(map));
          }
          const coordinates = input.coordinates ?? [];
          for (const coordinate of coordinates) bounds.extend(coordinate);
          const data: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: coordinates.length > 1 ? [{
              type: "Feature", properties: {},
              geometry: { type: "LineString", coordinates },
            }] : [],
          };
          if (map.getSource("returned-route")) {
            (map.getSource("returned-route") as GeoJSONSource).setData(data);
          } else {
            map.addSource("returned-route", { type: "geojson", data });
            map.addLayer({
              id: "returned-route-line", type: "line", source: "returned-route",
              paint: { "line-color": "#408e7b", "line-width": 4 },
            });
          }
          if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 55, maxZoom: 13, duration: 0 });
        });
        resize = new ResizeObserver(() => { if (!disposed) map?.resize(); });
        resize.observe(container.current);
      } catch { if (!disposed) setFailed(true); }
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => {
      input.scope.signal?.removeEventListener("abort", abort);
      if (!disposed) abort();
    };
  }, [publicAccessToken, styleUrl, input.scope.workspaceId, input.scope.signal,
    input.connection.id, input.locations, input.coordinates, input.selectedLocationId,
    useFallback, attempt, l]);
  return <div className="space-y-3">
    {useFallback ? input.fallback : <div ref={container} className="h-96 overflow-hidden rounded-xl border border-border" />}
    {(failed || useFallback) && <Alert variant="warning" title={l("Map connection needs attention", "La conexión del mapa requiere atención")}>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => { setUseFallback(false); setAttempt((value) => value + 1); }}>{l("Retry map", "Reintentar mapa")}</Button>
        {!useFallback && <Button variant="ghost" onClick={() => setUseFallback(true)}>{l("Use coordinate view", "Usar vista de coordenadas")}</Button>}
      </div>
    </Alert>}
    <p className="text-[10px] leading-5 text-muted-foreground">{attribution}</p>
  </div>;
}
```

Inject it as `suite.ui.renderMap` (or the Hub's `renderMap` prop) for the
`mapbox` provider option. Other options can use Aureform's Google/MapLibre
components or the shared schematic fallback. Keep the native browser token in
application configuration; do not place server tokens in the Hub's form,
resource metadata, logs or persisted drafts.

The source example is checked against an installed native SDK by the optional
binding verifier. Compilation is frontend evidence; actual token, style,
licensing, tile delivery and provider account acceptance belong to the consumer.
