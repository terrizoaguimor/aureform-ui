"use client";
import { publicPath } from "@/lib/public-path";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Download, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useDemoStore } from "@/hooks/use-demo-store";
import { useLanguage } from "@/hooks/use-language";
import { PageHeading } from "@/components/blocks/page-heading";
import { MetricCard } from "@/components/blocks/metric-card";
import { DataTable, type DataTableLabels } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  entitySeeds,
  type EntityKind,
  type EntityRecord,
} from "@/demo/entities";
import { csv, downloadText } from "@/lib/utils";
import { RowActions, DeleteDialog } from "@/components/blocks/record-actions";
import { CustomerOperationsTemplate } from "@/components/templates/customer-operations";
import { getProductAsset } from "@/demo/product-assets";
import { ProductsManager } from "@/components/blocks/product-manager";
import { CommerceWorkspace } from "@/components/blocks/commerce-workspace";
export { DeleteDialog } from "@/components/blocks/record-actions";
export function useTableLabels(): Partial<DataTableLabels> {
  const { l, common: t } = useLanguage();
  return {
    search: l("Search records…", "Buscar registros…"),
    empty: t("empty"),
    emptyDescription: t("noMatch"),
    previous: l("Previous page", "Página anterior"),
    next: l("Next page", "Página siguiente"),
    selectAll: l("Select this page", "Seleccionar esta página"),
    selectRow: l("Select row", "Seleccionar fila"),
    selected: l("selected", "seleccionados"),
    page: l("Page", "Página"),
    of: l("of", "de"),
    rows: l("records", "registros"),
    clear: l("Clear search", "Borrar búsqueda"),
    error: l("Could not load records", "No se pudieron cargar los registros"),
    retry: t("retry"),
    loading: l("Loading records", "Cargando registros"),
  };
}
function ProductThumbnail({ id }: { id: string }) {
  const { l } = useLanguage();
  const asset = getProductAsset(id);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-accent">
      {asset && failedSrc !== asset.src ? (
        <img
          src={publicPath(asset.src)}
          alt={l(asset.alt.en, asset.alt.es)}
          width={asset.width}
          height={asset.height}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailedSrc(asset.src)}
        />
      ) : (
        <Package className="size-4 text-primary" aria-hidden="true" />
      )}
    </span>
  );
}
export function DataManager({ kind }: { kind: EntityKind }) {
  if (kind === "customers") return <CustomerOperationsTemplate />;
  if (kind === "products") return <ProductsManager />;
  if (kind === "orders" || kind === "invoices")
    return <CommerceWorkspace mode={kind} />;
  return <EntityManager kind={kind} />;
}
function EntityManager({ kind }: { kind: Exclude<EntityKind, "customers"> }) {
  const { l, common: t, currency, date, locale } = useLanguage(),
    labels = useTableLabels(),
    router = useRouter();
  const [records, setRecords] = useDemoStore<EntityRecord[]>(
    kind,
    entitySeeds[kind],
  );
  const [status, setStatus] = useState("all"),
    [editing, setEditing] = useState<EntityRecord | null>(null),
    [open, setOpen] = useState(false),
    [deleting, setDeleting] = useState<EntityRecord[]>([]);
  const names = {
    products: [l("Products", "Productos"), l("Add product", "Añadir producto")],
    orders: [l("Orders", "Pedidos"), l("Add order", "Añadir pedido")],
    invoices: [l("Invoices", "Facturas"), l("Create invoice", "Crear factura")],
    transactions: [
      l("Transactions", "Transacciones"),
      l("Add transaction", "Añadir transacción"),
    ],
  };
  const statuses =
    kind === "products"
      ? ["active", "draft", "archived"]
      : kind === "orders"
        ? ["processing", "shipped", "delivered", "cancelled"]
        : kind === "invoices"
          ? ["paid", "pending", "overdue", "draft"]
          : ["completed", "pending", "failed", "refunded"];
  const statusLabels: Record<string, string> = {
    active: l("Active", "Activo"),
    draft: l("Draft", "Borrador"),
    archived: l("Archived", "Archivado"),
    processing: l("Processing", "Procesando"),
    shipped: l("Shipped", "Enviado"),
    delivered: l("Delivered", "Entregado"),
    cancelled: l("Cancelled", "Cancelado"),
    paid: l("Paid", "Pagada"),
    pending: l("Pending", "Pendiente"),
    overdue: l("Overdue", "Vencida"),
    completed: l("Completed", "Completada"),
    failed: l("Failed", "Fallida"),
    refunded: l("Refunded", "Reembolsada"),
  };
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        l("Enter a name or reference.", "Escribe un nombre o referencia."),
      ),
    detail: z
      .string()
      .trim()
      .min(1, l("This field is required.", "Este campo es obligatorio.")),
    category: z
      .string()
      .trim()
      .min(1, l("This field is required.", "Este campo es obligatorio.")),
    amount: z
      .number()
      .finite()
      .refine(
        (v) => kind === "transactions" || v >= 0,
        l("Use a positive amount.", "Usa un importe positivo."),
      ),
    status: z.string(),
    stock: z.number().int().min(0).optional(),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      detail: "",
      category: "",
      amount: 0,
      status: statuses[0],
      stock: 0,
    },
  });
  const edit = (record: EntityRecord | null) => {
    setEditing(record);
    form.reset(
      record ?? {
        name: "",
        detail: "",
        category: "",
        amount: 0,
        status: statuses[0],
        stock: 0,
      },
    );
    setOpen(true);
  };
  const save = form.handleSubmit((values) => {
    const record: EntityRecord = {
      ...values,
      id: editing?.id ?? crypto.randomUUID(),
      date: editing?.date ?? new Date().toISOString().slice(0, 10),
    };
    setRecords((previous) =>
      editing
        ? previous.map((r) => (r.id === editing.id ? record : r))
        : [record, ...previous],
    );
    setOpen(false);
    toast.success(t("saved"));
  });
  const positive = (s: string) =>
    ["active", "delivered", "paid", "completed"].includes(s);
  const columns: ColumnDef<EntityRecord>[] = [
    {
      accessorKey: "name",
      header:
        kind === "products"
          ? l("Product", "Producto")
          : l("Reference", "Referencia"),
      cell: ({ row }) => (
        <div className="flex min-w-40 items-center gap-3">
          {kind === "products" && <ProductThumbnail id={row.original.id} />}
          <div>
            <p className="font-semibold">{row.original.name}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {row.original.detail}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header:
        kind === "products"
          ? l("Category", "Categoría")
          : kind === "orders"
            ? l("Items", "Artículos")
            : kind === "invoices"
              ? l("Description", "Descripción")
              : l("Method", "Método"),
    },
    {
      accessorKey: "status",
      header: l("Status", "Estado"),
      cell: ({ row }) => (
        <Badge
          variant={
            positive(row.original.status)
              ? "default"
              : ["overdue", "failed", "cancelled"].includes(row.original.status)
                ? "destructive"
                : ["pending", "processing"].includes(row.original.status)
                  ? "warning"
                  : "neutral"
          }
        >
          {statusLabels[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header:
        kind === "products" ? l("Price", "Precio") : l("Amount", "Importe"),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {currency(row.original.amount)}
        </span>
      ),
    },
    ...(kind === "products"
      ? [
          {
            accessorKey: "stock",
            header: l("Stock", "Existencias"),
            cell: ({ row }: { row: { original: EntityRecord } }) => (
              <span>{row.original.stock ?? 0}</span>
            ),
          } satisfies ColumnDef<EntityRecord>,
        ]
      : []),
    {
      accessorKey: "date",
      header: l("Date", "Fecha"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {date(row.original.date)}
        </span>
      ),
    },
    {
      id: "actions",
      header: l("Actions", "Acciones"),
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          name={row.original.name}
          edit={() => edit(row.original)}
          remove={() => setDeleting([row.original])}
          view={
            kind === "invoices"
              ? () => {
                  localStorage.setItem(
                    "aureform:selected-invoice",
                    JSON.stringify(row.original),
                  );
                  router.push(`/${locale}/invoice/`);
                }
              : undefined
          }
        />
      ),
    },
  ];
  const filtered = records.filter(
    (record) => status === "all" || record.status === status,
  );
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l("Business operations", "Operaciones del negocio")}
        title={names[kind][0]}
        description={l(
          "Keep every detail considered and every next step clear.",
          "Cuida cada detalle y mantén claro el siguiente paso.",
        )}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadText(
                  `${kind}.csv`,
                  csv(filtered),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download />
              {t("export")}
            </Button>
            <Button size="sm" onClick={() => edit(null)}>
              <Plus />
              {names[kind][1]}
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label={l("Total records", "Total de registros")}
          value={String(records.length)}
        />
        <MetricCard
          label={l("Total value", "Valor total")}
          value={currency(records.reduce((s, r) => s + r.amount, 0))}
        />
        <MetricCard
          label={
            kind === "products"
              ? l("Units in stock", "Unidades disponibles")
              : l("Completed", "Completados")
          }
          value={String(
            kind === "products"
              ? records.reduce((s, r) => s + (r.stock ?? 0), 0)
              : records.filter((r) => positive(r.status)).length,
          )}
        />
      </div>
      <div className="flex items-center gap-3">
        <Select
          aria-label={l("Filter by status", "Filtrar por estado")}
          className="h-9 w-44"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "all", label: l("All statuses", "Todos los estados") },
            ...statuses.map((v) => ({ value: v, label: statusLabels[v] })),
          ]}
        />
        <span className="text-[11px] text-muted-foreground">
          {filtered.length} {l("records", "registros")}
        </span>
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        labels={labels}
        selectedAction={(rows, clear) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleting(rows);
              clear();
            }}
          >
            <Trash2 />
            {t("delete")}
          </Button>
        )}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("close")}>
          <DialogTitle>{editing ? t("edit") : names[kind][1]}</DialogTitle>
          <DialogDescription>{t("localDemo")}</DialogDescription>
          <form onSubmit={save} className="mt-6 grid gap-4">
            <Field
              label={
                kind === "products"
                  ? l("Product name", "Nombre del producto")
                  : l("Reference", "Referencia")
              }
              error={form.formState.errors.name?.message}
            >
              <Input {...form.register("name")} />
            </Field>
            <Field
              label={kind === "products" ? "SKU" : l("Customer", "Cliente")}
              error={form.formState.errors.detail?.message}
            >
              <Input {...form.register("detail")} />
            </Field>
            <Field
              label={
                kind === "products"
                  ? l("Category", "Categoría")
                  : l("Description", "Descripción")
              }
              error={form.formState.errors.category?.message}
            >
              <Input {...form.register("category")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={l("Amount (USD)", "Importe (USD)")}
                error={form.formState.errors.amount?.message}
              >
                <Input
                  type="number"
                  step=".01"
                  {...form.register("amount", { valueAsNumber: true })}
                />
              </Field>
              <Select
                label={l("Status", "Estado")}
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v)}
                options={statuses.map((v) => ({
                  value: v,
                  label: statusLabels[v],
                }))}
              />
            </div>
            {kind === "products" && (
              <Field
                label={l("Stock", "Existencias")}
                error={form.formState.errors.stock?.message}
              >
                <Input
                  type="number"
                  min={0}
                  {...form.register("stock", { valueAsNumber: true })}
                />
              </Field>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit">{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        count={deleting.length}
        open={deleting.length > 0}
        onOpenChange={(v) => {
          if (!v) setDeleting([]);
        }}
        onDelete={() => {
          setRecords((previous) =>
            previous.filter((r) => !deleting.some((d) => d.id === r.id)),
          );
          setDeleting([]);
          toast.success(l("Records removed", "Registros eliminados"));
        }}
      />
    </div>
  );
}
