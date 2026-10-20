# CLI local y registro

El instalador de Aureform se incluye como `bin/aureform.mjs`. Ejecútalo con Node desde el repositorio clonado o extraído. Copia código y recursos locales; no hay un paquete Aureform global publicado en npm ni descargas del registro dentro de esta CLI.

## Crea y amplía un proyecto consumidor

Usa Node.js 22.18.0+ y la versión pnpm del repositorio. Elige un directorio nuevo fuera del kit:

```sh
node bin/aureform.mjs list
node bin/aureform.mjs init ../my-product --no-install
pnpm --dir ../my-product install
node bin/aureform.mjs add data-table chart --cwd ../my-product --diff
node bin/aureform.mjs add data-table chart --cwd ../my-product
pnpm --dir ../my-product install
```

`list` descubre nombres disponibles. `init` crea el proyecto inicial y ejecuta pnpm salvo que uses `--no-install`. `add` sigue imports, dependencias dinámicas y recursos, incorpora requisitos de paquetes e integra el tema semántico. No ejecuta el gestor de paquetes del consumidor.

## Configura alias y estilos admitidos

Un destino existente necesita `components.json`, `tsconfig.json`, un alias raíz como `@/*` → `./src/*` y CSS global. La [configuración incluida](../../../components.json) utiliza:

```json
{
  "components": "@/components",
  "utils": "@/lib/utils",
  "ui": "@/components/ui",
  "lib": "@/lib",
  "hooks": "@/hooks"
}
```

Es el objeto `aliases`, no un archivo de configuración completo. El instalador resuelve alias admitidos y adapta los imports copiados. En `components.json`, `tailwind.css` debe apuntar a la entrada global real.

El instalador local añade `aureform.css` y su import. Revisa el CSS global junto con los componentes: `AppearanceScope` aísla variables, pero no elimina todos los selectores globales.

## Revisa antes de reemplazar archivos

1. Usa `--dry-run` para inspeccionar rutas, dependencias, acciones y conflictos.
2. Usa `--diff` para ver cambios de texto; siempre implica un preview sin escritura.
3. Revisa archivos protegidos antes de aplicar `--overwrite` explícitamente.
4. Instala las dependencias incorporadas después de añadir código.

Los flags de preview solo funcionan con `add`. Los conflictos devuelven un código distinto de cero; un preview con `--overwrite` tampoco escribe. Los archivos existentes que difieren siguen protegidos, incluso si proceden de una instalación anterior. Las versiones mayores incompatibles bloquean la copia aun con overwrite; no es una comprobación semver completa.

Las incorporaciones exitosas registran hashes originales e instalados en `.aureform/manifest.json`. Estos recibos describen procedencia y personalización; no implementan actualizaciones automáticas de tres vías.

## Usa shadcn como otra vía de instalación

Desde el proyecto consumidor configurado, utiliza la URL pública completa:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://aureformui.com/r/data-table.json
```

Consulta [Instalación](installation.md), los [detalles de previews y recibos](../../../docs/cli-updates-1.2.md) y la [compatibilidad del registro](../../../docs/registry-compatibility.md). Conserva estilos, contextos y rutas de recursos en ambas opciones.
