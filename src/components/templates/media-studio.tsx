"use client";
import { publicPath } from "@/lib/public-path";
import { useState, useRef, useEffect } from "react";
import {
  Image as ImageIcon,
  Film,
  Sparkles,
  Download,
  RotateCcw,
  Trash2,
  Expand,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useDemoStore } from "@/hooks/use-demo-store";
import { PageHeading } from "@/components/blocks/page-heading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Carousel } from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/ui/video-player";
import { Ribbon } from "@/components/ui/ribbon";
import { Empty } from "@/components/ui/empty";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

import { prepareDemoVisuals, originalArtNames } from "@/demo/visual-adapter";
import { editorialAssets, getEditorialAsset } from "@/demo/editorial-assets";
import { downloadGeneratedImage } from "@/lib/download-generated-image";
export const artNames = originalArtNames;
export function useGalleryImages() {
  const { l } = useLanguage();
  return editorialAssets.map((asset) => ({
    src: asset.src,
    alt: l(asset.alt.en, asset.alt.es),
    caption: l(asset.title.en, asset.title.es),
    width: asset.width,
    height: asset.height,
  }));
}
type EditorialGalleryImage = ReturnType<typeof useGalleryImages>[number];

/** Reserve the collection's intrinsic ratio in both cards and the lightbox. */
export function EditorialGallery({
  images,
  label,
  closeLabel,
}: {
  images: EditorialGalleryImage[];
  label: string;
  closeLabel: string;
}) {
  const [selected, setSelected] = useState<EditorialGalleryImage | null>(null);
  return (
    <>
      <div
        role="group"
        aria-label={label}
        className="grid grid-cols-2 gap-3 md:grid-cols-3"
      >
        {images.map((image) => (
          <button
            key={image.src}
            type="button"
            aria-label={`${image.caption} — ${image.alt}`}
            className="group relative overflow-hidden rounded-lg border border-border bg-surface-subtle text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setSelected(image)}
          >
            <span className="block aspect-[4/3] overflow-hidden">
              <img
                src={publicPath(image.src)}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                width={image.width}
                height={image.height}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100 motion-reduce:transform-none motion-reduce:transition-none"
              />
            </span>
            <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md bg-surface/85 text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
              <Expand className="size-3.5" aria-hidden="true" />
            </span>
            <span className="block px-3 py-3 text-[11px] font-medium">
              {image.caption}
            </span>
          </button>
        ))}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-3xl" closeLabel={closeLabel}>
          <DialogTitle>{selected?.caption ?? label}</DialogTitle>
          <DialogDescription>{selected?.alt}</DialogDescription>
          {selected && (
            <div className="mt-5 aspect-[3/2] overflow-hidden rounded-lg">
              <img
                src={publicPath(selected.src)}
                alt={selected.alt}
                width={selected.width}
                height={selected.height}
                className="size-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function useVideoLabels() {
  const { l } = useLanguage();
  return {
    play: l("Play", "Reproducir"),
    pause: l("Pause", "Pausar"),
    mute: l("Mute", "Silenciar"),
    unmute: l("Unmute", "Activar sonido"),
    fullscreen: l("Fullscreen", "Pantalla completa"),
    seek: l("Playback position", "Posición de reproducción"),
    unavailable: l("Video unavailable", "Video no disponible"),
  };
}
export function MediaTemplate() {
  const { l, common: t } = useLanguage(),
    images = useGalleryImages(),
    videoLabels = useVideoLabels(),
    [ribbon, setRibbon] = useState<"primary" | "subtle" | "warning">("primary");
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l("A little visual intention", "Un poco de intención visual")}
        title={l(
          "Make room for inspiration.",
          "Dale espacio a la inspiración.",
        )}
        description={l(
          "A prepared GPT Image 2.5 editorial collection, a controlled carousel and an accessible video pattern.",
          "Una colección editorial preparada con GPT Image 2.5, un carrusel controlado y un patrón de video accesible.",
        )}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {l("A considered carousel", "Un carrusel cuidado")}
            </CardTitle>
            <CardDescription>
              {l(
                "Manual navigation, without autoplay.",
                "Navegación manual, sin reproducción automática.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Carousel
              label={l("Original compositions", "Composiciones originales")}
              previousLabel={t("previous")}
              nextLabel={t("next")}
              slideLabel={(n) => l(`Slide ${n}`, `Diapositiva ${n}`)}
              items={images.map((image) => (
                <figure key={image.src}>
                  <img
                    src={publicPath(image.src)}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    decoding="async"
                    className="block aspect-[3/2] w-full object-cover"
                  />
                  <figcaption className="mt-3 text-xs font-medium">
                    {image.caption}
                  </figcaption>
                </figure>
              ))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {l("A little motion", "Un poco de movimiento")}
            </CardTitle>
            <CardDescription>
              {l(
                "An original eight-second clip with descriptive captions.",
                "Un clip original de ocho segundos con subtítulos descriptivos.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoPlayer
              src="/assets/aureform-motion.webm"
              poster="/assets/art/quiet-forms.svg"
              captionSrc="/assets/aureform-motion.vtt"
              label={l(
                "Original Aureform geometric motion",
                "Animación geométrica original de Aureform",
              )}
              labels={videoLabels}
            />
            <p className="mt-4 text-[10px] leading-6 text-muted-foreground">
              {l(
                "Play, pause, seek, mute and fullscreen controls. The demo clip has no audio.",
                "Controles de reproducción, pausa, posición, silencio y pantalla completa. El clip de ejemplo no tiene audio.",
              )}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Ribbon variant={ribbon}>
                {l("A considered detail", "Un detalle cuidado")}
              </Ribbon>
              <Select
                aria-label={l("Ribbon style", "Estilo de cinta")}
                value={ribbon}
                onValueChange={(v) => setRibbon(v as typeof ribbon)}
                className="h-8 w-32"
                options={[
                  { value: "primary", label: l("Primary", "Principal") },
                  { value: "subtle", label: l("Subtle", "Sutil") },
                  { value: "warning", label: l("Warning", "Aviso") },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {l("A visual collection", "Una colección visual")}
          </CardTitle>
          <CardDescription>
            {l(
              "Click a composition to open its full-size preview.",
              "Haz clic en una composición para verla completa.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditorialGallery
            images={images}
            label={l(
              "Editorial image gallery",
              "Galería de imágenes editoriales",
            )}
            closeLabel={t("close")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
type StudioOutput = {
  id: string;
  prompt: string;
  src: string;
  created: string;
  kind: "images" | "video";
  ratio: string;
};
export function StudioTemplate({ kind }: { kind: "images" | "video" }) {
  const { l, common: t } = useLanguage(),
    videoLabels = useVideoLabels(),
    [history, setHistory] = useDemoStore<StudioOutput[]>(`studio-${kind}`, []);
  const [prompt, setPrompt] = useState(""),
    [ratio, setRatio] = useState("4:3"),
    [style, setStyle] = useState("editorial"),
    [count, setCount] = useState("2"),
    [strength, setStrength] = useState(65),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [failure, setFailure] = useState(false);
  const controller = useRef<AbortController | null>(null),
    video = kind === "video";
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  const generate = async () => {
    if (prompt.trim().length < 8) {
      setError(
        l(
          "Describe your idea in at least eight characters.",
          "Describe tu idea con al menos ocho caracteres.",
        ),
      );
      return;
    }
    setError("");
    setPending(true);
    const current = new AbortController();
    controller.current?.abort();
    controller.current = current;
    try {
      const previews = await prepareDemoVisuals({
        prompt,
        kind,
        ratio,
        style,
        count: Number(count),
        strength,
        signal: current.signal,
        fail: failure,
      });
      if (current.signal.aborted) return;
      const outputs = previews.map((output) => ({
        ...output,
        id: crypto.randomUUID(),
        created: new Date().toISOString(),
      }));
      setHistory((previous) => [...outputs, ...previous].slice(0, 24));
      toast.success(
        l("Demo previews prepared", "Vistas previas de ejemplo preparadas"),
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setError(
        l(
          "Could not prepare the local preview. Try again.",
          "No se pudo preparar la vista local. Intenta de nuevo.",
        ),
      );
      setFailure(false);
    } finally {
      if (!current.signal.aborted) {
        setPending(false);
        controller.current = null;
      }
    }
  };
  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    setPending(false);
  };
  const download = async (output: StudioOutput) => {
    try {
      if (output.kind === "images") {
        const asset = getEditorialAsset(output.src);
        if (!asset) throw new Error("Prepared image unavailable");
        await downloadGeneratedImage({
          src: asset.src,
          filename: asset.webpFilename,
          expectedBytes: asset.webpBytes,
        });
        return;
      }
      const response = await fetch(publicPath(output.src));
      if (!response.ok) throw new Error("Asset unavailable");
      const url = URL.createObjectURL(await response.blob()),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "aureform-motion.webm";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error(
        l(
          "Could not download preview.",
          "No se pudo descargar la vista previa.",
        ),
      );
    }
  };
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l(
          "A place to explore visually",
          "Un lugar para explorar visualmente",
        )}
        title={
          video
            ? l("An idea, in motion.", "Una idea, en movimiento.")
            : l("Give your idea a little shape.", "Dale forma a tu idea.")
        }
        description={
          video
            ? l(
                "Explore a prepared motion clip with saved briefs and local crop controls.",
                "Explora un clip preparado con descripciones guardadas y controles locales de recorte.",
              )
            : l(
                "Explore prepared GPT Image 2.5 imagery with saved briefs, local previews and crop controls.",
                "Explora imágenes preparadas con GPT Image 2.5, descripciones guardadas, vistas locales y controles de recorte.",
              )
        }
        actions={
          <Badge variant="outline">
            {l("Prepared collection demo", "Demo de colección preparada")}
          </Badge>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>
              {l("Your creative direction", "Tu dirección creativa")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                generate();
              }}
              className="grid gap-5"
            >
              <Field label={l("Prompt", "Descripción")} error={error}>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={l(
                    "A quiet composition with a forest green arch, soft sage forms and an ivory background…",
                    "Una composición tranquila con un arco verde, formas suaves en salvia y un fondo marfil…",
                  )}
                  maxLength={2000}
                  className="min-h-40"
                />
              </Field>
              <Select
                label={l("Style", "Estilo")}
                value={style}
                onValueChange={setStyle}
                options={[
                  {
                    value: "editorial",
                    label: l("Editorial forms", "Formas editoriales"),
                  },
                  {
                    value: "architectural",
                    label: l("Architectural", "Arquitectónico"),
                  },
                  { value: "minimal", label: l("Minimal", "Minimalista") },
                ]}
              />
              <Select
                label={l("Canvas ratio", "Proporción de lienzo")}
                value={ratio}
                onValueChange={setRatio}
                options={[
                  { value: "1:1", label: "1:1" },
                  { value: "4:3", label: "4:3" },
                  { value: "16:9", label: "16:9" },
                ]}
              />
              {!video && (
                <Select
                  label={l("Variations", "Variaciones")}
                  value={count}
                  onValueChange={setCount}
                  options={["1", "2", "4"].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              )}
              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span>{l("Visual intensity", "Intensidad visual")}</span>
                  <span>{strength}%</span>
                </div>
                <Slider
                  value={strength}
                  onValueChange={setStrength}
                  label={l("Visual intensity", "Intensidad visual")}
                />
              </div>
              {pending ? (
                <Button type="button" variant="outline" onClick={cancel}>
                  {l("Stop preview", "Detener vista previa")}
                </Button>
              ) : (
                <Button type="submit">
                  <Sparkles />
                  {video
                    ? l(
                        "Prepare video preview",
                        "Preparar vista previa de video",
                      )
                    : l(
                        "Prepare image previews",
                        "Preparar vistas previas de imagen",
                      )}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFailure(true);
                  toast(
                    l(
                      "Next preview will show a demo error.",
                      "La siguiente vista previa mostrará un error de ejemplo.",
                    ),
                  );
                }}
              >
                {l("Try the error state", "Probar el estado de error")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="min-w-0">
          {pending && (
            <Card className="mb-5 flex min-h-60 flex-col items-center justify-center gap-4 bg-surface-subtle/40">
              <Spinner label={t("loading")} />
              <p className="text-xs text-muted-foreground">
                {l(
                  "Making a little room for your idea…",
                  "Dándole un poco de espacio a tu idea…",
                )}
              </p>
            </Card>
          )}
          {history.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {history.map((output) => {
                const asset = getEditorialAsset(output.src);
                return (
                  <Card key={output.id} className="overflow-hidden">
                    {video ? (
                      <VideoPlayer
                        src={output.src}
                        poster="/assets/art/quiet-forms.svg"
                        captionSrc="/assets/aureform-motion.vtt"
                        label={l(
                          "Prepared Aureform motion clip",
                          "Clip preparado de Aureform",
                        )}
                        aspectRatio={output.ratio.replace(":", "/")}
                        labels={videoLabels}
                      />
                    ) : (
                      <div
                        className="overflow-hidden"
                        style={{ aspectRatio: output.ratio.replace(":", "/") }}
                      >
                        <img
                          src={publicPath(output.src)}
                          alt={
                            asset
                              ? l(asset.alt.en, asset.alt.es)
                              : l(
                                  "Prepared image preview",
                                  "Vista de imagen preparada",
                                )
                          }
                          className="size-full object-cover"
                          decoding="async"
                          width={asset?.width ?? 1200}
                          height={asset?.height ?? 800}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      {asset && (
                        <p className="mb-2 text-xs font-semibold">
                          {l(asset.title.en, asset.title.es)}
                        </p>
                      )}
                      <p className="line-clamp-2 text-xs leading-6">
                        {l("Saved brief", "Descripción guardada")}:{" "}
                        {output.prompt}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="outline">
                          {l("Prepared asset", "Recurso preparado")}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={l(
                              output.kind === "images"
                                ? "Download image (.webp)"
                                : "Download preview",
                              output.kind === "images"
                                ? "Descargar imagen (.webp)"
                                : "Descargar vista previa",
                            )}
                            onClick={() => void download(output)}
                          >
                            <Download />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={l(
                              "Reuse prompt",
                              "Reutilizar descripción",
                            )}
                            onClick={() => setPrompt(output.prompt)}
                          >
                            <RotateCcw />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={l(
                              "Remove preview",
                              "Eliminar vista previa",
                            )}
                            onClick={() =>
                              setHistory((previous) =>
                                previous.filter(
                                  (item) => item.id !== output.id,
                                ),
                              )
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            !pending && (
              <Card className="min-h-[520px]">
                <Empty
                  title={l(
                    "A blank canvas, a good beginning.",
                    "Un lienzo vacío, un buen comienzo.",
                  )}
                  description={l(
                    "Save an idea and explore prepared images from the Aureform collection.",
                    "Guarda una idea y explora imágenes preparadas de la colección Aureform.",
                  )}
                  icon={
                    video ? (
                      <Film className="size-6" />
                    ) : (
                      <ImageIcon className="size-6" />
                    )
                  }
                />
              </Card>
            )
          )}
          <Alert
            className="mt-5"
            title={l(
              "Prepared collection assets",
              "Recursos de la colección preparada",
            )}
          >
            {video
              ? l(
                  "Preview the prepared Aureform motion clip with a saved brief and a local crop. The clip is prepared in advance; this demo makes no live generation request.",
                  "Explora el clip preparado de Aureform con una descripción guardada y un recorte local. El clip se prepara de antemano; esta demo no solicita generación en vivo.",
                )
              : l(
                  "Saved briefs, style and intensity select existing previews. Canvas ratio controls the crop. The GPT Image 2.5 collection is prepared in advance; this demo makes no live generation request.",
                  "Las descripciones guardadas, el estilo y la intensidad seleccionan vistas existentes. La proporción controla el recorte. La colección GPT Image 2.5 se prepara de antemano; esta demo no solicita generación en vivo.",
                )}
          </Alert>
        </div>
      </div>
    </div>
  );
}
