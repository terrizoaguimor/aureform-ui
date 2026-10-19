import { publicPath } from "@/lib/public-path";

export type GeneratedImageDownload = {
  src: string;
  filename: string;
  expectedBytes?: number;
};

/**
 * Read the raster from its self-contained, UTF-8 SVG container. Source installs
 * only need that SVG; a binary WebP sibling is not required in the registry.
 */
export async function generatedImageBlob(
  src: string,
  expectedBytes?: number,
): Promise<Blob> {
  const response = await fetch(publicPath(src));
  if (!response.ok) throw new Error("Generated image container unavailable");
  const svg = new DOMParser().parseFromString(
    await response.text(),
    "image/svg+xml",
  );
  if (
    svg.querySelector("parsererror") ||
    svg.documentElement.localName !== "svg" ||
    svg.documentElement.namespaceURI !== "http://www.w3.org/2000/svg"
  ) {
    throw new Error("Invalid generated image container");
  }
  const images = svg.getElementsByTagNameNS(
    "http://www.w3.org/2000/svg",
    "image",
  );
  if (images.length !== 1) throw new Error("Expected one embedded image");
  const href =
    images[0].getAttribute("href") ??
    images[0].getAttributeNS("http://www.w3.org/1999/xlink", "href");
  const match = href?.match(/^data:image\/webp;base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw new Error("Expected an embedded WebP image");
  const encoded = match[1].replace(/\s/g, "");
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("Invalid embedded image encoding");
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (
    binary.length < 12 ||
    binary.slice(0, 4) !== "RIFF" ||
    binary.slice(8, 12) !== "WEBP" ||
    (expectedBytes !== undefined && bytes.byteLength !== expectedBytes)
  ) {
    throw new Error("Embedded image does not match its WebP metadata");
  }
  return new Blob([bytes], { type: "image/webp" });
}

export async function downloadGeneratedImage({
  src,
  filename,
  expectedBytes,
}: GeneratedImageDownload): Promise<{
  name: string;
  type: string;
  size: number;
}> {
  if (!filename.endsWith(".webp") || /[/\\]/.test(filename)) {
    throw new Error("Expected a WebP filename");
  }
  const blob = await generatedImageBlob(src, expectedBytes);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  try {
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { name: filename, type: blob.type, size: blob.size };
}
