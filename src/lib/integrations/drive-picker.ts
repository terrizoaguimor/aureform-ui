import { z } from "zod";
import {
  IntegrationError,
  type IntegrationConnection,
  type IntegrationScope,
} from "./contracts";
import { withIntegrationCancellation } from "./cancelled-task";

/** Selected metadata only. OAuth tokens and file contents never enter this DTO. */
export type DrivePickedFile = {
  id: string;
  name: string;
  mimeType: string;
};
export type DrivePickerSelection =
  { kind: "cancelled" } | { kind: "selected"; files: DrivePickedFile[] };
export type DrivePickerBinding = {
  select(input: {
    connection: IntegrationConnection;
    scope: IntegrationScope;
  }): Promise<DrivePickerSelection>;
  /** The backend verifies file access, tenant, revision and the limited-file grant. */
  register(input: {
    connection: IntegrationConnection;
    files: DrivePickedFile[];
    idempotencyKey: string;
    scope: IntegrationScope;
  }): Promise<IntegrationConnection>;
};

const selectedFiles = z
  .array(
    z.object({
      id: z
        .string()
        .min(1)
        .max(200)
        .refine((value) => !/[\u0000-\u001f]/.test(value)),
      name: z.string().min(1).max(300),
      mimeType: z.string().min(1).max(200),
    }),
  )
  .min(1)
  .max(100)
  .refine(
    (files) => new Set(files.map((file) => file.id)).size === files.length,
  );
export function parseDrivePickedFiles(input: unknown): DrivePickedFile[] {
  const result = selectedFiles.safeParse(input);
  if (!result.success) throw new IntegrationError("provider-error");
  return result.data;
}

type Picker = { setVisible(visible: boolean): void; dispose(): void };
type PickerPayload = { action?: string; docs?: unknown[] };
type PickerBuilder = {
  addView(view: unknown): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(appId: string): PickerBuilder;
  setOrigin(origin: string): PickerBuilder;
  setLocale(locale: string): PickerBuilder;
  enableFeature(feature: unknown): PickerBuilder;
  setCallback(callback: (payload: PickerPayload) => void): PickerBuilder;
  build(): Picker;
};
type PickerLibrary = {
  PickerBuilder: new () => PickerBuilder;
  DocsView: new () => {
    setIncludeFolders(include: boolean): unknown;
    setMimeTypes(types: string): unknown;
  };
  Feature: { MULTISELECT_ENABLED: unknown };
};
type GooglePickerWindow = Window & {
  gapi?: {
    load(
      name: string,
      options: {
        callback(): void;
        onerror(): void;
        timeout: number;
        ontimeout(): void;
      },
    ): void;
  };
  google?: { picker?: PickerLibrary };
};
let libraryPromise: Promise<PickerLibrary> | undefined;

/** Opt-in browser loader. Importing the module does not load Google or request a token. */
function loadPicker(
  nonce?: string,
  timeoutMs = 15_000,
): Promise<PickerLibrary> {
  if (typeof window === "undefined")
    return Promise.reject(new IntegrationError("configuration-required"));
  const browser = window as GooglePickerWindow;
  if (browser.google?.picker) return Promise.resolve(browser.google.picker);
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise<PickerLibrary>((resolve, reject) => {
    let script: HTMLScriptElement | undefined;
    let settled = false;
    const timer = window.setTimeout(fail, timeoutMs);
    function fail() {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script?.remove();
      reject(new IntegrationError("offline"));
    }
    function loaded() {
      if (settled) return;
      const gapi = browser.gapi;
      if (!gapi) return fail();
      try {
        gapi.load("picker", {
          callback() {
            if (settled) return;
            const picker = browser.google?.picker;
            if (!picker) return fail();
            settled = true;
            window.clearTimeout(timer);
            resolve(picker);
          },
          onerror: fail,
          timeout: timeoutMs,
          ontimeout: fail,
        });
      } catch {
        fail();
      }
    }
    if (browser.gapi) loaded();
    else {
      script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      if (nonce) script.nonce = nonce;
      script.onload = loaded;
      script.onerror = fail;
      document.head.append(script);
    }
  }).catch((error) => {
    libraryPromise = undefined;
    throw error;
  });
  return libraryPromise;
}

export type GoogleDrivePickerOptions = {
  /** Origin/API-restricted public browser key and Google Cloud project number. */
  developerKey: string;
  appId: string;
  /** Consumer OAuth flow provides a short-lived drive.file token in memory. */
  getAccessToken(input: {
    connection: IntegrationConnection;
    scope: IntegrationScope;
  }): Promise<string>;
  registerFiles: DrivePickerBinding["register"];
  mimeTypes?: readonly string[];
  locale?: string;
  nonce?: string;
  timeoutMs?: number;
};

/** Google Picker is browser-only; googleapis is a separate server-side API library. */
export function createGoogleDrivePickerBinding(
  options: GoogleDrivePickerOptions,
): DrivePickerBinding {
  return {
    register: options.registerFiles,
    async select(input) {
      if (input.scope.signal?.aborted) throw new IntegrationError("cancelled");
      if (!options.developerKey.trim() || !/^\d+$/.test(options.appId))
        throw new IntegrationError("configuration-required");
      const library = await withIntegrationCancellation(
        () => loadPicker(options.nonce, options.timeoutMs),
        input.scope,
      );
      if (input.scope.signal?.aborted) throw new IntegrationError("cancelled");
      const accessToken = await withIntegrationCancellation(
        () => options.getAccessToken(input),
        input.scope,
      );
      if (input.scope.signal?.aborted) throw new IntegrationError("cancelled");
      if (!accessToken || typeof accessToken !== "string")
        throw new IntegrationError("configuration-required");
      return new Promise<DrivePickerSelection>((resolve, reject) => {
        let picker: Picker | undefined;
        let done = false;
        const finish = (result?: DrivePickerSelection, cause?: unknown) => {
          if (done) return;
          done = true;
          input.scope.signal?.removeEventListener("abort", abort);
          try {
            picker?.setVisible(false);
            picker?.dispose();
          } catch {
            /* Already detached. */
          }
          if (cause) reject(cause);
          else resolve(result ?? { kind: "cancelled" });
        };
        const abort = () =>
          finish(undefined, new IntegrationError("cancelled"));
        input.scope.signal?.addEventListener("abort", abort, { once: true });
        try {
          const view = new library.DocsView();
          view.setIncludeFolders(false);
          if (options.mimeTypes?.length)
            view.setMimeTypes(options.mimeTypes.join(","));
          picker = new library.PickerBuilder()
            .addView(view)
            .setAppId(options.appId)
            .setDeveloperKey(options.developerKey)
            .setOAuthToken(accessToken)
            .setOrigin(window.location.origin)
            .setLocale(options.locale ?? "en")
            .enableFeature(library.Feature.MULTISELECT_ENABLED)
            .setCallback((payload) => {
              if (payload.action === "cancel") finish({ kind: "cancelled" });
              if (payload.action !== "picked") return;
              try {
                const files = parseDrivePickedFiles(
                  (payload.docs ?? []).map((entry) => {
                    if (!entry || typeof entry !== "object") return entry;
                    const file = entry as Record<string, unknown>;
                    return {
                      id: file.id,
                      name: file.name,
                      mimeType: file.mimeType,
                    };
                  }),
                );
                finish({ kind: "selected", files });
              } catch (cause) {
                finish(undefined, cause);
              }
            })
            .build();
          if (input.scope.signal?.aborted) abort();
          else picker.setVisible(true);
        } catch {
          finish(undefined, new IntegrationError("provider-error"));
        }
      });
    },
  };
}
