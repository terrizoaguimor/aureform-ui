"use client";
import { publicPath } from "@/lib/public-path";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Search,
  Upload,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Star,
  MoreHorizontal,
  Download,
  Trash2,
  Plus,
  MessageCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { localFileAdapter } from "@/demo/file-adapter";
import { ticketsSeed, type SupportTicket } from "@/demo/application-data";
import { editorialAssets, getEditorialAsset } from "@/demo/editorial-assets";
import { getDemoTicketCustomerAvatarSrc } from "@/demo/avatar-assets";
import { downloadGeneratedImage } from "@/lib/download-generated-image";
import { useDemoStore } from "@/hooks/use-demo-store";
import { useLanguage } from "@/hooks/use-language";
import { PageHeading } from "@/components/blocks/page-heading";
import { MetricCard } from "@/components/blocks/metric-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Progress } from "@/components/ui/progress";
import { Empty } from "@/components/ui/empty";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  DeleteDialog,
  useTableLabels,
} from "@/components/templates/data-manager";
import { csv, downloadText, cn } from "@/lib/utils";
type FileRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  modified: string;
  folder: string;
  favorite: boolean;
  src?: string;
  content?: string;
};
const filesSeed: FileRecord[] = [
  {
    id: "file-1",
    name: "Aureform — Brand notes.md",
    type: "text/markdown",
    size: 928,
    modified: "2026-10-17",
    folder: "documents",
    favorite: true,
    content:
      "# Aureform UI\n\nRefined interfaces for ambitious products.\n\nA quiet editorial direction: ivory, graphite and forest green. Manrope for interface clarity, Instrument Serif for selected moments.\n\nWorking brand concept. Name and trademarks have not been validated.",
  },
  {
    id: "file-2",
    name: "Quarterly report.csv",
    type: "text/csv",
    size: 384,
    modified: "2026-10-16",
    folder: "documents",
    favorite: false,
    content:
      "month,revenue,customers\nAugust,38420,1864\nSeptember,42810,2148\nOctober,48295,2420\n",
  },
  {
    id: "file-3",
    name: editorialAssets[0].svgFilename,
    type: "image/svg+xml",
    size: editorialAssets[0].svgBytes,
    modified: "2026-10-19",
    folder: "images",
    favorite: true,
    src: editorialAssets[0].src,
  },
  {
    id: "file-4",
    name: editorialAssets[1].svgFilename,
    type: "image/svg+xml",
    size: editorialAssets[1].svgBytes,
    modified: "2026-10-19",
    folder: "images",
    favorite: false,
    src: editorialAssets[1].src,
  },
  {
    id: "file-5",
    name: "Design handoff.txt",
    type: "text/plain",
    size: 512,
    modified: "2026-10-12",
    folder: "documents",
    favorite: false,
    content:
      "Design handoff\n\n1. Read the Foundations page in Figma.\n2. Use semantic variables, not raw colors.\n3. Start with a component instance.\n4. Review focus, loading, error and empty states.\n5. Replace the demo adapter before using live data.\n",
  },
];
export function useUploadLabels() {
  const { l } = useLanguage();
  return {
    title: l(
      "Drop a little inspiration here.",
      "Deja un poco de inspiración aquí.",
    ),
    description: l(
      "Images, PDF, text, JSON or CSV · Up to 10 MB per file",
      "Imágenes, PDF, texto, JSON o CSV · Hasta 10 MB por archivo",
    ),
    browse: l("Browse files", "Buscar archivos"),
    remove: l("Remove", "Eliminar"),
    tooLarge: l("Maximum file size is 10 MB.", "El tamaño máximo es 10 MB."),
    invalidType: l(
      "This file type isn’t supported.",
      "Este tipo de archivo no está permitido.",
    ),
  };
}
export function FilesTemplate() {
  const { l, common: t, date } = useLanguage(),
    [files, setFiles, fileStore] = useDemoStore<FileRecord[]>(
      "files",
      filesSeed,
    );
  const [folder, setFolder] = useState("all"),
    [query, setQuery] = useState(""),
    [uploadOpen, setUploadOpen] = useState(false),
    [pending, setPending] = useState<File[]>([]),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<FileRecord | null>(null),
    [previewUrl, setPreviewUrl] = useState(""),
    [previewText, setPreviewText] = useState(""),
    [removing, setRemoving] = useState<string | null>(null),
    [previewError, setPreviewError] = useState("");
  const currentObjectUrl = useRef(""),
    labels = useUploadLabels();
  const previewAsset = getEditorialAsset(preview?.src);
  useEffect(() => {
    if (!fileStore.ready) return;
    // Refresh only the two authored image records from previous demo versions.
    // Preserve deletions, favorites and all uploaded file metadata.
    setFiles((previous) => {
      let changed = false;
      const next = previous.map((file) => {
        const asset =
          file.id === "file-3"
            ? editorialAssets[0]
            : file.id === "file-4"
              ? editorialAssets[1]
              : undefined;
        if (!asset || file.src !== asset.src) return file;
        if (
          file.name === asset.svgFilename &&
          file.type === "image/svg+xml" &&
          file.size === asset.svgBytes
        ) {
          return file;
        }
        changed = true;
        return {
          ...file,
          name: asset.svgFilename,
          type: "image/svg+xml",
          size: asset.svgBytes,
        };
      });
      return changed ? next : previous;
    });
  }, [fileStore.ready, setFiles]);
  const visible = files.filter(
    (file) =>
      (folder === "all" || folder === "favorites"
        ? folder !== "favorites" || file.favorite
        : file.folder === folder) &&
      file.name.toLowerCase().includes(query.toLowerCase()),
  );
  const total = files.reduce((sum, file) => sum + file.size, 0),
    size = (bytes: number) =>
      bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  useEffect(() => {
    let cancelled = false;
    setPreviewUrl("");
    setPreviewText("");
    setPreviewError("");
    if (currentObjectUrl.current) {
      URL.revokeObjectURL(currentObjectUrl.current);
      currentObjectUrl.current = "";
    }
    if (!preview) return;
    const load = async () => {
      try {
        const blob = preview.content
          ? new Blob([preview.content], { type: preview.type })
          : preview.src
            ? await fetch(publicPath(preview.src)).then((response) => {
                if (!response.ok) throw new Error("Asset unavailable");
                return response.blob();
              })
            : await localFileAdapter.get(preview.id);
        if (!blob) throw new Error("File unavailable");
        if (preview.type.startsWith("image/")) {
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          currentObjectUrl.current = url;
          setPreviewUrl(url);
        } else if (
          preview.type.startsWith("text/") ||
          preview.type === "application/json"
        ) {
          const text = await blob.slice(0, 100000).text();
          if (!cancelled) setPreviewText(text);
        }
      } catch {
        if (!cancelled)
          setPreviewError(
            l(
              "This file is no longer available locally.",
              "Este archivo ya no está disponible localmente.",
            ),
          );
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [preview, l]);
  useEffect(
    () => () => {
      if (currentObjectUrl.current)
        URL.revokeObjectURL(currentObjectUrl.current);
    },
    [],
  );
  const blobFor = async (file: FileRecord) =>
    file.content
      ? new Blob([file.content], { type: file.type })
      : file.src
        ? await fetch(publicPath(file.src)).then((response) => {
            if (!response.ok) throw new Error("File unavailable");
            return response.blob();
          })
        : await localFileAdapter.get(file.id);
  const download = async (file: FileRecord) => {
    try {
      const asset = getEditorialAsset(file.src);
      if (asset && file.type === "image/svg+xml") {
        await downloadGeneratedImage({
          src: asset.src,
          filename: asset.webpFilename,
          expectedBytes: asset.webpBytes,
        });
        return;
      }
      const blob = await blobFor(file);
      if (!blob) throw new Error("File unavailable");
      const url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error(
        l(
          "File unavailable in this browser.",
          "Archivo no disponible en este navegador.",
        ),
      );
    }
  };
  const upload = async () => {
    setBusy(true);
    try {
      const records: FileRecord[] = [];
      for (const file of pending) {
        const id = crypto.randomUUID();
        await localFileAdapter.put(id, file);
        records.push({
          id,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          modified: new Date().toISOString().slice(0, 10),
          folder: file.type.startsWith("image/") ? "images" : "documents",
          favorite: false,
        });
      }
      setFiles((previous) => [...records, ...previous]);
      setPending([]);
      setUploadOpen(false);
      toast.success(
        l(
          "Files saved in this browser",
          "Archivos guardados en este navegador",
        ),
      );
    } catch {
      toast.error(
        l(
          "Could not save files. Local storage may be full.",
          "No se pudieron guardar los archivos. El almacenamiento puede estar lleno.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l(
          "A place for your good ideas",
          "Un lugar para tus buenas ideas",
        )}
        title={l("Everything, thoughtfully placed.", "Todo, en su lugar.")}
        description={l(
          "Keep your local documents and visual inspiration together.",
          "Reúne tus documentos e inspiración visual locales.",
        )}
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload />
            {l("Upload files", "Subir archivos")}
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card className="p-3">
            <nav
              aria-label={l("File folders", "Carpetas de archivos")}
              className="grid gap-1"
            >
              {[
                {
                  id: "all",
                  label: l("All files", "Todos los archivos"),
                  icon: FolderOpen,
                },
                {
                  id: "favorites",
                  label: l("Favorites", "Favoritos"),
                  icon: Star,
                },
                {
                  id: "documents",
                  label: l("Documents", "Documentos"),
                  icon: FileText,
                },
                {
                  id: "images",
                  label: l("Images", "Imágenes"),
                  icon: ImageIcon,
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setFolder(item.id)}
                  aria-current={folder === item.id ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-xs",
                    folder === item.id
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-muted-foreground hover:bg-surface-subtle",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold">
              {l("Local storage", "Almacenamiento local")}
            </p>
            <p className="my-3 text-[10px] text-muted-foreground">
              {size(total)} / 100 MB{" "}
              {l("demo reference", "referencia de ejemplo")}
            </p>
            <Progress
              value={Math.min(100, total / 1024 / 1024)}
              label={l(
                "Demo storage reference",
                "Referencia de almacenamiento de ejemplo",
              )}
            />
            <p className="mt-3 text-[9px] leading-5 text-muted-foreground">
              {l(
                "Uploads use IndexedDB. The browser controls the actual quota.",
                "Los archivos usan IndexedDB. El navegador controla la cuota real.",
              )}
            </p>
          </Card>
        </div>
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 size-3.5 text-muted-foreground" />
              <Input
                aria-label={l("Find a file", "Buscar un archivo")}
                placeholder={l("Find a file…", "Buscar un archivo…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {visible.length} {l("files", "archivos")}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((file) => {
              const asset = getEditorialAsset(file.src);
              return (
                <Card key={file.id} className="group overflow-hidden">
                  <button
                    type="button"
                    className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-surface-subtle outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    aria-label={`${l("Preview", "Vista previa")} ${file.name}`}
                    onClick={() => setPreview(file)}
                  >
                    {file.src ? (
                      <img
                        src={publicPath(file.src)}
                        alt={asset ? l(asset.alt.en, asset.alt.es) : file.name}
                        width={asset?.width ?? 800}
                        height={asset?.height ?? 600}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : file.type.startsWith("image/") ? (
                      <ImageIcon className="size-12 text-primary/60" />
                    ) : (
                      <FileText className="size-12 text-primary/50" />
                    )}
                  </button>
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setPreview(file)}
                          className="block w-full truncate text-left text-xs font-semibold hover:text-primary"
                        >
                          {file.name}
                        </button>
                        <p className="mt-2 text-[9px] text-muted-foreground">
                          {size(file.size)} ·{" "}
                          {date(file.modified, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`${l("Actions for", "Acciones de")} ${file.name}`}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreview(file)}>
                            {l("Preview", "Vista previa")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void download(file)}>
                            <Download />
                            {asset
                              ? l(
                                  "Download image (.webp)",
                                  "Descargar imagen (.webp)",
                                )
                              : l("Download", "Descargar")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setFiles((previous) =>
                                previous.map((item) =>
                                  item.id === file.id
                                    ? { ...item, favorite: !item.favorite }
                                    : item,
                                ),
                              )
                            }
                          >
                            <Star />
                            {file.favorite
                              ? l("Remove favorite", "Quitar favorito")
                              : l("Add favorite", "Añadir favorito")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            destructive
                            onClick={() => setRemoving(file.id)}
                          >
                            <Trash2 />
                            {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {file.favorite && (
                      <Star className="mt-3 size-3 fill-warning-foreground text-warning-foreground" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
          {!visible.length && (
            <Card>
              <Empty
                title={t("empty")}
                description={t("noMatch")}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUploadOpen(true)}
                  >
                    {l("Upload files", "Subir archivos")}
                  </Button>
                }
              />
            </Card>
          )}
        </div>
      </div>
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent closeLabel={t("close")}>
          <DialogTitle>
            {l("Make room for a new file", "Haz espacio para un archivo nuevo")}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Files are stored in this browser, without a remote upload.",
              "Los archivos se guardan en este navegador, sin una subida remota.",
            )}
          </DialogDescription>
          <div className="mt-6">
            <FileUpload
              files={pending}
              onFilesChange={setPending}
              accept="image/*,application/pdf,.txt,.md,.json,.csv"
              labels={labels}
              disabled={busy}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setUploadOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() => void upload()}
              disabled={!pending.length}
              loading={busy}
            >
              {l("Save files locally", "Guardar archivos localmente")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!preview}
        onOpenChange={(v) => {
          if (!v) setPreview(null);
        }}
      >
        <DialogContent closeLabel={t("close")} className="max-w-2xl">
          <DialogTitle>{preview?.name}</DialogTitle>
          <DialogDescription>
            {previewAsset
              ? l(
                  "A prepared image in a portable SVG container. Download the embedded WebP image.",
                  "Una imagen preparada en un contenedor SVG portable. Descarga su imagen WebP embebida.",
                )
              : l("Local file preview", "Vista previa de archivo local")}
          </DialogDescription>
          {previewAsset ? (
            <div className="mt-5 flex aspect-[3/2] max-h-96 w-full items-center justify-center overflow-hidden rounded-lg bg-surface-subtle">
              {previewUrl ? (
                <img
                  src={publicPath(previewUrl)}
                  alt={l(previewAsset.alt.en, previewAsset.alt.es)}
                  width={previewAsset.width}
                  height={previewAsset.height}
                  className="size-full object-contain"
                />
              ) : (
                <span
                  role={previewError ? "alert" : "status"}
                  className="px-5 text-center text-xs text-muted-foreground"
                >
                  {previewError || t("loading")}
                </span>
              )}
            </div>
          ) : previewUrl ? (
            <img
              src={publicPath(previewUrl)}
              alt={preview?.name ?? ""}
              className="mt-5 max-h-96 w-full rounded-lg object-contain"
            />
          ) : previewText ? (
            <pre className="mt-5 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-subtle p-5 text-xs leading-7">
              {previewText}
            </pre>
          ) : (
            <p className="my-8 text-xs text-muted-foreground">
              {previewError ||
                l(
                  "Download this file to view it in your preferred application.",
                  "Descarga este archivo para verlo en tu aplicación preferida.",
                )}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (preview) void download(preview);
              }}
            >
              <Download />
              {previewAsset
                ? l("Download image (.webp)", "Descargar imagen (.webp)")
                : l("Download", "Descargar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        open={!!removing}
        onOpenChange={(v) => {
          if (!v) setRemoving(null);
        }}
        count={1}
        onDelete={() => {
          if (removing) void localFileAdapter.remove(removing).catch(() => {});
          setFiles((previous) =>
            previous.filter((file) => file.id !== removing),
          );
          setRemoving(null);
        }}
      />
    </div>
  );
}
export function SupportTemplate() {
  const { l, common: t, date } = useLanguage(),
    labels = useTableLabels(),
    [tickets, setTickets] = useDemoStore<SupportTicket[]>(
      "support",
      ticketsSeed,
    );
  const [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<SupportTicket | null>(null),
    [open, setOpen] = useState(false),
    [reply, setReply] = useState("");
  const statusOptions = [
    { value: "open", label: l("Open", "Abierto") },
    { value: "progress", label: l("In progress", "En progreso") },
    { value: "resolved", label: l("Resolved", "Resuelto") },
  ];
  const columns: ColumnDef<SupportTicket>[] = [
    {
      accessorKey: "id",
      header: l("Ticket", "Solicitud"),
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left hover:text-primary"
          onClick={() => {
            setSelected(row.original);
            setReply(row.original.reply);
          }}
        >
          <p className="text-[10px] text-muted-foreground">{row.original.id}</p>
          <p className="mt-1 max-w-64 text-xs font-semibold">
            {row.original.subject}
          </p>
        </button>
      ),
    },
    {
      accessorKey: "customer",
      header: l("Customer", "Cliente"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar
            name={row.original.customer}
            src={getDemoTicketCustomerAvatarSrc(row.original.id)}
            size="sm"
          />
          <span>{row.original.customer}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: l("Status", "Estado"),
      cell: ({ getValue }) => (
        <Badge
          variant={
            getValue() === "resolved"
              ? "default"
              : getValue() === "open"
                ? "warning"
                : "neutral"
          }
        >
          {statusOptions.find((option) => option.value === getValue())?.label}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: l("Priority", "Prioridad"),
      cell: ({ getValue }) => (
        <Badge variant={getValue() === "high" ? "destructive" : "outline"}>
          {getValue() === "high"
            ? l("High", "Alta")
            : getValue() === "medium"
              ? l("Medium", "Media")
              : l("Low", "Baja")}
        </Badge>
      ),
    },
    {
      accessorKey: "created",
      header: l("Created", "Creada"),
      cell: ({ getValue }) => date(String(getValue())),
    },
  ];
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l(
          "A little care goes a long way",
          "Un poco de cuidado hace la diferencia",
        )}
        title={l(
          "Good support starts with listening.",
          "El buen soporte empieza escuchando.",
        )}
        description={l(
          "Keep customer questions visible, organized and close.",
          "Mantén las preguntas de tus clientes cerca y organizadas.",
        )}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadText("support-tickets.csv", csv(tickets), "text/csv")
              }
            >
              <Download />
              {t("export")}
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus />
              {l("New ticket", "Nueva solicitud")}
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: l("Open tickets", "Solicitudes abiertas"),
            value: tickets.filter((ticket) => ticket.status === "open").length,
            icon: MessageCircle,
          },
          {
            label: l("In progress", "En progreso"),
            value: tickets.filter((ticket) => ticket.status === "progress")
              .length,
            icon: Clock,
          },
          {
            label: l("Resolved", "Resueltas"),
            value: tickets.filter((ticket) => ticket.status === "resolved")
              .length,
            icon: CheckCircle2,
          },
        ].map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={String(metric.value)}
            icon={<metric.icon />}
          />
        ))}
      </div>
      <Select
        aria-label={l("Ticket status filter", "Filtrar solicitudes por estado")}
        options={[
          { value: "all", label: l("All statuses", "Todos los estados") },
          ...statusOptions,
        ]}
        value={status}
        onValueChange={setStatus}
        className="w-44"
      />
      <DataTable
        data={tickets.filter(
          (ticket) => status === "all" || ticket.status === status,
        )}
        columns={columns}
        labels={labels}
        selectable={false}
      />
      <TicketEditor
        key={String(open)}
        open={open}
        onOpenChange={setOpen}
        onSave={(values) => {
          setTickets((previous) => [
            {
              id: `AF-${Date.now().toString().slice(-6)}`,
              created: new Date().toISOString().slice(0, 10),
              status: "open",
              reply: "",
              ...values,
            },
            ...previous,
          ]);
          setOpen(false);
          toast.success(t("saved"));
        }}
      />
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-w-2xl" closeLabel={t("close")}>
          <DialogTitle>{selected?.subject}</DialogTitle>
          <DialogDescription>
            {selected?.id} · {selected?.customer} · {selected?.email}
          </DialogDescription>
          <div className="mt-6">
            <p className="rounded-lg bg-surface-subtle p-5 text-xs leading-7">
              {selected?.message}
            </p>
            <form
              className="mt-5 grid gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                setTickets((previous) =>
                  previous.map((ticket) =>
                    ticket.id === selected?.id ? { ...ticket, reply } : ticket,
                  ),
                );
                setSelected(null);
                toast.success(
                  l("Response saved locally", "Respuesta guardada localmente"),
                );
              }}
            >
              <Field
                label={l("Your response", "Tu respuesta")}
                description={l(
                  "Saved locally. No message is sent.",
                  "Se guarda localmente. No se envía ningún mensaje.",
                )}
              >
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={4000}
                  className="min-h-32"
                />
              </Field>
              <Select
                label={l("Status", "Estado")}
                value={selected?.status}
                options={statusOptions}
                onValueChange={(v) => {
                  setSelected((previous) =>
                    previous
                      ? { ...previous, status: v as SupportTicket["status"] }
                      : previous,
                  );
                  setTickets((previous) =>
                    previous.map((ticket) =>
                      ticket.id === selected?.id
                        ? { ...ticket, status: v as SupportTicket["status"] }
                        : ticket,
                    ),
                  );
                }}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelected(null)}
                >
                  {t("close")}
                </Button>
                <Button type="submit" disabled={!reply.trim()}>
                  {l("Save response", "Guardar respuesta")}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function TicketEditor({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (
    values: Pick<
      SupportTicket,
      "subject" | "customer" | "email" | "priority" | "message"
    >,
  ) => void;
}) {
  const { l, common: t } = useLanguage();
  const schema = z.object({
    subject: z
      .string()
      .trim()
      .min(2, l("Enter a subject.", "Escribe un asunto."))
      .max(160),
    customer: z
      .string()
      .trim()
      .min(2, l("Enter a name.", "Escribe un nombre.")),
    email: z.email(l("Enter a valid email.", "Escribe un correo válido.")),
    priority: z.enum(["low", "medium", "high"]),
    message: z
      .string()
      .trim()
      .min(
        10,
        l(
          "Tell us a little more, at least 10 characters.",
          "Cuéntanos un poco más, al menos 10 caracteres.",
        ),
      )
      .max(4000),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: "",
      customer: "",
      email: "",
      priority: "medium",
      message: "",
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("close")}>
        <DialogTitle>
          {l("A new conversation", "Una nueva conversación")}
        </DialogTitle>
        <DialogDescription>
          {l(
            "Create a ticket in this local workspace.",
            "Crea una solicitud en este espacio local.",
          )}
        </DialogDescription>
        <form className="mt-5 grid gap-4" onSubmit={form.handleSubmit(onSave)}>
          <Field
            label={l("Subject", "Asunto")}
            error={form.formState.errors.subject?.message}
          >
            <Input {...form.register("subject")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={l("Customer name", "Nombre del cliente")}
              error={form.formState.errors.customer?.message}
            >
              <Input {...form.register("customer")} />
            </Field>
            <Field
              label={l("Email", "Correo")}
              error={form.formState.errors.email?.message}
            >
              <Input type="email" {...form.register("email")} />
            </Field>
          </div>
          <Select
            label={l("Priority", "Prioridad")}
            value={form.watch("priority")}
            onValueChange={(v) =>
              form.setValue("priority", v as "low" | "medium" | "high")
            }
            options={[
              { value: "low", label: l("Low", "Baja") },
              { value: "medium", label: l("Medium", "Media") },
              { value: "high", label: l("High", "Alta") },
            ]}
          />
          <Field
            label={l("Message", "Mensaje")}
            error={form.formState.errors.message?.message}
          >
            <Textarea {...form.register("message")} />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit">
              {l("Create ticket", "Crear solicitud")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
