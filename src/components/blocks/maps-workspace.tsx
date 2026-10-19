"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowRight,
  CheckCheck,
  CircleHelp,
  Compass,
  Download,
  Globe2,
  Layers3,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Minus,
  Plus,
  Route,
  Search,
  Settings2,
  Truck,
  X,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/components/providers";
import { useAppearance } from "@/components/appearance-provider";
import { PageHeading } from "@/components/blocks/page-heading";
import { RouteMap } from "@/components/blocks/route-map";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDemoRouteDriverAvatarSrc } from "@/demo/avatar-assets";
import {
  gridGeometry,
  land,
  routeGeometry,
  shipmentRoutes,
} from "@/demo/map-data";
import {
  type GoogleMapLocation,
  type GoogleMapPosition,
  type GoogleMapRoute,
  type GoogleMapType,
} from "@/lib/google-maps";
import { cn, downloadText } from "@/lib/utils";

const ConnectedGoogleMap = dynamic(
  () =>
    import("@/components/blocks/google-map").then((module) => module.GoogleMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[460px] rounded-xl border border-border bg-surface-subtle"
        aria-busy="true"
      />
    ),
  },
);

type Shipment = (typeof shipmentRoutes)[number];
type WorkspaceLocation = GoogleMapLocation & {
  routeId: string;
  kind: "origin" | "destination";
};
type SessionConfiguration = { apiKey: string; mapId: string };
type Localize = (en: string, es: string) => string;

const workspaceLocations: WorkspaceLocation[] = shipmentRoutes.flatMap(
  (route) => [
    {
      id: `${route.id}:origin`,
      routeId: route.id,
      kind: "origin" as const,
      title: route.from,
      position: { lat: route.start[1], lng: route.start[0] },
    },
    {
      id: `${route.id}:destination`,
      routeId: route.id,
      kind: "destination" as const,
      title: route.to,
      position: { lat: route.end[1], lng: route.end[0] },
    },
  ],
);

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function statusLabel(status: string, l: Localize) {
  return status === "delivered"
    ? l("Delivered", "Entregado")
    : status === "scheduled"
      ? l("Scheduled", "Programado")
      : l("In transit", "En tránsito");
}

function straightLineKilometers(route: Shipment) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitude = radians(route.end[1] - route.start[1]);
  const longitude = radians(route.end[0] - route.start[0]);
  const a =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(route.start[1])) *
      Math.cos(radians(route.end[1])) *
      Math.sin(longitude / 2) ** 2;
  return Math.round(6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Ready-to-integrate maps application. Free/offline demo is always the default,
 * including builds with a Google key. Configuration entered in the dialog is
 * kept only in this mounted component's memory.
 */
export function MapsWorkspace() {
  const { l, locale, number, date } = useLanguage();
  const { theme } = useTheme();
  const { appearance } = useAppearance();
  const searchId = useId();
  const mapArea = useRef<HTMLDivElement>(null);
  const pendingMapFocus = useRef<string | null>(null);
  const [provider, setProvider] = useState<"demo" | "google">("demo");
  const [view, setView] = useState<"map" | "list">("map");
  const [directory, setDirectory] = useState<"routes" | "locations">("routes");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [routeId, setRouteId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showLocations, setShowLocations] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const [mapType, setMapType] = useState<GoogleMapType>("roadmap");
  const [viewResetKey, setViewResetKey] = useState(0);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [sessionConfiguration, setSessionConfiguration] =
    useState<SessionConfiguration | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [mapIdDraft, setMapIdDraft] = useState(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
  );
  const [configurationError, setConfigurationError] = useState<{
    key?: string;
    mapId?: string;
  }>({});

  const environmentKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const environmentMapId =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";
  const configuration =
    sessionConfiguration ??
    (environmentKey
      ? { apiKey: environmentKey, mapId: environmentMapId }
      : null);
  const term = fold(query);
  const filteredRoutes = useMemo(
    () =>
      shipmentRoutes.filter(
        (route) =>
          (status === "all" || route.status === status) &&
          fold(
            `${route.id} ${route.from} ${route.to} ${route.driver}`,
          ).includes(term),
      ),
    [status, term],
  );
  const filteredLocations = useMemo(
    () =>
      workspaceLocations.filter((location) => {
        const route = shipmentRoutes.find(
          (item) => item.id === location.routeId,
        )!;
        return (
          (status === "all" || route.status === status) &&
          fold(`${location.title} ${route.id} ${route.driver}`).includes(term)
        );
      }),
    [status, term],
  );
  const mapRoutes: GoogleMapRoute[] = useMemo(
    () =>
      filteredRoutes.map((route) => ({
        id: route.id,
        path: [
          { lat: route.start[1], lng: route.start[0] },
          { lat: route.end[1], lng: route.end[0] },
        ],
      })),
    [filteredRoutes],
  );
  const selectedRoute = filteredRoutes.find((route) => route.id === routeId);
  const selectedLocation = filteredLocations.find(
    (location) => location.id === locationId,
  );
  const selectedLocationRoute = selectedLocation
    ? shipmentRoutes.find((route) => route.id === selectedLocation.routeId)
    : undefined;
  const detailRoute = selectedLocationRoute ?? selectedRoute;
  const useInteractiveDemo =
    !selectedRoute &&
    !selectedLocation &&
    status === "all" &&
    !term &&
    showRoutes &&
    showLocations &&
    showGrid;
  const activeCount = shipmentRoutes.filter(
    (route) => route.status === "transit",
  ).length;
  const deliveredCount = shipmentRoutes.filter(
    (route) => route.status === "delivered",
  ).length;
  const averageProgress = Math.round(
    shipmentRoutes.reduce((sum, route) => sum + route.progress, 0) /
      shipmentRoutes.length,
  );

  useEffect(() => {
    const id = pendingMapFocus.current;
    if (!id || id !== selectedLocation?.id) return;
    const marker = [
      ...(mapArea.current?.querySelectorAll<SVGElement>(
        "[data-offline-location]",
      ) ?? []),
    ].find((node) => node.dataset.offlineLocation === id);
    marker?.focus();
    pendingMapFocus.current = null;
  }, [selectedLocation?.id]);

  function selectRoute(id: string) {
    setRouteId(id);
    setLocationId(null);
  }
  function selectLocation(id: string) {
    const location = workspaceLocations.find((item) => item.id === id);
    if (!location) return;
    setLocationId(id);
    setRouteId(location.routeId);
  }
  function selectOverviewLocation(id: string) {
    pendingMapFocus.current = id;
    selectLocation(id);
  }
  function fitView() {
    setRouteId(null);
    setLocationId(null);
    setViewResetKey((key) => key + 1);
  }
  function clearFilters() {
    setQuery("");
    setStatus("all");
    fitView();
  }
  function chooseGoogle() {
    if (configuration) setProvider("google");
    else setConfigurationOpen(true);
  }
  function closeConfiguration(open: boolean) {
    setConfigurationOpen(open);
    if (!open) {
      setKeyDraft("");
      setConfigurationError({});
    }
  }
  function connectGoogle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const apiKey = keyDraft.trim() || configuration?.apiKey || "";
    const mapId = mapIdDraft.trim() || "DEMO_MAP_ID";
    const errors: { key?: string; mapId?: string } = {};
    if (!apiKey) {
      errors.key = l(
        "Add a browser API key.",
        "Agrega una clave de navegador.",
      );
    } else if (apiKey.length > 256 || !/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
      errors.key = l(
        "Review the browser key format.",
        "Revisa el formato de la clave de navegador.",
      );
    }
    if (!/^[a-zA-Z0-9_-]{1,256}$/.test(mapId)) {
      errors.mapId = l(
        "Use a map ID without spaces or URL parameters.",
        "Usa un ID de mapa sin espacios ni parámetros URL.",
      );
    }
    if (errors.key || errors.mapId) {
      setConfigurationError(errors);
      return;
    }
    setSessionConfiguration({ apiKey, mapId });
    setProvider("google");
    closeConfiguration(false);
  }
  function exportRoutes() {
    const ids = new Set(filteredRoutes.map((route) => route.id));
    downloadText(
      "aureform-filtered-routes.geojson",
      JSON.stringify(
        {
          ...routeGeometry,
          features: routeGeometry.features.filter((feature) =>
            ids.has(String(feature.properties?.id)),
          ),
        },
        null,
        2,
      ),
      "application/geo+json",
    );
  }

  const demoLayers = (
    <OfflineMapLayers
      key={viewResetKey}
      routes={filteredRoutes}
      locations={filteredLocations}
      selectedRouteId={selectedRoute?.id}
      selectedLocationId={selectedLocation?.id}
      showRoutes={showRoutes}
      showLocations={showLocations}
      showGrid={showGrid}
      onLocationSelect={selectLocation}
      label={l("Offline shipment map", "Mapa local de envíos")}
      l={l}
    />
  );

  return (
    <div
      className="grid min-w-0 gap-6"
      data-maps-workspace
      data-map-provider={provider}
    >
      <PageHeading
        eyebrow={l("Applications · Maps", "Aplicaciones · Mapas")}
        title={l(
          "Every route. A clearer view.",
          "Cada ruta. Una vista más clara.",
        )}
        description={l(
          "Explore shipments and locations in one workspace. Start with the free demo or connect your Google Maps project.",
          "Explora envíos y ubicaciones en un solo espacio. Empieza con la demo gratuita o conecta tu proyecto de Google Maps.",
        )}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigurationOpen(true)}
            >
              <Settings2 aria-hidden="true" />
              {l("Map settings", "Configurar mapa")}
            </Button>
            <Button size="sm" appearance="gradient" onClick={exportRoutes}>
              <Download aria-hidden="true" />
              {l("Export routes", "Exportar rutas")}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: l("Shipment routes", "Rutas de envío"),
            value: shipmentRoutes.length,
            Icon: Route,
            detail: l("Illustrative route network", "Red de rutas ilustrativa"),
          },
          {
            label: l("In transit", "En tránsito"),
            value: activeCount,
            Icon: Truck,
            detail: l(
              "Demo deliveries on their way",
              "Envíos de ejemplo en camino",
            ),
          },
          {
            label: l("Locations", "Ubicaciones"),
            value: workspaceLocations.length,
            Icon: MapPin,
            detail: l("Origins and destinations", "Orígenes y destinos"),
          },
          {
            label: l("Average progress", "Progreso promedio"),
            value: averageProgress,
            Icon: CheckCheck,
            detail: `${number(deliveredCount)} ${l("delivered route", "ruta entregada")}`,
            suffix: "%",
          },
        ].map(({ label, value, Icon, detail, suffix }) => (
          <Card key={label} className="relative overflow-hidden p-4 sm:p-5">
            <div
              className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-primary/10 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="mt-3 text-[28px] font-semibold tracking-tight tabular-nums">
                  {number(value)}
                  {suffix}
                </p>
                <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                  {detail}
                </p>
              </div>
              <span className="rounded-xl border border-primary/20 bg-accent/60 p-2.5 text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-accent text-primary">
              <Compass className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                {l("Route explorer", "Explorador de rutas")}
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {provider === "demo"
                  ? l(
                      "Local geometry · No API key needed",
                      "Geometría local · Sin clave API",
                    )
                  : l(
                      "Google Maps · Your project configuration",
                      "Google Maps · Configuración de tu proyecto",
                    )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-xl border border-border bg-surface-subtle p-1"
              role="group"
              aria-label={l("Map provider", "Proveedor del mapa")}
            >
              <Button
                size="sm"
                variant={provider === "demo" ? "secondary" : "ghost"}
                aria-pressed={provider === "demo"}
                onClick={() => setProvider("demo")}
              >
                <Globe2 aria-hidden="true" />
                {l("Free demo", "Demo gratuita")}
              </Button>
              <Button
                size="sm"
                variant={provider === "google" ? "secondary" : "ghost"}
                aria-pressed={provider === "google"}
                onClick={chooseGoogle}
              >
                <MapPin aria-hidden="true" />
                Google Maps
              </Button>
            </div>
            <div
              className="inline-flex rounded-xl border border-border bg-surface-subtle p-1"
              role="group"
              aria-label={l("Workspace view", "Vista del espacio")}
            >
              <Button
                size="icon-sm"
                variant={view === "map" ? "secondary" : "ghost"}
                aria-label={l("Map view", "Vista de mapa")}
                aria-pressed={view === "map"}
                onClick={() => setView("map")}
              >
                <MapIcon aria-hidden="true" />
              </Button>
              <Button
                size="icon-sm"
                variant={view === "list" ? "secondary" : "ghost"}
                aria-label={l("List view", "Vista de lista")}
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-border bg-surface-subtle/25 p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:p-5">
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              {l("Search routes or locations", "Buscar rutas o ubicaciones")}
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={l(
                "Search a city, route or driver…",
                "Busca una ciudad, ruta o conductor…",
              )}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={setStatus}
            aria-label={l("Filter shipment status", "Filtrar estado del envío")}
            options={[
              { value: "all", label: l("All statuses", "Todos los estados") },
              { value: "transit", label: l("In transit", "En tránsito") },
              { value: "scheduled", label: l("Scheduled", "Programado") },
              { value: "delivered", label: l("Delivered", "Entregado") },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                <Layers3 aria-hidden="true" />
                {l("Layers", "Capas")}
              </PopoverTrigger>
              <PopoverContent align="end" className="max-w-[calc(100vw-32px)]">
                <PopoverTitle className="text-sm font-semibold">
                  {l("Map layers", "Capas del mapa")}
                </PopoverTitle>
                <div className="mt-4 grid gap-4">
                  <LayerSwitch
                    label={l("Route lines", "Líneas de rutas")}
                    checked={showRoutes}
                    onChange={setShowRoutes}
                  />
                  <LayerSwitch
                    label={l("Location markers", "Marcadores de ubicaciones")}
                    checked={showLocations}
                    onChange={setShowLocations}
                  />
                  {provider === "demo" ? (
                    <LayerSwitch
                      label={l("Coordinate grid", "Cuadrícula de coordenadas")}
                      checked={showGrid}
                      onChange={setShowGrid}
                    />
                  ) : (
                    <>
                      <LayerSwitch
                        label={l("Live traffic", "Tráfico en tiempo real")}
                        checked={showTraffic}
                        onChange={setShowTraffic}
                      />
                      <Select
                        label={l("Base map", "Mapa base")}
                        value={mapType}
                        onValueChange={(value) => {
                          if (
                            [
                              "roadmap",
                              "satellite",
                              "hybrid",
                              "terrain",
                            ].includes(value)
                          )
                            setMapType(value as GoogleMapType);
                        }}
                        options={[
                          {
                            value: "roadmap",
                            label: l("Road map", "Mapa de calles"),
                          },
                          {
                            value: "satellite",
                            label: l("Satellite", "Satélite"),
                          },
                          {
                            value: "hybrid",
                            label: l(
                              "Satellite + labels",
                              "Satélite + etiquetas",
                            ),
                          },
                          { value: "terrain", label: l("Terrain", "Terreno") },
                        ]}
                      />
                    </>
                  )}
                </div>
                <p className="mt-4 text-[10px] leading-5 text-muted-foreground">
                  {l(
                    "Layers do not change the underlying demo records.",
                    "Las capas no cambian los registros de ejemplo.",
                  )}
                </p>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={fitView}>
              <LocateFixed aria-hidden="true" />
              {l("Fit view", "Encuadrar")}
            </Button>
            {(term || status !== "all") && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={l("Clear filters", "Limpiar filtros")}
                onClick={clearFilters}
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <div
          className={cn(
            "grid min-w-0 gap-5 p-4 sm:p-5",
            view === "map" &&
              "lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]",
          )}
        >
          <aside
            className="min-w-0"
            aria-label={l(
              "Routes and locations directory",
              "Directorio de rutas y ubicaciones",
            )}
          >
            <Tabs
              value={directory}
              onValueChange={(value) => {
                if (value === "routes" || value === "locations")
                  setDirectory(value);
              }}
            >
              <TabsList
                className="w-full"
                aria-label={l("Directory category", "Categoría del directorio")}
              >
                <TabsTrigger value="routes" className="flex-1">
                  <Route aria-hidden="true" />
                  {l("Routes", "Rutas")}
                  <span className="text-[10px] tabular-nums">
                    {number(filteredRoutes.length)}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="locations" className="flex-1">
                  <MapPin aria-hidden="true" />
                  {l("Locations", "Ubicaciones")}
                  <span className="text-[10px] tabular-nums">
                    {number(filteredLocations.length)}
                  </span>
                </TabsTrigger>
              </TabsList>
              <p
                className="mt-3 text-[10px] text-muted-foreground"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {directory === "routes"
                  ? `${number(filteredRoutes.length)} ${l("routes match your filters", "rutas coinciden con tus filtros")}`
                  : `${number(filteredLocations.length)} ${l("locations match your filters", "ubicaciones coinciden con tus filtros")}`}
              </p>
              <TabsContent value="routes" className="mt-3">
                <div
                  className={cn(
                    "grid content-start gap-3",
                    view === "map"
                      ? "max-h-[520px] overflow-y-auto p-0.5"
                      : "sm:grid-cols-2 xl:grid-cols-3",
                  )}
                >
                  {filteredRoutes.map((route) => (
                    <RouteRow
                      key={route.id}
                      route={route}
                      selected={selectedRoute?.id === route.id}
                      onSelect={() => selectRoute(route.id)}
                    />
                  ))}
                </div>
                {!filteredRoutes.length && (
                  <Empty
                    title={l("No matching routes", "No hay rutas coincidentes")}
                    description={l(
                      "Try another city, driver or status.",
                      "Prueba otra ciudad, conductor o estado.",
                    )}
                    icon={<Route className="size-5" aria-hidden="true" />}
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearFilters}
                      >
                        {l("Clear filters", "Limpiar filtros")}
                      </Button>
                    }
                  />
                )}
              </TabsContent>
              <TabsContent value="locations" className="mt-3">
                <div
                  className={cn(
                    "grid content-start gap-2",
                    view === "map"
                      ? "max-h-[520px] overflow-y-auto p-0.5"
                      : "sm:grid-cols-2 xl:grid-cols-3",
                  )}
                >
                  {filteredLocations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      aria-pressed={selectedLocation?.id === location.id}
                      onClick={() => selectLocation(location.id)}
                      className={cn(
                        "flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left outline-none transition-colors hover:border-primary/40 hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-ring",
                        selectedLocation?.id === location.id &&
                          "border-primary/50 bg-accent/30",
                      )}
                    >
                      <span className="rounded-lg bg-accent p-2 text-primary">
                        <MapPin className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">
                          {location.title}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {location.routeId} ·{" "}
                          {location.kind === "origin"
                            ? l("Origin", "Origen")
                            : l("Destination", "Destino")}
                        </span>
                      </span>
                      <ArrowRight
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
                {!filteredLocations.length && (
                  <Empty
                    title={l(
                      "No matching locations",
                      "No hay ubicaciones coincidentes",
                    )}
                    description={l(
                      "Try another search or clear the status filter.",
                      "Prueba otra búsqueda o limpia el filtro de estado.",
                    )}
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearFilters}
                      >
                        {l("Clear filters", "Limpiar filtros")}
                      </Button>
                    }
                  />
                )}
              </TabsContent>
            </Tabs>
          </aside>

          <div
            ref={mapArea}
            className={cn("min-w-0", view === "list" && "hidden")}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold">
                {selectedLocation?.title ??
                  (selectedRoute
                    ? `${selectedRoute.from} → ${selectedRoute.to}`
                    : l("Your route network", "Tu red de rutas"))}
              </p>
              <Badge variant="outline">
                <span
                  className="size-1.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
                {provider === "demo"
                  ? l("Offline demo", "Demo local")
                  : "Google Maps"}
              </Badge>
            </div>
            {provider === "google" && configuration ? (
              <ConnectedGoogleMap
                label={l(
                  "Google Maps shipment workspace",
                  "Espacio de envíos en Google Maps",
                )}
                apiKey={configuration.apiKey}
                mapId={configuration.mapId}
                language={locale}
                region={locale === "es" ? "CO" : "US"}
                theme={theme}
                accentColor={appearance.colors.primary}
                motion={appearance.motion !== "off"}
                locations={filteredLocations}
                routes={mapRoutes}
                selectedLocationId={selectedLocation?.id}
                selectedRouteId={selectedRoute?.id}
                onLocationSelect={selectLocation}
                mapType={mapType}
                showRoutes={showRoutes}
                showLocations={showLocations}
                showTraffic={showTraffic}
                viewResetKey={viewResetKey}
                fallback={demoLayers}
                onFallback={() => setProvider("demo")}
              />
            ) : useInteractiveDemo ? (
              <OverviewDemoMap
                key={viewResetKey}
                label={l(
                  "Interactive offline route network",
                  "Red interactiva local de rutas",
                )}
                canvasLabel={l(
                  "Offline map canvas. Use arrow keys to move.",
                  "Lienzo del mapa local. Usa las flechas para moverte.",
                )}
                onLocationSelect={selectOverviewLocation}
              />
            ) : (
              demoLayers
            )}
            <div className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-muted-foreground">
              <CircleHelp
                className="mt-0.5 size-3.5 shrink-0"
                aria-hidden="true"
              />
              <p>
                {l(
                  "Demo routes use illustrative geometry and straight-line connections. They are not road directions, tracking or navigation.",
                  "Las rutas de ejemplo usan geometría ilustrativa y conexiones en línea recta. No son indicaciones viales, seguimiento ni navegación.",
                )}
              </p>
            </div>
          </div>
        </div>

        {detailRoute && (
          <div className="grid min-w-0 gap-5 border-t border-border bg-accent/10 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold">{detailRoute.id}</p>
                <Badge
                  variant={
                    detailRoute.status === "transit" ? "warning" : "outline"
                  }
                >
                  {statusLabel(detailRoute.status, l)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  aria-label={l("Clear selection", "Limpiar selección")}
                  onClick={fitView}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-3 text-sm font-semibold">
                {detailRoute.from}{" "}
                <span className="px-1 text-primary" aria-hidden="true">
                  →
                </span>{" "}
                {detailRoute.to}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <Avatar
                  name={detailRoute.driver}
                  src={getDemoRouteDriverAvatarSrc(detailRoute.id)}
                  size="sm"
                />
                <span>{detailRoute.driver}</span>
                <span className="ml-auto text-muted-foreground">
                  {l("Demo arrival", "Llegada de ejemplo")} ·{" "}
                  {date(detailRoute.eta, { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
            <div className="grid content-center gap-3">
              <div className="flex flex-wrap justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground">
                  {l("Journey progress", "Progreso del recorrido")}
                </span>
                <span className="font-semibold tabular-nums">
                  {number(detailRoute.progress)}%
                </span>
              </div>
              <Progress
                value={detailRoute.progress}
                label={`${detailRoute.id} ${l("journey progress", "progreso del recorrido")}`}
              />
              <p className="text-[10px] leading-5 text-muted-foreground">
                {selectedLocation
                  ? `${selectedLocation.title} · ${number(selectedLocation.position.lat, { maximumFractionDigits: 4 })}, ${number(selectedLocation.position.lng, { maximumFractionDigits: 4 })}`
                  : `${l("Straight-line distance", "Distancia en línea recta")} · ${number(straightLineKilometers(detailRoute))} km`}
              </p>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={configurationOpen} onOpenChange={closeConfiguration}>
        <DialogContent
          closeLabel={l("Close map settings", "Cerrar configuración del mapa")}
        >
          <DialogTitle>
            {l("Connect your map project", "Conecta tu proyecto de mapas")}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Google Maps uses your project's quotas and billing. The free local demo remains available without a key.",
              "Google Maps utiliza las cuotas y la facturación de tu proyecto. La demo local gratuita sigue disponible sin una clave.",
            )}
          </DialogDescription>
          <form onSubmit={connectGoogle} className="mt-6 grid gap-4">
            <Field
              label={l(
                "Google Maps browser API key",
                "Clave API de navegador de Google Maps",
              )}
              description={
                configuration
                  ? l(
                      "A configuration is available. Leave this blank to reuse it.",
                      "Hay una configuración disponible. Déjalo vacío para reutilizarla.",
                    )
                  : l(
                      "Kept in memory for this view; sent to Google only when you connect.",
                      "Se mantiene en memoria para esta vista; se envía a Google solo al conectar.",
                    )
              }
              error={configurationError.key}
            >
              <Input
                type="password"
                autoComplete="off"
                spellCheck={false}
                maxLength={256}
                value={keyDraft}
                onChange={(event) => {
                  setKeyDraft(event.target.value);
                  setConfigurationError((previous) => ({
                    ...previous,
                    key: undefined,
                  }));
                }}
                placeholder={l(
                  "Paste your browser key",
                  "Pega tu clave de navegador",
                )}
              />
            </Field>
            <Field
              label={l("Map ID", "ID de mapa")}
              error={configurationError.mapId}
              description={l(
                "Use your map ID for production. DEMO_MAP_ID is only for examples.",
                "Usa tu ID de mapa en producción. DEMO_MAP_ID es solo para ejemplos.",
              )}
            >
              <Input
                value={mapIdDraft}
                onChange={(event) => {
                  setMapIdDraft(event.target.value);
                  setConfigurationError((previous) => ({
                    ...previous,
                    mapId: undefined,
                  }));
                }}
                autoComplete="off"
                spellCheck={false}
                maxLength={256}
                placeholder="DEMO_MAP_ID"
              />
            </Field>
            <div className="rounded-xl border border-border bg-surface-subtle p-3 text-[11px] leading-6 text-muted-foreground">
              {l(
                "Restrict a browser key to your websites and Maps JavaScript API. Public build variables are visible in the browser. After the SDK loads, changing its key requires a page reload.",
                "Restringe una clave de navegador a tus sitios y a Maps JavaScript API. Las variables públicas del build son visibles en el navegador. Después de cargar el SDK, cambiar su clave requiere recargar la página.",
              )}
            </div>
            <DialogFooter className="mt-1 flex-wrap">
              {sessionConfiguration && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-auto"
                  onClick={() => {
                    setSessionConfiguration(null);
                    setProvider("demo");
                    closeConfiguration(false);
                  }}
                >
                  {l("Disconnect this view", "Desconectar esta vista")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => closeConfiguration(false)}
              >
                {l("Cancel", "Cancelar")}
              </Button>
              <Button type="submit">
                <MapPin aria-hidden="true" />
                {l("Connect Google Maps", "Conectar Google Maps")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LayerSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="text-xs">
        {label}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function RouteRow({
  route,
  selected,
  onSelect,
}: {
  route: Shipment;
  selected: boolean;
  onSelect: () => void;
}) {
  const { l, date, number } = useLanguage();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group min-w-0 rounded-xl border border-border bg-surface p-4 text-left outline-none transition-[border-color,background-color,box-shadow] hover:border-primary/40 hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [[data-motion-level=off]_&]:transition-none",
        selected && "border-primary/50 bg-accent/30 shadow-sm",
      )}
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">
          {route.id}
        </span>
        <Badge variant={route.status === "transit" ? "warning" : "outline"}>
          {statusLabel(route.status, l)}
        </Badge>
      </span>
      <span className="mt-4 flex items-center gap-2 text-xs font-semibold">
        <span className="min-w-0 flex-1">{route.from}</span>
        <ArrowRight
          className="size-3.5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 text-right">{route.to}</span>
      </span>
      <span className="mb-2 mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{l("Journey progress", "Progreso del recorrido")}</span>
        <span className="tabular-nums">{number(route.progress)}%</span>
      </span>
      <Progress
        value={route.progress}
        label={`${route.id} ${l("progress", "progreso")}`}
      />
      <span className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">
        <Avatar
          name={route.driver}
          src={getDemoRouteDriverAvatarSrc(route.id)}
          size="sm"
        />
        <span className="min-w-0">{route.driver}</span>
        <span className="ml-auto text-muted-foreground">
          {date(route.eta, { month: "short", day: "numeric" })}
        </span>
      </span>
    </button>
  );
}

/** Compose the existing map without changing its module or historical output. */
function OverviewDemoMap({
  label,
  canvasLabel,
  onLocationSelect,
}: {
  label: string;
  canvasLabel: string;
  onLocationSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const labelCanvas = () => {
      const canvas = element.querySelector("canvas[role=region]");
      if (canvas && canvas.getAttribute("aria-label") !== canvasLabel) {
        canvas.setAttribute("aria-label", canvasLabel);
      }
    };
    labelCanvas();
    const observer = new MutationObserver(labelCanvas);
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label"],
    });
    return () => observer.disconnect();
  }, [canvasLabel]);
  return (
    <div
      ref={host}
      onClick={(event) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest("button[aria-label]");
        if (!button) return;
        const location = workspaceLocations.find(
          (item) =>
            `${item.routeId}: ${item.title}` ===
            button.getAttribute("aria-label"),
        );
        if (location) onLocationSelect(location.id);
      }}
    >
      <RouteMap selected="all" label={label} />
    </div>
  );
}

/** Layered SVG view also works when WebGL is unavailable. */
function OfflineMapLayers({
  routes,
  locations,
  selectedRouteId,
  selectedLocationId,
  showRoutes,
  showLocations,
  showGrid,
  onLocationSelect,
  label,
  l,
}: {
  routes: Shipment[];
  locations: WorkspaceLocation[];
  selectedRouteId?: string;
  selectedLocationId?: string;
  showRoutes: boolean;
  showLocations: boolean;
  showGrid: boolean;
  onLocationSelect: (id: string) => void;
  label: string;
  l: Localize;
}) {
  const helpId = useId();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedRouteId, selectedLocationId]);
  const pixels = (position: GoogleMapPosition) => ({
    x: (position.lng + 180) * 2,
    y: (90 - position.lat) * 2,
  });
  const selectedLocation = locations.find(
    (item) => item.id === selectedLocationId,
  );
  const selectedRoute = routes.find((item) => item.id === selectedRouteId);
  const positions = selectedLocation
    ? [pixels(selectedLocation.position)]
    : selectedRoute
      ? [
          pixels({ lng: selectedRoute.start[0], lat: selectedRoute.start[1] }),
          pixels({ lng: selectedRoute.end[0], lat: selectedRoute.end[1] }),
        ]
      : [];
  const base = positions.length
    ? {
        x:
          (Math.min(...positions.map((p) => p.x)) +
            Math.max(...positions.map((p) => p.x))) /
          2,
        y:
          (Math.min(...positions.map((p) => p.y)) +
            Math.max(...positions.map((p) => p.y))) /
          2,
        width: Math.max(
          30,
          Math.max(...positions.map((p) => p.x)) -
            Math.min(...positions.map((p) => p.x)) +
            18,
        ),
      }
    : { x: 360, y: 180, width: 720 };
  const width = base.width / zoom;
  const height = width / 2;
  const frame = {
    x: base.x - width / 2 + pan.x,
    y: base.y - height / 2 + pan.y,
    width,
    height,
  };
  const path = (points: number[][], closed = false) =>
    points
      .map((point, index) => {
        const p = pixels({ lng: point[0], lat: point[1] });
        return `${index ? "L" : "M"}${p.x},${p.y}`;
      })
      .join(" ") + (closed ? " Z" : "");
  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      setPan((previous) => ({
        x:
          previous.x +
          (event.key === "ArrowRight"
            ? width / 12
            : event.key === "ArrowLeft"
              ? -width / 12
              : 0),
        y:
          previous.y +
          (event.key === "ArrowDown"
            ? height / 12
            : event.key === "ArrowUp"
              ? -height / 12
              : 0),
      }));
    } else if (["+", "=", "-"].includes(event.key)) {
      event.preventDefault();
      setZoom((previous) =>
        Math.max(
          1,
          Math.min(8, previous * (event.key === "-" ? 1 / 1.5 : 1.5)),
        ),
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      reset();
    }
  }
  return (
    <div
      role="region"
      aria-label={label}
      aria-describedby={helpId}
      tabIndex={0}
      onKeyDown={navigate}
      className="relative h-[460px] min-w-0 overflow-hidden rounded-xl border border-border bg-surface-subtle outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-offline-map
    >
      <p id={helpId} className="sr-only">
        {l(
          "Use arrow keys to pan, plus or minus to zoom, and Home to reset. Tab to location markers.",
          "Usa las flechas para desplazarte, más o menos para acercar o alejar y Inicio para restablecer. Usa Tab para los marcadores.",
        )}
      </p>
      <svg
        viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="group"
        aria-label={l(
          "Illustrative geographic layers",
          "Capas geográficas ilustrativas",
        )}
      >
        {showGrid &&
          gridGeometry.features.map((feature, index) => (
            <path
              key={index}
              d={path(feature.geometry.coordinates)}
              stroke="var(--border)"
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
              fill="none"
              aria-hidden="true"
            />
          ))}
        {land.features.map((feature, index) => (
          <path
            key={index}
            d={feature.geometry.coordinates
              .map((ring) => path(ring, true))
              .join(" ")}
            fill="var(--accent)"
            stroke="var(--border)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            aria-hidden="true"
          />
        ))}
        {showRoutes &&
          routes.map((route) => (
            <path
              key={route.id}
              d={path([route.start, route.end])}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={route.id === selectedRouteId ? 3 : 1.75}
              strokeDasharray={route.id === selectedRouteId ? undefined : "5 4"}
              opacity={
                !selectedRouteId || route.id === selectedRouteId ? 0.9 : 0.25
              }
              vectorEffect="non-scaling-stroke"
              aria-hidden="true"
            />
          ))}
        {showLocations &&
          locations.map((location) => {
            const p = pixels(location.position);
            if (
              p.x < frame.x ||
              p.x > frame.x + frame.width ||
              p.y < frame.y ||
              p.y > frame.y + frame.height
            )
              return null;
            const selected = selectedLocationId === location.id;
            return (
              <g
                key={location.id}
                data-offline-location={location.id}
                role="button"
                tabIndex={0}
                aria-label={`${location.title} · ${location.routeId}`}
                aria-pressed={selected}
                onClick={() => onLocationSelect(location.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onLocationSelect(location.id);
                  }
                }}
                className="cursor-pointer outline-none focus-visible:[&_circle]:stroke-ring focus-visible:[&_circle]:stroke-[3px]"
              >
                <title>{location.title}</title>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={width / 90}
                  fill={selected ? "var(--primary)" : "var(--surface)"}
                  stroke="var(--primary)"
                  strokeWidth={selected ? 3 : 2}
                  vectorEffect="non-scaling-stroke"
                />
                {(selected || selectedRouteId === location.routeId) && (
                  <text
                    x={p.x + width / 55}
                    y={p.y - width / 65}
                    fontSize={width / 55}
                    fontWeight={600}
                    fill="var(--foreground)"
                    aria-hidden="true"
                  >
                    {location.title}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
      <div
        className="absolute right-3 top-3 flex flex-col gap-1 rounded-xl border border-border bg-surface/95 p-1 shadow-lg"
        role="group"
        aria-label={l("Offline map controls", "Controles del mapa local")}
      >
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={l("Zoom in", "Acercar")}
          disabled={zoom >= 8}
          onClick={() => setZoom((value) => Math.min(8, value * 1.5))}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={l("Zoom out", "Alejar")}
          disabled={zoom <= 1}
          onClick={() => setZoom((value) => Math.max(1, value / 1.5))}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={l("Reset map position", "Restablecer posición del mapa")}
          onClick={reset}
        >
          <LocateFixed aria-hidden="true" />
        </Button>
      </div>
      <span className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-24px)] rounded-lg border border-border bg-surface/95 px-3 py-1.5 text-[9px] text-muted-foreground">
        {l(
          "Original schematic geometry · Offline",
          "Geometría esquemática original · Local",
        )}
      </span>
    </div>
  );
}
