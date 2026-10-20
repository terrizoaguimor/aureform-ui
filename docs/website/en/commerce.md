# Commerce and billing

The commerce workflows introduced in Aureform UI 1.4 connect Products, Orders, Invoices and Billing through workspace-scoped `CommerceProvider` state. The public demo performs local mock operations. It does not charge a card, send an invoice or provide a payment backend.

## Explore the delivered flow

1. Create or edit a product, choosing price, currency and inventory.
2. Upload raster images, crop or rotate them, write alternative text, reorder the gallery and select its primary image.
3. Create an order from products and inspect its purchase-time line items.
4. Try failed and successful mock checkout, then open the matching invoice and billing history.

Amounts are integer minor units: `unitAmount: 1999` with `currency: "usd"` means USD 19.99. The current contracts support `usd`, `eur` and `gbp`; an order uses one currency.

Order lines preserve the purchased name and price when the catalog changes. Successful mock checkout checks stock, decrements it once and creates one corresponding invoice. Failure preserves stock and allows retry. Images and records persist locally; storage failures leave the current in-memory session usable.

## Supply your authenticated backend

[`CommerceAdapter`](../../../src/lib/commerce.ts) defines loading, product operations, order creation/status, invoices, checkout and portal actions. `createStripeCommerceAdapter` supplies validated same-origin JSON transport for those methods. Construct it in a Client Component:

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
  return <AppPage locale="en" path="orders" commerceAdapter={commerceAdapter} />;
}
```

The API endpoints and CSRF token must come from your application. The adapter does not create them. `AppPage` supplies the existing locale → appearance → workspace → commerce provider composition.

## Keep payment authority on the server

Authenticate sessions, authorize workspace access, resolve saved prices and inventory, and make mutations idempotent. Store Stripe credentials and webhook secrets on the server. The browser sends record IDs, not authoritative payment totals or customer mappings.

The transport accepts hosted HTTPS redirects on its explicit Stripe allowlist. A return URL proves no payment: verify webhooks and reload authoritative records. Upload production images to authorized storage rather than sending demo data URIs to Stripe.

The [full integration guide](../../../docs/application-integrations.md) contains endpoint payloads and backend responsibilities; [client examples](../../../examples/ApplicationAdapters.tsx) and [adapter source](../../../src/lib/stripe-commerce-adapter.ts) show the exact transport.
