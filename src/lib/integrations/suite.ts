import type { AiWorkspaceAdapter } from "../ai-integration";
import type { AuthWorkflowAdapter } from "../auth-integration";
import type { CommerceAdapter } from "../commerce";
import type { IntegrationsAdapter } from "./contracts";
import type { IntegrationUiBindings } from "./ui-bindings";

/** Construct in a Client Component. Consumer adapters contain functions. */
export type IntegrationSuite = {
  connections: IntegrationsAdapter;
  /** Keys are provider-option IDs, with candidate IDs as a fallback. */
  identity?: Readonly<Record<string, AuthWorkflowAdapter>>;
  ai?: Readonly<Record<string, AiWorkspaceAdapter>>;
  commerce?: Readonly<Record<string, CommerceAdapter>>;
  /** Optional native editors, data streams, search, maps, Picker and media UI. */
  ui?: IntegrationUiBindings;
};
