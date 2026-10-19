import { editorialAssets } from "@/demo/editorial-assets";

export type VisualRequest = {
  kind: "images" | "video";
  prompt: string;
  ratio: string;
  style: string;
  count: number;
  strength: number;
  signal: AbortSignal;
  fail?: boolean;
  delay?: number;
};
export const originalArtNames = editorialAssets.map((asset) => asset.id);

export type PreparedDemoVisual = {
  src: string;
  prompt: string;
  kind: "images" | "video";
  ratio: string;
  source: "prepared-local";
  assetId?: string;
  width?: number;
  height?: number;
};

/** Select existing GPT Image 2.5 collection assets; preserve the saved brief. */
export async function prepareDemoVisuals(
  request: VisualRequest,
): Promise<PreparedDemoVisual[]> {
  const { signal, delay = 1100 } = request;
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, delay);
    signal.addEventListener("abort", cancel, { once: true });
  });
  if (request.fail) throw new Error("Simulated local preview failure.");
  const hash =
    [...(request.prompt + request.style)].reduce(
      (sum, char) => sum + char.charCodeAt(0),
      0,
    ) + request.strength;
  return Array.from(
    {
      length:
        request.kind === "video"
          ? 1
          : Math.max(1, Math.min(4, Math.round(request.count))),
    },
    (_, index): PreparedDemoVisual => {
      const asset =
        editorialAssets[
          (Math.abs(Math.trunc(hash) || 0) + index) % editorialAssets.length
        ];
      return {
        src:
          request.kind === "video" ? "/assets/aureform-motion.webm" : asset.src,
        prompt: request.prompt.trim(),
        kind: request.kind,
        ratio: request.ratio,
        source: "prepared-local",
        ...(request.kind === "images"
          ? { assetId: asset.id, width: asset.width, height: asset.height }
          : {}),
      };
    },
  );
}
