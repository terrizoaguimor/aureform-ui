# Research de integraciones

La recomendación para Aureform es ofrecer **interfaces y recetas de integración modulares**: primero datos, identidad, Stripe y AI; después servicios operativos y conectores de producto. El objetivo es reducir el trabajo para convertir una interfaz en un producto conectado, conservando la elección de backend y proveedor.

**Evidencia revisada: 20 de octubre de 2026.** La base de código examinada es el commit [`a93ab113`](https://github.com/terrizoaguimor/aureform-ui/commit/a93ab113170ec1456608cf1f85d1a89b23aaec68), versión 1.4.1: Next.js 16.4.2, React 19.3.1, Tailwind 4 y Base UI. Tiene 69 vistas de demo, 44 familias principales, 107 entradas de registro y seis paletas. La demo se exporta estáticamente para Workers Static Assets y GitHub Pages.

Este capítulo publica la investigación. **Las recetas nuevas y las conexiones de proveedores son propuestas**, no integraciones entregadas por la presencia de un logotipo o una tarjeta.

## Método y límites de popularidad

Se ejecutaron cuatro investigaciones headless con **agy 1.4.3 y Gemini 4 Argon High**, en modo de planificación y con alcance de web pública. Identidad/datos/pagos registró 34 búsquedas; servicios operativos, 17; AI, 24; conectores de producto, 24. Los cuatro procesos finalizaron correctamente: **99 consultas de búsqueda observadas**. Dos revisiones independientes y la revisión principal contrastaron documentos, paquetes y contratos del código.

El [registro de ejecución](../../research/2026-10-20/integrations/agy-provenance.json) conserva modelo, fechas, consultas, estado y hashes de las respuestas originales. No publica configuración privada, credenciales, identificadores de sesiones, pensamiento interno ni borradores sin revisar. Una ejecución correcta acredita la ejecución de la investigación; no convierte cada afirmación generada en un hecho.

La [muestra oficial de npm](../../research/2026-10-20/integrations/npm-downloads.json) contiene **70 paquetes**, todos con respuesta HTTP 200 y la misma ventana inclusiva, **12–18 de octubre de 2026**. Sus URLs fechadas permiten consultar el período concreto. Son eventos de descarga: CI, dependencias transitivas, lenguaje y alcance de cada SDK afectan el recuento. No se suman paquetes cliente/servidor ni se presenta un ranking entre funciones distintas. Consulta la [metodología de npm](https://github.com/npm/registry/blob/main/docs/download-counts.md).

| Paquete observado       | Función de la señal                            | Descargas del 12–18 de octubre |
| ----------------------- | ---------------------------------------------- | -----------------------------: |
| `@tanstack/react-query` | Estado asíncrono de React                      |                     40.112.338 |
| `@supabase/supabase-js` | Cliente de una plataforma de datos             |                     20.655.219 |
| `better-auth`           | Biblioteca de identidad para varios frameworks |                      7.801.856 |
| `@clerk/nextjs`         | Integración de identidad específica de Next.js |                      1.724.508 |
| `stripe`                | SDK de servidor de pagos                       |                     14.526.076 |
| `ai`                    | Toolkit TypeScript de AI                       |                     18.352.661 |
| `@ai-sdk/react`         | Hooks de interfaz React                        |                      5.664.731 |
| `resend`                | SDK de email transaccional                     |                      8.132.768 |
| `posthog-js`            | Analítica en navegador                         |                     10.131.121 |
| `@sentry/nextjs`        | Monitorización para Next.js                    |                      7.173.701 |

La encuesta Stack Overflow 2026 aporta contexto adicional. Su pregunta sobre frameworks web tiene 10.281 respuestas y registra React 41,5% y Next.js 20,6%; es multiselección y tiene autoselección de participantes. No mide la preferencia de proveedores entre usuarios de Next.js. Las preguntas de orquestación de agentes y automatización tienen otros denominadores. [Tabla de frameworks](https://survey.stackoverflow.co/2026/technology/data/web-framework), [metodología](https://survey.stackoverflow.co/2026/methodology), [datos de AI](https://survey.stackoverflow.co/2026/ai/data).

Por eso, el orden siguiente combina adopción observable, documentación para Next.js, mantenimiento, encaje con Aureform y complejidad. **Es un juicio de producto**, no una cuota de mercado demostrada. Las fuentes se registran en el [ledger primario](../../research/2026-10-20/integrations/sources.json); las [fichas completas](../../research/2026-10-20/integrations/catalogue.es.md) explican cada candidato y sus alternativas.

## Selección P0, P1 y P2

P0 define las primeras recetas de adopción; P1 amplía operación y conexiones; P2 cubre casos especializados. El orden no promete fechas ni requiere instalar todos los SDKs.

| Prioridad | Familia                  | Selección recomendada                                                              | Interfaz y recorrido que aportaría                                          |
| --------- | ------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| P0        | Datos y API              | TanStack Query + Supabase; Neon/Drizzle como alternativa de servidor               | Tablas conectadas, filtros remotos, persistencia y estados recuperables.    |
| P0        | Identidad                | Better Auth para backend propio; Clerk gestionado; Supabase Auth en la receta BaaS | Conectar auth existente, sesión, organización y permisos del producto.      |
| P0        | Comercio                 | Stripe; Paddle/Polar como alternativas MoR                                         | Checkout, portal y estados de suscripción sobre el transporte existente.    |
| P0        | AI                       | AI SDK 7 con recetas OpenAI, Anthropic y Gemini                                    | Workspace con mensajes estructurados, fuentes y herramientas.               |
| P1        | Media                    | R2/S3 o Supabase Storage; Cloudinary para transformaciones                         | Subida, progreso, persistencia y recuperación del editor de imágenes.       |
| P1        | Email                    | Resend + React Email; Postmark como alternativa                                    | Invitaciones, recuperación de acceso y avisos transaccionales.              |
| P1        | Observabilidad           | PostHog y Sentry, en funciones distintas                                           | Analítica, flags y diagnóstico de errores elegidos por el consumidor.       |
| P1        | Conectores               | Slack, GitHub Apps, Google Drive y Notion                                          | Canales, repositorios y documentos seleccionados por la persona.            |
| P1        | Conocimiento AI          | Postgres/pgvector + Langfuse                                                       | Fuentes indexadas, citas, evaluación y feedback de respuestas.              |
| P2        | Tiempo real y tareas     | Supabase Realtime/Liveblocks; Inngest o Trigger.dev para jobs                      | Presencia, colaboración y seguimiento de trabajo asíncrono.                 |
| P2        | Edición y búsqueda       | Tiptap; Algolia, Meilisearch o Typesense                                           | Texto enriquecido, búsqueda conectada y filtros.                            |
| P2        | Empresa                  | Microsoft 365, calendarios, Linear, Jira, HubSpot y WorkOS/Auth0                   | Documentos, agenda, tickets, CRM e identidad empresarial según el producto. |
| P2        | Agentes y automatización | MCP, Cloudflare Agents/LangGraph; brokers y webhooks opcionales                    | Herramientas, ejecución persistente y conectores especializados.            |

## TanStack Query, Supabase y Neon/Drizzle

**Datos.** TanStack Query resuelve estado de consultas, caché y mutaciones; Supabase aporta una plataforma de datos. Son capas complementarias. Aureform ya tiene query controlada, paginación manual e IDs de filas estables. La receta debe mapear esos contratos al backend elegido, conservar filtros y distinguir carga inicial, actualización y fallo. SWR es una alternativa de caché; tRPC presupone un backend TypeScript; Prisma/Drizzle pertenecen a la capa de servidor. No se atribuye menor latencia ni crecimiento superior sin medición. [TanStack](https://tanstack.com/query/latest/docs/framework/react/overview), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

El esfuerzo de esta familia es **medio**. TanStack Query, Supabase y Neon declaran MIT; Drizzle, Apache-2.0. El servicio de base de datos tiene condiciones separadas y las consultas SQL privilegiadas pertenecen al backend. Las [fichas y metadatos](../../research/2026-10-20/integrations/README.md) conservan las versiones y licencias observadas.

## Better Auth, Clerk y Supabase Auth

**Identidad.** No se combinan tres sistemas de sesión por defecto. Una receta BaaS puede usar Supabase Auth; un consumidor con backend propio puede elegir Better Auth; Clerk ofrece una opción gestionada. Aureform ya expone `AuthAdapter.signInWithProvider` para Google, GitHub y Microsoft. El callback conecta el flujo del consumidor, pero las sesiones de demo no acreditan identidad ni autorización de tenants. Organizaciones, MFA, recuperación y SSO requieren especificar el recorrido y la política real. [Adaptadores actuales](../../application-integrations.es.md), [Better Auth](https://better-auth.com/docs/integrations/next), [Clerk](https://clerk.com/docs/nextjs/getting-started/quickstart).

El esfuerzo es **medio a grande**, según los recorridos de sesión. Estos SDKs declaran MIT; operar identidad o contratar el servicio son decisiones independientes. Las recetas Next.js con sesiones y callbacks de servidor requieren un despliegue del consumidor.

Auth.js pasó a Better Auth en septiembre de 2025; su equipo mantiene parches de seguridad y problemas urgentes y recomienda Better Auth para proyectos nuevos, con excepciones. Better Auth anunció su incorporación a Vercel en julio de 2026. Estos cambios de mantenimiento ayudan a decidir una receta; no prueban que una biblioteca represente “la mitad del mercado”. [Auth.js](https://better-auth.com/blog/authjs-joins-better-auth), [anuncio de Vercel](https://better-auth.com/blog/better-auth-joins-vercel).

## Stripe, Paddle y Polar

**Comercio.** El `createStripeCommerceAdapter` actual envía solicitudes del navegador a un backend del consumidor. La oportunidad consiste en documentar Checkout, portal, webhooks e idempotencia y mostrar procesamiento, fallo o actualización pendiente. Volver desde un checkout no acredita que el pago esté confirmado. Stripe es un procesador de pagos; las alternativas MoR tienen otro reparto de responsabilidades y condiciones comerciales. Una adquisición tampoco demuestra por sí sola que Lemon Squeezy esté deprecado. [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted), [Paddle](https://developer.paddle.com/paddlejs/overview), [Polar](https://polar.sh/docs/integrate/sdk/adapters/nextjs).

El esfuerzo es **medio a grande**. Los SDKs Stripe/Polar declaran MIT y Paddle, Apache-2.0; esto no describe tarifas, elegibilidad de productos ni obligaciones comerciales. Precios autoritativos, idempotencia y webhooks verificados quedan en el backend.

## AI SDK 7 y Base UI

La versión estable observada es `ai@7.0.146`, junto con `@ai-sdk/react@4.0.150`. Ambos declaran Node.js 22 o posterior; los peers React admiten el rango de la aplicación. Esto verifica metadata y compatibilidad declarada, **no una integración ejecutada en Aureform**. [Paquete AI](https://registry.npmjs.org/ai/7.0.146), [paquete React](https://registry.npmjs.org/@ai-sdk%2freact/4.0.150), [documentación](https://ai-sdk.dev/docs/introduction).

El workspace actual consume un generador determinista de texto. Ya tiene Stop, cancelación, error simulado, retry e historial local; los adjuntos de ese recorrido son texto local. Faltan un adaptador opcional de proveedor, mensajes por partes, fuentes, resultados de herramientas y persistencia autorizada. El retry actual usa la configuración vigente: repetir exactamente una solicitud anterior sería una extensión separada.

El esfuerzo de conectar el protocolo y completar sus estados es **medio a grande**. AI SDK declara Apache-2.0; el acceso y consumo de modelos sigue las condiciones de cada proveedor. No se instala el toolkit ni se ejecuta inferencia por publicar esta receta.

Una receta de `useChat` debe respetar el protocolo de mensajes de UI. Compartir SSE no hace compatible automáticamente un stream nativo. `UIMessage.parts` distingue texto, archivos, `source-url`, `source-document` y herramientas tipadas; las aprobaciones tienen identificadores propios. La receta traducirá ese contrato a las superficies visuales de Aureform. [Mensajes](https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message), [protocolo](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol).

Los nuevos AI Elements de shadcn publican 21 patrones y ofrecen Trace/Code Block para Base UI, React Aria y Radix. Son referencias útiles para conversación, citas, fuentes, herramientas y confirmación. La biblioteca anterior anuncia su deprecación a finales de noviembre de 2026. La adopción debe conservar tokens, contraste, seis paletas y movimiento reducido de Aureform. [Release de octubre](https://ui.shadcn.com/docs/changelog/2026-10-ai-elements), [patrones actuales](https://ui.shadcn.com/docs/ai-elements), [transición](https://elements.ai-sdk.dev/).

### Proveedores, conocimiento y evaluación

### OpenAI Responses, Anthropic y Gemini

- **OpenAI:** la nueva receta empleará Responses. Assistants cerró el 26 de agosto de 2026; el consumidor gestiona explícitamente los bucles de herramientas y la persistencia. [Migración](https://developers.openai.com/api/docs/assistants/migration).
- **Anthropic:** documenta citas localizadas para documentos; una cita verificable no garantiza que una conclusión sea correcta. Citas y structured outputs tienen restricciones de combinación que la receta debe respetar. [Citas](https://platform.claude.com/docs/en/build-with-claude/citations).
- **Gemini:** Google recomienda `@google/genai`. El paquete npm legado se llama `@google/generative-ai`; la tabla de bibliotecas omite ese guion, pero no indica un SDK nuevo. No se infieren modelos públicos desde el nombre del modelo usado por agy. [Bibliotecas](https://ai.google.dev/gemini-api/docs/libraries), [metadata del paquete legado](https://registry.npmjs.org/@google%2Fgenerative-ai/latest).
  Los SDKs nativos observados son Apache-2.0 para OpenAI/Gemini y MIT para Anthropic. Sus streams necesitan una traducción explícita al contrato visual elegido.

### Postgres/pgvector, Pinecone, Qdrant y Langfuse

- **RAG:** Postgres/pgvector permite evaluar una receta sobre la base de datos elegida; Pinecone y Qdrant son alternativas especializadas. El backend debe aplicar identidad y permisos antes de recuperar documentos, y la UI debe mostrar origen y frescura. Seleccionar una fuente en pantalla no implementa control de acceso. [Supabase](https://supabase.com/docs/guides/ai/semantic-search), [OpenAI File Search](https://developers.openai.com/api/docs/guides/tools-file-search).
- **Evaluación:** Langfuse es una receta propuesta para trazas y feedback. Su integración AI SDK 7 usa `registerTelemetry` y `@langfuse/vercel-ai-sdk`; no debe copiarse la configuración v6 de `experimental_telemetry`. LangSmith y Helicone cubren alternativas con otro encaje. [Langfuse](https://langfuse.com/integrations/frameworks/vercel-ai-sdk).

Esta familia tiene esfuerzo **grande** por ingesta, permisos y evaluación. pgvector usa la licencia PostgreSQL; los SDKs Langfuse son MIT, y los clientes Pinecone/Qdrant observados, Apache-2.0. Servidores, funciones Enterprise y servicios cloud se revisan por separado.

La UI propuesta incluye aprobación o rechazo de acciones, adjuntos con estado, extracción revisable hacia formularios, jobs consultables y consumo estimado. Los resúmenes de razonamiento solo mostrarán contenido publicado por el proveedor; no pensamiento privado. Cloudflare AI Gateway, Vercel AI Gateway y OpenRouter se evaluarán como recetas de enrutamiento; no existe una métrica npm común que demuestre cuál tiene mayor adopción.

## Archivos, email, analítica y trabajos

### R2/S3, Supabase Storage y Cloudinary

**Media.** El editor actual ya tiene validación, recorte, orden y alt locales. La receta R2/S3 necesita que el backend autorice cada subida y entregue una URL firmada acotada. La UI conserva el trabajo cuando caduca una URL o falla un archivo. Supabase Storage encaja cuando el consumidor ya usa ese BaaS; Cloudinary aporta transformaciones, y UploadThing es otra opción para un backend Next.js. Un SDK S3 muy descargado no mide la cuota de R2. [R2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

El esfuerzo es **medio**. AWS SDK declara Apache-2.0; los SDKs Supabase Storage, Cloudinary y UploadThing, MIT. Almacenamiento, entrega y transformaciones tienen sus propios contratos.

### Resend, React Email y Postmark

**Email.** Resend y React Email resuelven envío y composición en capas distintas. El navegador puede previsualizar una plantilla; el envío, dominio y eventos pertenecen al consumidor. Postmark, SendGrid y SES son alternativas; Knock/Novu añaden orquestación de notificaciones y preferencias. [Resend en Next.js](https://resend.com/docs/send-with-nextjs), [React Email](https://react.email/docs).

El esfuerzo es **medio**. Resend, React Email, Postmark y SendGrid declaran MIT; el cliente AWS SES, Apache-2.0. La licencia del SDK no describe entregabilidad, cuotas ni precio del servicio.

### PostHog y Sentry

**Analítica y fallos.** PostHog analiza uso y flags; Sentry diagnostica errores y trazas. Las recetas serán opcionales y no activarán seguimiento por aparecer en la demo. Deben definir los datos enviados, las restricciones de contenido y el coste de carga. La licencia MIT del SDK JavaScript de Sentry no describe la licencia del servidor ni de su CLI. [PostHog](https://posthog.com/docs/libraries/next-js), [SDK Sentry](https://github.com/getsentry/sentry-javascript/blob/develop/LICENSE), [servidor Sentry](https://github.com/getsentry/sentry/blob/master/LICENSE.md).

El esfuerzo es **pequeño a medio**. `posthog-js` declara `(Apache-2.0 AND MIT)` y el SDK Next.js de Sentry, MIT. La retención y las condiciones del servicio requieren su propia decisión.

### Supabase Realtime, Liveblocks, Inngest y Trigger.dev

**Trabajo y colaboración.** Inngest/Trigger.dev ejecutan jobs en el backend; Aureform puede mostrar progreso, error y reintento autorizado. Cancelar una conexión del navegador no confirma que el job servidor haya parado. Supabase Realtime/Ably sirven para eventos y presencia; Liveblocks se evalúa para colaboración documental. Tiptap, Lexical y BlockNote tienen abstracciones y licencias diferentes. Algolia, Meilisearch y Typesense requieren una receta de búsqueda y permisos propios. Sus SDKs se cargarán donde hagan falta; no se promete un número de bytes sin medir.

Tiempo real y jobs tienen esfuerzo **grande**. Los SDKs Supabase/Trigger.dev declaran MIT y Liveblocks/Inngest, Apache-2.0; sus servicios y servidores tienen condiciones propias.

### Tiptap, Algolia, Meilisearch y Typesense

Edición y búsqueda tienen esfuerzo **medio a grande**, con persistencia, esquema e indexación propios. Tiptap/Lexical y los clientes Algolia/Meilisearch declaran MIT; Typesense, Apache-2.0. BlockNote React declara MPL-2.0 y separa sus funciones XL; las extensiones comerciales y las licencias de servidores no se deducen desde estos clientes.

### MapLibre y Google Maps

Google Maps ya tiene carga opcional con clave de navegador y MapLibre ya está disponible. Pulir diagnóstico, ciclo de montaje y recuperación es una extensión de esa base, no añadir MapLibre como si faltara. La geometría local de rutas tampoco constituye una integración con Routes/Directions. [Mapas actuales](maps.md).

La receta sobre esta base tiene esfuerzo **pequeño**. MapLibre usa BSD-3-Clause; el paquete oficial del loader Google observado declara Apache-2.0, pero no es una dependencia de Aureform. Mapas, teselas y servicios conservan sus condiciones.

## Slack, GitHub, Drive y Notion

El centro de integraciones actual tiene seis tarjetas con cambios de estado locales. Su evolución debe mostrar cuenta o workspace, recursos elegidos, permisos, última sincronización, reautorización, error recuperable y desconexión. **OAuth completado y sincronización completa son resultados distintos.**

El esfuerzo es **grande**. Los SDKs Slack, Octokit y Notion observados declaran MIT; el cliente Google, Apache-2.0. Las políticas de plataforma, permisos y acceso a APIs siguen siendo requisitos independientes.

- **Slack:** selección de canales, notificaciones y fuentes autorizadas. La receta respetará cuotas por método y tipo de distribución; no prometerá indexar todo el historial con una cuota universal. [Límites actuales](https://docs.slack.dev/apis/web-api/rate-limits/).
- **GitHub:** priorizar GitHub Apps para selección granular de repositorios y permisos de issues/PRs. El login social GitHub existente y un conector de repositorios son funciones diferentes. [GitHub Apps frente a OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps).
- **Drive:** empezar por Google Picker y `drive.file` para documentos elegidos. La sincronización de todo un Drive es otro alcance, con permisos y requisitos propios. Los calendarios se documentarán por separado. [Scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).
- **Notion:** selección de páginas y datos autorizados, paginación y recuperación ante permisos retirados. Las versiones de API y los límites vigentes deben comprobarse para la receta concreta. [Autorización](https://developers.notion.com/guides/get-started/authorization), [límites](https://developers.notion.com/reference/request-limits).

## Microsoft 365, calendarios, Linear, Jira, HubSpot y WorkOS/Auth0

Microsoft 365/Graph, Outlook Calendar, Linear, Jira y HubSpot amplían otros recorridos. El consentimiento de administrador, las suscripciones de cambios y los mapeos de campos añaden esfuerzo. WorkOS/AuthKit y Auth0 son alternativas para identidad empresarial, SSO y gobierno de organizaciones, no conectores de documentos. Zendesk/Salesforce quedan como candidatos especializados. La publicación de APIs acredita viabilidad; no demuestra demanda medida entre consumidores de Aureform. [Microsoft Graph delta](https://learn.microsoft.com/en-us/graph/delta-query-overview), [WorkOS AuthKit](https://workos.com/docs/authkit/nextjs), [Auth0 Next.js](https://auth0.com/docs/quickstart/webapp/nextjs).

El esfuerzo es **grande**. Los SDKs Graph, WorkOS/AuthKit y Auth0 observados declaran MIT; el acceso a APIs y funciones empresariales tiene condiciones propias. El backend debe validar sesiones, procesar cambios y mantener sincronización.

## MCP, Cloudflare Agents y LangGraph

MCP define transporte e invocación de herramientas y un marco de autorización para HTTP. La especificación actual revisada es **2026-07-28**. No entrega por sí sola una bóveda de tokens, autorización de la aplicación, sincronización o ejecución duradera. Cloudflare Agents, LangGraph y OpenAI Agents son recetas de backend para necesidades distintas, no requisitos del chat básico. [MCP](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization).

El esfuerzo es **grande**, por ejecución, aprobaciones y persistencia. Los SDKs MCP, Cloudflare Agents, LangGraph y OpenAI Agents declaran MIT; eso no concede acceso a servicios alojados ni reemplaza autorización de producto.

### Nango, Pipedream Connect y Composio

Nango/Pipedream Connect pueden reducir trabajo de OAuth y conexión; Composio se orienta a herramientas para agentes. Se deben evaluar por separado autenticación, acciones, sincronización, revocación y cuotas. El estado de una conexión mostrará el backend configurado por el consumidor. [Nango](https://nango.dev/docs/guides/functions/syncs/deletion-detection), [Pipedream](https://pipedream.com/docs/connect), [Composio](https://docs.composio.dev/).

### Zapier, Make y n8n

Zapier, Make y n8n son candidatos para webhooks y automatizaciones. La FAQ actual de n8n permite ciertos workflows predefinidos controlados por la organización detrás de un producto, incluso con cuentas del usuario. Distingue esos casos de permitir que usuarios externos construyan o configuren workflows, que requiere otro acuerdo. Nango usa ELv2 para su plataforma; estas condiciones no se convierten en Apache-2.0 por conectarlas a Aureform. [FAQ n8n](https://docs.n8n.io/n8n-community-license/community-license/license-faq.md), [licencia Nango](https://github.com/NangoHQ/nango/blob/master/LICENSE).

## Frontera de runtime y aceptación

La demo permanece estática. Next.js permite generar respuestas GET estáticas durante el build; eso es distinto de recibir callbacks OAuth, webhooks o POST dinámicos. Identidad, permisos de tenants, secretos, cobros, ingesta y herramientas se resuelven en un servidor o servicio del consumidor. [Exportación estática](https://nextjs.org/docs/app/guides/static-exports).

Las APIs públicas de los adaptadores existentes no cambian por esta investigación. La primera implementación debe elegir un recorrido concreto, mantener dependencias opcionales y registrar:

- Instalación reproducible con versiones fijadas y backend compatible.
- Sesión expirada, permisos insuficientes, error de red, límite del proveedor y resultado tardío.
- Cancelación y recuperación sin perder filtros, borrador, archivo o aprobación.
- Teclado, tacto, EN/ES, claro/oscuro, seis paletas y movimiento reducido.
- Render y bundle medidos antes/después. Los informes Lighthouse existentes conservan su commit original y no acreditan estas recetas.
- Autorización servidor y entrega idempotente cuando el recorrido tenga acciones o cobros.

Las [fichas](../../research/2026-10-20/integrations/catalogue.es.md) clasifican el esfuerzo como juicio relativo, no días prometidos. La [hoja de ruta](roadmap.md) relaciona estas recetas con los gaps anteriores. El [research de producto](research.md) conserva su base, sus 52 búsquedas y sus ocho prioridades: es un estudio separado.
