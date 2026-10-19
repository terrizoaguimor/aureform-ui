"use client";

import { publicPath } from "@/lib/public-path";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Download,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useWorkspace } from "@/components/workspace-provider";
import { PageHeading } from "@/components/blocks/page-heading";
import { MetricCard } from "@/components/blocks/metric-card";
import {
  WorkspaceLoading,
  WorkspacePermission,
  WorkspaceStatus,
} from "@/components/blocks/workspace-status";
import {
  DataWorkbench,
  type DataWorkbenchSavedView,
  type DataWorkbenchValue,
  type DataWorkbenchFilterField,
} from "@/components/blocks/data-workbench";
import { RowActions, DeleteDialog } from "@/components/blocks/record-actions";
import { useSaasAction } from "@/components/templates/saas-operations";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Customer } from "@/demo/dashboard-data";
import { getDemoCustomerAvatarSrc } from "@/demo/avatar-assets";
import {
  customerColumnIds,
  loadDemoCustomerPage,
  matchingCustomers,
  type CustomerPage,
} from "@/demo/customer-adapter";
import {
  normalizeDataView,
  parseDataView,
  serializeDataView,
} from "@/lib/saved-view";
import { csv, downloadText } from "@/lib/utils";

function discardSharedView() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("view")) return;
  url.searchParams.delete("view");
  window.history.replaceState(null, "", url);
}

export function CustomerOperationsTemplate() {
  const scope = useWorkspace();
  return scope.ready ? (
    <Suspense fallback={<WorkspaceLoading />}>
      <CustomerWorkspace key={scope.workspaceId} />
    </Suspense>
  ) : (
    <WorkspaceLoading />
  );
}

function CustomerWorkspace() {
  const scope = useWorkspace();
  const { customers, setCustomerView } = scope;
  const { l, common: t, locale, currency, date } = useLanguage();
  const action = useSaasAction();
  const router = useRouter();
  const shared = useSearchParams().get("view") ?? "";
  const value = useMemo(
    () =>
      parseDataView(shared, customerColumnIds) ??
      normalizeDataView(scope.customerView, customerColumnIds),
    [shared, scope.customerView],
  );
  const [activeViewId, setActiveViewId] = useState<string>();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer[]>([]);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState<{
    source?: Customer[];
    key?: string;
    data?: CustomerPage;
    error?: string;
  }>({});
  const canEdit = scope.can("customers.write");
  const changeView = (next: DataWorkbenchValue) => {
    discardSharedView();
    scope.setCustomerView(normalizeDataView(next, customerColumnIds));
  };
  const requestKey = `${JSON.stringify(value.query)}:${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    loadDemoCustomerPage(customers, value.query, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setPage({ source: customers, key: requestKey, data });
        if (
          data.query.pagination.pageIndex !== value.query.pagination.pageIndex
        ) {
          setCustomerView({ ...value, query: data.query });
          discardSharedView();
        }
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setPage({
          source: customers,
          key: requestKey,
          error: cause instanceof Error ? cause.message : "load-failed",
        });
      });
    return () => controller.abort();
  }, [customers, setCustomerView, value, requestKey]);
  const currentPage =
    page.source === scope.customers && page.key === requestKey;
  const selected = scope.customers.filter((item) => selection[item.id]);
  const savedViews: DataWorkbenchSavedView[] = scope.savedViews.map((view) => ({
    ...view,
    value: normalizeDataView(view.value, customerColumnIds),
  }));
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(2, l("Use at least two characters.", "Usa al menos dos caracteres."))
      .max(120),
    email: z
      .email(l("Enter a valid email.", "Escribe un correo válido."))
      .max(254),
    company: z.string().trim().max(200),
    plan: z.enum(["Starter", "Pro", "Enterprise"]),
    status: z.enum(["active", "trial", "paused"]),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      plan: "Pro",
      status: "active",
    },
  });
  const edit = (customer: Customer | null) => {
    if (!canEdit) return;
    setEditing(customer);
    form.reset(
      customer
        ? {
            name: customer.name,
            email: customer.email,
            company: customer.company,
            plan: ["Starter", "Pro", "Enterprise"].includes(customer.plan)
              ? (customer.plan as Values["plan"])
              : "Pro",
            status: ["active", "trial", "paused"].includes(customer.status)
              ? (customer.status as Values["status"])
              : "active",
          }
        : { name: "", email: "", company: "", plan: "Pro", status: "active" },
    );
    setOpen(true);
  };
  const save = form.handleSubmit((values) => {
    if (!canEdit) return;
    if (
      scope.customers.some(
        (item) =>
          item.email.toLowerCase() === values.email.trim().toLowerCase() &&
          item.id !== editing?.id,
      )
    ) {
      form.setError("email", {
        message: l(
          "That email already exists in this workspace.",
          "Ese correo ya existe en este espacio.",
        ),
      });
      return;
    }
    const record: Customer = {
      ...values,
      email: values.email.trim().toLowerCase(),
      id: editing?.id ?? `customer-${crypto.randomUUID()}`,
      amount:
        editing && editing.plan === values.plan
          ? editing.amount
          : values.plan === "Enterprise"
            ? 699
            : values.plan === "Pro"
              ? 249
              : 99,
      joined: editing?.joined ?? new Date().toISOString().slice(0, 10),
    };
    try {
      action(() => {
        scope.setCustomers((previous) =>
          editing
            ? previous.map((item) => (item.id === editing.id ? record : item))
            : [record, ...previous],
        );
        scope.recordActivity(
          editing
            ? "Customer updated · Cliente actualizado"
            : "Customer created · Cliente creado",
          "customer",
          record.id,
        );
      });
      setOpen(false);
      toast.success(t("saved"));
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof Error
            ? cause.message
            : l("Try again.", "Inténtalo de nuevo."),
      });
    }
  });
  const statusLabel = (status: string) =>
    status === "active"
      ? l("Active", "Activo")
      : status === "trial"
        ? l("Trial", "Prueba")
        : l("Paused", "Pausado");
  const viewCustomer = (customer: Customer) =>
    router.push(
      `/${locale}/customers/detail/?id=${encodeURIComponent(customer.id)}`,
    );
  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: l("Customer", "Cliente"),
      cell: ({ row }) => (
        <div className="flex min-w-44 items-center gap-3">
          <Avatar
            name={row.original.name}
            src={getDemoCustomerAvatarSrc(scope.workspaceId, row.original.id)}
            className="size-8 text-[10px]"
          />
          <div className="min-w-0">
            <button
              className="text-left text-[13px] font-semibold transition-colors hover:text-primary focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => viewCustomer(row.original)}
            >
              {row.original.name}
            </button>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {row.original.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "company",
      header: l("Company", "Empresa"),
      cell: ({ row }) => row.original.company || "—",
    },
    {
      accessorKey: "plan",
      header: "Plan",
      cell: ({ row }) => <Badge variant="outline">{row.original.plan}</Badge>,
    },
    {
      accessorKey: "status",
      header: l("Status", "Estado"),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "active"
              ? "default"
              : row.original.status === "trial"
                ? "warning"
                : "neutral"
          }
        >
          <span className="size-1 rounded-full bg-current" />
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: l("Monthly spend", "Gasto mensual"),
      meta: { numeric: true, align: "right" },
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {currency(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "joined",
      header: l("Joined", "Registro"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[11px] text-muted-foreground">
          {date(row.original.joined)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <RowActions
          name={row.original.name}
          view={() => viewCustomer(row.original)}
          viewLabel={l("View customer", "Ver cliente")}
          edit={canEdit ? () => edit(row.original) : undefined}
          remove={canEdit ? () => setDeleting([row.original]) : undefined}
        />
      ),
    },
  ];
  const fields: DataWorkbenchFilterField<Customer>[] = [
    {
      id: "status",
      label: l("Status", "Estado"),
      type: "multi-select",
      options: ["active", "trial", "paused"].map((value) => ({
        value,
        label: statusLabel(value),
      })),
    },
    {
      id: "plan",
      label: "Plan",
      type: "multi-select",
      options: ["Starter", "Pro", "Enterprise"].map((value) => ({
        value,
        label: value,
      })),
    },
    { id: "company", label: l("Company", "Empresa"), type: "text" },
    {
      id: "amount",
      label: l("Monthly spend", "Gasto mensual"),
      type: "number-range",
    },
    { id: "joined", label: l("Joined", "Registro"), type: "date-range" },
  ];
  const exportRows = (rows: Customer[], filename = "customers.csv") => {
    downloadText(filename, csv(rows), "text/csv;charset=utf-8");
    toast.success(t("downloaded"));
  };
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        eyebrow={l("People & relationships", "Personas y relaciones")}
        title={t("customers")}
        description={l(
          "One shared view of your customers, with the details that help relationships grow.",
          "Una visión compartida de tus clientes, con los detalles que ayudan a cuidar cada relación.",
        )}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportRows(matchingCustomers(scope.customers, value.query))
              }
            >
              <Download aria-hidden />
              {t("export")}
            </Button>
            {scope.can("customers.import") && (
              <a
                href={publicPath(`/${locale}/imports/`)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Upload aria-hidden />
                {l("Import", "Importar")}
              </a>
            )}
            {canEdit && (
              <Button size="sm" onClick={() => edit(null)}>
                <Plus aria-hidden />
                {l("Add customer", "Añadir cliente")}
              </Button>
            )}
          </>
        }
      />
      <WorkspaceStatus />
      {!canEdit && <WorkspacePermission />}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label={l("Total customers", "Total de clientes")}
          value={String(scope.customers.length)}
          icon={<Users />}
          note={l("In this workspace", "En este espacio")}
        />
        <MetricCard
          label={l("Active customers", "Clientes activos")}
          value={String(
            scope.customers.filter((item) => item.status === "active").length,
          )}
          icon={<CheckCircle2 />}
          note={l("Growing together", "Creciendo juntos")}
        />
        <MetricCard
          label={l(
            "Monthly recurring revenue",
            "Ingresos recurrentes mensuales",
          )}
          value={currency(
            scope.customers
              .filter((item) => item.status === "active")
              .reduce((total, item) => total + item.amount, 0),
          )}
          icon={<CreditCard />}
          note={l(
            "From active demo subscriptions",
            "De suscripciones activas de ejemplo",
          )}
        />
      </div>
      {!!shared && !parseDataView(shared, customerColumnIds) && (
        <Alert
          variant="warning"
          title={l(
            "This shared view could not be opened",
            "No se pudo abrir esta vista compartida",
          )}
        >
          {l(
            "Your saved workspace view is still available.",
            "La vista guardada de tu espacio sigue disponible.",
          )}
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={discardSharedView}
          >
            {l("Dismiss link", "Descartar enlace")}
          </Button>
        </Alert>
      )}
      {!scope.customers.length && canEdit && (
        <Card appearance="gradient">
          <CardContent className="flex flex-wrap items-center justify-between gap-5 py-6">
            <div>
              <p className="text-sm font-semibold">
                {l(
                  "Your first relationship starts here.",
                  "Tu primera relación empieza aquí.",
                )}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {l(
                  "Add one customer or bring a list from your spreadsheet.",
                  "Añade un cliente o trae una lista desde tu hoja de cálculo.",
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => edit(null)}>
              {l("Add your first customer", "Añadir tu primer cliente")}
              <ArrowUpRight aria-hidden />
            </Button>
          </CardContent>
        </Card>
      )}
      <DataWorkbench<Customer>
        mode="external"
        value={value}
        onValueChange={changeView}
        data={currentPage ? (page.data?.rows ?? []) : []}
        rowCount={currentPage ? (page.data?.total ?? 0) : 0}
        loading={!currentPage}
        error={
          currentPage && page.error
            ? l(
                "The customer list could not be loaded.",
                "No se pudo cargar la lista de clientes.",
              )
            : undefined
        }
        onRetry={() => setRetry((previous) => previous + 1)}
        columns={columns}
        filterFields={fields}
        savedViews={savedViews}
        activeViewId={activeViewId}
        onActiveViewChange={setActiveViewId}
        onSaveView={
          scope.can("views.manage")
            ? (view) =>
                action(() =>
                  scope.setSavedViews((previous) => {
                    if (
                      previous.some(
                        (item) =>
                          item.id !== view.id &&
                          item.name.toLowerCase() === view.name.toLowerCase(),
                      )
                    )
                      throw new Error(
                        l(
                          "A view with that name already exists.",
                          "Ya existe una vista con ese nombre.",
                        ),
                      );
                    return [
                      ...previous.filter((item) => item.id !== view.id),
                      {
                        ...view,
                        value: normalizeDataView(view.value, customerColumnIds),
                      },
                    ];
                  }),
                )
            : undefined
        }
        onDeleteView={
          scope.can("views.manage")
            ? (id) =>
                action(() =>
                  scope.setSavedViews((previous) =>
                    previous.filter((item) => item.id !== id),
                  ),
                )
            : undefined
        }
        onShareView={async (next) => {
          const url = new URL(
            publicPath(`/${locale}/customers/`),
            window.location.origin,
          );
          url.searchParams.set(
            "view",
            serializeDataView(next, customerColumnIds),
          );
          await navigator.clipboard.writeText(url.toString());
          toast.success(l("View link copied", "Enlace de vista copiado"));
        }}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        title={l("Customer directory", "Directorio de clientes")}
        description={l(
          "Filter, save a view and open any customer for the full story.",
          "Filtra, guarda una vista y abre un cliente para conocer su historia.",
        )}
        appearance="elevated"
        tableLabels={{ rows: l("customers", "clientes") }}
        selectedAction={(_, clear) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                exportRows(selected, "customers-selected.csv");
                clear();
              }}
            >
              <Download aria-hidden />
              {t("export")}
            </Button>
            {canEdit && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleting(selected)}
              >
                <Trash2 aria-hidden />
                {t("delete")}
              </Button>
            )}
          </>
        )}
      />
      <Dialog open={open && canEdit} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("close")}>
          <DialogTitle>
            {editing
              ? l("Edit customer", "Editar cliente")
              : l("A new relationship", "Una nueva relación")}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Customer changes stay in this workspace’s browser demo.",
              "Los cambios se guardan en la demo de este espacio del navegador.",
            )}
          </DialogDescription>
          <form noValidate onSubmit={save} className="mt-6 grid gap-4">
            <Field
              label={l("Full name", "Nombre completo")}
              error={form.formState.errors.name?.message}
            >
              <Input
                autoComplete="name"
                maxLength={120}
                {...form.register("name")}
              />
            </Field>
            <Field
              label={l("Email", "Correo")}
              error={form.formState.errors.email?.message}
            >
              <Input
                type="email"
                autoComplete="email"
                maxLength={254}
                {...form.register("email")}
              />
            </Field>
            <Field
              label={l("Company", "Empresa")}
              error={form.formState.errors.company?.message}
            >
              <Input maxLength={200} {...form.register("company")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Plan"
                value={form.watch("plan")}
                onValueChange={(next) =>
                  form.setValue("plan", next as Values["plan"])
                }
                options={["Starter", "Pro", "Enterprise"].map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <Select
                label={l("Status", "Estado")}
                value={form.watch("status")}
                onValueChange={(next) =>
                  form.setValue("status", next as Values["status"])
                }
                options={["active", "trial", "paused"].map((value) => ({
                  value,
                  label: statusLabel(value),
                }))}
              />
            </div>
            {form.formState.errors.root?.message && (
              <Alert
                variant="destructive"
                title={l("Could not save", "No se pudo guardar")}
              >
                {form.formState.errors.root.message}
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit">
                {editing ? t("save") : l("Add customer", "Añadir cliente")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        count={deleting.length}
        open={deleting.length > 0 && canEdit}
        onOpenChange={(next) => {
          if (!next) setDeleting([]);
        }}
        onDelete={() =>
          action(() => {
            const removed = new Set(deleting.map((item) => item.id));
            scope.setCustomers((previous) =>
              previous.filter((item) => !removed.has(item.id)),
            );
            scope.recordActivity(
              `Customers removed: ${removed.size} · Clientes eliminados: ${removed.size}`,
              "customer",
            );
            setSelection((previous) =>
              Object.fromEntries(
                Object.entries(previous).filter(([id]) => !removed.has(id)),
              ),
            );
            setDeleting([]);
            toast.success(l("Customers removed", "Clientes eliminados"));
          })
        }
      />
    </div>
  );
}
