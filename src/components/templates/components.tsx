"use client";
import { publicPath } from "@/lib/public-path";
import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  ArrowUpRight,
  Search,
  Plus,
  Info,
  MoreHorizontal,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import {
  componentCatalog,
  categoryLabels,
  type ComponentFamily,
} from "@/lib/component-catalog";
import { componentExampleSources } from "@/lib/component-example-sources";
import {
  exportConfiguredExample,
  normalizeAppearance,
  palettePresets,
  type AppearanceConfig,
  type Material,
  type PaletteId,
} from "@/lib/appearance";
import {
  AppearanceScope,
  useAppearance,
} from "@/components/appearance-provider";
import {
  AppearanceControls,
  PalettePicker,
  paletteDisplayName,
} from "@/components/appearance-controls";
import { figmaUrl } from "@/lib/catalog";
import { useLanguage } from "@/hooks/use-language";
import { useCopy } from "@/hooks/use-copy";
import { useTableLabels } from "@/components/templates/data-manager";
import { useUploadLabels } from "@/components/templates/files-support";
import {
  EditorialGallery,
  useGalleryImages,
  useVideoLabels,
} from "@/components/templates/media-studio";
import { PageHeading } from "@/components/blocks/page-heading";
import { Brand } from "@/components/brand";
import {
  Button,
  buttonVariants,
  type ButtonAppearance,
  type ButtonShape,
} from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { TextLink } from "@/components/ui/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sidebar } from "@/components/ui/sidebar";
import { Command } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import { InputOTP } from "@/components/ui/input-otp";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { getDemoAvatarSrc } from "@/demo/avatar-assets";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  type TableAppearance,
  type TableDensity,
} from "@/components/ui/table";
import { DataTable } from "@/components/ui/data-table";
import { Chart } from "@/components/ui/chart";
import { Alert } from "@/components/ui/alert";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Carousel } from "@/components/ui/carousel";
import { VideoPlayer } from "@/components/ui/video-player";
import { Ribbon } from "@/components/ui/ribbon";
import { customersSeed } from "@/demo/dashboard-data";
import { cn } from "@/lib/utils";
const materialLabels: Record<Material, [string, string]> = {
  flat: ["Flat", "Plano"],
  elevated: ["Elevated", "Elevado"],
  glass: ["Glass", "Cristal"],
  gradient: ["Gradient", "Degradado"],
};
type ButtonShowcaseConfig = {
  shape: ButtonShape;
  size: "sm" | "default" | "lg";
  appearance: ButtonAppearance;
};
const defaultButtonShowcase: ButtonShowcaseConfig = {
  shape: "rounded",
  size: "default",
  appearance: "gradient",
};
function buttonShowcaseSource(
  config: ButtonShowcaseConfig,
  l: ReturnType<typeof useLanguage>["l"],
) {
  return `"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ButtonExample() {
  const id = useId();
  const [name, setName] = useState("Morrow");
  const [pending, setPending] = useState(false);
  const [savedName, setSavedName] = useState("");

  async function save() {
    const nextName = name.trim();
    if (!nextName || pending) return;
    setPending(true);
    // This example updates a local preview; no request is sent.
    await new Promise<void>((resolve) => setTimeout(resolve, 900));
    setSavedName(nextName);
    setPending(false);
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => { event.preventDefault(); void save(); }}
    >
      <label htmlFor={id} className="text-xs font-semibold">
        ${l("Workspace name", "Nombre del espacio")}
      </label>
      <Input
        id={id}
        value={name}
        maxLength={48}
        disabled={pending}
        onChange={(event) => {
          setName(event.target.value);
          setSavedName("");
        }}
      />
      <Button
        type="submit"
        appearance="${config.appearance}"
        shape="${config.shape}"
        size="${config.size}"
        loading={pending}
        disabled={!name.trim()}
        aria-describedby={id + "-status"}
      >
        ${l("Save changes", "Guardar cambios")}
      </Button>
      <p id={id + "-status"} role="status" className="text-xs text-muted-foreground">
        {pending
          ? ${JSON.stringify(l("Saving locally…", "Guardando localmente…"))}
          : savedName
            ? ${JSON.stringify(l("Preview saved: ", "Vista previa guardada: "))} + savedName
            : ${JSON.stringify(l("Enter a name, then save this preview.", "Escribe un nombre y guarda esta vista previa."))}}
      </p>
    </form>
  );
}
`;
}

function ButtonShowcase({
  config,
  onConfigChange,
  onPaletteChange,
}: {
  config: ButtonShowcaseConfig;
  onConfigChange: (config: ButtonShowcaseConfig) => void;
  onPaletteChange: (palette: PaletteId) => void;
}) {
  const { l } = useLanguage();
  const { appearance } = useAppearance();
  const id = useId();
  const action = useRef<HTMLElement>(null);
  const [name, setName] = useState("Morrow");
  const [pending, setPending] = useState(false);
  const [savedName, setSavedName] = useState("");
  const save = async () => {
    const nextName = name.trim();
    if (!nextName || pending) return;
    setPending(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 900));
    setSavedName(nextName);
    setPending(false);
    toast.success(
      l("Workspace preview saved.", "Vista previa del espacio guardada."),
    );
  };
  const status = pending
    ? l("Saving locally…", "Guardando localmente…")
    : savedName
      ? l(`Preview saved: ${savedName}`, `Vista previa guardada: ${savedName}`)
      : !name.trim()
        ? l(
            "Enter a name to enable saving.",
            "Escribe un nombre para habilitar el guardado.",
          )
        : l(
            "Ready to save this local preview.",
            "Listo para guardar esta vista previa local.",
          );
  return (
    <div className="grid min-w-0 gap-5">
      <PalettePicker
        compact
        value={appearance.palette}
        onValueChange={onPaletteChange}
        className="[&_button]:p-2"
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label={l("Button shape", "Forma del botón")}
          value={config.shape}
          onValueChange={(shape) =>
            onConfigChange({ ...config, shape: shape as ButtonShape })
          }
          options={[
            { value: "rounded", label: l("Rounded", "Curvo") },
            { value: "pill", label: l("Pill", "Píldora") },
            { value: "square", label: l("Square", "Cuadrado") },
          ]}
        />
        <Select
          label={l("Button size", "Tamaño del botón")}
          value={config.size}
          onValueChange={(size) =>
            onConfigChange({
              ...config,
              size: size as ButtonShowcaseConfig["size"],
            })
          }
          options={[
            { value: "sm", label: l("Small", "Pequeño") },
            { value: "default", label: l("Medium", "Medio") },
            { value: "lg", label: l("Large", "Grande") },
          ]}
        />
        <div className="col-span-2">
          <Select
            label={l("Button material", "Material del botón")}
            value={config.appearance}
            onValueChange={(appearance) =>
              onConfigChange({
                ...config,
                appearance: appearance as ButtonAppearance,
              })
            }
            options={[
              { value: "solid", label: l("Solid", "Sólido") },
              { value: "soft", label: l("Soft", "Suave") },
              { value: "outline", label: l("Outline", "Contorno") },
              { value: "glass", label: l("Glass", "Cristal") },
              { value: "gradient", label: l("Gradient", "Degradado") },
            ]}
          />
        </div>
      </div>
      <form
        className="grid min-w-0 gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field htmlFor={id} label={l("Workspace name", "Nombre del espacio")}>
          <Input
            id={id}
            value={name}
            maxLength={48}
            disabled={pending}
            placeholder={l("Name your workspace", "Nombra tu espacio")}
            onChange={(event) => {
              setName(event.target.value);
              setSavedName("");
            }}
          />
        </Field>
        <div className="af-surface-gradient grid min-h-32 place-items-center rounded-xl border border-border p-4">
          <Button
            ref={action}
            type="submit"
            shape={config.shape}
            size={config.size}
            appearance={config.appearance}
            loading={pending}
            disabled={!name.trim()}
            aria-describedby={`${id}-status`}
            className="focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <Check aria-hidden="true" />
            {l("Save changes", "Guardar cambios")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || !name.trim()}
            onClick={() => action.current?.focus()}
          >
            <Keyboard aria-hidden="true" />
            {l("Focus action", "Enfocar acción")}
          </Button>
          <Button
            type="button"
            variant="outline"
            shape="pill"
            size="icon-sm"
            aria-label={l(
              "Reset workspace preview",
              "Restablecer vista previa del espacio",
            )}
            disabled={pending}
            onClick={() => {
              setName("Morrow");
              setSavedName("");
            }}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
        <p
          id={`${id}-status`}
          role="status"
          className="break-words text-[11px] leading-5 text-muted-foreground"
        >
          {status}
        </p>
      </form>
      <p className="border-t border-border pt-3 text-[10px] leading-5 text-muted-foreground">
        {l(
          "Clear the name to try disabled. Tab to explore focus. Small controls keep a 44px touch target.",
          "Borra el nombre para deshabilitar. Usa Tab para explorar el foco. Los controles pequeños conservan un área táctil de 44px.",
        )}
      </p>
    </div>
  );
}

function DataTableShowcase() {
  const { l, currency, number } = useLanguage();
  const labels = useTableLabels();
  const [density, setDensity] = useState<TableDensity>("comfortable");
  const [appearance, setAppearance] = useState<TableAppearance>("glass");
  const [striped, setStriped] = useState(false);
  const data = customersSeed.slice(0, 8);
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label={l("Table density", "Densidad de tabla")}
          value={density}
          onValueChange={(value) => setDensity(value as TableDensity)}
          options={[
            { value: "comfortable", label: l("Comfortable", "Cómoda") },
            { value: "compact", label: l("Compact", "Compacta") },
          ]}
        />
        <Select
          label={l("Table material", "Material de tabla")}
          value={appearance}
          onValueChange={(value) => setAppearance(value as TableAppearance)}
          options={[
            { value: "flat", label: l("Flat", "Plano") },
            { value: "elevated", label: l("Elevated", "Elevado") },
            { value: "glass", label: l("Glass", "Cristal") },
            { value: "gradient", label: l("Gradient", "Degradado") },
          ]}
        />
      </div>
      <label className="flex items-center gap-3 text-[11px]">
        <Switch
          checked={striped}
          onCheckedChange={setStriped}
          aria-label={l("Striped rows", "Filas alternadas")}
        />
        {l("Striped rows", "Filas alternadas")}
      </label>
      <DataTable
        title={l("Customer portfolio", "Cartera de clientes")}
        description={l(
          "Choose columns, change the page size and select records.",
          "Elige columnas, cambia el tamaño de página y selecciona registros.",
        )}
        caption={l(
          `${number(data.length)} illustrative customers · Monthly value in USD`,
          `${number(data.length)} clientes ilustrativos · Valor mensual en USD`,
        )}
        data={data}
        columns={[
          {
            accessorKey: "name",
            header: l("Name", "Nombre"),
            meta: { align: "left", label: l("Name", "Nombre") },
          },
          {
            accessorKey: "plan",
            header: "Plan",
            meta: { label: "Plan" },
          },
          {
            accessorKey: "amount",
            header: l("Monthly value", "Valor mensual"),
            cell: ({ getValue }) => currency(Number(getValue())),
            meta: {
              numeric: true,
              align: "right",
              label: l("Monthly value", "Valor mensual"),
            },
          },
        ]}
        appearance={appearance}
        density={density}
        striped={striped}
        columnVisibility
        pageSize={3}
        pageSizeOptions={[3, 5, 8]}
        labels={{
          ...labels,
          columns: l("Columns", "Columnas"),
          clearSelection: l("Clear selection", "Borrar selección"),
          rowsPerPage: l("Rows per page", "Filas por página"),
        }}
      />
    </div>
  );
}

export function ComponentsTemplate() {
  const { l, locale, common: t } = useLanguage(),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("all");
  const { appearance } = useAppearance();
  const visible = componentCatalog.filter(
    (item) =>
      (category === "all" || category === item.category) &&
      `${item.name} ${l(...item.description)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="grid min-w-0 gap-7">
      <PageHeading
        eyebrow={l("The component collection", "La colección de componentes")}
        title={l("Build your visual language.", "Diseña tu lenguaje visual.")}
        description={l(
          "Refine every surface. Explore live interactions and take the configured React source with you.",
          "Afina cada superficie. Explora interacciones reales y copia el código React con tu configuración.",
        )}
        actions={
          <>
            <a
              href={publicPath(figmaUrl)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Figma
              <ArrowUpRight aria-hidden="true" />
            </a>
            <a
              href={publicPath(`/${locale}/studio/`)}
              className={buttonVariants({ size: "sm" })}
            >
              <SlidersHorizontal aria-hidden="true" />
              {l("Open Studio", "Abrir Studio")}
            </a>
          </>
        }
      />
      <Card
        appearance="glass"
        className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1.15fr] lg:items-center"
      >
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge appearance="soft">
              <Sparkles aria-hidden="true" />
              {l("Live canvas", "Lienzo en vivo")}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {paletteDisplayName(appearance.palette, l)} ·{" "}
              {appearance.theme === "dark"
                ? l("Dark", "Oscuro")
                : l("Light", "Claro")}
            </span>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            {l("One system. Your signature.", "Un sistema. Tu identidad.")}
          </h2>
          <p className="mt-2 max-w-md text-[13px] leading-6 text-muted-foreground">
            {l(
              "Choose a palette for the collection, then explore materials and effects on each specimen.",
              "Elige una paleta para la colección y explora materiales y efectos en cada componente.",
            )}
          </p>
          <AppearanceControls
            showLabel
            studioHref={`/${locale}/studio/`}
            className="mt-4 border border-border bg-surface/65"
          />
        </div>
        <PalettePicker compact />
      </Card>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-surface/55 p-3">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={l("Search components", "Buscar componentes")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={l("Find a component…", "Buscar un componente…")}
            className="pl-10"
          />
        </div>
        <Select
          aria-label={l("Component category", "Categoría de componente")}
          className="w-full sm:w-48"
          value={category}
          onValueChange={setCategory}
          options={[
            {
              value: "all",
              label: l("All components", "Todos los componentes"),
            },
            ...Object.entries(categoryLabels).map(([value, label]) => ({
              value,
              label: l(...label),
            })),
          ]}
        />
        <span
          role="status"
          className="ml-auto px-2 text-[12px] text-muted-foreground tabular-nums"
        >
          {visible.length} / {componentCatalog.length}{" "}
          {l("components", "componentes")}
        </span>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {visible.map((item) => (
          <ComponentSpecimen key={item.name} family={item.name} />
        ))}
      </div>
      {!visible.length && (
        <Empty title={t("empty")} description={t("noMatch")} />
      )}
      <p className="text-[13px] leading-7 text-muted-foreground">
        {l(
          "Palette changes apply across the collection. Specimen overrides stay local and are included in the copied example.",
          "Los cambios de paleta se aplican a toda la colección. Los ajustes de cada componente son locales y se incluyen en el ejemplo copiado.",
        )}{" "}
        <a
          href={publicPath(`/${locale}/docs/accessibility/`)}
          className="text-primary underline underline-offset-4"
        >
          {l("Accessibility notes", "Notas de accesibilidad")} →
        </a>
      </p>
    </div>
  );
}
function ComponentSpecimen({ family }: { family: ComponentFamily }) {
  const { l } = useLanguage(),
    [view, setView] = useState("preview"),
    [controlsOpen, setControlsOpen] = useState(false),
    [buttonConfig, setButtonConfig] = useState<ButtonShowcaseConfig>(
      defaultButtonShowcase,
    ),
    [overrides, setOverrides] = useState<
      Partial<Pick<AppearanceConfig, "material" | "radius" | "density">>
    >({}),
    { copy, copied } = useCopy(),
    item = componentCatalog.find((item) => item.name === family)!;
  const { appearance, setAppearance } = useAppearance();
  const chooseButtonPalette = (palette: PaletteId) => {
    const preset = palettePresets.find((item) => item.id === palette)!;
    setAppearance((current) => ({
      ...current,
      palette,
      colors: {
        primary: preset.colors[0],
        secondary: preset.colors[1],
        tertiary: preset.colors[2],
      },
      gradient: {
        ...current.gradient,
        stops: current.gradient.stops.map((stop, index) => ({
          ...stop,
          color: preset.colors[index % preset.colors.length],
        })),
      },
    }));
  };
  const specimenAppearance = useMemo(
    () => normalizeAppearance({ ...appearance, ...overrides }),
    [appearance, overrides],
  );
  const code = useMemo(
    () =>
      exportConfiguredExample(
        family === "Button"
          ? buttonShowcaseSource(buttonConfig, l)
          : componentExampleSources[family],
        specimenAppearance,
      ),
    [family, specimenAppearance, buttonConfig, l],
  );
  const controlsId = `${item.file}-${family}-appearance-controls`;
  return (
    <Card id={item.file + "-" + family} className="min-w-0 overflow-hidden">
      <CardHeader className="pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-accent font-mono text-[11px] text-accent-foreground"
            >
              {String(componentCatalog.indexOf(item) + 1).padStart(2, "0")}
            </span>
            <CardTitle>{family}</CardTitle>
          </div>
          <Badge variant="outline">{l(...categoryLabels[item.category])}</Badge>
        </div>
        <CardDescription className="mt-2">
          {l(...item.description)}
        </CardDescription>
      </CardHeader>
      <div className="grid gap-3 border-y border-border/75 bg-surface-subtle/25 px-5 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label={`${family} — ${l("Surface material", "Material de superficie")}`}
            value={overrides.material ?? "global"}
            onValueChange={(value) =>
              setOverrides((current) => {
                if (value === "global") {
                  const next = { ...current };
                  delete next.material;
                  return next;
                }
                return { ...current, material: value as Material };
              })
            }
            className="h-9 w-full text-[13px] sm:w-48"
            options={[
              {
                value: "global",
                label: `${l("Global", "Global")} · ${l(...materialLabels[appearance.material])}`,
              },
              ...Object.entries(materialLabels).map(([value, label]) => ({
                value,
                label: l(...label),
              })),
            ]}
          />
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={controlsOpen}
            aria-controls={controlsId}
            onClick={() => setControlsOpen((open) => !open)}
            className="ml-auto"
          >
            <SlidersHorizontal aria-hidden="true" />
            {l("Live controls", "Controles en vivo")}
          </Button>
        </div>
        {controlsOpen && (
          <div
            id={controlsId}
            className="grid gap-4 rounded-lg border border-border bg-surface/65 p-4 sm:grid-cols-2"
          >
            <div>
              <p className="mb-3 flex items-center justify-between text-[12px] font-medium">
                {l("Corner radius", "Radio de esquinas")}
                <span className="font-mono text-muted-foreground">
                  {specimenAppearance.radius}px
                </span>
              </p>
              <Slider
                min={0}
                max={24}
                value={specimenAppearance.radius}
                onValueChange={(radius) =>
                  setOverrides((current) => ({ ...current, radius }))
                }
                label={`${family} — ${l("Corner radius", "Radio de esquinas")}`}
              />
            </div>
            <Select
              label={l("Control density", "Densidad de controles")}
              value={specimenAppearance.density}
              onValueChange={(density) =>
                setOverrides((current) => ({
                  ...current,
                  density: density as AppearanceConfig["density"],
                }))
              }
              options={[
                { value: "comfortable", label: l("Comfortable", "Cómoda") },
                { value: "compact", label: l("Compact", "Compacta") },
              ]}
            />
            <Button
              variant="ghost"
              size="sm"
              className="justify-self-start text-muted-foreground sm:col-span-2"
              disabled={Object.keys(overrides).length === 0}
              onClick={() => setOverrides({})}
            >
              <RotateCcw aria-hidden="true" />
              {l("Use global settings", "Usar ajustes globales")}
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-2 sm:px-6">
        <div
          role="group"
          aria-label={`${family} — ${l("Example view", "Vista del ejemplo")}`}
          className="flex items-center gap-1"
        >
          {["preview", "code"].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={cn(
                "min-h-9 rounded-lg px-3 text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                view === value
                  ? "bg-accent/65 text-accent-foreground"
                  : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
              )}
            >
              {value === "preview"
                ? l("Preview", "Vista previa")
                : l("Code", "Código")}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          aria-label={`${
            copied
              ? l("Copied example", "Ejemplo copiado")
              : l("Copy example", "Copiar ejemplo")
          } ${family}`}
          onClick={() => void copy(code)}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? l("Copied", "Copiado") : l("Copy", "Copiar")}
        </Button>
      </div>
      <div className="min-h-52 min-w-0 px-5 pt-2 pb-5 sm:px-6 sm:pb-6">
        {view === "preview" ? (
          <AppearanceScope
            appearance={specimenAppearance}
            className="min-w-0 overflow-x-auto rounded-xl border border-border bg-background p-4 text-foreground sm:p-5"
          >
            <ComponentExample
              family={family}
              buttonConfig={buttonConfig}
              onButtonConfigChange={setButtonConfig}
              onButtonPaletteChange={chooseButtonPalette}
            />
          </AppearanceScope>
        ) : (
          <pre
            tabIndex={0}
            aria-label={`${family} — ${l("Configured React source", "Código React configurado")}`}
            className="max-h-[28rem] overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[12px] leading-6 whitespace-pre-wrap break-words outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <code>{code}</code>
          </pre>
        )}
      </div>
      <CardFooter className="justify-between gap-2 border-t border-border/65 pt-4 text-[11px] text-muted-foreground">
        <code className="min-w-0 break-all">
          src/components/ui/{item.file}.tsx
        </code>
        <span role="status" className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-primary"
          />
          {l(...materialLabels[specimenAppearance.material])}
        </span>
      </CardFooter>
    </Card>
  );
}
function ComponentExample({
  family,
  buttonConfig,
  onButtonConfigChange,
  onButtonPaletteChange,
}: {
  family: ComponentFamily;
  buttonConfig: ButtonShowcaseConfig;
  onButtonConfigChange: (config: ButtonShowcaseConfig) => void;
  onButtonPaletteChange: (palette: PaletteId) => void;
}) {
  const { locale, l, common: t } = useLanguage();
  const [value, setValue] = useState("pro"),
    [selected, setSelected] = useState<string | null>("next"),
    [multiple, setMultiple] = useState(["next", "figma"]),
    [checked, setChecked] = useState(true),
    [numeric, setNumeric] = useState(64),
    [otp, setOtp] = useState(""),
    [files, setFiles] = useState<File[]>([]),
    [date, setDate] = useState<Date | undefined>(new Date(2026, 9, 18)),
    [range, setRange] = useState<DateRange | undefined>(),
    [page, setPage] = useState(1),
    [open, setOpen] = useState(false);
  const router = useRouter();
  const uploadLabels = useUploadLabels(),
    images = useGalleryImages(),
    videoLabels = useVideoLabels(),
    options = [
      { value: "next", label: "Next.js" },
      { value: "react", label: "React" },
      { value: "figma", label: "Figma" },
      { value: "tailwind", label: "Tailwind CSS" },
    ];
  const feedback = () => toast.success(t("saved"));
  switch (family) {
    case "Button":
      return (
        <ButtonShowcase
          config={buttonConfig}
          onConfigChange={onButtonConfigChange}
          onPaletteChange={onButtonPaletteChange}
        />
      );
    case "ButtonGroup":
      return (
        <ButtonGroup aria-label={l("View preference", "Preferencia de vista")}>
          <Button
            size="sm"
            variant={value === "grid" ? "secondary" : "outline"}
            onClick={() => setValue("grid")}
          >
            {l("Grid", "Cuadrícula")}
          </Button>
          <Button
            size="sm"
            variant={value === "list" ? "secondary" : "outline"}
            onClick={() => setValue("list")}
          >
            {l("List", "Lista")}
          </Button>
        </ButtonGroup>
      );
    case "TextLink":
      return (
        <TextLink href={`/${locale}/docs/`} className="text-accent-foreground">
          {l("A little more context", "Un poco más de contexto")} ↗
        </TextLink>
      );
    case "Breadcrumb":
      return (
        <Breadcrumb
          label={l("Breadcrumb", "Ruta de navegación")}
          items={[
            { label: t("workspace"), href: `/${locale}/dashboard/` },
            { label: t("customers"), href: `/${locale}/customers/` },
            { label: l("Details", "Detalles") },
          ]}
        />
      );
    case "Pagination":
      return (
        <div>
          <Pagination
            page={page}
            count={5}
            onPageChange={setPage}
            label={l("Demo pages", "Páginas de ejemplo")}
            previousLabel={t("previous")}
            nextLabel={t("next")}
          />
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            {l(`Page ${page} of 5`, `Página ${page} de 5`)}
          </p>
        </div>
      );
    case "Tabs":
      return (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="details">
              {l("Details", "Detalles")}
            </TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              {l("Disabled", "Deshabilitado")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="text-[13px] leading-7 text-muted-foreground">
              {l(
                "A little clarity on your workspace.",
                "Claridad sobre tu espacio de trabajo.",
              )}
            </p>
          </TabsContent>
          <TabsContent value="details">
            <p className="text-[13px] leading-7 text-muted-foreground">
              {l(
                "Arrow keys navigate tabs. The selected panel updates below.",
                "Las flechas cambian de pestaña. El panel seleccionado se actualiza debajo.",
              )}
            </p>
          </TabsContent>
        </Tabs>
      );
    case "Sidebar":
      return (
        <Sidebar
          className="h-64 w-full rounded-lg border"
          brand={<Brand />}
          label={l("Specimen navigation", "Navegación de ejemplo")}
          groups={[
            {
              label: t("workspace"),
              items: [
                {
                  label: t("dashboard"),
                  href: `/${locale}/dashboard/`,
                  active: true,
                },
                { label: t("analytics"), href: `/${locale}/analytics/` },
                { label: t("ai"), href: `/${locale}/ai/` },
              ],
            },
          ]}
        />
      );
    case "Command":
      return (
        <>
          <Button variant="outline" onClick={() => setOpen(true)}>
            {l("Search actions", "Buscar acciones")}
            <kbd className="ml-4 text-[11px]">↵</kbd>
          </Button>
          <Command
            open={open}
            onOpenChange={setOpen}
            label={l("Example commands", "Comandos de ejemplo")}
            placeholder={l("Search actions…", "Buscar acciones…")}
            closeLabel={t("close")}
            emptyLabel={t("empty")}
            items={[
              {
                id: "save",
                label: t("save"),
                group: t("workspace"),
                onSelect: feedback,
              },
              {
                id: "docs",
                label: t("docs"),
                group: t("resources"),
                onSelect: () => router.push(`/${locale}/docs/`),
              },
            ]}
          />
        </>
      );
    case "Input":
      return (
        <div className="grid gap-4">
          <Field label={l("Email address", "Dirección de correo")}>
            <Input type="email" placeholder="you@studio.demo" />
          </Field>
          <Field
            label={l("Workspace name", "Nombre del espacio")}
            error={l(
              "Enter a workspace name.",
              "Escribe un nombre para el espacio.",
            )}
          >
            <Input
              aria-invalid
              placeholder={l("Your workspace", "Tu espacio")}
            />
          </Field>
          <Field label={l("Disabled input", "Campo deshabilitado")}>
            <Input
              disabled
              value={l("A little quiet here.", "Un poco de calma por aquí.")}
            />
          </Field>
        </div>
      );
    case "Field":
      return (
        <Field
          label={l("Email", "Correo")}
          description={l(
            "Only used as local demo state.",
            "Solo se usa como estado local.",
          )}
        >
          <Input type="email" placeholder="alex@studio.demo" />
        </Field>
      );
    case "Textarea":
      return (
        <Field label={l("About your idea", "Sobre tu idea")}>
          <Textarea
            placeholder={l(
              "A little about your next good idea…",
              "Un poco sobre tu próxima buena idea…",
            )}
            maxLength={400}
          />
        </Field>
      );
    case "Select":
      return (
        <Select
          label={l("Choose a plan", "Elige un plan")}
          value={value}
          onValueChange={setValue}
          options={[
            { value: "starter", label: "Starter" },
            { value: "pro", label: "Pro" },
            { value: "enterprise", label: "Enterprise" },
          ]}
        />
      );
    case "Combobox":
      return (
        <Combobox
          label={l("Find a framework", "Busca un framework")}
          options={options}
          value={selected}
          onValueChange={setSelected}
          emptyLabel={t("empty")}
          placeholder={l("Search…", "Buscar…")}
        />
      );
    case "MultiSelect":
      return (
        <MultiSelect
          label={l("Choose your tools", "Elige tus herramientas")}
          options={options}
          value={multiple}
          onValueChange={setMultiple}
          emptyLabel={t("empty")}
          removeLabel={l("Remove", "Eliminar")}
          keyboardHint={l(
            "Press Backspace to remove",
            "Pulsa Retroceso para eliminar",
          )}
        />
      );
    case "Checkbox":
      return (
        <div className="grid gap-4">
          <label className="flex items-center gap-3 text-[13px]">
            <Checkbox checked={checked} onCheckedChange={setChecked} />
            {l("A considered choice", "Una elección cuidada")}
          </label>
          <label className="flex items-center gap-3 text-[13px]">
            <Checkbox indeterminate checked={false} />
            {l("Mixed selection", "Selección mixta")}
          </label>
          <label className="flex items-center gap-3 text-[13px] text-muted-foreground">
            <Checkbox disabled />
            {l("Disabled", "Deshabilitado")}
          </label>
        </div>
      );
    case "RadioGroup":
      return (
        <RadioGroup
          value={value}
          onValueChange={(v) => setValue(String(v))}
          aria-label={l("Demo plan", "Plan de ejemplo")}
        >
          {["starter", "pro", "enterprise"].map((plan) => (
            <label key={plan} className="flex items-center gap-3 text-[13px]">
              <RadioGroupItem value={plan} />
              <span className="capitalize">{plan}</span>
            </label>
          ))}
        </RadioGroup>
      );
    case "Switch":
      return (
        <label className="flex items-center justify-between gap-5 text-[13px]">
          {l("Weekly summary", "Resumen semanal")}
          <Switch checked={checked} onCheckedChange={setChecked} />
        </label>
      );
    case "Slider":
      return (
        <div>
          <p className="mb-5 flex justify-between text-[13px]">
            {l("A little more intensity", "Un poco más de intensidad")}
            <span>{numeric}%</span>
          </p>
          <Slider
            value={numeric}
            onValueChange={setNumeric}
            label={l("Intensity", "Intensidad")}
          />
        </div>
      );
    case "DatePicker":
      return (
        <DatePicker
          value={date}
          onChange={setDate}
          label={l("Choose a date", "Elige una fecha")}
          locale={locale}
        />
      );
    case "DateRangePicker":
      return (
        <DateRangePicker
          value={range}
          onChange={setRange}
          label={l("Choose a range", "Elige un período")}
          locale={locale}
        />
      );
    case "InputOTP":
      return (
        <InputOTP
          value={otp}
          onChange={setOtp}
          label={l("Verification code", "Código de verificación")}
        />
      );
    case "FileUpload":
      return (
        <FileUpload
          files={files}
          onFilesChange={setFiles}
          accept="image/*,.pdf,.txt"
          labels={uploadLabels}
        />
      );
    case "Card":
      return (
        <Card>
          <CardHeader>
            <CardTitle>
              {l("A little more intention.", "Un poco más de intención.")}
            </CardTitle>
            <CardDescription>
              {l("For your next good idea.", "Para tu próxima buena idea.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[13px] leading-7">
              {l(
                "Content with a clear place to belong.",
                "Contenido con un lugar claro donde estar.",
              )}
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" onClick={feedback}>
              {l("A next step", "Un siguiente paso")}
            </Button>
          </CardFooter>
        </Card>
      );
    case "Avatar":
      return (
        <div className="grid gap-5">
          <div className="flex items-center gap-4">
            <Avatar
              name="Alex Morgan"
              src={getDemoAvatarSrc("alex-morgan")}
              size="sm"
            />
            <Avatar
              name="Isabel Torres"
              src={getDemoAvatarSrc("isabel-torres")}
            />
            <Avatar
              name="Leo Martin"
              src={getDemoAvatarSrc("leo-martin")}
              size="lg"
            />
          </div>
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Avatar name={l("New profile", "Perfil nuevo")} />
            <span className="text-xs text-muted-foreground">
              {l("Initials fallback", "Fallback con iniciales")}
            </span>
          </div>
        </div>
      );
    case "Badge":
      return (
        <div className="flex flex-wrap gap-2">
          <Badge>{l("Active", "Activo")}</Badge>
          <Badge variant="neutral">{l("Draft", "Borrador")}</Badge>
          <Badge variant="warning">{l("Pending", "Pendiente")}</Badge>
          <Badge variant="destructive">
            {l("Needs review", "Necesita revisión")}
          </Badge>
          <Badge variant="outline">{l("Considered", "Cuidado")}</Badge>
        </div>
      );
    case "Table":
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{l("Plan", "Plan")}</TableHead>
              <TableHead>{l("Seats", "Puestos")}</TableHead>
              <TableHead>{l("Status", "Estado")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {["Starter", "Pro", "Enterprise"].map((plan, i) => (
              <TableRow key={plan}>
                <TableCell>{plan}</TableCell>
                <TableCell>{[1, 5, 25][i]}</TableCell>
                <TableCell>
                  <Badge>{l("Active", "Activo")}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    case "DataTable":
      return <DataTableShowcase />;
    case "Chart":
      return (
        <Chart
          data={[
            { label: l("May", "May"), value: 28, secondary: 24 },
            { label: l("June", "Junio"), value: 34, secondary: 29 },
            { label: l("July", "Julio"), value: 32, secondary: 30 },
            { label: l("August", "Agosto"), value: 42, secondary: 34 },
          ]}
          label={l("Demo growth by month", "Crecimiento de ejemplo por mes")}
          valueLabel={l("Current", "Actual")}
          secondaryLabel={l("Previous", "Anterior")}
          height={200}
        />
      );
    case "Alert":
      return (
        <div className="grid gap-3">
          <Alert variant="success" title={t("saved")}>
            {l("Everything is up to date.", "Todo está actualizado.")}
          </Alert>
          <Alert
            variant="warning"
            title={l(
              "A little attention needed",
              "Se necesita un poco de atención",
            )}
          >
            {l(
              "Review the remaining details.",
              "Revisa los detalles pendientes.",
            )}
          </Alert>
        </div>
      );
    case "Toast":
      return (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={feedback}>
            {l("Success toast", "Mensaje de éxito")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.error(l("A simulated error.", "Un error simulado."))
            }
          >
            {l("Error toast", "Mensaje de error")}
          </Button>
        </div>
      );
    case "Tooltip":
      return (
        <Tooltip
          content={l(
            "A little context makes things clearer.",
            "Un poco de contexto da claridad.",
          )}
        >
          <Button
            variant="outline"
            aria-label={l("More information", "Más información")}
            size="icon"
          >
            <Info />
          </Button>
        </Tooltip>
      );
    case "Popover":
      return (
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            {l("A little more context", "Un poco más de contexto")}
          </PopoverTrigger>
          <PopoverContent>
            <PopoverTitle className="text-[13px] font-semibold">
              {l("A considered detail", "Un detalle cuidado")}
            </PopoverTitle>
            <PopoverDescription className="mt-2 text-[13px] leading-6 text-muted-foreground">
              {l(
                "Context, right where you need it.",
                "Contexto, justo donde lo necesitas.",
              )}
            </PopoverDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={feedback}
            >
              {t("save")}
            </Button>
          </PopoverContent>
        </Popover>
      );
    case "Dialog":
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" />}>
            {l("Open dialog", "Abrir diálogo")}
          </DialogTrigger>
          <DialogContent closeLabel={t("close")}>
            <DialogTitle>
              {l("Make a considered choice.", "Toma una decisión cuidada.")}
            </DialogTitle>
            <DialogDescription>
              {l(
                "Focus stays here until you close the dialog. Escape returns you to the trigger.",
                "El foco permanece aquí hasta cerrar el diálogo. Escape te devuelve al botón.",
              )}
            </DialogDescription>
            <Field
              className="mt-6"
              label={l("Workspace name", "Nombre del espacio")}
            >
              <Input defaultValue="Studio" />
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  feedback();
                }}
              >
                {t("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    case "Drawer":
      return (
        <Drawer>
          <DrawerTrigger render={<Button variant="outline" />}>
            {l("Open drawer", "Abrir panel")}
          </DrawerTrigger>
          <DrawerContent closeLabel={t("close")}>
            <DrawerTitle className="pr-12 text-lg font-semibold">
              {l("A little more room.", "Un poco más de espacio.")}
            </DrawerTitle>
            <DrawerDescription className="mt-3 text-[13px] leading-7 text-muted-foreground">
              {l(
                "A side sheet for focused details.",
                "Un panel lateral para detalles concretos.",
              )}
            </DrawerDescription>
            <Field
              className="mt-7"
              label={l("Project name", "Nombre del proyecto")}
            >
              <Input defaultValue="Aureform" />
            </Field>
            <DrawerClose render={<Button className="mt-6" />}>
              {t("close")}
            </DrawerClose>
          </DrawerContent>
        </Drawer>
      );
    case "DropdownMenu":
      return (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            {l("Actions", "Acciones")}
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={feedback}>{t("edit")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast(t("downloaded"))}>
              {t("export")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onClick={() =>
                toast(
                  l("Demo action selected", "Acción de ejemplo seleccionada"),
                )
              }
            >
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    case "Progress":
      return (
        <div>
          <p className="mb-3 flex justify-between text-[13px]">
            {l("Your progress", "Tu progreso")}
            <span>{numeric}%</span>
          </p>
          <Progress
            value={numeric}
            label={l("Project progress", "Progreso del proyecto")}
          />
          <Button
            className="mt-5"
            variant="outline"
            size="sm"
            onClick={() => setNumeric((numeric + 12) % 101)}
          >
            {l("Make a little progress", "Avanzar un poco")}
          </Button>
        </div>
      );
    case "Spinner":
      return <Spinner label={t("loading")} />;
    case "Skeleton":
      return (
        <div className="flex gap-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="grid flex-1 gap-3">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      );
    case "Empty":
      return (
        <Empty
          title={l("A little quiet here.", "Un poco de calma por aquí.")}
          description={l(
            "Make room for something new.",
            "Dale espacio a algo nuevo.",
          )}
          action={
            <Button size="sm" variant="outline" onClick={feedback}>
              <Plus />
              {l("Start something", "Empieza algo")}
            </Button>
          }
        />
      );
    case "Accordion":
      return (
        <Accordion defaultValue={["source"]}>
          <AccordionItem value="source">
            <AccordionTrigger>
              {l("What’s included?", "¿Qué incluye?")}
            </AccordionTrigger>
            <AccordionContent>
              {l(
                "Original source components, semantic tokens and complete application examples.",
                "Componentes originales, tokens semánticos y ejemplos completos de aplicaciones.",
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="figma">
            <AccordionTrigger>
              {l("Can I edit the design?", "¿Puedo editar el diseño?")}
            </AccordionTrigger>
            <AccordionContent>
              {l(
                "Yes. The Figma file uses native variables and reusable component instances.",
                "Sí. El archivo Figma usa variables nativas e instancias reutilizables.",
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    case "Carousel":
      return (
        <Carousel
          label={l("Original art", "Arte original")}
          previousLabel={t("previous")}
          nextLabel={t("next")}
          slideLabel={(n) => l(`Slide ${n}`, `Diapositiva ${n}`)}
          items={images.slice(0, 3).map((image) => (
            <img
              key={image.src}
              src={publicPath(image.src)}
              alt={image.alt}
              width={image.width}
              height={image.height}
              decoding="async"
              className="block aspect-[3/2] w-full object-cover"
            />
          ))}
        />
      );
    case "Gallery":
      return (
        <EditorialGallery
          images={images.slice(0, 3)}
          label={l("Demo gallery", "Galería de ejemplo")}
          closeLabel={t("close")}
        />
      );
    case "VideoPlayer":
      return (
        <VideoPlayer
          src="/assets/aureform-motion.webm"
          poster="/assets/art/quiet-forms.svg"
          captionSrc="/assets/aureform-motion.vtt"
          label={l("Aureform motion", "Animación de Aureform")}
          labels={videoLabels}
        />
      );
    case "Ribbon":
      return (
        <div className="flex flex-wrap gap-3">
          <Ribbon>{l("New release", "Nueva versión")}</Ribbon>
          <Ribbon variant="subtle">{l("Considered", "Cuidado")}</Ribbon>
          <Ribbon variant="warning">{l("Coming next", "Próximamente")}</Ribbon>
        </div>
      );
  }
}
