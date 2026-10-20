import type {
  IntegrationAction,
  IntegrationDefinition,
  IntegrationFamily,
  IntegrationField,
  IntegrationOperationKind,
  IntegrationText,
} from "./contracts";

/** Serializable frontend recipes. Package names are references, not imports. */
const text = (en: string, es: string): IntegrationText => ({ en, es });
const option = (id: string, name: string, en: string, es: string) => ({
  id,
  name,
  description: text(en, es),
});
const field = (
  id: string,
  en: string,
  es: string,
  type: IntegrationField["type"] = "text",
  required = false,
  description?: IntegrationText,
): IntegrationField => ({
  id,
  label: text(en, es),
  type,
  required,
  description,
});
const select = (
  id: string,
  en: string,
  es: string,
  choices: readonly (readonly [string, string, string])[],
  required = true,
): IntegrationField => ({
  id,
  label: text(en, es),
  type: "select",
  required,
  options: choices.map(([value, labelEn, labelEs]) => ({
    value,
    label: text(labelEn, labelEs),
  })),
});
const permission = (id: string, en: string, es: string, required = false) => ({
  id,
  label: text(en, es),
  required,
  description: text(
    `${en} for authorized resources in this workspace. This is a logical permission; the backend maps provider scopes.`,
    `${es} para recursos autorizados en este espacio. Es un permiso lógico; el backend mapea los scopes del proveedor.`,
  ),
});
const readKinds: readonly IntegrationOperationKind[] = [
  "query",
  "search",
  "geocode",
  "route",
  "list-models",
  "test-connection",
];
const action = (
  id: string,
  kind: IntegrationOperationKind,
  en: string,
  es: string,
  descriptionEn: string,
  descriptionEs: string,
  fields: readonly IntegrationField[] = [],
): IntegrationAction => ({
  id,
  kind,
  label: text(en, es),
  description: text(descriptionEn, descriptionEs),
  fields,
  requiredPermissions: [],
  requiresReview: !readKinds.includes(kind),
});
const allow = (
  permissionId: string,
  operation: IntegrationAction,
): IntegrationAction => ({
  ...operation,
  requiredPermissions: [permissionId],
});
const connectionReference = field(
  "connectionRef",
  "Backend connection reference",
  "Referencia de conexión del backend",
  "text",
  true,
  text(
    "A connection configured by your backend, not a credential.",
    "Una conexión configurada por tu backend, no una credencial.",
  ),
);
const testConnection = action(
  "test-connection",
  "test-connection",
  "Test connection",
  "Probar conexión",
  "Check the configured consumer connection and permission mapping; demo mode makes no provider request.",
  "Comprueba la conexión del consumidor y el mapeo de permisos; el modo demo no consulta al proveedor.",
);
const resource = field(
  "resourceId",
  "Selected resource reference",
  "Referencia del recurso seleccionado",
  "text",
  true,
);
const replyThread = field(
  "threadId",
  "Reported thread reference",
  "Referencia de hilo reportada",
  "text",
  false,
  text(
    "Optional thread ID reported for the selected room. The consumer validates and maps this application context; it does not imply native transport threading.",
    "ID de hilo opcional reportado para la sala seleccionada. El consumidor valida y mapea este contexto de aplicación; no implica hilos nativos del transporte.",
  ),
);
const replyParent = field(
  "parentId",
  "Reported parent message reference",
  "Referencia de mensaje padre reportada",
  "text",
  false,
  text(
    "For a reply, use a loaded message ID in the reported thread and selected room. The backend rechecks membership, moderation and the parent; author identity comes from its authenticated session.",
    "Para responder, usa un ID de mensaje cargado del hilo reportado y la sala seleccionada. El backend revalida membresía, moderación y padre; la identidad del autor procede de su sesión autenticada.",
  ),
);
const recordId = field(
  "recordId",
  "Record reference",
  "Referencia del registro",
  "text",
  true,
);
const name = field("name", "Name", "Nombre", "text", true);
const searchText = field("query", "Search text", "Texto de búsqueda");
const limit = field("limit", "Result limit", "Límite de resultados", "number");
const since = field("since", "Since (ISO date)", "Desde (fecha ISO)");
const content = field("content", "Content", "Contenido", "text", true);
const documentId = field(
  "documentId",
  "Document reference",
  "Referencia del documento",
  "text",
  true,
);
const jobId = field(
  "jobId",
  "Job reference",
  "Referencia del trabajo",
  "text",
  true,
);
const approved = field(
  "approved",
  "Approve this action",
  "Aprobar esta acción",
  "toggle",
  true,
);
const state = select(
  "status",
  "Application status",
  "Estado de la aplicación",
  [
    ["active", "Active", "Activo"],
    ["pending", "Pending", "Pendiente"],
    ["archived", "Archived", "Archivado"],
  ],
);
const documentFormat = select(
  "format",
  "Document format",
  "Formato del documento",
  [
    ["markdown", "Markdown", "Markdown"],
    ["text", "Plain text", "Texto plano"],
    ["json", "JSON", "JSON"],
  ],
);
const period = select("period", "Reporting period", "Período del informe", [
  ["24h", "Last day", "Último día"],
  ["7d", "Last week", "Última semana"],
  ["30d", "Last month", "Último mes"],
]);
const sessionReport = action(
  "session-report",
  "query",
  "Inspect session state",
  "Consultar estado de sesión",
  "Read authorized session and recovery state from the consumer's injected authentication module; this is not sign-in.",
  "Consulta sesión y recuperación autorizadas en el módulo de autenticación inyectado; esto no inicia sesión.",
  [
    field(
      "subjectRef",
      "Application user reference",
      "Referencia del usuario de la aplicación",
      "text",
      true,
    ),
  ],
);
const billingReport = action(
  "billing-report",
  "query",
  "Inspect billing state",
  "Consultar estado de facturación",
  "Read the consumer's reconciled subscription and invoice state. Checkout, prices and fulfillment use the injected commerce module.",
  "Consulta suscripciones y facturas conciliadas por el consumidor. Checkout, precios y entrega usan el módulo de comercio inyectado.",
  [
    field(
      "customerRef",
      "Application customer reference",
      "Referencia del cliente de la aplicación",
      "text",
      true,
    ),
    period,
  ],
);
const modelReport = action(
  "model-report",
  "list-models",
  "Inspect approved models",
  "Consultar modelos autorizados",
  "Show models approved by the consumer backend. This does not assert that every provider or gateway exposes a model-list API.",
  "Muestra modelos autorizados por el backend consumidor. No presupone una API de listado en cada proveedor o gateway.",
  [
    field(
      "capability",
      "Required model capability",
      "Capacidad requerida del modelo",
    ),
  ],
);
const traceReport = action(
  "trace-report",
  "query",
  "Inspect traces",
  "Consultar trazas",
  "Read redacted traces and errors for the selected application project.",
  "Consulta trazas y errores filtrados del proyecto seleccionado.",
  [field("runId", "Run reference", "Referencia de ejecución"), period],
);
const usageReport = action(
  "usage-report",
  "query",
  "Inspect usage report",
  "Consultar informe de consumo",
  "Read usage and cost metadata supplied by the consumer; estimates are not payment or billing guarantees.",
  "Consulta consumo y costes aportados por el consumidor; las estimaciones no garantizan cobros ni facturación.",
  [period],
);
const ingestDocument = action(
  "ingest-document",
  "ingest",
  "Index an authorized document",
  "Indexar un documento autorizado",
  "Request backend ingestion after source and workspace authorization; embedding, chunking and deletion remain server responsibilities.",
  "Solicita ingesta tras autorizar fuente y espacio; embeddings, fragmentación y borrado pertenecen al servidor.",
  [
    name,
    content,
    field(
      "sourceRef",
      "Source reference",
      "Referencia de la fuente",
      "text",
      true,
    ),
  ],
);
const retrieveDocuments = action(
  "retrieve-documents",
  "search",
  "Retrieve relevant documents",
  "Recuperar documentos relevantes",
  "Search only sources authorized by the consumer backend, with freshness and citation metadata.",
  "Busca solo fuentes autorizadas por el backend, con frescura y metadatos de citas.",
  [
    field(
      "query",
      "Retrieval question",
      "Pregunta de recuperación",
      "text",
      true,
    ),
    limit,
  ],
);
const runAgent = action(
  "run-agent",
  "run-agent",
  "Start an approved agent run",
  "Iniciar una ejecución autorizada",
  "Start the backend's allowlisted agent with its own authorization, execution limits and persistence.",
  "Inicia un agente permitido por el backend con autorización, límites y persistencia propios.",
  [
    field("prompt", "Task", "Tarea", "text", true),
    field("threadId", "Conversation reference", "Referencia de conversación"),
  ],
);
const executeTool = action(
  "execute-tool",
  "execute-tool",
  "Request a tool action",
  "Solicitar una acción de herramienta",
  "Request an allowlisted tool; the backend validates arguments, source access and side effects before execution.",
  "Solicita una herramienta permitida; el backend valida argumentos, fuentes y efectos antes de ejecutarla.",
  [
    field(
      "toolName",
      "Approved tool name",
      "Nombre de herramienta permitida",
      "text",
      true,
    ),
    field(
      "arguments",
      "Tool arguments (JSON)",
      "Argumentos de herramienta (JSON)",
      "text",
      true,
    ),
  ],
);
const approveTool = action(
  "approve-tool",
  "approve-tool",
  "Review a pending tool",
  "Revisar una herramienta pendiente",
  "Approve or reject an existing backend approval request; a UI decision cannot authorize another workspace or tool.",
  "Aprueba o rechaza una solicitud existente; una decisión de UI no autoriza otro espacio ni herramienta.",
  [
    field(
      "approvalId",
      "Approval request reference",
      "Referencia de solicitud de aprobación",
      "text",
      true,
    ),
    approved,
  ],
);
const uploadPreview = action(
  "upload-preview",
  "upload",
  "Review upload target",
  "Revisar destino de subida",
  "Preview the selected upload policy. Actual file transfer uses adapter.upload(File), with consumer authorization, limits and signed delivery.",
  "Previsualiza la política de subida. El archivo real usa adapter.upload(File), con autorización, límites y entrega firmada del consumidor.",
  [
    name,
    field("contentType", "Content type", "Tipo de contenido", "text", true),
    field("alt", "Accessible description", "Descripción accesible"),
  ],
);
const renderEmail = action(
  "template-preview",
  "query",
  "Preview an email template",
  "Previsualizar una plantilla",
  "Read a consumer-rendered template preview using safe sample data; this does not send email.",
  "Consulta una plantilla renderizada con datos de ejemplo seguros; esto no envía email.",
  [
    field(
      "templateRef",
      "Approved template reference",
      "Referencia de plantilla permitida",
      "text",
      true,
    ),
    field(
      "recipientName",
      "Sample recipient name",
      "Nombre de destinatario de ejemplo",
    ),
  ],
);
const sendEmail = action(
  "send-email",
  "send-email",
  "Send transactional email",
  "Enviar email transaccional",
  "Submit reviewed delivery through the selected sender; the backend validates recipients, sender domain, content and idempotency.",
  "Envía una entrega revisada con el emisor elegido; el backend valida destinatarios, dominio, contenido e idempotencia.",
  [
    field(
      "recipient",
      "Recipient email",
      "Email del destinatario",
      "text",
      true,
    ),
    field("subject", "Subject", "Asunto", "text", true),
    content,
    field("templateRef", "Template reference", "Referencia de plantilla"),
  ],
);
const deliveryReport = action(
  "delivery-report",
  "query",
  "Inspect delivery receipts",
  "Consultar recibos de entrega",
  "Read normalized delivery status from the consumer's verified webhook or API records.",
  "Consulta estado normalizado desde webhooks verificados o registros API del consumidor.",
  [field("deliveryId", "Delivery reference", "Referencia de entrega"), since],
);
const fieldMapping = action(
  "map-fields",
  "map-fields",
  "Save an approved field mapping",
  "Guardar un mapeo de campos",
  "Persist a mapping between allowlisted application and provider fields; this does not edit provider schemas or workflow logic.",
  "Guarda un mapeo de campos permitidos entre aplicación y proveedor; no modifica esquemas ni lógica de workflows.",
  [
    field(
      "sourceField",
      "Application field",
      "Campo de aplicación",
      "text",
      true,
    ),
    field("targetField", "Provider field", "Campo del proveedor", "text", true),
  ],
);
const calendarQuery = action(
  "query-events",
  "query",
  "Read calendar events",
  "Leer eventos del calendario",
  "Read events or availability only for selected calendars and the requested time range.",
  "Lee eventos o disponibilidad solo de calendarios seleccionados y del período solicitado.",
  [
    field(
      "startAt",
      "Range start (ISO timestamp)",
      "Inicio del período (fecha ISO)",
      "text",
      true,
    ),
    field(
      "endAt",
      "Range end (ISO timestamp)",
      "Fin del período (fecha ISO)",
      "text",
      true,
    ),
    searchText,
  ],
);
const calendarEvent = action(
  "save-event",
  "save-record",
  "Create a calendar event",
  "Crear un evento de calendario",
  "Create a reviewed event in the selected calendar; the backend validates timezone, attendees, permissions and duplicate prevention.",
  "Crea un evento revisado; el backend valida zona horaria, asistentes, permisos y prevención de duplicados.",
  [
    field("title", "Event title", "Título del evento", "text", true),
    field(
      "startAt",
      "Start (ISO timestamp)",
      "Inicio (fecha ISO)",
      "text",
      true,
    ),
    field("endAt", "End (ISO timestamp)", "Fin (fecha ISO)", "text", true),
    field("attendees", "Attendee emails", "Emails de asistentes"),
  ],
);
const geocode = action(
  "geocode-address",
  "geocode",
  "Resolve an address",
  "Resolver una dirección",
  "Call a separately configured consumer geocoding service; a map renderer alone does not supply geocoding.",
  "Consulta un servicio geocodificador configurado por el consumidor; el renderer del mapa no aporta geocodificación por sí solo.",
  [field("address", "Address", "Dirección", "text", true)],
);
const route = action(
  "plan-route",
  "route",
  "Request route geometry",
  "Solicitar geometría de ruta",
  "Request a route from the consumer's separately selected directions service, subject to its usage and data policy.",
  "Solicita una ruta al servicio de direcciones elegido por el consumidor según sus políticas de uso y datos.",
  [
    field("origin", "Origin", "Origen", "text", true),
    field("destination", "Destination", "Destino", "text", true),
  ],
);

/** Curated package/license references from the reviewed catalogue; no SDK is loaded here. */
const researchMetadata = {
  "tanstack-query": [
    "TanStack Query",
    "P0",
    "https://tanstack.com/query/latest/docs/framework/react/overview",
    ["@tanstack/react-query"],
    "MIT",
  ],
  "supabase-data": [
    "Supabase application data",
    "P0",
    "https://supabase.com/docs/guides/database/postgres/row-level-security",
    ["@supabase/supabase-js"],
    "MIT",
  ],
  "better-auth": [
    "Better Auth",
    "P0",
    "https://better-auth.com/docs/integrations/next",
    ["better-auth"],
    "MIT",
  ],
  clerk: [
    "Clerk",
    "P0",
    "https://clerk.com/docs/nextjs/getting-started/quickstart",
    ["@clerk/nextjs"],
    "MIT",
  ],
  "supabase-auth": [
    "Supabase Auth",
    "P0",
    "https://supabase.com/docs/guides/auth",
    ["@supabase/ssr", "@supabase/supabase-js"],
    "MIT",
  ],
  "authjs-nextauth": [
    "Auth.js / NextAuth",
    "P2",
    "https://authjs.dev/",
    ["next-auth"],
    "ISC",
  ],
  "enterprise-identity": [
    "WorkOS AuthKit / Auth0",
    "P2",
    "https://workos.com/docs/authkit/nextjs",
    ["@workos-inc/authkit-nextjs", "@auth0/nextjs-auth0"],
    "MIT",
  ],
  swr: [
    "SWR",
    "P2",
    "https://swr.vercel.app/docs/getting-started",
    ["swr"],
    "MIT",
  ],
  "neon-drizzle": [
    "Neon with Drizzle ORM",
    "P2",
    "https://neon.com/docs/serverless/serverless-driver",
    ["@neondatabase/serverless", "drizzle-orm"],
    "MIT (Neon driver); Apache-2.0 (Drizzle ORM)",
  ],
  prisma: [
    "Prisma ORM",
    "P2",
    "https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers",
    ["@prisma/client"],
    "Apache-2.0",
  ],
  firebase: [
    "Firebase",
    "P2",
    "https://firebase.google.com/docs/web/setup",
    ["firebase"],
    "Apache-2.0",
  ],
  convex: [
    "Convex",
    "P2",
    "https://docs.convex.dev/quickstart/nextjs",
    ["convex"],
    "Apache-2.0 (convex package)",
  ],
  trpc: [
    "tRPC",
    "P2",
    "https://trpc.io/docs/client/tanstack-react-query/setup",
    ["@trpc/client", "@trpc/server", "@trpc/tanstack-react-query"],
    "MIT",
  ],
  stripe: [
    "Stripe payment processing",
    "P0",
    "https://docs.stripe.com/checkout/quickstart",
    ["stripe", "@stripe/stripe-js"],
    "MIT",
  ],
  paddle: [
    "Paddle Merchant of Record",
    "P0",
    "https://developer.paddle.com/paddle-js/",
    ["@paddle/paddle-js", "@paddle/paddle-node-sdk"],
    "Apache-2.0",
  ],
  polar: [
    "Polar Merchant of Record",
    "P0",
    "https://polar.sh/docs/integrate/sdk/typescript",
    ["@polar-sh/sdk"],
    "MIT",
  ],
  "lemon-squeezy": [
    "Lemon Squeezy",
    "P2",
    "https://docs.lemonsqueezy.com/guides/developer-guide",
    ["@lemonsqueezy/lemonsqueezy.js"],
    "MIT",
  ],
  "s3-r2-storage": [
    "Amazon S3 / Cloudflare R2 storage",
    "P1",
    "https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html",
    ["@aws-sdk/client-s3"],
    "Apache-2.0",
  ],
  "supabase-storage": [
    "Supabase Storage",
    "P1",
    "https://supabase.com/docs/guides/storage",
    ["@supabase/storage-js"],
    "MIT",
  ],
  cloudinary: [
    "Cloudinary media",
    "P1",
    "https://cloudinary.com/documentation/upload_images",
    ["cloudinary"],
    "MIT",
  ],
  uploadthing: [
    "UploadThing",
    "P2",
    "https://docs.uploadthing.com/getting-started/appdir",
    ["uploadthing", "@uploadthing/react"],
    "MIT",
  ],
  "resend-react-email": [
    "Resend with React Email",
    "P1",
    "https://resend.com/docs/send-with-nextjs",
    ["resend", "@react-email/components"],
    "MIT",
  ],
  "email-delivery-alternatives": [
    "Postmark / SendGrid / Amazon SES",
    "P1",
    "https://postmarkapp.com/developer",
    ["postmark", "@sendgrid/mail", "@aws-sdk/client-ses"],
    "MIT (Postmark/SendGrid); Apache-2.0 (SES client)",
  ],
  sentry: [
    "Sentry",
    "P1",
    "https://docs.sentry.io/platforms/javascript/guides/nextjs/",
    ["@sentry/nextjs"],
    "MIT (JavaScript SDK)",
  ],
  posthog: [
    "PostHog",
    "P1",
    "https://posthog.com/docs/libraries/next-js",
    ["posthog-js"],
    "(Apache-2.0 AND MIT)",
  ],
  "vercel-analytics": [
    "Vercel Web Analytics",
    "P2",
    "https://vercel.com/docs/analytics/quickstart",
    ["@vercel/analytics"],
    "MIT",
  ],
  "notification-inboxes": [
    "Knock / Novu notifications",
    "P2",
    "https://docs.knock.app/in-app-ui/react/overview",
    ["@knocklabs/react", "@novu/react"],
    "MIT (Knock); ISC (@novu/react 3.19.2 metadata)",
  ],
  "background-jobs": [
    "Inngest / Trigger.dev jobs",
    "P2",
    "https://www.inngest.com/docs",
    ["inngest", "@trigger.dev/sdk"],
    "Apache-2.0 (Inngest SDK); MIT (Trigger.dev SDK)",
  ],
  "realtime-messaging": [
    "Supabase Realtime / Ably / Pusher",
    "P2",
    "https://supabase.com/docs/guides/realtime",
    ["@supabase/supabase-js", "ably", "pusher-js"],
    "MIT (Supabase/Pusher); Apache-2.0 (Ably)",
  ],
  liveblocks: [
    "Liveblocks collaboration",
    "P2",
    "https://liveblocks.io/docs/get-started/nextjs",
    ["@liveblocks/client", "@liveblocks/react"],
    "Apache-2.0 (current client/React package metadata)",
  ],
  tiptap: [
    "Tiptap editor",
    "P2",
    "https://tiptap.dev/docs/editor/getting-started/install/nextjs",
    ["@tiptap/react"],
    "MIT (editor core/React package)",
  ],
  lexical: [
    "Lexical editor",
    "P2",
    "https://lexical.dev/docs/intro",
    ["lexical", "@lexical/react"],
    "MIT",
  ],
  blocknote: [
    "BlockNote editor",
    "P2",
    "https://www.blocknotejs.org/docs",
    ["@blocknote/react"],
    "MPL-2.0 (@blocknote/react 0.56.0)",
  ],
  algolia: [
    "Algolia search",
    "P2",
    "https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/react",
    ["algoliasearch"],
    "MIT",
  ],
  "self-hostable-search": [
    "Meilisearch / Typesense search",
    "P2",
    "https://www.meilisearch.com/docs/getting_started/overview",
    ["meilisearch", "typesense"],
    "MIT (Meilisearch JS); Apache-2.0 (Typesense JS)",
  ],
  "existing-maps": [
    "MapLibre and optional Google Maps",
    "P2",
    "https://maplibre.org/maplibre-gl-js/docs/",
    ["maplibre-gl", "@googlemaps/js-api-loader"],
    "BSD-3-Clause (MapLibre); Apache-2.0 (Google loader package)",
  ],
  mapbox: [
    "Mapbox GL JS",
    "P2",
    "https://docs.mapbox.com/mapbox-gl-js/guides/",
    ["mapbox-gl"],
    "Mapbox GL JS proprietary license (SEE LICENSE IN LICENSE.txt)",
  ],
  "ai-sdk": [
    "AI SDK 7 with React hooks",
    "P0",
    "https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol",
    ["ai", "@ai-sdk/react"],
    "Apache-2.0",
  ],
  "openai-responses": [
    "OpenAI Responses",
    "P0",
    "https://developers.openai.com/api/docs/guides/migrate-to-responses",
    ["openai", "@ai-sdk/openai"],
    "Apache-2.0",
  ],
  "anthropic-messages": [
    "Anthropic Messages",
    "P0",
    "https://platform.claude.com/docs/en/api/messages/create",
    ["@anthropic-ai/sdk", "@ai-sdk/anthropic"],
    "MIT (native SDK); Apache-2.0 (AI SDK adapter)",
  ],
  "google-gemini": [
    "Google Gemini / Gen AI SDK",
    "P0",
    "https://ai.google.dev/gemini-api/docs/libraries",
    ["@google/genai", "@ai-sdk/google", "@google/generative-ai"],
    "Apache-2.0",
  ],
  "ai-gateways": [
    "Cloudflare AI Gateway / Vercel AI Gateway / OpenRouter",
    "P2",
    "https://developers.cloudflare.com/ai-gateway/",
    [],
    "Hosted service contracts; check any optional provider SDK license",
  ],
  pgvector: [
    "Postgres pgvector retrieval",
    "P1",
    "https://github.com/pgvector/pgvector",
    [],
    "PostgreSQL License (extension); SQL driver terms remain separate",
  ],
  "vector-stores": [
    "Pinecone / Qdrant retrieval",
    "P2",
    "https://docs.pinecone.io/reference/sdks/node/overview",
    ["@pinecone-database/pinecone", "@qdrant/js-client-rest"],
    "Apache-2.0 (both observed SDKs)",
  ],
  langfuse: [
    "Langfuse",
    "P1",
    "https://langfuse.com/docs/observability/sdk/overview",
    [
      "langfuse",
      "@langfuse/tracing",
      "@langfuse/otel",
      "@langfuse/vercel-ai-sdk",
    ],
    "MIT (JavaScript SDKs)",
  ],
  "alternative-ai-observability": [
    "LangSmith / Helicone",
    "P2",
    "https://docs.langchain.com/langsmith/observability",
    ["langsmith"],
    "MIT (LangSmith SDK); check provider package for optional Helicone SDK",
  ],
  mcp: [
    "Model Context Protocol",
    "P2",
    "https://modelcontextprotocol.io/specification/2026-07-28",
    ["@modelcontextprotocol/sdk"],
    "MIT (TypeScript SDK)",
  ],
  "cloudflare-agents": [
    "Cloudflare Agents SDK",
    "P2",
    "https://developers.cloudflare.com/agents/",
    ["agents"],
    "MIT",
  ],
  langgraph: [
    "LangGraph with LangChain core",
    "P2",
    "https://docs.langchain.com/oss/javascript/langgraph/overview",
    ["@langchain/langgraph", "@langchain/core"],
    "MIT",
  ],
  "openai-agents": [
    "OpenAI Agents SDK for TypeScript",
    "P2",
    "https://openai.github.io/openai-agents-js/",
    ["@openai/agents"],
    "MIT",
  ],
  slack: [
    "Slack",
    "P1",
    "https://docs.slack.dev/authentication/installing-with-oauth/",
    ["@slack/web-api"],
    "MIT",
  ],
  "github-apps": [
    "GitHub Apps",
    "P1",
    "https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps",
    ["@octokit/rest"],
    "MIT",
  ],
  "google-drive": [
    "Google Drive with Picker",
    "P1",
    "https://developers.google.com/workspace/drive/picker/guides/overview",
    ["googleapis"],
    "Apache-2.0 (googleapis)",
  ],
  "google-calendar": [
    "Google Calendar",
    "P2",
    "https://developers.google.com/workspace/calendar/api/guides/overview",
    ["googleapis"],
    "Apache-2.0 (googleapis)",
  ],
  notion: [
    "Notion",
    "P1",
    "https://developers.notion.com/guides/get-started/authorization",
    ["@notionhq/client"],
    "MIT",
  ],
  "microsoft-365": [
    "Microsoft 365 / Microsoft Graph",
    "P2",
    "https://learn.microsoft.com/en-us/graph/permissions-overview",
    ["@microsoft/microsoft-graph-client"],
    "MIT",
  ],
  linear: [
    "Linear",
    "P2",
    "https://linear.app/developers/oauth-2-0-authentication",
    [],
    "No SDK selected; API/service terms and separately chosen SDK licenses apply",
  ],
  jira: [
    "Atlassian Jira Cloud",
    "P2",
    "https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/",
    [],
    "No SDK selected; API/service terms and separately chosen SDK licenses apply",
  ],
  hubspot: [
    "HubSpot CRM",
    "P2",
    "https://developers.hubspot.com/docs",
    [],
    "No SDK selected; API/service terms and separately chosen SDK licenses apply",
  ],
  zendesk: [
    "Zendesk",
    "P2",
    "https://developer.zendesk.com/documentation/authentication/using-oauth-to-authenticate-zendesk-api-requests-in-a-web-app/",
    [],
    "No SDK selected; API/service terms and separately chosen SDK licenses apply",
  ],
  salesforce: [
    "Salesforce",
    "P2",
    "https://developer.salesforce.com/docs/platform/api-rest/guide/intro-rest.html",
    [],
    "No SDK selected; API/service terms and separately chosen SDK licenses apply",
  ],
  "oauth-brokers": [
    "Nango / Pipedream Connect",
    "P2",
    "https://nango.dev/docs/getting-started/intro-to-nango",
    ["nango", "@pipedream/sdk", "@pipedream/connect-react"],
    "Nango: release notices / ELv2 platform; Pipedream: MIT React SDK, server release notices / Source Available components",
  ],
  composio: [
    "Composio",
    "P2",
    "https://docs.composio.dev/docs",
    ["@composio/core"],
    "ISC (@composio/core 0.25.0 metadata)",
  ],
  n8n: [
    "n8n predefined backend workflows",
    "P2",
    "https://docs.n8n.io/n8n-community-license/community-license/license-faq.md",
    [],
    "Sustainable Use License platform; enterprise and hosted terms separate",
  ],
  "managed-automation": [
    "Make / Zapier",
    "P2",
    "https://developers.make.com/custom-apps-documentation",
    [],
    "Managed service and embedding contracts; optional SDK terms separate",
  ],
} as const satisfies Record<
  string,
  readonly [
    name: string,
    priority: IntegrationDefinition["priority"],
    documentationUrl: string,
    packages: readonly string[],
    license: string,
  ]
>;

type Recipe = Omit<
  IntegrationDefinition,
  "id" | "name" | "priority" | "documentationUrl" | "packages" | "license"
> & {
  id: keyof typeof researchMetadata;
};
function define(recipe: Recipe): IntegrationDefinition {
  const [name, priority, documentationUrl, packages, license] =
    researchMetadata[recipe.id];
  return {
    ...recipe,
    name,
    priority,
    documentationUrl,
    packages,
    license,
    configurationFields: [connectionReference, ...recipe.configurationFields],
    actions: [testConnection, ...recipe.actions],
  };
}

export const integrationFamilies: readonly {
  id: IntegrationFamily;
  name: IntegrationText;
  description: IntegrationText;
}[] = [
  {
    id: "data",
    name: text("Data & API", "Datos y API"),
    description: text(
      "Queries, records and application persistence.",
      "Consultas, registros y persistencia de aplicación.",
    ),
  },
  {
    id: "identity",
    name: text("Identity", "Identidad"),
    description: text(
      "Session and organization reports beside your authentication module.",
      "Informes de sesión y organización junto a tu módulo de autenticación.",
    ),
  },
  {
    id: "commerce",
    name: text("Commerce", "Comercio"),
    description: text(
      "Reconciled billing reports beside your checkout module.",
      "Informes conciliados junto a tu módulo de checkout.",
    ),
  },
  {
    id: "files",
    name: text("Files & media", "Archivos y media"),
    description: text(
      "Upload targets, assets and transformations.",
      "Destinos de subida, recursos y transformaciones.",
    ),
  },
  {
    id: "email",
    name: text("Transactional email", "Email transaccional"),
    description: text(
      "Templates, reviewed delivery and delivery status.",
      "Plantillas, envío revisado y estado de entrega.",
    ),
  },
  {
    id: "observability",
    name: text("Analytics & diagnostics", "Analítica y diagnóstico"),
    description: text(
      "Events, flags, errors, traces and evaluation reports.",
      "Eventos, flags, errores, trazas e informes de evaluación.",
    ),
  },
  {
    id: "notifications",
    name: text("Notification inboxes", "Bandejas de notificaciones"),
    description: text(
      "Subscriber feeds, preferences and workflow delivery.",
      "Feeds, preferencias y entrega por workflows.",
    ),
  },
  {
    id: "jobs",
    name: text("Background work", "Trabajo en segundo plano"),
    description: text(
      "Durable runs, progress, cancellation and logs.",
      "Ejecuciones duraderas, progreso, cancelación y logs.",
    ),
  },
  {
    id: "collaboration",
    name: text("Realtime & collaboration", "Tiempo real y colaboración"),
    description: text(
      "Authorized channels, rooms and shared documents.",
      "Canales, salas y documentos compartidos autorizados.",
    ),
  },
  {
    id: "content",
    name: text("Document editing", "Edición de documentos"),
    description: text(
      "Editor-specific documents and consumer persistence.",
      "Documentos del editor y persistencia del consumidor.",
    ),
  },
  {
    id: "search",
    name: text("Search", "Búsqueda"),
    description: text(
      "Scoped search, indexes and ingestion status.",
      "Búsqueda acotada, índices y estado de ingesta.",
    ),
  },
  {
    id: "maps",
    name: text("Maps", "Mapas"),
    description: text(
      "Styles and selected geospatial services.",
      "Estilos y servicios geográficos seleccionados.",
    ),
  },
  {
    id: "ai",
    name: text("AI models & transport", "Modelos y transporte AI"),
    description: text(
      "Connection, model and routing reports beside your AI module.",
      "Informes de conexión, modelos y rutas junto a tu módulo AI.",
    ),
  },
  {
    id: "knowledge",
    name: text("Knowledge & retrieval", "Conocimiento y recuperación"),
    description: text(
      "Authorized sources, vector ingestion and retrieval.",
      "Fuentes autorizadas, ingesta vectorial y recuperación.",
    ),
  },
  {
    id: "agents",
    name: text("Agents & tools", "Agentes y herramientas"),
    description: text(
      "Approved tools, agent runs and checkpoints.",
      "Herramientas aprobadas, agentes y checkpoints.",
    ),
  },
  {
    id: "connectors",
    name: text("Product connectors", "Conectores de producto"),
    description: text(
      "Selected external resources and reviewed business actions.",
      "Recursos externos seleccionados y acciones de negocio revisadas.",
    ),
  },
  {
    id: "automation",
    name: text("Automation", "Automatización"),
    description: text(
      "Predefined workflows, mappings and run receipts.",
      "Workflows predefinidos, mapeos y recibos de ejecución.",
    ),
  },
];

export const integrationDefinitions: readonly IntegrationDefinition[] = [
  // Concrete recipes are kept in catalogue order for traceable coverage.
  define({
    id: "tanstack-query",
    family: "data",
    description: text(
      "Query and mutation lifecycle over your application's API, with controlled pagination and cache invalidation.",
      "Ciclo de consultas y mutaciones sobre la API de tu aplicación, con paginación controlada e invalidación de caché.",
    ),
    options: [
      option(
        "tanstack-query",
        "TanStack Query",
        "Client cache; your API supplies persistence.",
        "Caché cliente; tu API aporta persistencia.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "apiResourceRef",
        "Application API resource",
        "Recurso API de aplicación",
        "text",
        true,
      ),
      field(
        "queryKeyPrefix",
        "Cache namespace",
        "Espacio de caché",
        "text",
        true,
      ),
      field("pageSize", "Page size", "Tamaño de página", "number"),
    ],
    permissions: [
      permission(
        "queries.read",
        "Read API results",
        "Leer resultados API",
        true,
      ),
      permission(
        "records.write",
        "Mutate application records",
        "Modificar registros de aplicación",
      ),
    ],
    resourceTypes: ["api-resource", "query"],
    resourceLabel: text("API resources", "Recursos API"),
    actions: [
      allow(
        "queries.read",
        action(
          "query-page",
          "query",
          "Query a page",
          "Consultar una página",
          "Apply filters and a cursor through the consumer API; the UI owns no database connection.",
          "Aplica filtros y cursor mediante la API; la UI no posee conexión a base de datos.",
          [
            searchText,
            field("cursor", "Page cursor", "Cursor de página"),
            limit,
          ],
        ),
      ),
      allow(
        "records.write",
        action(
          "save-record",
          "save-record",
          "Save and invalidate",
          "Guardar e invalidar",
          "Submit a validated API mutation, then invalidate the configured query namespace.",
          "Envía una mutación validada y después invalida el espacio de consultas.",
          [recordId, name, state],
        ),
      ),
    ],
    serviceNote: text(
      "MIT cache library, not a database. The consumer installs it if desired and supplies authenticated queries, mutations, retry policy and cache isolation.",
      "Biblioteca de caché MIT, no una base de datos. El consumidor la instala si lo desea y aporta consultas, mutaciones, reintentos y aislamiento de caché.",
    ),
  }),
  define({
    id: "supabase-data",
    family: "data",
    description: text(
      "Application tables through Supabase, with project, schema and row-policy boundaries.",
      "Tablas de aplicación mediante Supabase, con límites de proyecto, esquema y políticas de filas.",
    ),
    options: [
      option(
        "supabase-data",
        "Supabase Database",
        "Postgres data API; Auth, Storage and Realtime are separate recipes.",
        "API de datos Postgres; Auth, Storage y Realtime son recetas separadas.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "projectRef",
        "Supabase project reference",
        "Referencia de proyecto Supabase",
        "text",
        true,
      ),
      field("schema", "Allowed schema", "Esquema permitido", "text", true),
      field("table", "Allowed table", "Tabla permitida", "text", true),
    ],
    permissions: [
      permission(
        "rows.read",
        "Read authorized rows",
        "Leer filas autorizadas",
        true,
      ),
      permission(
        "rows.write",
        "Write authorized rows",
        "Escribir filas autorizadas",
      ),
    ],
    resourceTypes: ["table", "view"],
    resourceLabel: text("Tables and views", "Tablas y vistas"),
    actions: [
      allow(
        "rows.read",
        action(
          "query-rows",
          "query",
          "Query authorized rows",
          "Consultar filas autorizadas",
          "Use an allowlisted table and row policies; server service-role credentials never enter this form.",
          "Usa una tabla permitida y políticas de filas; las credenciales service-role no entran en este formulario.",
          [searchText, limit, field("cursor", "Row cursor", "Cursor de filas")],
        ),
      ),
      allow(
        "rows.write",
        action(
          "save-row",
          "save-record",
          "Save a row",
          "Guardar una fila",
          "The consumer validates columns and applies RLS or equivalent backend authorization.",
          "El consumidor valida columnas y aplica RLS o autorización equivalente del backend.",
          [recordId, name, state],
        ),
      ),
    ],
    serviceNote: text(
      "MIT JavaScript SDK; hosted Supabase terms are separate. The consumer chooses a browser client with appropriate RLS or a backend adapter and supplies pagination and schema validation.",
      "SDK JavaScript MIT; el servicio Supabase tiene condiciones separadas. El consumidor elige cliente con RLS adecuado o adaptador backend y aporta paginación y validación.",
    ),
  }),
  define({
    id: "better-auth",
    family: "identity",
    description: text(
      "Own-server identity connection with session, organization and recovery reports beside the injected AuthAdapter.",
      "Conexión de identidad con servidor propio e informes de sesión, organización y recuperación junto al AuthAdapter inyectado.",
    ),
    options: [
      option(
        "better-auth",
        "Better Auth",
        "Consumer-operated authentication server and database.",
        "Servidor de autenticación y base de datos operados por el consumidor.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "authServiceRef",
        "Authentication service reference",
        "Referencia de servicio de autenticación",
        "text",
        true,
      ),
      field(
        "organizationRef",
        "Organization reference",
        "Referencia de organización",
      ),
      field(
        "sessionPolicyRef",
        "Session policy reference",
        "Referencia de política de sesión",
      ),
    ],
    permissions: [
      permission(
        "identity.read",
        "Inspect identity state",
        "Consultar estado de identidad",
        true,
      ),
    ],
    resourceTypes: ["organization", "auth-policy"],
    resourceLabel: text(
      "Organizations and policies",
      "Organizaciones y políticas",
    ),
    actions: [
      allow("identity.read", sessionReport),
      allow(
        "identity.read",
        action(
          "organization-report",
          "query",
          "Inspect organization membership",
          "Consultar membresía de organización",
          "Read membership and configured recovery capabilities from the consumer authentication service.",
          "Consulta membresía y capacidades de recuperación configuradas en el servicio del consumidor.",
          [
            field(
              "organizationRef",
              "Organization reference",
              "Referencia de organización",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "MIT framework. The consumer supplies its server, database, cookies, provider callbacks and recovery policy; sign-in and account writes belong to the existing injected authentication module.",
      "Framework MIT. El consumidor aporta servidor, base de datos, cookies, callbacks y recuperación; el acceso y los cambios de cuenta pertenecen al módulo de autenticación inyectado.",
    ),
  }),
  define({
    id: "clerk",
    family: "identity",
    description: text(
      "Managed identity with authorized user and organization reports, using your selected Clerk application.",
      "Identidad gestionada con informes autorizados de usuarios y organizaciones para tu aplicación Clerk.",
    ),
    options: [
      option(
        "clerk",
        "Clerk",
        "Managed identity alternative; select one authentication provider.",
        "Alternativa de identidad gestionada; elige un proveedor de autenticación.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "applicationRef",
        "Clerk application reference",
        "Referencia de aplicación Clerk",
        "text",
        true,
      ),
      field(
        "organizationRef",
        "Organization reference",
        "Referencia de organización",
      ),
      select("environment", "Environment", "Entorno", [
        ["development", "Development", "Desarrollo"],
        ["production", "Production", "Producción"],
      ]),
    ],
    permissions: [
      permission(
        "identity.read",
        "Inspect identity state",
        "Consultar estado de identidad",
        true,
      ),
    ],
    resourceTypes: ["organization", "application"],
    resourceLabel: text(
      "Applications and organizations",
      "Aplicaciones y organizaciones",
    ),
    actions: [
      allow("identity.read", sessionReport),
      allow(
        "identity.read",
        action(
          "membership-report",
          "query",
          "Inspect managed memberships",
          "Consultar membresías gestionadas",
          "Read the backend's authorized Clerk organization and invitation state; this action does not create invitations.",
          "Consulta organizaciones e invitaciones autorizadas desde el backend; esta acción no crea invitaciones.",
          [
            field(
              "organizationRef",
              "Organization reference",
              "Referencia de organización",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "MIT Next.js SDK; managed identity, organization features and service terms are separate. Consumer SDK setup and authentication routes are outside this static frontend.",
      "SDK Next.js MIT; identidad gestionada, funciones de organización y condiciones del servicio son separadas. La configuración SDK y rutas de autenticación pertenecen al consumidor.",
    ),
  }),
  define({
    id: "supabase-auth",
    family: "identity",
    description: text(
      "Supabase identity as an independent BaaS authentication choice, with session and configured-provider inspection.",
      "Identidad Supabase como elección de autenticación BaaS independiente, con consulta de sesión y proveedores configurados.",
    ),
    options: [
      option(
        "supabase-auth",
        "Supabase Auth",
        "Use Supabase identity without automatically enabling its data or storage recipes.",
        "Usa identidad Supabase sin activar automáticamente datos ni almacenamiento.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "projectRef",
        "Supabase project reference",
        "Referencia de proyecto Supabase",
        "text",
        true,
      ),
      field(
        "redirectProfileRef",
        "Approved redirect profile",
        "Perfil de redirección autorizado",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "identity.read",
        "Inspect identity state",
        "Consultar estado de identidad",
        true,
      ),
    ],
    resourceTypes: ["auth-project", "redirect-profile"],
    resourceLabel: text(
      "Auth projects and redirect profiles",
      "Proyectos Auth y perfiles de redirección",
    ),
    actions: [
      allow("identity.read", sessionReport),
      allow(
        "identity.read",
        action(
          "provider-report",
          "query",
          "Inspect enabled sign-in providers",
          "Consultar proveedores de acceso",
          "Report the consumer's enabled providers and redirect policy, without starting sign-in or exposing tokens.",
          "Informa de proveedores y redirecciones habilitados sin iniciar acceso ni exponer tokens.",
          [],
        ),
      ),
    ],
    serviceNote: text(
      "MIT clients; hosted BaaS terms are separate. The consumer injects browser sign-in or server cookie handling as appropriate, with redirect checks and session recovery.",
      "Clientes MIT; el BaaS alojado tiene condiciones separadas. El consumidor inyecta acceso de navegador o cookies de servidor según corresponda, con validación de redirecciones y recuperación.",
    ),
  }),
  define({
    id: "authjs-nextauth",
    family: "identity",
    description: text(
      "Connection and migration inspection for an application that already uses Auth.js or NextAuth.",
      "Conexión e inspección de migración para aplicaciones que ya usan Auth.js o NextAuth.",
    ),
    options: [
      option(
        "authjs-nextauth",
        "Auth.js / NextAuth",
        "Existing application authentication and migration reference.",
        "Referencia de autenticación existente y migración.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "authServiceRef",
        "Existing auth service",
        "Servicio Auth existente",
        "text",
        true,
      ),
      select(
        "sessionStrategy",
        "Configured session strategy",
        "Estrategia de sesión configurada",
        [
          ["database", "Database", "Base de datos"],
          ["jwt", "JWT", "JWT"],
        ],
      ),
      field(
        "adapterRef",
        "Server database adapter reference",
        "Referencia de adaptador de base de datos",
      ),
    ],
    permissions: [
      permission(
        "identity.read",
        "Inspect identity state",
        "Consultar estado de identidad",
        true,
      ),
    ],
    resourceTypes: ["auth-service", "session-policy"],
    resourceLabel: text(
      "Existing authentication configuration",
      "Configuración de autenticación existente",
    ),
    actions: [
      allow("identity.read", sessionReport),
      allow(
        "identity.read",
        action(
          "migration-report",
          "query",
          "Inspect migration requirements",
          "Consultar requisitos de migración",
          "Report configured callbacks, session strategy and consumer migration tasks; no provider migration runs here.",
          "Informa de callbacks, estrategia de sesión y tareas de migración; aquí no se ejecuta ninguna migración.",
          [],
        ),
      ),
    ],
    serviceNote: text(
      "ISC package. Auth.js maintenance and security work must be checked for the chosen release; acquisition alone does not establish deprecation. Consumer server routes and adapters remain required.",
      "Paquete ISC. El mantenimiento y las actualizaciones de seguridad dependen de la versión elegida; una adquisición no implica deprecación. Se necesitan rutas y adaptadores del servidor consumidor.",
    ),
  }),
  define({
    id: "enterprise-identity",
    family: "identity",
    description: text(
      "Choose WorkOS AuthKit or Auth0 for enterprise identity reports and organization policy inspection.",
      "Elige WorkOS AuthKit o Auth0 para informes de identidad empresarial y políticas de organización.",
    ),
    options: [
      option(
        "workos",
        "WorkOS AuthKit",
        "Managed identity and selected enterprise SSO capabilities.",
        "Identidad gestionada y capacidades SSO empresariales seleccionadas.",
      ),
      option(
        "auth0",
        "Auth0",
        "Managed identity with tenant and organization policies.",
        "Identidad gestionada con políticas de tenant y organización.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "tenantRef",
        "Identity tenant reference",
        "Referencia de tenant de identidad",
        "text",
        true,
      ),
      field(
        "organizationRef",
        "Organization reference",
        "Referencia de organización",
      ),
      field(
        "ssoPolicyRef",
        "Enterprise SSO policy",
        "Política SSO empresarial",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "identity.read",
        "Inspect identity state",
        "Consultar estado de identidad",
        true,
      ),
    ],
    resourceTypes: ["organization", "sso-connection"],
    resourceLabel: text(
      "Organizations and SSO connections",
      "Organizaciones y conexiones SSO",
    ),
    actions: [
      allow("identity.read", sessionReport),
      allow(
        "identity.read",
        action(
          "sso-report",
          "query",
          "Inspect SSO configuration",
          "Consultar configuración SSO",
          "Read configured enterprise connections and organization policy from the selected provider's consumer adapter.",
          "Consulta conexiones empresariales y políticas desde el adaptador consumidor del proveedor elegido.",
          [
            field(
              "organizationRef",
              "Organization reference",
              "Referencia de organización",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "MIT Next.js SDKs; enterprise features, tenant limits and hosted agreements are separate. Select one provider; the injected auth module supplies callbacks, sessions and account operations.",
      "SDK Next.js MIT; funciones empresariales, límites y acuerdos alojados son separados. Elige un proveedor; el módulo Auth inyectado aporta callbacks, sesiones y operaciones de cuenta.",
    ),
  }),
  define({
    id: "swr",
    family: "data",
    description: text(
      "Fetch and revalidate application resources through SWR, with consumer-controlled optimistic mutations.",
      "Consulta y revalida recursos con SWR y mutaciones optimistas controladas por el consumidor.",
    ),
    options: [
      option(
        "swr",
        "SWR",
        "Client fetch/cache alternative to TanStack Query.",
        "Alternativa cliente de consultas y caché a TanStack Query.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "fetcherRef",
        "Application fetcher reference",
        "Referencia de fetcher",
        "text",
        true,
      ),
      field(
        "cacheNamespace",
        "Cache namespace",
        "Espacio de caché",
        "text",
        true,
      ),
      field(
        "revalidateOnFocus",
        "Revalidate on focus",
        "Revalidar al enfocar",
        "toggle",
      ),
    ],
    permissions: [
      permission(
        "queries.read",
        "Read fetcher results",
        "Leer resultados del fetcher",
        true,
      ),
      permission(
        "records.write",
        "Submit API mutations",
        "Enviar mutaciones API",
      ),
    ],
    resourceTypes: ["api-resource", "cache-key"],
    resourceLabel: text("Fetcher resources", "Recursos del fetcher"),
    actions: [
      allow(
        "queries.read",
        action(
          "revalidate-resource",
          "query",
          "Read and revalidate",
          "Leer y revalidar",
          "Resolve an authorized fetcher key and refresh its application data.",
          "Resuelve una clave de fetcher autorizada y actualiza sus datos.",
          [resource, searchText],
        ),
      ),
      allow(
        "records.write",
        action(
          "mutate-resource",
          "save-record",
          "Submit an optimistic update",
          "Enviar una actualización optimista",
          "The consumer commits the API mutation and defines rollback/revalidation; SWR does not supply persistence.",
          "El consumidor confirma la mutación y define rollback/revalidación; SWR no aporta persistencia.",
          [recordId, name, state],
        ),
      ),
    ],
    serviceNote: text(
      "MIT library. Consumer fetchers, API authentication, cache scoping and optimistic rollback are required; SDK selection is optional.",
      "Biblioteca MIT. Se necesitan fetchers, autenticación API, aislamiento de caché y rollback del consumidor; la elección SDK es opcional.",
    ),
  }),
  define({
    id: "neon-drizzle",
    family: "data",
    description: text(
      "Server-owned Postgres data access: Neon supplies database connectivity and Drizzle supplies typed SQL mapping.",
      "Acceso Postgres del servidor: Neon aporta conectividad y Drizzle mapeo SQL tipado.",
    ),
    options: [
      option(
        "neon",
        "Neon serverless driver",
        "Database/driver role; an ORM may be used alongside it.",
        "Rol de base de datos/driver; puede combinarse con un ORM.",
      ),
      option(
        "drizzle",
        "Drizzle ORM",
        "Typed SQL role; consumer supplies a database driver.",
        "Rol de SQL tipado; el consumidor aporta el driver.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "databaseRef",
        "Backend database reference",
        "Referencia de base de datos backend",
        "text",
        true,
      ),
      field("branchRef", "Neon branch reference", "Referencia de rama Neon"),
      field("schema", "Allowed schema", "Esquema permitido", "text", true),
      field("table", "Mapped table", "Tabla mapeada", "text", true),
    ],
    permissions: [
      permission("rows.read", "Read mapped rows", "Leer filas mapeadas", true),
      permission("rows.write", "Write mapped rows", "Escribir filas mapeadas"),
    ],
    resourceTypes: ["table", "database-branch"],
    resourceLabel: text(
      "Mapped database resources",
      "Recursos de base de datos mapeados",
    ),
    actions: [
      allow(
        "rows.read",
        action(
          "query-mapped-table",
          "query",
          "Query mapped table",
          "Consultar tabla mapeada",
          "Use consumer-prepared SQL with tenant filters; arbitrary SQL and database URLs are not accepted.",
          "Usa SQL preparado y filtros de tenant; no acepta SQL arbitrario ni URLs de base de datos.",
          [searchText, limit],
        ),
      ),
      allow(
        "rows.write",
        action(
          "save-mapped-row",
          "save-record",
          "Save mapped row",
          "Guardar fila mapeada",
          "Validate the server schema and transaction policy before writing.",
          "Valida esquema de servidor y política de transacciones antes de escribir.",
          [recordId, name, state],
        ),
      ),
    ],
    serviceNote: text(
      "Neon driver MIT; Drizzle Apache-2.0. These roles can complement each other, not replace hosting with an ORM. Consumer runtime, driver compatibility, transactions and migrations require verification.",
      "Driver Neon MIT; Drizzle Apache-2.0. Los roles son complementarios; un ORM no sustituye alojamiento. El consumidor verifica runtime, driver, transacciones y migraciones.",
    ),
  }),
  define({
    id: "prisma",
    family: "data",
    description: text(
      "Schema-driven record access through the consumer's generated Prisma client and selected driver.",
      "Acceso a registros según esquema mediante Prisma Client generado y driver del consumidor.",
    ),
    options: [
      option(
        "prisma",
        "Prisma ORM",
        "Server ORM, separate from database hosting.",
        "ORM de servidor, separado del alojamiento de base de datos.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "databaseRef",
        "Backend database reference",
        "Referencia de base de datos backend",
        "text",
        true,
      ),
      field(
        "model",
        "Allowed Prisma model",
        "Modelo Prisma permitido",
        "text",
        true,
      ),
      field(
        "driverRef",
        "Driver adapter reference",
        "Referencia de adaptador de driver",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "models.read",
        "Read model records",
        "Leer registros del modelo",
        true,
      ),
      permission(
        "models.write",
        "Write model records",
        "Escribir registros del modelo",
      ),
    ],
    resourceTypes: ["prisma-model"],
    resourceLabel: text("Prisma models", "Modelos Prisma"),
    actions: [
      allow(
        "models.read",
        action(
          "query-model",
          "query",
          "Query model records",
          "Consultar registros del modelo",
          "The consumer maps safe filters to its generated client, including workspace restrictions.",
          "El consumidor mapea filtros seguros al cliente generado con restricciones de espacio.",
          [searchText, limit],
        ),
      ),
      allow(
        "models.write",
        action(
          "save-model-record",
          "save-record",
          "Save model record",
          "Guardar registro del modelo",
          "Apply model validation and transactions on the consumer server.",
          "Aplica validación del modelo y transacciones en el servidor consumidor.",
          [recordId, name, state],
        ),
      ),
    ],
    serviceNote: text(
      "Apache-2.0 client. The consumer supplies client generation, database driver, schema migrations and a compatible server runtime; none is bundled or tested by this frontend.",
      "Cliente Apache-2.0. El consumidor aporta generación, driver, migraciones y runtime compatible; este frontend no incluye ni prueba estos componentes.",
    ),
  }),
  define({
    id: "firebase",
    family: "data",
    description: text(
      "Firestore document operations scoped to an existing Firebase project and consumer rules.",
      "Operaciones de documentos Firestore acotadas a un proyecto Firebase y reglas del consumidor.",
    ),
    options: [
      option(
        "firebase",
        "Firebase / Firestore",
        "Document data model; identity is a separate consumer decision.",
        "Modelo documental; la identidad es una decisión separada.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "projectRef",
        "Firebase project reference",
        "Referencia de proyecto Firebase",
        "text",
        true,
      ),
      field(
        "collection",
        "Allowed collection",
        "Colección permitida",
        "text",
        true,
      ),
      field(
        "rulesProfileRef",
        "Security rules profile",
        "Perfil de reglas de seguridad",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "documents.read",
        "Read authorized documents",
        "Leer documentos autorizados",
        true,
      ),
      permission(
        "documents.write",
        "Write authorized documents",
        "Escribir documentos autorizados",
      ),
    ],
    resourceTypes: ["firestore-collection"],
    resourceLabel: text("Firestore collections", "Colecciones Firestore"),
    actions: [
      allow(
        "documents.read",
        action(
          "query-collection",
          "query",
          "Query collection",
          "Consultar colección",
          "Use the consumer's allowlisted queries and document rules, including required indexes.",
          "Usa consultas permitidas y reglas documentales del consumidor con los índices necesarios.",
          [searchText, limit],
        ),
      ),
      allow(
        "documents.write",
        action(
          "save-firestore-document",
          "save-record",
          "Save Firestore document",
          "Guardar documento Firestore",
          "Validate document fields under the consumer's authorization and conflict policy.",
          "Valida campos según autorización y política de conflictos del consumidor.",
          [recordId, name, state],
        ),
      ),
    ],
    serviceNote: text(
      "Apache-2.0 browser SDK; managed service terms are separate. Consumer security rules, indexes and optional privileged Admin/server operations must be configured outside this module.",
      "SDK de navegador Apache-2.0; el servicio gestionado tiene condiciones separadas. Reglas, índices y operaciones Admin privilegiadas se configuran fuera de este módulo.",
    ),
  }),
  define({
    id: "convex",
    family: "data",
    description: text(
      "Reactive data through authenticated functions defined in your Convex deployment.",
      "Datos reactivos mediante funciones autenticadas definidas en tu despliegue Convex.",
    ),
    options: [
      option(
        "convex",
        "Convex",
        "Reactive application backend with optional subscriptions.",
        "Backend reactivo con suscripciones opcionales.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "deploymentRef",
        "Convex deployment reference",
        "Referencia de despliegue Convex",
        "text",
        true,
      ),
      field(
        "queryRef",
        "Allowlisted query function",
        "Función de consulta permitida",
        "text",
        true,
      ),
      field(
        "mutationRef",
        "Allowlisted mutation function",
        "Función de mutación permitida",
      ),
    ],
    permissions: [
      permission(
        "functions.read",
        "Call authorized queries",
        "Ejecutar consultas autorizadas",
        true,
      ),
      permission(
        "functions.write",
        "Call authorized mutations",
        "Ejecutar mutaciones autorizadas",
      ),
    ],
    resourceTypes: ["convex-function", "table"],
    resourceLabel: text("Deployment functions", "Funciones del despliegue"),
    actions: [
      allow(
        "functions.read",
        action(
          "query-function",
          "query",
          "Call configured query",
          "Ejecutar consulta configurada",
          "Invoke a consumer-defined authenticated query; subscriptions use the adapter's optional live transport.",
          "Invoca una consulta autenticada del consumidor; las suscripciones usan el transporte opcional del adaptador.",
          [searchText, limit],
        ),
      ),
      allow(
        "functions.write",
        action(
          "call-mutation",
          "save-record",
          "Call configured mutation",
          "Ejecutar mutación configurada",
          "Invoke only the configured mutation with validated application fields.",
          "Invoca solo la mutación configurada con campos de aplicación validados.",
          [recordId, name, state],
        ),
      ),
    ],
    serviceNote: text(
      "Convex package Apache-2.0; hosted and backend enterprise terms are separate. The consumer deploys functions, identity checks and subscriptions; no deployment is included here.",
      "Paquete Convex Apache-2.0; alojamiento y funciones empresariales tienen condiciones separadas. El consumidor despliega funciones, autorización y suscripciones.",
    ),
  }),
  define({
    id: "trpc",
    family: "data",
    description: text(
      "Typed query and mutation procedures on a consumer-owned TypeScript API router.",
      "Procedimientos de consulta y mutación tipados en un router TypeScript del consumidor.",
    ),
    options: [
      option(
        "trpc",
        "tRPC",
        "Client, server router and TanStack bridge are complementary roles.",
        "Cliente, router de servidor y puente TanStack son roles complementarios.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "routerRef",
        "Backend router reference",
        "Referencia de router backend",
        "text",
        true,
      ),
      field(
        "queryProcedure",
        "Allowed query procedure",
        "Procedimiento de consulta permitido",
        "text",
        true,
      ),
      field(
        "mutationProcedure",
        "Allowed mutation procedure",
        "Procedimiento de mutación permitido",
      ),
    ],
    permissions: [
      permission(
        "procedures.read",
        "Invoke query procedures",
        "Invocar procedimientos de consulta",
        true,
      ),
      permission(
        "procedures.write",
        "Invoke mutation procedures",
        "Invocar procedimientos de mutación",
      ),
    ],
    resourceTypes: ["rpc-procedure"],
    resourceLabel: text("Allowed procedures", "Procedimientos permitidos"),
    actions: [
      allow(
        "procedures.read",
        action(
          "query-procedure",
          "query",
          "Invoke query procedure",
          "Invocar procedimiento de consulta",
          "Use the configured procedure's schema and consumer context, rather than an arbitrary method name.",
          "Usa esquema y contexto del procedimiento configurado, no un nombre de método arbitrario.",
          [searchText, limit],
        ),
      ),
      allow(
        "procedures.write",
        action(
          "mutate-procedure",
          "save-record",
          "Invoke mutation procedure",
          "Invocar procedimiento de mutación",
          "Validate input with the consumer router and enforce its workspace authorization.",
          "Valida entrada con el router consumidor y aplica su autorización de espacio.",
          [recordId, name, state],
        ),
      ),
    ],
    serviceNote: text(
      "MIT packages. The consumer supplies router schemas, context authentication and server transport; typed declarations alone do not establish runtime compatibility.",
      "Paquetes MIT. El consumidor aporta esquemas, contexto de autenticación y transporte servidor; las declaraciones tipadas no prueban compatibilidad runtime.",
    ),
  }),
  define({
    id: "stripe",
    family: "commerce",
    description: text(
      "Billing and reconciliation reports beside Aureform's existing injected Stripe commerce adapter.",
      "Informes de facturación y conciliación junto al adaptador de comercio Stripe inyectado existente.",
    ),
    options: [
      option(
        "stripe",
        "Stripe",
        "Payment processor; merchant responsibilities remain with the consumer.",
        "Procesador de pagos; las responsabilidades del comerciante son del consumidor.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "accountRef",
        "Stripe account reference",
        "Referencia de cuenta Stripe",
        "text",
        true,
      ),
      select("environment", "Environment", "Entorno", [
        ["test", "Test", "Pruebas"],
        ["live", "Live", "Producción"],
      ]),
      field(
        "catalogueRef",
        "Backend price catalogue",
        "Catálogo de precios del backend",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "commerce.read",
        "Inspect billing state",
        "Consultar facturación",
        true,
      ),
    ],
    resourceTypes: ["product", "subscription"],
    resourceLabel: text(
      "Products and subscriptions",
      "Productos y suscripciones",
    ),
    actions: [
      allow("commerce.read", billingReport),
      allow(
        "commerce.read",
        action(
          "webhook-report",
          "query",
          "Inspect reconciliation status",
          "Consultar estado de conciliación",
          "Read consumer webhook delivery and fulfillment status; this does not replay webhooks or create payments.",
          "Consulta entrega de webhooks y estado de entrega del consumidor; no reenvía webhooks ni crea pagos.",
          [period],
        ),
      ),
    ],
    serviceNote: text(
      "MIT SDKs. The consumer supplies secret-key checkout/portal routes, allowlisted prices, webhook verification and idempotent fulfillment through the injected commerce module.",
      "SDK MIT. El consumidor aporta rutas checkout/portal con claves secretas, precios permitidos, verificación de webhooks y entrega idempotente mediante el módulo de comercio.",
    ),
  }),
  define({
    id: "paddle",
    family: "commerce",
    description: text(
      "Paddle Merchant of Record customer and subscription reports alongside a consumer-supplied checkout module.",
      "Informes de clientes y suscripciones Paddle Merchant of Record junto al módulo checkout del consumidor.",
    ),
    options: [
      option(
        "paddle",
        "Paddle",
        "Merchant of Record alternative with its own checkout and webhook model.",
        "Alternativa Merchant of Record con su propio modelo checkout y webhooks.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "sellerRef",
        "Paddle seller reference",
        "Referencia de vendedor Paddle",
        "text",
        true,
      ),
      select("environment", "Environment", "Entorno", [
        ["sandbox", "Sandbox", "Sandbox"],
        ["production", "Production", "Producción"],
      ]),
      field(
        "catalogueRef",
        "Paddle catalogue reference",
        "Referencia de catálogo Paddle",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "commerce.read",
        "Inspect billing state",
        "Consultar facturación",
        true,
      ),
    ],
    resourceTypes: ["product", "subscription"],
    resourceLabel: text(
      "Paddle products and subscriptions",
      "Productos y suscripciones Paddle",
    ),
    actions: [
      allow("commerce.read", billingReport),
      allow(
        "commerce.read",
        action(
          "transaction-report",
          "query",
          "Inspect transaction reconciliation",
          "Consultar conciliación de transacciones",
          "Read the consumer's Paddle transaction and entitlement reconciliation, without opening checkout.",
          "Consulta conciliación de transacciones y derechos Paddle del consumidor sin abrir checkout.",
          [
            field(
              "transactionRef",
              "Transaction reference",
              "Referencia de transacción",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "Apache-2.0 SDK references; MoR eligibility and service agreements are separate. Browser Paddle.js and server subscription/webhook handling have distinct roles and require a consumer integration.",
      "Referencias SDK Apache-2.0; elegibilidad MoR y acuerdos de servicio son separados. Paddle.js de navegador y gestión servidor de suscripciones/webhooks requieren integración del consumidor.",
    ),
  }),
  define({
    id: "polar",
    family: "commerce",
    description: text(
      "Polar Merchant of Record subscription and entitlement inspection using your consumer backend.",
      "Consulta de suscripciones y derechos Polar Merchant of Record mediante tu backend consumidor.",
    ),
    options: [
      option(
        "polar",
        "Polar",
        "MoR alternative with hosted checkout and customer-state flows.",
        "Alternativa MoR con checkout alojado y flujos de estado del cliente.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "organizationRef",
        "Polar organization reference",
        "Referencia de organización Polar",
        "text",
        true,
      ),
      field(
        "catalogueRef",
        "Product catalogue reference",
        "Referencia de catálogo de productos",
        "text",
        true,
      ),
      field("benefitPolicyRef", "Entitlement policy", "Política de derechos"),
    ],
    permissions: [
      permission(
        "commerce.read",
        "Inspect billing state",
        "Consultar facturación",
        true,
      ),
    ],
    resourceTypes: ["product", "benefit"],
    resourceLabel: text("Products and benefits", "Productos y beneficios"),
    actions: [
      allow("commerce.read", billingReport),
      allow(
        "commerce.read",
        action(
          "entitlement-report",
          "query",
          "Inspect customer entitlements",
          "Consultar derechos del cliente",
          "Read the consumer's authorized customer-state and benefit mapping; no grant or revocation runs in this workbench.",
          "Consulta estado de cliente y mapeo de beneficios autorizados; esta mesa no concede ni revoca derechos.",
          [
            field(
              "customerRef",
              "Customer reference",
              "Referencia de cliente",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "MIT SDK; hosted MoR and benefit/service agreements are separate. The injected commerce module supplies hosted redirects, consumer identity mapping, webhooks and fulfillment.",
      "SDK MIT; acuerdos MoR, beneficios y servicio son separados. El módulo de comercio aporta redirecciones alojadas, mapeo de identidad, webhooks y entrega.",
    ),
  }),
  define({
    id: "lemon-squeezy",
    family: "commerce",
    description: text(
      "Existing Lemon Squeezy store subscription and digital-product fulfillment reports.",
      "Informes de suscripciones y entrega de productos digitales de una tienda Lemon Squeezy existente.",
    ),
    options: [
      option(
        "lemon-squeezy",
        "Lemon Squeezy",
        "Additional MoR option for an existing store integration.",
        "Opción MoR adicional para una integración de tienda existente.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "storeRef",
        "Store reference",
        "Referencia de tienda",
        "text",
        true,
      ),
      field(
        "variantCatalogueRef",
        "Variant catalogue reference",
        "Referencia de catálogo de variantes",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "commerce.read",
        "Inspect billing state",
        "Consultar facturación",
        true,
      ),
    ],
    resourceTypes: ["product-variant", "subscription"],
    resourceLabel: text(
      "Store variants and subscriptions",
      "Variantes y suscripciones de tienda",
    ),
    actions: [
      allow("commerce.read", billingReport),
      allow(
        "commerce.read",
        action(
          "fulfillment-report",
          "query",
          "Inspect store fulfillment",
          "Consultar entrega de tienda",
          "Read reconciled order and license-delivery status from the consumer's store adapter.",
          "Consulta pedidos conciliados y estado de entrega de licencias desde el adaptador de tienda.",
          [
            field(
              "orderRef",
              "Order reference",
              "Referencia de pedido",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "MIT SDK; MoR service terms are separate. Consumer transport, store/variant allowlists and signed webhooks are required; Stripe-specific URL and price validation cannot be reused unchanged.",
      "SDK MIT; condiciones MoR separadas. Se necesitan transporte, listas de tienda/variantes y webhooks firmados; la validación de URLs y precios Stripe no se reutiliza sin cambios.",
    ),
  }),
  define({
    id: "s3-r2-storage",
    family: "files",
    description: text(
      "Authorized object uploads to Amazon S3 or Cloudflare R2, signed by the consumer backend.",
      "Subidas autorizadas a Amazon S3 o Cloudflare R2 firmadas por el backend consumidor.",
    ),
    options: [
      option(
        "amazon-s3",
        "Amazon S3",
        "AWS bucket and region; server-side signing.",
        "Bucket y región AWS; firma en servidor.",
      ),
      option(
        "cloudflare-r2",
        "Cloudflare R2",
        "R2 bucket through its S3-compatible API; account configuration stays on the server.",
        "Bucket R2 por API compatible S3; la cuenta se configura en servidor.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field("bucket", "Authorized bucket", "Bucket autorizado", "text", true),
      field(
        "region",
        "Region or configured R2 auto region",
        "Región o región auto R2 configurada",
        "text",
        true,
      ),
      field(
        "keyPrefix",
        "Allowed object prefix",
        "Prefijo de objetos permitido",
        "text",
        true,
      ),
      field(
        "uploadPolicyRef",
        "Upload policy reference",
        "Referencia de política de subida",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "assets.read",
        "Inspect authorized objects",
        "Consultar objetos autorizados",
        true,
      ),
      permission(
        "assets.upload",
        "Upload authorized objects",
        "Subir objetos autorizados",
      ),
    ],
    resourceTypes: ["bucket", "object-prefix"],
    resourceLabel: text("Buckets and prefixes", "Buckets y prefijos"),
    actions: [
      allow(
        "assets.read",
        action(
          "list-objects",
          "query",
          "List objects",
          "Listar objetos",
          "Read metadata within the selected prefix; signed URLs are transport credentials, not persisted configuration.",
          "Consulta metadatos dentro del prefijo; las URLs firmadas son credenciales de transporte, no configuración persistida.",
          [searchText, limit],
        ),
      ),
      allow("assets.upload", uploadPreview),
    ],
    serviceNote: text(
      "AWS client Apache-2.0; S3 and R2 have separate hosted terms. Consumer signing, CORS, expiry, MIME/size limits, object access and cleanup are required; server credentials never enter the browser.",
      "Cliente AWS Apache-2.0; S3 y R2 tienen condiciones alojadas distintas. El consumidor aporta firma, CORS, caducidad, límites, acceso y limpieza; las credenciales servidor no llegan al navegador.",
    ),
  }),
  define({
    id: "supabase-storage",
    family: "files",
    description: text(
      "Storage buckets governed by the consumer's Supabase object policies and upload configuration.",
      "Buckets gobernados por políticas de objetos Supabase y configuración de subida del consumidor.",
    ),
    options: [
      option(
        "supabase-storage",
        "Supabase Storage",
        "Authenticated storage, independently selected from Supabase Auth or Database.",
        "Almacenamiento autenticado elegido independientemente de Auth o Database.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "projectRef",
        "Supabase project reference",
        "Referencia de proyecto Supabase",
        "text",
        true,
      ),
      field("bucket", "Authorized bucket", "Bucket autorizado", "text", true),
      field(
        "pathPrefix",
        "Allowed path prefix",
        "Prefijo de rutas permitido",
        "text",
        true,
      ),
      field(
        "uploadPolicyRef",
        "Object policy reference",
        "Referencia de política de objetos",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "assets.read",
        "Read object metadata",
        "Leer metadatos de objetos",
        true,
      ),
      permission(
        "assets.upload",
        "Upload storage objects",
        "Subir objetos Storage",
      ),
    ],
    resourceTypes: ["storage-bucket", "object-prefix"],
    resourceLabel: text("Storage buckets", "Buckets Storage"),
    actions: [
      allow(
        "assets.read",
        action(
          "query-storage-objects",
          "query",
          "Inspect bucket objects",
          "Consultar objetos del bucket",
          "Read authorized object metadata under the configured path and storage policies.",
          "Lee metadatos autorizados bajo la ruta y políticas configuradas.",
          [searchText, limit],
        ),
      ),
      allow("assets.upload", uploadPreview),
    ],
    serviceNote: text(
      "MIT storage client; hosted terms are separate. The consumer supplies authenticated browser or backend transport, object RLS, private delivery and cleanup. Service-role keys remain server-only.",
      "Cliente Storage MIT; condiciones alojadas separadas. El consumidor aporta transporte autenticado, RLS de objetos, entrega privada y limpieza. Las claves service-role permanecen en servidor.",
    ),
  }),
  define({
    id: "cloudinary",
    family: "files",
    description: text(
      "Media assets with controlled uploads and allowlisted delivery transformations.",
      "Recursos multimedia con subidas controladas y transformaciones de entrega permitidas.",
    ),
    options: [
      option(
        "cloudinary",
        "Cloudinary",
        "Hosted upload and transformation service, not a generic database.",
        "Servicio alojado de subida y transformación, no una base de datos genérica.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field("cloudName", "Cloud name", "Nombre del cloud", "text", true),
      field(
        "folder",
        "Authorized asset folder",
        "Carpeta autorizada",
        "text",
        true,
      ),
      field(
        "uploadPolicyRef",
        "Signed upload policy",
        "Política de subida firmada",
        "text",
        true,
      ),
      field(
        "transformationProfileRef",
        "Approved transformation profile",
        "Perfil de transformación permitido",
      ),
    ],
    permissions: [
      permission(
        "assets.read",
        "Inspect media assets",
        "Consultar recursos multimedia",
        true,
      ),
      permission(
        "assets.upload",
        "Upload media assets",
        "Subir recursos multimedia",
      ),
      permission(
        "assets.transform",
        "Request approved transformations",
        "Solicitar transformaciones permitidas",
      ),
    ],
    resourceTypes: ["media-folder", "transformation-profile"],
    resourceLabel: text(
      "Media folders and profiles",
      "Carpetas y perfiles multimedia",
    ),
    actions: [
      allow(
        "assets.read",
        action(
          "query-media",
          "query",
          "Inspect media assets",
          "Consultar recursos multimedia",
          "Read authorized media metadata and consumer-approved public presentation URLs.",
          "Consulta metadatos y URLs públicas de presentación autorizadas.",
          [searchText, limit],
        ),
      ),
      allow("assets.upload", uploadPreview),
      allow(
        "assets.transform",
        action(
          "request-transformation",
          "update-record",
          "Request an approved transformation",
          "Solicitar transformación permitida",
          "Resolve an allowlisted profile on the backend; this does not accept arbitrary transformation expressions.",
          "Resuelve un perfil permitido en backend; no acepta expresiones arbitrarias.",
          [
            field(
              "assetId",
              "Asset reference",
              "Referencia del recurso",
              "text",
              true,
            ),
            field(
              "profileRef",
              "Transformation profile",
              "Perfil de transformación",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "MIT Node SDK reference, not a browser dependency. Hosted transformations and delivery have separate terms; consumer signatures, allowed presets, moderation and access policy are required.",
      "Referencia SDK Node MIT, no dependencia de navegador. Transformaciones y entrega alojadas tienen condiciones separadas; se necesitan firmas, presets permitidos, moderación y acceso.",
    ),
  }),
  define({
    id: "uploadthing",
    family: "files",
    description: text(
      "Managed uploads through a consumer-authorized UploadThing file route and completion policy.",
      "Subidas gestionadas mediante ruta UploadThing autorizada por el consumidor y política de finalización.",
    ),
    options: [
      option(
        "uploadthing",
        "UploadThing",
        "Server file routes and optional React upload helpers.",
        "Rutas de archivo servidor y helpers React opcionales.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "applicationRef",
        "UploadThing application reference",
        "Referencia de aplicación UploadThing",
        "text",
        true,
      ),
      field(
        "fileRouteRef",
        "Allowed file route",
        "Ruta de archivos permitida",
        "text",
        true,
      ),
      field(
        "completionPolicyRef",
        "Completion callback policy",
        "Política de callback de finalización",
      ),
    ],
    permissions: [
      permission(
        "assets.read",
        "Inspect upload receipts",
        "Consultar recibos de subida",
        true,
      ),
      permission(
        "assets.upload",
        "Upload route-authorized files",
        "Subir archivos autorizados por ruta",
      ),
    ],
    resourceTypes: ["file-route", "upload-receipt"],
    resourceLabel: text("File routes", "Rutas de archivos"),
    actions: [
      allow(
        "assets.read",
        action(
          "upload-receipts",
          "query",
          "Read upload completion status",
          "Leer estado de finalización",
          "Read consumer-verified completion receipts and file ownership for the configured route.",
          "Consulta recibos verificados y propiedad de archivos de la ruta configurada.",
          [since, limit],
        ),
      ),
      allow("assets.upload", uploadPreview),
    ],
    serviceNote: text(
      "MIT server/React packages; hosted service terms are separate. A static frontend does not supply file routes: the consumer supplies authorization middleware, callbacks, limits and ownership checks.",
      "Paquetes servidor/React MIT; condiciones alojadas separadas. El frontend estático no aporta rutas de archivos: el consumidor aporta autorización, callbacks, límites y propiedad.",
    ),
  }),
  define({
    id: "resend-react-email",
    family: "email",
    description: text(
      "Resend delivers transactional mail; React Email separately renders templates. Choose the role you are connecting.",
      "Resend entrega email transaccional; React Email renderiza plantillas por separado. Elige el rol que conectas.",
    ),
    options: [
      option(
        "resend",
        "Resend",
        "Server-side transactional delivery and receipts.",
        "Entrega transaccional y recibos en servidor.",
      ),
      option(
        "react-email",
        "React Email",
        "Template rendering at build/server time; no delivery API.",
        "Renderizado de plantillas en compilación/servidor; sin API de envío.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "templateSetRef",
        "Approved template set",
        "Conjunto de plantillas permitido",
        "text",
        true,
      ),
      field(
        "senderRef",
        "Verified sender reference (Resend)",
        "Referencia de emisor verificado (Resend)",
      ),
      field(
        "renderProfileRef",
        "Template renderer profile",
        "Perfil de renderizado",
      ),
    ],
    permissions: [
      permission(
        "templates.read",
        "Preview approved templates",
        "Previsualizar plantillas permitidas",
        true,
      ),
      permission(
        "email.read",
        "Inspect delivery receipts",
        "Consultar recibos de entrega",
      ),
      permission(
        "email.send",
        "Send transactional messages",
        "Enviar mensajes transaccionales",
      ),
    ],
    resourceTypes: ["email-template", "sender-domain"],
    resourceLabel: text("Templates and senders", "Plantillas y emisores"),
    actions: [
      allow("templates.read", renderEmail),
      allow("email.read", deliveryReport),
      allow("email.send", sendEmail),
    ],
    serviceNote: text(
      "MIT package references; Resend hosted delivery has separate terms. React Email cannot send mail. The observed components 1.0.12 carries a deprecation notice: verify current imports/migration, not product discontinuation.",
      "Referencias de paquetes MIT; la entrega Resend tiene condiciones separadas. React Email no envía email. Components 1.0.12 incluye aviso de deprecación: verifica imports/migración, no fin del producto.",
    ),
  }),
  define({
    id: "email-delivery-alternatives",
    family: "email",
    description: text(
      "Choose Postmark, SendGrid or Amazon SES as a transactional sender, independently of template rendering.",
      "Elige Postmark, SendGrid o Amazon SES como emisor transaccional, independientemente del renderizado.",
    ),
    options: [
      option(
        "postmark",
        "Postmark",
        "Transactional sender with a selected message stream.",
        "Emisor transaccional con flujo de mensajes seleccionado.",
      ),
      option(
        "sendgrid",
        "SendGrid",
        "Delivery through a verified SendGrid sender.",
        "Entrega mediante un emisor SendGrid verificado.",
      ),
      option(
        "amazon-ses",
        "Amazon SES",
        "AWS regional sending identity and delivery setup.",
        "Identidad de envío regional AWS y configuración de entrega.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "senderRef",
        "Verified sender reference",
        "Referencia de emisor verificado",
        "text",
        true,
      ),
      field(
        "templateSetRef",
        "Consumer template set",
        "Conjunto de plantillas del consumidor",
      ),
      field(
        "messageStreamRef",
        "Postmark message stream",
        "Flujo de mensajes Postmark",
      ),
      field("region", "SES region", "Región SES"),
      field(
        "deliveryPolicyRef",
        "Sending and suppression policy",
        "Política de envío y supresión",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "email.read",
        "Inspect templates and delivery",
        "Consultar plantillas y entrega",
        true,
      ),
      permission(
        "email.send",
        "Send transactional messages",
        "Enviar mensajes transaccionales",
      ),
    ],
    resourceTypes: ["sender-identity", "email-template"],
    resourceLabel: text(
      "Sending identities and templates",
      "Identidades de envío y plantillas",
    ),
    actions: [
      allow("email.read", renderEmail),
      allow("email.read", deliveryReport),
      allow("email.send", sendEmail),
    ],
    serviceNote: text(
      "Postmark/SendGrid SDKs MIT; AWS SES client Apache-2.0. Sender verification, region/sandbox restrictions, suppressions and signed delivery callbacks are consumer responsibilities under separate service terms.",
      "SDK Postmark/SendGrid MIT; cliente SES Apache-2.0. Verificación del emisor, región/sandbox, supresiones y callbacks firmados son responsabilidades del consumidor bajo condiciones separadas.",
    ),
  }),
  define({
    id: "sentry",
    family: "observability",
    description: text(
      "Error and performance diagnostics for a selected Sentry project, with explicit sample-event capture.",
      "Diagnóstico de errores y rendimiento para un proyecto Sentry, con captura explícita de eventos de ejemplo.",
    ),
    options: [
      option(
        "sentry",
        "Sentry",
        "Error/performance monitoring, separate from product analytics.",
        "Seguimiento de errores/rendimiento, separado de analítica de producto.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "organizationRef",
        "Sentry organization",
        "Organización Sentry",
        "text",
        true,
      ),
      field(
        "projectRef",
        "Project reference",
        "Referencia de proyecto",
        "text",
        true,
      ),
      field(
        "environment",
        "Application environment",
        "Entorno de aplicación",
        "text",
        true,
      ),
      field(
        "redactionPolicyRef",
        "Redaction policy",
        "Política de filtrado",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "diagnostics.read",
        "Read project diagnostics",
        "Leer diagnóstico del proyecto",
        true,
      ),
      permission(
        "diagnostics.capture",
        "Submit reviewed diagnostic events",
        "Enviar eventos de diagnóstico revisados",
      ),
    ],
    resourceTypes: ["sentry-project", "release"],
    resourceLabel: text(
      "Diagnostic projects and releases",
      "Proyectos de diagnóstico y versiones",
    ),
    actions: [
      allow(
        "diagnostics.read",
        action(
          "issue-report",
          "query",
          "Inspect error issues",
          "Consultar errores",
          "Read authorized issue counts and redacted error records; no instrumentation is enabled by connecting.",
          "Consulta conteos y errores filtrados; conectar no activa instrumentación.",
          [period, searchText],
        ),
      ),
      allow(
        "diagnostics.capture",
        action(
          "capture-sample-error",
          "track-event",
          "Submit a sample diagnostic",
          "Enviar diagnóstico de ejemplo",
          "Submit only reviewed sanitized sample data through the consumer capture path.",
          "Envía solo datos de ejemplo revisados y filtrados mediante la ruta del consumidor.",
          [
            field(
              "event",
              "Diagnostic name",
              "Nombre del diagnóstico",
              "text",
              true,
            ),
            field(
              "description",
              "Sanitized message",
              "Mensaje filtrado",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "JavaScript SDK MIT; Sentry server, CLI and hosted terms differ. Consumer initialization, sampling, source maps, consent and redaction are separate opt-in work; this recipe activates no tracking.",
      "SDK JavaScript MIT; servidor, CLI y alojamiento tienen condiciones distintas. Inicialización, muestreo, source maps, consentimiento y filtrado son trabajo optativo; esta receta no activa tracking.",
    ),
  }),
  define({
    id: "posthog",
    family: "observability",
    description: text(
      "Optional product-event and flag operations with explicit consent and consumer-selected capture policy.",
      "Operaciones opcionales de eventos de producto y flags con consentimiento explícito y política del consumidor.",
    ),
    options: [
      option(
        "posthog",
        "PostHog",
        "Product analytics and flags, distinct from Sentry diagnostics.",
        "Analítica de producto y flags, distinta del diagnóstico Sentry.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "projectRef",
        "PostHog project reference",
        "Referencia de proyecto PostHog",
        "text",
        true,
      ),
      field("region", "Data region", "Región de datos", "text", true),
      field(
        "consentPolicyRef",
        "Consent and capture policy",
        "Política de consentimiento y captura",
        "text",
        true,
      ),
      field("flagNamespace", "Application flag namespace", "Espacio de flags"),
    ],
    permissions: [
      permission(
        "analytics.read",
        "Inspect events and flags",
        "Consultar eventos y flags",
        true,
      ),
      permission(
        "events.capture",
        "Capture reviewed events",
        "Capturar eventos revisados",
      ),
      permission(
        "flags.write",
        "Change approved flag configuration",
        "Cambiar configuración de flags permitida",
      ),
    ],
    resourceTypes: ["analytics-project", "feature-flag"],
    resourceLabel: text(
      "Product projects and flags",
      "Proyectos de producto y flags",
    ),
    actions: [
      allow(
        "analytics.read",
        action(
          "product-report",
          "query",
          "Inspect product events",
          "Consultar eventos de producto",
          "Read authorized aggregate events and consumer flag state without enabling autocapture or replay.",
          "Consulta agregados y estado de flags sin activar autocaptura ni replay.",
          [period, searchText],
        ),
      ),
      allow(
        "events.capture",
        action(
          "capture-event",
          "track-event",
          "Capture a reviewed event",
          "Capturar evento revisado",
          "Capture the selected event only after consent and backend property validation.",
          "Captura el evento elegido tras consentimiento y validación de propiedades.",
          [
            field(
              "event",
              "Allowlisted event name",
              "Nombre de evento permitido",
              "text",
              true,
            ),
            field(
              "subjectRef",
              "Pseudonymous subject reference",
              "Referencia de sujeto seudónimo",
            ),
          ],
        ),
      ),
      allow(
        "flags.write",
        action(
          "set-application-flag",
          "set-flag",
          "Change an approved flag",
          "Cambiar un flag permitido",
          "Request an allowlisted server-side flag change; a browser evaluation key does not grant flag-management rights.",
          "Solicita un cambio servidor permitido; una clave de evaluación de navegador no concede gestión de flags.",
          [
            field("flagKey", "Flag key", "Clave de flag", "text", true),
            field("enabled", "Enabled", "Habilitado", "toggle", true),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "posthog-js declares Apache-2.0 AND MIT; hosted/server terms differ. The consumer explicitly initializes instrumentation, retention and consent. Connection does not activate tracking or replay.",
      "posthog-js declara Apache-2.0 AND MIT; alojamiento/servidor tienen condiciones distintas. El consumidor inicia instrumentación, retención y consentimiento. Conectar no activa tracking ni replay.",
    ),
  }),
  define({
    id: "vercel-analytics",
    family: "observability",
    description: text(
      "Web analytics reports and explicit application events for a consumer-selected Vercel collection setup.",
      "Informes de analítica web y eventos explícitos para una configuración Vercel elegida por el consumidor.",
    ),
    options: [
      option(
        "vercel-analytics",
        "Vercel Web Analytics",
        "Deployment-dependent collection, not a generic cross-host analytics backend.",
        "Recopilación dependiente del despliegue, no backend genérico entre hosts.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "projectRef",
        "Vercel project reference",
        "Referencia de proyecto Vercel",
        "text",
        true,
      ),
      field(
        "deploymentRef",
        "Analytics-enabled deployment",
        "Despliegue con analítica",
        "text",
        true,
      ),
      field(
        "consentPolicyRef",
        "Collection policy",
        "Política de recopilación",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "analytics.read",
        "Read web analytics",
        "Leer analítica web",
        true,
      ),
      permission(
        "events.capture",
        "Capture approved custom events",
        "Capturar eventos personalizados permitidos",
      ),
    ],
    resourceTypes: ["deployment", "analytics-project"],
    resourceLabel: text("Analytics deployments", "Despliegues de analítica"),
    actions: [
      allow(
        "analytics.read",
        action(
          "web-report",
          "query",
          "Inspect web report",
          "Consultar informe web",
          "Read metrics supplied by the consumer's reporting backend for its selected deployment.",
          "Consulta métricas aportadas por el backend del despliegue elegido.",
          [period],
        ),
      ),
      allow(
        "events.capture",
        action(
          "capture-web-event",
          "track-event",
          "Capture an approved custom event",
          "Capturar evento personalizado permitido",
          "Explicitly submit an allowed custom event only when the consumer's collection and service eligibility support it.",
          "Envía explícitamente un evento permitido solo si la configuración y elegibilidad del servicio lo soportan.",
          [field("event", "Event name", "Nombre de evento", "text", true)],
        ),
      ),
    ],
    serviceNote: text(
      "MIT SDK; Vercel service terms and deployment endpoints are separate. This static Workers/GitHub Pages demo is not automatically a Vercel collector, and this recipe initializes no tracking.",
      "SDK MIT; servicio y endpoints Vercel son separados. Esta demo estática Workers/GitHub Pages no es un recopilador Vercel automático; la receta no inicia tracking.",
    ),
  }),
  define({
    id: "notification-inboxes",
    family: "notifications",
    description: text(
      "Choose Knock or Novu for subscriber feeds, channel preferences and reviewed notification workflows.",
      "Elige Knock o Novu para feeds de suscriptores, preferencias de canal y workflows de notificación revisados.",
    ),
    options: [
      option(
        "knock",
        "Knock",
        "Subscriber inbox and backend-triggered workflows.",
        "Bandeja de suscriptor y workflows disparados desde backend.",
      ),
      option(
        "novu",
        "Novu",
        "Inbox UI with selected platform deployment and delivery orchestration.",
        "UI de bandeja con despliegue elegido y orquestación de entrega.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "applicationRef",
        "Notification application reference",
        "Referencia de aplicación de notificaciones",
        "text",
        true,
      ),
      field(
        "subscriberRef",
        "Authorized subscriber reference",
        "Referencia de suscriptor autorizado",
        "text",
        true,
      ),
      field(
        "feedRef",
        "Selected feed or inbox",
        "Feed o bandeja elegida",
        "text",
        true,
      ),
      field(
        "workflowRef",
        "Approved notification workflow",
        "Workflow de notificación permitido",
      ),
    ],
    permissions: [
      permission(
        "inbox.read",
        "Read subscriber feed",
        "Leer feed del suscriptor",
        true,
      ),
      permission(
        "preferences.write",
        "Change channel preferences",
        "Cambiar preferencias de canal",
      ),
      permission(
        "notifications.send",
        "Trigger approved notifications",
        "Disparar notificaciones permitidas",
      ),
    ],
    resourceTypes: ["notification-feed", "notification-workflow"],
    resourceLabel: text(
      "Feeds and notification workflows",
      "Feeds y workflows de notificación",
    ),
    actions: [
      allow(
        "inbox.read",
        action(
          "read-inbox",
          "query",
          "Read subscriber inbox",
          "Leer bandeja del suscriptor",
          "Read the selected subscriber's authorized feed and unread state.",
          "Consulta feed autorizado y estado de lectura del suscriptor elegido.",
          [since, limit],
        ),
      ),
      allow(
        "preferences.write",
        action(
          "update-channel-preferences",
          "update-preferences",
          "Update channel preferences",
          "Actualizar preferencias de canal",
          "Save preferences for this subscriber without granting delivery to other recipients.",
          "Guarda preferencias del suscriptor sin conceder entrega a otros destinatarios.",
          [
            select("channel", "Channel", "Canal", [
              ["in-app", "In-app", "En aplicación"],
              ["email", "Email", "Email"],
            ]),
            field("enabled", "Enabled", "Habilitado", "toggle", true),
          ],
        ),
      ),
      allow(
        "notifications.send",
        action(
          "trigger-notification",
          "create-notification",
          "Trigger a notification workflow",
          "Disparar workflow de notificación",
          "The backend resolves an approved workflow and recipient policy, then submits delivery.",
          "El backend resuelve workflow y política de destinatarios permitidos y envía la entrega.",
          [
            field(
              "workflowRef",
              "Workflow reference",
              "Referencia de workflow",
              "text",
              true,
            ),
            field("subject", "Notification subject", "Asunto", "text", true),
            content,
          ],
        ),
      ),
    ],
    serviceNote: text(
      "Knock React MIT; observed Novu React ISC. Platform open-source, enterprise and hosted terms differ. The consumer supplies subscriber authentication, feed authorization, workflow secrets and delivery callbacks.",
      "Knock React MIT; Novu React observado ISC. Plataforma abierta, empresa y alojamiento tienen condiciones distintas. El consumidor aporta autenticación, acceso al feed, secretos de workflows y callbacks.",
    ),
  }),
  define({
    id: "background-jobs",
    family: "jobs",
    description: text(
      "Durable job status and reviewed execution through an Inngest or Trigger.dev consumer runtime.",
      "Estado de trabajos duraderos y ejecución revisada mediante runtime Inngest o Trigger.dev del consumidor.",
    ),
    options: [
      option(
        "inngest",
        "Inngest",
        "Event/function execution and durable retry orchestration.",
        "Ejecución de eventos/funciones y orquestación de reintentos.",
      ),
      option(
        "trigger-dev",
        "Trigger.dev",
        "Deployed task runs and execution lifecycle.",
        "Ejecuciones de tareas desplegadas y su ciclo de vida.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "projectRef",
        "Job project reference",
        "Referencia de proyecto de trabajos",
        "text",
        true,
      ),
      field(
        "taskRef",
        "Approved function or task",
        "Función o tarea permitida",
        "text",
        true,
      ),
      field(
        "environment",
        "Execution environment",
        "Entorno de ejecución",
        "text",
        true,
      ),
      field(
        "retryPolicyRef",
        "Retry policy reference",
        "Referencia de política de reintentos",
      ),
    ],
    permissions: [
      permission(
        "jobs.read",
        "Read job status and logs",
        "Leer estado y logs de trabajos",
        true,
      ),
      permission(
        "jobs.trigger",
        "Start approved jobs",
        "Iniciar trabajos permitidos",
      ),
      permission(
        "jobs.cancel",
        "Cancel authorized jobs",
        "Cancelar trabajos autorizados",
      ),
    ],
    resourceTypes: ["job-task", "job-run"],
    resourceLabel: text("Tasks and job runs", "Tareas y ejecuciones"),
    actions: [
      allow(
        "jobs.read",
        action(
          "query-runs",
          "query",
          "Inspect job runs",
          "Consultar ejecuciones",
          "Read authorized progress, redacted logs and retry state.",
          "Consulta progreso, logs filtrados y estado de reintentos autorizados.",
          [jobId, since],
        ),
      ),
      allow(
        "jobs.trigger",
        action(
          "trigger-task",
          "trigger-job",
          "Start an approved task",
          "Iniciar tarea permitida",
          "Submit validated task input with backend idempotency and execution limits.",
          "Envía entrada validada con idempotencia y límites de ejecución backend.",
          [
            name,
            field(
              "payload",
              "Task input (JSON)",
              "Entrada de tarea (JSON)",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow(
        "jobs.cancel",
        action(
          "cancel-run",
          "cancel-job",
          "Cancel an authorized run",
          "Cancelar ejecución autorizada",
          "Request cancellation according to the selected runtime's state and policy; completed side effects cannot be undone.",
          "Solicita cancelación según estado y política del runtime; no deshace efectos ya completados.",
          [jobId],
        ),
      ),
    ],
    serviceNote: text(
      "Inngest SDK Apache-2.0; Trigger.dev SDK MIT. Hosted and server platform terms differ. Consumer deployed tasks, signing, retries and durable storage run separately from the static UI.",
      "SDK Inngest Apache-2.0; SDK Trigger.dev MIT. Alojamiento y plataforma servidor tienen condiciones distintas. Tareas, firma, reintentos y persistencia del consumidor se ejecutan fuera de la UI estática.",
    ),
  }),
  define({
    id: "realtime-messaging",
    family: "collaboration",
    description: text(
      "Authorized channel messages and presence through Supabase Realtime, Ably or Pusher.",
      "Mensajes y presencia en canales autorizados mediante Supabase Realtime, Ably o Pusher.",
    ),
    options: [
      option(
        "supabase-realtime",
        "Supabase Realtime",
        "Selected broadcast/presence and database-change channels.",
        "Canales elegidos de broadcast/presencia y cambios de base de datos.",
      ),
      option(
        "ably",
        "Ably",
        "Managed realtime channel transport.",
        "Transporte de canales en tiempo real gestionado.",
      ),
      option(
        "pusher",
        "Pusher Channels",
        "Authorized managed channel subscriptions and server publishing.",
        "Suscripciones autorizadas y publicación servidor en canales gestionados.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "applicationRef",
        "Realtime application reference",
        "Referencia de aplicación Realtime",
        "text",
        true,
      ),
      field(
        "channelNamespace",
        "Authorized channel namespace",
        "Espacio de canales autorizado",
        "text",
        true,
      ),
      field(
        "presencePolicyRef",
        "Presence disclosure policy",
        "Política de exposición de presencia",
      ),
    ],
    permissions: [
      permission(
        "channels.read",
        "Read selected channels",
        "Leer canales seleccionados",
        true,
      ),
      permission(
        "messages.publish",
        "Publish authorized messages",
        "Publicar mensajes autorizados",
      ),
    ],
    resourceTypes: ["realtime-channel"],
    resourceLabel: text("Authorized channels", "Canales autorizados"),
    actions: [
      allow(
        "channels.read",
        action(
          "channel-snapshot",
          "query",
          "Read channel snapshot",
          "Leer estado del canal",
          "Read consumer-provided channel state; message history availability depends on the selected deployment, not the UI contract.",
          "Consulta estado del canal aportado por el consumidor; el historial depende del despliegue, no del contrato UI.",
          [resource],
        ),
      ),
      allow(
        "messages.publish",
        action(
          "publish-channel-message",
          "publish-message",
          "Publish a channel message",
          "Publicar mensaje de canal",
          "Publish validated content to an authorized channel. Optional reply IDs are consumer-reported application metadata, not a native transport capability.",
          "Publica contenido validado en un canal autorizado. Los IDs de respuesta opcionales son metadatos de aplicación reportados por el consumidor, no una capacidad nativa del transporte.",
          [resource, content, replyThread, replyParent],
        ),
      ),
    ],
    serviceNote: text(
      "Supabase/Pusher clients MIT; Ably Apache-2.0. The consumer supplies channel authentication, private scopes, reconnect/ordering policy and optional subscribe cleanup; realtime is not a durable jobs runtime.",
      "Clientes Supabase/Pusher MIT; Ably Apache-2.0. El consumidor aporta autenticación, ámbitos privados, reconexión/orden y limpieza de subscribe; tiempo real no es runtime de trabajos duraderos.",
    ),
  }),
  define({
    id: "liveblocks",
    family: "collaboration",
    description: text(
      "Room-based collaborative presence, shared documents and comments with explicit room authorization.",
      "Presencia colaborativa, documentos compartidos y comentarios por sala con autorización explícita.",
    ),
    options: [
      option(
        "liveblocks",
        "Liveblocks",
        "Hosted collaboration rooms and selected client bindings.",
        "Salas de colaboración alojadas y bindings cliente elegidos.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "projectRef",
        "Liveblocks project",
        "Proyecto Liveblocks",
        "text",
        true,
      ),
      field(
        "roomNamespace",
        "Authorized room namespace",
        "Espacio de salas autorizado",
        "text",
        true,
      ),
      field(
        "schemaRef",
        "Shared document schema",
        "Esquema del documento compartido",
        "text",
        true,
      ),
    ],
    permissions: [
      permission("rooms.read", "Read room state", "Leer estado de sala", true),
      permission(
        "rooms.write",
        "Write shared content",
        "Escribir contenido compartido",
      ),
      permission(
        "comments.write",
        "Publish room comments",
        "Publicar comentarios de sala",
      ),
    ],
    resourceTypes: ["collaboration-room", "shared-document"],
    resourceLabel: text(
      "Rooms and shared documents",
      "Salas y documentos compartidos",
    ),
    actions: [
      allow(
        "rooms.read",
        action(
          "room-report",
          "query",
          "Inspect room state",
          "Consultar estado de sala",
          "Read authorized room members and consumer-normalized document revision metadata.",
          "Consulta miembros autorizados y revisiones normalizadas por el consumidor.",
          [resource],
        ),
      ),
      allow(
        "rooms.write",
        action(
          "save-shared-document",
          "save-document",
          "Save shared content",
          "Guardar contenido compartido",
          "Persist a reviewed application-level snapshot through the consumer's selected collaboration binding.",
          "Guarda una instantánea revisada mediante el binding colaborativo elegido.",
          [
            documentId,
            content,
            documentFormat,
            field(
              "revision",
              "Expected revision",
              "Revisión esperada",
              "number",
              true,
            ),
          ],
        ),
      ),
      allow(
        "comments.write",
        action(
          "publish-comment",
          "publish-message",
          "Publish a room comment",
          "Publicar comentario de sala",
          "Create a reviewed comment or reply using reported room/thread/parent IDs. The backend maps its selected Comments binding and rechecks room membership and moderation.",
          "Crea un comentario o respuesta revisados con IDs reportados de sala/hilo/padre. El backend mapea su binding de Comments elegido y revalida membresía y moderación.",
          [resource, content, replyThread, replyParent],
        ),
      ),
    ],
    serviceNote: text(
      "Current client/React package metadata Apache-2.0; hosted terms are separate. Consumer room authentication, storage bindings and conflict handling are required; React peer ranges are not runtime certification.",
      "Metadatos actuales cliente/React Apache-2.0; condiciones alojadas separadas. Se necesitan autenticación de sala, bindings y conflictos; los peers React no certifican runtime.",
    ),
  }),
  define({
    id: "tiptap",
    family: "content",
    description: text(
      "Tiptap document snapshots with an approved extension schema and consumer persistence.",
      "Instantáneas Tiptap con esquema de extensiones permitido y persistencia del consumidor.",
    ),
    options: [
      option(
        "tiptap",
        "Tiptap",
        "Editor core and selected extensions; storage is consumer-owned.",
        "Editor y extensiones elegidas; almacenamiento del consumidor.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "repositoryRef",
        "Document repository reference",
        "Referencia de repositorio documental",
        "text",
        true,
      ),
      field(
        "extensionSetRef",
        "Allowed extension set",
        "Conjunto de extensiones permitido",
        "text",
        true,
      ),
      field(
        "documentNamespace",
        "Document namespace",
        "Espacio documental",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "documents.read",
        "Read editor documents",
        "Leer documentos del editor",
        true,
      ),
      permission(
        "documents.write",
        "Save editor documents",
        "Guardar documentos del editor",
      ),
    ],
    resourceTypes: ["tiptap-document"],
    resourceLabel: text("Tiptap documents", "Documentos Tiptap"),
    actions: [
      allow(
        "documents.read",
        action(
          "read-tiptap-document",
          "query",
          "Read Tiptap document",
          "Leer documento Tiptap",
          "Read a persisted document and its extension schema; no editor package is loaded by the recipe.",
          "Consulta documento persistido y esquema de extensiones; la receta no carga el editor.",
          [documentId],
        ),
      ),
      allow(
        "documents.write",
        action(
          "save-tiptap-document",
          "save-document",
          "Save Tiptap snapshot",
          "Guardar instantánea Tiptap",
          "Validate and sanitize the configured document format with revision conflict checks.",
          "Valida y sanea el formato configurado y comprueba conflictos de revisión.",
          [
            documentId,
            field("title", "Document title", "Título", "text", true),
            content,
            documentFormat,
            field(
              "revision",
              "Expected revision",
              "Revisión esperada",
              "number",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "Core/React package MIT; premium extensions and collaboration services have separate terms. The consumer selects extensions, renderer, sanitization and storage; this is not a native mounted editor.",
      "Paquete core/React MIT; extensiones premium y servicios colaborativos tienen condiciones separadas. El consumidor elige extensiones, renderer, saneado y almacenamiento; esto no monta un editor nativo.",
    ),
  }),
  define({
    id: "lexical",
    family: "content",
    description: text(
      "Lexical editor-state persistence using an allowlisted node registry and migration policy.",
      "Persistencia de estado Lexical con registro de nodos permitido y política de migración.",
    ),
    options: [
      option(
        "lexical",
        "Lexical",
        "Editor-state tree and selected React bindings.",
        "Árbol de estado del editor y bindings React elegidos.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "repositoryRef",
        "Document repository reference",
        "Referencia de repositorio documental",
        "text",
        true,
      ),
      field(
        "nodeRegistryRef",
        "Allowed node registry",
        "Registro de nodos permitido",
        "text",
        true,
      ),
      field(
        "schemaVersion",
        "Editor schema version",
        "Versión de esquema del editor",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "documents.read",
        "Read editor state",
        "Leer estado del editor",
        true,
      ),
      permission(
        "documents.write",
        "Save editor state",
        "Guardar estado del editor",
      ),
    ],
    resourceTypes: ["lexical-document"],
    resourceLabel: text(
      "Lexical state documents",
      "Documentos de estado Lexical",
    ),
    actions: [
      allow(
        "documents.read",
        action(
          "read-editor-state",
          "query",
          "Read editor state",
          "Leer estado del editor",
          "Read a stored state and report whether its node schema matches the consumer registry.",
          "Consulta estado guardado e informa de compatibilidad con el registro de nodos.",
          [documentId],
        ),
      ),
      allow(
        "documents.write",
        action(
          "save-editor-state",
          "save-document",
          "Save editor-state snapshot",
          "Guardar instantánea del editor",
          "The consumer validates serialized nodes, revision and export sanitization; JSON is not trusted automatically.",
          "El consumidor valida nodos serializados, revisión y saneado; JSON no se considera seguro automáticamente.",
          [
            documentId,
            content,
            select("format", "State format", "Formato del estado", [
              ["json", "Lexical JSON", "JSON Lexical"],
            ]),
            field(
              "revision",
              "Expected revision",
              "Revisión esperada",
              "number",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "MIT editor and React packages. Consumer mounting, registered nodes, history, accessibility and persistence are separate implementation work, with no installed editor dependency here.",
      "Paquetes editor/React MIT. Montaje, nodos, historial, accesibilidad y persistencia requieren implementación del consumidor; aquí no se instala el editor.",
    ),
  }),
  define({
    id: "blocknote",
    family: "content",
    description: text(
      "BlockNote block documents with selected block types, revision checks and consumer storage.",
      "Documentos por bloques BlockNote con tipos elegidos, revisiones y almacenamiento del consumidor.",
    ),
    options: [
      option(
        "blocknote",
        "BlockNote",
        "Block editor; optional XL features have different licenses.",
        "Editor por bloques; funciones XL opcionales tienen otras licencias.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "repositoryRef",
        "Block document repository",
        "Repositorio de documentos por bloques",
        "text",
        true,
      ),
      field(
        "blockSchemaRef",
        "Allowed block schema",
        "Esquema de bloques permitido",
        "text",
        true,
      ),
      field(
        "assetConnectionRef",
        "Optional media connection reference",
        "Referencia opcional de conexión multimedia",
      ),
    ],
    permissions: [
      permission(
        "documents.read",
        "Read block documents",
        "Leer documentos por bloques",
        true,
      ),
      permission(
        "documents.write",
        "Save block documents",
        "Guardar documentos por bloques",
      ),
    ],
    resourceTypes: ["block-document"],
    resourceLabel: text("Block documents", "Documentos por bloques"),
    actions: [
      allow(
        "documents.read",
        action(
          "read-block-document",
          "query",
          "Read block document",
          "Leer documento por bloques",
          "Read stored blocks and consumer schema metadata, with authorized media references.",
          "Consulta bloques y metadatos de esquema con referencias multimedia autorizadas.",
          [documentId],
        ),
      ),
      allow(
        "documents.write",
        action(
          "save-block-document",
          "save-document",
          "Save block snapshot",
          "Guardar instantánea de bloques",
          "Validate block JSON, asset ownership and revision before persisting.",
          "Valida JSON de bloques, propiedad de archivos y revisión antes de guardar.",
          [
            documentId,
            content,
            select("format", "Block format", "Formato de bloques", [
              ["json", "BlockNote JSON", "JSON BlockNote"],
            ]),
            field(
              "revision",
              "Expected revision",
              "Revisión esperada",
              "number",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "Observed @blocknote/react 0.56.0 MPL-2.0. XL features use GPL-3.0/commercial boundaries; verify chosen features and distribution obligations. Consumer mounting and storage are not bundled.",
      "Versión observada @blocknote/react 0.56.0 MPL-2.0. XL tiene límites GPL-3.0/comerciales; verifica funciones y obligaciones de distribución. No se incluyen montaje ni almacenamiento.",
    ),
  }),
  define({
    id: "algolia",
    family: "search",
    description: text(
      "Scoped hosted search and reviewed record indexing using an approved Algolia index.",
      "Búsqueda alojada acotada e indexación revisada mediante índice Algolia permitido.",
    ),
    options: [
      option(
        "algolia",
        "Algolia",
        "Hosted search; search-only browser access and server indexing differ.",
        "Búsqueda alojada; acceso de búsqueda navegador e indexación servidor son distintos.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "applicationRef",
        "Algolia application reference",
        "Referencia de aplicación Algolia",
        "text",
        true,
      ),
      field("index", "Allowed index", "Índice permitido", "text", true),
      field(
        "filterPolicyRef",
        "Tenant filter policy",
        "Política de filtros de tenant",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "search.read",
        "Search authorized index",
        "Buscar en índice autorizado",
        true,
      ),
      permission(
        "index.write",
        "Index approved records",
        "Indexar registros permitidos",
      ),
    ],
    resourceTypes: ["search-index"],
    resourceLabel: text("Search indexes", "Índices de búsqueda"),
    actions: [
      allow(
        "search.read",
        action(
          "search-index",
          "search",
          "Search selected index",
          "Buscar en índice elegido",
          "Apply consumer-enforced tenant filters and safe facets; browser search permission never grants indexing.",
          "Aplica filtros de tenant y facetas seguras; buscar desde navegador no concede indexación.",
          [
            field(
              "query",
              "Search query",
              "Consulta de búsqueda",
              "text",
              true,
            ),
            limit,
            field(
              "facetRef",
              "Allowed facet selection",
              "Selección de faceta permitida",
            ),
          ],
        ),
      ),
      allow(
        "index.write",
        action(
          "index-record",
          "ingest",
          "Index an approved record",
          "Indexar registro permitido",
          "The backend validates record fields, ACL filters and index ownership before indexing.",
          "El backend valida campos, filtros ACL y propiedad del índice.",
          [recordId, name, content],
        ),
      ),
      allow(
        "search.read",
        action(
          "index-report",
          "query",
          "Inspect indexing state",
          "Consultar estado de indexación",
          "Read normalized index and synchronization metadata from the consumer backend.",
          "Consulta metadatos normalizados de índice y sincronización desde el backend.",
          [since],
        ),
      ),
    ],
    serviceNote: text(
      "MIT JavaScript client; hosted index and service terms are separate. The consumer supplies secured search access, server indexing credentials, filters, deletion and reconciliation.",
      "Cliente JavaScript MIT; índice y servicio alojado tienen condiciones separadas. El consumidor aporta acceso seguro, credenciales servidor, filtros, borrado y conciliación.",
    ),
  }),
  define({
    id: "self-hostable-search",
    family: "search",
    description: text(
      "Choose Meilisearch or Typesense for an authorized search collection and controlled indexing.",
      "Elige Meilisearch o Typesense para una colección autorizada y una indexación controlada.",
    ),
    options: [
      option(
        "meilisearch",
        "Meilisearch",
        "Selected self-operated or hosted search index.",
        "Índice de búsqueda propio o alojado elegido.",
      ),
      option(
        "typesense",
        "Typesense",
        "Selected search collection with schema and scoped access.",
        "Colección de búsqueda con esquema y acceso acotado.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "clusterRef",
        "Search deployment reference",
        "Referencia de despliegue de búsqueda",
        "text",
        true,
      ),
      field("index", "Index or collection", "Índice o colección", "text", true),
      field(
        "schemaRef",
        "Search schema profile",
        "Perfil de esquema de búsqueda",
        "text",
        true,
      ),
      field(
        "filterPolicyRef",
        "Workspace filter policy",
        "Política de filtros de espacio",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "search.read",
        "Search scoped records",
        "Buscar registros acotados",
        true,
      ),
      permission(
        "index.write",
        "Index validated records",
        "Indexar registros validados",
      ),
    ],
    resourceTypes: ["search-index", "search-collection"],
    resourceLabel: text("Indexes and collections", "Índices y colecciones"),
    actions: [
      allow(
        "search.read",
        action(
          "search-collection",
          "search",
          "Search selected collection",
          "Buscar en colección elegida",
          "Translate safe filters to the chosen provider, with tenant constraints enforced on the server.",
          "Traduce filtros seguros al proveedor con restricciones de tenant en servidor.",
          [
            field("query", "Search query", "Consulta", "text", true),
            limit,
            field("filterRef", "Approved filter", "Filtro permitido"),
          ],
        ),
      ),
      allow(
        "index.write",
        action(
          "ingest-search-document",
          "ingest",
          "Index a search document",
          "Indexar documento de búsqueda",
          "Validate document schema and source ownership, then track asynchronous indexing status.",
          "Valida esquema y propiedad de fuente y sigue la indexación asíncrona.",
          [recordId, name, content],
        ),
      ),
      allow(
        "search.read",
        action(
          "indexing-report",
          "query",
          "Inspect indexing tasks",
          "Consultar tareas de indexación",
          "Read consumer-normalized indexing task progress; task APIs differ by provider.",
          "Consulta progreso normalizado; las APIs de tareas dependen del proveedor.",
          [since],
        ),
      ),
    ],
    serviceNote: text(
      "Meilisearch JS MIT; Typesense JS Apache-2.0. Engine, hosted and enterprise terms differ from client licenses. Consumer operation, schemas, scoped access and deletion synchronization are required.",
      "Meilisearch JS MIT; Typesense JS Apache-2.0. Motor, alojamiento y empresa tienen condiciones distintas a los clientes. Se necesitan operación, esquemas, acceso acotado y sincronización de borrados.",
    ),
  }),
  define({
    id: "existing-maps",
    family: "maps",
    description: text(
      "Existing MapLibre rendering or opt-in Google Maps, with separately supplied location services.",
      "Renderer MapLibre existente o Google Maps optativo, con servicios de ubicación aportados por separado.",
    ),
    options: [
      option(
        "maplibre",
        "MapLibre",
        "Open map renderer; the consumer supplies styles and licensed tiles.",
        "Renderer abierto; el consumidor aporta estilos y tiles licenciados.",
      ),
      option(
        "google-maps",
        "Google Maps",
        "Opt-in loader and separately authorized Google location services.",
        "Loader optativo y servicios de ubicación Google autorizados por separado.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "mapProfileRef",
        "Approved map/style profile",
        "Perfil de mapa/estilo permitido",
        "text",
        true,
      ),
      field(
        "tileSourceRef",
        "Licensed tile source reference",
        "Referencia de tiles licenciados",
      ),
      field(
        "browserLoaderRef",
        "Consumer-managed browser loader reference",
        "Referencia de loader gestionado por consumidor",
      ),
      field(
        "geocodingServiceRef",
        "Optional geocoding service",
        "Servicio geocodificador opcional",
      ),
      field(
        "directionsServiceRef",
        "Optional directions service",
        "Servicio de direcciones opcional",
      ),
    ],
    permissions: [
      permission(
        "maps.read",
        "Read map configuration",
        "Leer configuración del mapa",
        true,
      ),
      permission(
        "locations.read",
        "Use configured location services",
        "Usar servicios de ubicación configurados",
      ),
    ],
    resourceTypes: ["map-style", "geojson-layer"],
    resourceLabel: text("Map styles and layers", "Estilos y capas de mapa"),
    actions: [
      allow(
        "maps.read",
        action(
          "map-profile-report",
          "query",
          "Inspect map layers",
          "Consultar capas de mapa",
          "Read authorized style/layer metadata and public coordinates; MapLibre does not itself geocode or route.",
          "Consulta estilos, capas y coordenadas públicas; MapLibre no geocodifica ni calcula rutas por sí mismo.",
          [resource],
        ),
      ),
      allow("locations.read", geocode),
      allow("locations.read", route),
    ],
    serviceNote: text(
      "MapLibre BSD-3-Clause; Google loader Apache-2.0, with separate Google service terms. Consumer public browser credentials are injected by its loader, restricted by origin/API; no credential field is stored here.",
      "MapLibre BSD-3-Clause; loader Google Apache-2.0, con condiciones Google separadas. El loader consumidor inyecta credenciales públicas restringidas por origen/API; aquí no se almacena ningún campo de credencial.",
    ),
  }),
  define({
    id: "mapbox",
    family: "maps",
    description: text(
      "Mapbox style/layer inspection plus optional consumer-configured geocoding and directions.",
      "Consulta de estilos/capas Mapbox y geocodificación/direcciones opcionales del consumidor.",
    ),
    options: [
      option(
        "mapbox",
        "Mapbox",
        "GL renderer; location APIs are separately selected services.",
        "Renderer GL; las APIs de ubicación son servicios elegidos por separado.",
      ),
    ],
    connectionMode: "configuration",
    configurationFields: [
      field(
        "styleRef",
        "Approved Mapbox style",
        "Estilo Mapbox permitido",
        "text",
        true,
      ),
      field(
        "browserLoaderRef",
        "Consumer browser loader reference",
        "Referencia de loader del consumidor",
        "text",
        true,
      ),
      field(
        "geocodingServiceRef",
        "Optional geocoding service",
        "Servicio geocodificador opcional",
      ),
      field(
        "directionsServiceRef",
        "Optional directions service",
        "Servicio de direcciones opcional",
      ),
    ],
    permissions: [
      permission(
        "maps.read",
        "Read map style metadata",
        "Leer metadatos de estilo",
        true,
      ),
      permission(
        "locations.read",
        "Use selected location services",
        "Usar servicios de ubicación elegidos",
      ),
    ],
    resourceTypes: ["mapbox-style", "map-layer"],
    resourceLabel: text("Mapbox styles and layers", "Estilos y capas Mapbox"),
    actions: [
      allow(
        "maps.read",
        action(
          "style-report",
          "query",
          "Inspect style and layers",
          "Consultar estilo y capas",
          "Read the consumer's allowed Mapbox style and layer metadata; no map SDK is mounted by this definition.",
          "Consulta metadatos permitidos de estilo y capas; esta definición no monta el SDK.",
          [resource],
        ),
      ),
      allow("locations.read", geocode),
      allow("locations.read", route),
    ],
    serviceNote: text(
      "Current Mapbox GL JS uses proprietary license/service restrictions. The consumer supplies licensed style/tiles, attribution, restricted public loader credentials and separately configured location APIs.",
      "Mapbox GL JS actual tiene licencia propietaria y restricciones de servicio. El consumidor aporta estilo/tiles licenciados, atribución, credenciales públicas restringidas y APIs de ubicación separadas.",
    ),
  }),
  define({
    id: "ai-sdk",
    family: "ai",
    description: text(
      "AI SDK 7 transport and approved-model inspection beside the consumer's injected streaming AI module.",
      "Consulta de transporte AI SDK 7 y modelos permitidos junto al módulo AI streaming inyectado.",
    ),
    options: [
      option(
        "ai-sdk",
        "AI SDK 7 + React hooks",
        "Server generation and browser hooks are complementary, not two providers.",
        "Generación servidor y hooks navegador son complementarios, no dos proveedores.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "aiServiceRef",
        "Backend AI service",
        "Servicio AI del backend",
        "text",
        true,
      ),
      field(
        "modelPolicyRef",
        "Approved model policy",
        "Política de modelos permitidos",
        "text",
        true,
      ),
      field(
        "streamMapperRef",
        "Structured stream mapper",
        "Mapper de stream estructurado",
        "text",
        true,
      ),
      field("attachmentPolicyRef", "Attachment policy", "Política de adjuntos"),
    ],
    permissions: [
      permission(
        "models.read",
        "Inspect approved models",
        "Consultar modelos permitidos",
        true,
      ),
      permission(
        "ai.reports",
        "Read transport and usage reports",
        "Leer informes de transporte y consumo",
      ),
    ],
    resourceTypes: ["model-profile", "stream-profile"],
    resourceLabel: text(
      "Model and stream profiles",
      "Perfiles de modelos y streams",
    ),
    actions: [
      allow("models.read", modelReport),
      allow(
        "ai.reports",
        action(
          "stream-protocol-report",
          "query",
          "Inspect stream protocol",
          "Consultar protocolo de stream",
          "Read the consumer's mapper, cancellation and attachment capabilities; generation remains in the injected AI module.",
          "Consulta mapper, cancelación y adjuntos del consumidor; la generación permanece en el módulo AI inyectado.",
          [
            field(
              "streamProfileRef",
              "Stream profile reference",
              "Referencia de perfil de stream",
            ),
          ],
        ),
      ),
      allow("ai.reports", usageReport),
    ],
    serviceNote: text(
      "Apache-2.0. Reviewed ai 7.0.146 / React hooks 4.0.150 require Node >=22 and declare React 19.3 peers, without runtime acceptance here. Consumer maps structured parts and only provider-published reasoning summaries, never private chain of thought.",
      "Apache-2.0. Ai 7.0.146 / hooks 4.0.150 requieren Node >=22 y declaran peers React 19.3, sin aceptación runtime aquí. El consumidor mapea partes estructuradas y solo resúmenes publicados por el proveedor, nunca razonamiento privado.",
    ),
  }),
  define({
    id: "openai-responses",
    family: "ai",
    description: text(
      "OpenAI Responses connection, approved model and response-state inspection through the injected AI module.",
      "Conexión OpenAI Responses y consulta de modelos y estado de respuesta mediante el módulo AI inyectado.",
    ),
    options: [
      option(
        "openai-responses",
        "OpenAI Responses",
        "Native SDK or optional AI SDK adapter; one provider connection.",
        "SDK nativo o adaptador AI SDK opcional; una conexión de proveedor.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "projectRef",
        "OpenAI project reference",
        "Referencia de proyecto OpenAI",
        "text",
        true,
      ),
      field(
        "modelPolicyRef",
        "Approved model policy",
        "Política de modelos permitidos",
        "text",
        true,
      ),
      field(
        "retentionPolicyRef",
        "Response retention policy",
        "Política de retención de respuestas",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "models.read",
        "Inspect approved models",
        "Consultar modelos permitidos",
        true,
      ),
      permission(
        "ai.reports",
        "Read response and usage reports",
        "Leer informes de respuestas y consumo",
      ),
    ],
    resourceTypes: ["model-profile", "response-profile"],
    resourceLabel: text(
      "Responses model profiles",
      "Perfiles de modelos Responses",
    ),
    actions: [
      allow("models.read", modelReport),
      allow(
        "ai.reports",
        action(
          "response-report",
          "query",
          "Inspect response state",
          "Consultar estado de respuesta",
          "Read authorized response metadata and consumer retention state without starting generation or exposing prompts.",
          "Consulta metadatos autorizados y retención sin generar ni exponer prompts.",
          [
            field(
              "responseRef",
              "Response reference",
              "Referencia de respuesta",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow("ai.reports", usageReport),
    ],
    serviceNote: text(
      "Apache-2.0 SDK/adapter; API service terms are separate. Responses replaces the Assistants API closed August 26, 2026. Consumer generation, tools, cancellation, structured mapping and secret credentials belong on its backend.",
      "SDK/adaptador Apache-2.0; condiciones API separadas. Responses sustituye Assistants, cerrada el 26 de agosto de 2026. Generación, herramientas, cancelación, mapeo y credenciales son del backend consumidor.",
    ),
  }),
  define({
    id: "anthropic-messages",
    family: "ai",
    description: text(
      "Anthropic Messages model and run-report inspection with consumer-controlled streaming and tool policy.",
      "Consulta de modelos y ejecuciones Anthropic Messages con streaming y herramientas controlados por el consumidor.",
    ),
    options: [
      option(
        "anthropic-messages",
        "Anthropic Messages",
        "Native Messages SDK or AI SDK adapter for the same provider.",
        "SDK Messages nativo o adaptador AI SDK del mismo proveedor.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "workspaceRef",
        "Anthropic workspace reference",
        "Referencia de espacio Anthropic",
        "text",
        true,
      ),
      field(
        "modelPolicyRef",
        "Approved model policy",
        "Política de modelos permitidos",
        "text",
        true,
      ),
      field(
        "toolPolicyRef",
        "Approved tool policy",
        "Política de herramientas permitidas",
      ),
      field(
        "redactionPolicyRef",
        "Prompt/report redaction policy",
        "Política de filtrado de prompts e informes",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "models.read",
        "Inspect approved models",
        "Consultar modelos permitidos",
        true,
      ),
      permission(
        "ai.reports",
        "Read message-run reports",
        "Leer informes de ejecuciones Messages",
      ),
    ],
    resourceTypes: ["model-profile", "tool-policy"],
    resourceLabel: text(
      "Messages profiles and policies",
      "Perfiles y políticas Messages",
    ),
    actions: [
      allow("models.read", modelReport),
      allow(
        "ai.reports",
        action(
          "message-run-report",
          "query",
          "Inspect Messages run",
          "Consultar ejecución Messages",
          "Read consumer-stored run state and validated tool-result metadata; this is not a native Messages retrieval endpoint.",
          "Consulta estado guardado y resultados validados del consumidor; no es un endpoint nativo de recuperación Messages.",
          [
            field(
              "runId",
              "Application run reference",
              "Referencia de ejecución",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow("ai.reports", usageReport),
    ],
    serviceNote: text(
      "Native SDK MIT; AI SDK adapter Apache-2.0; API terms separate. Consumer server supplies Messages calls, cancellation and content-block mapping. Only provider-published reasoning summaries may be displayed.",
      "SDK nativo MIT; adaptador AI SDK Apache-2.0; condiciones API separadas. El servidor aporta llamadas, cancelación y mapeo de bloques. Solo pueden mostrarse resúmenes de razonamiento publicados por el proveedor.",
    ),
  }),
  define({
    id: "google-gemini",
    family: "ai",
    description: text(
      "Current Google Gen AI model and capability reports, with consumer-selected Gemini deployment policy.",
      "Informes actuales de modelos y capacidades Google Gen AI con política de despliegue Gemini del consumidor.",
    ),
    options: [
      option(
        "google-gemini",
        "Google Gemini / Gen AI",
        "Current @google/genai or AI SDK Google adapter; legacy SDK is migration-only.",
        "@google/genai actual o adaptador Google AI SDK; SDK anterior solo para migración.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "projectRef",
        "Google project reference",
        "Referencia de proyecto Google",
        "text",
        true,
      ),
      field(
        "location",
        "Configured deployment location",
        "Ubicación de despliegue configurada",
      ),
      field(
        "modelPolicyRef",
        "Approved Gemini model policy",
        "Política de modelos Gemini permitidos",
        "text",
        true,
      ),
      field(
        "safetyProfileRef",
        "Safety and attachment policy",
        "Política de seguridad y adjuntos",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "models.read",
        "Inspect approved models",
        "Consultar modelos permitidos",
        true,
      ),
      permission(
        "ai.reports",
        "Read capability and usage reports",
        "Leer informes de capacidades y consumo",
      ),
    ],
    resourceTypes: ["model-profile", "safety-profile"],
    resourceLabel: text(
      "Gemini models and policies",
      "Modelos y políticas Gemini",
    ),
    actions: [
      allow("models.read", modelReport),
      allow(
        "ai.reports",
        action(
          "gemini-capability-report",
          "query",
          "Inspect configured capabilities",
          "Consultar capacidades configuradas",
          "Read the consumer's allowed content types, safety configuration and deployment restrictions, not a compatibility guarantee.",
          "Consulta tipos de contenido, seguridad y restricciones del consumidor, no una garantía de compatibilidad.",
          [
            field(
              "modelRef",
              "Approved model reference",
              "Referencia de modelo permitido",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow("ai.reports", usageReport),
    ],
    serviceNote: text(
      "Apache-2.0 references; Google API and deployment terms are separate. @google/genai is current; @google/generative-ai is retained solely as a migration reference. Consumer generation and structured-part mapping remain external.",
      "Referencias Apache-2.0; condiciones API/despliegue Google separadas. @google/genai es actual; @google/generative-ai se conserva solo como referencia de migración. Generación y mapeo de partes son externos.",
    ),
  }),
  define({
    id: "ai-gateways",
    family: "ai",
    description: text(
      "Choose Cloudflare AI Gateway, Vercel AI Gateway or OpenRouter for backend model routing and policy reports.",
      "Elige Cloudflare AI Gateway, Vercel AI Gateway u OpenRouter para enrutamiento de modelos e informes backend.",
    ),
    options: [
      option(
        "cloudflare-ai-gateway",
        "Cloudflare AI Gateway",
        "Gateway deployment, provider routing and observability policy.",
        "Despliegue gateway, enrutamiento y política de observabilidad.",
      ),
      option(
        "vercel-ai-gateway",
        "Vercel AI Gateway",
        "Managed model routing under the consumer's gateway configuration.",
        "Enrutamiento gestionado según configuración del consumidor.",
      ),
      option(
        "openrouter",
        "OpenRouter",
        "Model routing with selected provider and data-handling preferences.",
        "Enrutamiento con preferencias de proveedor y tratamiento de datos.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "gatewayRef",
        "Gateway deployment reference",
        "Referencia de despliegue gateway",
        "text",
        true,
      ),
      field(
        "routingPolicyRef",
        "Approved routing policy",
        "Política de enrutamiento permitida",
        "text",
        true,
      ),
      field(
        "dataPolicyRef",
        "Logging and retention policy",
        "Política de logs y retención",
        "text",
        true,
      ),
      field(
        "budgetPolicyRef",
        "Usage limit policy",
        "Política de límites de consumo",
      ),
    ],
    permissions: [
      permission(
        "models.read",
        "Inspect routed models",
        "Consultar modelos enrutados",
        true,
      ),
      permission(
        "ai.reports",
        "Read routing and usage reports",
        "Leer informes de rutas y consumo",
      ),
    ],
    resourceTypes: ["gateway-route", "model-profile"],
    resourceLabel: text("Gateway routes", "Rutas de gateway"),
    actions: [
      allow("models.read", modelReport),
      allow(
        "ai.reports",
        action(
          "routing-report",
          "query",
          "Inspect approved routing",
          "Consultar enrutamiento permitido",
          "Read the consumer's configured provider routes, fallback policy and retention; no automatic provider substitution is performed.",
          "Consulta rutas, fallback y retención configurados; no sustituye proveedores automáticamente.",
          [
            field(
              "routeRef",
              "Route reference",
              "Referencia de ruta",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow("ai.reports", usageReport),
    ],
    serviceNote: text(
      "Hosted gateway contracts differ from optional SDK licenses. The consumer supplies server credentials, compatible request mapping, allowed routes, failover and data policy; none of these gateways is installed or certified here.",
      "Contratos gateway distintos de licencias SDK opcionales. El consumidor aporta credenciales servidor, mapeo, rutas, fallback y política de datos; ningún gateway está instalado ni certificado aquí.",
    ),
  }),
  define({
    id: "pgvector",
    family: "knowledge",
    description: text(
      "Authorized Postgres vector retrieval and document ingestion with consumer-controlled embedding and source ACLs.",
      "Recuperación vectorial Postgres e ingesta documental autorizadas con embeddings y ACL de fuentes del consumidor.",
    ),
    options: [
      option(
        "pgvector",
        "Postgres pgvector",
        "Database extension; optional Supabase deployment is a hosting choice.",
        "Extensión de base de datos; Supabase opcional es una elección de alojamiento.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "databaseRef",
        "Postgres backend reference",
        "Referencia backend Postgres",
        "text",
        true,
      ),
      field(
        "table",
        "Authorized vector table",
        "Tabla vectorial autorizada",
        "text",
        true,
      ),
      field(
        "embeddingProfileRef",
        "Embedding and dimension profile",
        "Perfil de embeddings y dimensiones",
        "text",
        true,
      ),
      field(
        "sourcePolicyRef",
        "Source ACL and freshness policy",
        "Política ACL y frescura de fuentes",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "knowledge.read",
        "Retrieve authorized sources",
        "Recuperar fuentes autorizadas",
        true,
      ),
      permission(
        "knowledge.ingest",
        "Index authorized sources",
        "Indexar fuentes autorizadas",
      ),
      permission(
        "knowledge.evaluate",
        "Run approved retrieval checks",
        "Ejecutar comprobaciones de recuperación",
      ),
      permission(
        "knowledge.delete",
        "Remove authorized sources from retrieval",
        "Eliminar fuentes autorizadas de la recuperación",
      ),
    ],
    resourceTypes: ["vector-table", "knowledge-source"],
    resourceLabel: text(
      "Vector tables and sources",
      "Tablas vectoriales y fuentes",
    ),
    actions: [
      allow("knowledge.read", retrieveDocuments),
      allow("knowledge.ingest", ingestDocument),
      allow(
        "knowledge.delete",
        action(
          "delete-source",
          "delete-source",
          "Remove a Postgres knowledge source",
          "Eliminar una fuente de conocimiento Postgres",
          "Request removal of one authorized source's indexed copy and related chunks through the consumer's tenant-scoped transaction and deletion policy. The backend reports completion; original external files are a separate lifecycle.",
          "Solicita eliminar la copia indexada y los fragmentos de una fuente autorizada mediante la transacción y política del tenant. El backend informa de finalización; los archivos externos tienen un ciclo separado.",
          [
            resource,
            field(
              "sourceId",
              "Authorized source ID",
              "ID de fuente autorizada",
              "text",
              true,
            ),
            field(
              "expectedUpdatedAt",
              "Observed source update time",
              "Fecha de actualización observada de la fuente",
            ),
            field("reason", "Removal reason", "Motivo de eliminación"),
          ],
        ),
      ),
      allow(
        "knowledge.read",
        action(
          "source-index-report",
          "query",
          "Inspect source freshness",
          "Consultar frescura de fuentes",
          "Read indexing state, source ownership and consumer deletion checkpoints.",
          "Consulta estado de índice, propiedad de fuente y checkpoints de borrado.",
          [resource, since],
        ),
      ),
      allow(
        "knowledge.evaluate",
        action(
          "evaluate-retrieval",
          "evaluate",
          "Run a retrieval check",
          "Ejecutar comprobación de recuperación",
          "Run an approved backend retrieval dataset; this is consumer evaluation, not a built-in pgvector model evaluator.",
          "Ejecuta un dataset permitido en backend; es evaluación del consumidor, no un evaluador de modelos nativo pgvector.",
          [
            field(
              "datasetRef",
              "Approved dataset",
              "Dataset permitido",
              "text",
              true,
            ),
            field(
              "query",
              "Evaluation question",
              "Pregunta de evaluación",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "pgvector extension uses the PostgreSQL License; drivers and embedding services have separate terms. Consumer migrations, dimensions, prepared SQL with tenant/source ACLs, chunking and synchronized deletion are required. Source removal must reconcile source records and chunks under the configured policy; it does not drop tables or delete original files. A receipt alone does not establish completed deletion.",
      "Extensión pgvector con licencia PostgreSQL; drivers y embeddings tienen condiciones separadas. Se necesitan migraciones, dimensiones, SQL preparado con ACL de tenant/fuente, fragmentación y borrado sincronizado. La eliminación concilia registros y fragmentos según la política; no borra tablas ni archivos originales. Un recibo por sí solo no acredita un borrado terminado.",
    ),
  }),
  define({
    id: "vector-stores",
    family: "knowledge",
    description: text(
      "Pinecone or Qdrant ingestion and retrieval behind an authorized knowledge-source policy.",
      "Ingesta y recuperación Pinecone o Qdrant bajo una política de fuentes autorizadas.",
    ),
    options: [
      option(
        "pinecone",
        "Pinecone",
        "Managed vector index with a selected namespace.",
        "Índice vectorial gestionado con namespace elegido.",
      ),
      option(
        "qdrant",
        "Qdrant",
        "Managed or self-operated collection with payload filters.",
        "Colección gestionada o propia con filtros de payload.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "deploymentRef",
        "Vector deployment reference",
        "Referencia de despliegue vectorial",
        "text",
        true,
      ),
      field("index", "Index or collection", "Índice o colección", "text", true),
      field(
        "namespace",
        "Workspace namespace",
        "Namespace de espacio",
        "text",
        true,
      ),
      field(
        "embeddingProfileRef",
        "Embedding profile",
        "Perfil de embeddings",
        "text",
        true,
      ),
      field(
        "sourcePolicyRef",
        "Source authorization policy",
        "Política de autorización de fuentes",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "knowledge.read",
        "Retrieve filtered vectors",
        "Recuperar vectores filtrados",
        true,
      ),
      permission(
        "knowledge.ingest",
        "Ingest authorized documents",
        "Ingerir documentos autorizados",
      ),
      permission(
        "knowledge.delete",
        "Remove authorized indexed sources",
        "Eliminar fuentes indexadas autorizadas",
      ),
    ],
    resourceTypes: ["vector-index", "vector-collection", "knowledge-source"],
    resourceLabel: text(
      "Vector indexes and collections",
      "Índices y colecciones vectoriales",
    ),
    actions: [
      allow("knowledge.read", retrieveDocuments),
      allow("knowledge.ingest", ingestDocument),
      allow(
        "knowledge.delete",
        action(
          "delete-source",
          "delete-source",
          "Remove a vector-store knowledge source",
          "Eliminar una fuente del almacén vectorial",
          "The backend resolves an authorized source to Pinecone IDs in the configured namespace or Qdrant points under the collection's source filter, reconciles its source registry and reports deletion state. The browser supplies no vector filter or delete-all command.",
          "El backend resuelve la fuente autorizada a IDs Pinecone del namespace o puntos Qdrant con filtro de fuente, concilia su registro e informa del borrado. El navegador no envía filtros vectoriales ni órdenes de borrar todo.",
          [
            resource,
            field(
              "sourceId",
              "Authorized source ID",
              "ID de fuente autorizada",
              "text",
              true,
            ),
            field(
              "expectedUpdatedAt",
              "Observed source update time",
              "Fecha de actualización observada de la fuente",
            ),
            field("reason", "Removal reason", "Motivo de eliminación"),
          ],
        ),
      ),
      allow(
        "knowledge.read",
        action(
          "vector-index-report",
          "query",
          "Inspect vector index state",
          "Consultar estado del índice vectorial",
          "Read namespace/collection state and consumer freshness metadata without exposing vectors or credentials.",
          "Consulta estado y frescura sin exponer vectores ni credenciales.",
          [resource, since],
        ),
      ),
    ],
    serviceNote: text(
      "Observed SDKs Apache-2.0; Pinecone hosted, Qdrant server and hosted terms differ. Consumer server supplies embedding, dimensions, payload/namespace ACLs, retries and source deletion reconciliation. It chooses the supported Pinecone API or Qdrant point selector, validates source ownership and confirms removal through follow-up state. This workflow does not delete the index, collection, namespace or original external files.",
      "SDK observados Apache-2.0; alojamiento Pinecone y servidor/alojamiento Qdrant tienen condiciones distintas. El servidor aporta embeddings, dimensiones, ACL, reintentos y conciliación de fuentes borradas. Elige API Pinecone o selector Qdrant, valida propiedad y confirma el resultado posterior. El flujo no elimina índice, colección, namespace ni archivos externos originales.",
    ),
  }),
  define({
    id: "langfuse",
    family: "observability",
    description: text(
      "Redacted AI traces, usage and approved evaluation runs for a selected Langfuse project.",
      "Trazas AI filtradas, consumo y evaluaciones permitidas de un proyecto Langfuse.",
    ),
    options: [
      option(
        "langfuse",
        "Langfuse",
        "Tracing/evaluation deployment, independent of the model provider.",
        "Despliegue de trazas/evaluación independiente del proveedor de modelos.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "projectRef",
        "Langfuse project reference",
        "Referencia de proyecto Langfuse",
        "text",
        true,
      ),
      field(
        "telemetryProfileRef",
        "Server telemetry profile",
        "Perfil de telemetría servidor",
        "text",
        true,
      ),
      field(
        "redactionPolicyRef",
        "Trace redaction policy",
        "Política de filtrado de trazas",
        "text",
        true,
      ),
      field(
        "datasetRef",
        "Approved evaluation dataset",
        "Dataset de evaluación permitido",
      ),
    ],
    permissions: [
      permission(
        "traces.read",
        "Read redacted AI traces",
        "Leer trazas AI filtradas",
        true,
      ),
      permission(
        "evaluations.run",
        "Run approved evaluations",
        "Ejecutar evaluaciones permitidas",
      ),
    ],
    resourceTypes: ["trace-project", "evaluation-dataset"],
    resourceLabel: text(
      "Trace projects and datasets",
      "Proyectos de trazas y datasets",
    ),
    actions: [
      allow("traces.read", traceReport),
      allow("traces.read", usageReport),
      allow(
        "evaluations.run",
        action(
          "run-dataset-evaluation",
          "evaluate",
          "Run an approved dataset evaluation",
          "Ejecutar evaluación de dataset",
          "The consumer starts an approved evaluation, validates its evaluator and controls model usage and data retention.",
          "El consumidor inicia evaluación permitida, valida el evaluador y controla consumo de modelos y retención.",
          [
            field(
              "datasetRef",
              "Dataset reference",
              "Referencia de dataset",
              "text",
              true,
            ),
            field(
              "evaluatorRef",
              "Approved evaluator",
              "Evaluador permitido",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "JavaScript SDKs MIT; server/hosted and enterprise terms separate. AI SDK 7 integration uses registerTelemetry and @langfuse/vercel-ai-sdk, not v6 experimental telemetry. Consumer initialization, flushing and redaction are opt-in.",
      "SDK JavaScript MIT; servidor/alojamiento y empresa tienen condiciones separadas. AI SDK 7 usa registerTelemetry y @langfuse/vercel-ai-sdk, no telemetría experimental v6. Inicialización, flush y filtrado son optativos.",
    ),
  }),
  define({
    id: "alternative-ai-observability",
    family: "observability",
    description: text(
      "Choose LangSmith for trace/evaluation workflows or Helicone for proxy-oriented AI diagnostics.",
      "Elige LangSmith para trazas/evaluación o Helicone para diagnóstico AI orientado a proxy.",
    ),
    options: [
      option(
        "langsmith",
        "LangSmith",
        "Trace projects and approved dataset evaluations.",
        "Proyectos de trazas y evaluaciones de datasets permitidas.",
      ),
      option(
        "helicone",
        "Helicone",
        "Proxy/instrumentation diagnostics and usage reports.",
        "Diagnóstico de proxy/instrumentación e informes de consumo.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "projectRef",
        "Observability project reference",
        "Referencia de proyecto de observabilidad",
        "text",
        true,
      ),
      field(
        "instrumentationRef",
        "Backend instrumentation/proxy profile",
        "Perfil de instrumentación/proxy backend",
        "text",
        true,
      ),
      field(
        "redactionPolicyRef",
        "Redaction and retention policy",
        "Política de filtrado y retención",
        "text",
        true,
      ),
      field(
        "datasetRef",
        "LangSmith evaluation dataset",
        "Dataset de evaluación LangSmith",
      ),
    ],
    permissions: [
      permission(
        "traces.read",
        "Read authorized traces",
        "Leer trazas autorizadas",
        true,
      ),
      permission(
        "evaluations.run",
        "Run LangSmith evaluations",
        "Ejecutar evaluaciones LangSmith",
      ),
    ],
    resourceTypes: ["trace-project", "evaluation-dataset"],
    resourceLabel: text(
      "AI diagnostic projects",
      "Proyectos de diagnóstico AI",
    ),
    actions: [
      allow("traces.read", traceReport),
      allow("traces.read", usageReport),
      allow(
        "evaluations.run",
        action(
          "run-langsmith-evaluation",
          "evaluate",
          "Run a LangSmith evaluation",
          "Ejecutar evaluación LangSmith",
          "Start a consumer-approved LangSmith dataset evaluation; this action is not offered as a native Helicone capability.",
          "Inicia evaluación LangSmith permitida; esta acción no se ofrece como capacidad nativa Helicone.",
          [
            field(
              "datasetRef",
              "Dataset reference",
              "Referencia de dataset",
              "text",
              true,
            ),
            field(
              "evaluatorRef",
              "Evaluator reference",
              "Referencia de evaluador",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "LangSmith SDK MIT; optional Helicone SDK and server/hosted terms must be checked separately. Consumer collection, proxy routing, redaction and data residency remain external; connection alone collects no traces.",
      "SDK LangSmith MIT; SDK Helicone opcional y servidor/alojamiento se verifican por separado. Recopilación, proxy, filtrado y residencia son externos; conectar no recopila trazas.",
    ),
  }),
  define({
    id: "mcp",
    family: "agents",
    description: text(
      "A consumer-owned MCP connection for approved tools, resources and prompts, with explicit tool review.",
      "Conexión MCP del consumidor para herramientas, recursos y prompts permitidos, con revisión explícita.",
    ),
    options: [
      option(
        "mcp",
        "Model Context Protocol",
        "Protocol connection, not an application OAuth broker or sync engine.",
        "Conexión de protocolo, no broker OAuth de aplicaciones ni motor de sincronización.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "serverRef",
        "Approved MCP server",
        "Servidor MCP permitido",
        "text",
        true,
      ),
      select("transport", "Consumer transport", "Transporte del consumidor", [
        ["streamable-http", "Streamable HTTP", "HTTP streaming"],
        ["stdio", "Server-side stdio", "Stdio en servidor"],
      ]),
      field(
        "toolPolicyRef",
        "Approved tool allowlist",
        "Lista de herramientas permitidas",
        "text",
        true,
      ),
      field(
        "resourcePolicyRef",
        "Resource access policy",
        "Política de acceso a recursos",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "tools.read",
        "Inspect tool and resource catalogue",
        "Consultar catálogo de herramientas y recursos",
        true,
      ),
      permission(
        "tools.execute",
        "Request approved tool execution",
        "Solicitar ejecución de herramientas",
      ),
      permission(
        "tools.approve",
        "Decide pending tool approvals",
        "Decidir aprobaciones pendientes",
      ),
    ],
    resourceTypes: ["mcp-tool", "mcp-resource", "mcp-prompt"],
    resourceLabel: text(
      "MCP tools and resources",
      "Herramientas y recursos MCP",
    ),
    actions: [
      allow(
        "tools.read",
        action(
          "tool-catalogue",
          "query",
          "Inspect approved MCP tools",
          "Consultar herramientas MCP permitidas",
          "Read negotiated tool/resource metadata and consumer permissions; advertised capability is not authorization to execute.",
          "Consulta capacidades negociadas y permisos; una capacidad anunciada no autoriza ejecución.",
          [searchText],
        ),
      ),
      allow("tools.execute", executeTool),
      allow("tools.approve", approveTool),
    ],
    serviceNote: text(
      "TypeScript SDK MIT. Specification 2026-07-28 defines HTTP transport authorization, not application account OAuth, token vaulting or sync. Consumer host validates tools; stdio executes only on its backend.",
      "SDK TypeScript MIT. La especificación 2026-07-28 define autorización HTTP, no OAuth de cuentas, bóveda de tokens ni sincronización. El host valida herramientas; stdio solo se ejecuta en backend.",
    ),
  }),
  define({
    id: "cloudflare-agents",
    family: "agents",
    description: text(
      "Configured Cloudflare Workers/Durable Objects agents with run, tool and durable-state controls.",
      "Agentes Cloudflare Workers/Durable Objects configurados con controles de ejecución, herramientas y estado duradero.",
    ),
    options: [
      option(
        "cloudflare-agents",
        "Cloudflare Agents SDK",
        "Consumer-deployed agent actors; optional browser hooks from agents/react.",
        "Actores desplegados por consumidor; hooks opcionales desde agents/react.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "workerRef",
        "Consumer agent Worker",
        "Worker de agentes del consumidor",
        "text",
        true,
      ),
      field(
        "agentClassRef",
        "Deployed agent class",
        "Clase de agente desplegada",
        "text",
        true,
      ),
      field(
        "actorNamespace",
        "Workspace actor namespace",
        "Espacio de actores del workspace",
        "text",
        true,
      ),
      field(
        "toolPolicyRef",
        "Tool execution policy",
        "Política de ejecución de herramientas",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "agents.read",
        "Read agent state",
        "Leer estado del agente",
        true,
      ),
      permission(
        "agents.run",
        "Start approved agent runs",
        "Iniciar agentes permitidos",
      ),
      permission(
        "tools.execute",
        "Request approved tools",
        "Solicitar herramientas permitidas",
      ),
      permission(
        "tools.approve",
        "Review pending tools",
        "Revisar herramientas pendientes",
      ),
      permission(
        "checkpoints.write",
        "Persist authorized checkpoints",
        "Guardar checkpoints autorizados",
      ),
    ],
    resourceTypes: ["agent-actor", "agent-tool"],
    resourceLabel: text(
      "Agent actors and tools",
      "Actores y herramientas de agente",
    ),
    actions: [
      allow(
        "agents.read",
        action(
          "actor-state-report",
          "query",
          "Inspect actor state",
          "Consultar estado del actor",
          "Read authorized actor state and schedule metadata from the deployed consumer Worker.",
          "Consulta estado y metadatos de programación autorizados desde el Worker consumidor.",
          [resource],
        ),
      ),
      allow("agents.run", runAgent),
      allow("tools.execute", executeTool),
      allow("tools.approve", approveTool),
      allow(
        "checkpoints.write",
        action(
          "checkpoint-actor",
          "checkpoint",
          "Persist an actor checkpoint",
          "Guardar checkpoint del actor",
          "Request a workspace-scoped checkpoint through the consumer's durable-state implementation.",
          "Solicita checkpoint del espacio mediante persistencia del consumidor.",
          [
            name,
            field(
              "actorRef",
              "Actor reference",
              "Referencia de actor",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "MIT agents package. The consumer deploys and operates Workers, Durable Objects, model bindings and tool ACLs separately; Workers Static Assets hosting alone provides no agent runtime.",
      "Paquete agents MIT. El consumidor despliega Workers, Durable Objects, modelos y ACL por separado; alojamiento Workers Static Assets por sí solo no aporta runtime de agentes.",
    ),
  }),
  define({
    id: "langgraph",
    family: "agents",
    description: text(
      "Approved LangGraph graph runs, thread checkpoints and tool decisions on a consumer backend.",
      "Ejecuciones LangGraph permitidas, checkpoints de hilos y decisiones de herramientas en backend consumidor.",
    ),
    options: [
      option(
        "langgraph",
        "LangGraph + LangChain core",
        "Graph orchestration with complementary core primitives.",
        "Orquestación de grafos con primitivas core complementarias.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "graphRef",
        "Approved graph reference",
        "Referencia de grafo permitido",
        "text",
        true,
      ),
      field(
        "threadNamespace",
        "Workspace thread namespace",
        "Espacio de hilos del workspace",
        "text",
        true,
      ),
      field(
        "checkpointerRef",
        "Persistent checkpointer reference",
        "Referencia de checkpointer persistente",
        "text",
        true,
      ),
      field(
        "toolPolicyRef",
        "Tool execution policy",
        "Política de herramientas",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "agents.read",
        "Inspect graph threads",
        "Consultar hilos del grafo",
        true,
      ),
      permission(
        "agents.run",
        "Start graph runs",
        "Iniciar ejecuciones de grafo",
      ),
      permission(
        "tools.approve",
        "Review interrupted tools",
        "Revisar herramientas interrumpidas",
      ),
      permission(
        "checkpoints.write",
        "Persist graph checkpoints",
        "Guardar checkpoints del grafo",
      ),
    ],
    resourceTypes: ["agent-graph", "agent-thread"],
    resourceLabel: text("Graphs and threads", "Grafos e hilos"),
    actions: [
      allow(
        "agents.read",
        action(
          "thread-state-report",
          "query",
          "Inspect graph thread",
          "Consultar hilo del grafo",
          "Read authorized thread state, pending interrupts and checkpoint references.",
          "Consulta estado autorizado, interrupciones pendientes y referencias de checkpoints.",
          [
            field(
              "threadId",
              "Thread reference",
              "Referencia de hilo",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow("agents.run", runAgent),
      allow("tools.approve", approveTool),
      allow(
        "checkpoints.write",
        action(
          "checkpoint-thread",
          "checkpoint",
          "Persist thread checkpoint",
          "Guardar checkpoint del hilo",
          "The consumer validates thread ownership and persists state with its configured checkpointer.",
          "El consumidor valida propiedad del hilo y persiste estado con su checkpointer.",
          [
            name,
            field(
              "threadId",
              "Thread reference",
              "Referencia de hilo",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "LangGraph/LangChain core MIT; managed deployment terms differ. Core is not a second platform. The consumer supplies graph nodes, model/tool authorization and durable checkpointer storage.",
      "LangGraph/LangChain core MIT; despliegue gestionado tiene condiciones distintas. Core no es otra plataforma. El consumidor aporta nodos, autorización de modelos/herramientas y almacenamiento duradero.",
    ),
  }),
  define({
    id: "openai-agents",
    family: "agents",
    description: text(
      "Consumer-configured OpenAI agent runs, tool approvals and handoff reports, separate from basic Responses.",
      "Agentes OpenAI configurados por consumidor, aprobaciones e informes de handoff, separados de Responses básico.",
    ),
    options: [
      option(
        "openai-agents",
        "OpenAI Agents SDK",
        "Agent orchestration, tools and handoffs on the consumer server.",
        "Orquestación, herramientas y transferencias en servidor consumidor.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "agentProfileRef",
        "Approved agent profile",
        "Perfil de agente permitido",
        "text",
        true,
      ),
      field(
        "handoffPolicyRef",
        "Allowed handoff policy",
        "Política de handoff permitida",
        "text",
        true,
      ),
      field(
        "toolPolicyRef",
        "Approved tool policy",
        "Política de herramientas",
        "text",
        true,
      ),
      field(
        "sessionStoreRef",
        "Consumer session store",
        "Almacén de sesiones del consumidor",
      ),
    ],
    permissions: [
      permission(
        "agents.read",
        "Read agent run reports",
        "Leer informes de agentes",
        true,
      ),
      permission(
        "agents.run",
        "Start approved agents",
        "Iniciar agentes permitidos",
      ),
      permission(
        "tools.execute",
        "Request approved tools",
        "Solicitar herramientas permitidas",
      ),
      permission(
        "tools.approve",
        "Review tool approvals",
        "Revisar aprobaciones de herramientas",
      ),
    ],
    resourceTypes: ["agent-profile", "handoff-policy"],
    resourceLabel: text(
      "Agents and handoff policies",
      "Agentes y políticas de handoff",
    ),
    actions: [
      allow(
        "agents.read",
        action(
          "handoff-report",
          "query",
          "Inspect run and handoffs",
          "Consultar ejecución y handoffs",
          "Read redacted consumer run metadata and allowed handoff outcomes; no agent is started.",
          "Consulta metadatos filtrados y resultados autorizados sin iniciar agente.",
          [
            field(
              "runId",
              "Run reference",
              "Referencia de ejecución",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow("agents.run", runAgent),
      allow("tools.execute", executeTool),
      allow("tools.approve", approveTool),
    ],
    serviceNote: text(
      "MIT SDK; model service terms separate. Consumer policies, credential storage, retries and durable execution are required; this SDK alone is not a third-party OAuth vault or durable workflow engine.",
      "SDK MIT; condiciones de modelos separadas. Se necesitan políticas, credenciales, reintentos y ejecución duradera; el SDK por sí solo no es bóveda OAuth ni motor duradero.",
    ),
  }),
  define({
    id: "slack",
    family: "connectors",
    description: text(
      "Selected Slack workspace channels and reviewed messages through the consumer's OAuth installation.",
      "Canales elegidos de un workspace Slack y mensajes revisados mediante instalación OAuth del consumidor.",
    ),
    options: [
      option(
        "slack",
        "Slack",
        "End-user workspace connection and authorized channel actions.",
        "Conexión de workspace del usuario y acciones de canal autorizadas.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "workspaceRef",
        "Slack workspace reference",
        "Referencia de workspace Slack",
        "text",
        true,
      ),
      field(
        "channelPolicyRef",
        "Allowed channel policy",
        "Política de canales permitidos",
        "text",
        true,
      ),
      field(
        "eventSubscriptionRef",
        "Backend event subscription",
        "Suscripción de eventos backend",
      ),
    ],
    permissions: [
      permission(
        "channels.read",
        "Inspect selected Slack channels",
        "Consultar canales Slack elegidos",
        true,
      ),
      permission(
        "messages.publish",
        "Post reviewed Slack messages",
        "Publicar mensajes Slack revisados",
      ),
    ],
    resourceTypes: ["slack-channel"],
    resourceLabel: text("Selected Slack channels", "Canales Slack elegidos"),
    actions: [
      allow(
        "channels.read",
        action(
          "channel-report",
          "query",
          "Inspect selected channels",
          "Consultar canales elegidos",
          "Read authorized channel and message metadata according to installation permissions and retention.",
          "Consulta metadatos de canales y mensajes según permisos de instalación y retención.",
          [resource, since, limit],
        ),
      ),
      allow(
        "messages.publish",
        action(
          "post-channel-message",
          "publish-message",
          "Post a Slack message",
          "Publicar mensaje Slack",
          "Post reviewed content to a selected channel; the backend enforces workspace membership and message policy.",
          "Publica contenido revisado en un canal elegido; el backend aplica membresía y política de mensajes.",
          [
            resource,
            content,
            field(
              "threadRef",
              "Optional thread reference",
              "Referencia opcional de hilo",
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "MIT Node SDK; Slack service terms separate. Consumer OAuth installation, token rotation, signing-secret event verification, cursors and rate-limit handling remain backend responsibilities.",
      "SDK Node MIT; condiciones Slack separadas. Instalación OAuth, rotación de tokens, verificación de eventos, cursores y límites son responsabilidades backend.",
    ),
  }),
  define({
    id: "github-apps",
    family: "connectors",
    description: text(
      "Repository, issue and pull-request operations scoped to a GitHub App installation, with reviewed issue and PR creation.",
      "Operaciones de repositorios, incidencias y pull requests acotadas a una instalación GitHub App, con creación revisada.",
    ),
    options: [
      option(
        "github-apps",
        "GitHub App",
        "Installation-level repository permissions, not an unrestricted personal token.",
        "Permisos de repositorio por instalación, no un token personal sin restricciones.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "installationRef",
        "GitHub App installation",
        "Instalación GitHub App",
        "text",
        true,
      ),
      field(
        "owner",
        "Repository owner",
        "Propietario del repositorio",
        "text",
        true,
      ),
      field(
        "repository",
        "Selected repository",
        "Repositorio elegido",
        "text",
        true,
      ),
      field(
        "pullRequestPolicyRef",
        "Approved branch, fork and draft policy",
        "Política permitida de ramas, forks y borradores",
      ),
    ],
    permissions: [
      permission(
        "repositories.read",
        "Read selected repositories, issues and PRs",
        "Leer repositorios, incidencias y PRs seleccionados",
        true,
      ),
      permission(
        "issues.write",
        "Create or update approved issues",
        "Crear o actualizar incidencias permitidas",
      ),
      permission(
        "pull-requests.write",
        "Create reviewed pull requests",
        "Crear pull requests revisados",
      ),
    ],
    resourceTypes: [
      "github-repository",
      "github-branch",
      "github-issue",
      "github-pull-request",
    ],
    resourceLabel: text(
      "Installed repositories, branches and PRs",
      "Repositorios, ramas y PRs de la instalación",
    ),
    actions: [
      allow(
        "repositories.read",
        action(
          "repository-issues",
          "query",
          "Inspect repository issues",
          "Consultar incidencias",
          "Read selected repository issues through the installation's authorized consumer handler.",
          "Consulta incidencias mediante el handler autorizado de la instalación.",
          [searchText, since, limit],
        ),
      ),
      allow(
        "repositories.read",
        action(
          "repository-pull-requests",
          "query",
          "Read repository pull requests",
          "Leer pull requests del repositorio",
          "Read PRs and approved branch metadata only for selected installation repositories; the consumer maps actual read permissions and pagination.",
          "Consulta PRs y metadatos de ramas permitidas solo de repositorios seleccionados; el consumidor mapea permisos reales y paginación.",
          [
            resource,
            select("state", "Pull request state", "Estado del pull request", [
              ["open", "Open", "Abierto"],
              ["closed", "Closed", "Cerrado"],
              ["all", "All states", "Todos los estados"],
            ]),
            field("head", "Approved source branch", "Rama origen permitida"),
            field("base", "Approved target branch", "Rama destino permitida"),
            limit,
          ],
        ),
      ),
      allow(
        "issues.write",
        action(
          "create-issue",
          "create-ticket",
          "Create a repository issue",
          "Crear incidencia del repositorio",
          "Create a reviewed issue using allowed labels and an installation token held only on the server.",
          "Crea incidencia revisada con etiquetas permitidas y token de instalación solo en servidor.",
          [
            field("title", "Issue title", "Título de incidencia", "text", true),
            field("description", "Issue body", "Contenido", "text", true),
            field("labelRef", "Allowed label", "Etiqueta permitida"),
          ],
        ),
      ),
      allow(
        "issues.write",
        action(
          "update-issue",
          "update-record",
          "Update an authorized issue",
          "Actualizar incidencia autorizada",
          "Validate issue ownership and allowed state changes; this is not merge or repository administration.",
          "Valida propiedad y cambios de estado permitidos; no fusiona código ni administra repositorios.",
          [
            recordId,
            field("title", "Issue title", "Título"),
            field(
              "stateRef",
              "Allowed issue state",
              "Estado de incidencia permitido",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow(
        "pull-requests.write",
        action(
          "create-pull-request",
          "create-pull-request",
          "Create a reviewed pull request",
          "Crear un pull request revisado",
          "Create an open or supported draft PR between existing approved branches. The backend verifies the installation, repositories, fork policy, branch refs, draft capability and duplicate requests, then returns the acknowledged PR record.",
          "Crea un PR abierto o borrador admitido entre ramas existentes permitidas. El backend verifica instalación, repositorios, forks, ramas, capacidad de borrador y duplicados, y devuelve el registro confirmado.",
          [
            resource,
            field(
              "title",
              "Pull request title",
              "Título del pull request",
              "text",
              true,
            ),
            field(
              "description",
              "Pull request description",
              "Descripción del pull request",
            ),
            field(
              "head",
              "Approved source branch",
              "Rama origen permitida",
              "text",
              true,
            ),
            field(
              "base",
              "Approved target branch",
              "Rama destino permitida",
              "text",
              true,
            ),
            field(
              "headRepositoryRef",
              "Optional authorized source repository",
              "Repositorio origen autorizado opcional",
            ),
            field(
              "draft",
              "Request a draft PR",
              "Solicitar PR borrador",
              "toggle",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "Octokit REST MIT; GitHub service terms separate. Octokit is a client, not credential lifecycle. Consumer app keys, installation tokens, actual repository/issue/PR permissions and verified webhooks are required. PR creation uses existing branches and account-supported draft/fork behavior; it does not commit, push, merge or bypass repository rules. Consumer idempotency and provider-confirmed result state remain required.",
      "Octokit REST MIT; condiciones GitHub separadas. Octokit es cliente, no ciclo de credenciales. Se necesitan claves App, tokens, permisos reales de repositorios/incidencias/PRs y webhooks verificados. Crear PR usa ramas existentes y borradores/forks admitidos; no hace commit, push, merge ni evita reglas. El consumidor aporta idempotencia y estado confirmado.",
    ),
  }),
  define({
    id: "google-drive",
    family: "connectors",
    description: text(
      "User-selected Drive files through a consumer Picker connection with deliberately narrow file access.",
      "Archivos Drive elegidos por usuario mediante Picker del consumidor con acceso deliberadamente acotado.",
    ),
    options: [
      option(
        "google-drive",
        "Google Drive + Picker",
        "Picker selects files; the server API library is a separate role.",
        "Picker selecciona archivos; la biblioteca API de servidor tiene otro rol.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "projectRef",
        "Google project reference",
        "Referencia de proyecto Google",
        "text",
        true,
      ),
      field(
        "pickerProfileRef",
        "Consumer Picker profile",
        "Perfil Picker del consumidor",
        "text",
        true,
      ),
      field(
        "fileSelectionRef",
        "Authorized file selection",
        "Selección de archivos autorizada",
        "text",
        true,
      ),
      field(
        "importPolicyRef",
        "Document import policy",
        "Política de importación documental",
      ),
    ],
    permissions: [
      permission(
        "files.read",
        "Read selected Drive files",
        "Leer archivos Drive elegidos",
        true,
      ),
      permission(
        "files.write",
        "Rename selected Drive files",
        "Renombrar archivos Drive elegidos",
      ),
      permission(
        "documents.import",
        "Import selected file content",
        "Importar contenido de archivos elegidos",
      ),
    ],
    resourceTypes: ["drive-file"],
    resourceLabel: text(
      "Picker-selected files",
      "Archivos elegidos con Picker",
    ),
    actions: [
      allow(
        "files.read",
        action(
          "selected-file-report",
          "query",
          "Inspect selected files",
          "Consultar archivos elegidos",
          "Read only files authorized through the consumer's selection; this is not whole-Drive discovery.",
          "Consulta solo archivos autorizados por la selección; no descubre todo Drive.",
          [resource, limit],
        ),
      ),
      allow(
        "files.write",
        action(
          "rename-selected-file",
          "update-record",
          "Rename a selected file",
          "Renombrar archivo elegido",
          "Update the selected file's name after backend authorization and revision checks.",
          "Actualiza el nombre tras autorización backend y comprobaciones de revisión.",
          [recordId, name],
        ),
      ),
      allow(
        "documents.import",
        action(
          "import-drive-file",
          "ingest",
          "Import a selected document",
          "Importar documento elegido",
          "The backend exports/reads authorized content and preserves source ACLs, citations and deletion policy.",
          "El backend exporta/lee contenido autorizado y conserva ACL, citas y política de borrado.",
          [resource, name],
        ),
      ),
    ],
    serviceNote: text(
      "googleapis Apache-2.0 is a server library, not the Picker SDK. Consumer browser Picker and backend OAuth default to drive.file where applicable; broader access requires deliberate review and provider verification.",
      "googleapis Apache-2.0 es biblioteca servidor, no SDK Picker. Picker y OAuth del consumidor priorizan drive.file cuando procede; acceso más amplio requiere revisión y verificación del proveedor.",
    ),
  }),
  define({
    id: "google-calendar",
    family: "connectors",
    description: text(
      "Selected Google calendars, bounded event reads and reviewed event creation or updates.",
      "Calendarios Google elegidos, lectura acotada y creación o actualización de eventos revisada.",
    ),
    options: [
      option(
        "google-calendar",
        "Google Calendar",
        "Calendar-specific OAuth connection, independent of Drive.",
        "Conexión OAuth de calendario independiente de Drive.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "calendarRef",
        "Authorized calendar reference",
        "Referencia de calendario autorizado",
        "text",
        true,
      ),
      field(
        "timezone",
        "Default IANA timezone",
        "Zona horaria IANA predeterminada",
        "text",
        true,
      ),
      field(
        "attendeePolicyRef",
        "Attendee/invitation policy",
        "Política de asistentes e invitaciones",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "calendar.read",
        "Read selected calendar events",
        "Leer eventos del calendario",
        true,
      ),
      permission(
        "calendar.write",
        "Create or update calendar events",
        "Crear o actualizar eventos",
      ),
    ],
    resourceTypes: ["google-calendar"],
    resourceLabel: text("Selected calendars", "Calendarios elegidos"),
    actions: [
      allow("calendar.read", calendarQuery),
      allow("calendar.write", calendarEvent),
      allow(
        "calendar.write",
        action(
          "update-event",
          "update-record",
          "Update an authorized event",
          "Actualizar evento autorizado",
          "Change allowlisted event fields with backend event/version checks and explicit invitation policy.",
          "Cambia campos permitidos con comprobación de evento/versión y política de invitación.",
          [
            recordId,
            field("title", "Event title", "Título del evento", "text", true),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "googleapis Apache-2.0; Google service terms separate. Consumer OAuth maps logical calendar permissions to selected real scopes and supplies sync tokens, push renewal, timezone validation and duplicate prevention.",
      "googleapis Apache-2.0; condiciones Google separadas. OAuth mapea permisos lógicos a scopes reales y aporta tokens de sincronización, renovación push, zonas horarias y prevención de duplicados.",
    ),
  }),
  define({
    id: "notion",
    family: "connectors",
    description: text(
      "Authorized Notion pages and data sources with reviewed content writes and property mappings.",
      "Páginas y fuentes de datos Notion autorizadas con escrituras revisadas y mapeos de propiedades.",
    ),
    options: [
      option(
        "notion",
        "Notion",
        "Selected shared pages and database data sources.",
        "Páginas compartidas y fuentes de datos de bases seleccionadas.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "workspaceRef",
        "Notion workspace reference",
        "Referencia de workspace Notion",
        "text",
        true,
      ),
      field(
        "pageRootRef",
        "Authorized page root",
        "Raíz de páginas autorizada",
        "text",
        true,
      ),
      field(
        "dataSourceRef",
        "Database data source reference",
        "Referencia de fuente de datos",
      ),
      field(
        "propertySchemaRef",
        "Approved property schema",
        "Esquema de propiedades permitido",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "pages.read",
        "Read shared pages and data sources",
        "Leer páginas y fuentes compartidas",
        true,
      ),
      permission(
        "pages.write",
        "Write authorized page content",
        "Escribir contenido de páginas autorizadas",
      ),
      permission(
        "mappings.write",
        "Save property mappings",
        "Guardar mapeos de propiedades",
      ),
    ],
    resourceTypes: ["notion-page", "notion-data-source"],
    resourceLabel: text(
      "Shared pages and data sources",
      "Páginas y fuentes de datos compartidas",
    ),
    actions: [
      allow(
        "pages.read",
        action(
          "query-notion-pages",
          "query",
          "Inspect shared pages",
          "Consultar páginas compartidas",
          "Read authorized pages and schema-aware data-source records under the consumer's API-version policy.",
          "Consulta páginas y registros según esquema y política de versión API del consumidor.",
          [searchText, limit],
        ),
      ),
      allow(
        "pages.write",
        action(
          "save-page-content",
          "save-document",
          "Write a page draft",
          "Escribir borrador de página",
          "The consumer converts the chosen content format to validated Notion blocks and enforces page access.",
          "El consumidor convierte contenido a bloques Notion validados y aplica acceso a páginas.",
          [
            documentId,
            field("title", "Page title", "Título de página", "text", true),
            content,
            documentFormat,
          ],
        ),
      ),
      allow("mappings.write", fieldMapping),
    ],
    serviceNote: text(
      "MIT SDK; hosted terms separate. The consumer supplies OAuth, shared-resource checks, pagination and API-version migration, including data-source distinctions introduced in the 2025-09-03 API.",
      "SDK MIT; condiciones alojadas separadas. El consumidor aporta OAuth, acceso compartido, paginación y migración de versión, incluida la distinción de fuentes de datos de la API 2025-09-03.",
    ),
  }),
  define({
    id: "microsoft-365",
    family: "connectors",
    description: text(
      "Choose SharePoint, OneDrive, Teams or Outlook Calendar, each with its own selected-resource actions.",
      "Elige SharePoint, OneDrive, Teams u Outlook Calendar, cada uno con acciones sobre sus recursos elegidos.",
    ),
    options: [
      option(
        "sharepoint",
        "SharePoint",
        "Selected sites, document libraries and files.",
        "Sitios, bibliotecas y archivos elegidos.",
      ),
      option(
        "onedrive",
        "OneDrive",
        "Selected drive documents and file metadata.",
        "Documentos y metadatos de archivos elegidos.",
      ),
      option(
        "teams",
        "Microsoft Teams",
        "Selected team/channel metadata and reviewed messages.",
        "Metadatos de equipos/canales y mensajes revisados.",
      ),
      option(
        "outlook-calendar",
        "Outlook Calendar",
        "Calendar event reads and reviewed event creation.",
        "Lectura de eventos y creación revisada.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "tenantRef",
        "Microsoft tenant reference",
        "Referencia de tenant Microsoft",
        "text",
        true,
      ),
      field(
        "resourcePolicyRef",
        "Selected Graph resource policy",
        "Política de recursos Graph elegidos",
        "text",
        true,
      ),
      field(
        "siteRef",
        "SharePoint site reference",
        "Referencia de sitio SharePoint",
      ),
      field(
        "driveRef",
        "SharePoint/OneDrive drive reference",
        "Referencia de drive SharePoint/OneDrive",
      ),
      field(
        "channelRef",
        "Teams channel reference",
        "Referencia de canal Teams",
      ),
      field(
        "calendarRef",
        "Outlook calendar reference",
        "Referencia de calendario Outlook",
      ),
      field("timezone", "Calendar timezone", "Zona horaria del calendario"),
    ],
    permissions: [
      permission(
        "workspace.read",
        "Read selected Microsoft resources",
        "Leer recursos Microsoft elegidos",
        true,
      ),
      permission(
        "documents.write",
        "Update authorized document metadata",
        "Actualizar metadatos documentales autorizados",
      ),
      permission(
        "messages.publish",
        "Post reviewed Teams messages",
        "Publicar mensajes Teams revisados",
      ),
      permission(
        "calendar.write",
        "Create reviewed Outlook events",
        "Crear eventos Outlook revisados",
      ),
    ],
    resourceTypes: [
      "sharepoint-site",
      "graph-drive",
      "teams-channel",
      "outlook-calendar",
    ],
    resourceLabel: text(
      "Selected Microsoft resources",
      "Recursos Microsoft elegidos",
    ),
    actions: [
      allow(
        "workspace.read",
        action(
          "document-report",
          "query",
          "Inspect selected documents",
          "Consultar documentos elegidos",
          "Read selected SharePoint/OneDrive files and library metadata through the consumer's Graph authorization.",
          "Consulta archivos y metadatos de biblioteca elegidos mediante autorización Graph.",
          [resource, searchText, limit],
        ),
      ),
      allow(
        "documents.write",
        action(
          "rename-document",
          "update-record",
          "Rename an authorized document",
          "Renombrar documento autorizado",
          "Update selected file metadata with backend tenant, drive and version checks.",
          "Actualiza metadatos con comprobaciones de tenant, drive y versión.",
          [recordId, name],
        ),
      ),
      allow(
        "workspace.read",
        action(
          "teams-channel-report",
          "query",
          "Inspect a Teams channel",
          "Consultar canal Teams",
          "Read selected channel metadata under delegated/application permissions chosen by the consumer.",
          "Consulta metadatos del canal según permisos delegados/de aplicación del consumidor.",
          [resource],
        ),
      ),
      allow(
        "messages.publish",
        action(
          "post-teams-message",
          "publish-message",
          "Post a Teams message",
          "Publicar mensaje Teams",
          "Submit reviewed content only when the consumer's selected Graph permission and endpoint support the operation.",
          "Envía contenido revisado solo si permisos Graph y endpoint elegidos soportan la operación.",
          [resource, content],
        ),
      ),
      allow("workspace.read", calendarQuery),
      allow("calendar.write", calendarEvent),
    ],
    serviceNote: text(
      "Graph client MIT; Microsoft service/tenant agreements separate. The client does not acquire tokens. Consumer identity flow, administrator consent, per-service scopes, delta tokens and change-notification renewal are required.",
      "Cliente Graph MIT; acuerdos Microsoft/tenant separados. El cliente no adquiere tokens. Se necesitan flujo de identidad, consentimiento administrador, scopes por servicio, tokens delta y renovación de notificaciones.",
    ),
  }),
  define({
    id: "linear",
    family: "connectors",
    description: text(
      "Linear team/project issue reads and reviewed engineering-ticket creation through consumer GraphQL handlers.",
      "Consulta de incidencias Linear y creación revisada de tickets mediante handlers GraphQL del consumidor.",
    ),
    options: [
      option(
        "linear",
        "Linear",
        "End-user engineering workspace connection.",
        "Conexión del usuario a workspace de ingeniería.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "workspaceRef",
        "Linear workspace reference",
        "Referencia de workspace Linear",
        "text",
        true,
      ),
      field("teamRef", "Selected team", "Equipo elegido", "text", true),
      field("projectRef", "Selected project", "Proyecto elegido"),
      field(
        "issueSchemaRef",
        "Allowed issue fields",
        "Campos de incidencia permitidos",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "tickets.read",
        "Read selected Linear issues",
        "Leer incidencias Linear elegidas",
        true,
      ),
      permission(
        "tickets.write",
        "Create or update Linear issues",
        "Crear o actualizar incidencias Linear",
      ),
    ],
    resourceTypes: ["linear-team", "linear-project"],
    resourceLabel: text("Teams and projects", "Equipos y proyectos"),
    actions: [
      allow(
        "tickets.read",
        action(
          "query-linear-issues",
          "query",
          "Read engineering issues",
          "Leer incidencias de ingeniería",
          "Read authorized team/project issues with the consumer's cursor and schema mapping.",
          "Consulta incidencias del equipo/proyecto con cursores y esquema del consumidor.",
          [searchText, limit],
        ),
      ),
      allow(
        "tickets.write",
        action(
          "create-linear-issue",
          "create-ticket",
          "Create a Linear issue",
          "Crear incidencia Linear",
          "Resolve team-specific workflow state, priority and assignee before creation.",
          "Resuelve estado, prioridad y asignación del equipo antes de crear.",
          [
            field("title", "Issue title", "Título", "text", true),
            field(
              "description",
              "Issue description",
              "Descripción",
              "text",
              true,
            ),
            field("assigneeRef", "Allowed assignee", "Responsable permitido"),
            field(
              "priority",
              "Team priority",
              "Prioridad del equipo",
              "number",
            ),
          ],
        ),
      ),
      allow(
        "tickets.write",
        action(
          "update-linear-issue",
          "update-record",
          "Update a Linear issue",
          "Actualizar incidencia Linear",
          "Update allowlisted fields under team membership and workflow policy.",
          "Actualiza campos permitidos según membresía y política de workflow.",
          [
            recordId,
            field(
              "stateRef",
              "Allowed workflow state",
              "Estado de workflow permitido",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "No SDK selected in the reviewed catalogue. Consumer OAuth, GraphQL schemas, signed webhooks and cursor/rate-limit handling are required; API/service terms and any separately selected SDK license apply.",
      "No se eligió SDK en el catálogo. Se necesitan OAuth, esquemas GraphQL, webhooks firmados y cursores/límites; aplican condiciones API/servicio y licencia del SDK que se elija.",
    ),
  }),
  define({
    id: "jira",
    family: "connectors",
    description: text(
      "Jira Cloud site/project issues with schema-aware creation, issue-specific transition discovery, reviewed transitions and field mappings.",
      "Incidencias Jira Cloud por sitio/proyecto con creación según esquema, consulta de transiciones por incidencia, transiciones revisadas y mapeos.",
    ),
    options: [
      option(
        "jira",
        "Atlassian Jira Cloud",
        "Project permissions and issue-type-dependent fields.",
        "Permisos de proyecto y campos según tipo de incidencia.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "cloudRef",
        "Atlassian cloud/site reference",
        "Referencia de cloud/sitio Atlassian",
        "text",
        true,
      ),
      field(
        "projectKey",
        "Selected project key",
        "Clave de proyecto elegido",
        "text",
        true,
      ),
      field(
        "issueTypeRef",
        "Allowed issue type",
        "Tipo de incidencia permitido",
        "text",
        true,
      ),
      field(
        "fieldSchemaRef",
        "Create/edit field schema",
        "Esquema de campos de creación/edición",
        "text",
        true,
      ),
      field(
        "transitionPolicyRef",
        "Allowed workflow transition policy",
        "Política de transiciones de workflow permitidas",
      ),
    ],
    permissions: [
      permission(
        "tickets.read",
        "Read project issues",
        "Leer incidencias del proyecto",
        true,
      ),
      permission(
        "tickets.write",
        "Create or update allowed issues",
        "Crear o actualizar incidencias",
      ),
      permission(
        "tickets.transition",
        "Apply reviewed issue transitions",
        "Aplicar transiciones revisadas de incidencias",
      ),
      permission(
        "mappings.write",
        "Save Jira field mappings",
        "Guardar mapeos de campos Jira",
      ),
    ],
    resourceTypes: [
      "jira-project",
      "jira-issue-type",
      "jira-issue",
      "jira-transition",
    ],
    resourceLabel: text(
      "Jira projects, issues and available transitions",
      "Proyectos, incidencias y transiciones disponibles Jira",
    ),
    actions: [
      allow(
        "tickets.read",
        action(
          "query-jira-issues",
          "query",
          "Read project issues",
          "Leer incidencias del proyecto",
          "Apply a backend-approved query template rather than arbitrary JQL supplied by the browser.",
          "Aplica una plantilla de consulta permitida en backend, no JQL arbitrario del navegador.",
          [searchText, limit],
        ),
      ),
      allow(
        "tickets.read",
        action(
          "jira-transition-options",
          "query",
          "Read available issue transitions",
          "Leer transiciones disponibles de la incidencia",
          "Discover transitions and transition-screen fields currently available to the authenticated user for one selected issue. Empty results are not evidence that a fixed status transition is allowed.",
          "Consulta transiciones y campos de pantalla disponibles actualmente para el usuario en una incidencia seleccionada. Una lista vacía no autoriza una transición fija de estado.",
          [
            field(
              "recordId",
              "Jira issue ID or key",
              "ID o clave de incidencia Jira",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow(
        "tickets.write",
        action(
          "create-jira-issue",
          "create-ticket",
          "Create a Jira issue",
          "Crear incidencia Jira",
          "Map validated title/body to project-required fields and approved issue type.",
          "Mapea título/contenido a campos requeridos y tipo permitido del proyecto.",
          [
            field("title", "Issue summary", "Resumen", "text", true),
            field(
              "description",
              "Issue description",
              "Descripción",
              "text",
              true,
            ),
            field("assigneeRef", "Allowed assignee", "Responsable permitido"),
          ],
        ),
      ),
      allow(
        "tickets.transition",
        action(
          "transition-jira-issue",
          "transition-issue",
          "Apply a reviewed Jira transition",
          "Aplicar una transición Jira revisada",
          "Apply a transition ID returned for this issue after validating its current status, transition permission and required screen fields. The backend maps serialized values to Jira's schema and fetches the acknowledged issue state after the transition.",
          "Aplica un ID de transición devuelto para esta incidencia tras validar estado actual, permiso y campos requeridos. El backend mapea valores al esquema Jira y consulta el estado confirmado posterior.",
          [
            field(
              "recordId",
              "Jira issue ID or key",
              "ID o clave de incidencia Jira",
              "text",
              true,
            ),
            field(
              "transitionId",
              "Available transition ID",
              "ID de transición disponible",
              "text",
              true,
            ),
            field(
              "fields",
              "Transition-screen fields (JSON)",
              "Campos de pantalla de transición (JSON)",
            ),
            field(
              "expectedUpdatedAt",
              "Observed issue update time",
              "Fecha de actualización observada",
            ),
          ],
        ),
      ),
      allow("mappings.write", fieldMapping),
    ],
    serviceNote: text(
      "No SDK selected. Consumer 3LO OAuth, cloud/project selection, issue security, transition permissions, transition-screen schemas, verified webhooks and current rate limits require implementation under Atlassian service terms. Transition IDs depend on the issue/user's current workflow; the backend rechecks availability and maps required fields. A transition acknowledgment must be followed by a read of the actual issue state; browser status labels do not define workflow transitions.",
      "No se eligió SDK. OAuth 3LO, selección cloud/proyecto, seguridad de incidencias, permisos y esquemas de transición, webhooks y límites requieren implementación según condiciones Atlassian. Los IDs dependen del workflow y usuario; el backend comprueba disponibilidad y mapea campos. Tras confirmar una transición debe leer el estado real; etiquetas del navegador no definen transiciones.",
    ),
  }),
  define({
    id: "hubspot",
    family: "connectors",
    description: text(
      "HubSpot contact/company/deal reports and reviewed CRM property updates for a selected portal.",
      "Informes de contactos/empresas/negocios HubSpot y cambios de propiedades CRM revisados por portal.",
    ),
    options: [
      option(
        "hubspot",
        "HubSpot",
        "Authorized CRM objects and consumer-defined property mappings.",
        "Objetos CRM autorizados y mapeos de propiedades del consumidor.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "portalRef",
        "HubSpot portal reference",
        "Referencia de portal HubSpot",
        "text",
        true,
      ),
      select("objectType", "CRM object type", "Tipo de objeto CRM", [
        ["contacts", "Contacts", "Contactos"],
        ["companies", "Companies", "Empresas"],
        ["deals", "Deals", "Negocios"],
      ]),
      field(
        "propertySchemaRef",
        "Allowed property schema",
        "Esquema de propiedades permitidas",
        "text",
        true,
      ),
      field(
        "pipelineRef",
        "Selected deal pipeline",
        "Pipeline de negocios elegido",
      ),
    ],
    permissions: [
      permission(
        "crm.read",
        "Read selected CRM objects",
        "Leer objetos CRM elegidos",
        true,
      ),
      permission(
        "crm.write",
        "Update allowed CRM properties",
        "Actualizar propiedades CRM permitidas",
      ),
      permission(
        "mappings.write",
        "Save CRM property mappings",
        "Guardar mapeos de propiedades CRM",
      ),
    ],
    resourceTypes: ["hubspot-object", "hubspot-pipeline"],
    resourceLabel: text("CRM objects and pipelines", "Objetos CRM y pipelines"),
    actions: [
      allow(
        "crm.read",
        action(
          "query-crm-objects",
          "query",
          "Read CRM objects",
          "Leer objetos CRM",
          "Query the selected object type with backend field allowlists, pagination and portal authorization.",
          "Consulta objetos elegidos con campos permitidos, paginación y autorización del portal.",
          [searchText, limit],
        ),
      ),
      allow(
        "crm.write",
        action(
          "update-crm-property",
          "update-record",
          "Update a CRM property",
          "Actualizar propiedad CRM",
          "Apply a schema-validated property value to an authorized CRM record; protected fields remain server-controlled.",
          "Aplica valor validado a registro autorizado; campos protegidos permanecen bajo control servidor.",
          [
            recordId,
            field(
              "propertyRef",
              "Allowed property",
              "Propiedad permitida",
              "text",
              true,
            ),
            field("value", "Property value", "Valor", "text", true),
          ],
        ),
      ),
      allow("mappings.write", fieldMapping),
    ],
    serviceNote: text(
      "No SDK selected; API and hosted terms apply. Consumer OAuth must use currently supported endpoints, with property schemas, webhook verification and object-specific permissions; deprecated OAuth v1 is not a new recipe.",
      "No se eligió SDK; aplican condiciones API y alojamiento. OAuth debe usar endpoints vigentes, con esquemas, webhooks y permisos por objeto; OAuth v1 deprecado no es receta nueva.",
    ),
  }),
  define({
    id: "zendesk",
    family: "connectors",
    description: text(
      "Selected Zendesk support queues, ticket reports and reviewed ticket creation or updates.",
      "Colas Zendesk elegidas, informes de tickets y creación o cambios revisados.",
    ),
    options: [
      option(
        "zendesk",
        "Zendesk",
        "Support-account connection with ticket-specific authorization.",
        "Conexión de soporte con autorización específica de tickets.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "accountRef",
        "Zendesk account reference",
        "Referencia de cuenta Zendesk",
        "text",
        true,
      ),
      field(
        "groupRef",
        "Authorized support group",
        "Grupo de soporte autorizado",
        "text",
        true,
      ),
      field(
        "ticketFormRef",
        "Allowed ticket form",
        "Formulario de ticket permitido",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "tickets.read",
        "Read authorized support tickets",
        "Leer tickets autorizados",
        true,
      ),
      permission(
        "tickets.write",
        "Create or update support tickets",
        "Crear o actualizar tickets",
      ),
    ],
    resourceTypes: ["support-group", "ticket-form"],
    resourceLabel: text(
      "Support groups and forms",
      "Grupos y formularios de soporte",
    ),
    actions: [
      allow(
        "tickets.read",
        action(
          "query-support-tickets",
          "query",
          "Read support tickets",
          "Leer tickets de soporte",
          "Read allowed queue tickets and consumer-normalized status, without exposing unauthorized requester data.",
          "Consulta tickets de colas permitidas sin exponer datos de solicitantes no autorizados.",
          [searchText, since, limit],
        ),
      ),
      allow(
        "tickets.write",
        action(
          "create-support-ticket",
          "create-ticket",
          "Create a support ticket",
          "Crear ticket de soporte",
          "Create a reviewed ticket after requester, form and visibility validation.",
          "Crea ticket revisado tras validar solicitante, formulario y visibilidad.",
          [
            field("subject", "Ticket subject", "Asunto", "text", true),
            field(
              "description",
              "Ticket description",
              "Descripción",
              "text",
              true,
            ),
            field(
              "requesterRef",
              "Authorized requester",
              "Solicitante autorizado",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow(
        "tickets.write",
        action(
          "update-support-ticket",
          "update-record",
          "Update ticket status",
          "Actualizar estado del ticket",
          "Validate queue access and allowed status transitions using the consumer's support policy.",
          "Valida acceso a cola y transiciones de estado según política de soporte.",
          [
            recordId,
            field(
              "statusRef",
              "Allowed ticket status",
              "Estado de ticket permitido",
              "text",
              true,
            ),
          ],
        ),
      ),
    ],
    serviceNote: text(
      "No SDK selected. Consumer account OAuth, requester access, ticket forms, verified webhooks and service limits are required under Zendesk service terms.",
      "No se eligió SDK. Se necesitan OAuth de cuenta, acceso de solicitantes, formularios, webhooks verificados y límites según condiciones Zendesk.",
    ),
  }),
  define({
    id: "salesforce",
    family: "connectors",
    description: text(
      "Salesforce organization records with schema-aware reads, reviewed updates and approved field mappings.",
      "Registros Salesforce por organización con lecturas según esquema, cambios revisados y mapeos permitidos.",
    ),
    options: [
      option(
        "salesforce",
        "Salesforce",
        "Enterprise CRM connection with org and field-level policies.",
        "Conexión CRM empresarial con políticas de organización y campos.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "organizationRef",
        "Salesforce organization reference",
        "Referencia de organización Salesforce",
        "text",
        true,
      ),
      select(
        "environment",
        "Organization environment",
        "Entorno de organización",
        [
          ["sandbox", "Sandbox", "Sandbox"],
          ["production", "Production", "Producción"],
        ],
      ),
      field("objectRef", "Allowed sObject", "sObject permitido", "text", true),
      field(
        "fieldSchemaRef",
        "Field-level access schema",
        "Esquema de acceso por campo",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "crm.read",
        "Read authorized organization records",
        "Leer registros autorizados",
        true,
      ),
      permission(
        "crm.write",
        "Update allowed record fields",
        "Actualizar campos permitidos",
      ),
      permission(
        "mappings.write",
        "Save organization field mappings",
        "Guardar mapeos de campos",
      ),
    ],
    resourceTypes: ["salesforce-object"],
    resourceLabel: text(
      "Allowed Salesforce objects",
      "Objetos Salesforce permitidos",
    ),
    actions: [
      allow(
        "crm.read",
        action(
          "query-salesforce-records",
          "query",
          "Read organization records",
          "Leer registros de organización",
          "Use backend-prepared object queries and field-level security; arbitrary SOQL is not accepted.",
          "Usa consultas preparadas y seguridad por campo; no acepta SOQL arbitrario.",
          [searchText, limit],
        ),
      ),
      allow(
        "crm.write",
        action(
          "update-salesforce-field",
          "update-record",
          "Update an authorized field",
          "Actualizar campo autorizado",
          "Validate object ownership, field permissions and value schema before updating.",
          "Valida propiedad de objeto, permisos de campo y esquema del valor antes de actualizar.",
          [
            recordId,
            field("fieldRef", "Allowed field", "Campo permitido", "text", true),
            field("value", "Field value", "Valor", "text", true),
          ],
        ),
      ),
      allow("mappings.write", fieldMapping),
    ],
    serviceNote: text(
      "No SDK selected. Consumer OAuth application policy, org/environment selection, API-version handling, field-level security and service/enterprise eligibility require separate implementation.",
      "No se eligió SDK. Políticas OAuth, organización/entorno, versión API, seguridad por campo y elegibilidad empresarial requieren implementación separada.",
    ),
  }),
  define({
    id: "oauth-brokers",
    family: "connectors",
    description: text(
      "Choose Nango or Pipedream Connect for account connection, normalized sync reports and approved API actions.",
      "Elige Nango o Pipedream Connect para cuentas, informes de sincronización y acciones API permitidas.",
    ),
    options: [
      option(
        "nango",
        "Nango",
        "Credential lifecycle, approved proxy operations and configured synchronization.",
        "Ciclo de credenciales, proxy permitido y sincronización configurada.",
      ),
      option(
        "pipedream-connect",
        "Pipedream Connect",
        "End-user connected accounts and approved application actions.",
        "Cuentas conectadas del usuario y acciones permitidas de aplicaciones.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "brokerProjectRef",
        "Broker project reference",
        "Referencia de proyecto broker",
        "text",
        true,
      ),
      field(
        "providerConfigRef",
        "Approved provider configuration",
        "Configuración de proveedor permitida",
        "text",
        true,
      ),
      field(
        "endUserRef",
        "Workspace-scoped end-user reference",
        "Referencia de usuario acotada al espacio",
        "text",
        true,
      ),
      field(
        "syncProfileRef",
        "Optional configured sync profile",
        "Perfil de sincronización opcional",
      ),
      field(
        "actionPolicyRef",
        "Allowed proxy/action policy",
        "Política de proxy/acciones permitidas",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "accounts.read",
        "Inspect connected accounts and sync",
        "Consultar cuentas y sincronización",
        true,
      ),
      permission(
        "broker.execute",
        "Request approved broker actions",
        "Solicitar acciones broker permitidas",
      ),
      permission(
        "broker.approve",
        "Review pending API actions",
        "Revisar acciones API pendientes",
      ),
    ],
    resourceTypes: ["connected-account", "broker-sync-profile"],
    resourceLabel: text(
      "Connected accounts and sync profiles",
      "Cuentas conectadas y perfiles de sincronización",
    ),
    actions: [
      allow(
        "accounts.read",
        action(
          "account-health-report",
          "query",
          "Inspect connected account health",
          "Consultar estado de cuenta conectada",
          "Read account status and reconnect needs without reading or returning credentials.",
          "Consulta estado y necesidad de reconexión sin leer ni devolver credenciales.",
          [resource],
        ),
      ),
      allow(
        "accounts.read",
        action(
          "sync-cursor-report",
          "query",
          "Inspect configured synchronization",
          "Consultar sincronización configurada",
          "Read only synchronization implemented by the consumer/provider configuration, including freshness and deletion cursors.",
          "Consulta solo sincronización implementada en la configuración, con frescura y cursores de borrado.",
          [
            field(
              "syncProfileRef",
              "Configured sync profile",
              "Perfil de sincronización configurado",
              "text",
              true,
            ),
            since,
          ],
        ),
      ),
      allow(
        "broker.execute",
        action(
          "request-broker-action",
          "execute-tool",
          "Request an approved API action",
          "Solicitar acción API permitida",
          "Execute only an allowlisted provider operation after workspace/account and input-schema checks; no arbitrary URL proxy is exposed.",
          "Ejecuta solo operación permitida tras validar cuenta, espacio y esquema; no expone proxy de URLs arbitrarias.",
          [
            field(
              "toolName",
              "Allowlisted provider operation",
              "Operación de proveedor permitida",
              "text",
              true,
            ),
            field(
              "arguments",
              "Validated operation arguments (JSON)",
              "Argumentos de operación (JSON)",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow("broker.approve", approveTool),
    ],
    serviceNote: text(
      "Nango platform ELv2/release notices; observed Node SDK requires >=22.22.2. Pipedream React SDK MIT, server notices and Source Available components differ. Consumer licensing/embedding review, credential isolation and provider ACLs remain required.",
      "Plataforma Nango ELv2/avisos de versión; SDK Node observado requiere >=22.22.2. React Pipedream MIT, avisos servidor y componentes Source Available difieren. Se necesitan revisión de licencias, aislamiento y ACL.",
    ),
  }),
  define({
    id: "composio",
    family: "connectors",
    description: text(
      "Connected-account tool sessions for approved agent actions, with explicit account and tool review.",
      "Sesiones de herramientas por cuenta conectada para acciones de agentes permitidas, con revisión explícita.",
    ),
    options: [
      option(
        "composio",
        "Composio",
        "Managed account/tool-session broker, not a durable workflow engine.",
        "Broker gestionado de cuentas/herramientas, no motor de workflows duradero.",
      ),
    ],
    connectionMode: "oauth",
    configurationFields: [
      field(
        "projectRef",
        "Composio project reference",
        "Referencia de proyecto Composio",
        "text",
        true,
      ),
      field(
        "authConfigRef",
        "Approved auth configuration",
        "Configuración Auth permitida",
        "text",
        true,
      ),
      field(
        "accountPolicyRef",
        "Workspace connected-account policy",
        "Política de cuentas del espacio",
        "text",
        true,
      ),
      field(
        "toolkitRef",
        "Approved toolkit",
        "Toolkit permitido",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "tools.read",
        "Inspect authorized accounts and tools",
        "Consultar cuentas y herramientas",
        true,
      ),
      permission(
        "tools.execute",
        "Request toolkit actions",
        "Solicitar acciones del toolkit",
      ),
      permission(
        "tools.approve",
        "Review pending toolkit actions",
        "Revisar acciones pendientes",
      ),
    ],
    resourceTypes: ["connected-account", "toolkit"],
    resourceLabel: text(
      "Connected accounts and toolkits",
      "Cuentas conectadas y toolkits",
    ),
    actions: [
      allow(
        "tools.read",
        action(
          "tool-session-report",
          "query",
          "Inspect tool session",
          "Consultar sesión de herramientas",
          "Read the backend's authorized toolkit and account status; this does not grant all actions in a toolkit.",
          "Consulta toolkit y cuenta autorizados; no concede todas las acciones del toolkit.",
          [resource, searchText],
        ),
      ),
      allow("tools.execute", executeTool),
      allow("tools.approve", approveTool),
    ],
    serviceNote: text(
      "Observed @composio/core 0.25.0 metadata ISC / Node >=22.22.3; repository MIT does not replace release notices. Hosted terms separate. Consumer tool allowlists, account isolation and side-effect policy are required; SDK is not installed.",
      "Metadatos @composio/core 0.25.0 ISC / Node >=22.22.3; MIT del repositorio no sustituye avisos de versión. Condiciones alojadas separadas. Se necesitan listas, aislamiento y control de efectos; SDK no instalado.",
    ),
  }),
  define({
    id: "n8n",
    family: "automation",
    description: text(
      "Organization-controlled predefined backend workflows, exposed as reviewed tasks rather than an end-user workflow builder.",
      "Workflows backend predefinidos controlados por la organización, expuestos como tareas revisadas.",
    ),
    options: [
      option(
        "n8n",
        "n8n",
        "Approved invisible backend workflows and run receipts.",
        "Workflows backend invisibles permitidos y recibos de ejecución.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "deploymentRef",
        "Organization n8n deployment",
        "Despliegue n8n de la organización",
        "text",
        true,
      ),
      field(
        "workflowRef",
        "Predefined approved workflow",
        "Workflow predefinido permitido",
        "text",
        true,
      ),
      field(
        "inputSchemaRef",
        "Allowed workflow input schema",
        "Esquema de entrada permitido",
        "text",
        true,
      ),
      field(
        "webhookPolicyRef",
        "Backend webhook verification policy",
        "Política backend de verificación de webhooks",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "workflows.read",
        "Read predefined workflow receipts",
        "Leer recibos de workflows",
        true,
      ),
      permission(
        "workflows.trigger",
        "Trigger approved backend workflows",
        "Disparar workflows backend permitidos",
      ),
      permission(
        "mappings.write",
        "Map allowed workflow inputs",
        "Mapear entradas permitidas",
      ),
    ],
    resourceTypes: ["predefined-workflow", "workflow-run"],
    resourceLabel: text("Predefined workflows", "Workflows predefinidos"),
    actions: [
      allow(
        "workflows.read",
        action(
          "workflow-run-report",
          "query",
          "Inspect workflow receipts",
          "Consultar recibos de workflow",
          "Read normalized state for organization-controlled workflows without exposing editor or workflow definitions.",
          "Consulta estado normalizado sin exponer editor ni definiciones de workflows.",
          [jobId, since],
        ),
      ),
      allow(
        "workflows.trigger",
        action(
          "trigger-predefined-workflow",
          "trigger-workflow",
          "Trigger a predefined workflow",
          "Disparar workflow predefinido",
          "The backend validates input, account access and idempotency before triggering the configured workflow.",
          "El backend valida entrada, acceso a cuentas e idempotencia antes de disparar el workflow.",
          [
            name,
            field(
              "payload",
              "Allowed business input (JSON)",
              "Entrada de negocio permitida (JSON)",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow("mappings.write", fieldMapping),
    ],
    serviceNote: text(
      "Sustainable Use License permits predefined invisible backend workflows, including end-user accounts when the organization controls workflows. End-user workflow builders via UI, API, MCP or agents need a commercial agreement. Consumer supplies runtime, secrets and webhook safety.",
      "Sustainable Use License permite workflows backend invisibles predefinidos, incluso con cuentas de usuarios si la organización controla los workflows. Builders de usuarios vía UI, API, MCP o agentes requieren acuerdo comercial. El consumidor aporta runtime, secretos y webhooks.",
    ),
  }),
  define({
    id: "managed-automation",
    family: "automation",
    description: text(
      "Choose Make or Zapier for approved managed workflow triggers, business-field mappings and run reports.",
      "Elige Make o Zapier para disparos de workflows gestionados permitidos, mapeos e informes.",
    ),
    options: [
      option(
        "make",
        "Make",
        "Selected scenario or eligible published integration.",
        "Escenario elegido o integración publicada elegible.",
      ),
      option(
        "zapier",
        "Zapier",
        "Selected automation or eligible embedded integration.",
        "Automatización elegida o integración embebida elegible.",
      ),
    ],
    connectionMode: "server",
    configurationFields: [
      field(
        "workspaceRef",
        "Automation workspace reference",
        "Referencia de workspace de automatización",
        "text",
        true,
      ),
      field(
        "workflowRef",
        "Approved scenario or automation",
        "Escenario o automatización permitida",
        "text",
        true,
      ),
      field(
        "inputSchemaRef",
        "Allowed business input schema",
        "Esquema de entrada de negocio permitido",
        "text",
        true,
      ),
      field(
        "deliveryPolicyRef",
        "Authenticated trigger/retry policy",
        "Política de disparo autenticado/reintentos",
        "text",
        true,
      ),
    ],
    permissions: [
      permission(
        "workflows.read",
        "Read approved run state",
        "Leer estado de ejecuciones",
        true,
      ),
      permission(
        "workflows.trigger",
        "Trigger approved automations",
        "Disparar automatizaciones permitidas",
      ),
      permission(
        "mappings.write",
        "Save business input mappings",
        "Guardar mapeos de entradas",
      ),
    ],
    resourceTypes: ["managed-workflow", "workflow-run"],
    resourceLabel: text(
      "Approved managed workflows",
      "Workflows gestionados permitidos",
    ),
    actions: [
      allow(
        "workflows.read",
        action(
          "managed-run-report",
          "query",
          "Inspect automation runs",
          "Consultar ejecuciones de automatización",
          "Read consumer-normalized status and delivery receipts for the selected automation.",
          "Consulta estado y recibos normalizados de la automatización elegida.",
          [jobId, since],
        ),
      ),
      allow(
        "workflows.trigger",
        action(
          "trigger-managed-workflow",
          "trigger-workflow",
          "Trigger selected automation",
          "Disparar automatización elegida",
          "Submit allowlisted business input through an authenticated consumer endpoint, with replay prevention and idempotency.",
          "Envía entrada de negocio permitida mediante endpoint autenticado con prevención de replay e idempotencia.",
          [
            name,
            field(
              "payload",
              "Business input (JSON)",
              "Entrada de negocio (JSON)",
              "text",
              true,
            ),
          ],
        ),
      ),
      allow("mappings.write", fieldMapping),
    ],
    serviceNote: text(
      "Managed service and embedding contracts apply; no SDK is selected. Consumer partner/publication eligibility, approved workflows, authentication, webhook verification and run-state reconciliation require separate implementation.",
      "Aplican contratos de servicio gestionado e integración; no se eligió SDK. Elegibilidad, publicación, workflows, autenticación, webhooks y conciliación requieren implementación del consumidor.",
    ),
  }),
];

/** Mixed-role groups expose only the actions applicable to the selected option. */
export const integrationOptionActionIds: Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
> = {
  "github-apps": {
    "github-apps": [
      "test-connection",
      "repository-issues",
      "repository-pull-requests",
      "create-issue",
      "update-issue",
      "create-pull-request",
    ],
  },
  jira: {
    jira: [
      "test-connection",
      "query-jira-issues",
      "jira-transition-options",
      "create-jira-issue",
      "transition-jira-issue",
      "map-fields",
    ],
  },
  pgvector: {
    pgvector: [
      "test-connection",
      "retrieve-documents",
      "ingest-document",
      "delete-source",
      "source-index-report",
      "evaluate-retrieval",
    ],
  },
  "vector-stores": {
    pinecone: [
      "test-connection",
      "retrieve-documents",
      "ingest-document",
      "delete-source",
      "vector-index-report",
    ],
    qdrant: [
      "test-connection",
      "retrieve-documents",
      "ingest-document",
      "delete-source",
      "vector-index-report",
    ],
  },
  "resend-react-email": {
    resend: [
      "test-connection",
      "template-preview",
      "delivery-report",
      "send-email",
    ],
    "react-email": ["test-connection", "template-preview"],
  },
  "existing-maps": {
    maplibre: ["test-connection", "map-profile-report"],
    "google-maps": [
      "test-connection",
      "map-profile-report",
      "geocode-address",
      "plan-route",
    ],
  },
  "alternative-ai-observability": {
    langsmith: [
      "test-connection",
      "trace-report",
      "usage-report",
      "run-langsmith-evaluation",
    ],
    helicone: ["test-connection", "trace-report", "usage-report"],
  },
  "microsoft-365": {
    sharepoint: ["test-connection", "document-report", "rename-document"],
    onedrive: ["test-connection", "document-report", "rename-document"],
    teams: ["test-connection", "teams-channel-report", "post-teams-message"],
    "outlook-calendar": ["test-connection", "query-events", "save-event"],
  },
};

const definitionsById = new Map(
  integrationDefinitions.map((definition) => [definition.id, definition]),
);
export function getIntegrationDefinition(
  id: string,
): IntegrationDefinition | undefined {
  return definitionsById.get(id);
}
export function getIntegrationAction(
  definition: IntegrationDefinition,
  id: string,
): IntegrationAction | undefined {
  return definition.actions.find((entry) => entry.id === id);
}
export function getIntegrationActionsForOption(
  definition: IntegrationDefinition,
  optionId: string,
): readonly IntegrationAction[] {
  if (!definition.options.some((entry) => entry.id === optionId)) return [];
  const allowed = integrationOptionActionIds[definition.id]?.[optionId];
  return allowed
    ? definition.actions.filter((entry) => allowed.includes(entry.id))
    : definition.actions;
}
