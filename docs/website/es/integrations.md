# Integraciones listas para conectar

Aureform incluye **65 recetas de frontend en 17 familias de flujos**. Abre el [centro de integraciones](/es/integrations/) o una receta concreta, como [datos con Supabase](/es/integrations/supabase-data/), [Stripe](/es/integrations/stripe/) u [OpenAI Responses](/es/integrations/openai-responses/).

Cada receta incluye configuración de cuenta, elección de proveedor, permisos lógicos, selección de recursos, estado de conexión, sincronización, actividad e interfaz de trabajo. La demo pública usa mocks locales funcionales. No solicita acceso a cuentas externas, envía correos, registra analítica, cobra pagos ni ejecuta modelos reales.

## Qué incluye

| Familia | Flujo de frontend |
| --- | --- |
| Datos y API | Tablas remotas controladas, filtros, ordenación, paginación, edición de registros y recuperación de solicitudes |
| Identidad | Acceso por correo, verificación, recuperación, botones sociales, sesiones, MFA, organizaciones, miembros e invitaciones |
| Comercio | Edición de productos e imágenes, pedidos, facturas, checkout, planes y portal de cliente |
| Archivos y media | Selección de archivos, metadatos, vista previa, subida, progreso y reintento |
| Email | Selección de plantilla, edición, vista previa, revisión del envío y estado |
| Analítica y diagnóstico | Métricas, eventos, consentimiento, flags, trazas e informes de evaluación |
| Notificaciones | Bandeja, preferencias y composición de notificaciones |
| Trabajo en segundo plano | Ejecuciones, pasos, progreso, logs, cancelación y reintento |
| Colaboración | Mensajes por workspace, presencia y suscripción en vivo inyectable |
| Contenido | Documentos, edición, vista previa, revisión de versiones y callbacks de persistencia |
| Búsqueda | Consulta, resultados ordenados y enlaces a fuentes |
| Mapas | Ubicaciones, geocodificación, rutas e interfaz existente de MapLibre/Google Maps |
| AI | Modelos autorizados, streaming estructurado, fuentes, adjuntos, consumo, cancelación, reintento y aprobación de herramientas |
| Conocimiento | Ingesta de fuentes, recuperación, citas y evaluación |
| Agentes y herramientas | Ejecuciones, solicitudes de herramientas, aprobación/rechazo explícitos y checkpoints |
| Conectores de producto | Recursos autorizados, mapeo de campos, registros, issues y tickets |
| Automatización | Elección de workflow, entradas, mapeo de campos y seguimiento de ejecuciones |

Los SDK son dependencias opcionales del consumidor. Elegir un proveedor no instala un SDK ni crea una cuenta. El kit aporta la presentación y los contratos de transporte; tu aplicación aporta la conectividad y la autorización de su backend.

## Conectar el centro completo

Construye los adaptadores en un Client Component. Contienen funciones y no pueden pasarse como props serializadas desde el servidor.

```tsx
"use client";

import { useMemo } from "react";
import { Providers } from "@/components/providers";
import { IntegrationHub } from "@/components/integrations/integration-hub";
import { createHttpIntegrationSuite } from "@/lib/integrations/http-suite";
import { publicPath } from "@/lib/public-path";

type ConnectedWorkspaceProps = {
  applicationOrigin: string;
  approvedModelId: string;
  checkoutOrigin: string;
  getCsrfToken: () => Promise<string>;
};

export function ConnectedWorkspace({
  applicationOrigin,
  approvedModelId,
  checkoutOrigin,
  getCsrfToken,
}: ConnectedWorkspaceProps) {
  const suite = useMemo(
    () => createHttpIntegrationSuite({
      connections: {
        baseUrl: publicPath("/api/integrations"),
        getCsrfToken,
      },
      identity: {
        "better-auth": {
          basePath: publicPath("/api/identity/better-auth"),
          redirectPolicy: { origin: applicationOrigin },
          csrfToken: getCsrfToken,
        },
      },
      ai: {
        "openai-responses": {
          endpoint: publicPath("/api/ai/stream"),
          approvalEndpoint: publicPath("/api/ai/approvals"),
          models: [{
            id: approvedModelId,
            provider: "openai-responses",
            label: "Modelo autorizado de la aplicación",
          }],
          fetch: async (url, init) => {
            const headers = new Headers(init?.headers);
            headers.set("X-CSRF-Token", await getCsrfToken());
            return fetch(url, { ...init, headers });
          },
        },
      },
      commerce: {
        polar: {
          baseUrl: publicPath("/api/commerce"),
          trustedRedirectOrigins: [checkoutOrigin],
          getCsrfToken,
        },
      },
    }),
    [applicationOrigin, approvedModelId, checkoutOrigin, getCsrfToken],
  );
  return (
    <Providers locale="es">
      <IntegrationHub suite={suite} />
    </Providers>
  );
}
```

Las claves de `identity`, `ai` y `commerce` coinciden con el ID de opción de proveedor de la receta. También puedes usar el ID del candidato como fallback. Añade los proveedores que soporte tu aplicación. Si una conexión del consumidor no tiene su adaptador especializado, el centro muestra las instrucciones de configuración en lugar de ejecutar un mock local.

`AppPage` acepta `integrationSuite`, `integrationsAdapter`, `aiAdapter`, `authWorkflowAdapter` y los existentes `commerceAdapter` y callbacks de autenticación social. Puedes usar una interfaz individual sin incorporar toda la navegación de la demo.

## Contrato HTTP común

`createHttpIntegrationsAdapter` envía la referencia del workspace en cada solicitud. Esa referencia no demuestra autorización: el backend comprueba identidad, membresía, conexión, recurso y acción.

| Método | Ruta bajo tu base configurada | Respuesta |
| --- | --- | --- |
| GET | `/connections` | Array de conexiones |
| GET | `/connections/:integrationId` | Conexión |
| POST | `/connect` | Resultado conectado o de autorización |
| POST | `/connections/:connectionId/configure` | Conexión con revisión |
| POST | `/connections/:connectionId/disconnect` | Conexión desconectada |
| GET | `/resources/:integrationId?query=…` | Recursos autorizados |
| POST | `/connections/:connectionId/sync` | Conexión actualizada |
| GET | `/connections/:connectionId/events` | Array de actividad |
| POST | `/execute` | Resultado discriminado por dominio |
| POST | `/upload` | Asset subido; multipart contiene el `File` original |

Los DTO completos están en [`contracts.ts`](https://github.com/terrizoaguimor/aureform-ui/blob/main/src/lib/integrations/contracts.ts). Las acciones se declaran en [`definitions.ts`](https://github.com/terrizoaguimor/aureform-ui/blob/main/src/lib/integrations/definitions.ts). Los resultados incluyen registros, documentos, búsquedas, archivos, entregas, métricas, trabajos, ubicaciones, conocimiento y herramientas.

El transporte valida respuestas acotadas y rechaza workspaces, conexiones, opciones, revisiones y URL de presentación incoherentes. Admite cancelación, claves de idempotencia, conflictos de revisión, límites de solicitudes y orígenes HTTPS de backend autorizados explícitamente. Aporta orígenes exactos de autorización si tu backend devuelve un destino OAuth externo.

Para tiempo real, aporta el callback opcional `subscribe`. Recibe conexión y workspace, publica resultados/presencia/conexiones tipados y devuelve su limpieza. Tu SDK o transporte SSE autenticado gestiona la reconexión y el acceso a cuentas.

## Transportes especializados

Identidad usa `AuthWorkflowAdapter`, mediante `createAuthHttpAdapter` o factories de callbacks para Better Auth, Clerk, Supabase Auth, Auth.js, WorkOS y Auth0. [Contrato y ejemplos de identidad](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/identity.md).

AI usa `AiWorkspaceAdapter`. HTTP espera el protocolo acotado **NDJSON v1** de Aureform; el consumidor debe normalizar el SSE nativo del proveedor. Aceptar una herramienta y ejecutarla son pasos distintos, confirmados por los eventos posteriores del stream. [Protocolo AI y ejemplos de callbacks](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/ai.md).

Comercio usa el existente `CommerceAdapter` y factories para Stripe, Paddle, Polar y Lemon Squeezy. Tu backend mapea el catálogo de la aplicación a productos/precios del proveedor, concilia suscripciones y verifica webhooks. [Transporte de comercio y límites de proveedores](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/commerce.md).

Los editores y la colaboración pueden usar los puntos de extensión de la interfaz de producto; el consumidor aporta su editor o transporte de suscripción. [Recetas de producto](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/product-workflows.md). [Recetas operativas](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/operations.md).

Usa `suite.ui` o `AppPage.integrationUi` para bindings de editores nativos, suscripciones de datos por consulta, transporte de colaboración, búsqueda conectada en la paleta, mapas, Google Drive Picker, colecciones de imágenes públicas y acciones empresariales. La [composición de bindings](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/browser-bindings.md), las [recetas de SDK de editores](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/editors.md) y el [Mapbox nativo opcional](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/mapbox-binding.md) incluyen los contratos completos. La demo no carga SDK externos para estas vistas.

## Instalar código seleccionado

```bash
npx shadcn@latest add https://aureformui.com/r/integration-hub.json
npx shadcn@latest add https://aureformui.com/r/integrations-suite.json
```

También están `integrations-http`, `integrations-demo`, `identity-integration-panel`, `operational-integration-workbench`, `product-integration-workbench`, `auth-integration`, `ai-integration` y `commerce-providers`. Cada entrada incluye imports locales, dependencias necesarias y recursos portables.

Puedes instalar `connected-map`, `drive-picker-panel`, `media-collection-panel`, `enterprise-diagnostics`, `product-editor-controls` o `search-bridge-command` por separado para integrar esos controles. Las entradas `drive-picker` y `media-collection` aportan sus helpers de transporte.

El [manifiesto de cobertura de proveedores](https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/integrations/provider-coverage.json) relaciona cada candidato y opción de proveedor con su receta de frontend. El [research fechado de integraciones](/es/docs/integration-research/) conserva la evidencia de selección, licencias y límites de servicio; no certifica compatibilidad nativa de SDK.
