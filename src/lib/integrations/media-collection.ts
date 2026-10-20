import { z } from "zod";
import { productImageSchema, type ProductImage } from "../commerce";
import {
  IntegrationError,
  type IntegrationConnection,
  type IntegrationScope,
} from "./contracts";
import { isPresentationUrl, validateIntegrationScope } from "./validation";
import { publicPath } from "../public-path";
import { withIntegrationCancellation } from "./cancelled-task";

/** Public product/brand imagery. Private file attachments use IntegrationsAdapter.upload. */
export type IntegrationMediaCollection = {
  id: string;
  name: string;
  revision: number;
  images: ProductImage[];
};
export type MediaCollectionBinding = {
  load(input: {
    connection: IntegrationConnection;
    scope: IntegrationScope;
  }): Promise<IntegrationMediaCollection>;
  save(input: {
    connection: IntegrationConnection;
    collection: IntegrationMediaCollection;
    idempotencyKey: string;
    scope: IntegrationScope;
  }): Promise<IntegrationMediaCollection>;
};
const collectionSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(300),
  revision: z.number().int().nonnegative(),
  images: z
    .array(productImageSchema)
    .max(6)
    .refine(
      (images) =>
        new Set(images.map((image) => image.id)).size === images.length,
    ),
});
export function parseMediaCollection(
  input: unknown,
  publicOnly = false,
): IntegrationMediaCollection {
  const parsed = collectionSchema.safeParse(input);
  if (
    !parsed.success ||
    parsed.data.images.some(
      (image) =>
        (!image.src.startsWith("data:image/") &&
          !isPresentationUrl(image.src)) ||
        (publicOnly && !isPresentationUrl(image.src)),
    )
  )
    throw new IntegrationError("provider-error");
  return parsed.data;
}

export function createDemoMediaCollectionBinding(): MediaCollectionBinding {
  const collections = new Map<string, IntegrationMediaCollection>();
  const clone = <T>(value: T): T => structuredClone(value);
  function current(connection: IntegrationConnection, scope: IntegrationScope) {
    validateIntegrationScope(scope);
    if (
      connection.workspaceId !== scope.workspaceId ||
      connection.status !== "connected"
    )
      throw new IntegrationError("configuration-required");
    if (!connection.grantedPermissions.includes("assets.read"))
      throw new IntegrationError("permission-denied");
    const key = `${scope.workspaceId}:${connection.id}`;
    let collection = collections.get(key);
    if (!collection) {
      collection = {
        id: `media:${connection.id}`,
        name: "Brand photography",
        revision: 1,
        images: [
          {
            id: "media-lamp",
            src: "/assets/products/forma-desk-lamp.svg",
            alt: "Forma desk lamp on a warm studio backdrop",
            width: 900,
            height: 900,
          },
          {
            id: "media-chair",
            src: "/assets/products/arc-lounge-chair.svg",
            alt: "Arc lounge chair in a considered interior",
            width: 900,
            height: 900,
          },
          {
            id: "media-notebook",
            src: "/assets/products/linea-notebook.svg",
            alt: "Linea notebook on a quiet desk",
            width: 900,
            height: 900,
          },
        ],
      };
      collections.set(key, collection);
    }
    return { key, collection };
  }
  const completed = new Map<
    string,
    { signature: string; collection: IntegrationMediaCollection }
  >();
  return {
    async load({ connection, scope }) {
      return clone(current(connection, scope).collection);
    },
    async save({ connection, collection: input, idempotencyKey, scope }) {
      const { key, collection } = current(connection, scope);
      if (
        !connection.grantedPermissions.includes(
          connection.integrationId === "cloudinary"
            ? "assets.transform"
            : "assets.upload",
        )
      )
        throw new IntegrationError("permission-denied");
      const draft = parseMediaCollection(input);
      const signature = JSON.stringify(draft);
      const retry = completed.get(`${key}:${idempotencyKey}`);
      if (retry) {
        if (retry.signature !== signature)
          throw new IntegrationError("conflict");
        return clone(retry.collection);
      }
      if (draft.id !== collection.id || draft.revision !== collection.revision)
        throw new IntegrationError("conflict");
      const result = { ...clone(draft), revision: draft.revision + 1 };
      collections.set(key, result);
      completed.set(`${key}:${idempotencyKey}`, {
        signature,
        collection: clone(result),
      });
      if (completed.size > 100)
        completed.delete(completed.keys().next().value!);
      return clone(result);
    },
  };
}

export type HttpMediaCollectionOptions = {
  /** Same-origin consumer endpoint; no provider credential is accepted here. */
  baseUrl?: string;
  fetcher?: typeof fetch;
  csrfToken?: () => string | undefined;
};
/** Multipart transfers edited raster bytes; responses contain approved public URLs. */
export function createHttpMediaCollectionBinding(
  options: HttpMediaCollectionOptions = {},
): MediaCollectionBinding {
  const base = (
    options.baseUrl ?? publicPath("/api/integrations/media")
  ).replace(/\/+$/, "");
  if (
    !base.startsWith("/") ||
    base.startsWith("//") ||
    /[\u0000-\u0020\u007f\\?#]/.test(base) ||
    base.includes("..") ||
    /%(?:2e|2f|5c|0[0-9a-f]|1[0-9a-f]|20|7f)/i.test(base) ||
    new URL(base, "https://aureform.invalid").origin !==
      "https://aureform.invalid"
  )
    throw new IntegrationError("validation");
  const fetcher = options.fetcher ?? fetch;
  async function request(
    connection: IntegrationConnection,
    scope: IntegrationScope,
    body?: FormData,
    key?: string,
  ) {
    validateIntegrationScope(scope);
    if (
      connection.workspaceId !== scope.workspaceId ||
      connection.status !== "connected"
    )
      throw new IntegrationError("configuration-required");
    const mutationPermission =
      connection.integrationId === "cloudinary"
        ? "assets.transform"
        : "assets.upload";
    if (
      !connection.grantedPermissions.includes(
        body ? mutationPermission : "assets.read",
      )
    )
      throw new IntegrationError("permission-denied");
    const headers = new Headers({
      Accept: "application/json",
      "X-Workspace-Id": scope.workspaceId,
    });
    const csrf = body ? options.csrfToken?.() : undefined;
    if (body && options.csrfToken && (!csrf || !csrf.trim()))
      throw new IntegrationError("configuration-required");
    if (csrf) headers.set("X-CSRF-Token", csrf);
    if (key) headers.set("Idempotency-Key", key);
    let response: Response;
    try {
      response = await withIntegrationCancellation(
        () =>
          fetcher(`${base}/${encodeURIComponent(connection.id)}`, {
            method: body ? "POST" : "GET",
            body,
            headers,
            credentials: "same-origin",
            mode: "same-origin",
            redirect: "error",
            cache: "no-store",
            signal: scope.signal,
          }),
        scope,
      );
    } catch {
      throw new IntegrationError(
        scope.signal?.aborted ? "cancelled" : "offline",
      );
    }
    validateIntegrationScope(scope);
    if (response.redirected || response.type === "opaqueredirect")
      throw new IntegrationError("provider-error");
    if (!response.ok)
      throw new IntegrationError(
        response.status === 409
          ? "conflict"
          : response.status === 403
            ? "permission-denied"
            : response.status === 401
              ? "expired"
              : "provider-error",
      );
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new IntegrationError("provider-error");
    const text = await withIntegrationCancellation(
      () => response.text(),
      scope,
    );
    validateIntegrationScope(scope);
    if (text.length > 2 * 1024 * 1024)
      throw new IntegrationError("provider-error");
    try {
      return parseMediaCollection(JSON.parse(text), true);
    } catch {
      throw new IntegrationError("provider-error");
    }
  }
  return {
    load: ({ connection, scope }) => request(connection, scope),
    save: async ({ connection, collection, idempotencyKey, scope }) => {
      const draft = parseMediaCollection(collection);
      const form = new FormData();
      const images = draft.images.map((image) => {
        const match =
          /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
            image.src,
          );
        if (!match) return image;
        const binary = atob(match[2]);
        const bytes = Uint8Array.from(binary, (character) =>
          character.charCodeAt(0),
        );
        const fileKey = `image-${image.id}`;
        form.append(
          fileKey,
          new Blob([bytes], { type: match[1] }),
          `${image.id.replace(/[^A-Za-z0-9_-]/g, "_")}.${match[1].split("/")[1]}`,
        );
        return {
          id: image.id,
          alt: image.alt,
          width: image.width,
          height: image.height,
          fileKey,
        };
      });
      form.append(
        "metadata",
        JSON.stringify({
          ...draft,
          images,
          connectionRevision: connection.revision,
        }),
      );
      const result = await request(connection, scope, form, idempotencyKey);
      if (result.id !== draft.id) throw new IntegrationError("provider-error");
      if (result.revision < draft.revision)
        throw new IntegrationError("conflict");
      return result;
    },
  };
}
