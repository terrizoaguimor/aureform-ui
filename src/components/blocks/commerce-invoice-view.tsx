"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  Download,
  FileText,
  Printer,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import {
  commerceCurrencies,
  getCommerceProviderLabel,
  newInvoiceSchema,
  type CommerceContextValue,
  type CommerceCurrency,
  type CommerceInvoice,
} from "@/lib/commerce";
import { downloadText } from "@/lib/utils";
import { Brand } from "@/components/brand";
import { PageHeading } from "@/components/blocks/page-heading";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CommerceStatusBadge,
  useCommerceFormatting,
  type CommerceTask,
} from "@/components/blocks/commerce-checkout";

/** Parse the two supported decimal separators without rounding a float. */
export function parseCommerceAmount(value: string): number | null {
  const input = value.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(input)) return null;
  const [whole, fraction = ""] = input.split(/[.,]/);
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 100_000_000
    ? amount
    : null;
}

function defaultDueDate() {
  const due = new Date();
  due.setDate(due.getDate() + 14);
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
}

type InvoiceErrors = Partial<
  Record<
    "customerName" | "customerEmail" | "description" | "amount" | "dueAt",
    string
  >
>;

export function CommerceInvoiceEditor({
  commerce,
  task,
  onClose,
  onCreated,
}: {
  commerce: CommerceContextValue;
  task: CommerceTask;
  onClose: () => void;
  onCreated: (invoice: CommerceInvoice) => void;
}) {
  const { l, money } = useCommerceFormatting();
  const form = useRef<HTMLFormElement>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [currency, setCurrency] = useState<CommerceCurrency>(
    commerce.billing.currency,
  );
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [errors, setErrors] = useState<InvoiceErrors>({});
  const amount = parseCommerceAmount(amountInput);
  const disabled = task.disabled || !commerce.canWrite;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    let dueAt = "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      const due = new Date(`${dueDate}T23:59:59`);
      const calendarDate = Number.isFinite(due.getTime())
        ? `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`
        : "";
      if (calendarDate === dueDate) {
        dueAt = due.toISOString();
      }
    }
    const parsed = newInvoiceSchema.safeParse({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      description: description.trim(),
      amount: amount ?? -1,
      currency,
      dueAt,
    });
    const nextErrors: InvoiceErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        switch (issue.path[0]) {
          case "customerName":
            nextErrors.customerName = l(
              "Enter a name with 2–140 characters.",
              "Escribe un nombre de 2 a 140 caracteres.",
            );
            break;
          case "customerEmail":
            nextErrors.customerEmail = l(
              "Enter a valid customer email.",
              "Escribe un correo válido para el cliente.",
            );
            break;
          case "description":
            nextErrors.description = l(
              "Describe the invoice using 2–1,000 characters.",
              "Describe la factura con 2 a 1.000 caracteres.",
            );
            break;
          case "amount":
            nextErrors.amount = l(
              "Enter an amount from 0 to 1,000,000 with up to two decimals.",
              "Escribe un importe entre 0 y 1.000.000 con un máximo de dos decimales.",
            );
            break;
          default:
            nextErrors.dueAt = l(
              "Choose a valid due date.",
              "Elige una fecha de vencimiento válida.",
            );
        }
      }
    }
    setErrors(nextErrors);
    if (!parsed.success) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    void task.run(() => commerce.createInvoice(parsed.data), onCreated);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !task.pending && commerce.busy === null) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl"
        closeLabel={l("Close invoice form", "Cerrar formulario de factura")}
      >
        <DialogTitle>{l("New invoice", "Nueva factura")}</DialogTitle>
        <DialogDescription>
          {l(
            "Create an invoice in the shared workspace. Its payment is a separate step.",
            "Crea una factura en el workspace compartido. El pago se realiza por separado.",
          )}
        </DialogDescription>
        <form ref={form} onSubmit={submit} noValidate className="mt-6">
          <fieldset disabled={disabled} className="grid min-w-0 gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={l("Customer name", "Nombre del cliente")}
                error={errors.customerName}
              >
                <Input
                  name="customerName"
                  autoComplete="name"
                  value={customerName}
                  maxLength={140}
                  required
                  onChange={(event) => {
                    setCustomerName(event.target.value);
                    setErrors((previous) => ({
                      ...previous,
                      customerName: undefined,
                    }));
                  }}
                />
              </Field>
              <Field
                label={l("Customer email", "Correo del cliente")}
                error={errors.customerEmail}
              >
                <Input
                  name="customerEmail"
                  type="email"
                  autoComplete="email"
                  value={customerEmail}
                  maxLength={254}
                  required
                  onChange={(event) => {
                    setCustomerEmail(event.target.value);
                    setErrors((previous) => ({
                      ...previous,
                      customerEmail: undefined,
                    }));
                  }}
                />
              </Field>
            </div>
            <Field
              label={l("Description", "Descripción")}
              error={errors.description}
            >
              <Textarea
                name="description"
                value={description}
                maxLength={1000}
                required
                placeholder={l("What is this invoice for?", "¿Qué se factura?")}
                className="min-h-24"
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrors((previous) => ({
                    ...previous,
                    description: undefined,
                  }));
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
              <Field
                label={l("Amount", "Importe")}
                description={l(
                  "Use up to two decimals; no thousands separator.",
                  "Usa un máximo de dos decimales; sin separador de miles.",
                )}
                error={errors.amount}
              >
                <Input
                  name="amount"
                  inputMode="decimal"
                  value={amountInput}
                  maxLength={14}
                  required
                  placeholder={l("0.00", "0,00")}
                  onChange={(event) => {
                    setAmountInput(event.target.value);
                    setErrors((previous) => ({
                      ...previous,
                      amount: undefined,
                    }));
                  }}
                />
              </Field>
              <Field label={l("Currency", "Moneda")}>
                <Select
                  name="currency"
                  value={currency}
                  disabled={disabled}
                  options={commerceCurrencies.map((value) => ({
                    value,
                    label: value.toUpperCase(),
                  }))}
                  onValueChange={(value) =>
                    setCurrency(value as CommerceCurrency)
                  }
                />
              </Field>
            </div>
            <Field
              label={l("Due date", "Fecha de vencimiento")}
              error={errors.dueAt}
            >
              <Input
                name="dueDate"
                type="date"
                value={dueDate}
                required
                onChange={(event) => {
                  setDueDate(event.target.value);
                  setErrors((previous) => ({ ...previous, dueAt: undefined }));
                }}
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-subtle/40 p-4">
              <span className="text-xs font-medium">
                {l("Invoice total", "Total de la factura")}
              </span>
              <span
                aria-live="polite"
                className="text-2xl font-semibold tabular-nums"
              >
                {amount === null ? "—" : money(amount, currency)}
              </span>
            </div>
          </fieldset>
          {task.error && (
            <Alert
              variant="destructive"
              className="mt-5"
              title={l(
                "Invoice could not be created",
                "No se pudo crear la factura",
              )}
            >
              {task.error}
            </Alert>
          )}
          <DialogFooter className="flex-wrap">
            <Button
              type="button"
              variant="outline"
              disabled={task.pending || commerce.busy !== null}
              onClick={onClose}
            >
              {l("Cancel", "Cancelar")}
            </Button>
            <Button type="submit" disabled={disabled} loading={task.pending}>
              <ReceiptText aria-hidden="true" />
              {l("Create invoice", "Crear factura")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CommerceInvoiceTable({
  invoices,
  selectedId,
}: {
  invoices: readonly CommerceInvoice[];
  selectedId?: string | null;
}) {
  const { l, locale, money, date } = useCommerceFormatting();
  return (
    <Table
      aria-label={l("Workspace invoices", "Facturas del workspace")}
      containerClassName="relative max-w-full"
    >
      <caption className="sr-only">
        {l(
          "Invoice numbers, customers, payment status, dates and amounts.",
          "Números de factura, clientes, estado de pago, fechas e importes.",
        )}
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead>{l("Invoice", "Factura")}</TableHead>
          <TableHead>{l("Customer", "Cliente")}</TableHead>
          <TableHead>{l("Status", "Estado")}</TableHead>
          <TableHead>{l("Issued / due", "Emisión / vencimiento")}</TableHead>
          <TableHead className="text-right">{l("Amount", "Importe")}</TableHead>
          <TableHead>
            <span className="sr-only">{l("View invoice", "Ver factura")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow
            key={invoice.id}
            data-invoice-id={invoice.id}
            data-selected={selectedId === invoice.id || undefined}
          >
            <TableCell className="min-w-40">
              <Link
                href={{
                  pathname: `/${locale}/invoice/`,
                  query: { id: invoice.id },
                }}
                className="rounded-sm text-xs font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {invoice.number}
              </Link>
              <p
                className="mt-1 max-w-48 truncate text-[11px] text-muted-foreground"
                title={invoice.description}
              >
                {invoice.description}
              </p>
            </TableCell>
            <TableCell className="min-w-44">
              <p className="text-xs font-medium">{invoice.customerName}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {invoice.customerEmail}
              </p>
            </TableCell>
            <TableCell>
              <CommerceStatusBadge status={invoice.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <p className="text-xs">{date(invoice.issuedAt)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {l("Due", "Vence")} {date(invoice.dueAt)}
              </p>
            </TableCell>
            <TableCell className="whitespace-nowrap text-right">
              <p className="text-xs font-semibold tabular-nums">
                {money(invoice.amount, invoice.currency)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {invoice.currency.toUpperCase()}
              </p>
            </TableCell>
            <TableCell>
              <Link
                href={{
                  pathname: `/${locale}/invoice/`,
                  query: { id: invoice.id },
                }}
                aria-label={
                  l("View invoice", "Ver factura") + ` ${invoice.number}`
                }
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                })}
              >
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function escapeInvoiceHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

/** A local document with the selected record, suitable for download and print. */
export function commerceInvoiceDocument({
  invoice,
  workspaceName,
  locale,
  mock,
}: {
  invoice: CommerceInvoice;
  workspaceName: string;
  locale: string;
  mock: boolean;
}) {
  const l = (en: string, es: string) => (locale === "es" ? es : en);
  const money = new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    style: "currency",
    currency: invoice.currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(invoice.amount / 100);
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  const statuses: Record<CommerceInvoice["status"], string> = {
    draft: l("Draft", "Borrador"),
    open: l("Open", "Pendiente"),
    paid: l("Paid", "Pagado"),
    overdue: l("Overdue", "Vencido"),
    void: l("Void", "Anulado"),
  };
  const e = escapeInvoiceHtml;
  return `<!doctype html>
<html lang="${locale === "es" ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(invoice.number)} · ${e(workspaceName)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#20242c;font:14px/1.65 system-ui,sans-serif}
article{max-width:800px;margin:40px auto;background:white;border:1px solid #e1e4e8;border-radius:16px;padding:48px}
.top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;border-bottom:1px solid #e1e4e8;padding-bottom:28px}
h1{font-size:28px;line-height:1.2;margin:8px 0}h2{font-size:14px;margin:0 0 8px}
p{margin:4px 0;overflow-wrap:anywhere}.muted,dt{color:#647080}.tag{display:inline-block;font-size:11px;padding:4px 10px;background:#edf1f5;border-radius:20px}
.details{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:32px 0}
dl{margin:0}dl>div{display:flex;justify-content:space-between;gap:20px;margin:0 0 10px}dd{margin:0;font-weight:600;text-align:right}
table{width:100%;border-collapse:collapse}th,td{padding:16px 0;text-align:left;border-bottom:1px solid #e1e4e8;vertical-align:top}
th{font-size:12px;color:#647080}.amount{text-align:right;white-space:nowrap;padding-left:24px}
.description{white-space:pre-wrap;overflow-wrap:anywhere}.total{display:flex;justify-content:flex-end;gap:32px;align-items:center;margin-top:28px}
.total strong{font-size:28px;font-variant-numeric:tabular-nums}footer{margin-top:48px;border-top:1px solid #e1e4e8;padding-top:20px;font-size:12px;color:#647080}
@media(max-width:600px){article{margin:0;border:0;border-radius:0;padding:24px}.details{grid-template-columns:1fr}.total{flex-wrap:wrap}}
@page{size:A4;margin:18mm}@media print{body{background:white}article{margin:0;padding:0;border:0;border-radius:0;max-width:none}.details{grid-template-columns:1fr 1fr}footer{break-inside:avoid}a{color:inherit}}
</style>
</head>
<body><article>
<div class="top"><div><p class="muted">${e(workspaceName)}</p><h1>${e(l("Invoice", "Factura"))}</h1><p>${e(invoice.number)}</p></div><div><span class="tag">${e(statuses[invoice.status])}</span>${mock ? `<p class="muted">${e(l("Demo invoice · mock payment", "Factura de ejemplo · pago simulado"))}</p>` : ""}</div></div>
<div class="details"><div><h2>${e(l("Bill to", "Facturar a"))}</h2><p><strong>${e(invoice.customerName)}</strong></p><p class="muted">${e(invoice.customerEmail)}</p></div>
<dl><div><dt>${e(l("Issued", "Emitida"))}</dt><dd>${e(date(invoice.issuedAt))}</dd></div><div><dt>${e(l("Due", "Vence"))}</dt><dd>${e(date(invoice.dueAt))}</dd></div><div><dt>${e(l("Currency", "Moneda"))}</dt><dd>${invoice.currency.toUpperCase()}</dd></div></dl></div>
<table><thead><tr><th scope="col">${e(l("Description", "Descripción"))}</th><th scope="col" class="amount">${e(l("Amount", "Importe"))}</th></tr></thead><tbody><tr><td class="description">${e(invoice.description || l("Invoice amount", "Importe de la factura"))}</td><td class="amount">${e(money)}</td></tr></tbody></table>
<div class="total"><span>${e(l("Invoice total", "Total de la factura"))}</span><strong>${e(money)}</strong></div>
<footer>${e(mock ? l("Local demo record. No payment was collected by this document.", "Registro local de ejemplo. Este documento no cobró ningún pago.") : l("Invoice record from your commerce workspace.", "Registro de factura de tu workspace de comercio."))}</footer>
</article></body></html>`;
}

export function CommerceInvoiceView({
  invoice,
  requestedId,
  workspaceName,
  commerce,
  task,
  onPay,
}: {
  invoice: CommerceInvoice | null;
  requestedId: string | null;
  workspaceName: string;
  commerce: CommerceContextValue;
  task: CommerceTask;
  onPay: (id: string) => void;
}) {
  const { l, locale, money, date } = useCommerceFormatting();
  const printFrame = useRef<HTMLIFrameElement | null>(null);
  const [printing, setPrinting] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  useEffect(
    () => () => {
      printFrame.current?.remove();
      printFrame.current = null;
    },
    [],
  );

  if (!invoice) {
    return (
      <Card>
        <Empty
          icon={<FileText aria-hidden="true" className="size-5" />}
          title={
            requestedId !== null
              ? l("Invoice not found", "Factura no encontrada")
              : l("No invoices yet", "Aún no hay facturas")
          }
          description={l(
            "Choose an invoice from this workspace to see its details.",
            "Elige una factura de este workspace para ver sus detalles.",
          )}
          action={
            <Link
              href={`/${locale}/invoices/`}
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeft aria-hidden="true" />
              {l("All invoices", "Todas las facturas")}
            </Link>
          }
        />
      </Card>
    );
  }
  const payable = invoice.status === "open" || invoice.status === "overdue";
  const getDocument = () =>
    commerceInvoiceDocument({
      invoice,
      workspaceName,
      locale,
      mock: commerce.mode === "mock",
    });
  const print = () => {
    if (printing) return;
    setDocumentError(null);
    setPrinting(true);
    printFrame.current?.remove();
    const frame = document.createElement("iframe");
    frame.title = l("Printable invoice", "Factura para imprimir");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    frame.tabIndex = -1;
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
    printFrame.current = frame;
    const clean = () => {
      frame.remove();
      if (printFrame.current === frame) printFrame.current = null;
    };
    frame.onload = () => {
      if (printFrame.current !== frame) return;
      try {
        if (!frame.contentWindow) throw new Error("Print frame unavailable");
        frame.contentWindow.addEventListener("afterprint", clean, {
          once: true,
        });
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setPrinting(false);
        setTimeout(clean, 30_000);
      } catch {
        clean();
        setPrinting(false);
        setDocumentError(
          l(
            "Printing could not start. Download the HTML invoice and print it from your browser.",
            "No se pudo iniciar la impresión. Descarga la factura HTML e imprímela desde el navegador.",
          ),
        );
      }
    };
    frame.srcdoc = getDocument();
    document.body.appendChild(frame);
  };
  const download = () => {
    setDocumentError(null);
    try {
      const filename =
        invoice.number.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) ||
        "invoice";
      downloadText(
        `${filename}.html`,
        getDocument(),
        "text/html;charset=utf-8",
      );
    } catch {
      setDocumentError(
        l(
          "The invoice could not be downloaded. Please try again.",
          "No se pudo descargar la factura. Intenta de nuevo.",
        ),
      );
    }
  };

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        eyebrow={l("A considered record", "Un registro cuidado")}
        title={l("Invoice details", "Detalles de factura")}
        description={`${invoice.number} · ${invoice.customerName}`}
        actions={
          <>
            <Link
              href={`/${locale}/invoices/`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowLeft aria-hidden="true" />
              {l("All invoices", "Todas las facturas")}
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={printing}
              disabled={printing}
              onClick={print}
            >
              <Printer aria-hidden="true" />
              {l("Print", "Imprimir")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={download}
            >
              <Download aria-hidden="true" />
              {l("Download HTML", "Descargar HTML")}
            </Button>
          </>
        }
      />
      {documentError && (
        <Alert
          variant="destructive"
          title={l("Document needs attention", "Revisa el documento")}
        >
          {documentError}
        </Alert>
      )}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card
          className="overflow-hidden p-5 sm:p-8"
          data-invoice-detail={invoice.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-7">
            <div>
              <Brand />
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                {workspaceName}
              </p>
              {commerce.mode === "mock" && (
                <Badge variant="outline" className="mt-2">
                  {l("Demo invoice", "Factura de ejemplo")}
                </Badge>
              )}
            </div>
            <div className="sm:text-right">
              <h2 className="text-2xl font-semibold tracking-tight">
                {invoice.number}
              </h2>
              <div className="mt-3">
                <CommerceStatusBadge status={invoice.status} />
              </div>
            </div>
          </div>
          <div className="grid gap-6 py-7 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-semibold text-muted-foreground">
                {l("Bill to", "Facturar a")}
              </h3>
              <p className="text-sm font-semibold">{invoice.customerName}</p>
              <p className="mt-2 break-all text-xs leading-6 text-muted-foreground">
                {invoice.customerEmail}
              </p>
            </div>
            <dl className="grid content-start gap-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {l("Issued", "Emitida")}
                </dt>
                <dd className="text-right font-medium">
                  {date(invoice.issuedAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{l("Due", "Vence")}</dt>
                <dd className="text-right font-medium">
                  {date(invoice.dueAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {l("Currency", "Moneda")}
                </dt>
                <dd className="font-medium">
                  {invoice.currency.toUpperCase()}
                </dd>
              </div>
            </dl>
          </div>
          <Table aria-label={l("Invoice charges", "Importes de la factura")}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-0">
                  {l("Description", "Descripción")}
                </TableHead>
                <TableHead className="pr-0 text-right">
                  {l("Amount", "Importe")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="min-w-44 pl-0">
                  <p className="whitespace-pre-wrap break-words text-xs leading-7">
                    {invoice.description ||
                      l("Invoice amount", "Importe de la factura")}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap pr-0 text-right text-sm font-medium tabular-nums">
                  {money(invoice.amount, invoice.currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="mt-7 flex flex-wrap items-center justify-end gap-6">
            <span className="text-xs text-muted-foreground">
              {l("Invoice total", "Total de la factura")}
            </span>
            <strong className="text-3xl font-semibold tracking-tight tabular-nums">
              {money(invoice.amount, invoice.currency)}
            </strong>
          </div>
          <p className="mt-8 border-t border-border pt-5 text-[11px] leading-6 text-muted-foreground">
            {commerce.mode === "mock"
              ? l(
                  "Local demo record. No payment is collected by downloading or printing this invoice.",
                  "Registro local de ejemplo. Descargar o imprimir esta factura no cobra ningún pago.",
                )
              : l(
                  `This document reflects the selected invoice from your ${getCommerceProviderLabel(commerce)} commerce service.`,
                  `Este documento refleja la factura seleccionada de tu servicio de comercio de ${getCommerceProviderLabel(commerce)}.`,
                )}
          </p>
        </Card>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>{l("Payment summary", "Resumen del pago")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div>
              <p className="text-2xl font-semibold tabular-nums">
                {money(invoice.amount, invoice.currency)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {l("Due", "Vence")} {date(invoice.dueAt)}
              </p>
            </div>
            <CommerceStatusBadge status={invoice.status} />
            {payable ? (
              <>
                <Button
                  type="button"
                  disabled={task.disabled || !commerce.canWrite}
                  loading={task.pending}
                  onClick={() => onPay(invoice.id)}
                >
                  <CreditCard aria-hidden="true" />
                  {commerce.mode === "mock"
                    ? l("Preview payment", "Ver pago de ejemplo")
                    : l(
                        `Pay invoice with ${getCommerceProviderLabel(commerce)}`,
                        `Pagar factura con ${getCommerceProviderLabel(commerce)}`,
                      )}
                </Button>
                <p className="flex items-start gap-2 text-[11px] leading-6 text-muted-foreground">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-1 size-3.5 shrink-0 text-primary"
                  />
                  {commerce.mode === "mock"
                    ? l(
                        "Try a successful or failed payment in the clearly labeled demo preview.",
                        "Prueba un pago exitoso o fallido en la vista previa de ejemplo.",
                      )
                    : l(
                        `Checkout opens with ${getCommerceProviderLabel(commerce)}. Payment status updates after your service confirms it.`,
                        `El pago se abre con ${getCommerceProviderLabel(commerce)}. El estado se actualiza después de la confirmación de tu servicio.`,
                      )}
                </p>
              </>
            ) : (
              <p className="text-xs leading-6 text-muted-foreground">
                {invoice.status === "paid"
                  ? l(
                      "Payment is recorded. You can download or print this invoice for your records.",
                      "El pago está registrado. Puedes descargar o imprimir esta factura para tus archivos.",
                    )
                  : invoice.status === "draft"
                    ? l(
                        "Draft invoices cannot be paid. Your commerce administrator can finalize this invoice.",
                        "Las facturas en borrador no se pueden pagar. El administrador de comercio puede finalizar esta factura.",
                      )
                    : l(
                        "This invoice is void and cannot accept payment.",
                        "Esta factura está anulada y no puede aceptar pagos.",
                      )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
