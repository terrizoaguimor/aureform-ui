# Applications: commerce, maps and authentication

[Español](application-integrations.es.md) · [Maps guide](google-maps.md) · [Architecture](architecture.md)

Aureform 1.4 expands the existing application routes. The public demo is a frontend: no payment, OAuth account or Google request is required to explore it.

| View           | Delivered interaction                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Products       | Catalog, filters, product editor, price/currency/inventory, image uploads, crop/rotation, primary image, order and alt text.             |
| Orders         | Product-based order creation, line-item totals, order details, fulfillment status and a mock Checkout with success/failure.              |
| Invoices       | Search, creation, detail, local download/print and a mock invoice payment. Successful mock orders also generate an invoice.              |
| Billing        | Current subscription, plan changes, invoice history and a mock customer portal.                                                          |
| Maps           | Local schematic routes and locations, search and controls; an optional Google Maps browser key connects the real Maps JavaScript SDK.    |
| Authentication | Sign-in, sign-up, reset and verification; Google, GitHub and Microsoft buttons with local mock profiles and injectable social callbacks. |

The four auth routes are in the main navigation, template gallery and landing navigation. They remain standalone layouts. Reset and verification are demo interactions; the example code is `123456`.

## Shared commerce state

`CommerceProvider` sits inside `WorkspaceProvider`. It validates every snapshot, scopes browser storage to the workspace, prevents duplicate pending operations and rejects responses after a workspace switch. Read-only previews cannot mutate commerce; billing controls require the owner/admin preview role. These are UI previews, never server authorization.

Amounts use **integer minor units**, with USD, EUR and GBP supported by the current contracts. The UI formats them in English or Spanish. Order lines capture the price and name at purchase time. Editing a catalog product never rewrites earlier orders.

The mock checkout applies payment once, checks current stock, decrements inventory only on success and creates one matching invoice. Failure preserves inventory and permits retry. Demo subscription changes also add a payment record. No card number, CVV or private service key is collected.

Uploads are normalized raster images. The editor can also crop the built-in product images by extracting their original WebP pixels from the supplied text-portable wrappers; this works in registry installs too. Arbitrary SVG/remote images need a raster replacement for canvas editing. It saves bounded PNG/JPEG/WebP data in the local demo; a storage/quota failure leaves the current in-memory session usable and displays a persistence notice. In production, upload to your own authorized object storage and return public HTTPS image URLs.

## Connect your own Stripe backend

The supplied `createStripeCommerceAdapter` is browser-to-backend transport. It is **not** a backend or a Stripe account integration. It makes no request until you supply it to a consumer client wrapper. The public Pages demo uses the default mock provider.

```tsx
"use client";

import { useMemo } from "react";
import { AppPage } from "@/components/app-page";
import { createStripeCommerceAdapter } from "@/lib/stripe-commerce-adapter";

export function OrdersPage() {
  const commerceAdapter = useMemo(
    () =>
      createStripeCommerceAdapter({
        baseUrl: "/api/commerce",
        getCsrfToken: () =>
          document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? null,
      }),
    [],
  );
  return (
    <AppPage locale="en" path="orders" commerceAdapter={commerceAdapter} />
  );
}
```

Do not pass callback/adapter functions from a Server Component to a Client Component. Create them in the wrapper, as above. You can also compose `Providers`, `ProductsManager` and `CommerceWorkspace` separately instead of adopting `AppPage`.

Requests use same-origin cookies, JSON, an optional CSRF header, cancellation and no automatic network retry. The server must authenticate the session, validate its CSRF/origin policy, authorize workspace membership/role and own record lookup. `workspaceId` is a requested scope; it grants no access.

The default endpoint follows `NEXT_PUBLIC_BASE_PATH`. Supply an explicit same-origin API path when your backend lives elsewhere on your own origin. External API URLs and API redirects are rejected. Hosted payment URLs must use HTTPS on `checkout.stripe.com`, `billing.stripe.com` or `invoice.stripe.com`; custom Stripe domains require adapting this explicit allowlist to your application's trusted domain.

### Endpoint contract

Each endpoint returns the named object itself, with `Content-Type: application/json`. The complete types and Zod schemas live in [`src/lib/commerce.ts`](../src/lib/commerce.ts).

| Endpoint, under `/api/commerce` | Request                                 | Response                 |
| ------------------------------- | --------------------------------------- | ------------------------ |
| `GET ?workspaceId=…`            | Requested workspace scope               | `CommerceSnapshot`       |
| `POST /products/save`           | `{workspaceId, product}`                | `CommerceProduct`        |
| `POST /products/archive`        | `{workspaceId, productId}`              | `CommerceProduct`        |
| `POST /products/sync`           | `{workspaceId, productId}`              | `CommerceProduct`        |
| `POST /orders/create`           | `{workspaceId, input: NewOrderInput}`   | `CommerceOrder`          |
| `POST /orders/status`           | `{workspaceId, orderId, status}`        | `CommerceOrder`          |
| `POST /invoices/create`         | `{workspaceId, input: NewInvoiceInput}` | `CommerceInvoice`        |
| `POST /checkout`                | `{workspaceId, kind, id}`               | `{mode:"redirect", url}` |
| `POST /portal`                  | `{workspaceId}`                         | `{mode:"redirect", url}` |

The checkout request sends a saved record ID or plan name, never a price, Stripe Customer ID or payment status. Resolve prices, inventory, customer mappings, return URLs and permission checks on the server. A timeout can leave a server operation completed; reload its state before retrying a create. Use durable idempotency for server mutations and payment fulfillment.

### Stripe operations behind those endpoints

Use the [Checkout Sessions API](https://docs.stripe.com/checkout/quickstart) for orders and new subscriptions. A hosted flow needs no Stripe SDK or publishable key in this frontend.

```ts
// Server code only, after authentication and workspace/order authorization.
// `order` and `customerId` come from your database, never from browser totals.
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!);
const checkout = await stripe.checkout.sessions.create(
  {
    mode: "payment",
    customer: customerId,
    line_items: order.items.map((line) => ({
      price: line.stripePriceId,
      quantity: line.quantity,
    })),
    client_reference_id: order.id,
    metadata: { orderId: order.id, workspaceId: order.workspaceId },
    success_url: `${trustedOrigin}/en/orders/?checkout=returned`,
    cancel_url: `${trustedOrigin}/en/orders/`,
    integration_identifier: "aureform_checkout_jkqptnrv",
  },
  {
    idempotencyKey: `checkout:${order.id}:${order.paymentRevision}`,
  },
);
if (!checkout.url) throw new Error("Checkout did not provide a hosted URL.");
return Response.json({ mode: "redirect", url: checkout.url });
```

Before creating the session, reserve/validate inventory and use the saved order's purchase-time prices, including an explicit mapping to their immutable Stripe Price IDs. For subscriptions, choose `mode: "subscription"` and a server-controlled recurring Price for Starter, Pro or Enterprise. Let Stripe select enabled payment methods. Configure your own currencies, pricing, customer portal and return routes.

For product sync, create/update [Stripe Products and Prices](https://docs.stripe.com/products-prices/manage-prices) from authorized saved catalog records. Upload images first; Stripe needs public HTTPS image URLs rather than this demo's data URIs or embedded SVG wrappers. Changing an amount/currency creates a **new Stripe Price**, then updates your stored mapping; the provider clears a reused old Price ID in the mock. Existing purchase records keep their price snapshots.

For invoices, create/finalize your invoice through the [Invoicing API](https://docs.stripe.com/invoicing/integration) and return its `hosted_invoice_url` for the invoice checkout action. Sending email is a separate backend action; the demo never sends an invoice. Map Stripe invoice states to `draft`, `open`, `paid`, `overdue` or `void`, with overdue calculated by your backend.

For the portal, create a [customer portal session](https://docs.stripe.com/customer-management/integrate-customer-portal) for the Stripe Customer already associated with the authenticated workspace:

```ts
const portal = await stripe.billingPortal.sessions.create({
  customer: authorizedWorkspace.stripeCustomerId,
  return_url: `${trustedOrigin}/en/settings/billing/`,
});
return Response.json({ mode: "redirect", url: portal.url });
```

Keep a [restricted server key](https://docs.stripe.com/keys) with the required resource permissions and a separate webhook signing secret in your backend environment. Neither belongs in a `NEXT_PUBLIC_` variable, committed `.env`, registry payload or GitHub Pages workflow. Configure and test in your own Stripe sandbox.

### Payment status and webhooks

A browser return URL proves no payment. Verify [Stripe webhook signatures](https://docs.stripe.com/webhooks) against the **raw request body**, map events to your own workspace/order records and apply changes in an idempotent transaction. [Fulfillment guidance](https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted) covers delayed payment methods and repeated/concurrent fulfillment.

- Handle `checkout.session.completed` and `checkout.session.async_payment_succeeded`; fulfill only after authoritative payment status, amount/currency and record mapping checks.
- Handle `checkout.session.async_payment_failed` and refresh the order's state.
- Refresh subscription/billing data on `invoice.paid`, `invoice.payment_failed` and `customer.subscription.updated` / `deleted`.
- Reload server data when returning to the app. In Stripe mode the frontend never calls mock payment completion or declares an unpaid record paid.

The static demo has no Route Handlers, webhook receiver or secret environment. Add these endpoints to your own Next.js server deployment or another authenticated backend.

## Connect social authentication

All built-in social buttons are **mock**. They write only an allowlisted display profile (`demo: true`, provider, name, email and date). Passwords, cookies and access tokens are not saved.

`AuthTemplate`, `SocialAuth` and `AppPage` accept `authAdapter` or `onProviderSignIn`. The callback receives `{provider, intent, consent, signal}`; sign-up consent is checked before invoking it. Create an adapter in a Client Component:

```tsx
<AppPage
  locale="en"
  path="auth/sign-in"
  onProviderSignIn={async ({ provider, signal }) => {
    if (signal?.aborted) return { kind: "handled" };
    await yourAuthClient.signInWithProvider(provider);
    return { kind: "handled" };
  }}
/>
```

The consumer owns Google/GitHub/Microsoft OAuth registration, callback URLs, scopes, server sessions, account linking, errors and redirects. `handled` confirms only that the callback completed; this UI does not authenticate anyone. Email/password, recovery and OTP examples remain mock and need your own backend flow as well.

## Figma and source scope

This application expansion is delivered in code, registry items and browser screenshots. It does not replace or recertify the retained native Figma reviews. The existing Figma file, native snapshots and local Code Connect mappings preserve their documented checkpoints; newly added application blocks have no claimed native Figma master.
