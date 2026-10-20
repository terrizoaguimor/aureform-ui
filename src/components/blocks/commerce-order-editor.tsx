"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  CreditCard,
  Mail,
  MapPin,
  Minus,
  Package,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import {
  commerceCurrencies,
  getCommerceProviderLabel,
  newOrderSchema,
  type CommerceContextValue,
  type CommerceCurrency,
  type CommerceOrder,
} from "@/lib/commerce";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import {
  CommerceProductThumbnail,
  CommerceStatusBadge,
  useCommerceFormatting,
  type CommerceTask,
} from "@/components/blocks/commerce-checkout";

type OrderErrors = Partial<
  Record<"customerName" | "customerEmail" | "shippingAddress" | "items", string>
>;

export function CommerceOrderEditor({
  commerce,
  task,
  onClose,
  onCreated,
}: {
  commerce: CommerceContextValue;
  task: CommerceTask;
  onClose: () => void;
  onCreated: (order: CommerceOrder) => void;
}) {
  const { l, money, number } = useCommerceFormatting();
  const fieldId = useId();
  const form = useRef<HTMLFormElement>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState<CommerceCurrency>(
    commerce.products.find(
      (product) => product.status === "active" && product.inventory > 0,
    )?.currency ?? "usd",
  );
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<OrderErrors>({});
  const selections = Object.entries(quantities).map(
    ([productId, quantity]) => ({
      productId,
      product: commerce.products.find((product) => product.id === productId),
      quantity: Number(quantity),
    }),
  );
  const validItems = selections.every(
    ({ product, quantity }) =>
      product?.status === "active" &&
      product.currency === currency &&
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= Math.min(999, product.inventory),
  );
  const total = selections.reduce(
    (sum, { product, quantity }) =>
      sum +
      (product && Number.isInteger(quantity) && quantity >= 1
        ? product.unitAmount * quantity
        : 0),
    0,
  );
  const validTotal = Number.isSafeInteger(total) && total <= 100_000_000;
  const activeProducts = commerce.products.filter(
    (product) => product.status === "active",
  );
  const visibleProducts = activeProducts.filter(
    (product) =>
      product.currency === currency &&
      `${product.name} ${product.sku} ${product.category}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const disabled = task.disabled || !commerce.canWrite;

  const setQuantity = (id: string, value: string) => {
    setQuantities((previous) => ({ ...previous, [id]: value }));
    setErrors((previous) => ({ ...previous, items: undefined }));
  };
  const remove = (id: string) => {
    setQuantities((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setErrors((previous) => ({ ...previous, items: undefined }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const input = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      shippingAddress: shippingAddress.trim(),
      items: selections.map(({ productId, quantity }) => ({
        productId,
        quantity,
      })),
    };
    const parsed = newOrderSchema.safeParse(input);
    const nextErrors: OrderErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "customerName") {
          nextErrors.customerName = l(
            "Enter a name with 2–140 characters.",
            "Escribe un nombre de 2 a 140 caracteres.",
          );
        } else if (issue.path[0] === "customerEmail") {
          nextErrors.customerEmail = l(
            "Enter a valid customer email.",
            "Escribe un correo válido para el cliente.",
          );
        } else if (issue.path[0] === "shippingAddress") {
          nextErrors.shippingAddress = l(
            "Use no more than 500 characters.",
            "Usa un máximo de 500 caracteres.",
          );
        } else {
          nextErrors.items = l(
            "Choose 1–50 products with whole quantities from 1 to 999.",
            "Elige entre 1 y 50 productos con cantidades enteras de 1 a 999.",
          );
        }
      }
    }
    if (!validItems) {
      nextErrors.items = l(
        "Every selected product must be active, use the order currency and have enough stock for a whole quantity.",
        "Cada producto elegido debe estar activo, usar la moneda del pedido y tener existencias suficientes para una cantidad entera.",
      );
    }
    if (!validTotal) {
      nextErrors.items = l(
        "The order total must not exceed 1,000,000.00.",
        "El total del pedido no puede superar 1.000.000,00.",
      );
    }
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length) {
      requestAnimationFrame(() => {
        const invalid = form.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]',
        );
        invalid?.focus();
        if (!invalid)
          document.getElementById(`${fieldId}-items-error`)?.focus();
      });
      return;
    }
    void task.run(() => commerce.createOrder(parsed.data), onCreated);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !task.pending && commerce.busy === null) onClose();
      }}
    >
      <DialogContent
        className="max-w-4xl"
        closeLabel={l("Close order builder", "Cerrar creador de pedidos")}
      >
        <DialogTitle>{l("New order", "Nuevo pedido")}</DialogTitle>
        <DialogDescription>
          {l(
            "Build an unpaid order with current catalog prices. Review checkout after creating it.",
            "Crea un pedido sin pagar con los precios actuales del catálogo. Revisa el pago después de crearlo.",
          )}
        </DialogDescription>
        <form ref={form} onSubmit={submit} noValidate className="mt-6">
          <fieldset disabled={disabled} className="min-w-0">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.8fr)]">
              <div className="grid min-w-0 content-start gap-5">
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
                  label={l(
                    "Shipping address · optional",
                    "Dirección de envío · opcional",
                  )}
                  error={errors.shippingAddress}
                >
                  <Textarea
                    name="shippingAddress"
                    autoComplete="street-address"
                    value={shippingAddress}
                    maxLength={500}
                    className="min-h-20"
                    onChange={(event) => setShippingAddress(event.target.value)}
                  />
                </Field>

                <div className="border-t border-border pt-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3
                      id={`${fieldId}-products`}
                      className="text-sm font-semibold"
                    >
                      {l("Active products", "Productos activos")}
                    </h3>
                    <Select
                      aria-label={l("Order currency", "Moneda del pedido")}
                      value={currency}
                      disabled={disabled}
                      className="w-28"
                      options={commerceCurrencies.map((value) => ({
                        value,
                        label: value.toUpperCase(),
                      }))}
                      onValueChange={(value) => {
                        setCurrency(value as CommerceCurrency);
                        setQuantities({});
                        setErrors((previous) => ({
                          ...previous,
                          items: undefined,
                        }));
                      }}
                    />
                  </div>
                  <div className="relative mb-4">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      aria-label={l(
                        "Search active products",
                        "Buscar productos activos",
                      )}
                      placeholder={l(
                        "Search by product or SKU…",
                        "Buscar por producto o SKU…",
                      )}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div
                    aria-labelledby={`${fieldId}-products`}
                    className="grid max-h-80 gap-3 overflow-y-auto p-0.5 sm:grid-cols-2"
                  >
                    {visibleProducts.map((product) => {
                      const selected = product.id in quantities;
                      const quantity = Number(quantities[product.id]);
                      const max = Math.min(999, product.inventory);
                      const quantityInvalid =
                        selected &&
                        (!Number.isInteger(quantity) ||
                          quantity < 1 ||
                          quantity > max);
                      const quantityId = `${fieldId}-${product.id}`;
                      return (
                        <div
                          key={product.id}
                          className={cn(
                            "grid gap-3 rounded-xl border border-border bg-surface-subtle/25 p-3",
                            selected && "border-primary/45 bg-accent/30",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <CommerceProductThumbnail
                              src={product.images[0]?.src}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-5 font-semibold">
                                {product.name}
                              </p>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {product.sku}
                              </p>
                              <p className="mt-1 text-xs font-medium tabular-nums">
                                {money(product.unitAmount, currency)}
                              </p>
                            </div>
                          </div>
                          <p
                            id={`${quantityId}-stock`}
                            className="text-[11px] text-muted-foreground"
                          >
                            {product.inventory
                              ? l(
                                  `${number(product.inventory)} in stock`,
                                  `${number(product.inventory)} disponibles`,
                                )
                              : l("Out of stock", "Sin existencias")}
                          </p>
                          {selected ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <label htmlFor={quantityId} className="sr-only">
                                {l("Quantity for", "Cantidad de")}{" "}
                                {product.name}
                              </label>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="outline"
                                aria-label={
                                  l(
                                    "Decrease quantity for",
                                    "Reducir cantidad de",
                                  ) + ` ${product.name}`
                                }
                                disabled={
                                  disabled ||
                                  !Number.isInteger(quantity) ||
                                  quantity <= 1
                                }
                                onClick={() =>
                                  setQuantity(product.id, String(quantity - 1))
                                }
                              >
                                <Minus aria-hidden="true" />
                              </Button>
                              <Input
                                id={quantityId}
                                name={`quantity-${product.id}`}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={max}
                                step={1}
                                value={quantities[product.id]}
                                aria-invalid={quantityInvalid}
                                aria-describedby={`${quantityId}-stock${quantityInvalid ? ` ${quantityId}-error` : ""}`}
                                className="h-8 w-16 px-2 text-center tabular-nums"
                                onChange={(event) =>
                                  setQuantity(product.id, event.target.value)
                                }
                              />
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="outline"
                                aria-label={
                                  l(
                                    "Increase quantity for",
                                    "Aumentar cantidad de",
                                  ) + ` ${product.name}`
                                }
                                disabled={
                                  disabled ||
                                  !Number.isInteger(quantity) ||
                                  quantity >= max
                                }
                                onClick={() =>
                                  setQuantity(product.id, String(quantity + 1))
                                }
                              >
                                <Plus aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className="ml-auto"
                                aria-label={
                                  l("Remove", "Quitar") + ` ${product.name}`
                                }
                                onClick={() => remove(product.id)}
                                disabled={disabled}
                              >
                                <X aria-hidden="true" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                disabled ||
                                product.inventory < 1 ||
                                selections.length >= 50
                              }
                              aria-label={
                                l("Add", "Agregar") + ` ${product.name}`
                              }
                              onClick={() => setQuantity(product.id, "1")}
                            >
                              <Plus aria-hidden="true" />
                              {l("Add to order", "Agregar al pedido")}
                            </Button>
                          )}
                          {quantityInvalid && (
                            <p
                              id={`${quantityId}-error`}
                              className="text-[11px] text-destructive-foreground"
                            >
                              {l(
                                `Use a whole quantity between 1 and ${max}.`,
                                `Usa una cantidad entera entre 1 y ${max}.`,
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {!visibleProducts.length && (
                      <Empty
                        className="sm:col-span-2"
                        icon={<Package aria-hidden="true" className="size-5" />}
                        title={l(
                          "No active products found",
                          "No se encontraron productos activos",
                        )}
                        description={l(
                          "Try another search or currency. Products must be active before they can be ordered.",
                          "Prueba otra búsqueda o moneda. Los productos deben estar activos para agregarlos a un pedido.",
                        )}
                        action={
                          query ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setQuery("")}
                            >
                              {l("Clear search", "Limpiar búsqueda")}
                            </Button>
                          ) : undefined
                        }
                      />
                    )}
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                    {l(
                      "One currency per order. Changing currency clears the selection.",
                      "Una moneda por pedido. Cambiar la moneda limpia la selección.",
                    )}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="rounded-xl border border-border bg-surface-subtle/40 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      {l("Order summary", "Resumen del pedido")}
                    </h3>
                    <Badge variant="outline">{currency.toUpperCase()}</Badge>
                  </div>
                  {selections.length ? (
                    <ul className="mt-5 grid gap-4">
                      {selections.map(({ productId, product, quantity }) => (
                        <li
                          key={productId}
                          className="flex items-start gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="leading-5 font-medium">
                              {product?.name ??
                                l(
                                  "Unavailable product",
                                  "Producto no disponible",
                                )}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {Number.isInteger(quantity) && quantity >= 1
                                ? `${quantity} × ${product ? money(product.unitAmount, currency) : "—"}`
                                : l("Check quantity", "Revisa la cantidad")}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={
                              l("Remove", "Quitar") +
                              ` ${product?.name ?? productId}`
                            }
                            onClick={() => remove(productId)}
                            disabled={disabled}
                          >
                            <X aria-hidden="true" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="my-8 text-xs leading-6 text-muted-foreground">
                      {l(
                        "Add a product to start your order.",
                        "Agrega un producto para comenzar el pedido.",
                      )}
                    </p>
                  )}
                  <div className="mt-5 border-t border-border pt-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <p className="text-xs font-medium">
                        {l("Product total", "Total de productos")}
                      </p>
                      <p
                        aria-live="polite"
                        className="text-2xl font-semibold tracking-tight tabular-nums"
                      >
                        {validItems && validTotal
                          ? money(total, currency)
                          : "—"}
                      </p>
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                      {commerce.mode === "mock"
                        ? l(
                            "Demo stock is checked again at payment. Creating an order does not reserve items.",
                            "Las existencias de ejemplo se revisan al pagar. Crear un pedido no reserva artículos.",
                          )
                        : l(
                            `Your service confirms availability and the ${getCommerceProviderLabel(commerce)} checkout amount.`,
                            `Tu servicio confirma la disponibilidad y el importe al pagar con ${getCommerceProviderLabel(commerce)}.`,
                          )}
                    </p>
                  </div>
                </div>
                {errors.items && (
                  <p
                    id={`${fieldId}-items-error`}
                    tabIndex={-1}
                    role="alert"
                    className="mt-4 rounded-lg border border-destructive-foreground/20 bg-destructive p-3 text-xs leading-6 text-destructive-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {errors.items}
                  </p>
                )}
              </div>
            </div>
          </fieldset>
          {task.error && (
            <Alert
              variant="destructive"
              className="mt-5"
              title={l(
                "Order could not be created",
                "No se pudo crear el pedido",
              )}
            >
              {task.error}
            </Alert>
          )}
          {!commerce.canWrite && (
            <Alert
              className="mt-5"
              title={l("Read-only access", "Acceso de lectura")}
            >
              {l(
                "Your role cannot create orders.",
                "Tu rol no permite crear pedidos.",
              )}
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
              <ShoppingBag aria-hidden="true" />
              {l("Create order", "Crear pedido")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CommerceOrderDetail({
  order,
  commerce,
  task,
  onCheckout,
  onStatusChange,
}: {
  order: CommerceOrder | null;
  commerce: CommerceContextValue;
  task: CommerceTask;
  onCheckout: (id: string) => void;
  onStatusChange: (id: string, status: CommerceOrder["status"]) => void;
}) {
  const { l, locale, money, date } = useCommerceFormatting();
  if (!order) {
    return (
      <Card>
        <Empty
          icon={<ShoppingBag aria-hidden="true" className="size-5" />}
          title={l("Select an order", "Selecciona un pedido")}
          description={l(
            "Open an order to see its items, payment and fulfillment timeline.",
            "Abre un pedido para ver sus artículos, pago y progreso del envío.",
          )}
        />
      </Card>
    );
  }
  const canPay =
    order.status !== "cancelled" &&
    (order.paymentStatus === "unpaid" || order.paymentStatus === "failed");
  const receipt = commerce.invoices.find(
    (item) => item.id === `inv-order-${order.id}`,
  );
  const shipped = order.status === "shipped" || order.status === "delivered";
  const delivered = order.status === "delivered";
  const paid = order.paymentStatus === "paid";
  const refunded = order.paymentStatus === "refunded";
  const disabled = task.disabled || !commerce.canWrite;
  const steps = [
    {
      label: l("Order created", "Pedido creado"),
      detail: date(order.createdAt, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      complete: true,
    },
    {
      label: refunded
        ? l("Payment refunded", "Pago reembolsado")
        : paid
          ? l("Payment received", "Pago recibido")
          : order.paymentStatus === "failed"
            ? l("Payment failed", "Pago fallido")
            : l("Awaiting payment", "Esperando el pago"),
      detail: refunded
        ? l(
            "The recorded payment was refunded.",
            "El pago registrado fue reembolsado.",
          )
        : paid
          ? l(
              "Payment is recorded in this workspace.",
              "El pago está registrado en este workspace.",
            )
          : l(
              "Payment is required before dispatch.",
              "El pago es necesario antes del envío.",
            ),
      complete: paid || refunded,
    },
    ...(order.status === "cancelled"
      ? [
          {
            label: l("Order cancelled", "Pedido cancelado"),
            detail: l(
              "This order will not be dispatched.",
              "Este pedido no se enviará.",
            ),
            complete: true,
          },
        ]
      : [
          {
            label: shipped
              ? l("Order shipped", "Pedido enviado")
              : l("Awaiting dispatch", "Esperando el envío"),
            detail: shipped
              ? l(
                  "The order is with the carrier.",
                  "El pedido está con el transportista.",
                )
              : l(
                  "Prepare the items after payment.",
                  "Prepara los artículos después del pago.",
                ),
            complete: shipped,
          },
          {
            label: delivered
              ? l("Order delivered", "Pedido entregado")
              : l("Delivery", "Entrega"),
            detail: delivered
              ? l(
                  "Delivery is recorded as complete.",
                  "La entrega está registrada como completada.",
                )
              : l(
                  "Mark delivered once the order arrives.",
                  "Marca la entrega cuando llegue el pedido.",
                ),
            complete: delivered,
          },
        ]),
  ];
  return (
    <Card
      className="self-start overflow-hidden xl:sticky xl:top-6"
      data-order-detail={order.id}
    >
      <CardHeader className="border-b border-border/65">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{order.number}</CardTitle>
          <CommerceStatusBadge status={order.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {l("Order details", "Detalles del pedido")}
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 pt-5">
        <div className="flex items-start gap-3">
          <Avatar name={order.customerName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{order.customerName}</p>
            <p className="mt-1 flex items-start gap-1.5 break-all text-xs leading-5 text-muted-foreground">
              <Mail aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {order.customerEmail}
            </p>
          </div>
        </div>
        <ul className="grid gap-4">
          {order.items.map((line, index) => (
            <li
              key={`${line.productId}:${index}`}
              className="flex items-center gap-3"
            >
              <CommerceProductThumbnail src={line.image} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-5 font-medium">{line.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {line.quantity} × {money(line.unitAmount, order.currency)}
                </p>
              </div>
              <p className="text-xs font-semibold tabular-nums">
                {money(line.quantity * line.unitAmount, order.currency)}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
          <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">
              {l("Order total", "Total del pedido")}
            </span>
            <CommerceStatusBadge status={order.paymentStatus} />
          </div>
          <p className="text-xl font-semibold tracking-tight tabular-nums">
            {money(order.total, order.currency)}
          </p>
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <MapPin aria-hidden="true" className="size-3.5 text-primary" />
            {l("Shipping address", "Dirección de envío")}
          </h3>
          <p className="whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
            {order.shippingAddress ||
              l(
                "No shipping address recorded.",
                "No se registró una dirección de envío.",
              )}
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-semibold">
            {l("Order timeline", "Progreso del pedido")}
          </h3>
          <ol className="grid gap-0">
            {steps.map((step, index) => (
              <li key={index} className="relative flex gap-3 pb-5 last:pb-0">
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-6 bottom-0 left-2.5 w-px bg-border"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative flex size-5 shrink-0 items-center justify-center rounded-full border",
                    step.complete
                      ? "border-primary/30 bg-accent text-primary"
                      : "border-border bg-surface text-muted-foreground",
                  )}
                >
                  {step.complete ? (
                    <Check className="size-3" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs leading-5 font-medium">{step.label}</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid gap-2 border-t border-border pt-5">
          {canPay && (
            <Button
              type="button"
              disabled={disabled}
              loading={task.pending}
              onClick={() => onCheckout(order.id)}
            >
              <CreditCard aria-hidden="true" />
              {commerce.mode === "mock"
                ? l("Preview checkout", "Ver pago de ejemplo")
                : l(
                    `Continue to ${getCommerceProviderLabel(commerce)} checkout`,
                    `Continuar al pago con ${getCommerceProviderLabel(commerce)}`,
                  )}
            </Button>
          )}
          {order.status === "processing" && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || !paid}
                onClick={() => onStatusChange(order.id, "shipped")}
              >
                <Truck aria-hidden="true" />
                {l("Mark shipped", "Marcar como enviado")}
              </Button>
              {!paid && (
                <p className="text-center text-[11px] leading-5 text-muted-foreground">
                  {l(
                    "Collect payment before shipping.",
                    "Recibe el pago antes de enviar.",
                  )}
                </p>
              )}
            </>
          )}
          {order.status === "shipped" && (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || !paid}
              onClick={() => onStatusChange(order.id, "delivered")}
            >
              <CheckCircle2 aria-hidden="true" />
              {l("Mark delivered", "Marcar como entregado")}
            </Button>
          )}
          {receipt && (
            <Link
              href={{
                pathname: `/${locale}/invoice/`,
                query: { id: receipt.id },
              }}
              className={buttonVariants({ variant: "outline" })}
            >
              <ReceiptText aria-hidden="true" />
              {l("View receipt", "Ver recibo")}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
