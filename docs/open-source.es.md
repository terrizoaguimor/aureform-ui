# Usar el kit de código abierto

[English](open-source.md) · [README](../README.es.md)

La publicación bajo Apache 2.0 es **Aureform UI 1.3.0**. El kit completo está disponible como código editable: componentes, bloques, plantillas, configuración de apariencia, tokens, ejemplos, documentación y activos originales.

## Licencia y atribución

Los archivos originales de Aureform usan [Apache License 2.0](../LICENSE). Conserva los archivos de licencia y atribución que correspondan al redistribuir el proyecto. [NOTICE](../NOTICE) y [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md) identifican atribuciones e información de licencias de terceros.

Las dependencias y fuentes incluidas mantienen sus propias licencias. La apertura de Aureform no reemplaza esos términos.

## Elegir un punto de partida

| Método                                       | Cuándo usarlo                                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Ejecutar o hacer un fork de la suite         | Quieres explorar todas las pantallas y reutilizar su navegación y providers.                             |
| Crear una aplicación inicial pequeña         | Quieres el sistema de apariencia y movimiento en una base mínima de Next.js.                             |
| Añadir código con la CLI local               | Necesitas componentes o flujos concretos y sus dependencias transitivas.                                 |
| Instalar una entrada del registry con shadcn | Ya tienes un proyecto Next.js / Tailwind 4 configurado y quieres copiar código mediante una URL pública. |

El kit tiene **69 vistas: 68 rutas de la suite y una landing**, **44 familias de componentes** y **96 entradas de registry**. Puedes usar un componente sin adoptar todas las pantallas.

### Ejecutar la suite

```sh
git clone https://github.com/terrizoaguimor/aureform-ui.git
cd aureform-ui
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Usa Node.js **22.16+** y pnpm **10**. Abre `http://localhost:3000/es/` o `/en/`. El sistema de archivos local debe permitir los symlinks de paquetes.

### Crear una aplicación inicial

Desde el checkout de Aureform:

```sh
node bin/aureform.mjs init ../mi-producto --no-install
pnpm --dir ../mi-producto install
pnpm --dir ../mi-producto dev
```

El starter incluye fuentes locales, providers de apariencia y movimiento, controles de paleta y un resumen ilustrativo. La suite completa permanece en el checkout de Aureform.

### Copiar un flujo

El proyecto receptor necesita `components.json`, aliases configurados y una entrada CSS global. El starter generado los incluye.

```sh
node bin/aureform.mjs add data-workbench import-wizard customer-detail \
  --cwd ../mi-producto --diff
node bin/aureform.mjs add data-workbench import-wizard customer-detail \
  --cwd ../mi-producto
pnpm --dir ../mi-producto install
```

`--diff` y `--dry-run` no escriben archivos. La CLI protege el código existente; revisa los conflictos antes de elegir `--overwrite`. Las operaciones completadas registran hashes de origen y destino en `.aureform/manifest.json`. [Detalles de la CLI](cli-updates-1.2.md).

### Instalar una entrada pública

Desde tu proyecto configurado:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://terrizoaguimor.github.io/aureform-ui/r/data-table.json
```

El [manifest de descubrimiento](https://terrizoaguimor.github.io/aureform-ui/r/registry.json) enumera las entradas disponibles. Aporta los estilos y providers requeridos por sus ejemplos. Los callbacks interactivos deben estar en un Client Component. [Compatibilidad del registry](registry-compatibility.md).

## Construir y alojar

```sh
pnpm build
pnpm start
```

El build regenera tokens y JSON del registry y exporta archivos estáticos a `out/`. La previsualización sirve ese resultado.

La demo pública en [terrizoaguimor.github.io/aureform-ui](https://terrizoaguimor.github.io/aureform-ui/) usa el prefijo del repositorio:

```sh
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm build
```

El prefijo queda compilado en la exportación. Reconstruye al cambiarlo; usa un prefijo vacío para servir desde la raíz de un dominio. La [guía de GitHub Pages](github-pages.md) explica la publicación y su verificación.

GitHub Pages sirve el frontend. La autenticación, las rutas API y los servicios de servidor de una aplicación real requieren un backend y una configuración de despliegue apropiados.

## Conectar servicios reales

La suite demuestra flujos locales; el estado del navegador no es una base de datos compartida.

| Capacidad de la demo                               | Responsabilidad en producción                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| Pantallas de autenticación y vista previa de roles | Identidad, sesiones y autorización del servidor                             |
| Clientes, onboarding, workspaces y miembros        | Consultas y mutaciones autorizadas sobre almacenamiento compartido          |
| Mapeo, validación e importación CSV                | Ingesta validada por el servidor y una estrategia de persistencia apropiada |
| Metadatos de adjuntos en detalle de cliente        | Almacenamiento autorizado, validación de uploads y acceso real a archivos   |
| Interfaces de facturación, correo e IA             | Integraciones con proveedores de pagos, mensajería y modelos                |

Los bloques reciben datos y callbacks explícitos. Empieza por los [contratos SaaS](saas-operations.es.md), la [arquitectura](architecture.md) y los [ejemplos completos](../examples/README.md). Conserva estados de carga, vacío, error, reintento y cancelación al sustituir los adaptadores.

## Reutilizar diseño e imágenes

La [biblioteca de Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) contiene UI nativa editable. Las [notas de diseño](../design/README.md) describen los archivos realmente distribuidos y sus formatos; consúltalas para conocer la disponibilidad de una exportación nativa.

La colección de 32 imágenes ya está generada. Los WebP optimizados y sus contenedores SVG están en `public/assets/`; los WebP originales están en [`design/images/masters/`](../design/images/masters/). Los prompts están en el [catálogo](generated-images/catalog.json), y el [manifest](../public/assets/generated-images.json) registra dimensiones, textos alternativos y hashes.

La colección contiene 16 retratos ficticios, dos avatares de organizaciones, ocho productos ficticios y seis escenas editoriales. Ejecutar la demo o usar los archivos incluidos no requiere una cuenta de generación, claves API ni un servicio de imágenes.

## Verificar cambios y contribuir

[CONTRIBUTING](../CONTRIBUTING.md) explica las verificaciones de tipos, lint, tests, ejemplos, build y navegador. `pnpm verify:public` verifica el código distribuible; `pnpm verify:pages` verifica la exportación de Pages con la configuración indicada en la guía de despliegue.

Los registros de diseño y QA conservan su versión y alcance originales. En particular, el checkpoint **1.2.1** de las imágenes permanece como procedencia histórica dentro de la publicación abierta **1.3.0**. Esos registros no certifican una aplicación consumidora, una contribución nueva ni una exportación nativa.
