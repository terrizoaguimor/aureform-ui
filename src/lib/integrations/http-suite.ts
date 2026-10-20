import {
  createAuthHttpAdapter,
  type AuthHttpAdapterOptions,
} from "../auth-integration";
import { createHttpAiWorkspaceAdapter } from "../ai-integration";
import {
  createProviderCommerceAdapter,
  type CommerceProviderName,
  type ProviderCommerceTransportOptions,
} from "../provider-commerce-adapter";
import {
  createHttpIntegrationsAdapter,
  type HttpIntegrationsOptions,
} from "./http-adapter";
import type { IntegrationSuite } from "./suite";

export type HttpIntegrationSuiteOptions = {
  connections?: HttpIntegrationsOptions;
  identity?: Readonly<
    Record<string, Omit<AuthHttpAdapterOptions, "providerId">>
  >;
  ai?: Readonly<
    Record<string, Parameters<typeof createHttpAiWorkspaceAdapter>[0]>
  >;
  commerce?: Readonly<
    Partial<Record<CommerceProviderName, ProviderCommerceTransportOptions>>
  >;
  ui?: IntegrationSuite["ui"];
};

/**
 * A single frontend entry point. Configure your endpoint paths, model IDs,
 * redirect origins and session/CSRF transport; no vendor secrets enter the UI.
 */
export function createHttpIntegrationSuite(
  options: HttpIntegrationSuiteOptions = {},
): IntegrationSuite {
  return {
    ui: options.ui,
    connections: createHttpIntegrationsAdapter(options.connections),
    identity: Object.fromEntries(
      Object.entries(options.identity ?? {}).map(
        ([providerId, configuration]) => [
          providerId,
          createAuthHttpAdapter({ ...configuration, providerId }),
        ],
      ),
    ),
    ai: Object.fromEntries(
      Object.entries(options.ai ?? {}).map(([providerId, configuration]) => [
        providerId,
        createHttpAiWorkspaceAdapter(configuration),
      ]),
    ),
    commerce: Object.fromEntries(
      Object.entries(options.commerce ?? {}).map(
        ([provider, configuration]) => [
          provider,
          createProviderCommerceAdapter({
            ...configuration,
            provider: provider as CommerceProviderName,
          }),
        ],
      ),
    ),
  };
}
