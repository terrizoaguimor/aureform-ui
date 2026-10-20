# Comercio y facturación

Los flujos de comercio introducidos en Aureform UI 1.4 conectan Productos, Pedidos, Facturas y Facturación mediante el estado de `CommerceProvider`, separado por workspace. La demo pública realiza operaciones locales simuladas. No cobra tarjetas, envía facturas ni proporciona un backend de pagos.

## Explora el flujo incluido

1. Crea o edita un producto con precio, moneda e inventario.
2. Sube imágenes raster, recórtalas o gíralas, escribe texto alternativo, ordena la galería y elige la imagen principal.
3. Crea un pedido a partir de productos y revisa los datos de sus líneas en el momento de compra.
4. Prueba pagos simulados fallidos y exitosos; abre después la factura correspondiente y el historial de facturación.

Los importes son enteros en unidades menores: `unitAmount: 1999` con `currency: "usd"` representa USD 19,99. Los contratos actuales admiten `usd`, `eur` y `gbp`; cada pedido utiliza una sola moneda.

Las líneas conservan el nombre y precio de compra cuando cambia el catálogo. El pago simulado exitoso comprueba existencias, las descuenta una sola vez y crea una factura correspondiente. Un fallo conserva el inventario y permite reintentar. Los datos e imágenes se guardan localmente; si falla el almacenamiento, la sesión actual sigue funcionando en memoria.

## Conecta tu backend autenticado

[`CommerceAdapter`](../../../src/lib/commerce.ts) define carga, operaciones de productos, creación y estado de pedidos, facturas, checkout y portal. `createStripeCommerceAdapter` aporta transporte JSON validado al mismo origen. Créalo en un componente cliente:

```tsx
"use client";

import { useMemo } from "react";
import { AppPage } from "@/components/app-page";
import { createStripeCommerceAdapter } from "@/lib/stripe-commerce-adapter";

export default function OrdersPage() {
  const commerceAdapter = useMemo(
    () => createStripeCommerceAdapter({
      baseUrl: "/api/commerce",
      getCsrfToken: () =>
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
          ?.content ?? null,
    }),
    [],
  );
  return <AppPage locale="es" path="orders" commerceAdapter={commerceAdapter} />;
}
```

Tu aplicación debe aportar esos endpoints y el token CSRF; el adaptador no los crea. `AppPage` incluye la composición existente de idioma → apariencia → workspace → comercio.

## Mantén la autoridad de pago en el servidor

Autentica sesiones, autoriza el workspace, resuelve precios e inventario guardados y haz las mutaciones idempotentes. Guarda las credenciales Stripe y secretos de webhooks en el servidor. El navegador envía identificadores de registros, no importes autoritativos ni asociaciones de clientes.

El transporte admite redirecciones HTTPS alojadas en su lista explícita de dominios Stripe. Volver por una URL no demuestra un pago: verifica webhooks y recarga los registros autoritativos. Sube imágenes de producción a almacenamiento autorizado.

La [guía de integración](../../../docs/application-integrations.es.md), su [contrato detallado en inglés](../../../docs/application-integrations.md), los [ejemplos cliente](../../../examples/ApplicationAdapters.tsx) y el [código del adaptador](../../../src/lib/stripe-commerce-adapter.ts) describen la integración completa.
