import { IntegrationError, type IntegrationScope } from "./contracts";
import { validateIntegrationScope } from "./validation";

/** Drop late values and release the caller even when a consumer ignores abort. */
export async function withIntegrationCancellation<T>(
  operation: () => T | PromiseLike<T>,
  scope: IntegrationScope,
): Promise<T> {
  validateIntegrationScope(scope);
  return await new Promise<T>((resolve, reject) => {
    const abort = () => {
      scope.signal?.removeEventListener("abort", abort);
      reject(new IntegrationError("cancelled"));
    };
    scope.signal?.addEventListener("abort", abort, { once: true });
    const finish = () => scope.signal?.removeEventListener("abort", abort);
    try {
      validateIntegrationScope(scope);
      Promise.resolve(operation()).then(
        (value) => {
          finish();
          if (scope.signal?.aborted) reject(new IntegrationError("cancelled"));
          else resolve(value);
        },
        (error) => {
          finish();
          reject(
            scope.signal?.aborted ? new IntegrationError("cancelled") : error,
          );
        },
      );
    } catch (error) {
      finish();
      reject(error);
    }
  });
}
