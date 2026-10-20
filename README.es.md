# Aureform UI

[![Última versión](https://img.shields.io/github/v/release/terrizoaguimor/aureform-ui?style=flat-square&color=8F652A&label=release)](https://github.com/terrizoaguimor/aureform-ui/releases/latest) [![Licencia Apache 2.0](https://img.shields.io/github/license/terrizoaguimor/aureform-ui?style=flat-square&color=8F652A)](LICENSE) [![Build, verificaciones y despliegue en Cloudflare](https://img.shields.io/github/actions/workflow/status/terrizoaguimor/aureform-ui/cloudflare.yml?branch=main&style=flat-square&logo=cloudflare&logoColor=white&label=Cloudflare%20CI)](https://github.com/terrizoaguimor/aureform-ui/actions/workflows/cloudflare.yml) [![Build y despliegue en GitHub Pages](https://img.shields.io/github/actions/workflow/status/terrizoaguimor/aureform-ui/pages.yml?branch=main&style=flat-square&logo=github&label=Pages%20CI)](https://github.com/terrizoaguimor/aureform-ui/actions/workflows/pages.yml)

**Interfaces con personalidad. Código editable. Abierto para todos.**

Un UI kit de Next.js para dashboards, espacios SaaS y herramientas internas, con un estudio de apariencia y una biblioteca editable de Figma.

[**Explorar la demo ↗**](https://aureformui.com/es/) · [**Documentación**](https://aureformui.com/es/docs/) · [Calidad y Lighthouse](https://aureformui.com/es/quality/) · [Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) · [Patrocinar](https://github.com/sponsors/terrizoaguimor) · [Empezar](#empezar) · [Contribuir](CONTRIBUTING.md) · [English](README.md)

[![Demo publicada en Cloudflare](https://img.shields.io/badge/demo-aureformui.com-8F652A?style=flat-square&logo=cloudflare&logoColor=white)](https://aureformui.com/es/) [![Documentación: 22 capítulos](https://img.shields.io/badge/docs-22%20cap%C3%ADtulos-8F652A?style=flat-square&logo=readthedocs&logoColor=white)](https://aureformui.com/es/docs/) [![Biblioteca editable de Figma](https://img.shields.io/badge/Figma-biblioteca%20editable-8F652A?style=flat-square&logo=figma&logoColor=white)](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) [![Registry de código de shadcn](https://img.shields.io/badge/shadcn-registry%20de%20c%C3%B3digo-8F652A?style=flat-square&logo=shadcnui&logoColor=white)](https://aureformui.com/r/registry.json)

![Portada de Aureform en modo oscuro, con vista previa de la interfaz y acceso a documentación](docs/images/aureform-landing-dark.webp)

**69 vistas · 44 familias de componentes · 107 entradas de registry · 6 paletas · 13 tipos de gráficos · English / Español · Claro / Oscuro**

Construido con **Next.js 16, React 19, TypeScript, Tailwind CSS 4, Base UI, GSAP y Lenis**. El código original de Aureform está disponible bajo [Apache 2.0](LICENSE).

[![Next.js 16](https://img.shields.io/badge/Next.js-16-111827?style=flat-square&logo=nextdotjs&logoColor=white)](package.json) [![React 19](https://img.shields.io/badge/React-19-111827?style=flat-square&logo=react&logoColor=61DAFB)](package.json) [![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-111827?style=flat-square&logo=typescript&logoColor=3178C6)](package.json) [![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-111827?style=flat-square&logo=tailwindcss&logoColor=06B6D4)](package.json) [![Base UI 1.9](https://img.shields.io/badge/Base%20UI-1.9-111827?style=flat-square)](package.json) [![Node.js 22.18.0 o posterior](https://img.shields.io/badge/Node.js-%E2%89%A522.18.0-111827?style=flat-square&logo=nodedotjs&logoColor=5FA04E)](#empezar) [![pnpm 10](https://img.shields.io/badge/pnpm-10-111827?style=flat-square&logo=pnpm&logoColor=F69220)](package.json) [![Navegación en español e inglés](https://img.shields.io/badge/i18n-English%20%2F%20Espa%C3%B1ol-111827?style=flat-square)](https://aureformui.com/es/docs/) [![Temas claro y oscuro](https://img.shields.io/badge/temas-claro%20%2F%20oscuro-111827?style=flat-square)](https://aureformui.com/es/docs/tokens/)

## Qué incluye

[![TanStack Table 8](https://img.shields.io/badge/TanStack%20Table-8-111827?style=flat-square&logo=tanstack&logoColor=FF4154)](https://aureformui.com/es/docs/data-table/) [![Recharts 3](https://img.shields.io/badge/Recharts-3-111827?style=flat-square)](https://aureformui.com/es/docs/charts/) [![React Hook Form 7](https://img.shields.io/badge/React%20Hook%20Form-7-111827?style=flat-square&logo=reacthookform&logoColor=EC5990)](https://aureformui.com/es/forms/) [![Zod 4](https://img.shields.io/badge/Zod-4-111827?style=flat-square&logo=zod&logoColor=3E67B1)](package.json) [![MapLibre GL 5](https://img.shields.io/badge/MapLibre%20GL-5-111827?style=flat-square&logo=maplibre&logoColor=white)](https://aureformui.com/es/docs/maps/)

| Incluido                                | Qué puedes construir                                                                                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **68 vistas de la suite + una landing** | Dashboards, CRM, comercio, onboarding, operaciones de clientes, ajustes de equipo, correo, chat, tareas e interfaces de trabajo con IA.                                                        |
| **Componentes, bloques y plantillas**   | Botones, formularios, diálogos, tablas, navegación, gráficos y flujos compuestos. Copia el código que necesites mediante la CLI local o el registry de shadcn.                                 |
| **Un estudio de apariencia**            | Aurora, Violet, Ocean, Mint, Ember y Rose; colores, shades, gradientes, materiales, tipografía, radio, densidad y estados hover. Guarda presets y exporta JSON, CSS o React.                   |
| **Seis efectos reutilizables**          | Fondo con gradientes, fondo con shaders, spotlight, borde con brillo, tarjeta con inclinación y botón magnético, con soporte para movimiento reducido y una alternativa estática para shaders. |
| **Diseño e imágenes**                   | Biblioteca nativa de Figma, tokens compartidos, fuentes locales y 32 imágenes originales generadas con GPT Image 2.5: retratos, avatares de organizaciones, productos y escenas editoriales.   |

| Modo claro                                                                     | Estudio de apariencia                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| ![Resumen de Aureform en modo claro](docs/images/aureform-overview-light.webp) | ![Estudio de apariencia con controles de paleta y materiales](docs/images/aureform-studio.webp)  |
| **Gráficos**                                                                   | **Biblioteca de componentes**                                                                    |
| ![Galería de gráficos de Aureform](docs/images/aureform-charts.webp)           | ![Galería de componentes con botones, campos y materiales](docs/images/aureform-components.webp) |

## Aplicaciones ampliadas en 1.4

[![Adaptador frontend tipado de Stripe](https://img.shields.io/badge/Stripe-adaptador%20tipado-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://aureformui.com/es/docs/adapters/) [![Google Maps con clave de navegador opcional](https://img.shields.io/badge/Google%20Maps-clave%20opcional-1D4ED8?style=flat-square&logo=googlemaps&logoColor=white)](https://aureformui.com/es/docs/maps/) [![Mocks frontend de OAuth con Google, GitHub y Microsoft](https://img.shields.io/badge/OAuth-mocks%20frontend-111827?style=flat-square)](https://aureformui.com/es/docs/authentication/)

Explora [Productos](https://aureformui.com/es/products/), [Pedidos](https://aureformui.com/es/orders/), [Facturas](https://aureformui.com/es/invoices/), [Facturación](https://aureformui.com/es/settings/billing/) y [Mapas](https://aureformui.com/es/maps/).

El editor de productos incluye vista previa y galería con carga, recorte, rotación, texto alternativo, imagen principal y orden. Los precios del catálogo alimentan los pedidos; un pago mock exitoso actualiza existencias y genera una factura. Facturación ofrece planes, historial y vista previa del portal. El adaptador tipado de Stripe conecta estas pantallas con **tu backend autenticado**.

Mapas funciona con geometría local y admite Google Maps mediante una clave de navegador restringida. [Login](https://aureformui.com/es/auth/sign-in/) y [registro](https://aureformui.com/es/auth/sign-up/) muestran **botones mock de Google, GitHub y Microsoft**, con callbacks para tu proveedor. También están disponibles recuperación y verificación. La demo pública no realiza OAuth ni cobros reales.

| Catálogo de productos                                                                                    | Acceso social                                                                               |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| ![Catálogo con imágenes, inventario y sincronización mock de Stripe](docs/images/aureform-products.webp) | ![Login con botones mock de Google, GitHub y Microsoft](docs/images/aureform-auth.webp)     |
| **Facturación y planes**                                                                                 | **Workspace de mapas**                                                                      |
| ![Suscripción, planes y vista previa del portal del cliente](docs/images/aureform-billing.webp)          | ![Rutas locales, filtros y conexión opcional a Google Maps](docs/images/aureform-maps.webp) |

| Editor de imágenes de productos                                                                               | Pedidos y checkout                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ![Editor de imágenes con recorte, texto alternativo y vista previa](docs/images/aureform-product-editor.webp) | ![Pedidos, estados de pago y artículos con sus precios de compra](docs/images/aureform-orders.webp) |

[Contratos y ejemplos de integración →](docs/application-integrations.es.md)

[Validación y alcance de la versión 1.4 →](docs/release-checklist-1.4.0.md)

## Empezar

Necesitas **Node.js 22.18.0+** y **pnpm 10**. El repositorio fija la versión de pnpm en `package.json`. Si `corepack` no está disponible, instálalo primero con `npm install --global corepack`; Node.js 25+ requiere instalarlo por separado. Consulta la [guía de Corepack](https://github.com/nodejs/corepack#default-installs).

```sh
git clone https://github.com/terrizoaguimor/aureform-ui.git
cd aureform-ui
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Abre [localhost:3000/es/](http://localhost:3000/es/) o [localhost:3000/en/](http://localhost:3000/en/). Las imágenes y fuentes incluidas son archivos locales; **ejecutar la suite no requiere claves API**.

Para construir y previsualizar la exportación estática:

```sh
pnpm build
pnpm start
```

El resultado queda en `out/`. GitHub Pages usa el prefijo del proyecto durante el build:

```sh
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm build
```

La [guía de GitHub Pages](docs/github-pages.md) explica el despliegue y la [guía de código abierto](docs/open-source.es.md) cubre la integración.

## Usarlo en tu proyecto

**Crear una aplicación inicial.** Ejecuta la CLI local desde este checkout:

```sh
node bin/aureform.mjs list
node bin/aureform.mjs init ../mi-producto --no-install
pnpm --dir ../mi-producto install
pnpm --dir ../mi-producto dev
```

**Añadir código seleccionado.** Revisa la propuesta antes de aplicarla:

```sh
node bin/aureform.mjs add data-workbench import-wizard customer-detail \
  --cwd ../mi-producto --dry-run
node bin/aureform.mjs add data-workbench import-wizard customer-detail \
  --cwd ../mi-producto
pnpm --dir ../mi-producto install
```

La CLI copia dependencias y los activos usados, respeta los aliases configurados y protege el código existente. `--diff` muestra los cambios propuestos sin escribir archivos. [Guía de la CLI →](docs/cli-updates-1.2.md)

**Usar el registry de shadcn.** Desde un proyecto Next.js / Tailwind 4 con shadcn configurado:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://aureformui.com/r/button.json
```

Explora el [registry de 107 entradas](https://aureformui.com/r/registry.json). Algunos componentes y bloques requieren los estilos incluidos y los providers de idioma o apariencia; consulta sus ejemplos antes de integrarlos. [Guía del registry →](docs/registry-compatibility.md)

## Un frontend que puedes conectar

La demo incluye flujos interactivos de filtros, vistas guardadas, importación CSV, onboarding, miembros y detalle de cliente. Los registros y las preferencias se guardan **en tu navegador**.

La autenticación real, autorización del servidor, bases de datos compartidas, envío de correo, facturación y llamadas a modelos de IA son integraciones que debes aportar. La vista previa de roles simula permisos; no protege un backend. Los adjuntos del detalle de cliente guardan metadatos; el gestor de archivos usa almacenamiento local del navegador.

Los bloques de operaciones reciben datos y callbacks para conectar tus servicios. Empieza por los [contratos SaaS](docs/saas-operations.es.md), la [arquitectura](docs/architecture.md) y los [ejemplos de componentes](examples/README.md).

<a id="figma-source-and-packages"></a>

## Diseño, movimiento e imágenes

[![GSAP 3.15](https://img.shields.io/badge/GSAP-3.15-111827?style=flat-square&logo=gsap&logoColor=88CE02)](docs/motion-runtime.md) [![Lenis 1.3](https://img.shields.io/badge/Lenis-1.3-111827?style=flat-square)](docs/motion-runtime.md) [![32 recursos originales generados con GPT Image 2.5](https://img.shields.io/badge/GPT%20Image%202.5-32%20recursos%20originales-8F652A?style=flat-square)](docs/generated-images/README.es.md)

- **Figma:** [biblioteca editable](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) y [archivos de diseño / notas de exportación](design/README.md). Consulta esas notas para conocer los archivos disponibles y sus formatos reales.
- **Apariencia:** [configuración y exportaciones](docs/appearance.md), [efectos](docs/effects.es.md), [shaders](docs/shaders.md) y [gráficos](docs/charts.md).
- **Movimiento:** GSAP controla las entradas dentro de su ámbito; Lenis es opcional en la landing. Las pantallas de aplicación mantienen el scroll nativo. [Contrato de runtime](docs/motion-runtime.md).
- **Imágenes:** [colección de 32 imágenes](docs/generated-images/README.es.md), [prompts completos](docs/generated-images/catalog.json), [WebP originales](design/images/masters/) y [manifest de activos](public/assets/generated-images.json). Se incluyen WebP optimizados; sus archivos SVG incorporan los mismos píxeles para transportarlos mediante el registry de texto.

Los registros de packaging y QA conservan su versión y alcance originales. La [guía de código abierto](docs/open-source.es.md#verificar-cambios-y-contribuir) explica cómo interpretarlos.

## Documentación y despliegue

[![Cloudflare Workers Static Assets](https://img.shields.io/badge/Cloudflare-Workers%20Static%20Assets-111827?style=flat-square&logo=cloudflare&logoColor=F38020)](docs/cloudflare-deployment.es.md) [![HTML estático, URLs canónicas y hreflang](https://img.shields.io/badge/SEO-HTML%20est%C3%A1tico%20%2B%20hreflang-111827?style=flat-square)](docs/release-checklist-1.4.1.md) [![Research Gemini 4 Argon: ocho prioridades](https://img.shields.io/badge/research-8%20prioridades-8F652A?style=flat-square)](https://aureformui.com/es/docs/research/)

[Lee la documentación](https://aureformui.com/es/docs/) sin abrir el workspace de la demo. Sus 22 capítulos cubren instalación, componentes, tokens, movimiento, charts, tablas, integraciones, Figma y despliegue, con búsqueda por títulos y secciones, índice de página y código copiable. La navegación está disponible en español e inglés; las referencias que conservan su idioma original lo indican en la página.

![Documentación de Aureform con navegación por grupos, código copiable e índice de página](docs/images/aureform-documentation.webp)

El sitio principal funciona en **Cloudflare Workers Static Assets**. La [guía de despliegue](docs/cloudflare-deployment.es.md) explica el export estático, los dominios y la redirección de descarga del código. [GitHub Pages](https://terrizoaguimor.github.io/aureform-ui/) mantiene un despliegue separado con su propio base path.

```sh
NEXT_PUBLIC_BASE_PATH="" pnpm build:cloudflare
pnpm exec cf deploy --prebuilt --dry-run
pnpm deploy:cloudflare
```

Configura `NEXT_PUBLIC_SITE_URL` con el dominio canónico de tu proyecto. Desplegar requiere acceso a tu cuenta de Cloudflare; ejecutar la demo y construirla localmente no requiere credenciales. El estado generado de despliegue se excluye de Git y de los paquetes de código.

La [investigación bilingüe de producto](docs/website/es/research.md) combina tres investigaciones headless con Gemini 4 Argon, 52 búsquedas observadas, revisión independiente de fuentes y ocho prioridades con criterios de aceptación. Sus [registros de ejecución y verificación](docs/research/2026-10-20/) separan evidencia de propuestas que necesitan validación con usuarios. El [estudio original de 20 hallazgos](docs/research-gaps-1.4.es.md) sigue disponible.

## Calidad que puedes comprobar

[![Workflow de auditorías Lighthouse](https://img.shields.io/github/actions/workflow/status/terrizoaguimor/aureform-ui/quality.yml?branch=main&style=flat-square&label=Lighthouse%20CI)](https://github.com/terrizoaguimor/aureform-ui/actions/workflows/quality.yml)

<!-- BEGIN:quality-results -->
La primera medición Lighthouse reproducible se publicará tras verificar el build correspondiente en producción. [La página de calidad](https://aureformui.com/es/quality/) registra el commit auditado, la metodología y los informes completos; los puntajes se publican después de medirlos.
<!-- END:quality-results -->

Cada medición audita la landing, la documentación de instalación y el dashboard demo en móvil y escritorio, tres veces por combinación. Los valores publicados son medianas de mediciones de laboratorio. Los informes HTML y JSON originales están disponibles en [el repositorio](docs/quality/lighthouse/) y en el sitio. Consulta [la guía de medición](docs/quality/README.md) para reproducirlos o actualizarlos.

El dashboard demo conserva deliberadamente `noindex`; su resultado SEO refleja esa política. Las comprobaciones de accesibilidad de Lighthouse cubren las páginas auditadas y no certifican todo el kit. Las métricas de carga de laboratorio tienen un alcance distinto de Core Web Vitals de usuarios reales.

## Apoya al mantenedor

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-apoya%20al%20mantenedor-8F652A?style=flat-square&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/terrizoaguimor)

Si Aureform te ayuda en tu trabajo, puedes [patrocinar al mantenedor](https://github.com/sponsors/terrizoaguimor) mediante su perfil personal actual de GitHub Sponsors. El apoyo es voluntario; el código, los recursos originales y la documentación siguen abiertos bajo Apache 2.0.

## Contribuir

Ayuda a que otras personas encuentren y evalúen el kit en comunidades relevantes
de GitHub. La [investigación de difusión y destinos adecuados](docs/github-discovery.es.md)
incluye listas de frontend mantenidas, directorios de registros y borradores
específicos. Los topics y la descripción About identifican el stack y alcance
reales del repositorio.

[![Contribuciones bienvenidas](https://img.shields.io/badge/contribuciones-bienvenidas-8F652A?style=flat-square)](CONTRIBUTING.md) [![Estrellas en GitHub](https://img.shields.io/github/stars/terrizoaguimor/aureform-ui?style=flat-square&logo=github&color=8F652A)](https://github.com/terrizoaguimor/aureform-ui/stargazers) [![Forks en GitHub](https://img.shields.io/github/forks/terrizoaguimor/aureform-ui?style=flat-square&logo=github&color=8F652A)](https://github.com/terrizoaguimor/aureform-ui/forks) [![Issues abiertas](https://img.shields.io/github/issues/terrizoaguimor/aureform-ui?style=flat-square&logo=github&color=8F652A)](https://github.com/terrizoaguimor/aureform-ui/issues)

Son bienvenidos los reportes de errores, mejoras de interacción, nuevos patrones, traducciones y documentación. Puedes contribuir en español o inglés.

Evidencia de validación de **v1.4.1**:

[![v1.4.1: 244 pruebas unitarias aprobadas](https://img.shields.io/badge/unit%20tests-244%20passed-246B43?style=flat-square&logo=nodedotjs&logoColor=white)](https://github.com/terrizoaguimor/aureform-ui/blob/v1.4.1/docs/qa-runtime-1.4.1.json) [![v1.4.1: 688 ejemplos verificados con tipos estrictos](https://img.shields.io/badge/strict%20examples-688%20checked-246B43?style=flat-square&logo=typescript&logoColor=white)](https://github.com/terrizoaguimor/aureform-ui/blob/v1.4.1/docs/qa-runtime-1.4.1.json) [![v1.4.1: 19 escenarios de navegador aprobados en producción](https://img.shields.io/badge/production%20website-19%20passed-246B43?style=flat-square&logo=playwright&logoColor=white)](https://github.com/terrizoaguimor/aureform-ui/releases/download/v1.4.1/cloudflare-deployment-1.4.1.json)

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:examples
pnpm build
```

Lee [CONTRIBUTING](CONTRIBUTING.md) para las pruebas de navegador y convenciones de diseño, el [Código de Conducta](CODE_OF_CONDUCT.md) para las normas de la comunidad y [SECURITY](SECURITY.md) para reportar vulnerabilidades de forma privada.

## Licencia y créditos

El código, la documentación y los activos originales de Aureform se publican bajo [Apache License 2.0](LICENSE). Consulta [NOTICE](NOTICE) y [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md) para las atribuciones y licencias de terceros.

Creado por [terrizoaguimor](https://github.com/terrizoaguimor). Construye algo útil, adáptalo a tu proyecto y comparte tus mejoras con la comunidad.
