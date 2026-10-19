import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGE_SOURCE_CHARS,
  ProductImageError,
  defaultProductCrop,
  canCropProductImage,
  productImageCropSource,
  extractProductRasterContainer,
  encodeProductRasterCrop,
  fitProductRaster,
  getProductCropGeometry,
  hasProductRasterSignature,
  isEditableProductRaster,
  prepareProductImage,
  productImageDisplaySource,
  reorderProductImages,
  validateProductImageFile,
  validateProductRasterDimensions,
} from "../src/lib/product-images.ts";

const hasCode = (code) => (cause) =>
  cause instanceof ProductImageError && cause.code === code;
const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

test("registry-portable cropping extracts one bounded raster and never SVG or external references", () => {
  const source = "data:image/webp;base64,AAAA";
  assert.equal(
    extractProductRasterContainer(`<svg><image href="${source}" /></svg>`),
    source,
  );
  for (const svg of [
    '<svg><image href="https://example.com/image.webp" /></svg>',
    '<svg><image href="data:image/svg+xml;base64,AAAA" /></svg>',
    `<svg><image href="${source}" /><image href="${source}" /></svg>`,
    "<svg><path /></svg>",
  ])
    assert.throws(
      () => extractProductRasterContainer(svg),
      hasCode("unsafe-source"),
    );
});

test("built-in product wrappers crop their exact WebP companion with the host mount point", () => {
  const source = "/assets/products/forma-desk-lamp.svg";
  assert.equal(canCropProductImage(source), true);
  assert.equal(
    productImageCropSource(source, (path) => `/aureform-ui${path}`),
    "/aureform-ui/assets/products/forma-desk-lamp.webp",
  );
  const raster = "data:image/webp;base64,AAAA";
  assert.equal(
    productImageCropSource(raster, () => "unused"),
    raster,
  );
});

test("crop source selection never admits arbitrary SVG, paths or remote images", () => {
  for (const source of [
    "https://example.com/product.webp",
    "/assets/products/unknown.svg",
    "/assets/products/forma-desk-lamp.svg?token=demo",
    "/assets/products/../forma-desk-lamp.webp",
    "data:image/svg+xml;base64,AAAA",
  ]) {
    assert.equal(canCropProductImage(source), false);
    assert.throws(
      () => productImageCropSource(source, (path) => path),
      hasCode("unsafe-source"),
    );
  }
});

test("upload admission rejects unsupported MIME, empty files and oversized rasters", () => {
  for (const type of [
    "image/svg+xml",
    "image/gif",
    "text/xml",
    "application/octet-stream",
    "",
  ]) {
    assert.throws(
      () => validateProductImageFile({ type, size: 100 }),
      hasCode("unsupported"),
    );
  }
  for (const size of [0, -1, NaN, Infinity]) {
    assert.throws(
      () => validateProductImageFile({ type: "image/png", size }),
      hasCode("empty"),
    );
  }
  for (const type of ["image/png", "image/jpeg", "image/webp"]) {
    validateProductImageFile({ type, size: MAX_PRODUCT_IMAGE_BYTES });
    assert.throws(
      () =>
        validateProductImageFile({ type, size: MAX_PRODUCT_IMAGE_BYTES + 1 }),
      hasCode("too-large"),
    );
  }
});

test("container checks reject SVG disguised as PNG and MIME mismatches", () => {
  assert.equal(hasProductRasterSignature(pngHeader, "image/png"), true);
  assert.equal(hasProductRasterSignature(pngHeader, "image/jpeg"), false);
  assert.equal(
    hasProductRasterSignature(
      new TextEncoder().encode("<svg></svg>"),
      "image/png",
    ),
    false,
  );
  assert.equal(
    hasProductRasterSignature(
      new Uint8Array([255, 216, 255, 224]),
      "image/jpeg",
    ),
    true,
  );
  assert.equal(
    hasProductRasterSignature(
      new TextEncoder().encode("RIFF1234WEBP"),
      "image/webp",
    ),
    true,
  );
  assert.equal(
    hasProductRasterSignature(
      new TextEncoder().encode("RIFF1234WAVE"),
      "image/webp",
    ),
    false,
  );
  assert.equal(hasProductRasterSignature(new Uint8Array(), "image/png"), false);
  assert.equal(
    hasProductRasterSignature(new Uint8Array([255, 216]), "image/jpeg"),
    false,
  );
});

test("decode bounds cap both image edges and the total decoded pixel budget", () => {
  validateProductRasterDimensions(1, 1);
  validateProductRasterDimensions(8192, 1);
  validateProductRasterDimensions(6000, 4000);
  for (const [width, height] of [
    [8193, 1],
    [1, 8193],
    [5000, 5000],
    [0, 10],
    [10, -1],
    [NaN, 1],
    [1.5, 2],
  ]) {
    assert.throws(
      () => validateProductRasterDimensions(width, height),
      hasCode("dimensions"),
    );
  }
});

test("normalization never enlarges a source or exceeds the 900px output bound", () => {
  assert.deepEqual(fitProductRaster(2400, 1200), { width: 900, height: 450 });
  assert.deepEqual(fitProductRaster(1200, 2400), { width: 450, height: 900 });
  assert.deepEqual(fitProductRaster(64, 32), { width: 64, height: 32 });
  assert.deepEqual(fitProductRaster(1, 8192), { width: 1, height: 900 });
  assert.deepEqual(fitProductRaster(2400, 1200, 3000), {
    width: 900,
    height: 450,
  });
  assert.throws(() => fitProductRaster(0, 1), hasCode("dimensions"));
  assert.throws(() => fitProductRaster(10, 10, NaN), hasCode("dimensions"));
});

test("crop frames stay inside the rotated image at every aspect, zoom and pan limit", () => {
  for (const [sourceWidth, sourceHeight] of [
    [1600, 1200],
    [1200, 1600],
    [1, 8192],
    [8192, 1],
    [640, 640],
  ]) {
    for (const rotation of [0, 90, 180, 270]) {
      for (const aspect of ["original", "square", "portrait", "landscape"]) {
        for (const zoom of [1, 1.8, 3]) {
          for (const offsetX of [-1, 0, 1]) {
            for (const offsetY of [-1, 0, 1]) {
              const result = getProductCropGeometry(sourceWidth, sourceHeight, {
                rotation,
                aspect,
                zoom,
                offsetX,
                offsetY,
              });
              const sideways = rotation === 90 || rotation === 270;
              const rotatedWidth = sideways ? sourceHeight : sourceWidth;
              const rotatedHeight = sideways ? sourceWidth : sourceHeight;
              const expectedRatio =
                aspect === "square"
                  ? 1
                  : aspect === "portrait"
                    ? 0.8
                    : aspect === "landscape"
                      ? 4 / 3
                      : rotatedWidth / rotatedHeight;
              assert.ok(result.x >= -1e-8 && result.y >= -1e-8);
              assert.ok(result.x + result.cropWidth <= rotatedWidth + 1e-8);
              assert.ok(result.y + result.cropHeight <= rotatedHeight + 1e-8);
              assert.ok(
                Math.abs(result.cropWidth / result.cropHeight - expectedRatio) <
                  1e-8,
              );
              assert.ok(result.width >= 1 && result.height >= 1);
              assert.ok(result.width <= 900 && result.height <= 900);
            }
          }
        }
      }
    }
  }
  const portrait = getProductCropGeometry(1600, 1200, {
    ...defaultProductCrop,
    rotation: 90,
    aspect: "portrait",
  });
  assert.equal(portrait.x, 0);
  assert.equal(portrait.y, 50);
  assert.deepEqual(
    { width: portrait.width, height: portrait.height },
    { width: 720, height: 900 },
  );
});

test("nonfinite and out-of-range framing cannot escape the source bounds", () => {
  const result = getProductCropGeometry(1600, 1200, {
    aspect: "square",
    rotation: 45,
    zoom: Infinity,
    offsetX: NaN,
    offsetY: 1000,
  });
  assert.equal(result.rotation, 0);
  assert.equal(result.x, 200);
  assert.equal(result.y, 0);
  assert.equal(result.cropWidth, 1200);
  const zoomed = getProductCropGeometry(1600, 1200, {
    ...defaultProductCrop,
    aspect: "square",
    zoom: 100,
    offsetX: 100,
    offsetY: -100,
  });
  assert.equal(zoomed.cropWidth, 400);
  assert.equal(zoomed.x, 1200);
  assert.equal(zoomed.y, 0);
});

test("only bounded raster data URLs can enter the crop canvas", () => {
  const valid = "data:image/png;base64,iVBORw0KGgo=";
  assert.equal(isEditableProductRaster(valid), true);
  for (const src of [
    "/assets/products/lamp.svg",
    "/assets/photo.png",
    "https://example.com/photo.png",
    "blob:remote",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/gif;base64,R0lG",
    "data:image/png;base64,a===",
    "data:image/png;base64,",
    "data:image/png;base64, YQ==",
    "javascript:alert(1)",
  ])
    assert.equal(isEditableProductRaster(src), false, src);
  assert.equal(
    isEditableProductRaster(
      `data:image/webp;base64,${"A".repeat(MAX_PRODUCT_IMAGE_SOURCE_CHARS)}`,
    ),
    false,
  );
});

test("display rendering prefixes public assets and leaves HTTPS/data sources unchanged", () => {
  const calls = [];
  const assetPath = (path) => {
    calls.push(path);
    return `/aureform${path}`;
  };
  assert.equal(
    productImageDisplaySource("/assets/products/lamp.svg", assetPath),
    "/aureform/assets/products/lamp.svg",
  );
  for (const src of [
    "https://example.com/photo.png",
    "data:image/png;base64,YQ==",
    "/already-mounted/photo.png",
  ]) {
    assert.equal(productImageDisplaySource(src, assetPath), src);
  }
  assert.deepEqual(calls, ["/assets/products/lamp.svg"]);
});

test("primary/reorder operations preserve IDs, image metadata and the input array", () => {
  const images = ["a", "b", "c"].map((id) =>
    Object.freeze({
      id,
      src: `data:image/png;base64,${id}A==`,
      alt: `Image ${id}`,
      width: 100,
      height: 80,
    }),
  );
  Object.freeze(images);
  const primary = reorderProductImages(images, "c", 0);
  assert.deepEqual(
    primary.map((image) => image.id),
    ["c", "a", "b"],
  );
  assert.strictEqual(primary[0], images[2]);
  assert.deepEqual(
    images.map((image) => image.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(reorderProductImages(primary, "c", 2), images);
  for (const destination of [-1, 3, NaN, 0.5]) {
    assert.deepEqual(reorderProductImages(images, "a", destination), images);
  }
  assert.deepEqual(reorderProductImages(images, "missing", 0), images);
});

function temporaryGlobal(t, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  });
}

test("blob URLs are revoked on corrupt decode, excessive decoded size and cancellation", async (t) => {
  const revoked = [];
  let behavior = "corrupt";
  let abortController;
  temporaryGlobal(
    t,
    "Image",
    class {
      naturalWidth = 5000;
      naturalHeight = 5000;
      set src(value) {
        if (!value) return;
        queueMicrotask(() => {
          if (behavior === "abort") abortController.abort();
          else if (behavior === "oversize") this.onload?.();
          else this.onerror?.();
        });
      }
    },
  );
  t.mock.method(URL, "createObjectURL", () => `blob:test-${behavior}`);
  t.mock.method(URL, "revokeObjectURL", (url) => revoked.push(url));
  const file = new File([pngHeader], "photo.png", { type: "image/png" });
  await assert.rejects(prepareProductImage(file), hasCode("decode"));
  behavior = "oversize";
  await assert.rejects(prepareProductImage(file), hasCode("dimensions"));
  behavior = "abort";
  abortController = new AbortController();
  await assert.rejects(
    prepareProductImage(file, abortController.signal),
    hasCode("aborted"),
  );
  assert.deepEqual(revoked, [
    "blob:test-corrupt",
    "blob:test-oversize",
    "blob:test-abort",
  ]);
});

test("SVG spoofing is rejected before any object URL or decoder is created", async (t) => {
  let created = false;
  t.mock.method(URL, "createObjectURL", () => {
    created = true;
    return "blob:unexpected";
  });
  const file = new File(["<svg></svg>"], "fake.png", { type: "image/png" });
  await assert.rejects(prepareProductImage(file), hasCode("signature"));
  assert.equal(created, false);
});

test("export bounds hold with a PNG fallback that ignores requested WebP quality", (t) => {
  const outputSizes = [];
  const context = {
    save() {},
    restore() {},
    scale() {},
    translate() {},
    rotate() {},
    drawImage() {},
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL() {
      outputSizes.push([this.width, this.height]);
      return `data:image/png;base64,${"A".repeat(this.width * this.height * 2)}`;
    },
  };
  temporaryGlobal(t, "document", { createElement: () => canvas });
  const result = encodeProductRasterCrop({
    naturalWidth: 2400,
    naturalHeight: 1800,
  });
  assert.ok(result.width <= 900 && result.height <= 900);
  assert.ok(result.src.length <= 220_000);
  assert.ok(result.src.length <= MAX_PRODUCT_IMAGE_SOURCE_CHARS);
  assert.ok(isEditableProductRaster(result.src));
  assert.ok(
    outputSizes.length > 1,
    "The fallback must be downsampled when quality has no effect.",
  );
  assert.ok(
    outputSizes.every(([width, height]) => width <= 900 && height <= 900),
  );
  assert.equal(canvas.width, 0, "The backing store must be released.");
  assert.equal(canvas.height, 0);
});
