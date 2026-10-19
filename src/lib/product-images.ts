import type { ProductImage } from "@/lib/commerce";

export const MAX_PRODUCT_IMAGES = 6;
export const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_EDGE = 900;
export const MAX_PRODUCT_IMAGE_SOURCE_CHARS = 1_000_000;
export const PRODUCT_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const TARGET_SOURCE_CHARS = 220_000;
const MAX_DECODED_EDGE = 8192;
const MAX_DECODED_PIXELS = 24_000_000;

export type ProductImageErrorCode =
  | "unsupported"
  | "empty"
  | "too-large"
  | "signature"
  | "dimensions"
  | "decode"
  | "encode"
  | "unsafe-source"
  | "aborted";

export class ProductImageError extends Error {
  readonly code: ProductImageErrorCode;

  constructor(code: ProductImageErrorCode) {
    super(code);
    this.name = "ProductImageError";
    this.code = code;
  }
}

export type ProductCropAspect =
  "original" | "square" | "portrait" | "landscape";
export type ProductCropSettings = {
  aspect: ProductCropAspect;
  zoom: number;
  rotation: 0 | 90 | 180 | 270;
  offsetX: number;
  offsetY: number;
};

export const defaultProductCrop: ProductCropSettings = {
  aspect: "original",
  zoom: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
};

export function validateProductImageFile(file: Pick<File, "size" | "type">) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new ProductImageError("unsupported");
  if (!Number.isFinite(file.size) || file.size <= 0)
    throw new ProductImageError("empty");
  if (file.size > MAX_PRODUCT_IMAGE_BYTES)
    throw new ProductImageError("too-large");
}

/** Check the actual container as well as the browser-supplied MIME type. */
export function hasProductRasterSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") {
    return [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => bytes[index] === byte,
    );
  }
  if (mime === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/webp") {
    return (
      bytes.length >= 12 &&
      [82, 73, 70, 70].every((byte, index) => bytes[index] === byte) &&
      [87, 69, 66, 80].every((byte, index) => bytes[index + 8] === byte)
    );
  }
  return false;
}

export function validateProductRasterDimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_DECODED_EDGE ||
    height > MAX_DECODED_EDGE ||
    width * height > MAX_DECODED_PIXELS
  ) {
    throw new ProductImageError("dimensions");
  }
}

export function fitProductRaster(
  width: number,
  height: number,
  maxEdge = MAX_PRODUCT_IMAGE_EDGE,
) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(maxEdge) ||
    maxEdge < 1
  ) {
    throw new ProductImageError("dimensions");
  }
  const edge = Math.min(MAX_PRODUCT_IMAGE_EDGE, Math.floor(maxEdge));
  const scale = Math.min(1, edge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** Coordinates are in the rotated source, before output downsampling. */
export function getProductCropGeometry(
  width: number,
  height: number,
  settings: ProductCropSettings,
  maxEdge = MAX_PRODUCT_IMAGE_EDGE,
) {
  validateProductRasterDimensions(width, height);
  const rotation = [0, 90, 180, 270].includes(settings.rotation)
    ? settings.rotation
    : 0;
  const sideways = rotation === 90 || rotation === 270;
  const rotatedWidth = sideways ? height : width;
  const rotatedHeight = sideways ? width : height;
  const ratio =
    settings.aspect === "square"
      ? 1
      : settings.aspect === "portrait"
        ? 4 / 5
        : settings.aspect === "landscape"
          ? 4 / 3
          : rotatedWidth / rotatedHeight;
  const zoom = clamp(settings.zoom, 1, 3, 1);
  const cropWidth = Math.min(rotatedWidth, rotatedHeight * ratio) / zoom;
  const cropHeight = Math.min(rotatedHeight, rotatedWidth / ratio) / zoom;
  const x =
    ((rotatedWidth - cropWidth) * (clamp(settings.offsetX, -1, 1, 0) + 1)) / 2;
  const y =
    ((rotatedHeight - cropHeight) * (clamp(settings.offsetY, -1, 1, 0) + 1)) /
    2;
  return {
    rotation,
    rotatedWidth,
    rotatedHeight,
    x,
    y,
    cropWidth,
    cropHeight,
    ...fitProductRaster(cropWidth, cropHeight, maxEdge),
  };
}

/** Only prepared local rasters enter a canvas; remote and SVG sources never do. */
export function isEditableProductRaster(src: string) {
  return (
    src.length <= MAX_PRODUCT_IMAGE_SOURCE_CHARS &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src)
  );
}

const builtInCropSources: Readonly<Record<string, string>> = Object.fromEntries(
  [
    "forma-desk-lamp",
    "arc-lounge-chair",
    "linea-notebook",
    "studio-tote",
    "morrow-ceramic-cup",
    "silhouette-vase",
    "fold-side-table",
    "essential-wall-print",
  ].flatMap((slug) => [
    [`/assets/products/${slug}.svg`, `/assets/products/${slug}.webp`],
    [`/assets/products/${slug}.webp`, `/assets/products/${slug}.webp`],
  ]),
);

/** Known demo wrappers crop their original local WebP, never the SVG itself. */
export function canCropProductImage(src: string) {
  return isEditableProductRaster(src) || Object.hasOwn(builtInCropSources, src);
}

export function productImageCropSource(
  src: string,
  assetPath: (path: string) => string,
) {
  if (isEditableProductRaster(src)) return src;
  if (Object.hasOwn(builtInCropSources, src)) {
    return assetPath(builtInCropSources[src]);
  }
  throw new ProductImageError("unsafe-source");
}

/** Read only the embedded raster; arbitrary SVG geometry is never decoded. */
export function extractProductRasterContainer(svg: string) {
  if (svg.length > MAX_PRODUCT_IMAGE_SOURCE_CHARS + 16_384) {
    throw new ProductImageError("too-large");
  }
  const images = [
    ...svg.matchAll(
      /<image\b[^>]*?\s(?:href|xlink:href)=["'](data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2})["'][^>]*>/g,
    ),
  ];
  if (images.length !== 1 || !isEditableProductRaster(images[0][1])) {
    throw new ProductImageError("unsafe-source");
  }
  return images[0][1];
}

export function productImageDisplaySource(
  src: string,
  assetPath: (path: string) => string,
) {
  return src.startsWith("/assets/") ? assetPath(src) : src;
}

export function reorderProductImages(
  images: readonly ProductImage[],
  id: string,
  destination: number,
): ProductImage[] {
  const result = [...images];
  const from = result.findIndex((image) => image.id === id);
  if (
    from < 0 ||
    !Number.isInteger(destination) ||
    destination < 0 ||
    destination >= result.length
  )
    return result;
  const [image] = result.splice(from, 1);
  result.splice(destination, 0, image);
  return result;
}

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ProductImageError("aborted");
}

function loadLocalRaster(src: string, signal?: AbortSignal) {
  checkAborted(signal);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", abort);
    };
    const fail = (error: ProductImageError) => {
      if (settled) return;
      settled = true;
      cleanup();
      image.src = "";
      reject(error);
    };
    const abort = () => fail(new ProductImageError("aborted"));
    const timeout = setTimeout(
      () => fail(new ProductImageError("decode")),
      15_000,
    );
    image.onload = () => {
      if (settled) return;
      try {
        validateProductRasterDimensions(
          image.naturalWidth,
          image.naturalHeight,
        );
        checkAborted(signal);
        settled = true;
        cleanup();
        resolve(image);
      } catch (cause) {
        fail(
          cause instanceof ProductImageError
            ? cause
            : new ProductImageError("decode"),
        );
      }
    };
    image.onerror = () => fail(new ProductImageError("decode"));
    image.decoding = "async";
    signal?.addEventListener("abort", abort, { once: true });
    image.src = src;
  });
}

export function decodeProductRaster(
  src: string,
  signal?: AbortSignal,
  assetPath: (path: string) => string = (path) => path,
) {
  // Text registry installs carry the embedded WebP inside the known SVG.
  // Extract it directly so cropping needs no unshipped binary companion.
  if (Object.hasOwn(builtInCropSources, src) && src.endsWith(".svg")) {
    return (async () => {
      checkAborted(signal);
      let response: Response;
      try {
        response = await fetch(assetPath(src), {
          signal,
          credentials: "same-origin",
          mode: "same-origin",
          redirect: "error",
          cache: "force-cache",
        });
      } catch {
        checkAborted(signal);
        throw new ProductImageError("decode");
      }
      if (!response.ok) throw new ProductImageError("decode");
      const source = extractProductRasterContainer(await response.text());
      checkAborted(signal);
      return loadLocalRaster(source, signal);
    })();
  }
  return loadLocalRaster(productImageCropSource(src, assetPath), signal);
}

export function drawProductRasterCrop(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  settings: ProductCropSettings,
  maxEdge = MAX_PRODUCT_IMAGE_EDGE,
) {
  const geometry = getProductCropGeometry(
    image.naturalWidth,
    image.naturalHeight,
    settings,
    maxEdge,
  );
  canvas.width = geometry.width;
  canvas.height = geometry.height;
  const context = canvas.getContext("2d");
  if (!context) throw new ProductImageError("encode");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.save();
  context.scale(
    geometry.width / geometry.cropWidth,
    geometry.height / geometry.cropHeight,
  );
  context.translate(-geometry.x, -geometry.y);
  context.translate(geometry.rotatedWidth / 2, geometry.rotatedHeight / 2);
  context.rotate((geometry.rotation * Math.PI) / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  context.restore();
  return geometry;
}

/** Prefer WebP, with the browser's PNG fallback; reduce size before storing. */
export function encodeProductRasterCrop(
  image: HTMLImageElement,
  settings: ProductCropSettings = defaultProductCrop,
): Pick<ProductImage, "src" | "width" | "height"> {
  const canvas = document.createElement("canvas");
  let smallest: Pick<ProductImage, "src" | "width" | "height"> | undefined;
  try {
    for (let pass = 0; pass < 7; pass++) {
      const edge = Math.max(
        180,
        Math.round(MAX_PRODUCT_IMAGE_EDGE * 0.78 ** pass),
      );
      drawProductRasterCrop(canvas, image, settings, edge);
      for (const quality of [0.82, 0.68, 0.54]) {
        const src = canvas.toDataURL("image/webp", quality);
        if (!isEditableProductRaster(src)) continue;
        const result = { src, width: canvas.width, height: canvas.height };
        if (!smallest || src.length < smallest.src.length) smallest = result;
        if (src.length <= TARGET_SOURCE_CHARS) return result;
      }
    }
    if (smallest) return smallest;
    throw new ProductImageError("encode");
  } catch (cause) {
    throw cause instanceof ProductImageError
      ? cause
      : new ProductImageError("encode");
  } finally {
    // Release the canvas backing store after an export, including on failure.
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function prepareProductImage(
  file: File,
  signal?: AbortSignal,
): Promise<Pick<ProductImage, "src" | "width" | "height">> {
  checkAborted(signal);
  validateProductImageFile(file);
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  checkAborted(signal);
  if (!hasProductRasterSignature(signature, file.type))
    throw new ProductImageError("signature");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadLocalRaster(url, signal);
    checkAborted(signal);
    return encodeProductRasterCrop(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}
