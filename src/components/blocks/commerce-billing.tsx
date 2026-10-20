"use client";

import { useId } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CreditCard,
  FlaskConical,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  getCommerceProviderLabel,
  type CommerceBilling as Billing,
  type CommerceContextValue,
} from "@/lib/commerce";
import { commercePlans } from "@/lib/commerce-state";
import { cn } from "@/lib/utils";
import { CommerceInvoiceTable } from "@/components/blocks/commerce-invoice-view";
import {
  CommerceStatusBadge,
  useCommerceFormatting,
  type CommerceTask,
} from "@/components/blocks/commerce-checkout";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";

export function CommerceBilling({
  commerce,
  task,
  onPlan,
  onPortal,
}: {
  commerce: CommerceContextValue;
  task: CommerceTask;
  onPlan: (plan: Billing["plan"]) => void;
  onPortal: () => void;
}) {
  const { l, locale, money, date, number } = useCommerceFormatting();
  const headingId = useId();
  const { billing } = commerce;
  const mock = commerce.mode === "mock";
  const providerLabel = getCommerceProviderLabel(commerce);
  const disabled = task.disabled || !commerce.canManageBilling;
  const history = [...commerce.invoices]
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .slice(0, 6);
  const periodLabel =
    billing.status === "trialing"
      ? l("Trial ends", "Fin de la prueba")
      : billing.status === "active"
        ? l("Next renewal", "Próxima renovación")
        : l("Billing period ends", "Fin del período de facturación");

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-6">
      <div
        data-motion="intro"
        className="flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-end"
      >
        <div className="min-w-0">
          <p className="mb-3 flex items-center gap-2 text-[11px] leading-5 font-semibold tracking-[.1em] text-primary uppercase">
            <span
              aria-hidden="true"
              className="h-px w-5 shrink-0 bg-primary/65"
            />
            {l("Room to grow", "Espacio para crecer")}
          </p>
          <h2
            id={headingId}
            className="text-[30px] leading-[1.15] font-semibold tracking-[-.035em] text-balance sm:text-[36px]"
          >
            {l("Plans & billing", "Planes y facturación")}
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-7 text-pretty text-muted-foreground">
            {l(
              "Your subscription, payment method and workspace invoice history.",
              "Tu suscripción, método de pago e historial de facturas del workspace.",
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pb-1">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            loading={task.pending}
            onClick={onPortal}
          >
            <CreditCard aria-hidden="true" />
            {mock
              ? l("Preview portal", "Ver portal de ejemplo")
              : l(
                  `Manage billing with ${providerLabel}`,
                  `Gestionar facturación con ${providerLabel}`,
                )}
            {!mock && <ArrowUpRight aria-hidden="true" />}
          </Button>
        </div>
      </div>
      {billing.status === "past_due" && (
        <Alert
          variant="warning"
          title={l(
            "Subscription needs attention",
            "La suscripción necesita atención",
          )}
        >
          {l(
            "Review your billing details and outstanding invoices to resolve the overdue payment.",
            "Revisa tus datos de facturación y las facturas pendientes para resolver el pago vencido.",
          )}
        </Alert>
      )}
      {billing.status === "cancelled" && (
        <Alert title={l("Subscription cancelled", "Suscripción cancelada")}>
          {l(
            "The recorded subscription is cancelled. Review a plan to start a new checkout.",
            "La suscripción registrada está cancelada. Revisa un plan para iniciar un nuevo pago.",
          )}
        </Alert>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card appearance="gradient" className="overflow-hidden">
          <CardHeader className="border-b border-border/65">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{l("Your current plan", "Tu plan actual")}</CardTitle>
              <CommerceStatusBadge status={billing.status} />
            </div>
            <CardDescription>
              {l(
                "A clear view of your current subscription.",
                "Una vista clara de tu suscripción actual.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <Sparkles
                    aria-hidden="true"
                    className="size-5 text-primary"
                  />
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {billing.plan}
                  </h2>
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
                  {money(billing.amount, billing.currency)}
                  <span className="ml-2 text-xs font-normal tracking-normal text-muted-foreground">
                    {billing.interval === "month"
                      ? l("/ month", "/ mes")
                      : l("/ year", "/ año")}
                  </span>
                </p>
              </div>
              <Badge variant="outline">
                {mock
                  ? commerce.provider
                    ? l(
                        `${providerLabel} · demo subscription`,
                        `${providerLabel} · suscripción de ejemplo`,
                      )
                    : l("Demo subscription", "Suscripción de ejemplo")
                  : l(
                      `${providerLabel} subscription`,
                      `Suscripción de ${providerLabel}`,
                    )}
              </Badge>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-4 py-3 text-xs">
              <CalendarDays
                aria-hidden="true"
                className="size-4 text-primary"
              />
              <span className="text-muted-foreground">{periodLabel}</span>
              <span className="ml-auto font-semibold">
                {date(billing.currentPeriodEnd)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{l("Payment method", "Método de pago")}</CardTitle>
            <CardDescription>
              {l(
                "Only the recorded brand and last four digits are shown.",
                "Se muestran la marca y los últimos cuatro dígitos registrados.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-subtle/40 p-4">
              <span
                aria-hidden="true"
                className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface"
              >
                <CreditCard className="size-5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {billing.cardLast4
                    ? `${billing.cardBrand} · •••• ${billing.cardLast4}`
                    : l(
                        "No card details available",
                        "No hay datos de tarjeta disponibles",
                      )}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {mock
                    ? l(
                        "Masked demo payment method",
                        "Método de pago de ejemplo enmascarado",
                      )
                    : l(
                        `Payment method managed by ${providerLabel}`,
                        `Método de pago gestionado por ${providerLabel}`,
                      )}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                {l("Billing email", "Correo de facturación")}
              </p>
              <p className="mt-1 break-all text-xs font-medium">
                {billing.customerEmail}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={onPortal}
            >
              <ShieldCheck aria-hidden="true" />
              {mock
                ? l("Review demo billing", "Revisar facturación de ejemplo")
                : l(
                    `Open ${providerLabel} customer portal`,
                    `Abrir portal de cliente de ${providerLabel}`,
                  )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <section
        aria-label={l("Available plans", "Planes disponibles")}
        className="grid gap-4 md:grid-cols-3"
      >
        {commercePlans.map((plan) => {
          const current = billing.plan === plan.name;
          const settled = current && billing.status === "active";
          return (
            <Card
              key={plan.name}
              className={cn(
                "flex flex-col p-5 sm:p-6",
                current && "border-primary/45",
              )}
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{plan.name}</h2>
                {current && <Badge>{l("Current plan", "Plan actual")}</Badge>}
              </div>
              <p className="mt-6 text-2xl font-semibold tracking-tight tabular-nums">
                {mock
                  ? money(plan.amount, billing.currency)
                  : l("Price at checkout", "Precio al pagar")}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {mock
                  ? l(
                      "Illustrative monthly price",
                      "Precio mensual ilustrativo",
                    )
                  : l(
                      "Your service confirms pricing and terms.",
                      "Tu servicio confirma los precios y las condiciones.",
                    )}
              </p>
              <p className="my-5 flex-1 text-xs leading-6 text-muted-foreground">
                {plan.name === "Starter"
                  ? l(
                      "A considered start for a small workspace.",
                      "Un comienzo cuidado para un workspace pequeño.",
                    )
                  : plan.name === "Pro"
                    ? l(
                        "More room for a growing team.",
                        "Más espacio para un equipo en crecimiento.",
                      )
                    : l(
                        "A plan for a shared ambition.",
                        "Un plan para una ambición compartida.",
                      )}
              </p>
              <Button
                type="button"
                variant={
                  current
                    ? "secondary"
                    : plan.name === "Enterprise"
                      ? "default"
                      : "outline"
                }
                className="w-full"
                disabled={disabled || settled}
                onClick={() => onPlan(plan.name)}
              >
                {settled ? (
                  <Check aria-hidden="true" />
                ) : (
                  <ArrowUpRight aria-hidden="true" />
                )}
                {settled
                  ? l("Current plan", "Plan actual")
                  : mock
                    ? l(`Preview ${plan.name}`, `Ver ${plan.name}`)
                    : l(`Review ${plan.name}`, `Revisar ${plan.name}`)}
              </Button>
            </Card>
          );
        })}
      </section>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-subtle/30 px-4 py-3 text-xs leading-6 text-muted-foreground">
        {mock ? (
          <FlaskConical
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-primary"
          />
        ) : (
          <ShieldCheck
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-primary"
          />
        )}
        <p>
          {mock
            ? l(
                "Plan previews use mock payments. A successful simulation updates the shared subscription and adds its invoice below.",
                "Las vistas previas de planes usan pagos simulados. Una simulación exitosa actualiza la suscripción compartida y agrega su factura abajo.",
              )
            : l(
                "Plan changes and the customer portal open through your commerce service. The service confirms the resulting subscription.",
                "Los cambios de plan y el portal de cliente se abren mediante tu servicio de comercio. El servicio confirma la suscripción resultante.",
              )}
        </p>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/65">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>
                {l("Invoice history", "Historial de facturas")}
              </CardTitle>
              <CardDescription className="mt-1">
                {l(
                  "Order receipts and workspace invoices in one place.",
                  "Recibos de pedidos y facturas del workspace en un solo lugar.",
                )}
              </CardDescription>
            </div>
            <Link
              href={`/${locale}/invoices/`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {l("All invoices", "Todas las facturas")}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </CardHeader>
        {history.length ? (
          <CommerceInvoiceTable invoices={history} />
        ) : (
          <Empty
            icon={<ReceiptText aria-hidden="true" className="size-5" />}
            title={l(
              "No invoice history yet",
              "Aún no hay historial de facturas",
            )}
            description={
              mock
                ? l(
                    "Created invoices and successful demo checkout receipts appear here.",
                    "Aquí aparecen las facturas creadas y los recibos de pagos de ejemplo exitosos.",
                  )
                : l(
                    "Invoices from your commerce service appear here.",
                    "Aquí aparecen las facturas de tu servicio de comercio.",
                  )
            }
          />
        )}
        {history.length > 0 && (
          <p className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
            {l(
              `Showing ${number(history.length)} of ${number(commerce.invoices.length)} workspace invoices.`,
              `Mostrando ${number(history.length)} de ${number(commerce.invoices.length)} facturas del workspace.`,
            )}
          </p>
        )}
      </Card>
    </section>
  );
}
