# Aplicaciones: comercio, mapas y autenticación

[English / contrato completo](application-integrations.md) · [Guía de Mapas](google-maps.md) · [Arquitectura](architecture.md)

Aureform 1.4 amplía las aplicaciones existentes. La demo pública funciona con datos locales: puedes recorrer todo el flujo sin conectar cuentas ni realizar cobros.

| Pantalla      | Lo que puedes probar                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Productos     | Catálogo, búsqueda, filtros, editor de detalles, precio, moneda e inventario; galería con carga, recorte, rotación, imagen principal, orden y texto alternativo. |
| Pedidos       | Creación desde el catálogo, cantidades y totales; detalle, estados de envío y Checkout mock con resultado exitoso o fallido.                                     |
| Facturas      | Búsqueda, creación, detalle, descarga e impresión local; pago mock. Cada pedido pagado en la demo genera una factura.                                            |
| Facturación   | Suscripción actual, planes, historial de facturas y vista previa del portal del cliente.                                                                         |
| Mapas         | Rutas y ubicaciones locales, búsqueda y controles; conexión opcional al SDK real de Google Maps mediante una API key del navegador.                              |
| Autenticación | Login, registro, recuperación y verificación; botones mock de Google, GitHub y Microsoft con callbacks sustituibles.                                             |

Las cuatro vistas de autenticación tienen accesos en la navegación principal, la galería de plantillas y la portada. El código de verificación de ejemplo es `123456`.

## Un flujo de comercio compartido

`CommerceProvider` conecta catálogo, pedidos, facturas y suscripción dentro de cada workspace. Valida los datos guardados, bloquea envíos simultáneos y descarta respuestas antiguas si cambias de espacio. Los perfiles de solo lectura no modifican datos; la facturación usa el rol owner/admin de la vista previa. Tu backend debe implementar su propia autorización.

Los importes son enteros en unidades menores: `14800` representa USD 148,00. El contrato admite USD, EUR y GBP. Los pedidos conservan el precio de compra aunque después edites el producto.

El Checkout mock descuenta existencias solo cuando se simula un pago exitoso y crea una única factura. Un fallo conserva el inventario y permite reintentar. Ningún formulario recoge tarjetas, CVV ni claves privadas.

Las imágenes subidas se normalizan a raster y se guardan en el navegador. También puedes recortar las imágenes de productos incluidas usando sus WebP originales. Otros SVG o imágenes remotas requieren un reemplazo raster para editarse. Si se alcanza la cuota o se bloquea el almacenamiento, se muestra un aviso y la sesión actual sigue funcionando en memoria. Para producción, conecta almacenamiento autorizado y devuelve URLs HTTPS.

## Usar Stripe desde tu aplicación

El kit incluye `createStripeCommerceAdapter`, un transporte entre el navegador y **tu backend**. La demo de GitHub Pages sigue usando mocks. Crea el adaptador en un Client Component:

```tsx
"use client";

import { useMemo } from "react";
import { AppPage } from "@/components/app-page";
import { createStripeCommerceAdapter } from "@/lib/stripe-commerce-adapter";

export function Pedidos() {
  const commerceAdapter = useMemo(
    () => createStripeCommerceAdapter({ baseUrl: "/api/commerce" }),
    [],
  );
  return (
    <AppPage locale="es" path="orders" commerceAdapter={commerceAdapter} />
  );
}
```

El adaptador usa cookies del mismo origen, JSON, cancelación y un callback opcional para el token CSRF. Tu servidor debe comprobar sesión, origen/CSRF, rol, workspace e identidad de cada registro. Recibir `workspaceId` no concede permisos.

El [contrato completo](application-integrations.md#endpoint-contract) define lectura de snapshots, guardado/archivo/sincronización de productos, creación y actualización de pedidos, creación de facturas, Checkout y portal. Los esquemas están en [`src/lib/commerce.ts`](../src/lib/commerce.ts).

Tu servidor resuelve los precios e inventario desde su base de datos, crea [Checkout Sessions](https://docs.stripe.com/checkout/quickstart) para pedidos y suscripciones y devuelve una URL alojada de Stripe. Para facturas devuelve la URL de la factura finalizada; para el portal obtiene el Customer del workspace autenticado. El navegador nunca envía un importe de Checkout ni un Customer elegido por el visitante.

La sincronización de productos usa [Products y Prices](https://docs.stripe.com/products-prices/manage-prices). Cambiar un precio requiere crear otro Price; no se altera el precio de pedidos anteriores. Sube las imágenes a tu almacenamiento antes de sincronizar: las data URI locales y los SVG de transporte de la demo no son URLs de imagen para Stripe.

Mantén la clave restringida y el secreto de firma de webhooks en el servidor. Verifica la firma sobre el cuerpo original, procesa pagos diferidos e idempotencia y actualiza pedidos, inventario y suscripciones desde eventos verificados. Volver a una página de éxito no demuestra que se pagó. Consulta los [ejemplos de servidor y eventos](application-integrations.md#payment-status-and-webhooks).

El adaptador acepta URLs HTTPS alojadas en `checkout.stripe.com`, `billing.stripe.com` e `invoice.stripe.com`. Un dominio personalizado de Stripe requiere adaptar la lista de dominios autorizados. La exportación estática no incluye endpoints de servidor.

## Sustituir los botones de acceso mock

`AppPage`, `AuthTemplate` y `SocialAuth` admiten `authAdapter` o `onProviderSignIn`. El callback recibe proveedor, intención de login/registro, consentimiento y señal de cancelación. El registro comprueba el consentimiento antes de llamar al callback.

```tsx
<AppPage
  locale="es"
  path="auth/sign-in"
  onProviderSignIn={async ({ provider, signal }) => {
    if (signal?.aborted) return { kind: "handled" };
    await tuClienteAuth.iniciarConProveedor(provider);
    return { kind: "handled" };
  }}
/>
```

La implementación de OAuth, URLs de retorno, sesiones del servidor, permisos y vinculación de cuentas corresponde al consumidor. `handled` solo indica que terminó el callback; el kit no verifica identidades. El flujo de email, recuperación y OTP también necesita tu integración.

Los mocks guardan únicamente un perfil de presentación con `demo: true`; no guardan contraseñas ni tokens.

## Alcance de diseño

Esta ampliación se entrega en código, registry y capturas reales del navegador. Los archivos y auditorías nativas de Figma mantienen sus versiones históricas. Los bloques nuevos de aplicaciones no se presentan como masters nativos ni como una nueva revisión visual de Figma.
