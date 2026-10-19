"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LocateFixed, Minus, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GoogleMapsLoadError,
  googleMapsCamera,
  googleMapsError,
  isGoogleMapPosition,
  loadGoogleMaps,
  subscribeGoogleMapsErrors,
  type GoogleAdvancedMarker,
  type GoogleMapInstance,
  type GoogleMapLanguage,
  type GoogleMapLocation,
  type GoogleMapPosition,
  type GoogleMapRoute,
  type GoogleMapsLibraries,
  type GoogleMapType,
} from "@/lib/google-maps";
import { cn } from "@/lib/utils";

export type GoogleMapStatus = "loading" | "ready" | "error";

export interface GoogleMapProps {
  /** Accessible name for the interactive map region. */
  label: string;
  /** Defaults to the build-time public environment variable. */
  apiKey?: string;
  /** Advanced markers require a map ID. DEMO_MAP_ID is only for examples. */
  mapId?: string;
  locations?: readonly GoogleMapLocation[];
  routes?: readonly GoogleMapRoute[];
  selectedLocationId?: string | null;
  selectedRouteId?: string | null;
  onLocationSelect?: (id: string) => void;
  onReady?: (map: GoogleMapInstance) => void;
  onError?: (error: GoogleMapsLoadError) => void;
  onStatusChange?: (status: GoogleMapStatus) => void;
  onFallback?: () => void;
  /** Displayed beneath an error notice if Google cannot be used. */
  fallback?: ReactNode;
  language?: GoogleMapLanguage;
  region?: string;
  theme?: "light" | "dark";
  accentColor?: string;
  mapType?: GoogleMapType;
  showLocations?: boolean;
  showRoutes?: boolean;
  showTraffic?: boolean;
  /** Immediate camera movement is used even when motion is enabled. */
  motion?: boolean;
  fitToData?: boolean;
  center?: GoogleMapPosition;
  zoom?: number;
  /** Change this value to fit the current selection again. */
  viewResetKey?: number | string;
  nonce?: string;
  timeoutMs?: number;
  className?: string;
}

const emptyLocations: readonly GoogleMapLocation[] = [];
const emptyRoutes: readonly GoogleMapRoute[] = [];
const defaultCenter: GoogleMapPosition = { lat: 27, lng: -32 };
interface MarkerEntry {
  marker: GoogleAdvancedMarker;
  glyph: HTMLSpanElement;
  select: () => void;
}

// These objects belong to the imperative SDK, not React's immutable state.
function detachMarker({ marker, select }: MarkerEntry) {
  marker.removeEventListener("gmp-click", select);
  marker.map = null;
  marker.remove();
}

function styleMarker(
  { marker, glyph }: MarkerEntry,
  location: GoogleMapLocation,
  index: number,
  selected: boolean,
  accent: string,
  canAnimate: boolean,
) {
  marker.position = location.position;
  marker.title = location.title;
  marker.zIndex = selected ? 2 : 1;
  glyph.textContent = String(index + 1);
  glyph.style.backgroundColor = selected ? accent : "var(--surface)";
  glyph.style.color = selected
    ? "var(--primary-foreground, #FFFFFF)"
    : "var(--foreground, #111827)";
  glyph.style.boxShadow = selected
    ? `0 0 0 5px color-mix(in srgb, ${accent} 22%, transparent)`
    : "0 5px 18px rgba(0,0,0,.18)";
  glyph.style.transition = canAnimate ? "box-shadow 150ms ease" : "none";
  marker.setAttribute("aria-pressed", String(selected));
}

function errorDescription(
  error: GoogleMapsLoadError,
  l: (en: string, es: string) => string,
) {
  switch (error.code) {
    case "missing-key":
      return l(
        "Add a browser API key to use Google Maps. The free demo is still available.",
        "Agrega una clave de navegador para usar Google Maps. La demo gratuita sigue disponible.",
      );
    case "key-conflict":
      return l(
        "Another key has already been used on this page. Reload before connecting a different project.",
        "Esta página ya utilizó otra clave. Recarga antes de conectar un proyecto diferente.",
      );
    case "existing-sdk":
      return l(
        "The Google Maps SDK is already managed by another loader. Keep one loader per page.",
        "Otro cargador ya administra el SDK de Google Maps. Utiliza un solo cargador por página.",
      );
    case "authentication":
      return l(
        "Check the key's website restrictions, Maps JavaScript API access and billing configuration, then reload.",
        "Revisa las restricciones de sitios de la clave, el acceso a Maps JavaScript API y la facturación; después recarga.",
      );
    case "network":
      return l(
        "The SDK could not be downloaded. Check the connection or browser restrictions, then retry.",
        "No se pudo descargar el SDK. Revisa la conexión o las restricciones del navegador y reintenta.",
      );
    case "timeout":
      return l(
        "Google Maps took too long to load. Reload to start a new SDK session.",
        "Google Maps tardó demasiado en cargar. Recarga para iniciar una nueva sesión del SDK.",
      );
    case "invalid-config":
      return l(
        "Review the browser key, map ID and region configuration.",
        "Revisa la configuración de la clave de navegador, el ID de mapa y la región.",
      );
    case "invalid-data":
      return l(
        "Check location coordinates and unique identifiers, or return to the demo.",
        "Revisa las coordenadas y los identificadores únicos, o vuelve a la demo.",
      );
    default:
      return l(
        "The required map libraries could not be initialized. Retry or use the free demo.",
        "No se pudieron inicializar las bibliotecas del mapa. Reintenta o usa la demo gratuita.",
      );
  }
}

/**
 * Reusable Google map with typed authored data, advanced markers and optional
 * traffic. Mounting a configured instance opts in to Google's SDK/requests.
 * There are no Places, geocoding, directions or backend requests in this block.
 */
export function GoogleMap({
  label,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
  locations = emptyLocations,
  routes = emptyRoutes,
  selectedLocationId,
  selectedRouteId,
  onLocationSelect,
  onReady,
  onError,
  onStatusChange,
  onFallback,
  fallback,
  language = "en",
  region,
  theme = "light",
  accentColor = "#8B5CF6",
  mapType = "roadmap",
  showLocations = true,
  showRoutes = true,
  showTraffic = false,
  motion = true,
  fitToData = true,
  center = defaultCenter,
  zoom = 2,
  viewResetKey = 0,
  nonce,
  timeoutMs,
  className,
}: GoogleMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const markerEntries = useRef(new Map<string, MarkerEntry>());
  const callbacks = useRef({
    onLocationSelect,
    onReady,
    onError,
    onStatusChange,
  });
  const [engine, setEngine] = useState<{
    map: GoogleMapInstance;
    libraries: GoogleMapsLibraries;
  } | null>(null);
  const [status, setStatus] = useState<GoogleMapStatus>("loading");
  const [failure, setFailure] = useState<GoogleMapsLoadError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const l = (en: string, es: string) => (language === "es" ? es : en);
  const accent = /^#[\da-f]{6}$/i.test(accentColor) ? accentColor : "#8B5CF6";
  const canAnimate = motion && !systemReducedMotion;
  const validData = useMemo(
    () =>
      locations.every(
        (location) =>
          !!location.id.trim() && isGoogleMapPosition(location.position),
      ) &&
      routes.every(
        (route) => !!route.id.trim() && route.path.every(isGoogleMapPosition),
      ) &&
      new Set(locations.map((location) => location.id)).size ===
        locations.length &&
      new Set(routes.map((route) => route.id)).size === routes.length &&
      isGoogleMapPosition(center) &&
      Number.isFinite(zoom),
    [locations, routes, center, zoom],
  );

  useEffect(() => {
    callbacks.current = { onLocationSelect, onReady, onError, onStatusChange };
  }, [onLocationSelect, onReady, onError, onStatusChange]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let disposed = false;
    let instance: GoogleMapInstance | undefined;
    let libraries: GoogleMapsLibraries | undefined;
    setEngine(null);
    setFailure(null);
    setStatus("loading");
    callbacks.current.onStatusChange?.("loading");
    const reportError = (error: unknown) => {
      if (disposed) return;
      const safe = googleMapsError(error);
      setEngine(null);
      setFailure(safe);
      setStatus("error");
      callbacks.current.onStatusChange?.("error");
      callbacks.current.onError?.(safe);
    };
    const unsubscribe = subscribeGoogleMapsErrors(reportError);
    void loadGoogleMaps({ apiKey, language, region, nonce, timeoutMs })
      .then((loaded) => {
        if (disposed || !container.current) return;
        const resolvedMapId = mapId.trim();
        if (!resolvedMapId || !/^[a-zA-Z0-9_-]{1,256}$/.test(resolvedMapId)) {
          throw new GoogleMapsLoadError("invalid-config");
        }
        libraries = loaded;
        // colorScheme and mapId are initialization-only SDK options.
        // Theme changes recreate this view while reusing the shared SDK.
        instance = new loaded.maps.Map(container.current, {
          center: { lat: 27, lng: -32 },
          zoom: 2,
          mapId: resolvedMapId,
          colorScheme: theme === "dark" ? "DARK" : "LIGHT",
          mapTypeId: "roadmap",
          backgroundColor: theme === "dark" ? "#111817" : "#F3F6F4",
          disableDefaultUI: true,
          keyboardShortcuts: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
          minZoom: 0,
          maxZoom: 20,
        });
        setEngine({ map: instance, libraries: loaded });
        setStatus("ready");
        callbacks.current.onStatusChange?.("ready");
        callbacks.current.onReady?.(instance);
      })
      .catch(reportError);
    const element = container.current;
    return () => {
      disposed = true;
      unsubscribe();
      if (instance) {
        libraries?.core.event.clearInstanceListeners(instance);
        instance.unbindAll();
      }
      element?.replaceChildren();
    };
  }, [apiKey, mapId, language, region, theme, nonce, timeoutMs, attempt]);

  useEffect(() => {
    if (!engine) return;
    engine.map.setOptions({ mapTypeId: mapType });
  }, [engine, mapType]);

  useEffect(() => {
    if (!engine) return;
    const entries = new Map<string, MarkerEntry>();
    markerEntries.current = entries;
    return () => {
      for (const entry of entries.values()) detachMarker(entry);
      entries.clear();
    };
  }, [engine]);

  useEffect(() => {
    if (!engine) return;
    if (!validData) {
      const error = new GoogleMapsLoadError("invalid-data");
      setFailure(error);
      setStatus("error");
      callbacks.current.onStatusChange?.("error");
      callbacks.current.onError?.(error);
      return;
    }
    setFailure(null);
    setStatus("ready");
    callbacks.current.onStatusChange?.("ready");
  }, [engine, validData]);

  useEffect(() => {
    if (!engine) return;
    const entries = markerEntries.current;
    const visibleIds = new Set(
      showLocations && validData
        ? locations.map((location) => location.id)
        : [],
    );
    for (const [id, entry] of entries) {
      if (!visibleIds.has(id)) {
        detachMarker(entry);
        entries.delete(id);
      }
    }
    if (!validData) return;
    if (showLocations) {
      for (const [index, location] of locations.entries()) {
        const selected = selectedLocationId === location.id;
        let entry = entries.get(location.id);
        if (!entry) {
          const marker = new engine.libraries.marker.AdvancedMarkerElement({
            map: engine.map,
            position: location.position,
            title: location.title,
            gmpClickable: true,
            zIndex: 1,
          });
          const glyph = document.createElement("span");
          glyph.setAttribute("aria-hidden", "true");
          glyph.className =
            "flex size-8 items-center justify-center rounded-full border-[3px] border-surface text-[11px] font-bold shadow-lg";
          // AdvancedMarkerElement is an HTMLElement. Deprecated content,
          // element and addListener APIs are intentionally not used.
          marker.appendChild(glyph);
          const select = () =>
            callbacks.current.onLocationSelect?.(location.id);
          marker.addEventListener("gmp-click", select);
          entry = { marker, glyph, select };
          entries.set(location.id, entry);
        }
        styleMarker(entry, location, index, selected, accent, canAnimate);
      }
    }
    // Selection/color changes update the same DOM marker, preserving focus.
  }, [
    engine,
    locations,
    selectedLocationId,
    showLocations,
    accent,
    canAnimate,
    validData,
  ]);

  useEffect(() => {
    if (!engine || !validData) return;
    const cleanup: Array<() => void> = [];
    if (showRoutes) {
      for (const route of routes) {
        const selected = selectedRouteId === route.id;
        const line = new engine.libraries.maps.Polyline({
          map: engine.map,
          path: [...route.path],
          geodesic: true,
          clickable: false,
          strokeColor:
            route.color && /^#[\da-f]{6}$/i.test(route.color)
              ? route.color
              : accent,
          strokeOpacity: !selectedRouteId || selected ? 0.85 : 0.3,
          strokeWeight: selected ? 4 : 2.5,
          zIndex: selected ? 2 : 1,
        });
        cleanup.push(() => line.setMap(null));
      }
    }
    return () => cleanup.forEach((remove) => remove());
  }, [engine, routes, selectedRouteId, showRoutes, accent, validData]);

  useEffect(() => {
    if (!engine || !showTraffic) return;
    const layer = new engine.libraries.maps.TrafficLayer();
    layer.setMap(engine.map);
    return () => layer.setMap(null);
  }, [engine, showTraffic]);

  useEffect(() => {
    if (!engine || !container.current) return;
    const element = container.current;
    const moveCamera = () => {
      const selectedLocation = locations.find(
        (item) => item.id === selectedLocationId,
      );
      const selectedRoute = routes.find((item) => item.id === selectedRouteId);
      const positions = selectedLocation
        ? [selectedLocation.position]
        : selectedRoute
          ? selectedRoute.path
          : [
              ...locations.map((item) => item.position),
              ...routes.flatMap((item) => [...item.path]),
            ];
      if (
        !isGoogleMapPosition(center) ||
        !Number.isFinite(zoom) ||
        positions.some((position) => !isGoogleMapPosition(position))
      ) {
        return;
      }
      engine.map.moveCamera(
        fitToData
          ? googleMapsCamera(positions, {
              width: element.clientWidth || 720,
              height: element.clientHeight || 460,
            })
          : { center, zoom: Math.max(0, Math.min(20, zoom)) },
      );
    };
    moveCamera();
    const observer = new ResizeObserver(moveCamera);
    observer.observe(element);
    return () => observer.disconnect();
  }, [
    engine,
    locations,
    routes,
    selectedLocationId,
    selectedRouteId,
    fitToData,
    center,
    zoom,
    viewResetKey,
  ]);

  function fitAll() {
    if (!engine || !container.current) return;
    const positions = [
      ...locations.map((item) => item.position),
      ...routes.flatMap((item) => [...item.path]),
    ];
    if (positions.some((position) => !isGoogleMapPosition(position))) return;
    engine.map.moveCamera(
      googleMapsCamera(positions, {
        width: container.current.clientWidth,
        height: container.current.clientHeight,
      }),
    );
  }

  return (
    <div
      className={cn(
        "relative h-[460px] min-w-0 overflow-hidden rounded-xl border border-border bg-surface-subtle",
        className,
      )}
      data-google-map-status={status}
    >
      <div
        ref={container}
        role="region"
        aria-label={label}
        className={cn("h-full w-full", status === "error" && "hidden")}
      />
      {status === "loading" && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-subtle"
        >
          <span
            aria-hidden="true"
            className="size-10 rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin motion-reduce:animate-none [[data-motion-level=off]_&]:animate-none"
          />
          <p className="text-xs text-muted-foreground">
            {l("Connecting to Google Maps…", "Conectando con Google Maps…")}
          </p>
        </div>
      )}
      {status === "ready" && (
        <div
          className="absolute right-3 top-3 flex flex-col gap-1 rounded-xl border border-border bg-surface/95 p-1 shadow-lg"
          role="group"
          aria-label={l("Map controls", "Controles del mapa")}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={l("Zoom in", "Acercar")}
            onClick={() =>
              engine?.map.moveCamera({
                zoom: Math.min(20, (engine.map.getZoom() ?? 2) + 1),
              })
            }
          >
            <Plus aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={l("Zoom out", "Alejar")}
            onClick={() =>
              engine?.map.moveCamera({
                zoom: Math.max(0, (engine.map.getZoom() ?? 2) - 1),
              })
            }
          >
            <Minus aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={l(
              "Fit all locations",
              "Encuadrar todas las ubicaciones",
            )}
            onClick={fitAll}
          >
            <LocateFixed aria-hidden="true" />
          </Button>
        </div>
      )}
      {status === "error" && failure && (
        <div className="absolute inset-0 overflow-auto">
          {fallback && <div className="h-full">{fallback}</div>}
          <div
            role="alert"
            className={cn(
              "flex flex-col gap-3 border border-border bg-surface/95 p-4 shadow-lg",
              fallback
                ? "absolute inset-x-3 top-3 rounded-xl"
                : "mx-auto mt-16 max-w-md rounded-xl",
            )}
          >
            <div className="flex items-start gap-3">
              <ShieldAlert
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold">
                  {l(
                    "Google Maps is unavailable",
                    "Google Maps no está disponible",
                  )}
                </p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  {errorDescription(failure, l)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {failure.retryable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  <RefreshCw aria-hidden="true" />
                  {l("Retry connection", "Reintentar conexión")}
                </Button>
              )}
              {["timeout", "authentication", "key-conflict"].includes(
                failure.code,
              ) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw aria-hidden="true" />
                  {l("Reload page", "Recargar página")}
                </Button>
              )}
              {onFallback && (
                <Button size="sm" onClick={onFallback}>
                  {l("Use free demo", "Usar demo gratuita")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
