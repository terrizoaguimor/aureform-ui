"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Archive,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  CircleDollarSign,
  ImageIcon,
  LayoutGrid,
  List,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useCommerce } from "@/components/commerce-provider";
import { useWorkspace } from "@/components/workspace-provider";
import { useLanguage } from "@/hooks/use-language";
import { EffectSurface } from "@/components/effects/effect-surface";
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
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CommerceError,
  commerceCurrencies,
  commerceProductSchema,
  type CommerceContextValue,
  type CommerceCurrency,
  type CommerceProduct,
  type ProductImage,
  type ProductStatus,
} from "@/lib/commerce";
import { cn } from "@/lib/utils";
import {
  ProductImageEditor,
  ProductImageThumbnail,
} from "@/components/blocks/product-image-editor";

type Translate = ReturnType<typeof useLanguage>["l"];
type ProductAction = "save" | "archive" | "sync";
type ProductDraft = {
  name: string;
  sku: string;
  description: string;
  category: string;
  status: ProductStatus;
  price: string;
  currency: CommerceCurrency;
  inventory: string;
  tags: string;
  images: ProductImage[];
};
type DraftErrors = Partial<Record<keyof ProductDraft, string>>;
type EditorSection = "details" | "pricing" | "inventory" | "media";
type StockFilter = "all" | "low" | "out";

function productDraft(product: CommerceProduct): ProductDraft {
  return {
    name: product.name,
    sku: product.sku,
    description: product.description,
    category: product.category,
    status: product.status,
    price: (product.unitAmount / 100).toFixed(2),
    currency: product.currency,
    inventory: String(product.inventory),
    tags: product.tags.join(", "),
    images: product.images.map((image) => ({ ...image })),
  };
}

function priceInCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return result <= 100_000_000 ? result : null;
}

function draftTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function statusLabel(status: ProductStatus, l: Translate) {
  return {
    active: l("Active", "Activo"),
    draft: l("Draft", "Borrador"),
    archived: l("Archived", "Archivado"),
  }[status];
}

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const { l } = useLanguage();
  return (
    <Badge
      variant={
        status === "active"
          ? "default"
          : status === "draft"
            ? "warning"
            : "neutral"
      }
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          status === "active" ? "bg-primary" : "bg-current opacity-60",
        )}
      />
      {statusLabel(status, l)}
    </Badge>
  );
}

function commerceMessage(cause: unknown, l: Translate) {
  if (cause instanceof CommerceError) {
    return {
      validation: l(
        "Check the product fields and try again.",
        "Revisa los campos del producto e intenta de nuevo.",
      ),
      unavailable: l(
        "This product or workspace is no longer available. Reload the catalog.",
        "Este producto o workspace ya no está disponible. Recarga el catálogo.",
      ),
      conflict: l(
        "The product could not be updated. Check for a duplicate SKU or reload the latest version.",
        "No se pudo actualizar el producto. Revisa si el SKU está duplicado o recarga la última versión.",
      ),
      forbidden: l(
        "Your current role cannot change products.",
        "Tu rol actual no permite modificar productos.",
      ),
      provider: l(
        "The commerce service could not complete this action. Your edits are still here; try again.",
        "El servicio no pudo completar esta acción. Tus cambios siguen aquí; intenta de nuevo.",
      ),
    }[cause.code];
  }
  return l(
    "The action could not be completed. Try again.",
    "No se pudo completar la acción. Intenta de nuevo.",
  );
}

function formatProductPrice(
  amount: number,
  currency: CommerceCurrency,
  locale: string,
) {
  return new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function validateDraft(
  draft: ProductDraft,
  original: CommerceProduct,
  products: readonly CommerceProduct[],
  l: Translate,
) {
  const errors: DraftErrors = {};
  const unitAmount = priceInCents(draft.price);
  const inventory = /^\d+$/.test(draft.inventory.trim())
    ? Number(draft.inventory.trim())
    : NaN;
  const tags = draftTags(draft.tags);
  if (unitAmount === null)
    errors.price = l(
      "Enter a price from 0 to 1,000,000 with up to two decimal places.",
      "Ingresa un precio entre 0 y 1.000.000 con hasta dos decimales.",
    );
  if (!Number.isInteger(inventory) || inventory < 0 || inventory > 1_000_000)
    errors.inventory = l(
      "Enter a whole quantity from 0 to 1,000,000.",
      "Ingresa una cantidad entera entre 0 y 1.000.000.",
    );
  if (tags.length > 12 || tags.some((tag) => tag.length > 40))
    errors.tags = l(
      "Use up to 12 tags, each 40 characters or fewer.",
      "Usa hasta 12 etiquetas de máximo 40 caracteres cada una.",
    );
  if (new Set(tags.map((tag) => tag.toLowerCase())).size !== tags.length)
    errors.tags = l(
      "Each tag must be unique.",
      "Cada etiqueta debe ser única.",
    );
  if (
    products.some(
      (product) =>
        product.id !== original.id &&
        product.sku.trim().toLowerCase() === draft.sku.trim().toLowerCase(),
    )
  )
    errors.sku = l(
      "Another product already uses this SKU.",
      "Otro producto ya usa este SKU.",
    );
  const parsed = commerceProductSchema.safeParse({
    ...original,
    name: draft.name,
    sku: draft.sku,
    description: draft.description,
    category: draft.category,
    status: draft.status,
    unitAmount: unitAmount ?? NaN,
    currency: draft.currency,
    inventory,
    tags,
    images: draft.images,
    updatedAt: new Date().toISOString(),
  });
  if (!parsed.success) {
    const messages: DraftErrors = {
      name: l(
        "Use a product name with 2–140 characters.",
        "Usa un nombre de 2 a 140 caracteres.",
      ),
      sku: l(
        "Use a SKU with 2–64 characters.",
        "Usa un SKU de 2 a 64 caracteres.",
      ),
      category: l(
        "Add a category with up to 80 characters.",
        "Añade una categoría de hasta 80 caracteres.",
      ),
      description: l(
        "Keep the description under 5,001 characters.",
        "La descripción puede tener hasta 5.000 caracteres.",
      ),
      status: l("Choose a valid product status.", "Elige un estado válido."),
      currency: l("Choose USD, EUR or GBP.", "Elige USD, EUR o GBP."),
      images: l(
        "Use up to six valid images and add alt text to each.",
        "Usa hasta seis imágenes válidas con texto alternativo en cada una.",
      ),
      tags: l(
        "Use up to 12 tags, each 40 characters or fewer.",
        "Usa hasta 12 etiquetas de máximo 40 caracteres cada una.",
      ),
    };
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      const field =
        path === "unitAmount" ? "price" : (String(path) as keyof ProductDraft);
      if (!errors[field])
        errors[field] =
          messages[field] ?? l("Check this field.", "Revisa este campo.");
    }
  }
  return {
    errors,
    product: parsed.success && !Object.keys(errors).length ? parsed.data : null,
  };
}

function PersistenceNotice({ commerce }: { commerce: CommerceContextValue }) {
  const { l } = useLanguage();
  if (!commerce.persistenceError) return null;
  return (
    <Alert
      variant="warning"
      title={l(
        "Changes are kept in this session",
        "Los cambios se conservan en esta sesión",
      )}
    >
      <p>
        {l(
          "Browser storage could not be used. Retry saving before you leave. Smaller images can help if storage is full.",
          "No se pudo usar el almacenamiento del navegador. Reintenta guardar antes de salir. Las imágenes pequeñas ayudan si el espacio está lleno.",
        )}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!commerce.ready || !!commerce.busy}
        className="mt-3"
        onClick={commerce.retryPersistence}
      >
        <RefreshCw aria-hidden="true" />
        {l("Retry storage", "Reintentar guardado")}
      </Button>
    </Alert>
  );
}

function ProductLivePreview({
  draft,
  dirty,
}: {
  draft: ProductDraft;
  dirty: boolean;
}) {
  const { l, locale, number } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const image =
    draft.images.find((item) => item.id === selectedImage) ?? draft.images[0];
  const amount = priceInCents(draft.price);
  const stock = /^\d+$/.test(draft.inventory) ? Number(draft.inventory) : null;
  return (
    <aside
      aria-label={l("Live product preview", "Vista previa del producto")}
      className="min-w-0 self-start lg:sticky lg:top-0"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
          {l("Live preview", "Vista previa")}
        </span>
        <Badge variant={dirty ? "warning" : "neutral"}>
          {dirty ? l("Unsaved", "Sin guardar") : l("Saved", "Guardado")}
        </Badge>
      </div>
      <EffectSurface
        as="article"
        className="af-surface-gradient overflow-hidden rounded-2xl border border-border"
      >
        <div className="relative aspect-square overflow-hidden border-b border-border bg-surface-subtle/60">
          <ProductImageThumbnail image={image} />
          <div className="absolute top-3 left-3">
            <ProductStatusBadge status={draft.status} />
          </div>
        </div>
        <div className="grid gap-3 p-5">
          {draft.images.length > 1 && (
            <div
              role="group"
              aria-label={l("Preview images", "Imágenes de vista previa")}
              className="flex flex-wrap gap-2"
            >
              {draft.images.map((thumbnail, index) => (
                <button
                  type="button"
                  key={thumbnail.id}
                  aria-label={l(
                    `Preview image ${index + 1}`,
                    `Ver imagen ${index + 1}`,
                  )}
                  aria-pressed={image?.id === thumbnail.id}
                  onClick={() => setSelectedImage(thumbnail.id)}
                  className={cn(
                    "size-11 overflow-hidden rounded-lg border bg-surface-subtle outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    image?.id === thumbnail.id
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border",
                  )}
                >
                  <ProductImageThumbnail image={thumbnail} decorative />
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
            {draft.category.trim() || l("Uncategorized", "Sin categoría")}
          </p>
          <h3 className="text-xl leading-7 font-semibold tracking-tight break-words">
            {draft.name.trim() ||
              l("Your product name", "Nombre de tu producto")}
          </h3>
          <p className="text-[11px] break-all text-muted-foreground">
            {draft.sku.trim() || "SKU"}
          </p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {amount === null
              ? "—"
              : formatProductPrice(amount, draft.currency, locale)}
          </p>
          <p
            className={cn(
              "flex items-center gap-2 text-xs",
              stock === 0 || (stock !== null && stock <= 10)
                ? "text-warning-foreground"
                : "text-muted-foreground",
            )}
          >
            <Box aria-hidden="true" className="size-3.5" />
            {stock === null
              ? l("Set inventory", "Define el inventario")
              : stock === 0
                ? l("Out of stock", "Agotado")
                : l(
                    `${number(stock)} available`,
                    `${number(stock)} disponibles`,
                  )}
          </p>
          {draft.description.trim() && (
            <p className="line-clamp-4 text-xs leading-6 whitespace-pre-wrap break-words text-muted-foreground">
              {draft.description}
            </p>
          )}
          {draftTags(draft.tags).length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
              {draftTags(draft.tags)
                .slice(0, 12)
                .map((tag, index) => (
                  <Badge
                    variant="outline"
                    key={`${tag}-${index}`}
                    className="max-w-full truncate text-[10px]"
                  >
                    {tag}
                  </Badge>
                ))}
            </div>
          )}
        </div>
      </EffectSurface>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        {l(
          "This preview updates as you edit. Save to publish changes to your catalog.",
          "La vista previa cambia mientras editas. Guarda para actualizar el catálogo.",
        )}
      </p>
    </aside>
  );
}

function ProductDetailsDialog({
  product,
  isNew,
  onClose,
  onSaved,
}: {
  product: CommerceProduct;
  isNew: boolean;
  onClose: () => void;
  onSaved: (product: CommerceProduct, action: ProductAction) => void;
}) {
  const commerce = useCommerce();
  const { l } = useLanguage();
  const formId = useId();
  const [original, setOriginal] = useState(product);
  const [creating, setCreating] = useState(isNew);
  const [draft, setDraft] = useState(() => productDraft(product));
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(productDraft(product)),
  );
  const [activeTab, setActiveTab] = useState<EditorSection>("details");
  const [errors, setErrors] = useState<DraftErrors>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [failedAction, setFailedAction] = useState<ProductAction | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<ProductAction | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [closeNotice, setCloseNotice] = useState<string | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(draft) !== baseline;
  const blocked =
    !commerce.canWrite || !commerce.ready || !!commerce.busy || !!pending;
  const categories = [
    ...new Set(commerce.products.map((item) => item.category)),
  ].sort();
  const connected = !!original.stripeProductId && !!original.stripePriceId;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!mediaBusy && !pending && !commerce.busy) setCloseNotice(null);
  }, [mediaBusy, pending, commerce.busy]);

  const update = <K extends keyof ProductDraft>(
    field: K,
    value: ProductDraft[K],
  ) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setSuccess(null);
    setActionError(null);
    setFailedAction(null);
  };
  const close = () => {
    if (inFlight.current || mediaBusy) {
      setCloseNotice(
        l(
          "Wait for the current action to finish, or close the image editor first.",
          "Espera a que termine la acción actual o cierra primero el editor de imágenes.",
        ),
      );
      return;
    }
    if (dirty) setDiscard(true);
    else onClose();
  };
  const runAction = async (action: ProductAction) => {
    if (inFlight.current || blocked || mediaBusy) return;
    if (action !== "save" && (creating || dirty)) return;
    let candidate = original;
    if (action === "save") {
      const validated = validateDraft(draft, original, commerce.products, l);
      setErrors(validated.errors);
      if (!validated.product) {
        const fields = Object.keys(validated.errors);
        const section: EditorSection = fields.some((field) =>
          ["name", "sku", "description", "category", "status", "tags"].includes(
            field,
          ),
        )
          ? "details"
          : fields.some((field) => ["price", "currency"].includes(field))
            ? "pricing"
            : fields.includes("inventory")
              ? "inventory"
              : "media";
        setActiveTab(section);
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      candidate = validated.product;
    }
    inFlight.current = true;
    setPending(action);
    setActionError(null);
    setFailedAction(null);
    setSuccess(null);
    setConfirmArchive(false);
    try {
      const saved =
        action === "save"
          ? await commerce.saveProduct(candidate)
          : action === "archive"
            ? await commerce.archiveProduct(original.id)
            : await commerce.syncProduct(original.id);
      if (!mounted.current) return;
      const next = productDraft(saved);
      setOriginal(saved);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setCreating(false);
      setErrors({});
      setSuccess(
        action === "save"
          ? l(
              "Product saved. Your catalog is up to date.",
              "Producto guardado. El catálogo está actualizado.",
            )
          : action === "archive"
            ? l(
                "Product archived. You can reactivate it from Details.",
                "Producto archivado. Puedes reactivarlo en Detalles.",
              )
            : commerce.mode === "mock"
              ? l(
                  "Mock sync complete. The product and price are linked in this demo.",
                  "Sincronización de prueba completada. El producto y precio están vinculados en esta demo.",
                )
              : l(
                  "Stripe sync complete. The product and price are linked.",
                  "Sincronización con Stripe completada. El producto y precio están vinculados.",
                ),
      );
      onSaved(saved, action);
    } catch (cause) {
      if (mounted.current) {
        setActionError(commerceMessage(cause, l));
        setFailedAction(action);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(null);
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction("save");
  };
  const sectionLabels: {
    value: EditorSection;
    label: string;
    icon: typeof Tag;
  }[] = [
    { value: "details", label: l("Details", "Detalles"), icon: Tag },
    {
      value: "pricing",
      label: l("Pricing", "Precios"),
      icon: CircleDollarSign,
    },
    { value: "inventory", label: l("Inventory", "Inventario"), icon: Box },
    { value: "media", label: l("Media", "Imágenes"), icon: ImageIcon },
  ];
  const fieldId = (field: string) => `${formId}-${field}`;

  return (
    <>
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
          closeLabel={l("Close product editor", "Cerrar editor del producto")}
          className="grid h-[min(900px,94dvh)] max-h-[94dvh] w-[calc(100%-16px)] max-w-[1180px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl p-0"
        >
          <div className="af-surface-gradient border-b border-border px-4 py-5 sm:px-7">
            <div className="mb-2 flex flex-wrap items-center gap-2 pr-9">
              <span className="text-[10px] font-semibold tracking-[.12em] text-primary uppercase">
                {l("Product workspace", "Workspace de productos")}
              </span>
              <ProductStatusBadge status={draft.status} />
              {!commerce.canWrite && (
                <Badge variant="outline">
                  <Shield aria-hidden="true" />
                  {l("Read only", "Solo lectura")}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl sm:text-2xl">
              {creating
                ? l("Create a product", "Crear un producto")
                : commerce.canWrite
                  ? l("Edit product", "Editar producto")
                  : l("Product details", "Detalles del producto")}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {creating
                ? l(
                    "Bring a new product into your collection.",
                    "Añade un nuevo producto a tu colección.",
                  )
                : original.name}
            </DialogDescription>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-7">
            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_350px]">
              <div className="grid min-w-0 content-start gap-4">
                {!commerce.canWrite && (
                  <Alert title={l("Read-only access", "Acceso de lectura")}>
                    {l(
                      "You can inspect products and images. An administrator can make changes.",
                      "Puedes consultar productos e imágenes. Un administrador puede hacer cambios.",
                    )}
                  </Alert>
                )}
                <PersistenceNotice commerce={commerce} />
                {actionError && (
                  <Alert
                    variant="destructive"
                    title={l(
                      "Product could not be updated",
                      "No se pudo actualizar el producto",
                    )}
                  >
                    <p>{actionError}</p>
                    {failedAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        disabled={blocked || mediaBusy}
                        onClick={() => void runAction(failedAction)}
                      >
                        {l("Try again", "Intentar de nuevo")}
                      </Button>
                    )}
                  </Alert>
                )}
                {success && <Alert variant="success" title={success} />}
                {!!Object.keys(errors).length && (
                  <div
                    ref={summaryRef}
                    tabIndex={-1}
                    role="alert"
                    className="rounded-xl border border-destructive-foreground/25 bg-destructive p-4 text-xs text-destructive-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="font-semibold">
                      {l(
                        "A few details need attention",
                        "Revisa algunos detalles",
                      )}
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {Object.entries(errors).map(([field, message]) => (
                        <li key={field}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <form
                  id={formId}
                  onSubmit={submit}
                  noValidate
                  className="min-w-0"
                >
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                      setActiveTab(String(value) as EditorSection)
                    }
                  >
                    <TabsList
                      aria-label={l(
                        "Product sections",
                        "Secciones del producto",
                      )}
                      className="grid w-full grid-cols-4 gap-0.5"
                    >
                      {sectionLabels.map(({ value, label, icon: Icon }) => (
                        <TabsTrigger
                          key={value}
                          value={value}
                          className="min-w-0 gap-1.5 px-1.5 text-[11px] sm:px-3 sm:text-[13px]"
                        >
                          <Icon
                            aria-hidden="true"
                            className="hidden sm:block"
                          />
                          {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <TabsContent value="details" keepMounted>
                      <fieldset
                        disabled={blocked}
                        className="grid min-w-0 gap-5"
                      >
                        <Field
                          htmlFor={fieldId("name")}
                          label={l("Product name", "Nombre del producto")}
                          error={errors.name}
                        >
                          <Input
                            autoComplete="off"
                            name="name"
                            value={draft.name}
                            maxLength={140}
                            placeholder={l(
                              "e.g. Forma desk lamp",
                              "Ej. Lámpara Forma",
                            )}
                            onChange={(event) =>
                              update("name", event.target.value)
                            }
                          />
                        </Field>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field
                            htmlFor={fieldId("sku")}
                            label="SKU"
                            error={errors.sku}
                            description={l(
                              "A unique reference for this product.",
                              "Una referencia única para este producto.",
                            )}
                          >
                            <Input
                              name="sku"
                              autoComplete="off"
                              value={draft.sku}
                              maxLength={64}
                              placeholder="FRM-LMP-01"
                              onChange={(event) =>
                                update("sku", event.target.value)
                              }
                            />
                          </Field>
                          <Field
                            htmlFor={fieldId("category")}
                            label={l("Category", "Categoría")}
                            error={errors.category}
                          >
                            <Input
                              name="category"
                              list={fieldId("categories")}
                              autoComplete="off"
                              value={draft.category}
                              maxLength={80}
                              placeholder={l(
                                "Choose or create a category",
                                "Elige o crea una categoría",
                              )}
                              onChange={(event) =>
                                update("category", event.target.value)
                              }
                            />
                          </Field>
                          <datalist id={fieldId("categories")}>
                            {categories.map((category) => (
                              <option key={category} value={category} />
                            ))}
                          </datalist>
                        </div>
                        <Field
                          htmlFor={fieldId("description")}
                          label={l("Description", "Descripción")}
                          error={errors.description}
                          description={l(
                            `${draft.description.length}/5,000 characters`,
                            `${draft.description.length}/5.000 caracteres`,
                          )}
                        >
                          <Textarea
                            name="description"
                            value={draft.description}
                            maxLength={5000}
                            placeholder={l(
                              "Materials, design and what makes it special…",
                              "Materiales, diseño y lo que lo hace especial…",
                            )}
                            className="min-h-36"
                            onChange={(event) =>
                              update("description", event.target.value)
                            }
                          />
                        </Field>
                        <Field
                          htmlFor={fieldId("status")}
                          label={l("Status", "Estado")}
                          error={errors.status}
                          description={l(
                            "Active products are available for new orders.",
                            "Los productos activos están disponibles para nuevos pedidos.",
                          )}
                        >
                          <Select
                            value={draft.status}
                            disabled={blocked}
                            options={(
                              ["active", "draft", "archived"] as ProductStatus[]
                            ).map((status) => ({
                              value: status,
                              label: statusLabel(status, l),
                            }))}
                            onValueChange={(status) =>
                              update("status", status as ProductStatus)
                            }
                          />
                        </Field>
                        <Field
                          htmlFor={fieldId("tags")}
                          label={l("Tags", "Etiquetas")}
                          error={errors.tags}
                          description={l(
                            "Separate tags with commas. Up to 12 tags, 40 characters each.",
                            "Separa las etiquetas con comas. Hasta 12 etiquetas de 40 caracteres cada una.",
                          )}
                        >
                          <Input
                            name="tags"
                            autoComplete="off"
                            value={draft.tags}
                            maxLength={514}
                            placeholder={l(
                              "Studio collection, Handmade",
                              "Colección Studio, Hecho a mano",
                            )}
                            onChange={(event) =>
                              update("tags", event.target.value)
                            }
                          />
                        </Field>
                      </fieldset>
                    </TabsContent>
                    <TabsContent value="pricing" keepMounted>
                      <fieldset disabled={blocked} className="grid gap-5">
                        <div className="rounded-xl border border-border bg-surface-subtle/40 p-5">
                          <p className="mb-1 text-sm font-semibold">
                            {l(
                              "A clear price for every product",
                              "Un precio claro para cada producto",
                            )}
                          </p>
                          <p className="text-xs leading-6 text-muted-foreground">
                            {l(
                              "Set the unit price and currency. Price changes apply to future purchases.",
                              "Define el precio unitario y la moneda. Los cambios se aplican a compras futuras.",
                            )}
                          </p>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px]">
                          <Field
                            htmlFor={fieldId("price")}
                            label={l("Unit price", "Precio unitario")}
                            error={errors.price}
                          >
                            <Input
                              name="price"
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              value={draft.price}
                              placeholder="148.00"
                              className="h-12 text-lg tabular-nums"
                              onChange={(event) =>
                                update("price", event.target.value)
                              }
                            />
                          </Field>
                          <Field
                            htmlFor={fieldId("currency")}
                            label={l("Currency", "Moneda")}
                            error={errors.currency}
                          >
                            <Select
                              value={draft.currency}
                              disabled={blocked}
                              className="h-12"
                              options={commerceCurrencies.map((currency) => ({
                                value: currency,
                                label: currency.toUpperCase(),
                              }))}
                              onValueChange={(currency) =>
                                update("currency", currency as CommerceCurrency)
                              }
                            />
                          </Field>
                        </div>
                        <Alert
                          title={l(
                            "Purchase history stays accurate",
                            "El historial de compras se conserva",
                          )}
                        >
                          {l(
                            "Existing orders keep the price captured at purchase. The catalog uses your latest saved price.",
                            "Los pedidos existentes conservan el precio de la compra. El catálogo usa el último precio guardado.",
                          )}
                        </Alert>
                      </fieldset>
                    </TabsContent>
                    <TabsContent value="inventory" keepMounted>
                      <fieldset disabled={blocked} className="grid gap-5">
                        <div className="rounded-xl border border-border bg-surface-subtle/40 p-5">
                          <div className="mb-3 flex items-center gap-2 text-primary">
                            <Box aria-hidden="true" className="size-5" />
                            <span className="text-sm font-semibold">
                              {l("Inventory on hand", "Inventario disponible")}
                            </span>
                          </div>
                          <p className="text-xs leading-6 text-muted-foreground">
                            {l(
                              "Keep the quantity available for new orders up to date. A quantity of zero marks the product out of stock.",
                              "Mantén actualizada la cantidad disponible para nuevos pedidos. Una cantidad de cero indica que el producto está agotado.",
                            )}
                          </p>
                        </div>
                        <Field
                          htmlFor={fieldId("inventory")}
                          label={l("Available quantity", "Cantidad disponible")}
                          error={errors.inventory}
                          description={l(
                            "Whole units, from 0 to 1,000,000.",
                            "Unidades enteras, de 0 a 1.000.000.",
                          )}
                        >
                          <Input
                            name="inventory"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={draft.inventory}
                            maxLength={7}
                            className="h-12 max-w-xs text-lg tabular-nums"
                            onChange={(event) =>
                              update("inventory", event.target.value)
                            }
                          />
                        </Field>
                        <div className="rounded-lg border border-border px-4 py-3 text-xs text-muted-foreground">
                          {l(
                            "Stock alerts highlight active products with ten units or fewer.",
                            "Las alertas destacan productos activos con diez unidades o menos.",
                          )}
                        </div>
                      </fieldset>
                    </TabsContent>
                    <TabsContent value="media" keepMounted>
                      {errors.images && (
                        <p
                          role="alert"
                          className="mb-4 text-xs text-destructive-foreground"
                        >
                          {errors.images}
                        </p>
                      )}
                      <ProductImageEditor
                        images={draft.images}
                        productName={draft.name}
                        disabled={blocked}
                        onBusyChange={setMediaBusy}
                        onChange={(images) => update("images", images)}
                      />
                    </TabsContent>
                  </Tabs>
                </form>
                <div className="mt-2 rounded-xl border border-border bg-surface-subtle/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-semibold">
                        <RefreshCw
                          aria-hidden="true"
                          className="size-3.5 text-primary"
                        />
                        {commerce.mode === "mock"
                          ? l("Mock product sync", "Sincronización de prueba")
                          : l(
                              "Stripe product sync",
                              "Sincronización con Stripe",
                            )}
                      </p>
                      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                        {creating
                          ? l(
                              "Create this product before syncing.",
                              "Crea este producto antes de sincronizar.",
                            )
                          : dirty
                            ? l(
                                "Save your changes before syncing.",
                                "Guarda los cambios antes de sincronizar.",
                              )
                            : connected
                              ? l(
                                  "Product and price linked.",
                                  "Producto y precio vinculados.",
                                )
                              : original.stripeProductId
                                ? l(
                                    "Product linked; price sync pending.",
                                    "Producto vinculado; precio pendiente.",
                                  )
                                : l(
                                    "This product has not been synced yet.",
                                    "Este producto aún no se ha sincronizado.",
                                  )}
                      </p>
                      {commerce.mode === "mock" && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {l(
                            "Runs locally. No external charges.",
                            "Se ejecuta localmente. Sin cargos externos.",
                          )}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={pending === "sync"}
                      disabled={blocked || creating || dirty || mediaBusy}
                      onClick={() => void runAction("sync")}
                    >
                      {connected
                        ? l("Sync again", "Sincronizar de nuevo")
                        : commerce.mode === "mock"
                          ? l("Run mock sync", "Sincronizar prueba")
                          : l("Sync with Stripe", "Sincronizar con Stripe")}
                    </Button>
                  </div>
                </div>
                {confirmArchive && (
                  <Alert
                    variant="warning"
                    title={l(
                      "Archive this product?",
                      "¿Archivar este producto?",
                    )}
                  >
                    <p>
                      {l(
                        "It will remain in your catalog and purchase history, and will no longer be available for new orders.",
                        "Se conservará en el catálogo y el historial, y dejará de estar disponible para nuevos pedidos.",
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmArchive(false)}
                      >
                        {l("Keep product", "Conservar producto")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={blocked || dirty || mediaBusy}
                        onClick={() => void runAction("archive")}
                      >
                        {l("Archive product", "Archivar producto")}
                      </Button>
                    </div>
                  </Alert>
                )}
                {closeNotice && (
                  <p role="status" className="text-xs text-warning-foreground">
                    {closeNotice}
                  </p>
                )}
              </div>
              <ProductLivePreview draft={draft} dirty={dirty || creating} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-4 sm:px-7">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {!creating &&
                original.status !== "archived" &&
                commerce.canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive-foreground"
                    disabled={blocked || dirty || mediaBusy}
                    loading={pending === "archive"}
                    onClick={() => setConfirmArchive(true)}
                  >
                    <Archive aria-hidden="true" />
                    {l("Archive", "Archivar")}
                  </Button>
                )}
              <span role="status" className="text-[11px] text-muted-foreground">
                {pending
                  ? l("Updating product…", "Actualizando producto…")
                  : mediaBusy
                    ? l(
                        "Image editor is open or processing…",
                        "Editor de imágenes abierto o procesando…",
                      )
                    : dirty
                      ? l(
                          "You have unsaved changes",
                          "Tienes cambios sin guardar",
                        )
                      : creating
                        ? l(
                            "New product · not saved",
                            "Producto nuevo · sin guardar",
                          )
                        : l("All changes saved", "Todos los cambios guardados")}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!!pending || mediaBusy}
                onClick={close}
              >
                {dirty ? l("Cancel", "Cancelar") : l("Close", "Cerrar")}
              </Button>
              {commerce.canWrite && (
                <Button
                  type="submit"
                  form={formId}
                  loading={pending === "save"}
                  disabled={blocked || mediaBusy || (!dirty && !creating)}
                >
                  <Check aria-hidden="true" />
                  {creating
                    ? l("Create product", "Crear producto")
                    : l("Save changes", "Guardar cambios")}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent closeLabel={l("Keep editing", "Seguir editando")}>
          <DialogTitle>
            {l("Discard unsaved changes?", "¿Descartar cambios sin guardar?")}
          </DialogTitle>
          <DialogDescription>
            {l(
              "The changes to this product have not been saved. You can keep editing or discard this draft.",
              "Los cambios del producto no se han guardado. Puedes seguir editando o descartar este borrador.",
            )}
          </DialogDescription>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDiscard(false)}>
              {l("Keep editing", "Seguir editando")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDiscard(false);
                onClose();
              }}
            >
              {l("Discard changes", "Descartar cambios")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CatalogWorkspace({ workspaceName }: { workspaceName: string }) {
  const commerce = useCommerce();
  const { l, locale, number, date } = useLanguage();
  const headingId = useId();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [editor, setEditor] = useState<{
    product: CommerceProduct;
    isNew: boolean;
    instance: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryProductId, setRetryProductId] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState<string | null>(null);
  const actionPending = useRef(false);
  const mounted = useRef(false);
  const locked = !commerce.ready || !!commerce.busy || !!localBusy;
  const categories = [
    ...new Set(commerce.products.map((product) => product.category)),
  ].sort((a, b) => a.localeCompare(b, locale));
  const counts = {
    all: commerce.products.length,
    active: commerce.products.filter((product) => product.status === "active")
      .length,
    draft: commerce.products.filter((product) => product.status === "draft")
      .length,
    archived: commerce.products.filter(
      (product) => product.status === "archived",
    ).length,
    low: commerce.products.filter(
      (product) => product.status === "active" && product.inventory <= 10,
    ).length,
  };
  const hasFilters =
    !!query.trim() || category !== "all" || status !== "all" || stock !== "all";
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return commerce.products
      .filter((product) => {
        if (status !== "all" && product.status !== status) return false;
        if (category !== "all" && product.category !== category) return false;
        if (
          stock === "low" &&
          (product.status !== "active" || product.inventory > 10)
        )
          return false;
        if (
          stock === "out" &&
          (product.status !== "active" || product.inventory !== 0)
        )
          return false;
        return (
          !needle ||
          [
            product.name,
            product.sku,
            product.category,
            product.description,
            ...product.tags,
          ].some((value) => value.toLocaleLowerCase(locale).includes(needle))
        );
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name, locale);
        if (sort === "price")
          return (
            a.currency.localeCompare(b.currency) ||
            a.unitAmount - b.unitAmount ||
            a.name.localeCompare(b.name, locale)
          );
        if (sort === "inventory")
          return (
            a.inventory - b.inventory || a.name.localeCompare(b.name, locale)
          );
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [commerce.products, query, category, status, stock, sort, locale]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setStatus("all");
    setStock("all");
  };
  const openProduct = (product: CommerceProduct) => {
    if (!commerce.ready) return;
    setEditor({ product, isNew: false, instance: crypto.randomUUID() });
  };
  const createProduct = () => {
    if (locked || !commerce.canWrite || commerce.products.length >= 500) return;
    setEditor({
      isNew: true,
      instance: crypto.randomUUID(),
      product: {
        id: `prd-${crypto.randomUUID()}`,
        name: "",
        sku: "",
        description: "",
        category: "",
        status: "draft",
        unitAmount: 0,
        currency: "usd",
        inventory: 0,
        images: [],
        tags: [],
        updatedAt: new Date().toISOString(),
      },
    });
  };
  const sync = async (id: string) => {
    if (locked || !commerce.canWrite || actionPending.current) return;
    actionPending.current = true;
    setLocalBusy(id);
    setNotice(null);
    setActionError(null);
    setRetryProductId(null);
    try {
      const saved = await commerce.syncProduct(id);
      if (mounted.current)
        setNotice(
          commerce.mode === "mock"
            ? l(
                `${saved.name}: mock sync complete.`,
                `${saved.name}: sincronización de prueba completada.`,
              )
            : l(
                `${saved.name}: Stripe sync complete.`,
                `${saved.name}: sincronización con Stripe completada.`,
              ),
        );
    } catch (cause) {
      if (mounted.current) {
        setActionError(commerceMessage(cause, l));
        setRetryProductId(id);
      }
    } finally {
      actionPending.current = false;
      if (mounted.current) setLocalBusy(null);
    }
  };
  const reload = async () => {
    if (commerce.busy || localBusy || actionPending.current) return;
    actionPending.current = true;
    setLocalBusy("reload");
    setActionError(null);
    try {
      await commerce.reload();
    } catch (cause) {
      if (mounted.current) setActionError(commerceMessage(cause, l));
    } finally {
      actionPending.current = false;
      if (mounted.current) setLocalBusy(null);
    }
  };
  const stockLabel = (product: CommerceProduct) =>
    product.inventory === 0
      ? l("Out of stock", "Agotado")
      : product.inventory <= 10
        ? l(
            `${number(product.inventory)} left · low stock`,
            `${number(product.inventory)} disponibles · stock bajo`,
          )
        : l(
            `${number(product.inventory)} in stock`,
            `${number(product.inventory)} disponibles`,
          );
  const overview = [
    {
      key: "all",
      label: l("All products", "Todos los productos"),
      count: counts.all,
      icon: Package,
      detail: l("Your full collection", "Toda tu colección"),
      active: status === "all" && stock === "all",
      action: () => {
        setStatus("all");
        setStock("all");
      },
    },
    {
      key: "active",
      label: l("Active", "Activos"),
      count: counts.active,
      icon: Check,
      detail: l("Available for orders", "Disponibles para pedidos"),
      active: status === "active" && stock === "all",
      action: () => {
        setStatus("active");
        setStock("all");
      },
    },
    {
      key: "draft",
      label: l("Drafts", "Borradores"),
      count: counts.draft,
      icon: Pencil,
      detail: l("Work in progress", "En preparación"),
      active: status === "draft" && stock === "all",
      action: () => {
        setStatus("draft");
        setStock("all");
      },
    },
    {
      key: "low",
      label: l("Stock alerts", "Alertas de stock"),
      count: counts.low,
      icon: Box,
      detail: l("10 units or fewer", "10 unidades o menos"),
      active: stock === "low",
      action: () => {
        setStatus("active");
        setStock("low");
      },
    },
  ];
  const problem =
    actionError || (commerce.error ? commerceMessage(commerce.error, l) : null);

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={!!commerce.busy || !!localBusy}
      className="grid min-w-0 gap-5 sm:gap-6"
      data-slot="products-manager"
    >
      <EffectSurface
        as="section"
        className="af-surface-gradient relative overflow-hidden rounded-2xl border border-border p-5 sm:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-primary/8 blur-3xl"
        />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold tracking-[.12em] text-primary uppercase">
                {l("Commerce", "Comercio")}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-3 text-muted-foreground"
              />
              <span className="truncate text-[11px] text-muted-foreground">
                {workspaceName}
              </span>
            </div>
            <h1
              id={headingId}
              className="text-[28px] leading-tight font-semibold tracking-[-.035em] sm:text-[32px]"
            >
              {l("Your product collection", "Tu colección de productos")}
            </h1>
            <p className="mt-2 max-w-lg text-xs leading-6 text-muted-foreground">
              {l(
                "Shape your catalog, refine every detail, and keep products ready for their next order.",
                "Cuida tu catálogo, afina cada detalle y prepara tus productos para el próximo pedido.",
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Badge variant="outline" className="py-1.5">
              {commerce.mode === "mock"
                ? l("Local demo", "Demo local")
                : l("Stripe connected", "Stripe conectado")}
            </Badge>
            <Button
              type="button"
              appearance="gradient"
              disabled={
                locked || !commerce.canWrite || commerce.products.length >= 500
              }
              onClick={createProduct}
            >
              <Plus aria-hidden="true" />
              {l("New product", "Nuevo producto")}
            </Button>
          </div>
        </div>
      </EffectSurface>

      {!commerce.canWrite && (
        <Alert title={l("Read-only catalog", "Catálogo de solo lectura")}>
          {l(
            "Your role can view the collection and inspect product details. An administrator can help with edits.",
            "Tu rol permite consultar la colección y los detalles. Un administrador puede ayudarte a editar.",
          )}
        </Alert>
      )}
      <PersistenceNotice commerce={commerce} />
      {problem && (
        <Alert
          variant="destructive"
          title={l(
            "The catalog needs attention",
            "El catálogo necesita atención",
          )}
        >
          <p>{problem}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={!!commerce.busy || !!localBusy}
            onClick={() =>
              void (retryProductId ? sync(retryProductId) : reload())
            }
          >
            <RefreshCw aria-hidden="true" />
            {retryProductId
              ? l("Retry sync", "Reintentar sincronización")
              : l("Reload catalog", "Recargar catálogo")}
          </Button>
        </Alert>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-primary/20 bg-accent/40 px-4 py-3 text-xs text-accent-foreground"
        >
          <span className="flex items-center gap-2">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            {notice}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={l("Dismiss update", "Cerrar aviso")}
            onClick={() => setNotice(null)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {overview.map(
          ({ key, label, count, icon: Icon, detail, active, action }) => (
            <EffectSurface asChild key={key} className="af-hover-card">
              <button
                type="button"
                disabled={!commerce.ready}
                aria-pressed={active}
                onClick={action}
                className={cn(
                  "min-w-0 rounded-xl border bg-surface p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:p-5",
                  active ? "border-primary/40" : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {label}
                  </span>
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0",
                      key === "low" && count > 0
                        ? "text-warning-foreground"
                        : "text-primary",
                    )}
                  />
                </div>
                {commerce.ready ? (
                  <p className="mt-3 text-[28px] leading-none font-semibold tracking-tight tabular-nums">
                    {number(count)}
                  </p>
                ) : (
                  <Skeleton className="mt-3 h-7 w-12" />
                )}
                <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                  {detail}
                </p>
              </button>
            </EffectSurface>
          ),
        )}
      </div>

      <div className="grid min-w-0 gap-4 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label={l("Filter by product status", "Filtrar por estado")}
            className="flex max-w-full flex-wrap gap-1"
          >
            {(["all", "active", "draft", "archived"] as const).map((value) => (
              <Button
                type="button"
                key={value}
                size="sm"
                variant={status === value ? "secondary" : "ghost"}
                aria-pressed={status === value}
                disabled={!commerce.ready}
                onClick={() => setStatus(value)}
              >
                {value === "all" ? l("All", "Todos") : statusLabel(value, l)}
                <span className="rounded-md bg-surface-subtle px-1.5 text-[10px] tabular-nums">
                  {counts[value]}
                </span>
              </Button>
            ))}
          </div>
          <div
            role="group"
            aria-label={l("Catalog view", "Vista del catálogo")}
            className="flex shrink-0 gap-1 rounded-lg border border-border bg-surface-subtle/50 p-1"
          >
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={l("Grid view", "Vista de cuadrícula")}
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid aria-hidden="true" />
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={l("Table view", "Vista de tabla")}
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <List aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_190px]">
          <div className="relative min-w-0">
            <label htmlFor={searchId} className="sr-only">
              {l("Search products", "Buscar productos")}
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={searchId}
              type="search"
              value={query}
              disabled={!commerce.ready}
              placeholder={l(
                "Search name, SKU or tag…",
                "Buscar nombre, SKU o etiqueta…",
              )}
              className="pr-4 pl-10"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select
            aria-label={l("Filter by category", "Filtrar por categoría")}
            value={category}
            disabled={!commerce.ready}
            options={[
              {
                value: "all",
                label: l("All categories", "Todas las categorías"),
              },
              ...categories.map((item) => ({ value: item, label: item })),
            ]}
            onValueChange={setCategory}
          />
          <Select
            aria-label={l("Filter by inventory", "Filtrar por inventario")}
            value={stock}
            disabled={!commerce.ready}
            options={[
              { value: "all", label: l("All inventory", "Todo el inventario") },
              { value: "low", label: l("Low stock · ≤10", "Stock bajo · ≤10") },
              { value: "out", label: l("Out of stock", "Agotados") },
            ]}
            onValueChange={(value) => setStock(value as StockFilter)}
          />
          <Select
            aria-label={l("Sort products", "Ordenar productos")}
            value={sort}
            disabled={!commerce.ready}
            options={[
              {
                value: "recent",
                label: l("Recently updated", "Actualizados primero"),
              },
              { value: "name", label: l("Name · A–Z", "Nombre · A–Z") },
              {
                value: "price",
                label: l("Price · low to high", "Precio · menor a mayor"),
              },
              {
                value: "inventory",
                label: l("Stock · low to high", "Stock · menor a mayor"),
              },
            ]}
            onValueChange={setSort}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p role="status" className="text-[11px] text-muted-foreground">
            {commerce.ready
              ? l(
                  `${number(filtered.length)} of ${number(counts.all)} products`,
                  `${number(filtered.length)} de ${number(counts.all)} productos`,
                )
              : l("Loading your catalog…", "Cargando tu catálogo…")}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X aria-hidden="true" />
              {l("Clear filters", "Quitar filtros")}
            </Button>
          )}
        </div>
      </div>

      {!commerce.ready ? (
        <div
          role="status"
          aria-label={l("Loading products", "Cargando productos")}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="grid gap-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
          <span className="sr-only">
            {l("Loading products", "Cargando productos")}
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <EffectSurface className="af-surface-gradient grid place-items-center gap-3 rounded-2xl border border-border px-5 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-border bg-surface-subtle text-primary">
            {hasFilters ? (
              <SlidersHorizontal aria-hidden="true" className="size-6" />
            ) : (
              <Package aria-hidden="true" className="size-6" />
            )}
          </span>
          <h3 className="mt-1 text-lg font-semibold">
            {hasFilters
              ? l("No matching products", "No hay productos coincidentes")
              : l("Start your collection", "Comienza tu colección")}
          </h3>
          <p className="max-w-md text-xs leading-6 text-muted-foreground">
            {hasFilters
              ? l(
                  "Try another name, SKU, category or status to find what you need.",
                  "Prueba otro nombre, SKU, categoría o estado para encontrar lo que buscas.",
                )
              : l(
                  "Create your first product and give it a price, inventory and a cover image.",
                  "Crea tu primer producto y añade precio, inventario e imagen de portada.",
                )}
          </p>
          {hasFilters ? (
            <Button variant="outline" className="mt-2" onClick={resetFilters}>
              {l("Clear filters", "Quitar filtros")}
            </Button>
          ) : (
            commerce.canWrite && (
              <Button
                className="mt-2"
                disabled={locked}
                onClick={createProduct}
              >
                <Plus aria-hidden="true" />
                {l("Create product", "Crear producto")}
              </Button>
            )
          )}
        </EffectSurface>
      ) : view === "grid" ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((product) => (
            <EffectSurface
              as="article"
              key={product.id}
              className="af-hover-card group min-w-0 overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="relative block aspect-[4/3] w-full overflow-hidden border-b border-border bg-surface-subtle/60">
                <ProductImageThumbnail image={product.images[0]} />
                <div className="pointer-events-none absolute top-3 left-3">
                  <ProductStatusBadge status={product.status} />
                </div>
                <button
                  type="button"
                  aria-label={l(
                    `Open ${product.name}`,
                    `Abrir ${product.name}`,
                  )}
                  onClick={() => openProduct(product)}
                  className="absolute inset-0 block size-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span
                    aria-hidden="true"
                    className="absolute right-3 bottom-3 grid size-8 place-items-center rounded-full border border-border bg-surface/90 text-primary shadow-sm"
                  >
                    <ArrowRight className="size-4" />
                  </span>
                </button>
              </div>
              <div className="grid min-w-0 gap-3 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-semibold tracking-wide text-primary uppercase">
                    {product.category}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {product.sku}
                  </span>
                </div>
                <h3
                  className="truncate text-[15px] font-semibold tracking-tight"
                  title={product.name}
                >
                  {product.name}
                </h3>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-lg font-semibold tracking-tight tabular-nums">
                    {formatProductPrice(
                      product.unitAmount,
                      product.currency,
                      locale,
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[10px]",
                      product.inventory <= 10 && product.status === "active"
                        ? "text-warning-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {stockLabel(product)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 text-foreground"
                    onClick={() => openProduct(product)}
                  >
                    <Pencil aria-hidden="true" />
                    {commerce.canWrite
                      ? l("Edit product", "Editar producto")
                      : l("View product", "Ver producto")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={locked || !commerce.canWrite}
                    loading={localBusy === product.id}
                    aria-label={l(
                      `${product.stripeProductId && product.stripePriceId ? "Synced" : "Sync"} ${product.name}`,
                      `${product.stripeProductId && product.stripePriceId ? "Vinculado" : "Sincronizar"} ${product.name}`,
                    )}
                    onClick={() => void sync(product.id)}
                  >
                    <RefreshCw aria-hidden="true" />
                    {product.stripeProductId && product.stripePriceId
                      ? l("Synced", "Vinculado")
                      : l("Sync", "Sincronizar")}
                  </Button>
                </div>
              </div>
            </EffectSurface>
          ))}
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
          <div
            role="region"
            aria-label={l("Product catalog table", "Tabla del catálogo")}
            tabIndex={0}
            className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <Table className="min-w-[800px]">
              <caption className="sr-only">
                {l(
                  "Products, prices, inventory and sync status",
                  "Productos, precios, inventario y sincronización",
                )}
              </caption>
              <TableHeader>
                <TableRow>
                  {[
                    l("Product", "Producto"),
                    l("Status", "Estado"),
                    l("Category", "Categoría"),
                    l("Price", "Precio"),
                    l("Inventory", "Inventario"),
                    l("Updated", "Actualizado"),
                    l("Actions", "Acciones"),
                  ].map((label) => (
                    <TableHead key={label}>{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openProduct(product)}
                        className="flex min-w-48 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-subtle">
                          <ProductImageThumbnail
                            image={product.images[0]}
                            decorative
                          />
                        </span>
                        <span className="grid gap-1">
                          <span className="text-xs font-semibold">
                            {product.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {product.sku}
                          </span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={product.status} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {product.category}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-semibold tabular-nums">
                      {formatProductPrice(
                        product.unitAmount,
                        product.currency,
                        locale,
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap text-[11px]",
                        product.inventory <= 10 && product.status === "active"
                          ? "text-warning-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {stockLabel(product)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                      {date(product.updatedAt, {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={l(
                            `Open ${product.name}`,
                            `Abrir ${product.name}`,
                          )}
                          onClick={() => openProduct(product)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={locked || !commerce.canWrite}
                          loading={localBusy === product.id}
                          aria-label={l(
                            `${product.stripeProductId && product.stripePriceId ? "Synced" : "Sync"} ${product.name}`,
                            `${product.stripeProductId && product.stripePriceId ? "Vinculado" : "Sincronizar"} ${product.name}`,
                          )}
                          onClick={() => void sync(product.id)}
                        >
                          <RefreshCw aria-hidden="true" />
                          {product.stripeProductId && product.stripePriceId
                            ? l("Synced", "Vinculado")
                            : l("Sync", "Sincronizar")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] leading-5 text-muted-foreground">
        <p>
          {commerce.mode === "mock"
            ? l(
                "Demo products are saved in this browser, per workspace.",
                "Los productos de la demo se guardan en este navegador por workspace.",
              )
            : l(
                "Products are saved through your connected commerce service.",
                "Los productos se guardan mediante tu servicio de comercio conectado.",
              )}
        </p>
        <span className="flex items-center gap-1.5">
          <Tag aria-hidden="true" className="size-3" />
          {l("Made for a considered collection", "Para una colección cuidada")}
        </span>
      </div>
      {editor && (
        <ProductDetailsDialog
          key={editor.instance}
          product={editor.product}
          isNew={editor.isNew}
          onClose={() => setEditor(null)}
          onSaved={(saved, action) => {
            setNotice(
              action === "archive"
                ? l(`${saved.name} archived.`, `${saved.name} archivado.`)
                : action === "sync"
                  ? l(`${saved.name} synced.`, `${saved.name} sincronizado.`)
                  : l(`${saved.name} saved.`, `${saved.name} guardado.`),
            );
            setActionError(null);
            setRetryProductId(null);
          }}
        />
      )}
    </section>
  );
}

/** A workspace key resets drafts, filters and in-flight UI after a scope switch. */
export function ProductsManager() {
  const { workspaceId, workspace } = useWorkspace();
  return <CatalogWorkspace key={workspaceId} workspaceName={workspace.name} />;
}
