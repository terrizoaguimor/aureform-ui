# Fichas de candidatos de integración

[Capítulo en español](../../../website/es/integration-research.md) · [English cards](catalogue.md)

65 fichas bilingües de investigación, revisadas el 20 de octubre de 2026 sobre Aureform 1.4.1, commit `a93ab113170ec1456608cf1f85d1a89b23aaec68`. Cuatro ejecuciones de AGY completadas registraron 99 búsquedas. Son recetas propuestas, no conexiones entregadas por esta publicación.

La muestra oficial npm contiene 70 paquetes en una ventana inclusiva común: 12–18 de octubre de 2026. Los eventos de instalación incluyen CI y dependencias transitivas; no son usuarios únicos ni cuota de Next.js. No sumar paquetes relacionados ni comparar funciones distintas. Las versiones siguientes son metadatos fechados, no dependencias instaladas ni aceptación de runtime.

[Catálogo estructurado](catalogue.json) · [Recuentos npm](npm-downloads.json) · [Metadatos de paquetes](package-metadata.json) · [Fuentes](sources.json) · [Procedencia AGY](agy-provenance.json)

P0: fundamentos; P1: recorridos comunes; P2: casos especializados según demanda. El esfuerzo es un juicio relativo de producto, no días ni un coste medido de implementación. Los proveedores agrupados son opciones dentro de un rol.

| Candidato                                                                                                       | Prioridad | Elección                         |
| --------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------- |
| [TanStack Query](#tanstack-query)                                                                               | P0        | Opción principal                 |
| [Supabase application data](#supabase-application-data)                                                         | P0        | Opción principal                 |
| [Better Auth](#better-auth)                                                                                     | P0        | Opción principal                 |
| [Clerk](#clerk)                                                                                                 | P0        | Alternativa                      |
| [Supabase Auth](#supabase-auth)                                                                                 | P0        | Alternativa                      |
| [Auth.js / NextAuth](#authjs--nextauth)                                                                         | P2        | Referencia / capacidad existente |
| [WorkOS AuthKit / Auth0](#workos-authkit--auth0)                                                                | P2        | Opción especializada             |
| [SWR](#swr)                                                                                                     | P2        | Alternativa                      |
| [Neon with Drizzle ORM](#neon-with-drizzle-orm)                                                                 | P2        | Alternativa                      |
| [Prisma ORM](#prisma-orm)                                                                                       | P2        | Alternativa                      |
| [Firebase](#firebase)                                                                                           | P2        | Alternativa                      |
| [Convex](#convex)                                                                                               | P2        | Alternativa                      |
| [tRPC](#trpc)                                                                                                   | P2        | Alternativa                      |
| [Stripe payment processing](#stripe-payment-processing)                                                         | P0        | Opción principal                 |
| [Paddle Merchant of Record](#paddle-merchant-of-record)                                                         | P0        | Alternativa                      |
| [Polar Merchant of Record](#polar-merchant-of-record)                                                           | P0        | Alternativa                      |
| [Lemon Squeezy](#lemon-squeezy)                                                                                 | P2        | Alternativa                      |
| [Amazon S3 / Cloudflare R2 storage](#amazon-s3--cloudflare-r2-storage)                                          | P1        | Opción principal                 |
| [Supabase Storage](#supabase-storage)                                                                           | P1        | Alternativa                      |
| [Cloudinary media](#cloudinary-media)                                                                           | P1        | Opción especializada             |
| [UploadThing](#uploadthing)                                                                                     | P2        | Alternativa                      |
| [Resend with React Email](#resend-with-react-email)                                                             | P1        | Opción principal                 |
| [Postmark / SendGrid / Amazon SES](#postmark--sendgrid--amazon-ses)                                             | P1        | Alternativa                      |
| [Sentry](#sentry)                                                                                               | P1        | Opción principal                 |
| [PostHog](#posthog)                                                                                             | P1        | Opción principal                 |
| [Vercel Web Analytics](#vercel-web-analytics)                                                                   | P2        | Opción especializada             |
| [Knock / Novu notifications](#knock--novu-notifications)                                                        | P2        | Opción especializada             |
| [Inngest / Trigger.dev jobs](#inngest--triggerdev-jobs)                                                         | P2        | Opción especializada             |
| [Supabase Realtime / Ably / Pusher](#supabase-realtime--ably--pusher)                                           | P2        | Opción especializada             |
| [Liveblocks collaboration](#liveblocks-collaboration)                                                           | P2        | Opción especializada             |
| [Tiptap editor](#tiptap-editor)                                                                                 | P2        | Opción principal                 |
| [Lexical editor](#lexical-editor)                                                                               | P2        | Alternativa                      |
| [BlockNote editor](#blocknote-editor)                                                                           | P2        | Opción especializada             |
| [Algolia search](#algolia-search)                                                                               | P2        | Opción principal                 |
| [Meilisearch / Typesense search](#meilisearch--typesense-search)                                                | P2        | Alternativa                      |
| [MapLibre and optional Google Maps](#maplibre-and-optional-google-maps)                                         | P2        | Referencia / capacidad existente |
| [Mapbox GL JS](#mapbox-gl-js)                                                                                   | P2        | Alternativa                      |
| [AI SDK 7 with React hooks](#ai-sdk-7-with-react-hooks)                                                         | P0        | Opción principal                 |
| [OpenAI Responses](#openai-responses)                                                                           | P0        | Opción principal                 |
| [Anthropic Messages](#anthropic-messages)                                                                       | P0        | Alternativa                      |
| [Google Gemini / Gen AI SDK](#google-gemini--gen-ai-sdk)                                                        | P0        | Alternativa                      |
| [Cloudflare AI Gateway / Vercel AI Gateway / OpenRouter](#cloudflare-ai-gateway--vercel-ai-gateway--openrouter) | P2        | Opción especializada             |
| [Postgres pgvector retrieval](#postgres-pgvector-retrieval)                                                     | P1        | Opción principal                 |
| [Pinecone / Qdrant retrieval](#pinecone--qdrant-retrieval)                                                      | P2        | Alternativa                      |
| [Langfuse](#langfuse)                                                                                           | P1        | Opción principal                 |
| [LangSmith / Helicone](#langsmith--helicone)                                                                    | P2        | Alternativa                      |
| [Model Context Protocol](#model-context-protocol)                                                               | P2        | Opción especializada             |
| [Cloudflare Agents SDK](#cloudflare-agents-sdk)                                                                 | P2        | Opción especializada             |
| [LangGraph with LangChain core](#langgraph-with-langchain-core)                                                 | P2        | Opción especializada             |
| [OpenAI Agents SDK for TypeScript](#openai-agents-sdk-for-typescript)                                           | P2        | Opción especializada             |
| [Slack](#slack)                                                                                                 | P1        | Opción principal                 |
| [GitHub Apps](#github-apps)                                                                                     | P1        | Opción principal                 |
| [Google Drive with Picker](#google-drive-with-picker)                                                           | P1        | Opción principal                 |
| [Google Calendar](#google-calendar)                                                                             | P2        | Opción especializada             |
| [Notion](#notion)                                                                                               | P1        | Opción principal                 |
| [Microsoft 365 / Microsoft Graph](#microsoft-365--microsoft-graph)                                              | P2        | Opción especializada             |
| [Linear](#linear)                                                                                               | P2        | Opción especializada             |
| [Atlassian Jira Cloud](#atlassian-jira-cloud)                                                                   | P2        | Opción especializada             |
| [HubSpot CRM](#hubspot-crm)                                                                                     | P2        | Opción especializada             |
| [Zendesk](#zendesk)                                                                                             | P2        | Opción especializada             |
| [Salesforce](#salesforce)                                                                                       | P2        | Opción especializada             |
| [Nango / Pipedream Connect](#nango--pipedream-connect)                                                          | P2        | Opción especializada             |
| [Composio](#composio)                                                                                           | P2        | Opción especializada             |
| [n8n predefined backend workflows](#n8n-predefined-backend-workflows)                                           | P2        | Opción especializada             |
| [Make / Zapier](#make--zapier)                                                                                  | P2        | Alternativa                      |

## TanStack Query

**P0 · Opción principal · Esfuerzo pequeño.**

Caché cliente y ciclo de consultas/mutaciones sobre la API del consumidor; distinto de TanStack Table.

**Aureform hoy:** DataTable ya admite consultas controladas y filtrado, ordenación y paginación externos; los registros usan estado local de demostración.

**Interfaz propuesta:**

- Completar una receta opcional que conecte query/onQueryChange y el modo externo de DataTable con consultas autenticadas.
- Conservar carga, vacío, error, reintento, cancelación y cambio de espacio de trabajo.

**Runtime:** Cliente de navegador; las operaciones privilegiadas requieren backend consumidor cuando corresponda. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** Los controles existentes requieren una receta de proveedor, no otra API pública de tablas. Delimitar la caché por identidad/espacio; la caché no autoriza registros.

**Evidencia npm — instalaciones de SDK:**

- [`@tanstack/react-query@5.104.5`](https://registry.npmjs.org/%40tanstack%2Freact-query/5.104.5): [40.112.338](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40tanstack%2Freact-query) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://tanstack.com/query/latest/docs/framework/react/overview) · [Referencia oficial 2](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries)

## Supabase application data

**P0 · Opción principal · Esfuerzo medio.**

Datos de aplicación en Postgres mediante la API cliente de Supabase; elegir Auth, Storage y Realtime por separado.

**Aureform hoy:** DataTable ya admite consultas controladas y filtrado, ordenación y paginación externos; los registros usan estado local de demostración.

**Interfaz propuesta:**

- Completar una receta de tablas controladas con filtrado, mutaciones y políticas de tenant autoritativos.
- Mostrar carga, acceso denegado, conflictos y actualización con los componentes existentes.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** El acceso desde navegador exige RLS e identidad autenticada correctos. Las operaciones privilegiadas quedan en el backend. Las descargas de supabase-js abarcan varios servicios y no miden usuarios del BaaS.

**Evidencia npm — instalaciones de SDK:**

- [`@supabase/supabase-js@2.118.0`](https://registry.npmjs.org/%40supabase%2Fsupabase-js/2.118.0): [20.655.219](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40supabase%2Fsupabase-js) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Referencia oficial 2](https://supabase.com/docs/reference/javascript/introduction)

## Better Auth

**P0 · Opción principal · Esfuerzo medio.**

Framework de autenticación para equipos que operan su servidor de aplicación y base de datos.

**Aureform hoy:** AuthAdapter.signInWithProvider y los callbacks sociales inyectables ya existen; email, recuperación, OTP y sesiones sociales siguen siendo demostraciones.

**Interfaz propuesta:**

- Completar una receta de AuthAdapter/callback con inicio social y ciclo de sesión del consumidor.
- Documentar flujos completos de email, recuperación y verificación, y ajustes de organizaciones/sesiones.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** La demo estática no aporta servidor de autenticación, cookies ni base de datos. Elegir esta ruta con servidor propio o una alternativa gestionada; no combinar todos los proveedores. Completar el callback no prueba autenticación.

**Evidencia npm — instalaciones de SDK:**

- [`better-auth@1.7.12`](https://registry.npmjs.org/better-auth/1.7.12): [7.801.856](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/better-auth) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://better-auth.com/docs/integrations/next) · [Referencia oficial 2](https://better-auth.com/docs/plugins/organization) · [Referencia oficial 3](https://authjs.dev/)

## Clerk

**P0 · Alternativa · Esfuerzo medio.**

Alternativa de identidad gestionada frente a un framework con servidor propio.

**Aureform hoy:** AuthAdapter.signInWithProvider y los callbacks sociales inyectables ya existen; email, recuperación, OTP y sesiones sociales siguen siendo demostraciones.

**Interfaz propuesta:**

- Completar una receta que conserve la presentación de acceso de Aureform y conecte la identidad de Clerk.
- Añadir ajustes de organizaciones, invitaciones y sesiones respaldados por el consumidor cuando se necesiten.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** La receta de servidor Next.js exige despliegue y autorización del consumidor; no afirmar que su middleware/callback funciona en una exportación estática. Los rangos de pares declarados no constituyen una prueba en Aureform.

**Evidencia npm — instalaciones de SDK:**

- [`@clerk/nextjs@7.9.17`](https://registry.npmjs.org/%40clerk%2Fnextjs/7.9.17): [1.724.508](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40clerk%2Fnextjs) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://clerk.com/docs/nextjs/getting-started/quickstart)

## Supabase Auth

**P0 · Alternativa · Esfuerzo medio.**

Elección de identidad cuando Supabase es el BaaS elegido; acceso en navegador y cookies opcionales del servidor tienen roles distintos.

**Aureform hoy:** AuthAdapter.signInWithProvider y los callbacks sociales inyectables ya existen; email, recuperación, OTP y sesiones sociales siguen siendo demostraciones.

**Interfaz propuesta:**

- Completar la receta del callback social existente con acceso y estado de sesión autenticada de Supabase.
- Documentar contraseña, recuperación y verificación completas y su relación con RLS.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Supabase Auth depende de elegir ese BaaS; no es una capa adicional junto a todos los proveedores. La actualización de cookies SSR corresponde al servidor consumidor; separar recetas de navegador y SSR. El SDK general no permite medir adopción específica de Auth.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@supabase/ssr@0.12.7`](https://registry.npmjs.org/%40supabase%2Fssr/0.12.7): [6.424.184](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40supabase%2Fssr) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@supabase/supabase-js@2.118.0`](https://registry.npmjs.org/%40supabase%2Fsupabase-js/2.118.0): [20.655.219](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40supabase%2Fsupabase-js) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://supabase.com/docs/guides/auth) · [Referencia oficial 2](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)

## Auth.js / NextAuth

**P2 · Referencia / capacidad existente · Esfuerzo medio.**

Referencia de migración y aplicaciones existentes con NextAuth.

**Aureform hoy:** AuthAdapter.signInWithProvider y los callbacks sociales inyectables ya existen; email, recuperación, OTP y sesiones sociales siguen siendo demostraciones.

**Interfaz propuesta:**

- Documentar cómo conectar una sesión existente del consumidor con los callbacks actuales.
- Aportar contexto de migración sin convertir NextAuth en la opción predeterminada para proyectos nuevos.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** ISC. **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** Auth.js se unió a Better Auth en 2025. Continúa el mantenimiento de seguridad; la orientación oficial favorece Better Auth para proyectos nuevos salvo excepciones. Un cambio organizativo no implica por sí solo deprecación; comprobar versión y canal npm.

**Evidencia npm — instalaciones de SDK:**

- [`next-auth@4.24.15`](https://registry.npmjs.org/next-auth/4.24.15): [3.991.213](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/next-auth) descargas, 12–18 de octubre; licencia SDK declarada: ISC.

**Referencias primarias:** [Referencia oficial 1](https://authjs.dev/) · [Referencia oficial 2](https://github.com/nextauthjs/next-auth)

## WorkOS AuthKit / Auth0

**P2 · Opción especializada · Esfuerzo grande.**

Recetas alternativas de identidad empresarial para SSO y gobierno de organizaciones; elegir un proveedor.

**Aureform hoy:** AuthAdapter.signInWithProvider y los callbacks sociales inyectables ya existen; email, recuperación, OTP y sesiones sociales siguen siendo demostraciones.

**Interfaz propuesta:**

- Completar los callbacks de identidad del consumidor y mostrar estado de organizaciones/dominios.
- Mostrar invitaciones, sesiones y aprobación administrativa para el flujo empresarial elegido.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Los SDK de servidor Next.js no equivalen a recetas SPA puramente estáticas. Siguen siendo necesarios callbacks, sesiones seguras y políticas de acceso del consumidor. Las funciones empresariales dependen de configuración y condiciones comerciales.

**Evidencia npm — instalaciones de SDK:**

- [`@workos-inc/authkit-nextjs@4.4.0`](https://registry.npmjs.org/%40workos-inc%2Fauthkit-nextjs/4.4.0): [538.814](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40workos-inc%2Fauthkit-nextjs) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@auth0/nextjs-auth0@4.32.1`](https://registry.npmjs.org/%40auth0%2Fnextjs-auth0/4.32.1): [614.254](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40auth0%2Fnextjs-auth0) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://workos.com/docs/authkit/nextjs) · [Referencia oficial 2](https://auth0.com/docs/quickstart/webapp/nextjs)

## SWR

**P2 · Alternativa · Esfuerzo pequeño.**

Alternativa de consultas/caché cliente para equipos que prefieren SWR frente a TanStack Query.

**Aureform hoy:** DataTable ya admite consultas controladas y filtrado, ordenación y paginación externos; los registros usan estado local de demostración.

**Interfaz propuesta:**

- Completar una receta sobre las entradas de tabla controlada y las consultas del consumidor.
- Conectar revalidación y mutaciones con los controles actuales de carga, error y reintento.

**Runtime:** Cliente de navegador; las operaciones privilegiadas requieren backend consumidor cuando corresponda. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** Elegir una estrategia de caché por flujo. Claves e invalidación deben seguir los cambios de espacio; SWR no aporta la API ni la autorización de aplicación.

**Evidencia npm — instalaciones de SDK:**

- [`swr@2.5.1`](https://registry.npmjs.org/swr/2.5.1): [11.391.409](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/swr) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://swr.vercel.app/docs/getting-started) · [Referencia oficial 2](https://swr.vercel.app/docs/mutation)

## Neon with Drizzle ORM

**P2 · Alternativa · Esfuerzo medio.**

Receta Postgres del servidor consumidor: Neon aporta base de datos/driver; Drizzle aporta acceso SQL tipado.

**Aureform hoy:** DataTable ya admite consultas controladas y filtrado, ordenación y paginación externos; los registros usan estado local de demostración.

**Interfaz propuesta:**

- Conectar las tablas y editores existentes mediante una API autenticada del consumidor.
- Devolver resultados validados en servidor y estados útiles de conflicto/reintento.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (Neon driver); Apache-2.0 (Drizzle ORM). **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Son roles de servidor complementarios, no dos BaaS competidores. No incluir credenciales de base de datos en navegador. El consumidor debe validar conexiones, runtime y migraciones; una adquisición no establece deprecación.

**Evidencia npm — instalaciones de SDK:**

- [`@neondatabase/serverless@1.2.0`](https://registry.npmjs.org/%40neondatabase%2Fserverless/1.2.0): [2.955.828](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40neondatabase%2Fserverless) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`drizzle-orm@0.45.4`](https://registry.npmjs.org/drizzle-orm/0.45.4): [18.338.838](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/drizzle-orm) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://neon.com/docs/serverless/serverless-driver) · [Referencia oficial 2](https://orm.drizzle.team/docs/tutorials/drizzle-with-neon)

## Prisma ORM

**P2 · Alternativa · Esfuerzo medio.**

Alternativa ORM basada en esquemas para el backend consumidor, distinta del alojamiento gestionado de bases de datos.

**Aureform hoy:** DataTable ya admite consultas controladas y filtrado, ordenación y paginación externos; los registros usan estado local de demostración.

**Interfaz propuesta:**

- Documentar una receta de API del consumidor para tablas y editores existentes.
- Mostrar validación y conflictos de mutaciones autorizadas en servidor.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0. **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** Los requisitos de adaptadores y generación de Prisma 7 deben corresponder al runtime elegido. No inferir tamaño de despliegue ni mejoras de arranque sin mediciones. El navegador sigue consumiendo una API.

**Evidencia npm — instalaciones de SDK:**

- [`@prisma/client@7.10.1`](https://registry.npmjs.org/%40prisma%2Fclient/7.10.1): [11.124.022](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40prisma%2Fclient) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers)

## Firebase

**P2 · Alternativa · Esfuerzo medio.**

Alternativa gestionada de datos/autenticación con su propio modelo documental y reglas de seguridad.

**Aureform hoy:** DataTable ya admite consultas controladas y filtrado, ordenación y paginación externos; los registros usan estado local de demostración.

**Interfaz propuesta:**

- Documentar una receta de consultas/mutaciones Firestore adaptada a los controles de tabla actuales.
- Mostrar acceso denegado, desconexión y sincronización con la interfaz existente.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** La paginación, el filtrado y las reglas de Firestore no reproducen SQL/RLS automáticamente. Las operaciones administrativas quedan en el backend. Las descargas del SDK incluyen usos ajenos a este rol web.

**Evidencia npm — instalaciones de SDK:**

- [`firebase@13.0.0`](https://registry.npmjs.org/firebase/13.0.0): [6.174.971](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/firebase) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://firebase.google.com/docs/web/setup) · [Referencia oficial 2](https://firebase.google.com/docs/firestore/security/get-started)

## Convex

**P2 · Alternativa · Esfuerzo medio.**

Backend reactivo con suscripciones de navegador y funciones autenticadas definidas por el consumidor.

**Aureform hoy:** DataTable ya admite consultas controladas y filtrado, ordenación y paginación externos; los registros usan estado local de demostración.

**Interfaz propuesta:**

- Completar una receta reactiva de tablas/editores con funciones de consulta y mutación del consumidor.
- Mantener explícitos espera de autenticación, vacío y fallo de mutación.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0 (convex package). **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Las funciones del backend deben autorizar acceso por tenant. Es una arquitectura de datos alternativa, no un complemento automático de caché/backend. La licencia del SDK no determina la de todos los componentes backend/Enterprise.

**Evidencia npm — instalaciones de SDK:**

- [`convex@1.47.0`](https://registry.npmjs.org/convex/1.47.0): [1.069.594](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/convex) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://docs.convex.dev/quickstart/nextjs) · [Referencia oficial 2](https://docs.convex.dev/auth/overview)

## tRPC

**P2 · Alternativa · Esfuerzo medio.**

Receta RPC tipada para backends TypeScript; cliente, router de servidor y puente Query tienen roles distintos.

**Aureform hoy:** DataTable ya admite consultas controladas y filtrado, ordenación y paginación externos; los registros usan estado local de demostración.

**Interfaz propuesta:**

- Documentar una receta opcional de API TypeScript que alimente los controles de tabla/consulta existentes.
- Reutilizar presentaciones de validación, mutación y error.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** Exige router TypeScript y autorización del consumidor; no es la opción predeterminada para backends REST ajenos. Estos SDK no se observaron en la ventana fija de descargas npm.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- `@trpc/client`: fuera de la muestra seleccionada de 70 paquetes.
- `@trpc/server`: fuera de la muestra seleccionada de 70 paquetes.
- `@trpc/tanstack-react-query`: fuera de la muestra seleccionada de 70 paquetes.

**Referencias primarias:** [Referencia oficial 1](https://trpc.io/docs/client/tanstack-react-query/setup)

## Stripe payment processing

**P0 · Opción principal · Esfuerzo medio.**

Receta PSP para el comercio existente: stripe se ejecuta en servidor; stripe-js es interfaz de pago opcional y no se necesita para redirecciones alojadas.

**Aureform hoy:** Ya existen CommerceAdapter, comercio simulado compartido y transporte Stripe tipado de navegador a backend consumidor; no hay procesamiento real de pagos.

**Interfaz propuesta:**

- Completar el transporte existente con endpoints autorizados de productos/precios, Checkout, facturación y portal.
- Actualizar pedidos y suscripciones desde eventos verificados y procesados con idempotencia.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** El transporte admite rutas API del mismo origen y redirecciones HTTPS Stripe permitidas. Totales del navegador y URLs de retorno no prueban pago. Separar responsabilidades PSP de las condiciones MoR de Paddle/Polar; falta completar backend y webhooks.

**Evidencia npm — instalaciones de SDK:**

- [`stripe@23.0.0`](https://registry.npmjs.org/stripe/23.0.0): [14.526.076](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/stripe) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@stripe/stripe-js@10.1.0`](https://registry.npmjs.org/%40stripe%2Fstripe-js/10.1.0): [8.389.460](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40stripe%2Fstripe-js) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://docs.stripe.com/checkout/quickstart) · [Referencia oficial 2](https://docs.stripe.com/customer-management/integrate-customer-portal) · [Referencia oficial 3](https://docs.stripe.com/webhooks)

## Paddle Merchant of Record

**P0 · Alternativa · Esfuerzo medio.**

Alternativa MoR: paddle-js controla el checkout en navegador; el SDK Node y el estado autoritativo de suscripción pertenecen al backend consumidor.

**Aureform hoy:** Ya existen CommerceAdapter, comercio simulado compartido y transporte Stripe tipado de navegador a backend consumidor; no hay procesamiento real de pagos.

**Interfaz propuesta:**

- Documentar una receta Paddle con las presentaciones existentes de planes, facturas y pagos.
- Mostrar checkout pendiente, finalización verificada, cancelación y reconexión.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Elegir MoR cuando encajen elegibilidad de producto/país y responsabilidades comerciales. Eventos y checkout Paddle difieren de Stripe; su lista de redirecciones no se reutiliza sin cambios como adaptador Paddle. Sigue siendo necesaria la verificación de webhooks.

**Evidencia npm — instalaciones de SDK:**

- [`@paddle/paddle-js@1.6.5`](https://registry.npmjs.org/%40paddle%2Fpaddle-js/1.6.5): [122.976](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40paddle%2Fpaddle-js) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.
- [`@paddle/paddle-node-sdk@3.10.0`](https://registry.npmjs.org/%40paddle%2Fpaddle-node-sdk/3.10.0): [101.088](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40paddle%2Fpaddle-node-sdk) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://developer.paddle.com/paddle-js/) · [Referencia oficial 2](https://developer.paddle.com/webhooks/)

## Polar Merchant of Record

**P0 · Alternativa · Esfuerzo medio.**

Alternativa MoR con llamadas API del servidor consumidor y flujos de checkout/estado de cliente alojados.

**Aureform hoy:** Ya existen CommerceAdapter, comercio simulado compartido y transporte Stripe tipado de navegador a backend consumidor; no hay procesamiento real de pagos.

**Interfaz propuesta:**

- Documentar una receta Polar que conecte estado de cliente y derechos con la interfaz de facturación existente.
- Conservar estados pendiente, fallido y confirmado por servidor.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Usar orientación vigente de SDK/versión API y relaciones de cliente controladas por el consumidor. El transporte Stripe no es una integración Polar existente. Elegibilidad MoR, productos y semántica de derechos/webhooks requieren revisión específica.

**Evidencia npm — instalaciones de SDK:**

- [`@polar-sh/sdk@1.0.2`](https://registry.npmjs.org/%40polar-sh%2Fsdk/1.0.2): [204.424](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40polar-sh%2Fsdk) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://polar.sh/docs/integrate/sdk/typescript) · [Referencia oficial 2](https://polar.sh/docs/merchant-of-record/introduction)

## Lemon Squeezy

**P2 · Alternativa · Esfuerzo medio.**

Opción MoR adicional para consumidores que ya usan su checkout, suscripciones o modelo de productos digitales.

**Aureform hoy:** Ya existen CommerceAdapter, comercio simulado compartido y transporte Stripe tipado de navegador a backend consumidor; no hay procesamiento real de pagos.

**Interfaz propuesta:**

- Documentar cómo representar el estado del proveedor en las pantallas de facturación existentes.
- Exponer checkout/portal alojados mediante una receta específica del consumidor.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** La adquisición de un proveedor no implica deprecación. Comprobar elegibilidad y encaje actuales sin inferir crecimiento. SDK y webhooks firmados quedan en servidor; elegir esta opción exige adaptar deliberadamente las reglas de redirección Stripe.

**Evidencia npm — instalaciones de SDK:**

- [`@lemonsqueezy/lemonsqueezy.js@4.0.0`](https://registry.npmjs.org/%40lemonsqueezy%2Flemonsqueezy.js/4.0.0): [77.657](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40lemonsqueezy%2Flemonsqueezy.js) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://docs.lemonsqueezy.com/guides/developer-guide) · [Referencia oficial 2](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks)

## Amazon S3 / Cloudflare R2 storage

**P1 · Opción principal · Esfuerzo medio.**

Receta de objetos: el backend autoriza y firma subidas; el navegador carga mediante URLs temporales sin SDK de servidor.

**Aureform hoy:** Ya existen selección y edición local de archivos/imágenes y persistencia de demostración; el almacenamiento alojado autorizado corresponde al consumidor.

**Interfaz propuesta:**

- Completar subida alojada, progreso y reintento con los controles existentes de archivos e imágenes.
- Devolver metadatos autorizados y separar adjuntos privados de imágenes públicas de comercio.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** El consumidor debe gestionar CORS, propiedad de objetos, validación y caducidad. Las API compatibles con S3 no son idénticas. El cliente AWS observado es un proxy general de SDK, no una medición de adopción R2.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@aws-sdk/client-s3@3.1153.0`](https://registry.npmjs.org/%40aws-sdk%2Fclient-s3/3.1153.0): [29.254.399](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40aws-sdk%2Fclient-s3) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) · [Referencia oficial 2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

## Supabase Storage

**P1 · Alternativa · Esfuerzo medio.**

Elección de almacenamiento para una aplicación Supabase, con operaciones autenticadas de navegador y políticas de objetos del consumidor.

**Aureform hoy:** Ya existen selección y edición local de archivos/imágenes y persistencia de demostración; el almacenamiento alojado autorizado corresponde al consumidor.

**Interfaz propuesta:**

- Completar una receta de buckets/políticas para subidas y descargas existentes.
- Mostrar rechazo, enlace caducado y recuperación sin perder ediciones locales.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Buckets públicos, objetos privados y operaciones privilegiadas requieren políticas diferentes. storage-js puede llegar mediante supabase-js; no sumar sus descargas ni interpretarlas como usuarios distintos de almacenamiento.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@supabase/storage-js@2.118.0`](https://registry.npmjs.org/%40supabase%2Fstorage-js/2.118.0): [20.854.850](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40supabase%2Fstorage-js) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://supabase.com/docs/guides/storage) · [Referencia oficial 2](https://supabase.com/docs/guides/storage/security/access-control)

## Cloudinary media

**P1 · Opción especializada · Esfuerzo medio.**

Alternativa alojada de subida/transformación multimedia; el paquete cloudinary observado es SDK de servidor, distinto de subida/entrega en navegador.

**Aureform hoy:** Ya existen selección y edición local de archivos/imágenes y persistencia de demostración; el almacenamiento alojado autorizado corresponde al consumidor.

**Interfaz propuesta:**

- Completar recetas de subida firmada y entrega alrededor de recorte, orden y texto alternativo existentes.
- Mostrar procesamiento de subida y errores multimedia recuperables.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** No presentar la edición local existente como funcionalidad nueva. Firma y transformaciones privilegiadas corresponden al backend; definir propiedad, moderación y entrega para los archivos del consumidor.

**Evidencia npm — instalaciones de SDK:**

- [`cloudinary@2.11.0`](https://registry.npmjs.org/cloudinary/2.11.0): [558.201](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/cloudinary) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://cloudinary.com/documentation/upload_images)

## UploadThing

**P2 · Alternativa · Esfuerzo medio.**

Alternativa gestionada de subida: autorización/rutas de servidor y helpers React opcionales tienen responsabilidades distintas.

**Aureform hoy:** Ya existen selección y edición local de archivos/imágenes y persistencia de demostración; el almacenamiento alojado autorizado corresponde al consumidor.

**Interfaz propuesta:**

- Documentar una receta opcional de subida con selección y reintento existentes.
- Conectar resultados de subida autorizada con los registros actuales de archivos/productos.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** La configuración App Router exige rutas de servidor consumidor o backend externo adecuado. Los helpers de navegador no aportan autorización ni propiedad duradera; adaptar la receta sin asumir endpoints de subida en la demo estática.

**Evidencia npm — instalaciones de SDK:**

- [`uploadthing@7.7.4`](https://registry.npmjs.org/uploadthing/7.7.4): [116.430](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/uploadthing) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@uploadthing/react@7.3.3`](https://registry.npmjs.org/%40uploadthing%2Freact/7.3.3): [85.946](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40uploadthing%2Freact) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://docs.uploadthing.com/getting-started/appdir)

## Resend with React Email

**P1 · Opción principal · Esfuerzo medio.**

Entrega transaccional desde servidor mediante Resend; React Email renderiza plantillas en compilación/servidor y no es proveedor de entrega.

**Aureform hoy:** Las pantallas de correo e integración Email contienen interacciones locales; no se aporta un emisor transaccional.

**Interfaz propuesta:**

- Completar una receta de vista previa y envío para invitaciones, recuperación o facturas.
- Mostrar en cola, enviado, rechazado y rebotado desde eventos del proveedor.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Los metadatos observados de @react-email/components 1.0.12 incluyen aviso de deprecación; verificar imports/migración de React Email antes de publicar la receta. No prueba discontinuación de Resend ni de React Email como producto. Validación de remitente/dominio y entregabilidad corresponden al consumidor.

**Evidencia npm — instalaciones de SDK:**

- [`resend@6.34.1`](https://registry.npmjs.org/resend/6.34.1): [8.132.768](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/resend) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@react-email/components@1.0.12`](https://registry.npmjs.org/%40react-email%2Fcomponents/1.0.12): [4.390.731](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40react-email%2Fcomponents) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://resend.com/docs/send-with-nextjs) · [Referencia oficial 2](https://react.email/docs/introduction) · [Referencia oficial 3](https://registry.npmjs.org/%40react-email%2Fcomponents/1.0.12)

## Postmark / SendGrid / Amazon SES

**P1 · Alternativa · Esfuerzo medio.**

Elegir un emisor transaccional alternativo: Postmark es la alternativa priorizada; SendGrid y SES encajan con una plataforma existente o AWS.

**Aureform hoy:** Ya existen interfaz Email y mensajes locales; no se aporta configuración de dominios, credenciales productivas ni receptor de eventos.

**Interfaz propuesta:**

- Completar una receta de envío con la misma presentación de plantillas y estado de entrega.
- Mostrar fallos recuperables de entrega y estado de dominio/configuración.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (Postmark/SendGrid); Apache-2.0 (SES client). **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Estos SDK de servidor son alternativas, no un paquete obligatorio ni un ranking. Es necesario mapear eventos, remitentes, supresión, reintentos e idempotencia por proveedor; no se afirman cuotas fijas ni ventajas de entregabilidad.

**Evidencia npm — instalaciones de SDK:**

- [`postmark@5.1.0`](https://registry.npmjs.org/postmark/5.1.0): [642.418](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/postmark) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@sendgrid/mail@8.1.6`](https://registry.npmjs.org/%40sendgrid%2Fmail/8.1.6): [2.559.309](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40sendgrid%2Fmail) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@aws-sdk/client-ses@3.1153.0`](https://registry.npmjs.org/%40aws-sdk%2Fclient-ses/3.1153.0): [2.280.674](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40aws-sdk%2Fclient-ses) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://postmarkapp.com/developer) · [Referencia oficial 2](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/quickstart-nodejs) · [Referencia oficial 3](https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html)

## Sentry

**P1 · Opción principal · Esfuerzo medio.**

Registro de errores/rendimiento JavaScript para navegador y servidor Next.js consumidor.

**Aureform hoy:** Ya existen errores recuperables y controles de reintento; package.json no incluye integración Sentry.

**Interfaz propuesta:**

- Documentar instrumentación opcional y conectar errores existentes con una referencia de informe.
- Conservar acciones de recuperación y permitir configuración de consentimiento/ocultación de datos.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (JavaScript SDK). **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** La licencia del SDK JavaScript es distinta de las condiciones FSL de servidor/CLI Sentry; no llamar MIT a toda la plataforma. El consumidor gestiona mapas de código y ocultación de datos. Los archivos estáticos no aportan instrumentación de servidor.

**Evidencia npm — instalaciones de SDK:**

- [`@sentry/nextjs@11.8.0`](https://registry.npmjs.org/%40sentry%2Fnextjs/11.8.0): [7.173.701](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40sentry%2Fnextjs) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://docs.sentry.io/platforms/javascript/guides/nextjs/) · [Referencia oficial 2](https://github.com/getsentry/sentry-javascript/blob/develop/LICENSE)

## PostHog

**P1 · Opción principal · Esfuerzo medio.**

Instrumentación opcional de analítica de producto, flags y reproducción, separada del seguimiento de errores.

**Aureform hoy:** La línea base no incluye posthog-js ni servicio de recopilación configurado.

**Interfaz propuesta:**

- Documentar recetas explícitamente opcionales de eventos/flags para flujos existentes.
- Mostrar consentimiento/preferencias y estados de respaldo de flags.

**Runtime:** Cliente de navegador; las operaciones privilegiadas requieren backend consumidor cuando corresponda. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** (Apache-2.0 AND MIT). **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Evitar recopilar por defecto contenido privado de formularios, adjuntos o modelos. Los flags orientan presentación, no autorización. Licencia y volumen de SDK no establecen precios del servicio ni usuarios únicos.

**Evidencia npm — instalaciones de SDK:**

- [`posthog-js@1.438.12`](https://registry.npmjs.org/posthog-js/1.438.12): [10.131.121](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/posthog-js) descargas, 12–18 de octubre; licencia SDK declarada: (Apache-2.0 AND MIT).

**Referencias primarias:** [Referencia oficial 1](https://posthog.com/docs/libraries/next-js)

## Vercel Web Analytics

**P2 · Opción especializada · Esfuerzo pequeño.**

Alternativa gestionada de analítica web para consumidores que eligen su configuración de recopilación/despliegue.

**Aureform hoy:** El frontend público usa exportación estática; Vercel Analytics no es dependencia de la línea base.

**Interfaz propuesta:**

- Documentar una receta opcional de recopilación específica del despliegue.
- Reutilizar consentimiento/preferencias cuando lo exija la política del consumidor.

**Runtime:** Cliente de navegador; las operaciones privilegiadas requieren backend consumidor cuando corresponda. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Instalar el SDK no establece por sí solo un endpoint de analítica funcional en Cloudflare Workers Static Assets. Verificar alojamiento/servicio elegidos; las instalaciones npm no son comparables con clientes de analítica.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@vercel/analytics@2.0.1`](https://registry.npmjs.org/%40vercel%2Fanalytics/2.0.1): [5.088.223](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40vercel%2Fanalytics) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://vercel.com/docs/analytics/quickstart)

## Knock / Novu notifications

**P2 · Opción especializada · Esfuerzo medio.**

Recetas alternativas de bandeja/preferencias y orquestación; los SDK React muestran el feed y el backend dispara la entrega.

**Aureform hoy:** Las interacciones existentes de notificaciones, correo y ajustes usan estado demo; no hay servicio conectado.

**Interfaz propuesta:**

- Completar una receta opcional de bandeja/no leído/preferencias con identidad autenticada del suscriptor.
- Mostrar leído, fallo de entrega y reconexión con componentes Aureform.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (Knock); ISC (@novu/react 3.19.2 metadata). **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Elegir un proveedor de orquestación. Knock es gestionado; el repositorio Novu mezcla componentes abiertos/Enterprise y autoalojamiento opcional. No inferir una licencia uniforme desde un paquete React. Siguen siendo necesarios autorización y disparadores del backend.

**Evidencia npm — instalaciones de SDK:**

- [`@knocklabs/react@0.14.0`](https://registry.npmjs.org/%40knocklabs%2Freact/0.14.0): [245.355](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40knocklabs%2Freact) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@novu/react@3.19.2`](https://registry.npmjs.org/%40novu%2Freact/3.19.2): [111.828](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40novu%2Freact) descargas, 12–18 de octubre; licencia SDK declarada: ISC.

**Referencias primarias:** [Referencia oficial 1](https://docs.knock.app/in-app-ui/react/overview) · [Referencia oficial 2](https://docs.novu.co/platform/inbox) · [Referencia oficial 3](https://github.com/novuhq/novu)

## Inngest / Trigger.dev jobs

**P2 · Opción especializada · Esfuerzo grande.**

Runtimes alternativos del backend para trabajos duraderos y reintentos; la interfaz de estado de ejecución es una integración separada.

**Aureform hoy:** El frontend estático no aporta ejecutor ni transporte de estado del proveedor; las demostraciones asíncronas actuales son locales.

**Interfaz propuesta:**

- Proponer progreso, estado de pasos y controles de reintento/cancelación respaldados por el consumidor.
- Documentar suscripciones o consultas de estado autorizadas para subidas, sincronización e IA prolongadas.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0 (Inngest SDK); MIT (Trigger.dev SDK). **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** AbortSignal del frontend no garantiza cancelar un trabajo. El consumidor debe definir idempotencia, efectos, reintentos y autorización. Las licencias SDK difieren de términos de plataforma/alojamiento; no reutilizar afirmaciones de versiones principales antiguas.

**Evidencia npm — instalaciones de SDK:**

- [`inngest@4.25.0`](https://registry.npmjs.org/inngest/4.25.0): [1.366.095](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/inngest) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.
- [`@trigger.dev/sdk@4.7.5`](https://registry.npmjs.org/%40trigger.dev%2Fsdk/4.7.5): [719.542](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40trigger.dev%2Fsdk) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://www.inngest.com/docs) · [Referencia oficial 2](https://trigger.dev/docs/introduction)

## Supabase Realtime / Ably / Pusher

**P2 · Opción especializada · Esfuerzo medio.**

Transportes alternativos de eventos/presencia: preferir Supabase Realtime dentro de esa plataforma; Ably/Pusher son opciones gestionadas separadas.

**Aureform hoy:** Chat, avatares y actualizaciones usan estado local; no se aporta autorización de sockets/sesiones del proveedor.

**Interfaz propuesta:**

- Documentar una receta opcional de actualización/presencia sobre registros y avatares existentes.
- Mostrar reconexión/datos desactualizados y cerrar suscripciones al cambiar identidad/espacio.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (Supabase/Pusher); Apache-2.0 (Ably). **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Canales privados, ámbito por tenant y consistencia al reconectar requieren implementación del consumidor. Pub/sub no resuelve conflictos documentales. Ably/Pusher no están medidos en esta ventana y supabase-js no permite aislar adopción Realtime.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@supabase/supabase-js@2.118.0`](https://registry.npmjs.org/%40supabase%2Fsupabase-js/2.118.0): [20.655.219](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40supabase%2Fsupabase-js) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- `ably`: fuera de la muestra seleccionada de 70 paquetes.
- `pusher-js`: fuera de la muestra seleccionada de 70 paquetes.

**Referencias primarias:** [Referencia oficial 1](https://supabase.com/docs/guides/realtime) · [Referencia oficial 2](https://ably.com/docs) · [Referencia oficial 3](https://pusher.com/docs/channels/)

## Liveblocks collaboration

**P2 · Opción especializada · Esfuerzo grande.**

Presencia, comentarios y estado colaborativo por salas gestionadas, distinto de un transporte general de notificaciones.

**Aureform hoy:** La línea base contiene interfaz de estilo colaborativo local, pero no dependencia Liveblocks ni endpoint de autorización de salas.

**Interfaz propuesta:**

- Documentar una receta de autorización de salas con avatares y comentarios respaldados por el consumidor.
- Mostrar acceso denegado, reconexión y edición concurrente.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0 (current client/React package metadata). **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** La pertenencia a salas debe seguir la autorización de aplicación. La disponibilidad SDK no prueba comportamiento React 19.3.1 en Aureform; no hay observación de descargas Liveblocks en el conjunto fijo. Elegir persistencia y resolución de conflictos adecuadas.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- `@liveblocks/client`: fuera de la muestra seleccionada de 70 paquetes.
- `@liveblocks/react`: fuera de la muestra seleccionada de 70 paquetes.

**Referencias primarias:** [Referencia oficial 1](https://liveblocks.io/docs/get-started/nextjs)

## Tiptap editor

**P2 · Opción principal · Esfuerzo medio.**

Receta de editor de texto enriquecido para consumidores que necesitan documentos estructurados.

**Aureform hoy:** Ya existen entradas de texto y edición local; no se incluyen dependencias Tiptap, Lexical ni BlockNote.

**Interfaz propuesta:**

- Proponer barra Aureform, menú de bloques y editor estructurado opcionales.
- Documentar guardado, conflictos, errores y persistencia controlada por el consumidor.

**Runtime:** Cliente de navegador; las operaciones privilegiadas requieren backend consumidor cuando corresponda. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (editor core/React package). **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** Seguir la inicialización Next.js documentada, incluido immediatelyRender: false cuando corresponda. Validar/sanear contenido externo. La licencia del núcleo no incluye toda extensión Pro/cloud; la persistencia colaborativa exige servicio separado.

**Evidencia npm — instalaciones de SDK:**

- [`@tiptap/react@3.32.0`](https://registry.npmjs.org/%40tiptap%2Freact/3.32.0): [11.348.991](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40tiptap%2Freact) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://tiptap.dev/docs/editor/getting-started/install/nextjs)

## Lexical editor

**P2 · Alternativa · Esfuerzo medio.**

Framework alternativo de edición para equipos que necesitan control explícito de nodos, plugins y enlaces React.

**Aureform hoy:** Ya existen entradas de texto y edición local; no se incluyen dependencias Tiptap, Lexical ni BlockNote.

**Interfaz propuesta:**

- Proponer una receta opcional de editor/composición con controles de formato Aureform.
- Documentar serialización, recuperación y acciones de guardado del consumidor.

**Runtime:** Cliente de navegador; las operaciones privilegiadas requieren backend consumidor cuando corresponda. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** El paquete lexical observado es el núcleo; los enlaces React son otro paquete sin observación de descargas aquí. Barra, conversión de esquemas, validación y persistencia corresponden al consumidor; no hay editor ya conectado.

**Evidencia npm — instalaciones de SDK:**

- [`lexical@0.52.0`](https://registry.npmjs.org/lexical/0.52.0): [3.508.231](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/lexical) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- `@lexical/react`: fuera de la muestra seleccionada de 70 paquetes.

**Referencias primarias:** [Referencia oficial 1](https://lexical.dev/docs/intro) · [Referencia oficial 2](https://github.com/facebook/lexical)

## BlockNote editor

**P2 · Opción especializada · Esfuerzo medio.**

Opción de edición por bloques cuando su modelo documental y licencia encajan con el producto consumidor.

**Aureform hoy:** Ya existen entradas de texto y edición local; no se incluyen dependencias Tiptap, Lexical ni BlockNote.

**Interfaz propuesta:**

- Documentar editor opcional por bloques/comandos con estados de guardado y adjuntos.
- Separar recetas del núcleo de funciones XL opcionales de exportación/IA.

**Runtime:** Cliente de navegador; las operaciones privilegiadas requieren backend consumidor cuando corresponda. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MPL-2.0 (@blocknote/react 0.56.0). **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** El núcleo es MPL-2.0, no MIT. Los paquetes XL tienen licencia GPL-3.0/comercial separada; no llamar permisivas a todas las funciones. Revisar condiciones de modificación/distribución y persistencia sin asumir backend listo.

**Evidencia npm — instalaciones de SDK:**

- [`@blocknote/react@0.56.0`](https://registry.npmjs.org/%40blocknote%2Freact/0.56.0): [451.003](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40blocknote%2Freact) descargas, 12–18 de octubre; licencia SDK declarada: MPL-2.0.

**Referencias primarias:** [Referencia oficial 1](https://www.blocknotejs.org/docs) · [Referencia oficial 2](https://www.blocknotejs.org/legal/terms-and-conditions) · [Referencia oficial 3](https://www.blocknotejs.org/legal/blocknote-xl-commercial-license)

## Algolia search

**P2 · Opción principal · Esfuerzo medio.**

Receta de búsqueda indexada gestionada con consultas restringidas de navegador e indexación del backend.

**Aureform hoy:** Ya existen búsqueda de comandos, filtros y tablas controladas sobre datos demo; no hay índice de búsqueda conectado.

**Interfaz propuesta:**

- Completar una receta de búsqueda para la paleta existente y resultados con facetas opcionales.
- Conservar teclado, resultados vacíos y estados de error/reintento.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Las credenciales de búsqueda deben aplicar filtros por tenant; claves administrativas e indexación quedan en backend. Los ejemplos SSR React no prueban exportación estática en Aureform. No inferir usuarios del servicio desde instalaciones algoliasearch.

**Evidencia npm — instalaciones de SDK:**

- [`algoliasearch@5.60.0`](https://registry.npmjs.org/algoliasearch/5.60.0): [4.655.361](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/algoliasearch) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/react)

## Meilisearch / Typesense search

**P2 · Alternativa · Esfuerzo medio.**

Recetas alternativas de búsqueda: clientes JavaScript consultan un índice gestionado o propio; elegir un motor.

**Aureform hoy:** Ya existen búsqueda de comandos, filtros y tablas controladas sobre datos demo; no hay índice de búsqueda conectado.

**Interfaz propuesta:**

- Documentar una receta de motor para búsqueda de comandos y resultados con facetas.
- Mostrar frescura del índice, acceso denegado y fallos recuperables.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (Meilisearch JS); Apache-2.0 (Typesense JS). **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Las licencias SDK difieren de las del motor/Enterprise. Usar credenciales por tenant e ingesta/borrado controlados en servidor; los resultados no autorizan acceso. Estas alternativas no forman un paquete SDK acumulativo.

**Evidencia npm — instalaciones de SDK:**

- [`meilisearch@0.62.0`](https://registry.npmjs.org/meilisearch/0.62.0): [443.756](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/meilisearch) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`typesense@3.2.0`](https://registry.npmjs.org/typesense/3.2.0): [598.289](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/typesense) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://www.meilisearch.com/docs/getting_started/overview) · [Referencia oficial 2](https://typesense.org/docs/)

## MapLibre and optional Google Maps

**P2 · Referencia / capacidad existente · Esfuerzo pequeño.**

Capacidades de mapa existentes: MapLibre renderiza GeoJSON local; Google Maps ya se conecta opcionalmente con clave de navegador.

**Aureform hoy:** MapLibre 5.13.0 está instalado en la línea base; los metadatos observados son 6.15.0. RouteMap/MapsWorkspace y Google Maps opcional ya están entregados; el paquete cargador Google no es dependencia base.

**Interfaz propuesta:**

- Documentar recetas completas sobre props, datos, selección y respaldo de mapas existentes.
- Añadir teselas/geocodificación/rutas licenciadas solo cuando el consumidor elija esos servicios.

**Runtime:** Cliente de navegador; las operaciones privilegiadas requieren backend consumidor cuando corresponda. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** BSD-3-Clause (MapLibre); Apache-2.0 (Google loader package). **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** La versión del registro es evidencia de investigación, no recomendación de actualización. No describir mapas existentes como ausentes ni exigir otro cargador Google. Las claves requieren restricciones. La geometría local no calcula rutas reales; datos y términos son separados.

**Evidencia npm — instalaciones de SDK:**

- [`maplibre-gl@6.15.0`](https://registry.npmjs.org/maplibre-gl/6.15.0): [3.833.943](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/maplibre-gl) descargas, 12–18 de octubre; licencia SDK declarada: BSD-3-Clause.
- [`@googlemaps/js-api-loader@2.1.3`](https://registry.npmjs.org/%40googlemaps%2Fjs-api-loader/2.1.3): [3.520.586](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40googlemaps%2Fjs-api-loader) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://maplibre.org/maplibre-gl-js/docs/) · [Referencia oficial 2](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)

## Mapbox GL JS

**P2 · Alternativa · Esfuerzo medio.**

Alternativa comercial de mapas en navegador cuando el consumidor necesita servicios/estilos Mapbox.

**Aureform hoy:** Ya se aportan MapLibre y Google Maps opcional; Mapbox GL JS no es dependencia base.

**Interfaz propuesta:**

- Documentar una receta opcional de renderizado que conserve selección y errores actuales.
- Mostrar atribución de estilo/datos y comportamiento útil de respaldo.

**Runtime:** Cliente de navegador; las operaciones privilegiadas requieren backend consumidor cuando corresponda. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Mapbox GL JS proprietary license (SEE LICENSE IN LICENSE.txt). **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Revisar condiciones SDK/servicio y restricciones de tokens; no llamar BSD/MIT a mapbox-gl moderno ni equipararlo con MapLibre. No se asumen precios, permisos gratuitos ni ventajas de rendimiento.

**Evidencia npm — instalaciones de SDK:**

- [`mapbox-gl@3.33.0`](https://registry.npmjs.org/mapbox-gl/3.33.0): [2.387.306](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/mapbox-gl) descargas, 12–18 de octubre; licencia SDK declarada: SEE LICENSE IN LICENSE.txt.

**Referencias primarias:** [Referencia oficial 1](https://docs.mapbox.com/mapbox-gl-js/guides/)

## AI SDK 7 with React hooks

**P0 · Opción principal · Esfuerzo medio.**

Receta opcional de transporte/estado: ai aporta utilidades de modelos/streams en servidor; @ai-sdk/react aporta hooks de chat en navegador. Aureform conserva sus componentes visuales.

**Aureform hoy:** AIWorkspace ya transmite texto local determinista con detener, reintentar y adjuntos de texto; los mensajes usan cadenas content, no partes UIMessage del proveedor.

**Interfaz propuesta:**

- Completar una receta que conecte texto/cancelación/reintento existentes con UIMessage.parts y su protocolo.
- Proponer visualización de aprobación de herramientas, fuentes y resultados estructurados solo para eventos del backend autorizado.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0. **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** Se comprobaron ai 7.0.146 y @ai-sdk/react 4.0.150, con Node 22; el rango React declarado admite 19.3.1, pero no es prueba de ejecución. Streams de texto, proveedor nativo y mensajes UI requieren mapeo explícito. AI Elements de shadcn ofrece 21 patrones copiados con Base UI en octubre de 2026; la biblioteca anterior prevé deprecación a finales de noviembre, no eliminación ya realizada.

**Evidencia npm — instalaciones de SDK:**

- [`ai@7.0.146`](https://registry.npmjs.org/ai/7.0.146): [18.352.661](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/ai) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.
- [`@ai-sdk/react@4.0.150`](https://registry.npmjs.org/%40ai-sdk%2Freact/4.0.150): [5.664.731](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40ai-sdk%2Freact) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) · [Referencia oficial 2](https://registry.npmjs.org/ai/7.0.146) · [Referencia oficial 3](https://registry.npmjs.org/%40ai-sdk%2Freact/4.0.150) · [Referencia oficial 4](https://ui.shadcn.com/docs/changelog/2026-10-ai-elements) · [Referencia oficial 5](https://elements.ai-sdk.dev/components/sources)

## OpenAI Responses

**P0 · Opción principal · Esfuerzo medio.**

Receta de modelos del backend con Responses; elegir openai nativo o el adaptador opcional AI SDK.

**Aureform hoy:** AIWorkspace ya transmite texto local determinista con detener, reintentar y adjuntos de texto; los mensajes usan cadenas content, no partes UIMessage del proveedor.

**Interfaz propuesta:**

- Completar una receta de streaming del proveedor conservando detener/reintentar.
- Mostrar aprobaciones autorizadas, fuentes y metadatos de uso realmente devueltos cuando existan.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Assistants cerró el 2026-08-26; las recetas nuevas usan Responses. Chat Completions sigue disponible: el cierre no implica desaparición de toda API anterior. Los secretos quedan en servidor; los eventos nativos requieren mapeo al protocolo cliente. Las referencias de cita no prueban veracidad.

**Evidencia npm — instalaciones de SDK:**

- [`openai@7.39.0`](https://registry.npmjs.org/openai/7.39.0): [25.338.213](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/openai) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.
- [`@ai-sdk/openai@4.0.98`](https://registry.npmjs.org/%40ai-sdk%2Fopenai/4.0.98): [9.228.393](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40ai-sdk%2Fopenai) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://developers.openai.com/api/docs/guides/migrate-to-responses) · [Referencia oficial 2](https://github.com/openai/openai-node)

## Anthropic Messages

**P0 · Alternativa · Esfuerzo medio.**

Receta alternativa de modelos del backend mediante Messages nativo o adaptador AI SDK opcional.

**Aureform hoy:** AIWorkspace ya transmite texto local determinista con detener, reintentar y adjuntos de texto; los mensajes usan cadenas content, no partes UIMessage del proveedor.

**Interfaz propuesta:**

- Completar una receta de streaming/error/cancelación con la conversación existente.
- Proponer visualización de fuentes/citas y herramientas cuando las aporte el backend.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (native SDK); Apache-2.0 (AI SDK adapter). **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Los bloques y eventos difieren de cadenas content y partes AI SDK. El consumidor debe mapear capacidades y autorizar recuperación/acciones. Las citas identifican material referenciado; no certifican veracidad, permisos actuales ni evidencia completa.

**Evidencia npm — instalaciones de SDK:**

- [`@anthropic-ai/sdk@0.135.0`](https://registry.npmjs.org/%40anthropic-ai%2Fsdk/0.135.0): [28.258.993](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40anthropic-ai%2Fsdk) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@ai-sdk/anthropic@4.0.84`](https://registry.npmjs.org/%40ai-sdk%2Fanthropic/4.0.84): [8.947.087](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40ai-sdk%2Fanthropic) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://platform.claude.com/docs/en/api/messages/create) · [Referencia oficial 2](https://github.com/anthropics/anthropic-sdk-typescript)

## Google Gemini / Gen AI SDK

**P0 · Alternativa · Esfuerzo medio.**

Receta alternativa con @google/genai recomendado o adaptador AI SDK; @google/generative-ai se incluye solo como referencia de migración.

**Aureform hoy:** AIWorkspace ya transmite texto local determinista con detener, reintentar y adjuntos de texto; los mensajes usan cadenas content, no partes UIMessage del proveedor.

**Interfaz propuesta:**

- Completar una receta vigente Gen AI con los controles de conversación existentes.
- Documentar ampliación de archivos/modalidades por separado de los adjuntos locales de texto ya entregados.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** El nombre npm real heredado es @google/generative-ai, con guion. Google recomienda @google/genai; no elegir el SDK heredado para una receta nueva ni inferir modelos actuales desde ejemplos antiguos. Secretos y procesamiento de archivos corresponden al backend.

**Evidencia npm — instalaciones de SDK:**

- [`@google/genai@2.30.0`](https://registry.npmjs.org/%40google%2Fgenai/2.30.0): [14.706.880](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40google%2Fgenai) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.
- [`@ai-sdk/google@4.0.101`](https://registry.npmjs.org/%40ai-sdk%2Fgoogle/4.0.101): [5.527.304](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40ai-sdk%2Fgoogle) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.
- [`@google/generative-ai@0.24.1`](https://registry.npmjs.org/%40google%2Fgenerative-ai/0.24.1): [2.291.499](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40google%2Fgenerative-ai) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://ai.google.dev/gemini-api/docs/libraries) · [Referencia oficial 2](https://ai.google.dev/gemini-api/docs/migrate) · [Referencia oficial 3](https://github.com/googleapis/js-genai)

## Cloudflare AI Gateway / Vercel AI Gateway / OpenRouter

**P2 · Opción especializada · Esfuerzo medio.**

Servicios alternativos de enrutamiento/observabilidad de servidor; elegir gateway según despliegue, proveedores y tratamiento de datos.

**Aureform hoy:** AIWorkspace tiene presets locales y salida determinista; no hay gateway ni política de enrutamiento conectados.

**Interfaz propuesta:**

- Proponer estado de proveedor/respaldo visible para administradores desde metadatos reales del backend.
- Documentar políticas y errores sin exponer credenciales de gateway en navegador.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Son servicios de red, no observaciones comparables de adopción npm. Capacidades de modelos/herramientas/resultados y retención varían por ruta; el respaldo no debe cambiar requisitos silenciosamente. Autenticación del gateway no sustituye autorización de aplicación. No se afirma ranking de latencia, ahorro ni crecimiento.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

Sin recuento de un paquete npm seleccionado; la adopción del servicio o API REST no se midió.

**Referencias primarias:** [Referencia oficial 1](https://developers.cloudflare.com/ai-gateway/) · [Referencia oficial 2](https://vercel.com/docs/ai-gateway) · [Referencia oficial 3](https://openrouter.ai/docs/quickstart)

## Postgres pgvector retrieval

**P1 · Opción principal · Esfuerzo grande.**

Receta SQL de recuperación vectorial para consumidores con Postgres, incluidos despliegues Supabase opcionales.

**Aureform hoy:** Ya existen archivos y adjuntos de texto locales, pero no hay servicio de ingesta, índice de recuperación ni aplicación de ACL de fuentes.

**Interfaz propuesta:**

- Proponer selección de fuentes, estado de ingesta/frescura y citas enlazadas.
- Documentar recuperación y borrado autorizados junto a controles de archivos existentes.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** pgvector es extensión Postgres bajo PostgreSQL License, no un proxy npm de uso del servicio. El servidor debe aplicar ACL por tenant/fuente antes de devolver fragmentos. Embeddings, similitud y citas no prueban veracidad ni otorgan acceso.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

Sin recuento de un paquete npm seleccionado; la adopción del servicio o API REST no se midió.

**Referencias primarias:** [Referencia oficial 1](https://github.com/pgvector/pgvector) · [Referencia oficial 2](https://supabase.com/docs/guides/ai)

## Pinecone / Qdrant retrieval

**P2 · Alternativa · Esfuerzo grande.**

Almacenes vectoriales alternativos: Pinecone es gestionado; Qdrant permite infraestructura gestionada o propia. Los SDK se ejecutan en backend.

**Aureform hoy:** Ya existen archivos y adjuntos de texto locales, pero no hay servicio de ingesta, índice de recuperación ni aplicación de ACL de fuentes.

**Interfaz propuesta:**

- Documentar una receta de ingesta/recuperación con estados de fuente/frescura.
- Proponer enlaces rastreables y estados de acceso denegado/borrado respaldados por el consumidor.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0 (both observed SDKs). **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Estos SDK no aportan una aplicación RAG completa. El servidor debe aplicar ACL, aislamiento, actualizaciones y borrado; los controles de cita no lo hacen. Validar filtros de namespace/payload para el almacén elegido.

**Evidencia npm — instalaciones de SDK:**

- [`@pinecone-database/pinecone@9.0.0`](https://registry.npmjs.org/%40pinecone-database%2Fpinecone/9.0.0): [473.895](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40pinecone-database%2Fpinecone) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.
- [`@qdrant/js-client-rest@1.19.0`](https://registry.npmjs.org/%40qdrant%2Fjs-client-rest/1.19.0): [542.651](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40qdrant%2Fjs-client-rest) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://docs.pinecone.io/reference/sdks/node/overview) · [Referencia oficial 2](https://qdrant.tech/documentation/)

## Langfuse

**P1 · Opción principal · Esfuerzo medio.**

Receta opcional de trazas/evaluación en backend; el paquete langfuse observado y los SDK actuales representan generaciones distintas.

**Aureform hoy:** La demo IA determinista no tiene backend de trazas, contabilidad de tokens ni evaluación del proveedor.

**Interfaz propuesta:**

- Proponer enlaces de traza y diagnóstico desde metadatos reales del consumidor.
- Mostrar datos de uso/evaluación ausentes explícitamente sin generar estimaciones.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (JavaScript SDKs). **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Para AI SDK 7 usar registerTelemetry con @langfuse/vercel-ai-sdk, distinto de experimental_telemetry de v6. Usar la ruta vigente de trazas/OpenTelemetry sin asumir que el import antiguo langfuse es actual. Los SDK con ámbito no están medidos aquí. Ocultar contenido sensible y revisar retención/condiciones Enterprise; las trazas no miden automáticamente la corrección.

**Evidencia npm — instalaciones de SDK:**

- [`langfuse@3.39.2`](https://registry.npmjs.org/langfuse/3.39.2): [957.202](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/langfuse) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- `@langfuse/tracing`: fuera de la muestra seleccionada de 70 paquetes.
- `@langfuse/otel`: fuera de la muestra seleccionada de 70 paquetes.

- `@langfuse/vercel-ai-sdk`: fuera de la muestra seleccionada de 70 paquetes.

**Referencias primarias:** [Referencia oficial 1](https://langfuse.com/docs/observability/sdk/overview) · [Referencia oficial 2](https://github.com/langfuse/langfuse-js) · [Referencia oficial 3](https://langfuse.com/integrations/frameworks/vercel-ai-sdk)

## LangSmith / Helicone

**P2 · Alternativa · Esfuerzo medio.**

Diagnóstico LLM alternativo: LangSmith traza/evalúa ejecuciones; Helicone ofrece observabilidad mediante proxy/instrumentación. Elegir un enfoque.

**Aureform hoy:** La línea base no incluye exportador de trazas LLM, almacén de evaluación ni proxy de observabilidad.

**Interfaz propuesta:**

- Documentar trazas/diagnóstico del proveedor elegido y enlaces desde errores IA.
- Mostrar solo metadatos devueltos de uso, enrutamiento y evaluación.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (LangSmith SDK); check provider package for optional Helicone SDK. **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** Las instalaciones langsmith no miden el servicio gestionado ni adopción Helicone, no medida en este conjunto. Servicio LangSmith y autoalojamiento Helicone tienen condiciones distintas. Las trazas requieren políticas de ocultación, retención e identidad del consumidor.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`langsmith@0.11.0`](https://registry.npmjs.org/langsmith/0.11.0): [4.115.594](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/langsmith) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://docs.langchain.com/langsmith/observability) · [Referencia oficial 2](https://docs.helicone.ai/getting-started/quick-start)

## Model Context Protocol

**P2 · Opción especializada · Esfuerzo grande.**

Protocolo para hosts/clientes/servidores del consumidor que exponen herramientas, recursos y prompts; distinto de un broker de conectores.

**Aureform hoy:** La demo estática no aporta cliente/servidor MCP, registro de conexiones ni runtime de autorización de herramientas.

**Interfaz propuesta:**

- Proponer inspección de conexiones, capacidades y permisos con estado del consumidor.
- Documentar revisión explícita de acciones delimitadas y estados reanudables cuando los soporte el consumidor.

**Runtime:** Integración de protocolo; transporte y ejecución pertenecen al consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT (TypeScript SDK). **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** Usar la especificación vigente 2026-07-28 y verificar soporte de transporte/extensiones del SDK elegido. La autenticación de transporte no sustituye autorización por tenant/herramienta, ejecución duradera ni sincronización. Handles/extensiones de tareas no constituyen automáticamente un motor de aplicación.

**Evidencia npm — instalaciones de SDK:**

- [`@modelcontextprotocol/sdk@1.32.1`](https://registry.npmjs.org/%40modelcontextprotocol%2Fsdk/1.32.1): [39.432.481](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40modelcontextprotocol%2Fsdk) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://modelcontextprotocol.io/specification/2026-07-28) · [Referencia oficial 2](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) · [Referencia oficial 3](https://github.com/modelcontextprotocol/typescript-sdk)

## Cloudflare Agents SDK

**P2 · Opción especializada · Esfuerzo grande.**

Runtime de agentes del consumidor en Workers/Durable Objects con hooks opcionales de navegador exportados desde agents/react.

**Aureform hoy:** El frontend se exporta estáticamente y la salida IA es local; no se aporta runtime Agents ni Durable Object.

**Interfaz propuesta:**

- Documentar una receta avanzada que conecte eventos de agentes con controles IA existentes.
- Proponer visualización autorizada de ejecuciones persistentes, reconexión y aprobación.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Workers Static Assets es distinto del runtime Agents/Durable Objects consumidor. Identidad, almacenamiento, programación y efectos de herramientas requieren diseño explícito. agents es un paquete con exportación de navegador, no dos observaciones independientes; sus descargas no están medidas aquí.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- `agents`: fuera de la muestra seleccionada de 70 paquetes.

**Referencias primarias:** [Referencia oficial 1](https://developers.cloudflare.com/agents/) · [Referencia oficial 2](https://github.com/cloudflare/agents)

## LangGraph with LangChain core

**P2 · Opción especializada · Esfuerzo grande.**

Orquestación de grafos/estado en backend; LangChain core aporta primitivas compartidas, no otra plataforma de agentes elegida de forma independiente.

**Aureform hoy:** AIWorkspace ejecuta un generador local de texto; no hay backend de grafos, checkpoints ni interrupción/reanudación.

**Interfaz propuesta:**

- Proponer estado de ejecución/pasos/checkpoints y aprobación/reanudación respaldadas por backend.
- Mantener el chat básico independiente de la receta de orquestación opcional.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** La durabilidad exige persistencia y despliegue definidos; las API de grafos no autorizan herramientas ni evitan efectos repetidos por sí solas. No sumar core y LangGraph como usuarios independientes ni inferir superioridad/latencia desde descargas.

**Evidencia npm — instalaciones de SDK:**

- [`@langchain/langgraph@1.5.1`](https://registry.npmjs.org/%40langchain%2Flanggraph/1.5.1): [2.065.793](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40langchain%2Flanggraph) descargas, 12–18 de octubre; licencia SDK declarada: MIT.
- [`@langchain/core@1.2.19`](https://registry.npmjs.org/%40langchain%2Fcore/1.2.19): [3.551.272](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40langchain%2Fcore) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://docs.langchain.com/oss/javascript/langgraph/overview) · [Referencia oficial 2](https://github.com/langchain-ai/langgraphjs)

## OpenAI Agents SDK for TypeScript

**P2 · Opción especializada · Esfuerzo grande.**

Orquestación opcional de agentes en backend para herramientas, transferencias y ciclo de ejecución, separada de la receta básica Responses.

**Aureform hoy:** La demo IA determinista no tiene servicio de ejecuciones, transferencias, herramientas ni sesiones duraderas.

**Interfaz propuesta:**

- Documentar una receta avanzada de eventos para resultados de herramientas y aprobación explícita.
- Proponer transferencia/progreso/error con metadatos reales de ejecución.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Depende del proveedor, componente y despliegue elegido; revisar las condiciones de plataforma/servicio enlazadas.

**Límites y consideraciones de implementación:** El SDK no aporta automáticamente autorización de sesión/tenant, almacenamiento de credenciales externas ni motor duradero. El consumidor debe definir aprobación, persistencia y efectos. Los cargos de modelos/servicios son distintos de la licencia SDK.

**Evidencia npm — instalaciones de SDK:**

- [`@openai/agents@0.20.0`](https://registry.npmjs.org/%40openai%2Fagents/0.20.0): [1.155.073](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40openai%2Fagents) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://openai.github.io/openai-agents-js/) · [Referencia oficial 2](https://github.com/openai/openai-agents-js)

## Slack

**P1 · Opción principal · Esfuerzo medio.**

Conexión del espacio Slack del usuario para notificaciones y acciones autorizadas de mensajes/herramientas; el SDK Node observado es de servidor.

**Aureform hoy:** Ya existe tarjeta Slack que cambia conexión demo local; no instala una app Slack ni recibe eventos.

**Interfaz propuesta:**

- Completar selección de espacio/canales y permisos concedidos de lectura/escritura.
- Mostrar reconexión, acceso denegado, fallo de entrega y revisión explícita de publicaciones propuestas.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** El backend debe gestionar OAuth/tokens, eventos firmados y autorización por tenant/canal. Instalar una app Slack difiere de iniciar sesión con Slack. Las instalaciones SDK no miden demanda ni usuarios; revisar políticas/límites por app.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@slack/web-api@8.2.0`](https://registry.npmjs.org/%40slack%2Fweb-api/8.2.0): [7.347.713](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40slack%2Fweb-api) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://docs.slack.dev/authentication/installing-with-oauth/) · [Referencia oficial 2](https://docs.slack.dev/apis/events-api/)

## GitHub Apps

**P1 · Opción principal · Esfuerzo medio.**

Conexión de repositorios mediante permisos de instalación GitHub App; Octokit REST es cliente API, no ciclo de instalación/credenciales.

**Aureform hoy:** Ya existen tarjeta GitHub y acceso GitHub simulado; ninguno instala una app ni autoriza repositorios.

**Interfaz propuesta:**

- Completar selectores de instalación/repositorios y estado de permisos/conexión.
- Proponer acciones de issues/PR con vista previa, aprobación y resultado del proveedor.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Instalación de app y acceso OAuth son flujos distintos. El backend debe gestionar tokens, webhooks verificados y autorización de repositorios; no interpretar descargas Octokit como instalaciones de apps ni usar la insignia demo como autorización.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@octokit/rest@22.0.1`](https://registry.npmjs.org/%40octokit%2Frest/22.0.1): [11.394.096](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40octokit%2Frest) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) · [Referencia oficial 2](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps)

## Google Drive with Picker

**P1 · Opción principal · Esfuerzo medio.**

Conexión de documentos Drive elegidos por el usuario mediante Picker y drive.file; googleapis es biblioteca general de servidor, no SDK Picker.

**Aureform hoy:** Ya existen selección/descarga local y adjuntos de texto; no se aporta Picker ni conexión OAuth Drive.

**Interfaz propuesta:**

- Documentar una receta Picker/drive.file para archivos elegidos explícitamente y enlaces de fuente.
- Proponer conectado, indexando, desactualizado, revocado y acceso denegado.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0 (googleapis). **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** drive.file concede acceso por archivo, no permiso para indexar todo Drive. Permisos amplios pueden exigir verificación/evaluación adicional. El servidor debe aplicar ACL y borrados; googleapis no permite aislar adopción Drive/Picker ni demanda.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`googleapis@186.0.0`](https://registry.npmjs.org/googleapis/186.0.0): [6.242.041](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/googleapis) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://developers.google.com/workspace/drive/picker/guides/overview) · [Referencia oficial 2](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)

## Google Calendar

**P2 · Opción especializada · Esfuerzo medio.**

Conexión de calendarios independiente para disponibilidad/eventos con permisos de lectura/escritura elegidos explícitamente.

**Aureform hoy:** La interfaz de calendario/eventos usa registros locales; no hay OAuth, suscripciones ni sincronización Google Calendar.

**Interfaz propuesta:**

- Documentar selección de calendarios/recursos y eventos/disponibilidad con zona horaria.
- Proponer frescura, reconexión y revisión antes de crear/modificar eventos externos.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Apache-2.0 (googleapis). **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Picker/drive.file no autoriza Calendar. El backend debe gestionar permisos propios, recurrencia/zonas horarias y renovación de canales/estado incremental. googleapis no mide adopción Calendar; no se asume cuota API fija.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`googleapis@186.0.0`](https://registry.npmjs.org/googleapis/186.0.0): [6.242.041](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/googleapis) descargas, 12–18 de octubre; licencia SDK declarada: Apache-2.0.

**Referencias primarias:** [Referencia oficial 1](https://developers.google.com/workspace/calendar/api/guides/overview) · [Referencia oficial 2](https://developers.google.com/workspace/calendar/api/guides/push)

## Notion

**P1 · Opción principal · Esfuerzo medio.**

Conexión de conocimiento a páginas y fuentes de datos autorizadas, con escrituras revisadas opcionales.

**Aureform hoy:** Ya existen documentos/notas locales; no se aporta conexión, selección de fuentes ni sincronización Notion.

**Interfaz propuesta:**

- Documentar selectores de páginas/fuentes, acceso concedido y sincronización.
- Proponer citas y estados de permiso/reconexión sin exponer documentos inaccesibles.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Fijar una versión API admitida y distinguir contenedores de base de datos de fuentes tras el cambio documentado. Las conexiones acceden solo a contenido concedido; el servidor debe aplicar permisos. Las instalaciones SDK no miden espacios Notion.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@notionhq/client@5.27.1`](https://registry.npmjs.org/%40notionhq%2Fclient/5.27.1): [1.087.506](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40notionhq%2Fclient) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://developers.notion.com/guides/get-started/authorization) · [Referencia oficial 2](https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03)

## Microsoft 365 / Microsoft Graph

**P2 · Opción especializada · Esfuerzo grande.**

Conexión a SharePoint/OneDrive, Teams y Outlook Calendar; el cliente Graph exige flujo separado de identidad/adquisición de tokens.

**Aureform hoy:** Existe acceso Microsoft simulado, pero no conecta recursos Microsoft 365, consentimiento administrativo ni suscripciones incrementales Graph.

**Interfaz propuesta:**

- Documentar selección de tenant/cuenta/recursos y permisos delegados frente a permisos de aplicación.
- Proponer consentimiento administrativo, renovación, frescura incremental y acciones de calendario/documentos revisadas.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** MIT. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Consentimiento, permisos de aplicación, identidad delegada y ACL son límites distintos. El backend debe gestionar renovación, cambios por recurso y autorización antes de recuperar/actuar. Graph abarca muchos servicios y no mide un flujo Microsoft 365 específico.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@microsoft/microsoft-graph-client@3.0.7`](https://registry.npmjs.org/%40microsoft%2Fmicrosoft-graph-client/3.0.7): [1.243.474](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40microsoft%2Fmicrosoft-graph-client) descargas, 12–18 de octubre; licencia SDK declarada: MIT.

**Referencias primarias:** [Referencia oficial 1](https://learn.microsoft.com/en-us/graph/permissions-overview) · [Referencia oficial 2](https://learn.microsoft.com/en-us/graph/delta-query-overview) · [Referencia oficial 3](https://learn.microsoft.com/en-us/graph/change-notifications-overview)

## Linear

**P2 · Opción especializada · Esfuerzo medio.**

Conexión de proyectos de ingeniería mediante OAuth/GraphQL y eventos del proveedor.

**Aureform hoy:** Las vistas de tareas/proyectos usan registros locales; no hay OAuth Linear ni sincronización de issues.

**Interfaz propuesta:**

- Documentar mapeo de equipos/proyectos/estados y frescura de conexión.
- Proponer vista previa de crear/actualizar issues, aprobación y resultados del proveedor.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** El consentimiento OAuth no da acceso a todo equipo/issue. El consumidor gestiona tokens, verificación de webhooks y autorización por issue. No se afirma observación npm comparable ni límite fijo.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

Sin recuento de un paquete npm seleccionado; la adopción del servicio o API REST no se midió.

**Referencias primarias:** [Referencia oficial 1](https://linear.app/developers/oauth-2-0-authentication) · [Referencia oficial 2](https://linear.app/developers/webhooks)

## Atlassian Jira Cloud

**P2 · Opción especializada · Esfuerzo grande.**

Conexión Jira Cloud con permisos por sitio/proyecto y operaciones de incidencias dependientes del esquema.

**Aureform hoy:** Ya existen tareas/tableros locales; no se aporta conexión Atlassian ni mapeo de esquemas de incidencias.

**Interfaz propuesta:**

- Documentar selección de sitio/proyecto/tipo de incidencia y mapeo de campos propios.
- Proponer permiso/reconexión y transiciones revisadas con errores de validación útiles.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Campos/transiciones y permisos varían por sitio/proyecto. El backend debe validar operaciones y gestionar límites/reintentos vigentes; no reutilizar cuotas numéricas de investigación no verificada. La disponibilidad API no constituye integración Jira terminada.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

Sin recuento de un paquete npm seleccionado; la adopción del servicio o API REST no se midió.

**Referencias primarias:** [Referencia oficial 1](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/) · [Referencia oficial 2](https://developer.atlassian.com/cloud/jira/platform/webhooks/) · [Referencia oficial 3](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/)

## HubSpot CRM

**P2 · Opción especializada · Esfuerzo grande.**

Conexión CRM para contactos/empresas/negocios y cambios revisados de campos/propiedades.

**Aureform hoy:** Las tablas/editores de estilo CRM usan datos locales; no se aporta conexión HubSpot ni sincronización de propiedades.

**Interfaz propuesta:**

- Documentar mapeo de cuenta/objetos/propiedades y sincronización inicial/incremental.
- Proponer resolución de conflictos, acceso denegado y revisión de cambios CRM salientes.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Elegir versiones admitidas de plataforma/API/OAuth desde documentación vigente sin tomar endpoints heredados como predeterminados nuevos. Permisos, esquemas y derechos varían; el consumidor gestiona tokens, webhooks y autorización. No se afirma proxy npm ni límite/caducidad fijo.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

Sin recuento de un paquete npm seleccionado; la adopción del servicio o API REST no se midió.

**Referencias primarias:** [Referencia oficial 1](https://developers.hubspot.com/docs) · [Referencia oficial 2](https://developers.hubspot.com/changelog/v1-oauth-api-deprecation)

## Zendesk

**P2 · Opción especializada · Esfuerzo grande.**

Conexión de cuenta de soporte para tickets autorizados y acciones revisadas.

**Aureform hoy:** Las vistas de soporte/tickets operan con registros locales; no hay conexión de subdominio/OAuth ni receptor de eventos Zendesk.

**Interfaz propuesta:**

- Documentar selección de subdominio/cuenta y mapeo de tickets/estados.
- Proponer salud de entrega/sincronización, reconexión y cambios de tickets externos revisados.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** El backend debe validar destinos, OAuth/tokens, firmas y permisos de tickets. Límites y comportamiento ante fallos dependen de políticas vigentes; no se asumen cuotas ni umbrales fijos. Conectar la interfaz no aporta sincronización.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

Sin recuento de un paquete npm seleccionado; la adopción del servicio o API REST no se midió.

**Referencias primarias:** [Referencia oficial 1](https://developer.zendesk.com/documentation/authentication/using-oauth-to-authenticate-zendesk-api-requests-in-a-web-app/) · [Referencia oficial 2](https://developer.zendesk.com/documentation/webhooks/)

## Salesforce

**P2 · Opción especializada · Esfuerzo grande.**

Conexión CRM empresarial con políticas de entorno/organización y operaciones conscientes de esquemas/permisos.

**Aureform hoy:** Los registros de estilo CRM siguen siendo locales; no se aporta conexión Salesforce, cliente OAuth ni consumidor CDC/Pub/Sub.

**Interfaz propuesta:**

- Documentar selección de organización/producción-sandbox, mapeo de objetos/campos y políticas administrativas.
- Proponer cambios/sincronización autorizados y revisión explícita de escrituras CRM.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** La orientación vigente recomienda External Client Apps; la creación de Connected Apps está restringida, aunque las existentes pueden continuar. El backend gestiona OAuth, permisos por objeto/campo y eventos admitidos. Límites varían por organización; no se afirma cuota universal ni proxy SDK.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

Sin recuento de un paquete npm seleccionado; la adopción del servicio o API REST no se midió.

**Referencias primarias:** [Referencia oficial 1](https://developer.salesforce.com/docs/platform/api-rest/guide/intro-rest.html) · [Referencia oficial 2](https://developer.salesforce.com/docs/platform/api-rest/guide/intro-oauth-and-connected-apps.html)

## Nango / Pipedream Connect

**P2 · Opción especializada · Esfuerzo medio.**

Recetas alternativas de broker para OAuth, ciclo de credenciales, proxy API y sincronización opcional; elegir servicio y roles SDK actuales.

**Aureform hoy:** Ajustes ya contiene seis tarjetas simuladas: GitHub, Database, Slack, Webhooks, Stripe y Email; los controles guardan IDs locales, no conexiones reales.

**Interfaz propuesta:**

- Completar una receta de modal/sesión sobre tarjetas existentes e identidad del consumidor.
- Proponer simulado, conectado, reconexión, acceso denegado, sincronizando, desactualizado y desconectado con permisos/recursos y última sincronización.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** nango 0.71.13 declara SEE LICENSE IN LICENSE FILE IN GIT REPOSITORY y Node >=22.22.2; su plataforma es ELv2, no Apache/MIT. El repositorio de componentes Pipedream es Source Available; el SDK React declara MIT y el de servidor remite a un archivo de licencia. Verificar condiciones y mínimos Node por versión. Autenticación/sincronización no sustituyen autorización del consumidor.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`nango@0.71.13`](https://registry.npmjs.org/nango/0.71.13): [71.385](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/nango) descargas, 12–18 de octubre; licencia SDK declarada: SEE LICENSE IN LICENSE FILE IN GIT REPOSITORY.
- `@pipedream/sdk`: fuera de la muestra seleccionada de 70 paquetes.
- `@pipedream/connect-react`: fuera de la muestra seleccionada de 70 paquetes.

**Referencias primarias:** [Referencia oficial 1](https://nango.dev/docs/getting-started/intro-to-nango) · [Referencia oficial 2](https://github.com/NangoHQ/nango/blob/master/LICENSE) · [Referencia oficial 3](https://registry.npmjs.org/nango/0.71.13) · [Referencia oficial 4](https://pipedream.com/docs/connect) · [Referencia oficial 5](https://github.com/PipedreamHQ/pipedream/blob/master/LICENSE)

## Composio

**P2 · Opción especializada · Esfuerzo medio.**

Receta gestionada de cuentas/sesiones de herramientas para agentes, distinta de un flujo duradero o aplicación completa de sincronización.

**Aureform hoy:** Ajustes ya contiene seis tarjetas simuladas: GitHub, Database, Slack, Webhooks, Stripe y Email; los controles guardan IDs locales, no conexiones reales.

**Interfaz propuesta:**

- Proponer cuentas enlazadas, herramientas concedidas y reconexión en el hub existente.
- Documentar vistas previas autorizadas, aprobación explícita y resultados de ejecución.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** ISC (@composio/core 0.25.0 metadata). **Condiciones del servicio:** Servicio comercial con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Los metadatos npm declaran ISC y Node >=22.22.3; el repositorio SDK usa MIT, por lo que deben verificarse avisos de la versión distribuida sin borrar la distinción. La licencia SDK no licencia el servicio comercial. Aislamiento, ACL y autorización de escrituras corresponden al consumidor; npm no mide cuentas conectadas.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

- [`@composio/core@0.25.0`](https://registry.npmjs.org/%40composio%2Fcore/0.25.0): [727.460](https://api.npmjs.org/downloads/point/2026-10-12:2026-10-18/%40composio%2Fcore) descargas, 12–18 de octubre; licencia SDK declarada: ISC.

**Referencias primarias:** [Referencia oficial 1](https://docs.composio.dev/docs) · [Referencia oficial 2](https://registry.npmjs.org/%40composio%2Fcore/0.25.0) · [Referencia oficial 3](https://github.com/ComposioHQ/composio/blob/next/LICENSE)

## n8n predefined backend workflows

**P2 · Opción especializada · Esfuerzo medio.**

Automatización opcional del backend controlada por la organización y disparada mediante API/webhooks del consumidor.

**Aureform hoy:** Ajustes ya contiene seis tarjetas simuladas: GitHub, Database, Slack, Webhooks, Stripe y Email; los controles guardan IDs locales, no conexiones reales.

**Interfaz propuesta:**

- Documentar activación de flujos predefinidos y resultados/reintentos respaldados por backend.
- Mostrar propiedad del flujo y cuentas conectadas elegidas en la receta.

**Runtime:** Backend del consumidor; el frontend presenta resultados autorizados y estado. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Puede existir autoalojamiento; revisar por separado licencias de plataforma y términos del servicio alojado.

**Límites y consideraciones de implementación:** La FAQ SUL permite flujos backend predefinidos de la organización, incluidas cuentas de usuarios finales. Restringe que usuarios construyan/configuren lógica mediante UI, API, MCP o agentes sin acuerdo. Revisar distribución y condiciones; no prohibir todo backend SaaS ni llamar Apache/MIT a la plataforma.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

Sin recuento de un paquete npm seleccionado; la adopción del servicio o API REST no se midió.

**Referencias primarias:** [Referencia oficial 1](https://docs.n8n.io/n8n-community-license/community-license/license-faq.md) · [Referencia oficial 2](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)

## Make / Zapier

**P2 · Alternativa · Esfuerzo medio.**

Ecosistemas alternativos de flujos gestionados mediante API/webhooks o widgets de integraciones publicadas elegibles.

**Aureform hoy:** Ajustes ya contiene seis tarjetas simuladas: GitHub, Database, Slack, Webhooks, Stripe y Email; los controles guardan IDs locales, no conexiones reales.

**Interfaz propuesta:**

- Documentar configuración de disparadores/acciones salientes y enlaces a plantillas elegidas.
- Proponer entrega, estado, reintento y reconexión desde eventos reales.

**Runtime:** Interacción de navegador con backend operado por el consumidor. Compatibilidad documentada; no se ejecutó ninguna integración externa en Aureform.

**Licencia del SDK:** Consultar la licencia del paquete concreto elegido; no se atribuye una licencia uniforme. **Condiciones del servicio:** Servicio gestionado con sus propias condiciones y contrato de uso.

**Límites y consideraciones de implementación:** Elegir un ecosistema; elegibilidad de socios/publicación y propiedad de ejecución difieren. Siguen siendo necesarias autorización, validación e idempotencia. No hay observación npm comparable; una plantilla/widget no equivale a conector nativo instalado ni broker.

**Evidencia npm — instalaciones de SDK:**

No se recogió una medida comparable de adopción de este rol/servicio. Los recuentos de paquetes siguientes son señales más amplias de instalación del SDK.

Sin recuento de un paquete npm seleccionado; la adopción del servicio o API REST no se midió.

**Referencias primarias:** [Referencia oficial 1](https://developers.make.com/custom-apps-documentation) · [Referencia oficial 2](https://docs.zapier.com/integrations/embed/powered-by-zapier)

El código original de Aureform conserva Apache-2.0. La metadata de SDK no concede derechos sobre servicios alojados, servidores, extensiones premium ni embedding. La demo permanece estática; el backend consumidor resuelve sesiones, permisos, secretos, webhooks, inferencia y sincronización duradera.
