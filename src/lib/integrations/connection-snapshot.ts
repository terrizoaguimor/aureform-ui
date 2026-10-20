import {
  IntegrationError,
  type IntegrationConnection,
  type IntegrationDefinition,
  type IntegrationScope,
} from "./contracts";
import { parseIntegrationConnection } from "./validation";

export function integrationConnectionScopeKey(
  connection: IntegrationConnection,
  workspaceId: string,
) {
  return JSON.stringify([
    workspaceId,
    connection.workspaceId,
    connection.integrationId,
    connection.id,
    connection.providerOptionId,
  ]);
}
export function integrationConnectionSnapshotMatches(
  reviewed: IntegrationConnection,
  current: IntegrationConnection,
) {
  return (
    integrationConnectionScopeKey(reviewed, reviewed.workspaceId) ===
      integrationConnectionScopeKey(current, current.workspaceId) &&
    reviewed.revision === current.revision &&
    current.status === "connected"
  );
}
export function acceptIntegrationConnectionResponse(
  input: unknown,
  expected: IntegrationConnection,
  definition: IntegrationDefinition,
  scope: IntegrationScope,
) {
  const value = parseIntegrationConnection(input, definition, scope);
  if (
    value.id !== expected.id ||
    value.providerOptionId !== expected.providerOptionId
  )
    throw new IntegrationError("provider-error");
  if (value.revision < expected.revision)
    throw new IntegrationError("conflict");
  return value;
}
