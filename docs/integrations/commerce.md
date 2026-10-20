# Connect commerce to a consumer backend

Paddle, Polar and Lemon Squeezy can drive the existing product, order, invoice and billing views through an authenticated consumer API. The supplied factories implement browser HTTP transport and response validation. Your application owns provider SDKs, credentials, catalog/customer mappings, durable mutations and verified webhooks.

The default frontend remains the native commerce demo. Omit `commerceAdapter` to use its local catalog, inventory, invoice creation, success/failure checkout and billing previews. Supplying an adapter connects the UI to your endpoints; a missing backend produces an error rather than a simulated payment.

For a provider tab inside a demo Hub, `CommerceProvider` accepts `demoProvider?: CommerceProviderIdentity`:

```tsx
import { CommerceProvider } from "@/components/commerce-provider";
import { CommerceWorkspace } from "@/components/blocks/commerce-workspace";

// Nest inside the existing WorkspaceProvider.
<CommerceProvider demoProvider={{ id: "paddle", label: "Paddle" }}>
  <CommerceWorkspace mode="orders" />
</CommerceProvider>;
```

`demoProvider` sets only the context's display identity. `mode` stays `"mock"` and the native local snapshot, billing, storage and simulated payment flow remain unchanged. No SDK/account connection is created. Pass it only for your Hub's demo connection mode. An injected `adapter` always takes precedence over this demo identity.

[Existing Stripe recipe](../application-integrations.md#connect-your-own-stripe-backend) · [Dated provider research, 2026-10-20](../research/2026-10-20/integrations/catalogue.json)

## Consumer client wrapper

Create the adapter inside your application's Client Component. The existing `AppPage` and `Providers` accept `commerceAdapter`; no change to those wrappers is needed.

```tsx
"use client";

import { useMemo } from "react";
import { AppPage } from "@/components/app-page";
import { createPaddleCommerceAdapter } from "@/lib/provider-commerce-adapter";

export function ConsumerOrdersPage() {
  const commerceAdapter = useMemo(
    () =>
      createPaddleCommerceAdapter({
        baseUrl: "/api/commerce",
        // Example origins only. Replace them with your configured, verified
        // checkout page and customer portal origins, including sandbox choices.
        trustedRedirectOrigins: [
          "https://checkout.example.test",
          "https://billing.example.test",
        ],
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

Use `createPolarCommerceAdapter` or `createLemonSqueezyCommerceAdapter` with the same options to select another provider. There are no built-in checkout or portal hosts. Configure exact HTTPS **origins**, with no path, credentials or wildcard. The API path must be same-origin; mount an authenticated reverse proxy if your server is hosted elsewhere. The default API path follows `NEXT_PUBLIC_BASE_PATH`.

Do not pass an adapter function across a Server Component boundary. Memoize it in the client wrapper. A changed adapter instance triggers a fresh scoped load and cancels the previous operation.

```ts
import { createProviderCommerceAdapter } from "@/lib/provider-commerce-adapter";

const adapter = createProviderCommerceAdapter({
  provider: { id: "consumer-commerce", label: "Consumer Commerce" },
  baseUrl: "/api/commerce",
  trustedRedirectOrigins: ["https://payments.example.test"],
});
```

The generic `provider` option accepts `stripe`, `paddle`, `polar`, `lemon-squeezy`, or a custom `{id, label}`. `lemonsqueezy`, `lemonSqueezy` and `lemon_squeezy` normalize to `lemon-squeezy`. Known factories expose the labels **Paddle**, **Polar** and **Lemon Squeezy**. This generic factory does not change the existing `createStripeCommerceAdapter` or its Stripe redirect policy.

## Public types and signatures

All factories are exported from [`provider-commerce-adapter.ts`](../../src/lib/provider-commerce-adapter.ts).

```ts
export declare function createProviderCommerceAdapter(
  options: ProviderCommerceOptions,
): ProviderCommerceAdapter;

export declare function createPaddleCommerceAdapter(
  options: ProviderCommerceTransportOptions,
): ProviderCommerceAdapter;

export declare function createPolarCommerceAdapter(
  options: ProviderCommerceTransportOptions,
): ProviderCommerceAdapter;

export declare function createLemonSqueezyCommerceAdapter(
  options: ProviderCommerceTransportOptions,
): ProviderCommerceAdapter;
```

`ProviderCommerceTransportOptions` requires `trustedRedirectOrigins: readonly string[]`; it optionally accepts `baseUrl`, `getCsrfToken` and `fetcher: typeof fetch`. `ProviderCommerceOptions` adds `provider: CommerceProviderSelection`.

`ProviderCommerceAdapter` implements every existing `CommerceAdapter` method. Its `mode` is `"provider"`, with `{id, label}` in `provider` and a normalized copy of `trustedRedirectOrigins`. Existing Stripe adapters keep `mode: "stripe"` and can omit the added metadata. Demo contexts keep `mode: "mock"`.

| Method              | Signature and result                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| `load`              | `(scope: CommerceScope) => Promise<CommerceSnapshot>`                                 |
| `saveProduct`       | `(product: CommerceProduct, scope) => Promise<CommerceProduct>`                       |
| `archiveProduct`    | `(productId: string, scope) => Promise<CommerceProduct>`                              |
| `syncProduct`       | `(productId: string, scope) => Promise<CommerceProduct>`                              |
| `createOrder`       | `(input: NewOrderInput, scope) => Promise<CommerceOrder>`                             |
| `updateOrderStatus` | `(orderId: string, status: CommerceOrder["status"], scope) => Promise<CommerceOrder>` |
| `createInvoice`     | `(input: NewInvoiceInput, scope) => Promise<CommerceInvoice>`                         |
| `checkout`          | `(input: CheckoutRequest, scope) => Promise<CommerceAction>`                          |
| `portal`            | `(scope: CommerceScope) => Promise<CommerceAction>`                                   |

`CommerceScope` remains `{workspaceId: string; signal?: AbortSignal}`. `CommerceProvider` exposes the selected identity as `useCommerce().provider`. `getCommerceProviderLabel({mode, provider})`, exported from [`commerce.ts`](../../src/lib/commerce.ts), returns the selected provider label, with `"Stripe"` for a legacy Stripe context and `"Demo"` for an unnamed mock context.

The neutral optional display references are `providerProductId` / `providerPriceId`, `providerSessionId`, `providerInvoiceId` and `providerCustomerId`. Existing `stripe*Id` fields are preserved. These fields never grant access or select a customer's backend account. Product-save transport strips both sets of provider product/price references; the server resolves mappings from authorized local IDs.

The module also exports validation helpers for custom adapters and consumer server code:

```ts
export declare function resolveCommerceProviderIdentity(
  selection: CommerceProviderSelection,
): CommerceProviderIdentity;
export declare function normalizeCommerceRedirectOrigins(
  origins: readonly string[],
): readonly string[];
export declare function isTrustedCommerceRedirect(
  value: unknown,
  trustedOrigins: readonly string[],
): boolean;
export declare function parseProviderCommerceAction(
  value: unknown,
  trustedOrigins: readonly string[],
): Extract<CommerceAction, { mode: "redirect" }>;
export declare function parseProviderCommerceSnapshot(
  value: unknown,
): CommerceSnapshot | null;
```

## HTTP contract

The request types are exported as `ProviderCommerceRequests`, with `ProviderCommerceScope` and the stripped `ProviderCommerceProductInput`. Every request includes `workspaceId` and canonical `provider`. They are requested scope, not authentication or authorization. The server must bind the provider to its configured account and authorize workspace membership and the selected local record.

Every successful response is the named object itself, with `Content-Type: application/json`, not an SDK envelope. GET and POST responses must not redirect. Requests use same-origin cookies, `mode: "same-origin"`, `redirect: "error"`, `cache: "no-store"` and `X-Aureform-Request: commerce`.

| Endpoint under `baseUrl`        | Request                                           | Response                                          |
| ------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| `GET ?workspaceId=…&provider=…` | Query scope                                       | `CommerceSnapshot`                                |
| `POST /products/save`           | `{workspaceId, provider, product}`                | Saved `CommerceProduct`, same local ID            |
| `POST /products/archive`        | `{workspaceId, provider, productId}`              | Same product, `status: "archived"`                |
| `POST /products/sync`           | `{workspaceId, provider, productId}`              | Same product, optional neutral display references |
| `POST /orders/create`           | `{workspaceId, provider, input: NewOrderInput}`   | Canonical `CommerceOrder`                         |
| `POST /orders/status`           | `{workspaceId, provider, orderId, status}`        | Same order with requested fulfillment status      |
| `POST /invoices/create`         | `{workspaceId, provider, input: NewInvoiceInput}` | Canonical `CommerceInvoice`                       |
| `POST /checkout`                | `{workspaceId, provider, kind, id}`               | `{mode: "redirect", url}`                         |
| `POST /portal`                  | `{workspaceId, provider}`                         | `{mode: "redirect", url}`                         |

The browser sends product IDs and quantities when creating orders. Repeated product IDs merge into one line. Checkout sends an existing local order/invoice ID or `Starter`, `Pro`, `Enterprise`; it sends no amount, currency, provider customer ID, payment status or return URL. Resolve them on the server.

Product prices and invoice amounts are administrator proposals. Authenticate and authorize those writes, validate pricing policy, concurrency and stock, and store canonical values. Browser schemas do not replace server validation. Creating an order or opening a checkout must not mark it paid.

Amounts are integer minor units for the existing USD/EUR/GBP contract. `order.total` must equal its purchase-time line totals; catalog edits must not reprice historical orders. The model has no separate tax, shipping or discount fields. Store the full provider quote on the backend and verify paid amount/currency against that quote, rather than assuming a UI product total is the final charge.

Snapshots require unique local IDs, case-insensitive unique SKUs, unique image IDs, merged order lines and a retained product for each historical order reference. Keep archived catalog records when necessary. Shipped/delivered orders require a recorded payment or refund. If a provider does not disclose card details, return `cardLast4: ""` and a truthful `cardBrand` such as `"Not disclosed"`; the billing view displays an empty state instead of invented digits.

When `getCsrfToken` is configured, each POST waits for a nonempty header-safe token. Missing/invalid tokens fail before HTTP. GET does not read CSRF. Your server must enforce its own cookie, origin and CSRF policy, including when you choose not to supply this getter.

HTTP 400/422 map to `validation`, 401/403 to `forbidden`, 404 to `unavailable`, 409 to `conflict`, and 429/other failures to `provider`. Backend error bodies and network exception details are not displayed. Cancellation uses `conflict`; it rejects promptly during CSRF, HTTP or JSON decoding even if an injected transport ignores the signal. No automatic retry occurs. An aborted browser request may already have completed on the server: reload state before retrying a create and implement durable server idempotency.

## Complete consumer routing example

This Web `Request`/`Response` handler covers all endpoints and composes with your authenticated server driver. `driverFor` is a required application dependency: implement its methods against your database and selected provider SDK. It must look up each record inside the authorized workspace, enforce permitted status transitions and retain idempotency/transaction state.

The frontend's static export cannot host authenticated POST routes. Place this handler in the consumer's server deployment or a same-origin API service.

```ts
import { z } from "zod";
import {
  CommerceError,
  commerceInvoiceSchema,
  commerceOrderSchema,
  commerceProductSchema,
  newInvoiceSchema,
  newOrderSchema,
  type CommerceAdapter,
  type CommerceScope,
} from "@/lib/commerce";
import {
  parseProviderCommerceAction,
  parseProviderCommerceSnapshot,
  type ProviderCommerceScope,
} from "@/lib/provider-commerce-adapter";

type Permission = "read" | "write" | "billing";
type Session = { subjectId: string };
type ServerDriver = Pick<
  CommerceAdapter,
  | "load"
  | "saveProduct"
  | "archiveProduct"
  | "syncProduct"
  | "createOrder"
  | "updateOrderStatus"
  | "createInvoice"
  | "checkout"
  | "portal"
>;
type BackendOptions = {
  applicationOrigin: string;
  basePath: string;
  providerId: string;
  trustedRedirectOrigins: readonly string[];
  authenticate(request: Request): Promise<Session | null>;
  verifyCsrf(request: Request, session: Session): Promise<boolean>;
  authorize(
    session: Session,
    workspaceId: string,
    permission: Permission,
  ): Promise<boolean>;
  driverFor(session: Session, workspaceId: string): Promise<ServerDriver>;
};

export function createConsumerCommerceHandler(options: BackendOptions) {
  const id = z.string().trim().min(1).max(100);
  const fields = {
    workspaceId: id,
    provider: z.literal(options.providerId),
  };
  const scopeSchema = z.object(fields).strict();
  const productSchema = z
    .object({
      ...fields,
      product: commerceProductSchema.omit({
        providerProductId: true,
        providerPriceId: true,
        stripeProductId: true,
        stripePriceId: true,
      }),
    })
    .strict();
  const productIdSchema = z.object({ ...fields, productId: id }).strict();
  const orderSchema = z.object({ ...fields, input: newOrderSchema }).strict();
  const statusSchema = z
    .object({
      ...fields,
      orderId: id,
      status: commerceOrderSchema.shape.status,
    })
    .strict();
  const invoiceSchema = z
    .object({ ...fields, input: newInvoiceSchema })
    .strict();
  const checkoutSchema = z
    .object({
      ...fields,
      kind: z.enum(["order", "invoice", "subscription"]),
      id,
    })
    .strict();
  const headers = { "Cache-Control": "no-store" };

  function record<T>(schema: z.ZodType<T>, value: unknown) {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
      throw new CommerceError("provider", "Invalid server response.");
    return Response.json(parsed.data, { headers });
  }

  return async function handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (
        url.pathname !== options.basePath &&
        !url.pathname.startsWith(`${options.basePath}/`)
      )
        return Response.json(
          { error: "unavailable" },
          { status: 404, headers },
        );
      const session = await options.authenticate(request);
      if (!session)
        return Response.json({ error: "forbidden" }, { status: 401, headers });
      if (request.method !== "GET" && request.method !== "POST")
        return Response.json(
          { error: "method" },
          {
            status: 405,
            headers: { ...headers, Allow: "GET, POST" },
          },
        );
      if (
        request.method === "POST" &&
        (request.headers.get("Origin") !== options.applicationOrigin ||
          request.headers.get("X-Aureform-Request") !== "commerce" ||
          !(await options.verifyCsrf(request, session)))
      )
        throw new CommerceError("forbidden", "Request denied.");

      async function scoped<T>(
        body: ProviderCommerceScope,
        permission: Permission,
        operation: (driver: ServerDriver, scope: CommerceScope) => Promise<T>,
      ) {
        if (!(await options.authorize(session!, body.workspaceId, permission)))
          throw new CommerceError("forbidden", "Request denied.");
        const driver = await options.driverFor(session!, body.workspaceId);
        return operation(driver, {
          workspaceId: body.workspaceId,
          signal: request.signal,
        });
      }

      const path = url.pathname.slice(options.basePath.length);
      if (request.method === "GET") {
        if (path !== "")
          return Response.json(
            { error: "unavailable" },
            { status: 404, headers },
          );
        const body = scopeSchema.parse(Object.fromEntries(url.searchParams));
        const snapshot = parseProviderCommerceSnapshot(
          await scoped(body, "read", (driver, scope) => driver.load(scope)),
        );
        if (!snapshot)
          throw new CommerceError("provider", "Invalid server snapshot.");
        return Response.json(snapshot, { headers });
      }
      const raw: unknown = await request.json();
      switch (path) {
        case "/products/save": {
          const body = productSchema.parse(raw);
          return record(
            commerceProductSchema,
            await scoped(body, "write", (driver, scope) =>
              driver.saveProduct(body.product, scope),
            ),
          );
        }
        case "/products/archive": {
          const body = productIdSchema.parse(raw);
          return record(
            commerceProductSchema,
            await scoped(body, "write", (driver, scope) =>
              driver.archiveProduct(body.productId, scope),
            ),
          );
        }
        case "/products/sync": {
          const body = productIdSchema.parse(raw);
          return record(
            commerceProductSchema,
            await scoped(body, "write", (driver, scope) =>
              driver.syncProduct(body.productId, scope),
            ),
          );
        }
        case "/orders/create": {
          const body = orderSchema.parse(raw);
          return record(
            commerceOrderSchema,
            await scoped(body, "write", (driver, scope) =>
              driver.createOrder(body.input, scope),
            ),
          );
        }
        case "/orders/status": {
          const body = statusSchema.parse(raw);
          return record(
            commerceOrderSchema,
            await scoped(body, "write", (driver, scope) =>
              driver.updateOrderStatus(body.orderId, body.status, scope),
            ),
          );
        }
        case "/invoices/create": {
          const body = invoiceSchema.parse(raw);
          return record(
            commerceInvoiceSchema,
            await scoped(body, "write", (driver, scope) =>
              driver.createInvoice(body.input, scope),
            ),
          );
        }
        case "/checkout": {
          const body = checkoutSchema.parse(raw);
          const action = await scoped(
            body,
            body.kind === "subscription" ? "billing" : "write",
            (driver, scope) =>
              driver.checkout({ kind: body.kind, id: body.id }, scope),
          );
          return Response.json(
            parseProviderCommerceAction(action, options.trustedRedirectOrigins),
            { headers },
          );
        }
        case "/portal": {
          const body = scopeSchema.parse(raw);
          const action = await scoped(body, "billing", (driver, scope) =>
            driver.portal(scope),
          );
          return Response.json(
            parseProviderCommerceAction(action, options.trustedRedirectOrigins),
            { headers },
          );
        }
        default:
          return Response.json(
            { error: "unavailable" },
            { status: 404, headers },
          );
      }
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return Response.json({ error: "validation" }, { status: 400, headers });
      const status =
        error instanceof CommerceError
          ? {
              validation: 400,
              unavailable: 404,
              conflict: 409,
              forbidden: 403,
              provider: 502,
            }[error.code]
          : 500;
      return Response.json({ error: "commerce" }, { status, headers });
    }
  };
}
```

Bind this function to your server router with `basePath: "/api/commerce"`, the canonical provider ID and verified application/redirect origins. `authenticate`, `verifyCsrf`, `authorize` and `driverFor` must be real application services. Webhook routes are separate: provider signatures authenticate them, not a browser CSRF token.

## Canonical snapshot example

This is a fictional test fixture with one digital product, order and invoice, not provider pricing. Real driver responses must use your saved records and verified billing state.

```json
{
  "version": 1,
  "products": [
    {
      "id": "prd-example",
      "name": "Example digital product",
      "sku": "DIGITAL-EXAMPLE",
      "description": "Fictional contract fixture.",
      "category": "Digital",
      "status": "active",
      "unitAmount": 2500,
      "currency": "usd",
      "inventory": 10,
      "images": [],
      "tags": [],
      "providerProductId": "example-provider-product",
      "updatedAt": "2026-10-20T15:00:00.000Z"
    }
  ],
  "orders": [
    {
      "id": "ord-example",
      "number": "#EXAMPLE",
      "customerName": "Example Customer",
      "customerEmail": "customer@example.test",
      "currency": "usd",
      "total": 2500,
      "status": "processing",
      "paymentStatus": "unpaid",
      "items": [
        {
          "productId": "prd-example",
          "name": "Example digital product",
          "quantity": 1,
          "unitAmount": 2500
        }
      ],
      "createdAt": "2026-10-20T15:00:00.000Z",
      "shippingAddress": ""
    }
  ],
  "invoices": [
    {
      "id": "inv-example",
      "number": "INV-EXAMPLE",
      "customerName": "Example Customer",
      "customerEmail": "customer@example.test",
      "description": "Example service invoice",
      "amount": 2500,
      "currency": "usd",
      "status": "open",
      "issuedAt": "2026-10-20T15:00:00.000Z",
      "dueAt": "2026-11-20T15:00:00.000Z"
    }
  ],
  "billing": {
    "plan": "Starter",
    "status": "trialing",
    "amount": 0,
    "currency": "usd",
    "interval": "month",
    "currentPeriodEnd": "2026-11-20T15:00:00.000Z",
    "cardBrand": "Not disclosed",
    "cardLast4": "",
    "customerEmail": "customer@example.test",
    "providerCustomerId": "example-provider-customer"
  }
}
```

For checkout and portal, return only `{ "mode": "redirect", "url": "https://checkout.example.test/session/example" }` after your server creates or retrieves the authorized session. Replace this fictional URL with the actual session URL matching a configured origin. Do not forward an entire provider response containing credentials or session tokens in additional fields.

## Provider driver responsibilities

These references were checked on **2026-10-20**, extending the dated research. Review provider eligibility and the API/SDK version chosen by your consumer application.

- **Paddle:** map saved catalog records to Products/Prices and create an authorized transaction. Return its `checkout.url` for payment. That link uses a configured approved checkout page which must include Paddle.js; this transport does not install or initialize Paddle.js. For invoices, use the provider's supported transaction collection workflow. A portal operation creates a fresh customer portal session for the backend-owned customer mapping and selects its returned overview URL. [Transaction checkout links](https://developer.paddle.com/build/transactions/pass-transaction-checkout/), [customer portal sessions](https://developer.paddle.com/api-reference/customer-portals/create-customer-portal-session/).
- **Polar:** select the saved provider product and customer mapping when creating a checkout, and return its `url`. The `products` list specifies the offers available to select at checkout; it must not be assumed to be a generic shopping cart. Create a customer session for the authorized customer and return `customer_portal_url`. Pin the consumer's API/SDK and webhook payload version; the current documentation has a `2026-10` namespace. [Checkout](https://polar.sh/docs/api-reference/2026-10/checkouts/create-checkout-session), [customer session](https://polar.sh/docs/api-reference/2026-10/customer-sessions/create-customer-session).
- **Lemon Squeezy:** use backend-owned store/variant mappings to create a checkout and return `data.attributes.url`. Restrict available variants according to your saved offer. Retrieve a fresh Customer/Subscription signed `urls.customer_portal` for the authorized mapping. A missing subscription can produce a null portal URL; return an appropriate unavailable response rather than inventing a destination. [Create checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout), [customer portal](https://docs.lemonsqueezy.com/guides/developer-guide/customer-portal).

Product synchronization can mean creating/updating a supported provider resource or linking to a preconfigured offer. Order fulfillment and operational invoice records can remain in your own database when a provider has different native resources. Return the canonical UI contract and an explicit error for an unsupported operation; do not invent a provider API. Preserve historical purchase references when catalog prices change.

Payment confirmation belongs to verified provider events or authoritative server queries. Verify signatures over the required raw request bytes before parsing, bind the event to your stored workspace/customer/order, check currency and the full saved quote, deduplicate events transactionally, and handle retries/out-of-order updates. Cancellation, failure and refund must remain distinct from successful payment. Portal return and checkout return URLs prove no payment; refresh the frontend from the backend after returning.

Use [Paddle signature verification](https://developer.paddle.com/webhooks/about/signature-verification/), [Polar webhook endpoint/version settings](https://polar.sh/docs/api-reference/2026-10/webhooks/create-webhook-endpoint) and [Lemon Squeezy webhook synchronization](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks). For Polar, match the configured endpoint's `uses_standard_webhook_signature` mode and payload version instead of assuming one signature convention for every endpoint.

## Verification

```sh
node --experimental-strip-types --test tests/commerce.test.mjs tests/provider-commerce.test.mjs
```

The tests use native commerce fixtures and injected HTTP responses. They exercise all three factories and every mutation, hostile redirects, malformed snapshots and relationships, status/JSON/CSRF failures, cancellation during each asynchronous stage, provider aliases, missing card details and real EN/ES billing/order/invoice rendering. Real `CommerceProvider` rendering verifies connected and scoped demo identity, adapter precedence and unchanged mock billing. Existing Stripe transport and demo checkout behavior are covered without live payment calls.
