# Despliegue en Cloudflare

[English](cloudflare-deployment.md)

Aureform UI usa Next.js 16.4.2 con `output: "export"` y `trailingSlash: true`. Cloudflare sirve la exportación existente de `out/` mediante Workers Static Assets. El adaptador de empaquetado no cambia la aplicación ni requiere un servidor de Next.js.

Usa Node.js 22.18.0 o posterior, pnpm 10.34.5 y la dependencia de desarrollo fijada en el proyecto, `cf@1.0.0-beta.18`. `cf` tiene su propia autenticación; una sesión de Wrangler no lo autentica.

## Compilar y validar localmente

Ejecuta estos comandos desde la raíz del repositorio:

```sh
NEXT_PUBLIC_BASE_PATH="" pnpm build
node scripts/prepare-cloudflare.mjs
CF_SEND_TELEMETRY=false pnpm exec cf deploy --prebuilt --dry-run
```

Si `out/` ya contiene la compilación deseada para la raíz del dominio, empieza por el comando de preparación. La preparación funciona sin red, copia los archivos y reemplaza únicamente `.cloudflare/output/v0/`. No modifica `out/`, `public/`, el código fuente ni las dependencias. Una exportación ausente, un enlace simbólico, una redirección de descarga en conflicto, un archivo demasiado grande distinto del ZIP fuente o más de 20.000 recursos detiene la preparación.

Una exportación antigua con ruta base de GitHub Pages permite validar el empaquetado localmente. El adaptador muestra una advertencia y devuelve `rootDomainExport: false` junto con las rutas detectadas en `exportBasePaths`. Vuelve a compilar con `NEXT_PUBLIC_BASE_PATH=""` antes de desplegar esa exportación en el dominio personalizado.

La simulación valida el resultado preparado sin autenticación, solicitudes a la API ni cargas de archivos. Incluye siempre `--prebuilt`: el adaptador proporciona el artefacto de despliegue, mientras que la configuración automática de frameworks de CF usa otro proceso de compilación.

## GitHub Pages mantiene un proceso separado

El workflow existente `.github/workflows/pages.yml` ejecuta `pnpm build` con `NEXT_PUBLIC_BASE_PATH` proporcionado por `actions/configure-pages`, valida la exportación con `pnpm verify:pages` usando la misma ruta base y carga `out/` como artefacto de Pages.

El proceso de Cloudflare compila para la raíz del dominio y después copia esa exportación a Build Output de CF mediante `node scripts/prepare-cloudflare.mjs`. No usa las acciones de carga ni despliegue de Pages. Conserva una exportación por destino o vuelve a compilar antes de cambiar de destino; preparar una exportación antigua no reescribe sus URLs internas.

## Configuración y Build Output

`cloudflare.config.ts` importa el helper tipado `defineConfig` desde `cf/config` y declara:

- Nombre del Worker: `aureform-ui`.
- Fecha de compatibilidad: `2026-10-19`.
- Dominios personalizados: `aureformui.com` y `www.aureformui.com`.
- `workersDev: false`; producción utiliza los dos dominios personalizados, según la [guía de rutas de Cloudflare](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/). GitHub Pages ofrece el respaldo separado.
- `assets.htmlHandling: "force-trailing-slash"`.
- `assets.notFoundHandling: "404-page"`.
- `assets.runWorkerFirst: false`.
- Observabilidad habilitada, registros con muestreo del 100%, trazas con muestreo del 1% y eliminación de cadenas de consulta en registros y trazas.

La configuración tipada de `assets` controla el comportamiento en ejecución y no tiene un campo `directory`. El adaptador encuentra el directorio de recursos mediante los helpers de Build Output instalados con CF:

```text
.cloudflare/output/v0/
├── config.json
└── workers/
    └── default/
        ├── worker.config.json
        └── assets/
            ├── _redirects
            ├── index.html
            ├── 404.html
            └── ...los demás archivos exportados
```

La configuración raíz es:

```json
{
  "buildContext": {
    "isPreview": false
  }
}
```

`worker.config.json` se obtiene de la configuración fuente validada mediante `writeWorkerConfig()`. No tiene `entrypoint` ni `manifest`; un artefacto compuesto solo por recursos requiere `assets/` y no necesita `bundle/`. El adaptador escribe la raíz con `writeRootConfig()` y verifica el artefacto completo con `readBuildOutput()`, usando `@cloudflare/build-output-utils@0.9.3` y `@cloudflare/config@0.27.0` incluidos en la dependencia fijada de CF.

No se registra ningún modo, por lo que debes usar `cf deploy --prebuilt` sin `--mode`. Vuelve a preparar el artefacto cuando cambie `out/` o `cloudflare.config.ts`. Conserva todo el árbol `.cloudflare/output/v0/` al transferir una compilación entre trabajos de CI y mantén `.cloudflare/` ignorado por Git.

Este artefacto no contiene código de un Worker de usuario. Las solicitudes de recursos y las redirecciones no ejecutan código de la aplicación en un Worker. Los ajustes de registros y trazas quedan en la configuración tipada y preparada para futuro código de Worker; la carga de recursos de CF beta.18 no aplica los metadatos de observabilidad de Workers, y las solicitudes estáticas no generan registros de invocación ni trazas de un Worker de usuario.

## ZIP fuente y descargas pequeñas

Workers Static Assets tiene un [límite de 25 MiB por archivo](https://developers.cloudflare.com/workers/platform/limits/#static-assets). El ZIP fuente supera ese límite y permanece en `public/downloads/` y en la exportación original.

El adaptador omite únicamente `downloads/aureform-ui-source.zip` de la colección de recursos copiada y genera esta regla en el archivo `_redirects` de la copia:

```text
/downloads/aureform-ui-source.zip https://github.com/terrizoaguimor/aureform-ui/releases/download/v${version}/aureform-ui-source.zip 302
```

El adaptador lee `version` desde `package.json` y escribe la etiqueta real `v${version}` en la regla; `${version}` en el ejemplo representa la plantilla y no queda en el resultado. El nombre del archivo sigue siendo `aureform-ui-source.zip`. El sistema de recursos conserva la cadena de consulta recibida.

Antes del despliegue, el propietario debe publicar y verificar la [versión estable de GitHub](https://github.com/terrizoaguimor/aureform-ui/releases) correspondiente con ese ZIP fuente. La preparación y la simulación de CF no comprueban que la versión exista. Un cambio de versión requiere volver a compilar la exportación, publicar los archivos correspondientes y preparar un nuevo Build Output. Los archivos y las evidencias de versiones históricas se conservan sin cambios.

Todos los ZIP pequeños presentes en `out/` se copian sin cambiar sus bytes. La preparación no añade un ZIP ausente de la exportación. Otros archivos demasiado grandes hacen fallar la validación en lugar de omitirse silenciosamente.

## Propietario: configurar `www` → dominio raíz

El analizador de archivos `_redirects` de CF beta.18 solo acepta rutas relativas como origen; rechaza un origen absoluto con hostname. Por eso, el despliegue usa una [regla de redirección de Cloudflare](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-dashboard/) administrada por el propietario para unificar el hostname.

En la zona `aureformui.com`, configura una Single Redirect con:

| Ajuste                            | Valor                                                     |
| --------------------------------- | --------------------------------------------------------- |
| Expresión de filtro personalizada | `http.host eq "www.aureformui.com"`                       |
| Tipo de redirección               | Dynamic                                                   |
| Expresión de destino              | `concat("https://aureformui.com", http.request.uri.path)` |
| Código de estado                  | `308`                                                     |
| Preserve query string             | Activado                                                  |

La regla requiere tráfico con proxy de Cloudflare para `www.aureformui.com`. El propietario debe revisarla y aplicarla usando su zona y cuenta existentes. Declarar ambos dominios personalizados en la configuración del Worker no crea esta redirección.

Por ejemplo, `https://www.aureformui.com/es/docs/?q=button` debe devolver `308` con `Location: https://aureformui.com/es/docs/?q=button`. La regla se aplica antes del sitio estático, incluso a rutas inexistentes y descargas, y evita ejecutar un Worker en cada solicitud.

## Propietario: autenticarse y desplegar

El propietario de la cuenta completa `cf auth login` usando el CLI de CF instalado, selecciona la cuenta correcta y despliega el artefacto validado:

```sh
CF_SEND_TELEMETRY=false pnpm exec cf deploy --prebuilt
```

Define `CLOUDFLARE_ACCOUNT_ID` en el entorno del propietario si necesitas seleccionar una cuenta explícitamente. No hay un ID de cuenta fijado en el código ni en Build Output. La vinculación de dominios requiere acceso a la zona existente de Cloudflare. Esta guía y la simulación local no autentican, cambian DNS o reglas ni despliegan nada.

En CI, compila una vez, prepara una vez y valida el mismo artefacto. Solo el paso de despliegue real del propietario recibe `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` desde secretos protegidos del repositorio o del entorno. Nunca guardes tokens, estado de sesión ni archivos generados de `.cloudflare/` en el repositorio.

El [workflow de Cloudflare](../.github/workflows/cloudflare.yml) valida los pull requests sin credenciales de despliegue, ejecuta las pruebas de navegador del sitio y publica el mismo export de raíz desde `main` o una ejecución manual. Antes de publicar, `pnpm verify:cloudflare-release` descarga el ZIP público de código en streaming y compara su tamaño y SHA-256 con el manifest empaquetado. Una release ausente o con bytes distintos detiene el despliegue.

Usa Workers Scripts Write y Account Settings Read limitados a la cuenta, más Workers Routes Write y Zone Read limitados a la zona del sitio. El token de despliegue no necesita acceso a todas las cuentas ni zonas. Guárdalo en los secretos cifrados de GitHub y rótalo antes de la caducidad configurada. Para un fork, cambia el nombre del Worker, los dominios, el origen canónico y las URLs de releases de GitHub antes de publicar.

Después del despliegue, verifica una ruta conocida en inglés y otra en español, la redirección con barra final, una ruta inexistente con HTTP 404, todos los ZIP pequeños, la redirección del ZIP fuente y la redirección de `www` con cadena de consulta. Una ruta desconocida debe servir la página 404 exportada con estado 404; no hay fallback de SPA.

Referencias oficiales: [configuración tipada](https://developers.cloudflare.com/cf/projects/cloudflare-config/), [despliegues precompilados](https://developers.cloudflare.com/cf/projects/#deploy-a-prebuilt-build), [CF en CI](https://developers.cloudflare.com/cf/ci/), [redirecciones estáticas](https://developers.cloudflare.com/workers/static-assets/redirects/) y [comportamiento 404 de sitios estáticos](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).
