import type { Locale } from "@/i18n/messages";

type LocalizedText = Record<Locale, string>;
export type DocumentationArticle = {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  group: LocalizedText;
  files: Partial<Record<Locale, string>>;
  defaultLocale?: Locale;
  retainedScope?: LocalizedText;
};
export type DocNavigationItem = {
  slug: string;
  title: string;
  description: string;
  group: string;
  keywords?: readonly string[];
};
export type DocumentationHeading = {
  id: string;
  text: string;
  level: number;
};
const group = {
  start: { en: "Start building", es: "Empieza a construir" },
  design: { en: "Design system", es: "Sistema de diseño" },
  workflows: { en: "Application workflows", es: "Flujos de aplicaciones" },
  integrations: { en: "Connect your product", es: "Conecta tu producto" },
  community: { en: "Open source", es: "Código abierto" },
};
const websiteFiles = (slug: string): Record<Locale, string> => ({
  en: `docs/website/en/${slug}.md`,
  es: `docs/website/es/${slug}.md`,
});

/** A curated reading order. The Markdown files are the content source of truth. */
export const documentationArticles: readonly DocumentationArticle[] = [
  {
    slug: "start",
    title: { en: "Introduction", es: "Introducción" },
    description: {
      en: "Understand the kit, choose a starting point and make your first interface.",
      es: "Conoce el kit, elige un punto de partida y crea tu primera interfaz.",
    },
    group: group.start,
    files: websiteFiles("start"),
  },
  {
    slug: "installation",
    title: { en: "Installation", es: "Instalación" },
    description: {
      en: "Run the complete Next.js project or add source to an existing application.",
      es: "Ejecuta el proyecto de Next.js o incorpora código a una aplicación existente.",
    },
    group: group.start,
    files: websiteFiles("installation"),
  },
  {
    slug: "components",
    title: { en: "Using components", es: "Usar componentes" },
    description: {
      en: "44 component families, complete examples and the contexts each block needs.",
      es: "44 familias, ejemplos completos y los contextos que necesita cada bloque.",
    },
    group: group.start,
    files: websiteFiles("components"),
  },
  {
    slug: "cli",
    title: { en: "CLI & updates", es: "CLI y actualizaciones" },
    description: {
      en: "Preview source changes, review diffs and protect your customizations.",
      es: "Previsualiza cambios, revisa diferencias y conserva tus personalizaciones.",
    },
    group: group.start,
    files: websiteFiles("cli"),
  },
  {
    slug: "registry",
    title: { en: "shadcn registry", es: "Registry de shadcn" },
    description: {
      en: "Install the 119 source entries, their dependencies and portable assets.",
      es: "Instala las 119 entradas, sus dependencias y los recursos portables.",
    },
    group: group.start,
    files: { en: "docs/registry-compatibility.md" },
  },
  {
    slug: "tokens",
    title: { en: "Tokens & appearance", es: "Tokens y apariencia" },
    description: {
      en: "Six palettes, light and dark themes, materials, shades and isolated scopes.",
      es: "Seis paletas, temas claro y oscuro, materiales, shades y scopes locales.",
    },
    group: group.design,
    files: websiteFiles("tokens"),
  },
  {
    slug: "effects",
    title: { en: "Gradients & effects", es: "Gradientes y efectos" },
    description: {
      en: "Compose original shaders, spotlight, glow, tilt and magnetic interactions.",
      es: "Combina shaders originales, spotlight, glow, tilt e interacciones magnéticas.",
    },
    group: group.design,
    files: { en: "docs/shaders.md", es: "docs/effects.es.md" },
    retainedScope: {
      en: "This technical reference retains its 1.1 effect checkpoint. The six effects remain available in the current source; older QA counts describe that checkpoint.",
      es: "Esta referencia conserva el checkpoint 1.1 de efectos. Los seis efectos siguen disponibles; los resultados antiguos de QA corresponden a ese checkpoint.",
    },
  },
  {
    slug: "motion",
    title: { en: "GSAP & Lenis", es: "GSAP y Lenis" },
    description: {
      en: "Purposeful motion, native application scrolling and reduced-motion behavior.",
      es: "Movimiento con intención, scroll nativo en aplicaciones y movimiento reducido.",
    },
    group: group.design,
    files: websiteFiles("motion"),
  },
  {
    slug: "charts",
    title: { en: "Charts", es: "Gráficos" },
    description: {
      en: "13 chart kinds, series, formatting and an accessible data alternative.",
      es: "13 tipos de gráficos, series, formatos y una alternativa accesible de datos.",
    },
    group: group.design,
    files: websiteFiles("charts"),
  },
  {
    slug: "data-table",
    title: { en: "Data tables", es: "Tablas de datos" },
    description: {
      en: "Controlled queries, external pagination, stable selection and saved views.",
      es: "Consultas controladas, paginación externa, selección estable y vistas guardadas.",
    },
    group: group.workflows,
    files: websiteFiles("data-table"),
  },
  {
    slug: "saas",
    title: { en: "SaaS operations", es: "Operaciones SaaS" },
    description: {
      en: "Workspaces, members, roles, customer records, imports and operation contracts.",
      es: "Workspaces, miembros, roles, clientes, importaciones y contratos de operaciones.",
    },
    group: group.workflows,
    files: {
      en: "docs/saas-operations.md",
      es: "docs/saas-operations.es.md",
    },
    retainedScope: {
      en: "This contract retains its 1.2 integration checkpoint and test scope. Its SaaS APIs remain available; the current registry contains 119 entries. Newer commerce and authentication contracts are documented separately.",
      es: "Este contrato conserva su checkpoint 1.2 de integración y pruebas. Sus APIs SaaS siguen disponibles; el registry actual contiene 119 entradas. Los contratos posteriores de comercio y autenticación tienen capítulos propios.",
    },
  },
  {
    slug: "commerce",
    title: {
      en: "Products, orders & billing",
      es: "Productos, pedidos y facturación",
    },
    description: {
      en: "Edit products and images, follow orders and connect your commerce transport.",
      es: "Edita productos e imágenes, sigue pedidos y conecta el transporte de comercio.",
    },
    group: group.workflows,
    files: websiteFiles("commerce"),
  },
  {
    slug: "authentication",
    title: { en: "Authentication screens", es: "Pantallas de autenticación" },
    description: {
      en: "Sign in, register, recover access and add your social authentication handler.",
      es: "Inicia sesión, regístrate, recupera acceso y añade tu handler de login social.",
    },
    group: group.workflows,
    files: websiteFiles("authentication"),
  },
  {
    slug: "maps",
    title: { en: "Maps & Google Maps", es: "Mapas y Google Maps" },
    description: {
      en: "Local geometry, layers, GeoJSON and the optional Google Maps browser key.",
      es: "Geometría local, capas, GeoJSON y la clave opcional de Google Maps.",
    },
    group: group.workflows,
    files: websiteFiles("maps"),
  },
  {
    slug: "adapters",
    title: { en: "Integration adapters", es: "Adaptadores de integración" },
    description: {
      en: "Typed boundaries for Stripe, maps and Google, GitHub or Microsoft sign-in.",
      es: "Contratos tipados para Stripe, mapas y login con Google, GitHub o Microsoft.",
    },
    group: group.integrations,
    files: {
      en: "docs/application-integrations.md",
      es: "docs/application-integrations.es.md",
    },
  },
  {
    slug: "integrations",
    title: { en: "Ready-to-connect integrations", es: "Integraciones listas para conectar" },
    description: {
      en: "65 frontend recipes, complete workbenches, functional mocks and injectable transports.",
      es: "65 recetas de frontend, interfaces completas, mocks funcionales y transportes inyectables.",
    },
    group: group.integrations,
    files: websiteFiles("integrations"),
  },
  {
    slug: "integration-research",
    title: {
      en: "Integration research",
      es: "Research de integraciones",
    },
    description: {
      en: "Compare data, auth, payments, AI and product connectors using dated evidence and frontend boundaries.",
      es: "Compara datos, auth, pagos, AI y conectores con evidencia fechada y límites de frontend.",
    },
    group: group.integrations,
    files: websiteFiles("integration-research"),
  },
  {
    slug: "figma",
    title: { en: "Figma & Code Connect", es: "Figma y Code Connect" },
    description: {
      en: "Open the native library and understand tokens, exports and design checkpoints.",
      es: "Abre la biblioteca nativa y conoce tokens, exports y checkpoints de diseño.",
    },
    group: group.integrations,
    files: {
      en: "docs/figma-distribution.md",
      es: "docs/figma-distribution.es.md",
    },
  },
  {
    slug: "accessibility",
    title: { en: "Accessibility", es: "Accesibilidad" },
    description: {
      en: "Keyboard, readable themes, labels, charts and motion in your final product.",
      es: "Teclado, temas legibles, etiquetas, gráficos y movimiento en tu producto final.",
    },
    group: group.integrations,
    files: websiteFiles("accessibility"),
  },
  {
    slug: "deployment",
    title: { en: "Deploy on Cloudflare", es: "Desplegar en Cloudflare" },
    description: {
      en: "Build the static Next.js site and publish it to your Cloudflare account.",
      es: "Genera el sitio estático de Next.js y publícalo en tu cuenta de Cloudflare.",
    },
    group: group.integrations,
    files: {
      en: "docs/cloudflare-deployment.md",
      es: "docs/cloudflare-deployment.es.md",
    },
  },
  {
    slug: "license",
    title: { en: "Apache 2.0 license", es: "Licencia Apache 2.0" },
    description: {
      en: "Use, modify and share Aureform source while retaining the required notices.",
      es: "Usa, modifica y comparte Aureform conservando los avisos correspondientes.",
    },
    group: group.community,
    files: websiteFiles("license"),
  },
  {
    slug: "contributing",
    title: { en: "Contributing", es: "Contribuir" },
    description: {
      en: "Report issues, prepare changes and help improve the open-source kit.",
      es: "Reporta problemas, prepara cambios y ayuda a mejorar el kit abierto.",
    },
    group: group.community,
    files: { en: "CONTRIBUTING.md" },
  },
  {
    slug: "roadmap",
    title: { en: "Coverage & next steps", es: "Cobertura y siguientes pasos" },
    description: {
      en: "What is shipped, what remains a prototype and how research guides priorities.",
      es: "Qué está entregado, qué sigue como prototipo y cómo priorizamos con research.",
    },
    group: group.community,
    files: websiteFiles("roadmap"),
  },
  {
    slug: "research",
    title: { en: "Product gap research", es: "Research de oportunidades" },
    description: {
      en: "Eight benchmark references, verified source evidence and priorities for adoption and workflows.",
      es: "Ocho referencias, evidencia verificada y prioridades de adopción y flujos de trabajo.",
    },
    group: group.community,
    files: websiteFiles("research"),
  },
];

export function getDocumentationArticle(slug: string) {
  return documentationArticles.find((article) => article.slug === slug);
}
export function getDocumentationNavigation(
  locale: Locale,
): DocNavigationItem[] {
  return documentationArticles.map((article) => ({
    slug: article.slug,
    title: article.title[locale],
    description: article.description[locale],
    group: article.group[locale],
  }));
}
export function documentationPath(locale: Locale, slug = "start") {
  return `/${locale}/docs/${slug === "start" ? "" : `${slug}/`}`;
}
export function documentationContentLocale(
  article: DocumentationArticle,
  locale: Locale,
): Locale {
  return article.files[locale] ? locale : (article.defaultLocale ?? "en");
}
