# Distribución del diseño


El propietario confirmó el 19 de octubre de 2026 el acceso público por enlace y los permisos de copia/exportación. El conector no permite comprobar esos ajustes de forma independiente.

[English](figma-distribution.md) · [Paquete de diseño](../design/README.es.md)

Los recursos originales de diseño de Aureform se incluyen bajo [Apache 2.0](../LICENSE), conservando los avisos de fuentes y bibliotecas de terceros.

## Qué está disponible

El repositorio incluye ocho **SVG descargados realmente de Figma**, los tokens y su CSS generado, un plugin abierto de reconstrucción, mapas de rutas/componentes con IDs registrados, código local de Code Connect y evidencias PNG nativas. El [ZIP de diseño](../design/downloads/aureform-design-snapshots.zip) reúne estos recursos seleccionados.

El [archivo original de Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) sigue siendo la fuente nativa del diseño. Se verificó el acceso del conector autenticado, y el propietario confirmó el acceso público por enlace y los permisos de copia/exportación. No se realizó una comprobación independiente con una sesión anónima. Los recursos del repositorio se pueden usar sin entrar a ese archivo.

## Estado de la exportación nativa

En la revisión del 2026-10-19, el conector permite exportar recursos PNG, JPG, SVG y PDF, además de vídeo mediante otra operación. No ofrece una descarga nativa `.fig`. Un intento real de exportar un componente como `JSON_REST_V1` devolvió **“JSON_REST_V1 export format is not supported in this context.”** Tampoco había navegador ni editor nativo habilitado para descargar una copia local.

Por eso **no se incluye un archivo `.fig` nativo**. Los SVG y JSON conservan sus extensiones reales. El plugin tiene un alcance y límites de reconstrucción documentados.

Figma permite obtener una copia auténtica mediante **menú principal → File → Save local copy**. Un editor accesible con permiso de copia produce el `.fig`. Importarlo crea otro archivo e identidades nuevas de componentes; no conserva comentarios ni historial de versiones. [Documentación oficial de copia local](https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files).

Cuando se pueda obtener una exportación auténtica, agrega sus bytes reales, tamaño, SHA-256 y fecha a `design/figma/`. Comprueba la importación en Figma antes de describirla como copia nativa editable. El repositorio no reserva un `.fig` de relleno.

## Código, diseño y evidencia

El [mapa de rutas](../design/maps/routes.md) contiene los 69 IDs de raíz registrados en el handoff congelado 1.2.1. Es un índice, no una nueva inspección de todas las rutas. El [mapa de componentes](../design/maps/components.json) apunta al código real y a 92 plantillas locales de Code Connect, sin registro en Figma. Importar o reconstruir produce IDs nuevos.

Las siete pruebas de imágenes mantienen sus hashes y aceptación limitada original. No certifican una nueva revisión visual de 69 vistas. Los ocho SVG nuevos se comprobaron por tamaño, estructura SVG válida e imágenes autocontenidas; esa validación demuestra integridad de la exportación.

El [registro separado de diseño 1.3.0](../design/release-1.3.0.json) describe los cambios Apache-2.0 en portada y licencia, con una lectura posterior real. Las auditorías anteriores y el estado canónico de `.figma` permanecen intactos. Los precios de planes SaaS son datos ilustrativos de la aplicación.

Los retratos y las imágenes de productos/editoriales generadas son contenido raster. Figma usa PNG sin pérdida con los mismos píxeles decodificados del WebP optimizado. Los contenedores SVG de imágenes usados en ejecución no son retratos vectoriales. Los prompts y masters están en [la colección de imágenes](../design/images/README.md).

## Cómo reproducir el paquete público

Desde un checkout completo:

```bash
pnpm tokens
python3 design/scripts/prepare_design.py --bundle
node design/rebuild-plugin/build.mjs
```

Los comandos utilizan los archivos suministrados. No acceden a Figma ni generan imágenes nuevas. El paquete no incluye credenciales, emails de cuentas, transcripciones de herramientas ni enlaces temporales firmados.
