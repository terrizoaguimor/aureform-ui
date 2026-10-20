"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Clock3,
  CreditCard,
  FileText,
  FlaskConical,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { useCommerce } from "@/components/commerce-provider";
import { useWorkspace } from "@/components/workspace-provider";
import {
  CommerceError,
  commerceCurrencies,
  getCommerceProviderLabel,
  type CommerceAction,
  type CommerceContextValue,
  type CommerceInvoice,
  type CommerceOrder,
} from "@/lib/commerce";
import { PageHeading } from "@/components/blocks/page-heading";
import { MetricCard } from "@/components/blocks/metric-card";
import { TableToolbar } from "@/components/blocks/table-toolbar";
import { WorkspaceStatus } from "@/components/blocks/workspace-status";
import { CommerceBilling } from "@/components/blocks/commerce-billing";
import {
  CommerceCheckout,
  CommerceStatusBadge,
  CommerceTotals,
  commerceErrorMessage,
  useCommerceFormatting,
  useCommerceTask,
  type CommerceTask,
  type MockCommerceAction,
} from "@/components/blocks/commerce-checkout";
import {
  CommerceInvoiceEditor,
  CommerceInvoiceTable,
  CommerceInvoiceView,
} from "@/components/blocks/commerce-invoice-view";
import {
  CommerceOrderDetail,
  CommerceOrderEditor,
} from "@/components/blocks/commerce-order-editor";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
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

export type CommerceWorkspaceMode =
  "orders" | "invoices" | "invoice" | "billing";

type WorkspaceProps = {
  mode: CommerceWorkspaceMode;
  commerce: CommerceContextValue;
  workspaceName: string;
  workspaceReady: boolean;
};
type Notify = (text: string, invoiceId?: string) => void;

export function CommerceWorkspace({ mode }: { mode: CommerceWorkspaceMode }) {
  const commerce: CommerceContextValue = useCommerce();
  const scope = useWorkspace();
  // Unmount forms and pending callbacks when their workspace or permissions change.
  const scopeKey = `${scope.workspaceId}:${scope.role}:${commerce.mode}:${commerce.provider?.id ?? ""}:${commerce.canWrite}:${commerce.canManageBilling}:${mode}`;
  return (
    <div className="grid min-w-0 gap-5" data-commerce-workspace={mode}>
      <div data-no-print>
        <WorkspaceStatus />
      </div>
      <Suspense fallback={<CommerceLoading />}>
        <CommerceWorkspaceRoute
          key={scopeKey}
          mode={mode}
          commerce={commerce}
          workspaceName={scope.workspace.name}
          workspaceReady={scope.ready}
        />
      </Suspense>
    </div>
  );
}

function CommerceLoading() {
  const { l } = useCommerceFormatting();
  return (
    <div
      role="status"
      aria-label={l(
        "Loading commerce workspace",
        "Cargando workspace de comercio",
      )}
      className="grid gap-5"
    >
      <Skeleton className="h-10 w-60" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-36" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
      <span className="sr-only">
        {l("Loading commerce workspace", "Cargando workspace de comercio")}
      </span>
    </div>
  );
}

function CommerceWorkspaceRoute(props: WorkspaceProps) {
  const requestedId = useSearchParams().get("id");
  return (
    <CommerceWorkspaceBody
      key={requestedId ?? "overview"}
      {...props}
      requestedId={requestedId}
    />
  );
}

function CommerceWorkspaceBody({
  mode,
  commerce,
  workspaceName,
  workspaceReady,
  requestedId,
}: WorkspaceProps & { requestedId: string | null }) {
  const { l, locale } = useCommerceFormatting();
  const task = useCommerceTask(commerce);
  const [checkout, setCheckout] = useState<MockCommerceAction | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    invoiceId?: string;
  } | null>(null);
  const notify: Notify = (text, invoiceId) => setNotice({ text, invoiceId });
  const ready = workspaceReady && commerce.ready;
  const problem =
    task.error ??
    (commerce.error ? commerceErrorMessage(commerce.error, l) : null);
  const readOnly =
    mode === "billing" ? !commerce.canManageBilling : !commerce.canWrite;

  const beginCheckout = (
    request: () => Promise<CommerceAction>,
    kind: MockCommerceAction["kind"],
    id?: string,
  ) => {
    const allowed =
      kind === "subscription" || kind === "portal"
        ? commerce.canManageBilling
        : commerce.canWrite;
    if (!ready || task.disabled || !allowed) return;
    setNotice(null);
    void task.run(
      async () => {
        const action = await request();
        if (action.mode === "redirect") {
          if (commerce.mode === "mock")
            throw new CommerceError(
              "provider",
              "Unexpected redirect in demo mode.",
            );
          let target: URL;
          try {
            target = new URL(action.url);
          } catch {
            throw new CommerceError(
              "provider",
              "Checkout returned an invalid URL.",
            );
          }
          if (
            target.protocol !== "https:" ||
            target.username ||
            target.password
          ) {
            throw new CommerceError(
              "provider",
              "Checkout requires a trusted HTTPS URL.",
            );
          }
          return { ...action, url: target.href };
        }
        if (
          commerce.mode !== "mock" ||
          action.kind !== kind ||
          (id !== undefined && action.id !== id)
        ) {
          throw new CommerceError(
            "provider",
            "Checkout returned an unexpected action.",
          );
        }
        return action;
      },
      (action) => {
        // The provider's backend adapter owns URL trust. Navigate only after the
        // scoped request is still mounted, never from a late workspace response.
        if (action.mode === "redirect") window.location.assign(action.url);
        else setCheckout(action);
      },
    );
  };

  return (
    <div className="grid min-w-0 gap-6">
      <div data-no-print className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-subtle/35 px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            {commerce.mode === "mock" ? (
              <FlaskConical
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
            ) : (
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {commerce.mode === "mock"
                  ? commerce.provider
                    ? l(
                        `${getCommerceProviderLabel(commerce)} · demo workspace · mock payments`,
                        `${getCommerceProviderLabel(commerce)} · workspace de ejemplo · pagos simulados`,
                      )
                    : l(
                        "Demo workspace · mock payments",
                        "Workspace de ejemplo · pagos simulados",
                      )
                  : l(
                      `${getCommerceProviderLabel(commerce)} · connected commerce`,
                      `${getCommerceProviderLabel(commerce)} · comercio conectado`,
                    )}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {commerce.mode === "mock"
                  ? l(
                      "No money moves. Orders, inventory, invoices and billing share this workspace's demo data.",
                      "No se mueve dinero. Pedidos, existencias, facturas y suscripciones comparten los datos de ejemplo de este workspace.",
                    )
                  : l(
                      `Checkout opens with ${getCommerceProviderLabel(commerce)}. Payment status updates after your service confirms it.`,
                      `El pago se abre con ${getCommerceProviderLabel(commerce)}. El estado se actualiza después de la confirmación de tu servicio.`,
                    )}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={task.pending || commerce.busy !== null}
            loading={task.pending && !checkout}
            onClick={() => {
              void task.run(
                () => commerce.reload(),
                () =>
                  setNotice({
                    text: l("Workspace refreshed.", "Workspace actualizado."),
                  }),
              );
            }}
          >
            <RefreshCw aria-hidden="true" />
            {l("Refresh", "Actualizar")}
          </Button>
        </div>
        {problem && (
          <Alert
            variant="destructive"
            title={l("Something needs attention", "Algo necesita atención")}
          >
            {problem}
          </Alert>
        )}
        {commerce.persistenceError && (
          <Alert
            variant="warning"
            title={l(
              "Workspace storage needs attention",
              "Revisa el almacenamiento del workspace",
            )}
          >
            <p>
              {commerce.persistenceError === "invalid"
                ? l(
                    "Saved demo data could not be restored. This session remains usable; retry saving the current workspace.",
                    "No se pudieron restaurar los datos de ejemplo guardados. Esta sesión sigue disponible; reintenta guardar el workspace actual.",
                  )
                : commerce.persistenceError === "read"
                  ? l(
                      "Browser storage could not be read. Keep working in this session and retry before leaving.",
                      "No se pudo leer el almacenamiento del navegador. Puedes seguir en esta sesión y reintentar antes de salir.",
                    )
                  : l(
                      "Your changes are available in this session but could not be saved in the browser.",
                      "Tus cambios están disponibles en esta sesión, pero no se pudieron guardar en el navegador.",
                    )}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={task.pending || commerce.busy !== null}
              onClick={() => {
                void task.run(async () => commerce.retryPersistence());
              }}
            >
              {l("Retry storage", "Reintentar almacenamiento")}
            </Button>
          </Alert>
        )}
        {ready && readOnly && (
          <Alert
            title={
              mode === "billing"
                ? l(
                    "Billing management is restricted",
                    "La gestión de facturación está restringida",
                  )
                : l("Read-only access", "Acceso de lectura")
            }
          >
            {mode === "billing"
              ? l(
                  "You can review the subscription and invoice history. A workspace owner or administrator can manage billing.",
                  "Puedes consultar la suscripción y el historial de facturas. Un titular o administrador del workspace puede gestionar la facturación.",
                )
              : l(
                  "You can inspect records and download invoices. Your current role cannot create orders, change shipping or collect payments.",
                  "Puedes consultar registros y descargar facturas. Tu rol actual no permite crear pedidos, cambiar envíos ni recibir pagos.",
                )}
          </Alert>
        )}
        {ready && notice && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-accent/50 px-4 py-3"
          >
            <p className="text-xs leading-6">{notice.text}</p>
            <div className="flex items-center gap-2">
              {notice.invoiceId && (
                <Link
                  href={{
                    pathname: `/${locale}/invoice/`,
                    query: { id: notice.invoiceId },
                  }}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {l("View invoice", "Ver factura")}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={l("Dismiss message", "Cerrar mensaje")}
                onClick={() => setNotice(null)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {!ready ? (
        <CommerceLoading />
      ) : mode === "orders" ? (
        <CommerceOrders
          commerce={commerce}
          task={task}
          requestedId={requestedId}
          onNotice={notify}
          onCheckout={(id) =>
            beginCheckout(() => commerce.checkoutOrder(id), "order", id)
          }
        />
      ) : mode === "invoices" ? (
        <CommerceInvoices commerce={commerce} task={task} onNotice={notify} />
      ) : mode === "invoice" ? (
        <CommerceInvoiceView
          invoice={
            requestedId !== null
              ? (commerce.invoices.find((item) => item.id === requestedId) ??
                null)
              : (commerce.invoices[0] ?? null)
          }
          requestedId={requestedId}
          workspaceName={workspaceName}
          commerce={commerce}
          task={task}
          onPay={(id) =>
            beginCheckout(() => commerce.payInvoice(id), "invoice", id)
          }
        />
      ) : (
        <CommerceBilling
          commerce={commerce}
          task={task}
          onPlan={(plan) =>
            beginCheckout(
              () => commerce.checkoutPlan(plan),
              "subscription",
              plan,
            )
          }
          onPortal={() => beginCheckout(() => commerce.openPortal(), "portal")}
        />
      )}
      {ready && checkout && commerce.mode === "mock" && (
        <CommerceCheckout
          key={`${checkout.kind}:${checkout.id}`}
          action={checkout}
          commerce={commerce}
          task={task}
          onClose={() => {
            if (task.pending || commerce.busy !== null) return;
            setCheckout(null);
            task.clearError();
          }}
        />
      )}
    </div>
  );
}

function CurrencyMetric({
  label,
  amounts,
  note,
  icon,
}: {
  label: string;
  amounts: readonly { amount: number; currency: CommerceInvoice["currency"] }[];
  note: string;
  icon: ReactNode;
}) {
  return (
    <Card className="p-[var(--af-card-padding,24px)]">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[13px] leading-5 font-medium text-muted-foreground">
          {label}
        </p>
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-accent/65 text-primary [&_svg]:size-4"
        >
          {icon}
        </span>
      </div>
      <div className="mt-4 break-words text-[28px] leading-tight font-semibold tracking-tight">
        <CommerceTotals amounts={amounts} />
      </div>
      <p className="mt-4 text-[11px] leading-5 text-muted-foreground">{note}</p>
    </Card>
  );
}

function CommerceSearch({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  const { l } = useCommerceFormatting();
  return (
    <div className="relative w-full min-w-0 sm:max-w-sm">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          aria-label={l("Clear search", "Limpiar búsqueda")}
          onClick={() => onChange("")}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

function CommerceOrders({
  commerce,
  task,
  requestedId,
  onNotice,
  onCheckout,
}: {
  commerce: CommerceContextValue;
  task: CommerceTask;
  requestedId: string | null;
  onNotice: Notify;
  onCheckout: (id: string) => void;
}) {
  const { l, money, date, number } = useCommerceFormatting();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(requestedId);
  const [creating, setCreating] = useState(false);
  const orders = [...commerce.orders].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const selected =
    selectedId !== null
      ? (orders.find((item) => item.id === selectedId) ?? null)
      : (orders[0] ?? null);
  const search = query.trim().toLocaleLowerCase();
  const filtered = orders.filter(
    (order) =>
      (status === "all" || order.status === status) &&
      (payment === "all" || order.paymentStatus === payment) &&
      `${order.id} ${order.number} ${order.customerName} ${order.customerEmail} ${order.items.map((line) => line.name).join(" ")}`
        .toLocaleLowerCase()
        .includes(search),
  );
  const unpaid = orders.filter(
    (order) =>
      order.status !== "cancelled" &&
      ["unpaid", "failed"].includes(order.paymentStatus),
  );
  const paid = orders.filter((order) => order.paymentStatus === "paid");
  const fulfillment = orders.filter(
    (order) => order.status === "processing" && order.paymentStatus === "paid",
  );
  const reset = () => {
    setQuery("");
    setStatus("all");
    setPayment("all");
  };
  const onCreated = (order: CommerceOrder) => {
    setCreating(false);
    setSelectedId(order.id);
    reset();
    onNotice(
      l(
        `Order ${order.number} created. Review its checkout when you are ready.`,
        `Pedido ${order.number} creado. Revisa el pago cuando estés listo.`,
      ),
    );
  };
  const changeStatus = (id: string, next: CommerceOrder["status"]) => {
    if (task.disabled || !commerce.canWrite) return;
    const order = commerce.orders.find((item) => item.id === id);
    if (
      !order ||
      order.paymentStatus !== "paid" ||
      !(
        (order.status === "processing" && next === "shipped") ||
        (order.status === "shipped" && next === "delivered")
      )
    )
      return;
    void task.run(
      () => commerce.updateOrderStatus(id, next),
      (updated) =>
        onNotice(
          updated.status === "shipped"
            ? l(
                `Order ${updated.number} marked shipped.`,
                `Pedido ${updated.number} marcado como enviado.`,
              )
            : updated.status === "delivered"
              ? l(
                  `Order ${updated.number} marked delivered.`,
                  `Pedido ${updated.number} marcado como entregado.`,
                )
              : l(
                  `Order ${updated.number} updated.`,
                  `Pedido ${updated.number} actualizado.`,
                ),
        ),
    );
  };

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        eyebrow={l("Every order, considered", "Cada pedido, cuidado")}
        title={l("Orders", "Pedidos")}
        description={l(
          "From the first item to the final delivery. Keep payments and fulfillment in view.",
          "Del primer artículo a la entrega final. Mantén los pagos y los envíos a la vista.",
        )}
        actions={
          <Button
            type="button"
            disabled={task.disabled || !commerce.canWrite}
            onClick={() => {
              task.clearError();
              setCreating(true);
            }}
          >
            <Plus aria-hidden="true" />
            {l("New order", "Nuevo pedido")}
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={l("Total orders", "Total de pedidos")}
          value={number(orders.length)}
          note={l("In this workspace", "En este workspace")}
          icon={<ShoppingBag />}
        />
        <MetricCard
          label={l("Awaiting payment", "Esperando el pago")}
          value={number(unpaid.length)}
          note={l("Unpaid or failed checkout", "Pagos pendientes o fallidos")}
          icon={<Clock3 />}
        />
        <MetricCard
          label={l("Ready to fulfill", "Listos para enviar")}
          value={number(fulfillment.length)}
          note={l("Paid and processing", "Pagados y en preparación")}
          icon={<Truck />}
        />
        <CurrencyMetric
          label={l("Collected", "Pagado")}
          amounts={paid.map((order) => ({
            amount: order.total,
            currency: order.currency,
          }))}
          note={l("Paid orders · by currency", "Pedidos pagados · por moneda")}
          icon={<CreditCard />}
        />
      </div>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <Card className="min-w-0 overflow-hidden">
          <TableToolbar
            title={l("Order overview", "Resumen de pedidos")}
            count={number(filtered.length)}
            description={l(
              "Select an order to review its items and timeline.",
              "Selecciona un pedido para ver sus artículos y progreso.",
            )}
            search={
              <CommerceSearch
                value={query}
                onChange={setQuery}
                label={l("Search orders", "Buscar pedidos")}
                placeholder={l(
                  "Search order, customer or product…",
                  "Buscar pedido, cliente o producto…",
                )}
              />
            }
            actions={
              <>
                <Select
                  aria-label={l(
                    "Filter fulfillment status",
                    "Filtrar estado del envío",
                  )}
                  className="w-full sm:w-40"
                  value={status}
                  onValueChange={setStatus}
                  options={[
                    {
                      value: "all",
                      label: l("All fulfillment", "Todos los envíos"),
                    },
                    {
                      value: "processing",
                      label: l("Processing", "En preparación"),
                    },
                    { value: "shipped", label: l("Shipped", "Enviados") },
                    { value: "delivered", label: l("Delivered", "Entregados") },
                    { value: "cancelled", label: l("Cancelled", "Cancelados") },
                  ]}
                />
                <Select
                  aria-label={l(
                    "Filter payment status",
                    "Filtrar estado del pago",
                  )}
                  className="w-full sm:w-36"
                  value={payment}
                  onValueChange={setPayment}
                  options={[
                    {
                      value: "all",
                      label: l("All payments", "Todos los pagos"),
                    },
                    { value: "unpaid", label: l("Unpaid", "Sin pagar") },
                    { value: "paid", label: l("Paid", "Pagados") },
                    { value: "failed", label: l("Failed", "Fallidos") },
                    { value: "refunded", label: l("Refunded", "Reembolsados") },
                  ]}
                />
              </>
            }
          />
          {filtered.length ? (
            <Table
              aria-label={l("Workspace orders", "Pedidos del workspace")}
              containerClassName="relative max-w-full"
            >
              <caption className="sr-only">
                {l(
                  "Order numbers, customers, payment status, fulfillment and totals.",
                  "Números de pedido, clientes, estado de pago, envíos y totales.",
                )}
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {l("Order / customer", "Pedido / cliente")}
                  </TableHead>
                  <TableHead>{l("Payment", "Pago")}</TableHead>
                  <TableHead>{l("Fulfillment", "Envío")}</TableHead>
                  <TableHead className="text-right">
                    {l("Total", "Total")}
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">
                      {l("View order", "Ver pedido")}
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow
                    key={order.id}
                    data-order-id={order.id}
                    data-selected={selected?.id === order.id || undefined}
                  >
                    <TableCell className="min-w-44">
                      <button
                        type="button"
                        onClick={() => setSelectedId(order.id)}
                        aria-label={
                          l("View order", "Ver pedido") + ` ${order.number}`
                        }
                        aria-pressed={selected?.id === order.id}
                        className="rounded-sm text-xs font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {order.number}
                      </button>
                      <p className="mt-1 text-xs font-medium">
                        {order.customerName}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {date(order.createdAt)} ·{" "}
                        {l(
                          `${number(order.items.reduce((sum, line) => sum + line.quantity, 0))} items`,
                          `${number(order.items.reduce((sum, line) => sum + line.quantity, 0))} artículos`,
                        )}
                      </p>
                    </TableCell>
                    <TableCell>
                      <CommerceStatusBadge status={order.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <CommerceStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <p className="text-xs font-semibold tabular-nums">
                        {money(order.total, order.currency)}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {order.currency.toUpperCase()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={
                          l("Show details for", "Ver detalles de") +
                          ` ${order.number}`
                        }
                        onClick={() => setSelectedId(order.id)}
                      >
                        <ArrowUpRight aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty
              icon={<Package aria-hidden="true" className="size-5" />}
              title={
                orders.length
                  ? l("No matching orders", "No hay pedidos que coincidan")
                  : l(
                      "Your first order starts here",
                      "Tu primer pedido comienza aquí",
                    )
              }
              description={
                orders.length
                  ? l(
                      "Try another search or clear the filters.",
                      "Prueba otra búsqueda o limpia los filtros.",
                    )
                  : l(
                      "Create an order from your active catalog to begin.",
                      "Crea un pedido con tu catálogo activo para comenzar.",
                    )
              }
              action={
                orders.length ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={reset}
                  >
                    {l("Clear filters", "Limpiar filtros")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={task.disabled || !commerce.canWrite}
                    onClick={() => {
                      task.clearError();
                      setCreating(true);
                    }}
                  >
                    <Plus aria-hidden="true" />
                    {l("New order", "Nuevo pedido")}
                  </Button>
                )
              }
            />
          )}
          <p
            role="status"
            className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground"
          >
            {l(
              `Showing ${number(filtered.length)} of ${number(orders.length)} orders.`,
              `Mostrando ${number(filtered.length)} de ${number(orders.length)} pedidos.`,
            )}
          </p>
        </Card>
        {selectedId !== null && !selected ? (
          <Card>
            <Empty
              title={l("Order not found", "Pedido no encontrado")}
              description={l(
                "The requested order is not available in this workspace.",
                "El pedido solicitado no está disponible en este workspace.",
              )}
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedId(null)}
                >
                  {l("Choose another order", "Elegir otro pedido")}
                </Button>
              }
            />
          </Card>
        ) : (
          <CommerceOrderDetail
            order={selected}
            commerce={commerce}
            task={task}
            onCheckout={onCheckout}
            onStatusChange={changeStatus}
          />
        )}
      </div>
      {creating && (
        <CommerceOrderEditor
          commerce={commerce}
          task={task}
          onClose={() => setCreating(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

function CommerceInvoices({
  commerce,
  task,
  onNotice,
}: {
  commerce: CommerceContextValue;
  task: CommerceTask;
  onNotice: Notify;
}) {
  const { l, number } = useCommerceFormatting();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [currency, setCurrency] = useState("all");
  const [creating, setCreating] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const invoices = [...commerce.invoices].sort((a, b) =>
    b.issuedAt.localeCompare(a.issuedAt),
  );
  const search = query.trim().toLocaleLowerCase();
  const filtered = invoices.filter(
    (invoice) =>
      (status === "all" || invoice.status === status) &&
      (currency === "all" || invoice.currency === currency) &&
      `${invoice.id} ${invoice.number} ${invoice.customerName} ${invoice.customerEmail} ${invoice.description}`
        .toLocaleLowerCase()
        .includes(search),
  );
  const outstanding = invoices.filter(
    (invoice) => invoice.status === "open" || invoice.status === "overdue",
  );
  const paid = invoices.filter((invoice) => invoice.status === "paid");
  const overdue = invoices.filter((invoice) => invoice.status === "overdue");
  const reset = () => {
    setQuery("");
    setStatus("all");
    setCurrency("all");
  };
  const onCreated = (invoice: CommerceInvoice) => {
    setCreating(false);
    setCreatedId(invoice.id);
    reset();
    onNotice(
      l(
        `Invoice ${invoice.number} created.`,
        `Factura ${invoice.number} creada.`,
      ),
      invoice.id,
    );
  };
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        eyebrow={l("Every detail accounted for", "Cada detalle cuenta")}
        title={l("Invoices", "Facturas")}
        description={l(
          "A clear record of what is paid, what is due and what comes next.",
          "Un registro claro de lo pagado, lo pendiente y lo que sigue.",
        )}
        actions={
          <Button
            type="button"
            disabled={task.disabled || !commerce.canWrite}
            onClick={() => {
              task.clearError();
              setCreating(true);
            }}
          >
            <Plus aria-hidden="true" />
            {l("New invoice", "Nueva factura")}
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={l("Total invoices", "Total de facturas")}
          value={number(invoices.length)}
          note={l("In this workspace", "En este workspace")}
          icon={<FileText />}
        />
        <CurrencyMetric
          label={l("Outstanding", "Pendiente")}
          amounts={outstanding}
          note={l(
            "Open and overdue · by currency",
            "Pendientes y vencidas · por moneda",
          )}
          icon={<Clock3 />}
        />
        <CurrencyMetric
          label={l("Collected", "Pagado")}
          amounts={paid}
          note={l(
            "Paid invoices · by currency",
            "Facturas pagadas · por moneda",
          )}
          icon={<CreditCard />}
        />
        <MetricCard
          label={l("Overdue invoices", "Facturas vencidas")}
          value={number(overdue.length)}
          note={l("Awaiting payment", "Esperando el pago")}
          icon={<Clock3 />}
        />
      </div>
      <Card className="overflow-hidden">
        <TableToolbar
          title={l("Invoice overview", "Resumen de facturas")}
          count={number(filtered.length)}
          description={l(
            "Open the selected invoice to pay, print or download its actual details.",
            "Abre una factura para pagar, imprimir o descargar sus datos.",
          )}
          search={
            <CommerceSearch
              value={query}
              onChange={setQuery}
              label={l("Search invoices", "Buscar facturas")}
              placeholder={l(
                "Search invoice or customer…",
                "Buscar factura o cliente…",
              )}
            />
          }
          actions={
            <>
              <Select
                aria-label={l(
                  "Filter invoice status",
                  "Filtrar estado de factura",
                )}
                value={status}
                onValueChange={setStatus}
                className="w-full sm:w-40"
                options={[
                  {
                    value: "all",
                    label: l("All statuses", "Todos los estados"),
                  },
                  { value: "draft", label: l("Draft", "Borrador") },
                  { value: "open", label: l("Open", "Pendiente") },
                  { value: "paid", label: l("Paid", "Pagada") },
                  { value: "overdue", label: l("Overdue", "Vencida") },
                  { value: "void", label: l("Void", "Anulada") },
                ]}
              />
              <Select
                aria-label={l(
                  "Filter invoice currency",
                  "Filtrar moneda de factura",
                )}
                value={currency}
                onValueChange={setCurrency}
                className="w-full sm:w-36"
                options={[
                  {
                    value: "all",
                    label: l("All currencies", "Todas las monedas"),
                  },
                  ...commerceCurrencies.map((value) => ({
                    value,
                    label: value.toUpperCase(),
                  })),
                ]}
              />
            </>
          }
        />
        {filtered.length ? (
          <CommerceInvoiceTable invoices={filtered} selectedId={createdId} />
        ) : (
          <Empty
            icon={<FileText aria-hidden="true" className="size-5" />}
            title={
              invoices.length
                ? l("No matching invoices", "No hay facturas que coincidan")
                : l(
                    "A clear record starts here",
                    "Un registro claro comienza aquí",
                  )
            }
            description={
              invoices.length
                ? l(
                    "Try another search or clear the filters.",
                    "Prueba otra búsqueda o limpia los filtros.",
                  )
                : commerce.mode === "mock"
                  ? l(
                      "Create an invoice or complete a demo checkout to see a record here.",
                      "Crea una factura o completa un pago de ejemplo para ver un registro aquí.",
                    )
                  : l(
                      "Create an invoice to start this workspace's history.",
                      "Crea una factura para comenzar el historial de este workspace.",
                    )
            }
            action={
              invoices.length ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={reset}
                >
                  {l("Clear filters", "Limpiar filtros")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={task.disabled || !commerce.canWrite}
                  onClick={() => {
                    task.clearError();
                    setCreating(true);
                  }}
                >
                  <Plus aria-hidden="true" />
                  {l("New invoice", "Nueva factura")}
                </Button>
              )
            }
          />
        )}
        <p
          role="status"
          className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground"
        >
          {l(
            `Showing ${number(filtered.length)} of ${number(invoices.length)} invoices.`,
            `Mostrando ${number(filtered.length)} de ${number(invoices.length)} facturas.`,
          )}
        </p>
      </Card>
      {creating && (
        <CommerceInvoiceEditor
          commerce={commerce}
          task={task}
          onClose={() => setCreating(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}
