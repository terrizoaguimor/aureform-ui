import type {
  IntegrationConnectResult,
  IntegrationConnection,
  IntegrationScope,
} from "./contracts";

export type EnterpriseConnectionAction =
  | "verify-domain"
  | "request-administrator-consent"
  | "renew-subscription"
  | "synchronize";

/** Profiles, consent redirects, renewal and policy enforcement remain server-side. */
export type EnterpriseConnectionBinding = {
  actions: readonly EnterpriseConnectionAction[];
  perform(input: {
    action: EnterpriseConnectionAction;
    connection: IntegrationConnection;
    idempotencyKey: string;
    scope: IntegrationScope;
  }): Promise<IntegrationConnectResult>;
};
