"use client";
import { publicPath } from "@/lib/public-path";
import { useState } from "react";
import { Download, ArrowLeft, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useDemoStore } from "@/hooks/use-demo-store";
import { shipmentRoutes, routeGeometry } from "@/demo/map-data";
import { getDemoRouteDriverAvatarSrc } from "@/demo/avatar-assets";
import { entitySeeds, type EntityRecord } from "@/demo/entities";
import { RouteMap } from "@/components/blocks/route-map";
import { PageHeading } from "@/components/blocks/page-heading";
import { Brand } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";

import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, downloadText } from "@/lib/utils";
export function MapsTemplate() {
  const { l, date } = useLanguage(),
    [selected, setSelected] = useState("all");
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l("Good things are on their way", "Lo bueno está en camino")}
        title={l("Keep your routes in view.", "Mantén tus rutas a la vista.")}
        description={l(
          "An offline map pattern with original schematic geometry and illustrative shipments.",
          "Un patrón de mapa local con geometría esquemática original y envíos ilustrativos.",
        )}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadText(
                "aureform-routes.geojson",
                JSON.stringify(routeGeometry, null, 2),
                "application/geo+json",
              )
            }
          >
            <Download />
            {l("Export GeoJSON", "Exportar GeoJSON")}
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap justify-between gap-3">
            <Select
              value={selected}
              onValueChange={setSelected}
              aria-label={l("Choose shipment", "Elegir envío")}
              className="w-full sm:w-72"
              options={[
                {
                  value: "all",
                  label: l("All demo routes", "Todas las rutas de ejemplo"),
                },
                ...shipmentRoutes.map((item) => ({
                  value: item.id,
                  label: `${item.id} · ${item.from} → ${item.to}`,
                })),
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected("all")}
            >
              {l("Reset view", "Restablecer vista")}
            </Button>
          </div>
          <RouteMap
            selected={selected}
            label={l(
              "Interactive demo shipment map",
              "Mapa interactivo de envíos de ejemplo",
            )}
          />
          <p className="mt-3 text-[10px] leading-6 text-muted-foreground">
            {l(
              "Pan with the mouse or arrow keys; zoom with the controls. Geometry is illustrative and is not suitable for navigation.",
              "Desplázate con el mouse o las flechas; usa los controles para acercar. La geometría es ilustrativa y no sirve para navegación.",
            )}
          </p>
        </div>
        <div className="grid content-start gap-4">
          {shipmentRoutes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={cn(
                "rounded-xl border border-border bg-surface p-4 text-left outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring",
                selected === item.id && "border-primary/45 bg-accent/15",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{item.id}</span>
                <Badge
                  variant={
                    item.status === "delivered"
                      ? "default"
                      : item.status === "scheduled"
                        ? "outline"
                        : "warning"
                  }
                >
                  {item.status === "delivered"
                    ? l("Delivered", "Entregado")
                    : item.status === "scheduled"
                      ? l("Scheduled", "Programado")
                      : l("In transit", "En tránsito")}
                </Badge>
              </div>
              <p className="mt-4 text-xs">
                {item.from}{" "}
                <span className="px-2 text-muted-foreground">→</span>
                {item.to}
              </p>
              <div className="mb-2 mt-4 flex justify-between text-[10px] text-muted-foreground">
                <span>{l("Journey progress", "Progreso del recorrido")}</span>
                <span>{item.progress}%</span>
              </div>
              <Progress
                value={item.progress}
                label={`${item.id} ${l("progress", "progreso")}`}
              />
              <div className="mt-4 flex items-center gap-2">
                <Avatar
                  name={item.driver}
                  src={getDemoRouteDriverAvatarSrc(item.id)}
                  size="sm"
                />
                <span className="text-[10px]">{item.driver}</span>
                <span className="ml-auto text-[9px] text-muted-foreground">
                  {date(item.eta, { month: "short", day: "numeric" })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
export function InvoiceTemplate() {
  const { l, locale, common: t, currency, date } = useLanguage(),
    [selected, setSelected] = useDemoStore<EntityRecord>(
      "selected-invoice",
      entitySeeds.invoices[0],
    ),
    [invoices, setInvoices] = useDemoStore<EntityRecord[]>(
      "invoices",
      entitySeeds.invoices,
    ),
    [confirm, setConfirm] = useState(false),
    [tax, setTax] = useState("0");
  const invoice = invoices.find((item) => item.id === selected.id) ?? selected,
    subtotal = invoice.amount,
    total = subtotal * (1 + Number(tax) / 100);
  const update = () => {
    const next = { ...invoice, status: "paid" };
    setSelected(next);
    setInvoices((previous) =>
      previous.map((item) => (item.id === invoice.id ? next : item)),
    );
    setConfirm(false);
    toast.success(
      l("Demo invoice marked paid", "Factura de ejemplo marcada como pagada"),
    );
  };
  return (
    <div className="grid gap-6">
      <div data-no-print>
        <PageHeading
          eyebrow={l("A considered record", "Un registro cuidado")}
          title={l("Invoice details", "Detalles de factura")}
          description={l(
            "A printable invoice pattern with local demo data.",
            "Un patrón de factura imprimible con datos locales de ejemplo.",
          )}
          actions={
            <>
              <a
                href={publicPath(`/${locale}/invoices/`)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ArrowLeft />
                {l("All invoices", "Todas las facturas")}
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer />
                {l("Print", "Imprimir")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadText(
                    `${invoice.name}.json`,
                    JSON.stringify(
                      { ...invoice, taxRate: Number(tax), total },
                      null,
                      2,
                    ),
                    "application/json",
                  )
                }
              >
                <Download />
                {t("export")}
              </Button>
            </>
          }
        />
      </div>
      <Card className="mx-auto w-full max-w-4xl p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-8 border-b border-border pb-8">
          <div>
            <Brand />
            <p className="mt-5 text-xs leading-7 text-muted-foreground">
              Studio workspace
              <br />
              {l(
                "Original interface demo",
                "Demostración de interfaz original",
              )}
              <br />
              hello@aureform.demo
            </p>
          </div>
          <div className="sm:text-right">
            <p className="editorial text-[42px]">{l("Invoice", "Factura")}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {invoice.name}
            </p>
            <Badge
              className="mt-3"
              variant={
                invoice.status === "paid"
                  ? "default"
                  : invoice.status === "overdue"
                    ? "destructive"
                    : "warning"
              }
            >
              {invoice.status === "paid"
                ? l("Paid", "Pagada")
                : invoice.status === "overdue"
                  ? l("Overdue", "Vencida")
                  : invoice.status === "draft"
                    ? l("Draft", "Borrador")
                    : l("Pending", "Pendiente")}
            </Badge>
          </div>
        </div>
        <div className="grid gap-8 py-8 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              {l("Billed to", "Facturado a")}
            </p>
            <h2 className="text-sm font-semibold">{invoice.detail}</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {l("Demo customer address", "Dirección de cliente de ejemplo")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <span className="text-muted-foreground">
              {l("Issue date", "Fecha de emisión")}
            </span>
            <span className="font-medium">{date(invoice.date)}</span>
            <span className="text-muted-foreground">
              {l("Currency", "Moneda")}
            </span>
            <span className="font-medium">USD</span>
            <span className="text-muted-foreground">
              {l("Reference", "Referencia")}
            </span>
            <span className="font-mono text-[11px]">{invoice.id}</span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{l("Description", "Descripción")}</TableHead>
              <TableHead className="text-right">{l("Qty", "Cant.")}</TableHead>
              <TableHead className="text-right">
                {l("Rate", "Precio")}
              </TableHead>
              <TableHead className="text-right">
                {l("Amount", "Importe")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <p className="font-semibold">{invoice.category}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {l(
                    "October 2026 · Demo line item",
                    "Octubre de 2026 · Línea de ejemplo",
                  )}
                </p>
              </TableCell>
              <TableCell className="text-right">1</TableCell>
              <TableCell className="text-right">{currency(subtotal)}</TableCell>
              <TableCell className="text-right font-semibold">
                {currency(subtotal)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div className="ml-auto mt-8 grid max-w-xs gap-4 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {l("Subtotal", "Subtotal")}
            </span>
            <span>{currency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">
              {l("Demo tax", "Impuesto de ejemplo")}
            </span>
            <Select
              value={tax}
              onValueChange={setTax}
              aria-label={l(
                "Illustrative tax rate",
                "Tasa de impuesto ilustrativa",
              )}
              options={["0", "10", "19"].map((value) => ({
                value,
                label: `${value}%`,
              }))}
              className="h-8 w-24"
            />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {l("Tax amount", "Importe de impuesto")}
            </span>
            <span>{currency((subtotal * Number(tax)) / 100)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-4 text-base font-semibold">
            <span>{l("Total", "Total")}</span>
            <span>{currency(total)}</span>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-6">
          <div>
            <p className="editorial text-2xl">
              {l("Good things, built together.", "Lo bueno se crea en equipo.")}
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {l(
                "Illustrative invoice and tax amounts. No payment is collected.",
                "Factura e impuestos ilustrativos. No se cobra ningún pago.",
              )}
            </p>
          </div>
          {invoice.status !== "paid" && (
            <Button data-no-print size="sm" onClick={() => setConfirm(true)}>
              <CheckCircle2 />
              {l("Mark demo paid", "Marcar como pagada en la demo")}
            </Button>
          )}
        </div>
      </Card>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent closeLabel={t("close")}>
          <DialogTitle>
            {l(
              "Update the demo invoice?",
              "¿Actualizar la factura de ejemplo?",
            )}
          </DialogTitle>
          <DialogDescription>
            {l(
              "This changes the local status to paid. It does not collect a payment.",
              "Esto cambia el estado local a pagada. No cobra ningún pago.",
            )}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={update}>
              {l("Update status", "Actualizar estado")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
