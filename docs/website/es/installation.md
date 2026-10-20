# Instalación

Elige entre la aplicación completa de demostración y un proyecto consumidor más pequeño. Aureform copia código editable a tu proyecto; no es un paquete npm global publicado ni un backend alojado.

[aureformui.com](https://aureformui.com/) es el sitio principal de demo, documentación y registro. [GitHub Pages](https://terrizoaguimor.github.io/aureform-ui/) permanece como respaldo.

## Ejecuta la suite completa

Usa Node.js 22.18.0 o posterior y pnpm 10. El repositorio fija su gestor de paquetes en `package.json`. Instala en un sistema de archivos que admita enlaces simbólicos de paquetes.

Si `corepack` no está disponible, ejecuta primero `npm install --global corepack`. Node.js 25 y posteriores no lo incluyen; consulta la [guía oficial de instalación](https://github.com/nodejs/corepack#default-installs).

```sh
git clone https://github.com/terrizoaguimor/aureform-ui.git
cd aureform-ui
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Abre `http://localhost:3000/en/` o `http://localhost:3000/es/`. Las imágenes y fuentes son locales. Autenticación, comercio y otros servicios de la aplicación usan simulaciones de frontend; no necesitas claves de API.

1. Conserva el lockfile incluido para reproducir el repositorio completo.
2. Deja `NEXT_PUBLIC_BASE_PATH` vacío al servir desde la raíz de un dominio como aureformui.com.
3. Deja vacías las variables opcionales de Google Maps para usar el mapa local. El [ejemplo de entorno](../../../.env.example) documenta estas opciones públicas del build.

## Crea una aplicación más pequeña

Desde el repositorio de Aureform, elige un directorio nuevo fuera del kit:

```sh
node bin/aureform.mjs init ../my-product --no-install
pnpm --dir ../my-product install
pnpm --dir ../my-product dev
```

El proyecto inicial incluye Next.js, React, Tailwind 4, fuentes locales, controles de apariencia y dependencias de movimiento y efectos. Su primera instalación crea un lockfile propio; el comando de instalación congelada del repositorio no sustituye ese paso.

Para ampliar un proyecto existente, configura primero `components.json`, un alias raíz con comodín en TypeScript y el CSS global. Revisa los cambios con `node bin/aureform.mjs add button --cwd ../my-product --diff`; después aplícalos e instala las dependencias incorporadas. Consulta [CLI](cli.md).

## Instala desde el registro público

En un proyecto Next.js / Tailwind 4 con shadcn configurado, usa la URL completa:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://aureformui.com/r/button.json
```

Incluye el CSS global de Tailwind y los estilos semánticos de Aureform. Button no necesita los proveedores de la suite; los bloques traducidos pueden requerir contexto de idioma, apariencia y workspace. Sigue [Componentes](components.md), [Tokens](tokens.md) y la [compatibilidad del registro](../../../docs/registry-compatibility.md).

## Prepara tu despliegue

Revisa las rutas de archivos, enlaces, variables y licencias del proyecto consumidor. Los datos de demostración viven en el navegador, no en una base de datos. La autenticación real y los endpoints y webhooks de Stripe requieren tu backend. La [guía de código abierto](../../../docs/open-source.es.md) explica los builds de la suite y la reutilización del código.
