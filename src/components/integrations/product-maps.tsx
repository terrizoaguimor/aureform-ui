"use client";

import { lazy, Suspense, useState } from "react";
import { LocateFixed, MapPin, Route } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useIntegrationOperation } from "@/hooks/use-integration-operation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  IntegrationResult,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import type { IntegrationMapRenderer } from "@/lib/integrations/map-renderer";
import {
  findProductAction,
  invalidProductField,
  productActionValues,
  productMapLocations,
} from "./product-model";
import {
  ProductActionUnavailable,
  ProductEmpty,
  ProductFields,
  ProductOperationFeedback,
  ProductPanel,
  ProductResourcePicker,
  ProductResult,
  ProductValidation,
  useProductResources,
} from "./product-ui";

const DemoRouteMap = lazy(() =>
  import("@/components/blocks/route-map").then((module) => ({
    default: module.RouteMap,
  })),
);
type Location = Extract<
  IntegrationResult,
  { kind: "map" }
>["locations"][number];

function CoordinateMap({
  locations,
  coordinates,
  selected,
  onSelect,
}: {
  locations: Location[];
  coordinates?: [number, number][];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { l } = useLanguage();
  const x = (longitude: number) => (longitude + 180) * 2;
  const y = (latitude: number) => (90 - latitude) * 2;
  const route = (coordinates ?? []).filter(
    ([lng, lat]) =>
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      Math.abs(lng) <= 180 &&
      Math.abs(lat) <= 90,
  );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-linear-to-br from-primary/5 to-surface-subtle">
      <svg
        viewBox="0 0 720 360"
        role="group"
        aria-label={l(
          "Coordinates returned by the connected source",
          "Coordenadas devueltas por la fuente conectada",
        )}
        className="min-h-64 w-full"
      >
        <title>
          {l(
            "Select a location to inspect its coordinates",
            "Selecciona una ubicación para revisar sus coordenadas",
          )}
        </title>
        {[-120, -60, 0, 60, 120].map((lng) => (
          <line
            key={`lng-${lng}`}
            x1={x(lng)}
            x2={x(lng)}
            y1="0"
            y2="360"
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
        ))}
        {[-60, -30, 0, 30, 60].map((lat) => (
          <line
            key={`lat-${lat}`}
            y1={y(lat)}
            y2={y(lat)}
            x1="0"
            x2="720"
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
        ))}
        {route.length > 1 && (
          <polyline
            points={route.map(([lng, lat]) => `${x(lng)},${y(lat)}`).join(" ")}
            stroke="var(--primary)"
            fill="none"
            strokeWidth="2"
          />
        )}
        {locations.map((location, index) => (
          <g
            key={location.id}
            role="button"
            tabIndex={0}
            aria-label={`${location.name}: ${location.latitude}, ${location.longitude}`}
            aria-pressed={selected === location.id}
            onClick={() => onSelect(location.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(location.id);
              }
            }}
            className="cursor-pointer outline-none focus-visible:[&_circle]:stroke-[var(--ring)]"
          >
            <circle
              cx={x(location.longitude)}
              cy={y(location.latitude)}
              r={selected === location.id ? 10 : 7}
              fill="var(--primary)"
              stroke="var(--surface)"
              strokeWidth="3"
            />
            <text
              x={x(location.longitude)}
              y={y(location.latitude) - 14}
              textAnchor="middle"
              fontSize="11"
              fill="var(--foreground)"
            >
              {index + 1}
            </text>
          </g>
        ))}
      </svg>
      <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        {l(
          "Schematic coordinate view · no external basemap",
          "Vista esquemática de coordenadas · sin mapa base externo",
        )}
      </p>
    </div>
  );
}

export function ProductMapsWorkbench(props: IntegrationWorkbenchProps & { renderMap?: IntegrationMapRenderer }) {
  const { l, number } = useLanguage();
  const operation = useIntegrationOperation(props);
  const resources = useProductResources(props);
  const geocode = findProductAction(props.definition, "geocode");
  const route = findProductAction(props.definition, "route");
  const query = findProductAction(props.definition, "query");
  const [resourceId, setResourceId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [address, setAddress] = useState("");
  const [extra, setExtra] = useState<IntegrationValues>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [routeResult, setRouteResult] = useState<Extract<
    IntegrationResult,
    { kind: "map" }
  > | null>(null);
  const [selected, setSelected] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [invalidLocations, setInvalidLocations] = useState(false);
  const [showDemo, setShowDemo] = useState(true);
  const geocodeValues = productActionValues(
    geocode,
    { ...extra, address, query: address },
    resourceId,
  );
  const routeValues = productActionValues(
    route,
    { ...extra, origin, destination, from: origin, to: destination },
    resourceId,
  );

  async function run(kind: "query" | "geocode" | "route") {
    const action =
      kind === "query" ? query : kind === "geocode" ? geocode : route;
    if (!action) return;
    const values =
      kind === "route"
        ? routeValues
        : kind === "geocode"
          ? geocodeValues
          : productActionValues(action, extra, resourceId);
    if (invalidProductField(action, values)) return;
    const result = await operation.run(action, values);
    if (result?.kind !== "map") return;
    const valid = productMapLocations(result);
    setInvalidLocations(valid.length !== result.locations.length);
    setLocations((previous) => {
      const merged = new Map(
        (kind === "query" ? [] : previous).map((item) => [item.id, item]),
      );
      valid.forEach((item) => merged.set(item.id, item));
      return [...merged.values()];
    });
    if (valid[0]) {
      setSelected(valid[0].id);
      if (!origin) setOrigin(valid[0].id);
      if (!destination)
        setDestination(
          valid.find((item) => item.id !== (origin || valid[0].id))?.id ?? "",
        );
    }
    if (kind === "route") setRouteResult(result);
  }
  const location = locations.find((item) => item.id === selected);
  const options = locations.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  return (
    <div className="space-y-5">
      <ProductPanel
        title={l("Location workbench", "Espacio de ubicaciones")}
        description={
          props.adapter.mode === "demo"
            ? l(
                "Addresses, locations and routes are local fixtures, including when Google Maps or Mapbox is selected. The demo uses no provider keys, styles or SDK requests.",
                "Direcciones, ubicaciones y rutas son fixtures locales, también al seleccionar Google Maps o Mapbox. La demo no usa claves, estilos ni solicitudes de SDK del proveedor.",
              )
            : l(
                "Resolve addresses and select locations returned by this connection.",
                "Resuelve direcciones y selecciona ubicaciones devueltas por esta conexión.",
              )
        }
      >
        <ProductResourcePicker
          {...resources}
          value={resourceId}
          onChange={(value) => {
            operation.reset();
            setResourceId(value);
            setLocations([]);
            setRouteResult(null);
            setSelected("");
            setOrigin("");
            setDestination("");
          }}
          disabled={operation.pending}
        />
        {query && (
          <div className="mt-4">
            <Button
              variant="outline"
              loading={operation.pending}
              onClick={() => {
                void run("query");
              }}
            >
              {l("Load authorized locations", "Cargar ubicaciones autorizadas")}
            </Button>
          </div>
        )}
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run("geocode");
          }}
        >
          <label className="block space-y-2 text-xs font-medium">
            {l("Address or place", "Dirección o lugar")}
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={l(
                "Enter a place to resolve",
                "Introduce un lugar para resolver",
              )}
              required
            />
          </label>
          <ProductFields
            action={geocode}
            values={extra}
            onChange={setExtra}
            exclude={["resourceId", "address", "query"]}
          />
          <ProductValidation action={geocode} values={geocodeValues} />
          <Button
            type="submit"
            appearance="gradient"
            disabled={
              !geocode ||
              !address.trim() ||
              operation.pending ||
              Boolean(invalidProductField(geocode, geocodeValues))
            }
          >
            <LocateFixed />
            {l("Resolve address", "Resolver dirección")}
          </Button>
        </form>
        <div className="mt-4">
          <ProductActionUnavailable action={geocode} />
          <ProductOperationFeedback operation={operation} />
        </div>
      </ProductPanel>
      <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
        <ProductPanel title={l("Returned locations", "Ubicaciones devueltas")}>
          {locations.length ? (
            <>
              {props.renderMap ? props.renderMap({
                connection: props.connection,
                scope: props.scope,
                locations,
                coordinates: routeResult?.coordinates,
                selectedLocationId: selected,
                onLocationSelect: setSelected,
                fallback: <CoordinateMap locations={locations} coordinates={routeResult?.coordinates} selected={selected} onSelect={setSelected} />,
              }) : <CoordinateMap locations={locations} coordinates={routeResult?.coordinates} selected={selected} onSelect={setSelected} />}
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {locations.map((item, index) => (
                  <li key={item.id}>
                    <Button
                      variant={selected === item.id ? "secondary" : "outline"}
                      className="h-auto min-h-11 w-full justify-start whitespace-normal py-3 text-left"
                      onClick={() => setSelected(item.id)}
                      aria-pressed={selected === item.id}
                    >
                      <MapPin />
                      <span>
                        {index + 1}. {item.name}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ProductEmpty>
              {l(
                "Load authorized locations or resolve an address to begin.",
                "Carga ubicaciones autorizadas o resuelve una dirección para comenzar.",
              )}
            </ProductEmpty>
          )}
          {invalidLocations && (
            <p
              role="alert"
              className="mt-3 text-xs text-destructive-foreground"
            >
              {l(
                "Some returned locations had missing IDs or invalid coordinates and were omitted.",
                "Se omitieron ubicaciones con IDs ausentes o coordenadas inválidas.",
              )}
            </p>
          )}
          {location && (
            <dl className="mt-4 grid gap-3 rounded-xl bg-surface-subtle p-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">
                  {l("Location", "Ubicación")}
                </dt>
                <dd className="mt-1 font-medium">{location.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ID</dt>
                <dd className="mt-1 wrap-break-word">{location.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {l("Latitude", "Latitud")}
                </dt>
                <dd className="mt-1">
                  {number(location.latitude, { maximumFractionDigits: 6 })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {l("Longitude", "Longitud")}
                </dt>
                <dd className="mt-1">
                  {number(location.longitude, { maximumFractionDigits: 6 })}
                </dd>
              </div>
            </dl>
          )}
        </ProductPanel>
        <ProductPanel title={l("Route request", "Solicitud de ruta")}>
          <div className="space-y-4">
            <Select
              label={l("Origin", "Origen")}
              options={options}
              value={origin}
              onValueChange={(value) => {
                setOrigin(value);
                setRouteResult(null);
              }}
            />
            <Select
              label={l("Destination", "Destino")}
              options={options}
              value={destination}
              onValueChange={(value) => {
                setDestination(value);
                setRouteResult(null);
              }}
            />
            <ProductFields
              action={route}
              values={extra}
              onChange={(value) => {
                setExtra(value);
                setRouteResult(null);
              }}
              exclude={["resourceId", "origin", "destination", "from", "to"]}
            />
            <ProductValidation action={route} values={routeValues} />
            <Button
              appearance="gradient"
              disabled={
                !route ||
                operation.pending ||
                !origin ||
                !destination ||
                origin === destination ||
                Boolean(invalidProductField(route, routeValues))
              }
              onClick={() => {
                void run("route");
              }}
            >
              <Route />
              {l("Request route", "Solicitar ruta")}
            </Button>
            <ProductActionUnavailable action={route} />
            {routeResult && (
              <p
                role="status"
                className="text-xs leading-6 text-muted-foreground"
              >
                {routeResult.coordinates?.length
                  ? props.adapter.mode === "demo"
                    ? l(
                        "Demonstration route geometry. This is not a live directions response.",
                        "Geometría de ruta de demostración. No es una respuesta de indicaciones en vivo.",
                      )
                    : l(
                        "Displaying route geometry returned by your backend.",
                        "Se muestra la geometría de ruta devuelta por tu backend.",
                      )
                  : l(
                      "The backend returned locations without route geometry.",
                      "El backend devolvió ubicaciones sin geometría de ruta.",
                    )}
              </p>
            )}
          </div>
        </ProductPanel>
      </div>
      {operation.result && operation.result.kind !== "map" && (
        <ProductPanel title={l("Source response", "Respuesta de la fuente")}>
          <ProductResult result={operation.result} />
        </ProductPanel>
      )}
      {props.adapter.mode === "demo" && (
        <ProductPanel
          title={l(
            "Aureform route-map example",
            "Ejemplo de mapa de rutas de Aureform",
          )}
          description={l(
            "This existing RouteMap uses fixed demonstration routes, separately from the locations above.",
            "Este RouteMap existente usa rutas fijas de demostración, separadas de las ubicaciones anteriores.",
          )}
        >
          <Button
            variant="outline"
            onClick={() => setShowDemo((value) => !value)}
          >
            {showDemo
              ? l("Hide example", "Ocultar ejemplo")
              : l("Show route-map example", "Mostrar ejemplo de mapa")}
          </Button>
          {showDemo && (
            <div className="mt-4">
              <Suspense
                fallback={
                  <ProductEmpty>
                    {l("Loading map example…", "Cargando ejemplo de mapa…")}
                  </ProductEmpty>
                }
              >
                <DemoRouteMap
                  label={l(
                    "Fixed demonstration shipment routes",
                    "Rutas fijas de envíos de demostración",
                  )}
                />
              </Suspense>
            </div>
          )}
        </ProductPanel>
      )}
    </div>
  );
}
