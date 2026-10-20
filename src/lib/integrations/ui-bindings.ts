import type { ProductEditorRenderer } from "../../components/integrations/product-document";
import type { ProductDataSubscribe } from "../../components/integrations/product-data";
import type { ProductCollaborationSubscribe } from "../../components/integrations/product-collaboration";
import type { DrivePickerBinding } from "./drive-picker";
import type { MediaCollectionBinding } from "./media-collection";
import type { EnterpriseConnectionBinding } from "./enterprise";
import type { IntegrationMapRenderer } from "./map-renderer";
import type { ShellSearchAdapter } from "./search-bridge";

/** Construct under a Client Component. These are opt-in consumer browser hooks. */
export type IntegrationUiBindings = {
  renderEditor?: ProductEditorRenderer;
  subscribe?: ProductCollaborationSubscribe;
  subscribeData?: ProductDataSubscribe;
  renderMap?: IntegrationMapRenderer;
  drivePicker?: DrivePickerBinding;
  media?: MediaCollectionBinding;
  enterprise?: EnterpriseConnectionBinding;
  commandSearch?: ShellSearchAdapter;
  /** Presentation only; the backend decides which diagnostic events it may publish. */
  aiDiagnostics?: boolean;
};
