# Arquitectura de la documentación web

La documentación usa un shell propio con navegación, búsqueda local y controles de apariencia. El artículo se renderiza en el servidor y se entrega mediante `children`. El cliente recibe solo metadatos del índice; el helper compartido `documentationPath` define sus rutas. El Markdown y su lectura permanecen en el servidor.

El dominio canónico es `https://aureformui.com`. Esta integración apunta al parche `v1.4.1`; la insignia de versión toma `kitVersion` del catálogo compartido que mantiene el owner.

## Responsabilidades

| Archivo                                   | Responsabilidad                                                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/documentation-shell.tsx`  | Layout interactivo, navegación, idioma, apariencia, sidebar, breadcrumbs, anterior/siguiente e índice del artículo.                     |
| `src/components/documentation-search.tsx` | Diálogo con teclado, índice local de metadatos y enlaces a artículos o secciones.                                                       |
| `src/components/documentation-code.tsx`   | Bloques de código y copia, implementados por el owner y utilizados por el renderer.                                                     |
| `src/lib/documentation.ts`                | Manifest de artículos, tipos compartidos, orden de lectura, idiomas y `documentationPath`; lo mantiene el owner.                        |
| `src/lib/documentation-server.ts`         | Lectura del Markdown, IDs de encabezados y `documentationSearchIndex` con keywords de todos los capítulos; lo mantiene el owner.        |
| Rutas y renderer de documentación         | Resolución de locale/slug, validación de rutas, contenido semántico, metadatos y respuestas de navegación; se integran fuera del shell. |

El shell crea `AppearanceProvider` y traduce su navegación directamente con `locale`. Reutiliza `Brand`, `AppearanceControls` y los diálogos de Base UI. Como `AppearanceControls` usa internamente `useLanguage`, solamente esos controles se envuelven en `NextIntlClientProvider` con los mensajes existentes; el artículo y la navegación no dependen de Intl. No necesita `Providers`, `DashboardShell`, `WorkspaceProvider`, `CommerceProvider` ni un servidor de búsqueda.

## Contrato con el renderer

```tsx
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/messages";
import type { DocNavigationItem } from "@/lib/documentation";
import {
  DocumentationShell,
  type DocumentationHeading,
} from "@/components/documentation-shell";

type DocumentationViewProps = {
  locale: Locale;
  activeSlug: string;
  articles: readonly DocNavigationItem[];
  headings: readonly DocumentationHeading[];
  children: ReactNode;
};

// Este componente se mantiene en el servidor.
export function DocumentationView(props: DocumentationViewProps) {
  return (
    <DocumentationShell
      locale={props.locale}
      activeSlug={props.activeSlug}
      articles={props.articles}
      headings={props.headings}
    >
      {props.children}
    </DocumentationShell>
  );
}
```

`DocNavigationItem` se importa como tipo desde `src/lib/documentation.ts`:

```ts
type DocNavigationItem = {
  slug: string;
  title: string;
  description: string;
  group: string;
  keywords?: readonly string[];
};
```

`DocumentationHeading` tiene `{ id: string; text: string; level: number }`. El renderer debe producir IDs únicos y estables dentro del artículo, y utilizar exactamente esos IDs en `headings`. El shell reserva `documentation-content` para el destino del enlace de salto.

`locale` es el idioma de navegación y controles. Los títulos, descripciones y grupos del índice llegan localizados; los encabezados corresponden al contenido real del capítulo. El shell no traduce ni descarga contenido. `children` incluye el título principal y el cuerpo del artículo; no se añade un segundo `h1`. El `<main>` mantiene `min-w-0`, ancho fluido y un máximo de `48rem` para la lectura, con paginación y breadcrumbs dentro de esa misma columna.

El manifest contiene 22 artículos. Las referencias de registry y contribución conservan su fuente canónica EN al navegar en ES; el research conserva su fuente canónica ES al navegar en EN. El renderer del owner presenta el aviso de idioma y establece el `lang` del artículo. El shell conserva el idioma solicitado para navegación, sidebar y controles, sin duplicar esos avisos.

## Índice de búsqueda

`articles` contiene metadatos serializables, sin cuerpos, componentes, funciones ni claves. `documentationSearchIndex(locale)` extrae en el servidor los textos de encabezados del AST Markdown y los entrega como `keywords: readonly string[]`. El buscador incorpora esas keywords y permite encontrar artículos por encabezados que no aparecen en sus títulos o descripciones.

Opcionalmente, `headings` en cada entrada permite mostrar resultados que enlazan directamente a una sección con un ID conocido. Es compatible con `DocumentationSearchArticle`:

```ts
import type { DocumentationSearchArticle } from "@/components/documentation-search";

const navigation: readonly DocumentationSearchArticle[] = [
  {
    slug: "installation",
    title: "Installation",
    description: "Install individual components in a Next.js project.",
    group: "Getting started",
    keywords: ["Requirements", "Install with the CLI"],
    headings: [
      { id: "requirements", text: "Requirements", level: 2 },
      { id: "cli", text: "Install with the CLI", level: 2 },
    ],
  },
];
```

Las propiedades opcionales no cambian los cuatro campos obligatorios de `DocNavigationItem`. `keywords` permite encontrar cualquier artículo por sus encabezados; ese resultado abre el artículo. Los resultados directos a secciones del artículo activo usan la prop `headings`; los de otros artículos requieren sus objetos `{ id, text, level }` en el índice, porque una keyword sola no aporta un ID de ancla.

La búsqueda normaliza mayúsculas y acentos, admite varias palabras, prioriza coincidencias en títulos y muestra como máximo 32 resultados con el total y una invitación a afinar la consulta cuando corresponda. Cada coincidencia de sección abre el artículo con su fragmento. No contiene HTML generado ni ejecuta el texto escrito.

## Navegación y rutas

| Destino       | Ruta sin basePath                   |
| ------------- | ----------------------------------- |
| Inicio        | `/{locale}/`                        |
| Documentación | `/{locale}/docs/`                   |
| Artículo      | `/{locale}/docs/{slug}/`            |
| Demo          | `/{locale}/dashboard/`              |
| Componentes   | `/{locale}/components/`             |
| GitHub        | `githubUrl` de `src/lib/catalog.ts` |

`slug` es el identificador del manifest. La primera entrada, Introducción, usa `"start"` y se enlaza a `/{locale}/docs/`; las demás se enlazan a `/{locale}/docs/{slug}/`. Las rutas estáticas actuales aceptan un solo segmento de artículo. `activeSlug` y el índice deben compartir la misma representación canónica, sin `/docs`, basePath ni fragmentos. `documentationArticleHref` delega la ruta en `documentationPath` y añade únicamente el fragmento de encabezado cuando se conoce su ID.

Los enlaces internos usan `next/link`; los resultados de búsqueda usan `next/navigation`. Next añade el basePath configurado, incluido `/aureform-ui`, por lo que nunca se agrega mediante `publicPath` ni concatenación manual. Las anclas del artículo son enlaces locales `#id`.

El cambio EN/ES conserva el slug. El owner de rutas debe garantizar slugs comunes entre idiomas o resolver sus equivalencias antes de integrar este comportamiento. Los grupos conservan el orden de su primera aparición; cada grupo conserva el orden de sus artículos. Anterior/siguiente utiliza esa misma secuencia visible de la sidebar.

## Accesibilidad y apariencia

- Navegación superior visible con Documentación, Demo, Componentes y GitHub.
- Sidebar de escritorio y menú móvil en un diálogo modal de Base UI con título, descripción, cierre con Escape y gestión de foco.
- Buscador con `⌘K` o `Ctrl+K`, excluyendo campos editables y otros diálogos modales. Flechas para elegir resultados, Enter para abrirlos y Escape para cerrar.
- Enlace para saltar al contenido, breadcrumbs, `aria-current` en artículos y secciones, y anuncios de resultados de búsqueda.
- Índice del artículo fijo en pantallas amplias y un desplegable nativo en pantallas menores. Los encabezados tienen margen de scroll respecto al header.
- Controles EN/ES, claro/oscuro y personalización existente de paleta y superficie. En móvil, la personalización está dentro del menú de documentación.
- Gradientes y superficies toman los tokens existentes; las transiciones son discretas y respetan `prefers-reduced-motion`. No se agrega GSAP ni Lenis al shell.

El seguimiento de sección usa eventos pasivos y agrupa lecturas de posición mediante `requestAnimationFrame`, con limpieza al desmontar. No modifica los IDs ni el contenido del artículo.

La guarda del atajo comprueba `role="dialog"` y `role="alertdialog"`; no depende de `aria-modal`, que no es un atributo necesario en la implementación instalada de Base UI. El buscador entrega `initialFocus` al input. Menú y búsqueda usan el cierre con Escape, la contención de foco y el retorno al disparador o foco anterior de los componentes Base UI, sin listeners propios que interfieran en Escape.

## Bloques de código y estilos del artículo

El renderer del owner utiliza `DocumentationCode` de `src/components/documentation-code.tsx`, con props `code`, `language` y `locale`, y el estilo `src/components/documentation-prose.css`. El shell no duplica el helper de copia ni importa el renderer del artículo.

## Integración y comprobaciones

El owner integra las rutas, el índice localizado, el renderer del servidor, los metadatos y la configuración de dominio. Los componentes shell y search no modifican las pantallas originales de documentación de la suite ni la navegación global.

La aceptación de la integración debe comprobar:

1. El artículo y su `h1` aparecen en el HTML del servidor, con metadatos localizados.
2. La búsqueda encuentra un título, una descripción con acentos y un encabezado de otro artículo incluido en el índice.
3. Navegación con teclado en búsqueda y menú móvil: apertura, selección, Escape y retorno del foco.
4. Anclas, breadcrumbs, anterior/siguiente y EN/ES bajo `/aureform-ui` y bajo raíz, sin prefijo duplicado.
5. Menú y controles en 320 px, escritorio, ambas apariencias y movimiento reducido.
6. Copiar código funciona en HTTPS y presenta un error accesible si el portapapeles falla.

Este documento describe la arquitectura y los criterios de integración; no certifica un build ni pruebas de navegador. El typecheck y build del conjunto se coordinan con el owner para evitar ejecuciones concurrentes.
