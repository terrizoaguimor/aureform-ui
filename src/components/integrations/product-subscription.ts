import type { IntegrationUpdate } from "../../lib/integrations/contracts";

export type ProductSubscriptionStarter<Update = IntegrationUpdate> = (
  listener: (update: Update) => void,
  signal: AbortSignal,
) => (() => void) | Promise<() => void>;

/** Handles asynchronous transport setup, aborts, and cleanup arriving after unmount. */
export function startProductSubscription<Update = IntegrationUpdate>(
  starter: ProductSubscriptionStarter<Update>,
  options: {
    signal?: AbortSignal;
    onUpdate: (update: Update) => void;
    onError: () => void;
  },
) {
  const controller = new AbortController();
  let active = true;
  let cleanup: (() => void) | undefined;
  const dispose = () => {
    if (!active) return;
    active = false;
    controller.abort();
    options.signal?.removeEventListener("abort", dispose);
    const current = cleanup;
    cleanup = undefined;
    try {
      current?.();
    } catch {
      // An unavailable consumer transport must not prevent the abort or unmount.
    }
  };
  if (options.signal?.aborted) {
    dispose();
    return dispose;
  }
  options.signal?.addEventListener("abort", dispose, { once: true });
  try {
    Promise.resolve(
      starter((update) => {
        if (active && !controller.signal.aborted) options.onUpdate(update);
      }, controller.signal),
    )
      .then((unsubscribe) => {
        if (active && !controller.signal.aborted) cleanup = unsubscribe;
        else unsubscribe();
      })
      .catch(() => {
        if (active && !controller.signal.aborted) options.onError();
      });
  } catch {
    if (active && !controller.signal.aborted) options.onError();
  }
  return dispose;
}
