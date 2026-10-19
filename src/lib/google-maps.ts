/**
 * Small, browser-only Google Maps adapter. Importing this module does not load
 * Google or touch browser globals. Call loadGoogleMaps only after opting in.
 *
 * Credentials live in the page's memory, never in browser storage. A document
 * uses one SDK/key; changing that key requires a full page reload.
 */
export type GoogleMapPosition = Readonly<{ lat: number; lng: number }>;
export type GoogleMapType = "roadmap" | "satellite" | "hybrid" | "terrain";
export type GoogleMapLanguage = "en" | "es";

export interface GoogleMapsLoaderOptions {
  apiKey: string;
  language?: GoogleMapLanguage;
  region?: string;
  /** Supply a nonce if the host's Content Security Policy requires one. */
  nonce?: string;
  timeoutMs?: number;
}

export interface GoogleMapLocation {
  id: string;
  title: string;
  position: GoogleMapPosition;
}

export interface GoogleMapRoute {
  id: string;
  /** Authored geometry, not a call to Google's Directions or Routes APIs. */
  path: readonly GoogleMapPosition[];
  color?: string;
}

export type GoogleMapsErrorCode =
  | "browser-required"
  | "missing-key"
  | "invalid-config"
  | "key-conflict"
  | "existing-sdk"
  | "network"
  | "timeout"
  | "authentication"
  | "library"
  | "invalid-data";

const errorMessages: Record<GoogleMapsErrorCode, string> = {
  "browser-required": "Google Maps can only be loaded in a browser.",
  "missing-key": "A browser API key is required for Google Maps.",
  "invalid-config": "The Google Maps configuration is invalid.",
  "key-conflict":
    "This page already uses another Google Maps key. Reload before changing keys.",
  "existing-sdk":
    "Another Google Maps loader is present. Use one loader per page.",
  network:
    "Google Maps could not be downloaded. Check the connection and retry.",
  timeout:
    "Google Maps did not finish loading. Reload the page before trying again.",
  authentication:
    "Google Maps rejected the configuration. Check the key, restrictions and billing, then reload.",
  library:
    "The required Google Maps libraries could not be initialized. Retry the connection.",
  "invalid-data": "The map contains invalid coordinates or identifiers.",
};

export class GoogleMapsLoadError extends Error {
  readonly code: GoogleMapsErrorCode;
  readonly retryable: boolean;

  constructor(code: GoogleMapsErrorCode) {
    // Never include a key, request URL or the provider's raw error in messages.
    super(errorMessages[code]);
    this.name = "GoogleMapsLoadError";
    this.code = code;
    this.retryable = code === "network" || code === "library";
  }
}

/** Sanitize third-party failures before handing them to application callbacks. */
export function googleMapsError(error: unknown): GoogleMapsLoadError {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    Object.hasOwn(errorMessages, error.code)
  ) {
    return new GoogleMapsLoadError(error.code as GoogleMapsErrorCode);
  }
  return new GoogleMapsLoadError("library");
}

export interface GoogleMapCamera {
  center: GoogleMapPosition;
  zoom: number;
}

export interface GoogleMapInstance {
  moveCamera(camera: Partial<GoogleMapCamera>): void;
  setOptions(options: Partial<GoogleMapOptions>): void;
  getZoom(): number | undefined;
  setZoom(zoom: number): void;
  unbindAll(): void;
}

interface GoogleMapOptions extends GoogleMapCamera {
  mapId: string;
  colorScheme: "LIGHT" | "DARK";
  mapTypeId: GoogleMapType;
  backgroundColor: string;
  disableDefaultUI: boolean;
  keyboardShortcuts: boolean;
  gestureHandling: "cooperative";
  clickableIcons: boolean;
  minZoom: number;
  maxZoom: number;
}

interface GooglePolyline {
  setMap(map: GoogleMapInstance | null): void;
  setOptions(options: {
    path: GoogleMapPosition[];
    strokeColor: string;
    strokeOpacity: number;
    strokeWeight: number;
    zIndex: number;
  }): void;
}

interface GoogleTrafficLayer {
  setMap(map: GoogleMapInstance | null): void;
}

export interface GoogleAdvancedMarker extends HTMLElement {
  map: GoogleMapInstance | null;
  position: GoogleMapPosition;
  title: string;
  gmpClickable: boolean;
  zIndex: number;
}

export interface GoogleMapsLibraries {
  maps: {
    Map: new (
      element: HTMLElement,
      options: GoogleMapOptions,
    ) => GoogleMapInstance;
    Polyline: new (options: {
      map: GoogleMapInstance;
      path: GoogleMapPosition[];
      geodesic: boolean;
      clickable: boolean;
      strokeColor: string;
      strokeOpacity: number;
      strokeWeight: number;
      zIndex: number;
    }) => GooglePolyline;
    TrafficLayer: new () => GoogleTrafficLayer;
  };
  marker: {
    AdvancedMarkerElement: new (options: {
      map: GoogleMapInstance;
      position: GoogleMapPosition;
      title: string;
      gmpClickable: boolean;
      zIndex: number;
    }) => GoogleAdvancedMarker;
  };
  core: {
    event: { clearInstanceListeners(instance: object): void };
  };
}

interface GoogleMapsNamespace {
  importLibrary?: (name: "maps" | "marker" | "core") => Promise<unknown>;
}

interface LoaderState {
  key?: string;
  promise?: Promise<GoogleMapsLibraries>;
  failure?: GoogleMapsLoadError;
  listeners: Set<(error: GoogleMapsLoadError) => void>;
  rejectBootstrap?: (error: GoogleMapsLoadError) => void;
}

interface MapsWindow extends Window {
  google?: { maps?: GoogleMapsNamespace };
  gm_authFailure?: () => void;
  __aureformGoogleMapsLoaderV1?: LoaderState;
  __aureformGoogleMapsReadyV1?: () => void;
}

const scriptId = "aureform-google-maps-sdk";

function browser(): MapsWindow {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new GoogleMapsLoadError("browser-required");
  }
  return window as MapsWindow;
}

function loaderState(host: MapsWindow): LoaderState {
  if (host.__aureformGoogleMapsLoaderV1)
    return host.__aureformGoogleMapsLoaderV1;
  const state: LoaderState = { listeners: new Set() };
  const previousAuthFailure = host.gm_authFailure;
  host.gm_authFailure = () => {
    const error = new GoogleMapsLoadError("authentication");
    state.failure = error;
    state.rejectBootstrap?.(error);
    for (const notify of state.listeners) {
      try {
        notify(error);
      } catch {
        // A consumer callback must not interrupt notification of other maps.
      }
    }
    try {
      previousAuthFailure?.();
    } catch {
      // Preserve the host hook without propagating its potentially raw error.
    }
  };
  host.__aureformGoogleMapsLoaderV1 = state;
  return state;
}

/** Also reports authentication failures emitted after the SDK's load callback. */
export function subscribeGoogleMapsErrors(
  listener: (error: GoogleMapsLoadError) => void,
): () => void {
  const state = loaderState(browser());
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

function validateOptions(options: GoogleMapsLoaderOptions) {
  const key = options.apiKey.trim();
  if (!key) throw new GoogleMapsLoadError("missing-key");
  if (
    key.length > 256 ||
    !/^[a-zA-Z0-9_-]+$/.test(key) ||
    (options.language !== undefined &&
      !["en", "es"].includes(options.language)) ||
    (options.region !== undefined && !/^[a-zA-Z]{2}$/.test(options.region)) ||
    (options.timeoutMs !== undefined &&
      (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1))
  ) {
    throw new GoogleMapsLoadError("invalid-config");
  }
  return key;
}

function hasForeignLoader(host: MapsWindow): boolean {
  if (host.google?.maps?.importLibrary) return true;
  return [...document.querySelectorAll<HTMLScriptElement>("script[src]")].some(
    (script) => {
      try {
        const url = new URL(script.src, document.baseURI);
        return (
          ["maps.googleapis.com", "maps.google.com"].includes(url.hostname) &&
          url.pathname === "/maps/api/js"
        );
      } catch {
        return false;
      }
    },
  );
}

function bootstrap(
  host: MapsWindow,
  state: LoaderState,
  options: GoogleMapsLoaderOptions,
  timeoutMs: number,
): Promise<GoogleMapsNamespace> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: state.key!,
      v: "weekly",
      loading: "async",
      callback: "__aureformGoogleMapsReadyV1",
      language: options.language ?? "en",
    });
    if (options.region) params.set("region", options.region.toUpperCase());
    let finished = false;
    const finish = (error?: GoogleMapsLoadError) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      script.removeEventListener("error", onError);
      delete host.__aureformGoogleMapsReadyV1;
      delete state.rejectBootstrap;
      if (error) {
        script.remove();
        reject(error);
      } else if (host.google?.maps?.importLibrary) {
        resolve(host.google.maps);
      } else {
        // A script that executed without the current SDK interface must not
        // be injected again; only importLibrary failures are retryable.
        script.remove();
        reject(new GoogleMapsLoadError("invalid-config"));
      }
    };
    const onError = () => finish(new GoogleMapsLoadError("network"));
    const timer = setTimeout(
      () => finish(new GoogleMapsLoadError("timeout")),
      timeoutMs,
    );
    state.rejectBootstrap = (error) => finish(error);
    host.__aureformGoogleMapsReadyV1 = () => finish();
    script.id = scriptId;
    script.async = true;
    script.nonce =
      options.nonce ??
      document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ??
      "";
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new GoogleMapsLoadError("timeout")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        reject(new GoogleMapsLoadError("library"));
      },
    );
  });
}

function hasConstructors(value: unknown, names: readonly string[]): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    names.every(
      (name) =>
        name in value &&
        typeof (value as Record<string, unknown>)[name] === "function",
    )
  );
}

/**
 * Share one SDK and one concurrent library promise across all map instances.
 * First-call language/region are document-wide SDK settings. No legacy Loader
 * or Marker is used. A network/library failure may retry with the same key.
 * Timeouts/authentication/key changes require reload to avoid duplicate SDKs.
 */
export async function loadGoogleMaps(
  options: GoogleMapsLoaderOptions,
): Promise<GoogleMapsLibraries> {
  const host = browser();
  const key = validateOptions(options);
  const state = loaderState(host);
  if (state.key && state.key !== key) {
    throw new GoogleMapsLoadError("key-conflict");
  }
  if (state.failure && !state.failure.retryable) throw state.failure;
  if (state.promise) return state.promise;
  if (!state.key && hasForeignLoader(host)) {
    throw new GoogleMapsLoadError("existing-sdk");
  }
  state.key = key;
  state.failure = undefined;
  const timeoutMs = options.timeoutMs ?? 20_000;
  state.promise = (async () => {
    const namespace = host.google?.maps?.importLibrary
      ? host.google.maps
      : await bootstrap(host, state, options, timeoutMs);
    const [maps, marker, core] = await withTimeout(
      Promise.all([
        namespace.importLibrary!("maps"),
        namespace.importLibrary!("marker"),
        namespace.importLibrary!("core"),
      ]),
      timeoutMs,
    );
    if (
      !hasConstructors(maps, ["Map", "Polyline", "TrafficLayer"]) ||
      !hasConstructors(marker, ["AdvancedMarkerElement"]) ||
      !core ||
      typeof core !== "object" ||
      !("event" in core) ||
      !core.event ||
      typeof core.event !== "object" ||
      !("clearInstanceListeners" in core.event) ||
      typeof core.event.clearInstanceListeners !== "function"
    ) {
      throw new GoogleMapsLoadError("library");
    }
    if (state.failure) throw state.failure;
    return { maps, marker, core } as GoogleMapsLibraries;
  })().catch((error: unknown) => {
    const safe = googleMapsError(error);
    state.failure = safe;
    state.promise = undefined;
    throw safe;
  });
  return state.promise;
}

export function isGoogleMapPosition(position: GoogleMapPosition): boolean {
  return (
    !!position &&
    Number.isFinite(position.lat) &&
    Number.isFinite(position.lng) &&
    position.lat >= -90 &&
    position.lat <= 90 &&
    position.lng >= -180 &&
    position.lng <= 180
  );
}

/**
 * Fit authored coordinates without animated fitBounds. Accounts for viewport
 * dimensions, Mercator latitude and routes crossing the antimeridian.
 */
export function googleMapsCamera(
  positions: readonly GoogleMapPosition[],
  viewport: { width: number; height: number },
  padding = 56,
): GoogleMapCamera {
  if (!positions.length) return { center: { lat: 27, lng: -32 }, zoom: 2 };
  if (positions.some((position) => !isGoogleMapPosition(position))) {
    throw new GoogleMapsLoadError("invalid-data");
  }
  const limit = 85.05112878;
  const projectY = (latitude: number) => {
    const radians =
      (Math.max(-limit, Math.min(limit, latitude)) * Math.PI) / 180;
    return (1 - Math.log(Math.tan(Math.PI / 4 + radians / 2)) / Math.PI) / 2;
  };
  const xs = positions
    .map((position) => ((position.lng + 180) / 360) % 1)
    .sort((a, b) => a - b);
  const ys = positions.map((position) => projectY(position.lat));
  let largestGap = -1;
  let start = xs[0];
  for (let i = 0; i < xs.length; i++) {
    const next = xs[(i + 1) % xs.length] + (i === xs.length - 1 ? 1 : 0);
    const gap = next - xs[i];
    if (gap > largestGap) {
      largestGap = gap;
      start = next % 1;
    }
  }
  const spanX = 1 - largestGap;
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerY = (minY + maxY) / 2;
  const center = {
    lng: ((start + spanX / 2) % 1) * 360 - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - 2 * centerY))) * 180) / Math.PI,
  };
  if (spanX < 1e-10 && maxY - minY < 1e-10) {
    return { center, zoom: 10 };
  }
  const width = Math.max(1, viewport.width - padding * 2);
  const height = Math.max(1, viewport.height - padding * 2);
  const zoom = Math.floor(
    Math.log2(
      Math.min(
        width / (256 * Math.max(spanX, 1e-10)),
        height / (256 * Math.max(maxY - minY, 1e-10)),
      ),
    ),
  );
  return { center, zoom: Math.max(0, Math.min(12, zoom)) };
}
