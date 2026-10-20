"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWorkspace } from "@/components/workspace-provider";
import { createCommerceSeed } from "@/demo/commerce-data";
import {
  CommerceError,
  buildOrder,
  commerceInvoiceSchema,
  commerceOrderSchema,
  commerceProductSchema,
  newInvoiceSchema,
  type CommerceAction,
  type CommerceAdapter,
  type CommerceContextValue,
  type CommerceProviderIdentity,
  type CommerceScope,
  type CommerceSnapshot,
} from "@/lib/commerce";
import {
  COMMERCE_STORAGE_PREFIX,
  commercePlans,
  completeMockCheckout,
  parseCommerceSnapshot,
  upsertCommerceProduct,
} from "@/lib/commerce-state";
import { parseStripeAction } from "@/lib/stripe-commerce-adapter";
import {
  parseProviderCommerceAction,
  parseProviderCommerceSnapshot,
} from "@/lib/provider-commerce-adapter";

const Context = createContext<CommerceContextValue | null>(null);
type Session = {
  workspaceId: string;
  adapter?: CommerceAdapter;
  snapshot: CommerceSnapshot;
  ready: boolean;
};
const now = () => new Date().toISOString();
const identifier = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const storageKey = (workspaceId: string) =>
  `${COMMERCE_STORAGE_PREFIX}${encodeURIComponent(workspaceId)}`;
function asCommerceError(error: unknown) {
  return error instanceof CommerceError
    ? error
    : new CommerceError(
        "provider",
        "The operation could not be completed. Try again.",
      );
}

/**
 * The default provider is an isolated, persistent demo. Supply an adapter from
 * a consumer's client wrapper to connect these views to their own backend.
 */
export function CommerceProvider({
  children,
  adapter,
  demoProvider,
}: {
  children: ReactNode;
  adapter?: CommerceAdapter;
  /** Display identity for a local demo; never selects a connected account. */
  demoProvider?: CommerceProviderIdentity;
}) {
  const workspace = useWorkspace();
  const workspaceId = workspace.workspaceId;
  const mode = adapter?.mode ?? "mock";
  const provider = adapter
    ? (adapter.provider ?? {
        id: mode === "stripe" ? "stripe" : "commerce",
        label: mode === "stripe" ? "Stripe" : "Commerce",
      })
    : demoProvider;
  const initial = useMemo(() => createCommerceSeed(), []);
  const [session, setSession] = useState<Session>({
    workspaceId,
    adapter,
    snapshot: initial,
    ready: false,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<CommerceError | null>(null);
  const [persistenceError, setPersistenceError] =
    useState<CommerceContextValue["persistenceError"]>(null);
  const sessionRef = useRef(session);
  const workspaceIdRef = useRef(workspaceId);
  const adapterRef = useRef(adapter);
  const generationRef = useRef(0);
  const operationRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const cacheRef = useRef(new Map<string, CommerceSnapshot>());
  const permissionsRef = useRef({ write: false, billing: false, ready: false });
  const canWrite = workspace.role !== "viewer";
  const canManageBilling =
    workspace.role === "owner" || workspace.role === "admin";
  useLayoutEffect(() => {
    if (adapterRef.current !== adapter) {
      operationRef.current?.abort();
      generationRef.current += 1;
      busyRef.current = false;
      adapterRef.current = adapter;
    }
    workspaceIdRef.current = workspaceId;
    permissionsRef.current = {
      write: canWrite,
      billing: canManageBilling,
      ready: workspace.ready,
    };
  }, [adapter, workspaceId, canWrite, canManageBilling, workspace.ready]);

  const persist = useCallback((scopeId: string, snapshot: CommerceSnapshot) => {
    cacheRef.current.set(scopeId, snapshot);
    try {
      localStorage.setItem(storageKey(scopeId), JSON.stringify(snapshot));
      setPersistenceError(null);
    } catch {
      // Quota/privacy failures preserve the working in-memory session.
      setPersistenceError("write");
    }
  }, []);

  const load = useCallback(async () => {
    if (!permissionsRef.current.ready) return;
    const scopeId = workspaceId;
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    const generation = ++generationRef.current;
    busyRef.current = true;
    setBusy("load");
    setError(null);
    setPersistenceError(null);
    const pending: Session = {
      workspaceId: scopeId,
      adapter,
      snapshot: adapter
        ? { ...createCommerceSeed(), products: [], orders: [], invoices: [] }
        : (cacheRef.current.get(scopeId) ?? createCommerceSeed()),
      ready: false,
    };
    sessionRef.current = pending;
    setSession(pending);
    const current = () =>
      !controller.signal.aborted &&
      generationRef.current === generation &&
      workspaceIdRef.current === scopeId &&
      adapterRef.current === adapter;
    try {
      let snapshot = pending.snapshot;
      if (adapter) {
        const response = await adapter.load({
          workspaceId: scopeId,
          signal: controller.signal,
        });
        const parsed =
          adapter.mode === "provider"
            ? parseProviderCommerceSnapshot(response)
            : parseCommerceSnapshot(response);
        if (!parsed)
          throw new CommerceError(
            "provider",
            "The backend returned an invalid commerce response.",
          );
        snapshot = parsed;
      } else if (!cacheRef.current.has(scopeId)) {
        try {
          const stored = localStorage.getItem(storageKey(scopeId));
          if (stored) {
            const parsed = parseCommerceSnapshot(JSON.parse(stored));
            if (parsed) snapshot = parsed;
            else if (current()) setPersistenceError("invalid");
          }
        } catch {
          if (current()) setPersistenceError("read");
        }
      }
      if (!current()) return;
      if (!adapter) cacheRef.current.set(scopeId, snapshot);
      const next: Session = {
        workspaceId: scopeId,
        adapter,
        snapshot,
        ready: true,
      };
      sessionRef.current = next;
      setSession(next);
    } catch (cause) {
      if (current()) {
        const failure = asCommerceError(cause);
        setError(failure);
        throw failure;
      }
    } finally {
      if (current()) {
        busyRef.current = false;
        operationRef.current = null;
        setBusy(null);
      }
    }
  }, [adapter, workspaceId]);

  useEffect(() => {
    if (workspace.ready) void load().catch(() => {});
    return () => {
      operationRef.current?.abort();
      generationRef.current += 1;
      busyRef.current = false;
    };
  }, [load, workspace.ready]);

  useEffect(() => {
    if (adapter) return;
    const receive = (event: StorageEvent) => {
      if (
        workspaceIdRef.current !== workspaceId ||
        event.key !== storageKey(workspaceId) ||
        busyRef.current
      )
        return;
      try {
        const incoming = event.newValue
          ? parseCommerceSnapshot(JSON.parse(event.newValue))
          : createCommerceSeed();
        if (!incoming) {
          setPersistenceError("invalid");
          return;
        }
        cacheRef.current.set(workspaceId, incoming);
        const next = { workspaceId, snapshot: incoming, ready: true };
        sessionRef.current = next;
        setSession(next);
        setPersistenceError(null);
      } catch {
        setPersistenceError("read");
      }
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, [adapter, workspaceId]);

  const perform = useCallback(
    async <T,>(
      label: string,
      permission: "write" | "billing",
      operation: (
        snapshot: CommerceSnapshot,
        scope: CommerceScope,
      ) => Promise<{ result: T; next?: CommerceSnapshot }>,
    ): Promise<T> => {
      const currentSession = sessionRef.current;
      if (
        !permissionsRef.current.ready ||
        !currentSession.ready ||
        currentSession.workspaceId !== workspaceIdRef.current ||
        currentSession.adapter !== adapter
      )
        throw new CommerceError(
          "unavailable",
          "Wait for the workspace to finish loading.",
        );
      if (!permissionsRef.current[permission]) {
        throw new CommerceError(
          "forbidden",
          "Your workspace role cannot perform this action.",
        );
      }
      if (busyRef.current)
        throw new CommerceError(
          "conflict",
          "Another operation is still in progress.",
        );
      const scopeId = currentSession.workspaceId;
      const controller = new AbortController();
      const generation = generationRef.current;
      operationRef.current = controller;
      busyRef.current = true;
      setBusy(label);
      setError(null);
      const current = () =>
        !controller.signal.aborted &&
        generationRef.current === generation &&
        workspaceIdRef.current === scopeId &&
        adapterRef.current === adapter;
      try {
        const { result, next } = await operation(currentSession.snapshot, {
          workspaceId: scopeId,
          signal: controller.signal,
        });
        if (!current())
          throw new CommerceError(
            "conflict",
            "The workspace changed. Review the current data.",
          );
        if (next) {
          const parsed =
            adapter?.mode === "provider"
              ? parseProviderCommerceSnapshot(next)
              : parseCommerceSnapshot(next);
          if (!parsed)
            throw new CommerceError(
              "validation",
              "The update contains invalid commerce data.",
            );
          const updated: Session = {
            workspaceId: scopeId,
            adapter,
            snapshot: parsed,
            ready: true,
          };
          sessionRef.current = updated;
          setSession(updated);
          if (!adapter) persist(scopeId, parsed);
        }
        return result;
      } catch (cause) {
        const failure = asCommerceError(cause);
        if (current()) setError(failure);
        throw failure;
      } finally {
        if (current()) {
          busyRef.current = false;
          operationRef.current = null;
          setBusy(null);
        }
      }
    },
    [adapter, persist],
  );

  const saveProduct = useCallback<CommerceContextValue["saveProduct"]>(
    (candidate) =>
      perform(`product:${candidate.id}`, "write", async (snapshot, scope) => {
        const parsed = commerceProductSchema.safeParse(candidate);
        if (!parsed.success)
          throw new CommerceError("validation", "Check the product fields.");
        const response = adapter
          ? await adapter.saveProduct(parsed.data, scope)
          : parsed.data;
        const validated = commerceProductSchema.safeParse(response);
        if (!validated.success || validated.data.id !== candidate.id) {
          throw new CommerceError(
            "provider",
            "The backend returned an invalid product.",
          );
        }
        const next = upsertCommerceProduct(
          snapshot,
          validated.data,
          adapter ? validated.data.updatedAt : now(),
        );
        return {
          result: next.products.find((item) => item.id === candidate.id)!,
          next,
        };
      }),
    [adapter, perform],
  );

  const changeProduct = useCallback(
    (id: string, action: "archive" | "sync") =>
      perform(`product:${id}`, "write", async (snapshot, scope) => {
        const product = snapshot.products.find((item) => item.id === id);
        if (!product)
          throw new CommerceError(
            "unavailable",
            "The product is no longer available.",
          );
        const response = adapter
          ? await (action === "archive"
              ? adapter.archiveProduct(id, scope)
              : adapter.syncProduct(id, scope))
          : action === "archive"
            ? { ...product, status: "archived" as const }
            : {
                ...product,
                stripeProductId: product.stripeProductId ?? `prod_demo_${id}`,
                stripePriceId:
                  product.stripePriceId ??
                  `price_demo_${crypto.randomUUID().replaceAll("-", "")}`,
              };
        const validated = commerceProductSchema.safeParse(response);
        if (!validated.success || validated.data.id !== id) {
          throw new CommerceError(
            "provider",
            "The backend returned an invalid product.",
          );
        }
        const next = upsertCommerceProduct(
          snapshot,
          validated.data,
          adapter ? validated.data.updatedAt : now(),
        );
        return { result: next.products.find((item) => item.id === id)!, next };
      }),
    [adapter, perform],
  );
  const archiveProduct = useCallback<CommerceContextValue["archiveProduct"]>(
    (id) => changeProduct(id, "archive"),
    [changeProduct],
  );
  const syncProduct = useCallback<CommerceContextValue["syncProduct"]>(
    (id) => changeProduct(id, "sync"),
    [changeProduct],
  );

  const createOrder = useCallback<CommerceContextValue["createOrder"]>(
    (input) =>
      perform("order:create", "write", async (snapshot, scope) => {
        if (snapshot.orders.length >= 1000)
          throw new CommerceError("conflict", "The demo order list is full.");
        const preview = buildOrder(
          input,
          snapshot.products,
          identifier("ord"),
          now(),
        );
        const response = adapter
          ? await adapter.createOrder(input, scope)
          : preview;
        const validated = commerceOrderSchema.safeParse(response);
        if (
          !validated.success ||
          snapshot.orders.some((item) => item.id === validated.data.id)
        ) {
          throw new CommerceError(
            "provider",
            "The backend returned an invalid order.",
          );
        }
        return {
          result: validated.data,
          next: { ...snapshot, orders: [validated.data, ...snapshot.orders] },
        };
      }),
    [adapter, perform],
  );

  const updateOrderStatus = useCallback<
    CommerceContextValue["updateOrderStatus"]
  >(
    (id, status) =>
      perform(`order:${id}`, "write", async (snapshot, scope) => {
        const order = snapshot.orders.find((item) => item.id === id);
        if (!order)
          throw new CommerceError(
            "unavailable",
            "The order is no longer available.",
          );
        if (order.status === "cancelled")
          throw new CommerceError(
            "conflict",
            "A cancelled order cannot be reopened.",
          );
        if (
          !["processing", "shipped", "delivered", "cancelled"].includes(status)
        ) {
          throw new CommerceError(
            "validation",
            "Choose an available order status.",
          );
        }
        if (
          (status === "shipped" || status === "delivered") &&
          order.paymentStatus !== "paid"
        ) {
          throw new CommerceError(
            "conflict",
            "An unpaid order cannot be shipped.",
          );
        }
        const response = adapter
          ? await adapter.updateOrderStatus(id, status, scope)
          : { ...order, status };
        const validated = commerceOrderSchema.safeParse(response);
        if (!validated.success || validated.data.id !== id)
          throw new CommerceError(
            "provider",
            "The backend returned an invalid order.",
          );
        return {
          result: validated.data,
          next: {
            ...snapshot,
            orders: snapshot.orders.map((item) =>
              item.id === id ? validated.data : item,
            ),
          },
        };
      }),
    [adapter, perform],
  );

  const createInvoice = useCallback<CommerceContextValue["createInvoice"]>(
    (input) =>
      perform("invoice:create", "write", async (snapshot, scope) => {
        const parsed = newInvoiceSchema.safeParse(input);
        if (!parsed.success)
          throw new CommerceError("validation", "Check the invoice fields.");
        if (snapshot.invoices.length >= 1000)
          throw new CommerceError("conflict", "The demo invoice list is full.");
        const createdAt = now();
        const response = adapter
          ? await adapter.createInvoice(parsed.data, scope)
          : {
              ...parsed.data,
              id: identifier("inv"),
              number: `INV-${Date.now().toString(36).toUpperCase()}`,
              status: "open" as const,
              issuedAt: createdAt,
            };
        const validated = commerceInvoiceSchema.safeParse(response);
        if (
          !validated.success ||
          snapshot.invoices.some((item) => item.id === validated.data.id)
        ) {
          throw new CommerceError(
            "provider",
            "The backend returned an invalid invoice.",
          );
        }
        return {
          result: validated.data,
          next: {
            ...snapshot,
            invoices: [validated.data, ...snapshot.invoices],
          },
        };
      }),
    [adapter, perform],
  );

  const checkout = useCallback(
    (kind: "order" | "invoice" | "subscription", id: string) =>
      perform(
        `checkout:${id}`,
        kind === "subscription" ? "billing" : "write",
        async (snapshot, scope) => {
          if (kind === "order") {
            const order = snapshot.orders.find((item) => item.id === id);
            if (
              !order ||
              order.status === "cancelled" ||
              !["unpaid", "failed"].includes(order.paymentStatus)
            ) {
              throw new CommerceError(
                "unavailable",
                "This order cannot be paid.",
              );
            }
          } else if (kind === "invoice") {
            const invoice = snapshot.invoices.find((item) => item.id === id);
            if (!invoice || !["open", "overdue"].includes(invoice.status)) {
              throw new CommerceError(
                "unavailable",
                "This invoice cannot be paid.",
              );
            }
          } else if (!commercePlans.some((item) => item.name === id)) {
            throw new CommerceError("validation", "Choose an available plan.");
          }
          const result: CommerceAction = adapter
            ? adapter.mode === "stripe"
              ? parseStripeAction(await adapter.checkout({ kind, id }, scope))
              : parseProviderCommerceAction(
                  await adapter.checkout({ kind, id }, scope),
                  adapter.trustedRedirectOrigins ?? [],
                )
            : { mode: "mock", kind, id };
          return { result };
        },
      ),
    [adapter, perform],
  );
  const checkoutOrder = useCallback<CommerceContextValue["checkoutOrder"]>(
    (id) => checkout("order", id),
    [checkout],
  );
  const payInvoice = useCallback<CommerceContextValue["payInvoice"]>(
    (id) => checkout("invoice", id),
    [checkout],
  );
  const checkoutPlan = useCallback<CommerceContextValue["checkoutPlan"]>(
    (plan) => checkout("subscription", plan),
    [checkout],
  );
  const openPortal = useCallback<CommerceContextValue["openPortal"]>(
    () =>
      perform("portal", "billing", async (_snapshot, scope) => ({
        result: adapter
          ? adapter.mode === "stripe"
            ? parseStripeAction(await adapter.portal(scope))
            : parseProviderCommerceAction(
                await adapter.portal(scope),
                adapter.trustedRedirectOrigins ?? [],
              )
          : { mode: "mock", kind: "portal", id: scope.workspaceId },
      })),
    [adapter, perform],
  );
  const simulateCheckout = useCallback<
    CommerceContextValue["simulateCheckout"]
  >(
    (action, outcome) =>
      perform(
        `simulate:${action.id}`,
        action.kind === "subscription" ? "billing" : "write",
        async (snapshot) => {
          if (adapter)
            throw new CommerceError(
              "forbidden",
              "Payment status is managed by the backend.",
            );
          return {
            result: undefined,
            next: completeMockCheckout(snapshot, action, outcome, now()),
          };
        },
      ),
    [adapter, perform],
  );
  const retryPersistence = useCallback(() => {
    const current = sessionRef.current;
    if (
      !adapter &&
      current.ready &&
      current.workspaceId === workspaceIdRef.current
    ) {
      persist(current.workspaceId, current.snapshot);
    }
  }, [adapter, persist]);

  const sameSession =
    session.workspaceId === workspaceId && session.adapter === adapter;
  const view = sameSession ? session.snapshot : initial;
  const value: CommerceContextValue = {
    ...view,
    ready: workspace.ready && session.ready && sameSession,
    busy,
    mode,
    provider,
    error,
    persistenceError,
    canWrite,
    canManageBilling,
    reload: load,
    retryPersistence,
    saveProduct,
    archiveProduct,
    syncProduct,
    createOrder,
    updateOrderStatus,
    createInvoice,
    checkoutOrder,
    payInvoice,
    checkoutPlan,
    openPortal,
    simulateCheckout,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCommerce() {
  const value = useContext(Context);
  if (!value)
    throw new Error("useCommerce must be used inside CommerceProvider.");
  return value;
}
