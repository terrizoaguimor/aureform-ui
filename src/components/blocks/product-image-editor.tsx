"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Crop,
  ImageIcon,
  RotateCcw,
  RotateCw,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ProductImage } from "@/lib/commerce";
import {
  MAX_PRODUCT_IMAGES,
  PRODUCT_IMAGE_ACCEPT,
  ProductImageError,
  decodeProductRaster,
  defaultProductCrop,
  drawProductRasterCrop,
  encodeProductRasterCrop,
  canCropProductImage,
  prepareProductImage,
  productImageDisplaySource,
  reorderProductImages,
  type ProductCropAspect,
  type ProductCropSettings,
} from "@/lib/product-images";
import { publicPath } from "@/lib/public-path";
import { cn } from "@/lib/utils";

type Translate = ReturnType<typeof useLanguage>["l"];

function imageErrorMessage(cause: unknown, l: Translate) {
  const code = cause instanceof ProductImageError ? cause.code : "decode";
  const messages = {
    unsupported: l(
      "Choose a PNG, JPEG or WebP raster image. SVG files are not supported.",
      "Elige una imagen PNG, JPEG o WebP. No se admiten archivos SVG.",
    ),
    empty: l("This file is empty.", "Este archivo está vacío."),
    "too-large": l(
      "Each image must be 8 MB or smaller.",
      "Cada imagen debe pesar 8 MB o menos.",
    ),
    signature: l(
      "The file contents do not match its image type. Choose a valid raster image.",
      "El contenido no coincide con el tipo de archivo. Elige una imagen válida.",
    ),
    dimensions: l(
      "Use an image up to 8,192 pixels per side and 24 megapixels.",
      "Usa una imagen de hasta 8.192 píxeles por lado y 24 megapíxeles.",
    ),
    decode: l(
      "This image could not be decoded. It may be damaged; choose another file.",
      "No se pudo leer la imagen. Puede estar dañada; elige otro archivo.",
    ),
    encode: l(
      "The image could not be prepared for storage. Try a smaller raster image.",
      "No se pudo preparar la imagen. Prueba con una imagen más pequeña.",
    ),
    "unsafe-source": l(
      "Upload a raster replacement before cropping this image.",
      "Sube una imagen de reemplazo antes de recortarla.",
    ),
    aborted: l("Image processing cancelled.", "Procesamiento cancelado."),
  };
  return messages[code];
}

export function ProductImageThumbnail({
  image,
  className,
  decorative = false,
}: {
  image?: ProductImage;
  className?: string;
  decorative?: boolean;
}) {
  const { l } = useLanguage();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <div
      className={cn(
        "grid h-full w-full min-w-0 place-items-center overflow-hidden",
        className,
      )}
    >
      {image && failedSource !== image.src ? (
        <img
          src={productImageDisplaySource(image.src, publicPath)}
          alt={
            decorative
              ? ""
              : image.alt || l("Product image", "Imagen del producto")
          }
          width={image.width ?? 900}
          height={image.height ?? 900}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(image.src)}
          className="block h-full w-full object-contain"
        />
      ) : (
        <div
          role={decorative ? undefined : "img"}
          aria-label={
            decorative
              ? undefined
              : l("No product image", "Sin imagen del producto")
          }
          className="flex h-full min-h-12 flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          <ImageIcon aria-hidden="true" className="size-7 opacity-50" />
          {!decorative && (
            <span className="text-[11px]">{l("No image", "Sin imagen")}</span>
          )}
        </div>
      )}
    </div>
  );
}

function CropRange({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <output htmlFor={id} className="text-muted-foreground tabular-nums">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-6 w-full cursor-pointer accent-primary outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45"
      />
    </div>
  );
}

function RasterCropDialog({
  image,
  disabled,
  onClose,
  onApply,
}: {
  image: ProductImage;
  disabled: boolean;
  onClose: () => void;
  onApply: (image: ProductImage) => void;
}) {
  const { l } = useLanguage();
  const [raster, setRaster] = useState<HTMLImageElement | null>(null);
  const [settings, setSettings] = useState<ProductCropSettings>({
    ...defaultProductCrop,
  });
  const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const dirty = JSON.stringify(settings) !== JSON.stringify(defaultProductCrop);

  useEffect(() => {
    const controller = new AbortController();
    void decodeProductRaster(image.src, controller.signal, publicPath).then(
      (decoded) => {
        if (!controller.signal.aborted) setRaster(decoded);
      },
      (cause: unknown) => {
        if (!controller.signal.aborted) setError(imageErrorMessage(cause, l));
      },
    );
    return () => controller.abort();
  }, [image.src, l]);

  useEffect(() => {
    if (!raster || !canvasRef.current) return;
    try {
      drawProductRasterCrop(canvasRef.current, raster, settings, 600);
      setError(null);
    } catch (cause) {
      setError(imageErrorMessage(cause, l));
    }
  }, [raster, settings, l]);

  const close = () => {
    if (dirty) setDiscard(true);
    else onClose();
  };
  const apply = () => {
    if (!raster || disabled) return;
    try {
      const result = encodeProductRasterCrop(raster, settings);
      onApply({ ...image, ...result });
    } catch (cause) {
      setError(imageErrorMessage(cause, l));
    }
  };
  const rotate = (direction: -1 | 1) =>
    setSettings((previous) => ({
      ...previous,
      rotation: ((previous.rotation + direction * 90 + 360) %
        360) as ProductCropSettings["rotation"],
      offsetX: 0,
      offsetY: 0,
    }));
  const startDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (
      disabled ||
      !raster ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: settings.offsetX,
      offsetY: settings.offsetY,
    };
  };
  const moveDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || disabled || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setSettings((previous) => ({
      ...previous,
      offsetX: Math.max(
        -1,
        Math.min(
          1,
          drag.offsetX -
            ((event.clientX - drag.x) / Math.max(1, rect.width)) * 2,
        ),
      ),
      offsetY: Math.max(
        -1,
        Math.min(
          1,
          drag.offsetY -
            ((event.clientY - drag.y) / Math.max(1, rect.height)) * 2,
        ),
      ),
    }));
  };
  const endDrag = () => {
    dragRef.current = null;
  };
  const locked = disabled || !raster;
  const aspects: { value: ProductCropAspect; label: string }[] = [
    { value: "original", label: l("Original", "Original") },
    { value: "square", label: "1:1" },
    { value: "portrait", label: "4:5" },
    { value: "landscape", label: "4:3" },
  ];

  return (
    <Dialog
      open
      onOpenChange={(open, details) => {
        if (!open) {
          details.cancel();
          close();
        }
      }}
    >
      <DialogContent
        closeLabel={l("Close image editor", "Cerrar editor de imágenes")}
        className="w-[calc(100%-24px)] max-w-4xl overflow-y-auto p-0"
      >
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <Crop aria-hidden="true" className="size-5 text-primary" />
            {l("Edit image", "Editar imagen")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {l(
              "Frame your image, then apply the crop. The result is stored with this product.",
              "Encuadra la imagen y aplica el recorte. El resultado se guarda con el producto.",
            )}
          </DialogDescription>
        </div>
        <div className="grid min-w-0 gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0">
            <div className="grid min-h-56 place-items-center overflow-hidden rounded-xl border border-border bg-surface-subtle p-4 sm:min-h-80">
              <div className={cn("relative max-w-full", !raster && "hidden")}>
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label={l(
                    "Preview of the cropped image",
                    "Vista previa de la imagen recortada",
                  )}
                  onPointerDown={startDrag}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onLostPointerCapture={endDrag}
                  className={cn(
                    "block max-h-[45dvh] max-w-full rounded-md object-contain",
                    !disabled &&
                      "touch-none cursor-grab active:cursor-grabbing",
                  )}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-white/35"
                >
                  <div className="absolute inset-x-0 top-1/3 border-t border-white/35" />
                  <div className="absolute inset-x-0 top-2/3 border-t border-white/35" />
                  <div className="absolute inset-y-0 left-1/3 border-l border-white/35" />
                  <div className="absolute inset-y-0 left-2/3 border-l border-white/35" />
                </div>
              </div>
              {!raster && (
                <p role="status" className="text-xs text-muted-foreground">
                  {error
                    ? l("Preview unavailable", "Vista previa no disponible")
                    : l("Preparing preview…", "Preparando vista previa…")}
                </p>
              )}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              {l(
                "Drag to reframe, or use the position sliders with your keyboard. Exports are at most 900 px.",
                "Arrastra para encuadrar o usa los controles de posición con el teclado. La imagen final tiene hasta 900 px.",
              )}
            </p>
          </div>
          <div className="grid content-start gap-6">
            <div className="grid gap-3">
              <p className="text-xs font-semibold">
                {l("Aspect ratio", "Proporción")}
              </p>
              <div
                role="group"
                aria-label={l("Crop aspect ratio", "Proporción del recorte")}
                className="grid grid-cols-2 gap-2"
              >
                {aspects.map((aspect) => (
                  <Button
                    key={aspect.value}
                    variant={
                      settings.aspect === aspect.value ? "secondary" : "outline"
                    }
                    size="sm"
                    aria-pressed={settings.aspect === aspect.value}
                    disabled={locked}
                    onClick={() =>
                      setSettings((previous) => ({
                        ...previous,
                        aspect: aspect.value,
                        offsetX: 0,
                        offsetY: 0,
                      }))
                    }
                  >
                    {aspect.label}
                  </Button>
                ))}
              </div>
            </div>
            <CropRange
              label={l("Zoom", "Zoom")}
              value={settings.zoom}
              min={1}
              max={3}
              step={0.01}
              display={`${Math.round(settings.zoom * 100)}%`}
              disabled={locked}
              onChange={(zoom) =>
                setSettings((previous) => ({ ...previous, zoom }))
              }
            />
            <CropRange
              label={l("Horizontal position", "Posición horizontal")}
              value={settings.offsetX}
              min={-1}
              max={1}
              step={0.01}
              display={`${Math.round(settings.offsetX * 100)}%`}
              disabled={locked}
              onChange={(offsetX) =>
                setSettings((previous) => ({ ...previous, offsetX }))
              }
            />
            <CropRange
              label={l("Vertical position", "Posición vertical")}
              value={settings.offsetY}
              min={-1}
              max={1}
              step={0.01}
              display={`${Math.round(settings.offsetY * 100)}%`}
              disabled={locked}
              onChange={(offsetY) =>
                setSettings((previous) => ({ ...previous, offsetY }))
              }
            />
            <div className="grid gap-3">
              <p className="text-xs font-semibold">
                {l("Rotation", "Rotación")}{" "}
                <span className="ml-2 text-muted-foreground tabular-nums">
                  {settings.rotation}°
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={locked}
                  aria-label={l(
                    "Rotate left 90 degrees",
                    "Girar 90 grados a la izquierda",
                  )}
                  onClick={() => rotate(-1)}
                >
                  <RotateCcw aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={locked}
                  aria-label={l(
                    "Rotate right 90 degrees",
                    "Girar 90 grados a la derecha",
                  )}
                  onClick={() => rotate(1)}
                >
                  <RotateCw aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={locked || !dirty}
                  onClick={() => setSettings({ ...defaultProductCrop })}
                >
                  {l("Reset", "Restablecer")}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {error && (
          <div className="px-5 pb-4 sm:px-6">
            <Alert
              variant="destructive"
              title={l("Image needs attention", "Revisa la imagen")}
            >
              {error}
            </Alert>
          </div>
        )}
        {discard && (
          <div className="px-5 pb-4 sm:px-6">
            <Alert
              variant="warning"
              title={l("Discard this crop?", "¿Descartar este recorte?")}
            >
              <p>
                {l(
                  "Your current framing has not been applied.",
                  "El encuadre actual aún no se ha aplicado.",
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDiscard(false)}
                >
                  {l("Keep editing", "Seguir editando")}
                </Button>
                <Button variant="destructive" size="sm" onClick={onClose}>
                  {l("Discard crop", "Descartar recorte")}
                </Button>
              </div>
            </Alert>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle/50 px-5 py-4 sm:px-6">
          <span className="text-xs text-muted-foreground">
            {l(
              "Your original stays unchanged until you apply.",
              "La imagen actual se conserva hasta aplicar el recorte.",
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={close}>
              {l("Cancel", "Cancelar")}
            </Button>
            <Button disabled={locked || !!error} onClick={apply}>
              <Crop aria-hidden="true" />
              {l("Apply crop", "Aplicar recorte")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type ProductImageEditorProps = {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  productName: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

export function ProductImageEditor({
  images,
  onChange,
  productName,
  disabled = false,
  onBusyChange,
}: ProductImageEditorProps) {
  const { l } = useLanguage();
  const inputId = useId();
  const replaceId = useId();
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cropping, setCropping] = useState<ProductImage | null>(null);
  const locked = disabled || working || !!cropping;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controllerRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    onBusyChange?.(working || !!cropping);
  }, [working, cropping, onBusyChange]);
  useEffect(() => {
    if (disabled) controllerRef.current?.abort();
  }, [disabled]);

  const upload = async (files: File[], target?: string | null) => {
    if (disabled || controllerRef.current || cropping || !files.length) return;
    setError(null);
    setNotice(null);
    if (
      (!target && images.length + files.length > MAX_PRODUCT_IMAGES) ||
      (target && files.length !== 1)
    ) {
      setError(
        l(
          "A product can have up to six images. Choose fewer files.",
          "Un producto admite hasta seis imágenes. Elige menos archivos.",
        ),
      );
      return;
    }
    const existing = images.map((image) => ({ ...image }));
    if (target && !existing.some((image) => image.id === target)) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setWorking(true);
    try {
      const additions: ProductImage[] = [];
      for (const [index, file] of files.entries()) {
        setProgress(
          l(
            `Preparing image ${index + 1} of ${files.length}…`,
            `Preparando imagen ${index + 1} de ${files.length}…`,
          ),
        );
        const prepared = await prepareProductImage(file, controller.signal);
        if (controller.signal.aborted || !mounted.current) return;
        const name = productName.trim() || l("Product", "Producto");
        const fileLabel = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]+/g, " ")
          .trim();
        additions.push({
          id: `img-${crypto.randomUUID()}`,
          ...prepared,
          alt: `${name}${fileLabel ? ` · ${fileLabel}` : ""}`.slice(0, 240),
        });
      }
      if (controller.signal.aborted || !mounted.current) return;
      if (target) {
        onChange(
          existing.map((image) =>
            image.id === target
              ? {
                  ...image,
                  src: additions[0].src,
                  width: additions[0].width,
                  height: additions[0].height,
                }
              : image,
          ),
        );
      } else {
        onChange([...existing, ...additions]);
      }
      setNotice(
        target
          ? l(
              "Image replaced. Save the product to keep it.",
              "Imagen reemplazada. Guarda el producto para conservarla.",
            )
          : l(
              `${additions.length} image(s) added. Save the product to keep them.`,
              `${additions.length} imagen(es) añadida(s). Guarda el producto para conservarlas.`,
            ),
      );
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current)
        setError(imageErrorMessage(cause, l));
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (mounted.current) {
        setWorking(false);
        setProgress("");
      }
    }
  };
  const reorder = (image: ProductImage, destination: number) => {
    if (locked) return;
    onChange(reorderProductImages(images, image.id, destination));
    setNotice(
      destination === 0
        ? l("Primary image updated.", "Imagen principal actualizada.")
        : l("Image order updated.", "Orden de imágenes actualizado."),
    );
  };

  return (
    <div
      className="grid min-w-0 gap-5"
      aria-busy={working}
      data-slot="product-image-editor"
    >
      <div className="rounded-xl border border-dashed border-primary/30 bg-accent/30 p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
              <Upload aria-hidden="true" className="size-4" />
            </span>
            <div>
              <label htmlFor={inputId} className="text-sm font-semibold">
                {l("Product images", "Imágenes del producto")}
              </label>
              <p
                id={`${inputId}-help`}
                className="mt-1 text-xs leading-6 text-muted-foreground"
              >
                {l(
                  "PNG, JPEG or WebP · Up to 8 MB each · Six images maximum",
                  "PNG, JPEG o WebP · Hasta 8 MB por imagen · Máximo seis imágenes",
                )}
              </p>
            </div>
          </div>
          <Badge variant="outline">
            {images.length}/{MAX_PRODUCT_IMAGES}
          </Badge>
        </div>
        <Input
          id={inputId}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          multiple
          disabled={locked || images.length >= MAX_PRODUCT_IMAGES}
          aria-describedby={`${inputId}-help`}
          className="h-auto min-h-11 py-2 text-xs"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void upload(files);
          }}
        />
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          {l(
            "Uploads are resized and compressed for browser storage. The first image is the catalog cover.",
            "Las imágenes se reducen y comprimen para guardarlas en el navegador. La primera es la portada del catálogo.",
          )}
        </p>
      </div>
      <input
        id={replaceId}
        ref={replaceInput}
        type="file"
        accept={PRODUCT_IMAGE_ACCEPT}
        disabled={locked}
        aria-label={l(
          "Choose replacement product image",
          "Elegir imagen de reemplazo",
        )}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          const target = replaceTarget.current;
          event.target.value = "";
          replaceTarget.current = null;
          if (target) void upload(files, target);
        }}
      />
      {working && (
        <p role="status" className="text-xs font-medium text-primary">
          {progress}
        </p>
      )}
      {error && (
        <Alert
          variant="destructive"
          title={l("Upload needs attention", "Revisa la carga")}
        >
          {error}
        </Alert>
      )}
      {notice && (
        <p role="status" className="text-xs text-primary">
          {notice}
        </p>
      )}
      {images.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border border-border px-5 py-10 text-center">
          <ImageIcon
            aria-hidden="true"
            className="size-8 text-muted-foreground/60"
          />
          <p className="text-sm font-semibold">
            {l("Give your product a cover", "Dale una portada a tu producto")}
          </p>
          <p className="max-w-sm text-xs leading-6 text-muted-foreground">
            {l(
              "Choose files above to add images, then crop and arrange them here.",
              "Elige archivos arriba para añadir imágenes, recortarlas y ordenarlas aquí.",
            )}
          </p>
        </div>
      ) : (
        <ol
          aria-label={l("Product image order", "Orden de las imágenes")}
          className="grid gap-3"
        >
          {images.map((image, index) => (
            <li
              key={image.id}
              className="grid min-w-0 gap-4 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[100px_minmax(0,1fr)] sm:p-4"
            >
              <div className="relative mx-auto aspect-square w-28 overflow-hidden rounded-lg border border-border bg-surface-subtle sm:w-full">
                <ProductImageThumbnail image={image} />
                <span className="absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-md bg-surface/95 text-[10px] font-semibold shadow-xs">
                  {index + 1}
                </span>
              </div>
              <div className="grid min-w-0 gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {index === 0 ? (
                    <Badge>
                      <Star aria-hidden="true" />
                      {l("Primary image", "Imagen principal")}
                    </Badge>
                  ) : (
                    <span className="text-xs font-medium">
                      {l(`Image ${index + 1}`, `Imagen ${index + 1}`)}
                    </span>
                  )}
                  {image.width && image.height && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {image.width} × {image.height} px
                    </span>
                  )}
                </div>
                <Field
                  label={l("Alt text", "Texto alternativo")}
                  description={l(
                    "Describe the product shown for screen reader users.",
                    "Describe el producto para quienes usan lectores de pantalla.",
                  )}
                  error={
                    !image.alt.trim()
                      ? l(
                          "Add a short image description.",
                          "Añade una descripción breve.",
                        )
                      : undefined
                  }
                >
                  <Input
                    value={image.alt}
                    maxLength={240}
                    disabled={locked}
                    onChange={(event) =>
                      onChange(
                        images.map((item) =>
                          item.id === image.id
                            ? { ...item, alt: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
                <div
                  role="group"
                  aria-label={l(
                    `Actions for image ${index + 1}`,
                    `Acciones para la imagen ${index + 1}`,
                  )}
                  className="flex flex-wrap gap-2"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={locked || !canCropProductImage(image.src)}
                    onClick={() => {
                      setError(null);
                      setCropping(image);
                    }}
                  >
                    <Crop aria-hidden="true" />
                    {l("Crop", "Recortar")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={locked}
                    onClick={() => {
                      replaceTarget.current = image.id;
                      replaceInput.current?.click();
                    }}
                  >
                    {l("Replace", "Reemplazar")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={locked || index === 0}
                    aria-label={l(
                      `Move image ${index + 1} earlier`,
                      `Mover la imagen ${index + 1} antes`,
                    )}
                    onClick={() => reorder(image, index - 1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={locked || index === images.length - 1}
                    aria-label={l(
                      `Move image ${index + 1} later`,
                      `Mover la imagen ${index + 1} después`,
                    )}
                    onClick={() => reorder(image, index + 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={locked}
                      onClick={() => reorder(image, 0)}
                    >
                      <Star aria-hidden="true" />
                      {l("Make primary", "Hacer principal")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive-foreground"
                    disabled={locked}
                    aria-label={l(
                      `Remove image ${index + 1}`,
                      `Eliminar imagen ${index + 1}`,
                    )}
                    onClick={() => {
                      onChange(images.filter((item) => item.id !== image.id));
                      setNotice(
                        l(
                          "Image removed from the draft.",
                          "Imagen eliminada del borrador.",
                        ),
                      );
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                {!canCropProductImage(image.src) && (
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    {l(
                      "This catalog image can be displayed. Replace it with a raster upload to enable cropping.",
                      "Esta imagen se puede mostrar. Reemplázala con una imagen PNG, JPEG o WebP para poder recortarla.",
                    )}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {cropping && (
        <RasterCropDialog
          key={cropping.id}
          image={cropping}
          disabled={disabled}
          onClose={() => setCropping(null)}
          onApply={(edited) => {
            if (disabled) return;
            onChange(
              images.map((image) => (image.id === edited.id ? edited : image)),
            );
            setCropping(null);
            setNotice(
              l(
                "Crop applied. Save the product to keep it.",
                "Recorte aplicado. Guarda el producto para conservarlo.",
              ),
            );
          }}
        />
      )}
    </div>
  );
}
