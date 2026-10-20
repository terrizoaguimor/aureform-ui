import type { ReactNode } from "react";
import type {
  IntegrationConnection,
  IntegrationResult,
  IntegrationScope,
} from "./contracts";

export type IntegrationMapRendererProps = {
  connection: IntegrationConnection;
  scope: IntegrationScope;
  locations: Extract<IntegrationResult, { kind: "map" }>["locations"];
  coordinates?: [number, number][];
  selectedLocationId: string;
  onLocationSelect(id: string): void;
  /** Accessible, interactive returned-coordinate view supplied by the workbench. */
  fallback: ReactNode;
};
export type IntegrationMapRenderer = (
  props: IntegrationMapRendererProps,
) => ReactNode;
