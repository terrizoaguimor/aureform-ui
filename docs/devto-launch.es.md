---
title: "Aureform UI: un kit abierto de Next.js con estudio de apariencia"
published: false
description: "69 vistas, código editable, seis paletas, claro y oscuro, GSAP, Lenis y una biblioteca de Figma. Publicado bajo Apache 2.0."
tags: nextjs, react, opensource, webdev
cover_image: https://raw.githubusercontent.com/terrizoaguimor/aureform-ui/main/docs/images/aureform-overview-dark.webp
---

Hoy abro **Aureform UI bajo Apache 2.0**: un kit de Next.js para dashboards, espacios SaaS y herramientas internas, con código editable y una biblioteca de Figma.

Puedes [explorar la demo](https://terrizoaguimor.github.io/aureform-ui/) o [descargar el código en GitHub](https://github.com/terrizoaguimor/aureform-ui).

Incluye **69 vistas, 44 familias de componentes y 96 entradas de registry**, construidas con Next.js 16, React 19, TypeScript, Tailwind CSS 4 y Base UI. Todos los componentes, bloques y plantillas de Aureform forman parte de esta publicación abierta.

## El trabajo detrás de las capturas

Un dashboard sirve cuando permite terminar una tarea: encontrar un cliente, guardar una vista filtrada, importar un CSV, recuperarse de un error o completar el onboarding. Las tarjetas bonitas cubren una parte de ese trabajo.

Aureform incluye demostraciones locales de esos flujos, además de dashboards, comercio, correo, chat, tareas, ajustes e interfaces de trabajo con IA. Puedes estudiar las interacciones y modificar el código.

Los bloques reutilizables de operaciones reciben tus datos y callbacks. Esto permite conectar una tabla o un flujo de importación con los servicios de tu aplicación sin rehacer su presentación.

## La apariencia forma parte del sistema

Quería que el kit dejara espacio para elegir una dirección visual propia.

El estudio de apariencia ofrece seis paletas—Aurora, Violet, Ocean, Mint, Ember y Rose—junto con colores, shades, tipografía, radios, densidad y materiales. Puedes explorar gradientes, superficies de vidrio, sombras y estados hover en claro y oscuro.

![Estudio de apariencia de Aureform con controles de paleta y materiales](https://raw.githubusercontent.com/terrizoaguimor/aureform-ui/main/docs/images/aureform-studio.webp)

Los presets se guardan localmente, se importan como JSON y se exportan como JSON, CSS o un ejemplo React. Las variables compartidas llevan esa configuración a los componentes.

También hay seis efectos independientes: fondos con gradientes, fondos con shaders, tarjetas con spotlight, bordes con brillo, tarjetas con inclinación y botones magnéticos.

GSAP controla las entradas dentro de su ámbito y limpia los efectos al desmontar. Lenis es opcional en la landing; las pantallas de aplicación conservan el scroll nativo. Se respeta la preferencia de movimiento reducido y los shaders tienen una alternativa estática.

## Gráficos e imágenes reutilizables

El kit incluye 13 tipos de gráficos y un sistema de tablas, con ejemplos completos de componentes en el repositorio. La demo incluye inglés y español.

![Galería de gráficos de Aureform](https://raw.githubusercontent.com/terrizoaguimor/aureform-ui/main/docs/images/aureform-charts.webp)

La colección contiene **32 imágenes originales generadas con GPT Image 2.5**: 16 retratos ficticios, dos avatares de organizaciones, ocho productos y seis escenas editoriales. Usar los archivos incluidos no requiere claves API ni un servicio de generación.

El repositorio incluye archivos optimizados, el catálogo de prompts completo y los WebP originales en [`design/images/masters/`](https://github.com/terrizoaguimor/aureform-ui/tree/main/design/images/masters). Los archivos SVG incorporan los bytes del raster optimizado para transportar las imágenes mediante un registry de componentes basado en texto.

La [biblioteca editable de Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) acompaña al código. Las [notas de diseño](https://github.com/terrizoaguimor/aureform-ui/blob/main/design/README.md) describen los archivos disponibles y sus formatos de exportación.

## Ejecutarlo o tomar las piezas que necesites

Necesitas Node.js 22.16+ y pnpm 10:

```sh
git clone https://github.com/terrizoaguimor/aureform-ui.git
cd aureform-ui
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Abre `http://localhost:3000/es/` o `/en/`. Las imágenes y las fuentes están incluidas localmente.

Desde ese checkout, la CLI puede crear una aplicación inicial más pequeña:

```sh
node bin/aureform.mjs init ../mi-producto --no-install
pnpm --dir ../mi-producto install
pnpm --dir ../mi-producto dev
```

Para un proyecto Next.js existente y configurado, `add` copia el código seleccionado y sus activos. `--dry-run` permite revisar el plan y `--diff` muestra los cambios sin escribir archivos.

También puedes instalar entradas individuales mediante shadcn desde un proyecto Next.js / Tailwind 4 con shadcn configurado:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://terrizoaguimor.github.io/aureform-ui/r/button.json
```

El README enlaza los requisitos de providers, ejemplos y contratos de integración.

## Dónde entra tu backend

Esta publicación es un kit de frontend. Los registros y las preferencias de la demo se guardan en el navegador. La autenticación, autorización del servidor, bases de datos compartidas, facturación, correo y llamadas a modelos de IA son servicios que debes conectar.

Las vistas previas de roles ilustran interacciones; no hacen cumplir permisos en un servidor. Las demos locales muestran estos límites para poder sustituir sus adaptadores de forma consciente.

El ejemplo público es una exportación estática alojada en GitHub Pages. Puedes construir la misma demo localmente o usar el código en una aplicación con tu propio despliegue y backend.

## Ayuda a hacerlo útil para más personas

La [guía para contribuir](https://github.com/terrizoaguimor/aureform-ui/blob/main/CONTRIBUTING.md) explica la estructura del código, los comandos de verificación y las convenciones de diseño. Son bienvenidas las contribuciones en español e inglés.

Hay espacio para mejorar validaciones, interacción con teclado, ejemplos, traducciones y nuevos flujos con contratos de datos explícitos. Si encuentras un problema, incluye la ruta y los pasos para reproducirlo.

Explora la [demo](https://terrizoaguimor.github.io/aureform-ui/), visita el [repositorio](https://github.com/terrizoaguimor/aureform-ui) y adapta el código a tu proyecto. El código, la documentación y los activos originales de Aureform usan Apache 2.0; las dependencias y fuentes mantienen sus licencias respectivas.
