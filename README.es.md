# Aureform UI

[![Última versión](https://img.shields.io/github/v/release/terrizoaguimor/aureform-ui?style=flat-square&color=8F652A&label=release)](https://github.com/terrizoaguimor/aureform-ui/releases/latest) [![Licencia Apache 2.0](https://img.shields.io/github/license/terrizoaguimor/aureform-ui?style=flat-square&color=8F652A)](LICENSE) [![Build, verificaciones y despliegue en Cloudflare](https://img.shields.io/github/actions/workflow/status/terrizoaguimor/aureform-ui/cloudflare.yml?branch=main&style=flat-square&logo=cloudflare&logoColor=white&label=Cloudflare%20CI)](https://github.com/terrizoaguimor/aureform-ui/actions/workflows/cloudflare.yml) [![Build y despliegue en GitHub Pages](https://img.shields.io/github/actions/workflow/status/terrizoaguimor/aureform-ui/pages.yml?branch=main&style=flat-square&logo=github&label=Pages%20CI)](https://github.com/terrizoaguimor/aureform-ui/actions/workflows/pages.yml)

**Interfaces con personalidad. Código editable. Abierto para todos.**

Un UI kit de Next.js para dashboards, espacios SaaS y herramientas internas, con 65 recetas de integración, un estudio de apariencia y una biblioteca editable de Figma.

[**Explorar la demo ↗**](https://aureformui.com/es/) · [**Documentación**](https://aureformui.com/es/docs/) · [Changelog](CHANGELOG.es.md) · [Calidad y Lighthouse](https://aureformui.com/es/quality/) · [Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) · [Patrocinar](https://github.com/sponsors/terrizoaguimor) · [Empezar](#empezar) · [Contribuir](CONTRIBUTING.md) · [English](README.md)

[![Demo publicada en Cloudflare](https://img.shields.io/badge/demo-aureformui.com-8F652A?style=flat-square&logo=cloudflare&logoColor=white)](https://aureformui.com/es/) [![Documentación: 25 capítulos](https://img.shields.io/badge/docs-25%20cap%C3%ADtulos-8F652A?style=flat-square&logo=readthedocs&logoColor=white)](https://aureformui.com/es/docs/) [![Biblioteca editable de Figma](https://img.shields.io/badge/Figma-biblioteca%20editable-8F652A?style=flat-square&logo=figma&logoColor=white)](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) [![Registry de código de shadcn](https://img.shields.io/badge/shadcn-registry%20de%20c%C3%B3digo-8F652A?style=flat-square&logo=shadcnui&logoColor=white)](https://aureformui.com/r/registry.json)

[![Changelog en inglés y español](https://img.shields.io/badge/changelog-English%20%2F%20Espa%C3%B1ol-8F652A?style=flat-square&logo=github&logoColor=white)](https://aureformui.com/es/changelog/)

![Portada de Aureform en modo oscuro, con vista previa de la interfaz y acceso a documentación](docs/images/aureform-landing-dark.webp)

**70 vistas principales + 65 recetas de integración + un hub · 44 familias de componentes · 140 entradas de registry · 6 paletas · English / Español · Claro / Oscuro**

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

## Integraciones listas para conectar en 1.5

[![65 recetas de integración](https://img.shields.io/badge/integraciones-65%20recetas-8F652A?style=flat-square)](https://aureformui.com/es/integrations/) [![86 opciones de proveedor](https://img.shields.io/badge/proveedores-86%20opciones-111827?style=flat-square)](docs/integrations/provider-coverage.json) [![17 familias de flujos](https://img.shields.io/badge/flujos-17%20familias-111827?style=flat-square)](https://aureformui.com/es/docs/integrations/) [![AI con streaming y aprobación de herramientas](https://img.shields.io/badge/AI-streaming%20%2B%20aprobaciones-111827?style=flat-square)](docs/integrations/ai.md)

Abre el [centro de integraciones](https://aureformui.com/es/integrations/) y prueba [Supabase](https://aureformui.com/es/integrations/supabase-data/), [Clerk](https://aureformui.com/es/integrations/clerk/), [Stripe](https://aureformui.com/es/integrations/stripe/), [OpenAI](https://aureformui.com/es/integrations/openai-responses/), [Resend](https://aureformui.com/es/integrations/resend-react-email/) o [Cloudflare Agents](https://aureformui.com/es/integrations/cloudflare-agents/).

Incluye tablas controladas, flujos completos de identidad, comercio, archivos, correo, analítica, notificaciones, tareas, colaboración, editores, búsqueda, mapas, AI, conocimiento, agentes, conectores de producto y automatización. Cada receta ofrece flujos locales funcionales, estados de conexión, permisos lógicos, selección de recursos, actividad, revisión y solicitudes recuperables.

| Centro de integraciones · oscuro | Flujo de datos conectados · claro |
| --- | --- |
| ![Centro de integraciones con búsqueda y familias de flujos](docs/images/aureform-integrations-dark.webp) | ![Tabla conectada con filtros, edición de registros y paginación](docs/images/aureform-integrations-light.webp) |

Inyecta `IntegrationSuite` o un adaptador tipado para conectar tu aplicación. Las fábricas HTTP cubren el hub y los transportes de identidad, AI y comercio; los callbacks de edición y tiempo real permiten usar tu SDK. Tu aplicación aporta cuentas, credenciales, autenticación, autorización del servidor y conectividad con los proveedores. La demo pública no realiza acciones en cuentas externas.

```sh
node bin/aureform.mjs add integration-hub integrations-suite --cwd ../mi-producto
```

[Guía de conexión →](https://aureformui.com/es/docs/integrations/) · [Cobertura de proveedores →](docs/integrations/provider-coverage.json) · [Alcance de la versión 1.5 →](docs/release-checklist-1.5.0.md)

## Softphone y comunicaciones

[![Demo local de Softphone](https://img.shields.io/badge/Softphone-demo%20entrante%20local-8F652A?style=flat-square)](https://aureformui.com/es/softphone/) [![Conexiones opcionales de SDK Twilio y Telnyx](https://img.shields.io/badge/Twilio%20%2B%20Telnyx-SDKs%20opcionales-111827?style=flat-square)](docs/communications/IMPLEMENTATION-STATUS.md)

[![Configuración automática de proveedores](https://img.shields.io/badge/configuraci%C3%B3n-dos%20credenciales%20por%20proveedor-8F652A?style=flat-square)](docs/communications/AUTOMATIC-SETUP.md) [![Twilio Voice SDK 2.18.5](https://img.shields.io/badge/Twilio%20Voice%20SDK-2.18.5-111827?style=flat-square&logo=twilio&logoColor=F22F46)](licenses/third-party/twilio-voice-sdk.txt) [![Telnyx WebRTC 2.28.0](https://img.shields.io/badge/Telnyx%20WebRTC-2.28.0-111827?style=flat-square)](licenses/third-party/telnyx-webrtc.txt)

[Abrir el softphone →](https://aureformui.com/es/softphone/) · [Guía de conexión →](https://aureformui.com/es/docs/communications/) · [Implementación y evidencia →](docs/communications/IMPLEMENTATION-STATUS.md)

| Workspace oscuro | Workspace claro |
| --- | --- |
| ![Softphone con llamada simulada activa, contacto en cola y notas guardadas en tema oscuro](docs/images/aureform-softphone-dark.webp) | ![El mismo espacio de llamadas entrantes en tema claro](docs/images/aureform-softphone-light.webp) |

El espacio de llamadas entrantes incluye presencia, cola FIFO, horario y fechas explícitas de festivos, contestar/rechazar, silenciar, espera, DTMF, notas, historial, exportación CSV y recuperación de conexión. La demo local funciona sin credenciales ni cargos telefónicos. Las pruebas de micrófono y altavoz comienzan únicamente cuando se solicitan.

La [referencia de autoconfiguración](docs/communications/AUTOMATIC-SETUP.md) pide únicamente Account SID + Auth Token para Twilio, o API Key + Public Key para Telnyx. Un backend autenticado descubre los números existentes, prepara un plan para revisar, genera los recursos internos y verifica el enrutamiento. Las credenciales y los registros de las operaciones se guardan cifrados en el host. Conectar el navegador y autorizar una llamada limitada son pasos separados.

El [recibo de validación](docs/communications/AUTOMATIC-SETUP-VALIDATION.md) separa pruebas de demo pública, autenticación privada, tipos SDK instalados y fuente editable en Figma de la aceptación con carriers reales. Para la primera prueba Twilio, usa una cuenta Full activa, su Auth Token principal y un número de voz existente en US1; todavía no se certifica una llamada real.

La demo estática usa credenciales ficticias de solo lectura y no contacta a un carrier. La referencia privada incluye los SDKs oficiales; cada consumidor puede reemplazar el host, la autenticación y los adaptadores. Las llamadas audibles reales y la compatibilidad de producción requieren aceptación independiente por proveedor.

```sh
node bin/aureform.mjs add softphone-workspace --cwd ../mi-producto
# Cliente real y conexión opcional de proveedor:
node bin/aureform.mjs add communications-live twilio-browser-voice --cwd ../mi-producto
# Autoconfiguración y host del softphone conectado:
node bin/aureform.mjs add communications-setup connected-softphone --cwd ../mi-producto
```

El [paquete de investigación de Communications](docs/communications/RESEARCH.md) conserva la [arquitectura](docs/communications/ARCHITECTURE-RFC.md), [matriz de capacidades](docs/communications/CAPABILITY-MATRIX.md), [controles de seguridad](docs/communications/SECURITY-COMPLIANCE.md) y [roadmap por fases](docs/communications/ROADMAP.md). Compra y portabilidad de números, mensajería omnicanal, voz con IA y Prompt-to-Flow corresponden a etapas posteriores. El [registro de fuentes Figma](design/reports/communications-2026-10-21.md) conserva el research original y la recuperación anterior; la [autoconfiguración](design/figma/communications-setup-native-source-2026-10-21.json) tiene su propio suplemento de fuente nativa.

## Comercio, mapas y autenticación

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

Explora el [registry de 140 entradas](https://aureformui.com/r/registry.json). Algunos componentes y bloques requieren los estilos incluidos y los providers de idioma o apariencia; consulta sus ejemplos antes de integrarlos. [Guía del registry →](docs/registry-compatibility.md)

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

[Lee la documentación](https://aureformui.com/es/docs/) sin abrir el workspace de la demo. Sus 25 capítulos cubren instalación, componentes, tokens, movimiento, charts, tablas, integraciones, comunicaciones, research de integraciones, Figma y despliegue, con búsqueda por títulos y secciones, índice de página y código copiable. La navegación está disponible en español e inglés; las referencias que conservan su idioma original lo indican en la página.

![Documentación de Aureform con navegación por grupos, código copiable e índice de página](docs/images/aureform-documentation.webp)

El sitio principal funciona en **Cloudflare Workers Static Assets**. La [guía de despliegue](docs/cloudflare-deployment.es.md) explica el export estático, los dominios y la redirección de descarga del código. [GitHub Pages](https://terrizoaguimor.github.io/aureform-ui/) mantiene un despliegue separado con su propio base path.

```sh
NEXT_PUBLIC_BASE_PATH="" pnpm build:cloudflare
pnpm exec cf deploy --prebuilt --dry-run
pnpm deploy:cloudflare
```

Configura `NEXT_PUBLIC_SITE_URL` con el dominio canónico de tu proyecto. Desplegar requiere acceso a tu cuenta de Cloudflare; ejecutar la demo y construirla localmente no requiere credenciales. El estado generado de despliegue se excluye de Git y de los paquetes de código.

La [investigación bilingüe de producto](docs/website/es/research.md) combina tres investigaciones headless con Gemini 4 Argon, 52 búsquedas observadas, revisión independiente de fuentes y ocho prioridades con criterios de aceptación. Sus [registros de ejecución y verificación](docs/research/2026-10-20/) separan evidencia de propuestas que necesitan validación con usuarios. El [estudio original de 20 hallazgos](docs/research-gaps-1.4.es.md) sigue disponible.

[![Research de integraciones: 99 búsquedas observadas](https://img.shields.io/badge/research%20de%20integraciones-99%20b%C3%BAsquedas-8F652A?style=flat-square)](https://aureformui.com/es/docs/integration-research/) [![Evidencia npm: 70 paquetes](https://img.shields.io/badge/evidencia%20npm-70%20paquetes-111827?style=flat-square&logo=npm&logoColor=CB3837)](docs/research/2026-10-20/integrations/npm-downloads.json)

El [research de integraciones](docs/website/es/integration-research.md) ([English](docs/website/en/integration-research.md)) es un estudio separado de identidad, datos, comercio, AI, servicios operativos y conectores de producto. Cuatro investigaciones headless de AGY completadas registraron 99 búsquedas; el [paquete de evidencia](docs/research/2026-10-20/integrations/) incluye la muestra fechada de 70 paquetes npm, procedencia, fuentes primarias y fichas bilingües. Las descargas son señales de instalación, no usuarios únicos ni cuota de Next.js. La versión 1.5 implementa sus 65 recetas frontend. El estudio fechado conserva su base original y los requisitos del backend consumidor.

## Calidad que puedes comprobar

[![Workflow de auditorías Lighthouse](https://img.shields.io/github/actions/workflow/status/terrizoaguimor/aureform-ui/quality.yml?branch=main&style=flat-square&label=Lighthouse%20CI)](https://github.com/terrizoaguimor/aureform-ui/actions/workflows/quality.yml)

<!-- BEGIN:quality-results -->
[![Lighthouse landing mobile median](public/badges/lighthouse-mobile.svg)](https://aureformui.com/es/quality/) [![Lighthouse landing desktop median](public/badges/lighthouse-desktop.svg)](https://aureformui.com/es/quality/)

**Medición: 2026-10-20 05:47:39 UTC · Lighthouse 13.5.0 · commit [0caf7c8](https://github.com/terrizoaguimor/aureform-ui/commit/0caf7c8874ea8bb2b1580c0d59a9bda4497cbdd4).** Medianas de tres pasadas por página y dispositivo; puntajes sobre 100.

| Página · Dispositivo | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
| --- | ---: | ---: | ---: | ---: |
| Landing · Móvil | 93 | 100 | 100 | 100 |
| Landing · Escritorio | 100 | 100 | 100 | 100 |
| Documentación · Móvil | 94 | 100 | 100 | 100 |
| Documentación · Escritorio | 100 | 100 | 100 | 100 |
| Dashboard demo · Móvil | 40 | 100 | 100 | 69 |
| Dashboard demo · Escritorio | 67 | 100 | 100 | 69 |

[Metodología, métricas y los 18 informes →](https://aureformui.com/es/quality/) · [JSON y HTML originales](docs/quality/lighthouse/production-39375951507-1/)
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

Evidencia de validación de **v1.5.0**:

[![v1.5.0: 865 pruebas unitarias aprobadas](https://img.shields.io/badge/unit%20tests-865%20passed-246B43?style=flat-square&logo=nodedotjs&logoColor=white)](docs/qa-runtime-1.5.0.json) [![v1.5.0: 688 ejemplos de componentes verificados con tipos estrictos](https://img.shields.io/badge/component%20examples-688%20checked-246B43?style=flat-square&logo=typescript&logoColor=white)](docs/qa-runtime-1.5.0.json) [![v1.5.0: 11 ejemplos tipados de integración](https://img.shields.io/badge/integration%20examples-11%20checked-246B43?style=flat-square&logo=typescript&logoColor=white)](docs/qa-runtime-1.5.0.json) [![317 asociaciones locales de proveedor y acción verificadas](https://img.shields.io/badge/local%20action%20bindings-317%20verified-246B43?style=flat-square)](docs/integrations/provider-action-validation.json) [![6 ejemplos opcionales de SDK compilados con tipos estrictos](https://img.shields.io/badge/optional%20SDK%20examples-6%20compiled-246B43?style=flat-square)](docs/integrations/optional-binding-validation.json)

[![290 escenarios frontend aceptados por montaje raíz y con prefijo](https://img.shields.io/badge/browser%20scenarios-290%20per%20host-246B43?style=flat-square&logo=playwright&logoColor=white)](docs/qa-runtime-1.5.0.json)

Las comprobaciones usan adaptadores frontend locales y fixtures acotados del consumidor. El [recibo QA 1.5](docs/qa-runtime-1.5.0.json) registra cada tanda de navegador, los fallos iniciales del harness y sus ejecuciones dirigidas. La [QA anterior](https://github.com/terrizoaguimor/aureform-ui/blob/v1.4.1/docs/qa-runtime-1.4.1.json), los checkpoints de Figma y los informes de Lighthouse conservan su alcance original.

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:examples
pnpm verify:integrations
pnpm build
```

Lee [CONTRIBUTING](CONTRIBUTING.md) para las pruebas de navegador y convenciones de diseño, el [Código de Conducta](CODE_OF_CONDUCT.md) para las normas de la comunidad y [SECURITY](SECURITY.md) para reportar vulnerabilidades de forma privada.

## Licencia y créditos

El código, la documentación y los activos originales de Aureform se publican bajo [Apache License 2.0](LICENSE). Consulta [NOTICE](NOTICE) y [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md) para las atribuciones y licencias de terceros.

Creado por [terrizoaguimor](https://github.com/terrizoaguimor). Construye algo útil, adáptalo a tu proyecto y comparte tus mejoras con la comunidad.
