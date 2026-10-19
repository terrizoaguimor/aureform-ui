"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MapInstance } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  land,
  routeGeometry,
  gridGeometry,
  shipmentRoutes,
} from "@/demo/map-data";
import { useTheme } from "@/components/providers";
import { useAppearance } from "@/components/appearance-provider";
import { useLanguage } from "@/hooks/use-language";
export function RouteMap({
  selected = "all",
  label,
}: {
  selected?: string;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<MapInstance | null>(null),
    [fallback, setFallback] = useState(false),
    { theme } = useTheme(),
    { appearance } = useAppearance(),
    { locale, l } = useLanguage();
  useEffect(() => {
    let disposed = false;
    void import("maplibre-gl")
      .then((lib) => {
        if (disposed || !container.current) return;
        try {
          const styles = getComputedStyle(document.documentElement),
            color = (name: string) => styles.getPropertyValue(name).trim();
          const instance = new lib.Map({
            container: container.current,
            center: [-32, 27],
            zoom: 1.4,
            minZoom: 0.4,
            maxZoom: 9,
            renderWorldCopies: false,
            attributionControl: false,
            scrollZoom: false,
            locale: {
              "NavigationControl.ZoomIn": l("Zoom in", "Acercar"),
              "NavigationControl.ZoomOut": l("Zoom out", "Alejar"),
              "NavigationControl.ResetBearing": l(
                "Reset bearing",
                "Restablecer orientación",
              ),
            },
            style: {
              version: 8,
              sources: {
                land: { type: "geojson", data: land },
                grid: { type: "geojson", data: gridGeometry },
                routes: { type: "geojson", data: routeGeometry },
              },
              layers: [
                {
                  id: "water",
                  type: "background",
                  paint: { "background-color": color("--surface-subtle") },
                },
                {
                  id: "grid",
                  type: "line",
                  source: "grid",
                  paint: { "line-color": color("--border"), "line-width": 0.5 },
                },
                {
                  id: "land",
                  type: "fill",
                  source: "land",
                  paint: {
                    "fill-color": color("--accent"),
                    "fill-outline-color": color("--border"),
                  },
                },
                {
                  id: "routes",
                  type: "line",
                  source: "routes",
                  paint: {
                    "line-color": color("--primary"),
                    "line-width": 2,
                    "line-dasharray": [2, 2],
                  },
                },
              ],
            },
          });
          map.current = instance;
          instance.addControl(
            new lib.NavigationControl({ showCompass: false }),
            "top-right",
          );
          instance.getCanvas().setAttribute("aria-label", label);
          instance.on("load", () => {
            if (disposed) return;
            for (const route of shipmentRoutes) {
              for (const [name, position] of [
                [route.from, route.start],
                [route.to, route.end],
              ] as const) {
                const button = document.createElement("button");
                button.type = "button";
                button.setAttribute("aria-label", `${route.id}: ${name}`);
                button.className =
                  "flex size-4 items-center justify-center rounded-full border-[3px] border-surface bg-primary shadow-sm";
                const text = document.createElement("p");
                text.textContent = `${route.id} · ${name}`;
                text.style.cssText =
                  "color:#222c26;font-size:11px;padding:4px;font-family:Manrope,sans-serif";
                new lib.Marker({ element: button })
                  .setLngLat(position)
                  .setPopup(new lib.Popup({ offset: 10 }).setDOMContent(text))
                  .addTo(instance);
              }
            }
          });
          instance.on("error", () => {
            if (!disposed && !instance.loaded()) setFallback(true);
          });
        } catch {
          if (!disposed) setFallback(true);
        }
      })
      .catch(() => {
        if (!disposed) setFallback(true);
      });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, [label, l, locale]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const update = () => {
      const styles = getComputedStyle(document.documentElement);
      for (const [id, property, token] of [
        ["water", "background-color", "--surface-subtle"],
        ["grid", "line-color", "--border"],
        ["land", "fill-color", "--accent"],
        ["routes", "line-color", "--primary"],
      ])
        instance.setPaintProperty(
          id,
          property,
          styles.getPropertyValue(token).trim(),
        );
    };
    if (instance.isStyleLoaded()) update();
    else instance.once("load", update);
  }, [theme, appearance.colors, appearance.palette]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const route = shipmentRoutes.find((item) => item.id === selected);
    if (route)
      instance.fitBounds([route.start, route.end], {
        padding: 65,
        maxZoom: 6,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 500,
      });
    else instance.flyTo({ center: [-32, 27], zoom: 1.4, duration: 0 });
  }, [selected]);
  return (
    <div className="relative h-[460px] overflow-hidden rounded-xl border border-border">
      <div
        ref={container}
        className="h-full w-full"
        role="region"
        aria-label={label}
      />
      {fallback && (
        <div className="absolute inset-0 bg-surface-subtle">
          <SchematicMap selected={selected} label={label} />
          <span className="absolute bottom-3 left-3 rounded bg-surface/90 px-3 py-1.5 text-[9px]">
            {l(
              "Schematic view · WebGL unavailable",
              "Vista esquemática · WebGL no disponible",
            )}
          </span>
        </div>
      )}
      <span className="pointer-events-none absolute bottom-3 right-3 rounded bg-surface/90 px-3 py-1.5 text-[9px] text-muted-foreground">
        {l(
          "Original schematic geometry · Demo",
          "Geometría esquemática original · Demo",
        )}
      </span>
    </div>
  );
}
function SchematicMap({
  selected,
  label,
}: {
  selected: string;
  label: string;
}) {
  const x = (longitude: number) => (longitude + 180) * 2,
    y = (latitude: number) => (90 - latitude) * 2;
  return (
    <svg
      viewBox="0 0 720 360"
      role="img"
      aria-label={label}
      className="h-full w-full"
    >
      {land.features.map((feature, i) => (
        <path
          key={i}
          d={feature.geometry.coordinates
            .map(
              (ring) =>
                ring
                  .map(
                    (point, j) =>
                      `${j ? "L" : "M"}${x(point[0])},${y(point[1])}`,
                  )
                  .join(" ") + "Z",
            )
            .join(" ")}
          fill="var(--accent)"
          stroke="var(--border)"
        />
      ))}
      {shipmentRoutes
        .filter((route) => selected === "all" || route.id === selected)
        .map((route) => (
          <g key={route.id}>
            <line
              x1={x(route.start[0])}
              y1={y(route.start[1])}
              x2={x(route.end[0])}
              y2={y(route.end[1])}
              stroke="var(--primary)"
              strokeWidth={2}
            />
            <circle
              cx={x(route.start[0])}
              cy={y(route.start[1])}
              r={4}
              fill="var(--primary)"
            />
            <text
              x={x(route.start[0]) + 8}
              y={y(route.start[1]) - 8}
              fontSize={10}
              fill="var(--foreground)"
            >
              {route.id}
            </text>
          </g>
        ))}
    </svg>
  );
}
