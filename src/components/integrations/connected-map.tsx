"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Map as MapInstance,
  Marker,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/components/providers";
import { GoogleMap } from "@/components/blocks/google-map";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { IntegrationMapRendererProps } from "@/lib/integrations/map-renderer";
import { isPresentationUrl } from "@/lib/integrations/validation";
import { cn } from "@/lib/utils";

/** Uses actual returned locations/routes; browser credentials are injected separately. */
export function GoogleIntegrationMap({
  apiKey,
  mapId,
  attribution,
  nonce,
  ...props
}: IntegrationMapRendererProps & {
  apiKey: string;
  mapId: string;
  attribution?: string;
  nonce?: string;
}) {
  const { l, locale } = useLanguage();
  const { theme } = useTheme();
  const locations = useMemo(
    () =>
      props.locations.map((item) => ({
        id: item.id,
        title: item.name,
        position: { lat: item.latitude, lng: item.longitude },
      })),
    [props.locations],
  );
  const routes = useMemo(
    () =>
      props.coordinates && props.coordinates.length > 1
        ? [
            {
              id: "returned-route",
              path: props.coordinates.map(([lng, lat]) => ({ lat, lng })),
            },
          ]
        : [],
    [props.coordinates],
  );
  return (
    <div className="space-y-2">
      <GoogleMap
        label={l("Connected Google map", "Mapa Google conectado")}
        apiKey={apiKey}
        mapId={mapId}
        locations={locations}
        routes={routes}
        selectedLocationId={props.selectedLocationId}
        selectedRouteId={routes.length ? "returned-route" : null}
        onLocationSelect={props.onLocationSelect}
        fallback={props.fallback}
        language={locale}
        theme={theme}
        nonce={nonce}
        className="h-96 min-h-72 overflow-hidden rounded-xl border border-border"
      />
      {attribution && (
        <p className="text-[10px] leading-5 text-muted-foreground">
          {attribution}
        </p>
      )}
    </div>
  );
}

/** Opt-in MapLibre. The consumer resolves an approved style/tiles profile. */
export function MapLibreIntegrationMap({
  style,
  attribution,
  className,
  ...props
}: IntegrationMapRendererProps & {
  style: StyleSpecification | string;
  attribution?: string;
  className?: string;
}) {
  const { l } = useLanguage();
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<MapInstance | null>(null);
  const markers = useRef<
    Map<string, { marker: Marker; element: HTMLButtonElement }>
  >(new Map());
  const onSelect = useRef(props.onLocationSelect);
  const latest = useRef(props);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    onSelect.current = props.onLocationSelect;
    latest.current = props;
  }, [props]);
  useEffect(() => {
    let disposed = false;
    const buttons = markers.current;
    let resize: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setError(false);
    setLoaded(false);
    if (typeof style === "string" && !isPresentationUrl(style)) {
      setError(true);
      return;
    }
    void import("maplibre-gl")
      .then((library) => {
        if (disposed || !container.current || fallback) return;
        try {
          const map = new library.Map({
            container: container.current,
            style,
            center: latest.current.locations[0]
              ? [
                  latest.current.locations[0].longitude,
                  latest.current.locations[0].latitude,
                ]
              : [0, 0],
            zoom: 4,
            renderWorldCopies: false,
            scrollZoom: false,
            attributionControl: { compact: true },
          });
          instance.current = map;
          map.addControl(
            new library.NavigationControl({ showCompass: false }),
            "top-right",
          );
          map
            .getCanvas()
            .setAttribute(
              "aria-label",
              l(
                "Connected map and returned route",
                "Mapa conectado y ruta devuelta",
              ),
            );
          function updateData() {
            if (disposed || !map.isStyleLoaded()) return;
            const data = latest.current;
            for (const { marker, element } of buttons.values()) {
              marker.remove();
              element.remove();
            }
            buttons.clear();
            const bounds = new library.LngLatBounds();
            for (const location of data.locations) {
              bounds.extend([location.longitude, location.latitude]);
              const button = document.createElement("button");
              button.type = "button";
              button.className =
                "grid size-7 place-items-center rounded-full border-2 border-surface bg-primary text-[10px] text-primary-foreground shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";
              button.textContent = String(data.locations.indexOf(location) + 1);
              button.setAttribute("aria-label", location.name);
              button.setAttribute(
                "aria-pressed",
                String(data.selectedLocationId === location.id),
              );
              button.addEventListener("click", () =>
                onSelect.current(location.id),
              );
              const marker = new library.Marker({ element: button })
                .setLngLat([location.longitude, location.latitude])
                .addTo(map);
              buttons.set(location.id, { marker, element: button });
            }
            const coordinates = data.coordinates ?? [];
            for (const coordinate of coordinates) bounds.extend(coordinate);
            const routeData: GeoJSON.FeatureCollection = {
              type: "FeatureCollection",
              features:
                coordinates.length > 1
                  ? [
                      {
                        type: "Feature",
                        properties: {},
                        geometry: { type: "LineString", coordinates },
                      },
                    ]
                  : [],
            };
            const existing = map.getSource("aureform-returned-route") as
              { setData(data: GeoJSON.FeatureCollection): void } | undefined;
            if (existing) existing.setData(routeData);
            else {
              map.addSource("aureform-returned-route", {
                type: "geojson",
                data: routeData,
              });
              map.addLayer({
                id: "aureform-returned-route-line",
                type: "line",
                source: "aureform-returned-route",
                paint: {
                  "line-color":
                    getComputedStyle(document.documentElement)
                      .getPropertyValue("--primary")
                      .trim() || "#3b8b78",
                  "line-width": 4,
                },
              });
            }
            if (!bounds.isEmpty())
              map.fitBounds(bounds, { padding: 55, maxZoom: 13, duration: 0 });
          }
          map.on("load", () => {
            if (disposed) return;
            if (timer) clearTimeout(timer);
            updateData();
            setLoaded(true);
          });
          map.on("error", () => {
            if (!disposed) {
              setError(true);
              if (timer) clearTimeout(timer);
            }
          });
          map.on("aureform-data", updateData);
          timer = setTimeout(() => {
            if (!disposed && !map.loaded()) setError(true);
          }, 15_000);
          resize = new ResizeObserver(() => {
            if (!disposed) map.resize();
          });
          resize.observe(container.current);
        } catch {
          if (!disposed) setError(true);
        }
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      resize?.disconnect();
      if (timer) clearTimeout(timer);
      for (const { marker } of buttons.values()) marker.remove();
      buttons.clear();
      instance.current?.remove();
      instance.current = null;
    };
  }, [style, fallback, attempt, l]);
  useEffect(() => {
    if (loaded) instance.current?.fire("aureform-data");
  }, [loaded, props.locations, props.coordinates]);
  useEffect(() => {
    for (const [id, { element }] of markers.current) {
      element.setAttribute(
        "aria-pressed",
        String(id === props.selectedLocationId),
      );
      element.classList.toggle("ring-4", id === props.selectedLocationId);
      element.classList.toggle(
        "ring-primary/25",
        id === props.selectedLocationId,
      );
    }
  }, [props.selectedLocationId, loaded]);
  if (fallback)
    return (
      <div className="space-y-3">
        {props.fallback}
        <Button
          variant="outline"
          onClick={() => {
            setFallback(false);
            setAttempt((value) => value + 1);
          }}
        >
          {l("Retry connected basemap", "Reintentar mapa base conectado")}
        </Button>
      </div>
    );
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative h-96 min-h-72 overflow-hidden rounded-xl border border-border bg-surface-subtle",
          className,
        )}
      >
        <div ref={container} className="absolute inset-0" />
        {!loaded && !error && (
          <p
            role="status"
            className="absolute bottom-4 left-4 right-4 rounded-lg bg-surface/90 p-3 text-xs"
          >
            {l(
              "Loading your approved map style…",
              "Cargando tu estilo de mapa permitido…",
            )}
          </p>
        )}
      </div>
      {error && (
        <Alert
          variant="warning"
          title={l(
            "The connected map could not load",
            "No se pudo cargar el mapa conectado",
          )}
        >
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {l("Retry", "Reintentar")}
            </Button>
            <Button variant="ghost" onClick={() => setFallback(true)}>
              {l(
                "Use returned-coordinate view",
                "Usar vista de coordenadas devueltas",
              )}
            </Button>
          </div>
        </Alert>
      )}
      {attribution && (
        <p className="text-[10px] leading-5 text-muted-foreground">
          {attribution}
        </p>
      )}
    </div>
  );
}
