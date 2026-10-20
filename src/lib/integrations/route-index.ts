/** Minimal route metadata; keep the full recipes in the lazily loaded hub. */
export const integrationRouteIndex = [
  {
    "id": "tanstack-query",
    "name": "TanStack Query"
  },
  {
    "id": "supabase-data",
    "name": "Supabase application data"
  },
  {
    "id": "better-auth",
    "name": "Better Auth"
  },
  {
    "id": "clerk",
    "name": "Clerk"
  },
  {
    "id": "supabase-auth",
    "name": "Supabase Auth"
  },
  {
    "id": "authjs-nextauth",
    "name": "Auth.js / NextAuth"
  },
  {
    "id": "enterprise-identity",
    "name": "WorkOS AuthKit / Auth0"
  },
  {
    "id": "swr",
    "name": "SWR"
  },
  {
    "id": "neon-drizzle",
    "name": "Neon with Drizzle ORM"
  },
  {
    "id": "prisma",
    "name": "Prisma ORM"
  },
  {
    "id": "firebase",
    "name": "Firebase"
  },
  {
    "id": "convex",
    "name": "Convex"
  },
  {
    "id": "trpc",
    "name": "tRPC"
  },
  {
    "id": "stripe",
    "name": "Stripe payment processing"
  },
  {
    "id": "paddle",
    "name": "Paddle Merchant of Record"
  },
  {
    "id": "polar",
    "name": "Polar Merchant of Record"
  },
  {
    "id": "lemon-squeezy",
    "name": "Lemon Squeezy"
  },
  {
    "id": "s3-r2-storage",
    "name": "Amazon S3 / Cloudflare R2 storage"
  },
  {
    "id": "supabase-storage",
    "name": "Supabase Storage"
  },
  {
    "id": "cloudinary",
    "name": "Cloudinary media"
  },
  {
    "id": "uploadthing",
    "name": "UploadThing"
  },
  {
    "id": "resend-react-email",
    "name": "Resend with React Email"
  },
  {
    "id": "email-delivery-alternatives",
    "name": "Postmark / SendGrid / Amazon SES"
  },
  {
    "id": "sentry",
    "name": "Sentry"
  },
  {
    "id": "posthog",
    "name": "PostHog"
  },
  {
    "id": "vercel-analytics",
    "name": "Vercel Web Analytics"
  },
  {
    "id": "notification-inboxes",
    "name": "Knock / Novu notifications"
  },
  {
    "id": "background-jobs",
    "name": "Inngest / Trigger.dev jobs"
  },
  {
    "id": "realtime-messaging",
    "name": "Supabase Realtime / Ably / Pusher"
  },
  {
    "id": "liveblocks",
    "name": "Liveblocks collaboration"
  },
  {
    "id": "tiptap",
    "name": "Tiptap editor"
  },
  {
    "id": "lexical",
    "name": "Lexical editor"
  },
  {
    "id": "blocknote",
    "name": "BlockNote editor"
  },
  {
    "id": "algolia",
    "name": "Algolia search"
  },
  {
    "id": "self-hostable-search",
    "name": "Meilisearch / Typesense search"
  },
  {
    "id": "existing-maps",
    "name": "MapLibre and optional Google Maps"
  },
  {
    "id": "mapbox",
    "name": "Mapbox GL JS"
  },
  {
    "id": "ai-sdk",
    "name": "AI SDK 7 with React hooks"
  },
  {
    "id": "openai-responses",
    "name": "OpenAI Responses"
  },
  {
    "id": "anthropic-messages",
    "name": "Anthropic Messages"
  },
  {
    "id": "google-gemini",
    "name": "Google Gemini / Gen AI SDK"
  },
  {
    "id": "ai-gateways",
    "name": "Cloudflare AI Gateway / Vercel AI Gateway / OpenRouter"
  },
  {
    "id": "pgvector",
    "name": "Postgres pgvector retrieval"
  },
  {
    "id": "vector-stores",
    "name": "Pinecone / Qdrant retrieval"
  },
  {
    "id": "langfuse",
    "name": "Langfuse"
  },
  {
    "id": "alternative-ai-observability",
    "name": "LangSmith / Helicone"
  },
  {
    "id": "mcp",
    "name": "Model Context Protocol"
  },
  {
    "id": "cloudflare-agents",
    "name": "Cloudflare Agents SDK"
  },
  {
    "id": "langgraph",
    "name": "LangGraph with LangChain core"
  },
  {
    "id": "openai-agents",
    "name": "OpenAI Agents SDK for TypeScript"
  },
  {
    "id": "slack",
    "name": "Slack"
  },
  {
    "id": "github-apps",
    "name": "GitHub Apps"
  },
  {
    "id": "google-drive",
    "name": "Google Drive with Picker"
  },
  {
    "id": "google-calendar",
    "name": "Google Calendar"
  },
  {
    "id": "notion",
    "name": "Notion"
  },
  {
    "id": "microsoft-365",
    "name": "Microsoft 365 / Microsoft Graph"
  },
  {
    "id": "linear",
    "name": "Linear"
  },
  {
    "id": "jira",
    "name": "Atlassian Jira Cloud"
  },
  {
    "id": "hubspot",
    "name": "HubSpot CRM"
  },
  {
    "id": "zendesk",
    "name": "Zendesk"
  },
  {
    "id": "salesforce",
    "name": "Salesforce"
  },
  {
    "id": "oauth-brokers",
    "name": "Nango / Pipedream Connect"
  },
  {
    "id": "composio",
    "name": "Composio"
  },
  {
    "id": "n8n",
    "name": "n8n predefined backend workflows"
  },
  {
    "id": "managed-automation",
    "name": "Make / Zapier"
  }
] as const;
