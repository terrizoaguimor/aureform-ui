# Browser bindings: Picker, public media, maps and enterprise policy

These are optional consumer bindings around the shared integration transport.
The public demo remains local. Native browser services mount only when the
application explicitly injects a binding. Construct bindings in a Client
Component; they contain callbacks.

## Complete consumer composition

This example accepts an already authorized application connection transport.
The consumer implements its OAuth token/registration endpoints, map-profile
resolver and enterprise actions. No provider secret enters the configuration
form or browser storage.

```tsx
"use client";

import { useMemo } from "react";
import type { StyleSpecification } from "maplibre-gl";
import { Providers } from "@/components/providers";
import { IntegrationHub } from "@/components/integrations/integration-hub";
import { GoogleIntegrationMap, MapLibreIntegrationMap } from "@/components/integrations/connected-map";
import type { IntegrationConnection, IntegrationsAdapter } from "@/lib/integrations/contracts";
import { createGoogleDrivePickerBinding, type GoogleDrivePickerOptions } from "@/lib/integrations/drive-picker";
import { createHttpMediaCollectionBinding } from "@/lib/integrations/media-collection";
import type { EnterpriseConnectionBinding } from "@/lib/integrations/enterprise";
import type { IntegrationSuite } from "@/lib/integrations/suite";
import { publicPath } from "@/lib/public-path";

type BrowserConnectedWorkspaceProps = {
  connections: IntegrationsAdapter;
  googleBrowserKey: string;
  googleMapsMapId: string;
  googleProjectNumber: string;
  getDriveAccessToken: GoogleDrivePickerOptions["getAccessToken"];
  registerDriveFiles: GoogleDrivePickerOptions["registerFiles"];
  enterprise: EnterpriseConnectionBinding;
  getCsrfToken: () => string | undefined;
  resolveMapProfile: (connection: IntegrationConnection) => {
    style: StyleSpecification | string;
    attribution: string;
  };
};

export function BrowserConnectedWorkspace(props: BrowserConnectedWorkspaceProps) {
  const suite = useMemo<IntegrationSuite>(() => ({
    connections: props.connections,
    ui: {
      drivePicker: createGoogleDrivePickerBinding({
        developerKey: props.googleBrowserKey,
        appId: props.googleProjectNumber,
        getAccessToken: props.getDriveAccessToken,
        registerFiles: props.registerDriveFiles,
      }),
      media: createHttpMediaCollectionBinding({
        baseUrl: publicPath("/api/integrations/media"),
        csrfToken: props.getCsrfToken,
      }),
      enterprise: props.enterprise,
      renderMap: (input) => {
        if (input.connection.providerOptionId === "google-maps") {
          return <GoogleIntegrationMap {...input} apiKey={props.googleBrowserKey} mapId={props.googleMapsMapId} />;
        }
        const profile = props.resolveMapProfile(input.connection);
        return <MapLibreIntegrationMap {...input} style={profile.style} attribution={profile.attribution} />;
      },
    },
  }), [props.connections, props.googleBrowserKey, props.googleMapsMapId,
    props.googleProjectNumber, props.getDriveAccessToken, props.registerDriveFiles,
    props.enterprise, props.getCsrfToken, props.resolveMapProfile]);
  return <Providers locale="en"><IntegrationHub suite={suite} /></Providers>;
}
```

Add the identity, AI and commerce adapters described in the other recipes when
the corresponding consumer workflows are used. A missing specialized adapter
shows setup instructions. The map example deliberately chooses MapLibre for
non-Google profiles; mounting a native Mapbox renderer is a separate explicit
consumer choice, not a side effect of selecting a provider in a form.

## Google Drive and limited-file selection

`createGoogleDrivePickerBinding` loads the Google Picker API after the user
opens the dialog. It obtains the application's short-lived token in memory,
sets the project number, restricted browser key and current origin, supports
multiple selected documents, and disposes the dialog on cancellation or scope
change. The public demo selects local resources instead.

The UI retains only `{ id, name, mimeType }`, asks the user to review the exact
selection, then calls `registerFiles`. That callback must check session,
workspace, connection revision and provider access for each chosen file.
Return the authoritative `IntegrationConnection`, including its allowed
`resourceIds`. The panel refreshes the backend resource list; a picked ID by
itself is not a permission grant. Retry uses the same idempotency key until the
registration is acknowledged.

Use `drive.file` where it fits the application. Google documents its limited
access to files opened/shared with the application and its use with Picker.
The OAuth flow and consent screen remain consumer setup. `googleapis` is a
server API library; it does not supply the browser dialog. See
[Google Picker](https://developers.google.com/workspace/drive/picker/guides/overview),
[web integration](https://developers.google.com/workspace/drive/picker/guides/sample)
and [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

Backend-selected file records can report `revoked`, `stale`, `indexing`,
`ready` or an error as their actual status. Preserve the upstream disposition
when projecting records. An import job is separate from file selection; the
shared connector workbench reviews document imports against authorized files.

## Public media collections

`MediaCollectionPanel` reuses `ProductImageEditor`: validated raster upload,
replacement, crop/rotation, alternative text, primary image and ordering.
It stages an immutable review before persistence and retains edits on errors.
On a revision conflict, load the latest revision while keeping the draft, then
review it again. Local processing reports processing state, not invented
transfer percentages.

`createHttpMediaCollectionBinding` uses these consumer endpoints:

| Method | Path under `baseUrl` | Contract |
| --- | --- | --- |
| GET | `/:connectionId` | `IntegrationMediaCollection` with approved public image URLs |
| POST | `/:connectionId` | Multipart `metadata` plus edited raster file parts; returns the persisted collection |

Metadata includes collection ID/revision, connection revision, ordered image
IDs, alt text and dimensions. Existing images retain their public `src`; new
or cropped rasters have a `fileKey` identifying their binary multipart part.
The request sends the workspace header, same-origin credentials, optional
CSRF header and idempotency key. The server validates membership, image bytes,
allowed folder/preset/delivery policy, collection revision and primary/order
persistence. Cloudinary signatures and credentials stay on that server.
Responses contain public presentation URLs; the browser never creates a
signed credential URL or a public grant for a private object.

Private attachments continue through `IntegrationsAdapter.upload` and
authorized preview proxies. Opting into a public media collection is
deliberate. To provide an SDK's measured transfer progress, wrap the binding
with your own progress presentation; the generic HTTP path remains
indeterminate.

## Native maps and fallback

`renderMap` receives the validated, returned locations, route coordinates,
selection callback, connection/workspace and an accessible schematic fallback.
`GoogleIntegrationMap` reuses the existing Google loader, restricted public key,
map ID, selected markers, routes, retries and error fallback.
`MapLibreIntegrationMap` consumes an approved style or style URL, adds the
returned route/markers, keeps native source attribution, accepts explicit data
attribution, fits actual geometry, handles load errors/timeouts and removes
markers/listeners on unmount. Neither renderer geocodes nor requests directions
implicitly; those actions use the integration backend.

A style reference is resolved by the consumer, not inserted into a tile URL by
the kit. Keep tile and data licensing/attribution in the selected profile.
For native Mapbox GL, inject a renderer implementing the same
`IntegrationMapRendererProps`; install and accept that SDK's license separately.
See [MapLibre's API](https://maplibre.org/maplibre-gl-js/docs/API/)
and [Google Maps JavaScript](https://developers.google.com/maps/documentation/javascript/overview).

## Enterprise/domain/Graph/CRM diagnostics

`connection.enterprise` reports optional domain verification and DNS records,
SSO status, organization administrator approval, delegated/application mode,
actual provider scopes, administrator consent, notification renewal, initial/
incremental/delta synchronization and named policy checks.
Missing fields display “Not reported”. The panel never infers consent from
logical UI permissions and never exposes a delta token or provider credential.
The local fixtures are explicitly labeled.

`EnterpriseConnectionBinding.actions` declares available backend-owned actions:
domain verification, administrator consent, subscription renewal and
synchronization. Each action reviews a snapshot of the connection, sends a
retained idempotency key, validates the resulting connection and can present
an explicitly trusted provider authorization URL. The backend supplies and
enforces the selected organization, permission mode, service scopes, allowed
field policy, renewal schedule and sync checkpoints.

Use WorkOS/Auth0 callbacks for domain/SSO policy, Microsoft Graph callbacks
for consent/change notifications/delta status, and Salesforce callbacks for
selected-object/field policy and sync diagnostics. Their actual provider
acceptance is tested by the adopting application, after configuring its
accounts and backend.
