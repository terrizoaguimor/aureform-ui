"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  FlaskConical,
  Package,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import {
  CommerceError,
  type CommerceAction,
  type CommerceContextValue,
  type CommerceCurrency,
} from "@/lib/commerce";
import { commercePlans } from "@/lib/commerce-state";
import { publicPath } from "@/lib/public-path";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export type MockCommerceAction = Extract<CommerceAction, { mode: "mock" }>;
export type CommerceTask = {
  pending: boolean;
  disabled: boolean;
  error: string | null;
  clearError: () => void;
  run: <T>(
    operation: () => Promise<T>,
    onSuccess?: (value: T) => void,
  ) => Promise<boolean>;
};

export function commerceErrorMessage(
  cause: unknown,
  l: (en: string, es: string) => string,
) {
  if (cause instanceof CommerceError) {
    const messages: Record<CommerceError["code"], string> = {
      validation: l(
        "Check the details and try again.",
        "Revisa los datos e intenta de nuevo.",
      ),
      unavailable: l(
        "This record or product is no longer available. Refresh and try again.",
        "Este registro o producto ya no está disponible. Actualiza e intenta de nuevo.",
      ),
      conflict: l(
        "The record could not be changed in its current state. Refresh and review its availability or status.",
        "No se pudo cambiar el registro en su estado actual. Actualiza y revisa su disponibilidad o estado.",
      ),
      forbidden: l(
        "Your current role cannot make this change.",
        "Tu rol actual no permite realizar este cambio.",
      ),
      provider: l(
        "The commerce service could not complete this request. Try again.",
        "El servicio de comercio no pudo completar la solicitud. Intenta de nuevo.",
      ),
    };
    return l(cause.message || messages[cause.code], messages[cause.code]);
  }
  return l(
    "The request could not be completed. Your details are still here; try again.",
    "No se pudo completar la solicitud. Tus datos siguen aquí; intenta de nuevo.",
  );
}

/** One request at a time; late responses cannot reopen an unmounted workspace. */
export function useCommerceTask(commerce: CommerceContextValue): CommerceTask {
  const { l } = useLanguage();
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      onSuccess?: (value: T) => void,
    ): Promise<boolean> => {
      if (!mounted.current || inFlight.current || commerce.busy !== null) {
        return false;
      }
      inFlight.current = true;
      setPending(true);
      setError(null);
      try {
        const result = await operation();
        if (!mounted.current) return false;
        onSuccess?.(result);
        return true;
      } catch (cause) {
        if (mounted.current) setError(commerceErrorMessage(cause, l));
        return false;
      } finally {
        inFlight.current = false;
        if (mounted.current) setPending(false);
      }
    },
    [commerce.busy, l],
  );

  const clearError = useCallback(() => setError(null), []);
  return {
    pending,
    disabled: pending || commerce.busy !== null || !commerce.ready,
    error,
    clearError,
    run,
  };
}

export function useCommerceFormatting() {
  const language = useLanguage();
  const { number } = language;
  const money = useCallback(
    (amount: number, currency: CommerceCurrency) =>
      number(amount / 100, {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [number],
  );
  return { ...language, money };
}

type CommerceStatus =
  | CommerceContextValue["orders"][number]["status"]
  | CommerceContextValue["orders"][number]["paymentStatus"]
  | CommerceContextValue["invoices"][number]["status"]
  | CommerceContextValue["billing"]["status"];

export function CommerceStatusBadge({ status }: { status: CommerceStatus }) {
  const { l } = useLanguage();
  const labels: Record<CommerceStatus, string> = {
    processing: l("Processing", "En preparación"),
    shipped: l("Shipped", "Enviado"),
    delivered: l("Delivered", "Entregado"),
    cancelled: l("Cancelled", "Cancelado"),
    unpaid: l("Unpaid", "Sin pagar"),
    paid: l("Paid", "Pagado"),
    failed: l("Failed", "Fallido"),
    refunded: l("Refunded", "Reembolsado"),
    draft: l("Draft", "Borrador"),
    open: l("Open", "Pendiente"),
    overdue: l("Overdue", "Vencido"),
    void: l("Void", "Anulado"),
    active: l("Active", "Activo"),
    trialing: l("Trial", "Prueba"),
    past_due: l("Past due", "Pago vencido"),
  };
  const variant: BadgeProps["variant"] = [
    "failed",
    "overdue",
    "past_due",
  ].includes(status)
    ? "destructive"
    : ["processing", "unpaid", "trialing", "open"].includes(status)
      ? "warning"
      : ["draft", "cancelled", "refunded", "void"].includes(status)
        ? "neutral"
        : "default";
  return <Badge variant={variant}>{labels[status]}</Badge>;
}

export function CommerceTotals({
  amounts,
}: {
  amounts: readonly { amount: number; currency: CommerceCurrency }[];
}) {
  const { l, money } = useCommerceFormatting();
  const totals = new Map<CommerceCurrency, number>();
  for (const item of amounts) {
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount);
  }
  return totals.size ? (
    <span className="flex flex-col gap-1 tabular-nums">
      {[...totals]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, amount]) => (
          <span key={currency}>{money(amount, currency)}</span>
        ))}
    </span>
  ) : (
    <span className="text-muted-foreground">{l("—", "—")}</span>
  );
}

export function CommerceProductThumbnail({
  src,
  className,
}: {
  src?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-subtle",
        className,
      )}
    >
      {src ? (
        <img
          src={publicPath(src)}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <Package aria-hidden="true" className="size-5 text-muted-foreground" />
      )}
    </span>
  );
}

export function CommerceCheckout({
  action,
  commerce,
  task,
  onClose,
}: {
  action: MockCommerceAction;
  commerce: CommerceContextValue;
  task: CommerceTask;
  onClose: () => void;
}) {
  const { l, locale, money, date } = useCommerceFormatting();
  const [outcome, setOutcome] = useState<"preview" | "paid" | "failed">(
    "preview",
  );
  const order =
    action.kind === "order"
      ? commerce.orders.find((item) => item.id === action.id)
      : undefined;
  const invoice =
    action.kind === "invoice"
      ? commerce.invoices.find((item) => item.id === action.id)
      : undefined;
  const plan =
    action.kind === "subscription"
      ? commercePlans.find((item) => item.name === action.id)
      : undefined;
  const portal = action.kind === "portal";
  const valid = portal || !!order || !!invoice || !!plan;
  const allowed =
    portal || plan ? commerce.canManageBilling : commerce.canWrite;
  const paid =
    outcome === "paid" ||
    order?.paymentStatus === "paid" ||
    invoice?.status === "paid";
  const payable =
    valid &&
    !portal &&
    !paid &&
    order?.status !== "cancelled" &&
    order?.paymentStatus !== "refunded" &&
    invoice?.status !== "draft" &&
    invoice?.status !== "void";
  const stockQuantities = new Map<string, number>();
  for (const line of order?.items ?? []) {
    stockQuantities.set(
      line.productId,
      (stockQuantities.get(line.productId) ?? 0) + line.quantity,
    );
  }
  const stockProblem = [...stockQuantities].some(([productId, quantity]) => {
    const product = commerce.products.find((item) => item.id === productId);
    return (
      !product || product.status !== "active" || product.inventory < quantity
    );
  });
  const amount = order?.total ?? invoice?.amount ?? plan?.amount;
  const currency =
    order?.currency ?? invoice?.currency ?? commerce.billing.currency;
  const label = order?.number ?? invoice?.number ?? plan?.name;
  const customer =
    order?.customerEmail ??
    invoice?.customerEmail ??
    commerce.billing.customerEmail;
  const receipt = order
    ? commerce.invoices.find((item) => item.id === `inv-order-${order.id}`)
    : undefined;
  const title = portal
    ? l("Demo customer portal", "Portal de cliente de ejemplo")
    : paid
      ? l("Demo payment complete", "Pago de ejemplo completado")
      : l("Preview demo checkout", "Vista previa del pago de ejemplo");

  const simulate = (next: "paid" | "failed") => {
    if (task.disabled || !allowed || !payable || commerce.mode !== "mock")
      return;
    void task.run(
      () => commerce.simulateCheckout(action, next),
      () => setOutcome(next),
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !task.pending && commerce.busy === null) onClose();
      }}
    >
      <DialogContent
        closeLabel={l("Close preview", "Cerrar vista previa")}
        className="max-w-xl"
      >
        <Badge variant="outline" className="mb-4">
          <FlaskConical aria-hidden="true" />
          {l("Mock · no charge", "Simulación · sin cobro")}
        </Badge>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {portal
            ? l(
                "Review the subscription stored in this demo workspace.",
                "Consulta la suscripción guardada en este workspace de ejemplo.",
              )
            : l(
                "Choose a simulated result. No card details are needed and no money moves.",
                "Elige un resultado simulado. No se necesitan datos de tarjeta y no se mueve dinero.",
              )}
        </DialogDescription>

        <div className="mt-6 grid gap-5">
          {!valid ? (
            <Alert
              variant="warning"
              title={l("Record unavailable", "Registro no disponible")}
            >
              {l(
                "Close this preview and refresh the workspace.",
                "Cierra esta vista previa y actualiza el workspace.",
              )}
            </Alert>
          ) : portal ? (
            <>
              <div className="rounded-xl border border-border bg-surface-subtle/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold">
                    {commerce.billing.plan}
                  </p>
                  <CommerceStatusBadge status={commerce.billing.status} />
                </div>
                <p className="mt-4 text-2xl font-semibold tabular-nums">
                  {money(commerce.billing.amount, commerce.billing.currency)}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {commerce.billing.interval === "month"
                      ? l("/ month", "/ mes")
                      : l("/ year", "/ año")}
                  </span>
                </p>
                <dl className="mt-5 grid gap-3 text-xs">
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-muted-foreground">
                      {l("Period ends", "Fin del período")}
                    </dt>
                    <dd>{date(commerce.billing.currentPeriodEnd)}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-muted-foreground">
                      {l("Payment method", "Método de pago")}
                    </dt>
                    <dd>
                      {commerce.billing.cardBrand} · ••••{" "}
                      {commerce.billing.cardLast4}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-muted-foreground">
                      {l("Billing email", "Correo de facturación")}
                    </dt>
                    <dd className="break-all">{customer}</dd>
                  </div>
                </dl>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                {l(
                  "This is a local portal preview. Choose a plan on the billing page to simulate a subscription change.",
                  "Esta es una vista previa local del portal. Elige un plan en la página de facturación para simular un cambio de suscripción.",
                )}
              </p>
              <Link
                href={`/${locale}/invoices/`}
                onClick={onClose}
                className={buttonVariants({ variant: "outline" })}
              >
                <ReceiptText aria-hidden="true" />
                {l("View shared invoices", "Ver facturas compartidas")}
              </Link>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-surface-subtle/40 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {currency.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  {customer}
                </p>
                {order && (
                  <ul className="mt-5 grid gap-4 border-t border-border pt-5">
                    {order.items.map((line, index) => (
                      <li
                        key={`${line.productId}:${index}`}
                        className="flex items-center gap-3"
                      >
                        <CommerceProductThumbnail
                          src={line.image}
                          className="size-10"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">{line.name}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {line.quantity} × {money(line.unitAmount, currency)}
                          </p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums">
                          {money(line.quantity * line.unitAmount, currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {invoice && (
                  <div className="mt-5 border-t border-border pt-4 text-xs leading-6">
                    <p className="whitespace-pre-wrap break-words">
                      {invoice.description}
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      {l("Due", "Vence")} {date(invoice.dueAt)}
                    </p>
                  </div>
                )}
                {plan && (
                  <p className="mt-5 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
                    {l("Current plan", "Plan actual")}: {commerce.billing.plan}
                    {" → "}
                    {plan.name} ·{" "}
                    {l(
                      "monthly demo subscription",
                      "suscripción mensual de ejemplo",
                    )}
                  </p>
                )}
                {amount !== undefined && (
                  <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-5">
                    <span className="text-xs font-medium">
                      {plan
                        ? l("Demo monthly price", "Precio mensual de ejemplo")
                        : l("Total", "Total")}
                    </span>
                    <span className="text-2xl font-semibold tracking-tight tabular-nums">
                      {money(amount, currency)}
                    </span>
                  </div>
                )}
              </div>

              {paid ? (
                <Alert
                  variant="success"
                  title={l(
                    "Simulated payment recorded",
                    "Pago simulado registrado",
                  )}
                >
                  {order
                    ? l(
                        "The shared order is paid. Stock and its invoice have been updated in this demo workspace.",
                        "El pedido compartido está pagado. Las existencias y su factura se actualizaron en este workspace de ejemplo.",
                      )
                    : plan
                      ? l(
                          "The shared subscription and invoice history now reflect this demo plan.",
                          "La suscripción compartida y el historial de facturas ahora muestran este plan de ejemplo.",
                        )
                      : l(
                          "This shared invoice now shows paid.",
                          "Esta factura compartida ahora aparece como pagada.",
                        )}
                </Alert>
              ) : outcome === "failed" ? (
                <Alert
                  variant="destructive"
                  title={l("Demo payment failed", "El pago de ejemplo falló")}
                >
                  {l(
                    "No stock was consumed and no paid invoice was added. You can retry with a successful demo payment.",
                    "No se descontaron existencias ni se agregó una factura pagada. Puedes reintentar con un pago de ejemplo exitoso.",
                  )}
                </Alert>
              ) : (
                <div className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-primary"
                  />
                  <p>
                    {l(
                      "This simulation updates the shared demo records. It does not charge a payment method.",
                      "Esta simulación actualiza los registros compartidos de ejemplo. No cobra a ningún método de pago.",
                    )}
                  </p>
                </div>
              )}
              {!paid && stockProblem && (
                <Alert
                  variant="warning"
                  title={l(
                    "Inventory needs attention",
                    "Revisa las existencias",
                  )}
                >
                  {l(
                    "An item is unavailable or has insufficient stock. Review the catalog before simulating success.",
                    "Un artículo no está disponible o no tiene suficientes existencias. Revisa el catálogo antes de simular un pago exitoso.",
                  )}
                </Alert>
              )}
              {!paid && !payable && (
                <Alert
                  variant="warning"
                  title={l("Payment unavailable", "Pago no disponible")}
                >
                  {l(
                    "This record cannot accept a payment in its current state.",
                    "Este registro no puede aceptar un pago en su estado actual.",
                  )}
                </Alert>
              )}
              {receipt && (
                <Link
                  href={{
                    pathname: `/${locale}/invoice/`,
                    query: { id: receipt.id },
                  }}
                  onClick={onClose}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <ReceiptText aria-hidden="true" />
                  {l("View receipt", "Ver recibo")}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              )}
            </>
          )}
          {task.error && (
            <Alert
              variant="destructive"
              title={l(
                "Payment could not be completed",
                "No se pudo completar el pago",
              )}
            >
              {task.error}
            </Alert>
          )}
          {!allowed && (
            <Alert title={l("Read-only preview", "Vista previa de lectura")}>
              {l(
                "Your role cannot change this record.",
                "Tu rol no permite cambiar este registro.",
              )}
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-wrap">
          {portal || paid || !valid ? (
            <Button type="button" onClick={onClose} disabled={task.pending}>
              {paid && <CheckCircle2 aria-hidden="true" />}
              {l("Done", "Listo")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={task.disabled || !allowed || !payable}
                onClick={() => simulate("failed")}
              >
                {l("Simulate failed payment", "Simular pago fallido")}
              </Button>
              <Button
                type="button"
                disabled={
                  task.disabled || !allowed || !payable || !!stockProblem
                }
                loading={task.pending}
                onClick={() => simulate("paid")}
              >
                {outcome === "failed" ? (
                  <RotateCcw aria-hidden="true" />
                ) : (
                  <CreditCard aria-hidden="true" />
                )}
                {outcome === "failed"
                  ? l("Retry demo payment", "Reintentar pago de ejemplo")
                  : l("Simulate paid", "Simular pago exitoso")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
