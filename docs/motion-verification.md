# Verificación portable de movimiento

> **Checkpoint histórico anterior a la publicación abierta.** Los resultados, pendientes y referencias a publicaciones privadas o paquetes describen únicamente la versión indicada; no son comprobaciones nuevas de la versión 1.3. El trabajo original distribuido de Aureform usa ahora [Apache 2.0](../LICENSE), incluida la muestra, el starter, el diseño y las imágenes originales. Las antiguas propuestas comerciales no son condiciones vigentes; los avisos de terceros siguen aplicando.

[`scripts/verify-motion.mjs`](../scripts/verify-motion.mjs) comprueba GSAP, Lenis, gradientes, sombras, hover y navegación mediante estilos y desplazamientos observables. Utiliza `@playwright/test` y `@axe-core/playwright`, incluidos en las dependencias de desarrollo.

**QA actual 1.1: 14/14 escenarios y 74/74 comprobaciones aprobados, con cero errores y source sin modificar durante la ejecución.** Evidencia: `/tmp/aureform-ui-build/artifacts/owner-final-1.1/motion-rerun/motion-report.json`, registrada en [verificación](verification.es.md). El informe histórico 1.0 del 2026-10-18 conserva su propio alcance: cero errores, desbordamiento y violaciones automáticas `serious`/`critical`. Los resultados incompletos de contraste permanecen en los informes para revisión visual.

## Reproducir la verificación

Desde la raíz del proyecto, instalar las dependencias y generar la exportación de producción que se va a comprobar:

```bash
pnpm install --frozen-lockfile
pnpm build
PORT=3001 pnpm start
```

En otra terminal:

```bash
AUREFORM_BASE_URL=http://127.0.0.1:3001 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium-browser \
node scripts/verify-motion.mjs
```

El servidor debe servir el `out/` del build recién generado. `AUREFORM_BASE_URL` selecciona el servidor y usa `http://127.0.0.1:3001` por defecto. El ejecutable se toma de `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, de `/usr/bin/chromium-browser` si existe o del Chromium instalado por Playwright. La suite utiliza el navegador disponible.

El resultado se escribe en `artifacts/motion-report.json`, relativo a la raíz que contiene el script, incluso al invocarlo desde otro directorio. La suite continúa con las otras combinaciones si falla un escenario. Guarda el informe y cierra los contextos y el navegador; después, cualquier fallo provoca una excepción y una salida distinta de cero.

## Escenarios

| Escenario                 | Combinaciones                                   | Comprobaciones                                                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing con ratón         | EN/ES × claro/oscuro, 1440 × 900 px             | Lenis activo; rueda y ancla `#kit`; introducción y revelado de GSAP que terminan visibles y no se repiten; Tab y Enter; cambio de gradientes al alternar tema; hover y sombras; activación y restauración en vivo de movimiento reducido. |
| Landing táctil            | EN/ES × claro/oscuro, 360 × 800 px              | Puntero grueso y scroll nativo; apertura y cierre del menú; ancla mediante tap; navegación a plantillas; conservación de idioma y tema.                                                                                                   |
| Dashboard                 | EN/ES × claro/oscuro, 1440 × 720 px             | Scroll nativo sin Lenis; desplazamiento con rueda y PageDown; recorrido por teclado y foco visible.                                                                                                                                       |
| Aplicación sin JavaScript | EN y ES, 1440 × 900 px, tema claro del servidor | Contenido SSR visible; estilos inline de movimiento vacíos; estado estático sin Lenis; ancla nativa; medición de accesibilidad sobre una copia de QA del DOM observado.                                                                   |

Son doce escenarios con JavaScript y dos sin JavaScript. Cada recorrido incluye un chequeo final de desbordamiento, errores y accesibilidad. Axe utiliza las etiquetas WCAG 2 A/AA y 2.1 A/AA en la vista final del recorrido: la página original para los doce escenarios con JavaScript y la copia descrita a continuación para los dos restantes.

## Criterios de movimiento y efectos

La raíz se identifica mediante `[data-motion-mode][data-smooth-scroll]`. Sus valores se registran en ejecución. La landing con puntero fino y movimiento habilitado debe tener Lenis activo; activar movimiento reducido debe cambiar ambos marcadores, eliminar las clases de Lenis y retirar los estilos inline de animación. Restaurar la preferencia recupera el runtime si la apariencia permite movimiento. En 1.1, Off también desactiva entradas/Lenis y requiere comprobar cambios en vivo junto con Gentle/Expressive.

Los marcadores `[data-motion="intro"]` y `[data-motion="reveal"]` delimitan los objetivos. Un observador registra cambios reales en `opacity`, `visibility` y transformaciones, también en descendientes. La comprobación exige haber observado estilos transitorios y que los objetivos terminen visibles y estables. Salir y volver a entrar en la zona debe mantener sus contadores de cambios, sin repetir la animación.

`settledTransform` acepta una matriz de identidad. Admite además una excepción estricta para `.af-hover-card` en `:hover` o `:focus-visible`: los estilos inline de movimiento deben estar vacíos, la matriz debe contener únicamente una traslación vertical y su valor debe coincidir con `--af-motion-lift`, con una tolerancia de 0,001 px. Así reconoce el lift CSS restaurado tras GSAP sin aceptar una transformación residual de la animación. La comprobación de movimiento reducido exige identidad y estilos inline vacíos.

La limpieza se verifica durante una animación: se recarga la landing, se detecta una introducción transitoria con Lenis activo y se cambia a `prefers-reduced-motion: reduce`. Se comprueban contenido visible, retirada de estilos, scroll CSS nativo con comportamiento `auto`, rueda y ancla operativas. Después se restaura `no-preference`.

Los gradientes de `.af-hero-gradient` y `.af-surface-gradient` se leen en elementos reales y en los pseudo elementos renderizados. Deben resolver imágenes de fondo diferentes entre claro y oscuro. También se comprueban hover de `.af-hover-card`, presencia de `.af-button` y sombras `.af-shadow-soft` y `.af-shadow-elevated` donde se apliquen; sus usos quedan registrados.

El scroll se mide por la posición del documento. El ancla debe alcanzar su destino calculado con los márgenes y el padding CSS de scroll, dentro de 8 px, y mostrar su título en el viewport. El destino se recalcula durante la espera para recoger cambios de distribución, como el cierre del menú móvil.

El mismo predicado exige ocho observaciones estables y tiene un límite de cinco segundos. Con JavaScript habilitado se evalúa mediante RAF. En la página sin JavaScript, cuyos callbacks RAF están deshabilitados, Node consulta el predicado mediante el protocolo del navegador, con intervalos de 16 ms entre observaciones. El criterio de estabilidad y las condiciones de aprobación se mantienen.

## Página sin JavaScript y copia de QA para axe

La página original permanece en un contexto con `javaScriptEnabled: false` durante todo el recorrido. Sobre ella se verifican idioma SSR, visibilidad de encabezados y párrafos, estilos inline vacíos, ausencia de Lenis y desplazamiento nativo a `#kit`. Las lecturas de QA mediante el protocolo del navegador conservan esa configuración.

Axe necesita callbacks asíncronos que Chromium deshabilita en ese contexto. Su medición se realiza en **otra página de QA**, creada a partir del DOM observado en la original:

1. Capturar la presentación original y clonar su documento. Retirar todos los nodos `script`, los enlaces con `as="script"` y los enlaces `modulepreload`. Añadir un `base` con la URL original para resolver CSS, fuentes y otros recursos.
2. Crear un contexto de QA con JavaScript habilitado y el mismo viewport. Bloquear en la red las solicitudes de tipo `script` bajo `/_next/`; permitir los recursos de presentación. Cargar el DOM depurado y esperar las fuentes.
3. Exigir igualdad de idioma, tema oscuro/claro, anchura efectiva del documento, texto del `h1`, color, familia y tamaño tipográficos del `h1` e imagen de fondo del gradiente de hero. Ejecutar axe **en esta copia** una vez comprobada esa igualdad.
4. Volver a leer la página original y comprobar que conserva el modo `static` y sigue sin clases de Lenis. Su marcador de scroll `native` queda registrado. Cerrar el contexto de la copia.

El informe identifica esta medición como `script-free-copy-of-observed-ssr-dom` e incluye `originalJavaScriptDisabled`, `removedScripts`, `blockedApplicationScripts` y `presentationPreserved`. La comprobación de visibilidad y navegación pertenece a la original; la de axe pertenece a la copia cuya presentación se comparó.

Sólo en los escenarios sin JavaScript, los scripts del mismo origen bajo `/_next/` bloqueados con razón `csp` o `net::ERR_BLOCKED_BY_CLIENT` se registran en `intentionallyBlockedScripts`. Los errores inesperados de ejecución, consola, respuestas HTTP y solicitudes fallidas conservan su tratamiento de fallo; las cancelaciones `ERR_ABORTED` se omiten. El bloqueo preventivo de scripts en la copia se registra por separado en `blockedApplicationScripts`.

## Idioma del HTML exportado

Se corrigió un error SSR que entregaba documentos de rutas españolas con el idioma raíz incorrecto. La raíz HTML se resuelve ahora en `src/app/[locale]/layout.tsx` y `src/app/(entry)/layout.tsx`, que comparten `src/components/document-layout.tsx`.

El 2026-10-18 se leyó directamente el HTML del build de producción, antes de ejecutar JavaScript:

| Archivo exportado             | `html[lang]` |
| ----------------------------- | ------------ |
| `out/en/index.html`           | `en`         |
| `out/es/index.html`           | `es`         |
| `out/en/dashboard/index.html` | `en`         |
| `out/es/dashboard/index.html` | `es`         |

Esta comprobación y los dos recorridos sin JavaScript confirman el idioma declarado desde el servidor.

## Evidencia y lectura del informe

El informe **histórico 1.0** se examinó en `/tmp/aureform-ui-build/artifacts/motion-report.json`, contra aquella exportación. La ruta del mirror puede contener resultados posteriores; conservar la atribución por versión y fecha:

| Dato                                           | Resultado                  |
| ---------------------------------------------- | -------------------------- |
| URL comprobada                                 | `http://127.0.0.1:3010`    |
| Inicio UTC                                     | `2026-10-18T21:55:01.434Z` |
| Finalización UTC                               | `2026-10-18T21:56:41.171Z` |
| Estado final                                   | `passed`                   |
| Escenarios                                     | 14 aprobados de 14         |
| Comprobaciones                                 | 74 aprobadas de 74         |
| Errores                                        | 0                          |
| Desbordamiento horizontal final                | 0 px en los 14 escenarios  |
| Violaciones automáticas `serious` / `critical` | 0                          |

En cada recorrido sin JavaScript se retiraron 17 nodos de script o precarga de la copia; `presentationPreserved` y `originalJavaScriptDisabled` fueron `true`. No hubo solicitudes de scripts de aplicación en las copias. En cada original se registró un bloqueo intencional `csp`, y el estado conservó `static` / `native`.

Los resultados `axeIncomplete` incluyen `color-contrast` en diez escenarios. Sus objetivos requieren revisión visual; son resultados incompletos, separados de las violaciones detectadas. La aprobación de esta suite cubre sus comprobaciones automáticas y no constituye una certificación de accesibilidad.

Para evaluar una ejecución posterior, comprobar que `startedAt` y `completedAt` correspondan al build servido, que `status` sea final y que `summary.scenarios` coincida con `summary.plannedScenarios`. Revisar `errors`, los detalles de cada comprobación, `axeIncomplete` y `accessibilityMeasurement` para mantener la atribución correcta de la evidencia.
