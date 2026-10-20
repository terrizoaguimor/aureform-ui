import type { IntegrationOperation } from "./contracts";

/** Property order does not turn an unchanged retry into a different write. */
export function integrationRequestSignature(
  request: Omit<IntegrationOperation, "idempotencyKey">,
  workspaceId: string,
) {
  return JSON.stringify([
    workspaceId,
    request.integrationId,
    request.connectionId,
    request.actionId,
    Object.keys(request.values)
      .sort()
      .map((key) => [key, request.values[key]]),
  ]);
}

/**
 * Retain a key until a successful response. Cancellation or a lost response
 * cannot prove that a consumer backend did not already commit the write.
 */
export function createIntegrationRequestKeys(
  createKey: () => string = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `request-${Date.now()}-${Math.random().toString(36).slice(2)}`,
) {
  const keys = new Map<string, string>();
  return {
    acquire(signature: string) {
      const existing = keys.get(signature);
      if (existing) return existing;
      const key = createKey();
      keys.set(signature, key);
      if (keys.size > 100) keys.delete(keys.keys().next().value!);
      return key;
    },
    confirm(signature: string, key: string) {
      if (keys.get(signature) === key) keys.delete(signature);
    },
    clear() {
      keys.clear();
    },
  };
}
