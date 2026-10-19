# QA de Customer Detail 1.2

> **Checkpoint histórico anterior a la publicación abierta.** Los resultados, pendientes y referencias a publicaciones privadas o paquetes describen únicamente la versión indicada; no son comprobaciones nuevas de la versión 1.3. El trabajo original distribuido de Aureform usa ahora [Apache 2.0](../LICENSE), incluida la muestra, el starter, el diseño y las imágenes originales. Las antiguas propuestas comerciales no son condiciones vigentes; los avisos de terceros siguen aplicando.

Cierre funcional: **13/13 casos de Customer Detail PASS**, sin retries, dentro de la suite integrada del owner (**74/74 PASS en 148,5 s**, sin flaky, skipped ni unexpected). Los **32 scans axe dieron cero violaciones**; `color-contrast` permanece `incomplete` por fondos con gradiente. La comprobación automática no certifica esos contrastes.

## Entorno y alcance

- Aplicación: `/tmp/aureform-ui-1.2`, producción estática en `http://127.0.0.1:3012`.
- Primera pasada: 19 de octubre de 2026, 13:14–13:18 UTC; build `8GX7PcluNhZgLGGUNGjfg`.
- Cierre integrado: 19 de octubre de 2026, 14:55–14:58 UTC; build `BTAW6zd9K-Lz9R_XmVIOo`.
- Chromium real `155.0.8059.79`; Playwright; axe-core `4.14.0`.
- Desktop: 1440 × 1000. Móvil: 360 × 900, touch, EN/ES y Dark/Light.
- Contexto de navegador y almacenamiento independientes por test. Un worker, sin retries.
- El QA modifica `tests/e2e/customer-detail.spec.ts` y este informe. El fix responsive autorizado modifica únicamente `src/components/blocks/record-detail.tsx`. Runner, reportes, capturas y trazas se guardan en `/tmp/aureform-detail-1.2-qa`.
- La ejecución final la realizó el owner: dos workers, cero retries, proyectos desktop, móvil y SaaS; configuración y salida en `/tmp/aureform-owner-qa-1.2/final-flows`. Este agente no ejecutó tests concurrentes ni modificó source/specs durante esa pasada.

El spec ejerce callbacks reales de la demo y comprueba el payload persistido con el schema de la foundation. La comprobación de aislamiento se limita a esta demo de navegador; no evalúa un backend.

## Resultado final de Customer Detail

| Caso                                                                                       | Resultado |
| ------------------------------------------------------------------------------------------ | --------- |
| Crear desde lista, abrir el ID real, reload y volver a abrir                               | PASS      |
| Validación, excepción real por email duplicado, borrador, foco, recuperación y cancelación | PASS      |
| Notas: borrador entre tabs, callback, persistencia y actividad por customer                | PASS      |
| Adjuntos: metadatos persistidos, sin binarios, URL ni descarga ficticia                    | PASS      |
| Selector de workspace por UI, not-found e inexistencia de fugas                            | PASS      |
| Viewer persistido al navegar/reload, sin controles de edit/notas/upload                    | PASS      |
| Fixture persistido válido con ID de customer de otro workspace                             | PASS      |
| `router.push` y `router.replace`: customer correcto y documento conservado                 | PASS      |
| History API pública con estado `null`: query reactiva, back/forward y documento conservado | PASS      |
| EN Dark móvil: cinco tabs, editor, validación, not-found y ocho scans axe                  | PASS      |
| EN Light móvil: los mismos ocho estados                                                    | PASS      |
| ES Dark móvil: los mismos ocho estados                                                     | PASS      |
| ES Light móvil: los mismos ocho estados                                                    | PASS      |

El reporte registra **13 aserciones de pageerror capturadas, con cero errores**, además de cero errores de consola recogidos por el spec. Las 20 interacciones de puntero en tabs terminaron sin error y las 20 mediciones del documento dieron **360 px**, contra viewport configurado de 360 px. Files/Archivos se seleccionó mediante `locator.click`, sin fallback de teclado ni click forzado.

La apertura desde la lista conservó el marcador del documento y no produjo requests de documento. Los cambios de ID con `router.push`/`replace` y con `history.pushState`/`replaceState(null, ...)` actualizaron el h1 en el mismo documento. Los payloads RSC observados devolvieron HTTP 200 y `text/plain; charset=utf-8`.

Se revisaron las cuatro capturas reales EN/ES × Dark/Light de la pasada final: sus anchos son 360 px y los paneles permanecen dentro del viewport. La fila de tabs conserva su scroll horizontal.

Evidencia final: [reporte integrado del owner](/tmp/aureform-owner-qa-1.2/final-flows/report.json), [resumen oficial por spec](/tmp/aureform-owner-qa-1.2/final-flows/summary.json), [resumen de los 13 casos y sus adjuntos](/tmp/aureform-detail-1.2-qa/owner-final-flows-20261019T145536Z/detail-final-summary.json) y [capturas móviles revisadas](/tmp/aureform-detail-1.2-qa/owner-final-flows-20261019T145536Z/owner-mobile-review-sheet.png).

## Historial conservado

| Ejecución                                     | Resultado y clasificación                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Primera pasada, build `8GX7PcluNhZgLGGUNGjfg` | 5 PASS, 7 no PASS: defectos, una aserción del harness y tres fallos de conexión durante rebuild            |
| Candidate de 14:13, build final               | 12 PASS, un fallo por reutilizar estado privado de Next en el test History; 32 scans axe, cero violaciones |
| Retake de 14:18                               | 13 `ERR_CONNECTION_REFUSED` antes de ejercer código de producto; clasificado como infraestructura          |
| Intento preparado de 14:19 e interrumpido     | Sin session ID recibido, runner log ni reporte; sólo copias y metadatos preparados                         |
| Suite integrada del owner, 14:55              | 74 PASS; Customer Detail 13/13 PASS, 32 scans axe, cero retries                                            |

Se conservan los reportes, logs, copias exactas del spec y hashes originales. [El índice de intentos](/tmp/aureform-detail-1.2-qa/attempt-history.json) enlaza cada ejecución. El intento interrumpido no se presenta como una ejecución aprobada.

La tabla siguiente describe exclusivamente el estado observado en la primera pasada; no representa pendientes actuales.

La ejecución inicial tuvo **5 casos PASS y 7 no PASS**. Estos últimos incluyen un error de aserción del spec y tres fallos de conexión durante el rebuild; no representan siete defectos de producto.

| Caso                                                                                 | Resultado inicial                                                                                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Crear desde lista, abrir detalle por ID y conservarlo tras reload/volver             | PASS                                                                                                |
| Validación y excepción real por email duplicado                                      | Error y borrador observados; corregida la aserción del input email, falta repetir recuperación/foco |
| Notas, borrador entre tabs, persistencia y actividad por customer                    | PASS; repetir la actividad localizada del rebuild                                                   |
| Archivos: nombre/tamaño/tipo/fecha, persistencia, sin URL/binarios/descarga ficticia | PASS                                                                                                |
| Cambiar workspace por UI y mostrar not-found para ID ajeno                           | Bloqueado por el selector, D2                                                                       |
| Viewer: rol persistido al navegar/reload, sin edit/notas/upload                      | PASS                                                                                                |
| `router.push` / `router.replace` reales                                              | ID correcto; la navegación recargó el documento, T1                                                 |
| `history.pushState` / `history.replaceState` sin evento artificial                   | FAIL, D1                                                                                            |
| Móvil EN Dark                                                                        | Desbordamiento y tap bloqueado, D3; tres scans axe completos con cero violaciones                   |
| Móvil EN Light / ES Dark / ES Light                                                  | Conexión rechazada durante el rebuild; pendientes                                                   |

El spec actual añade un caso separado para un workspace persistido válido con un ID de customer ajeno. Ese fixture prueba la lectura real del provider y el not-found; no sustituye ni establece un PASS del selector por UI.

## Defectos observados

### D1 — Query cambia, customer renderizado queda anterior

Reproducido en `/en/customers/detail/?id=cus-001`:

1. `history.pushState(history.state, "", "/en/customers/detail/?id=cus-002")`.
2. La URL indica `cus-002`, pero el h1 sigue siendo `Olivia Rhye`, en el mismo documento.
3. Tras emitir `popstate`, aparece `Phoenix Baker`.
4. `replaceState` hacia `cus-003` reproduce el mismo desfase.

El controller inicial sólo estaba suscrito a `popstate`; el owner lo cambió a `Suspense` + `useSearchParams`.

El candidate todavía pasaba `history.state`, incluyendo el marcador privado `__NA`. La implementación instalada de Next omite la sincronización cuando recibe ese marcador para evitar recursión interna. Se corrigió el harness para pasar `null`, como muestra la guía instalada `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`, y se eliminó el `popstate` artificial.

**Cierre PASS:** el test final actualiza ambos IDs y el h1 sin evento diagnóstico, conserva el documento y verifica back/forward. El fallo del candidate con estado privado no se atribuye a la API pública del producto.

Evidencia: `/tmp/aureform-detail-1.2-qa/baseline-native-history-id-refresh.json`, `inspect.json`, `detail-native-history.png` y trace del caso.

### D2 — Selector de workspace rompe la página

Abrir el botón `Aureform Studio` lanza `Base UI error #31` y la página muestra `This page couldn’t load`. El usuario no llega a seleccionar `Personal space`.

En la fuente inicial, `dashboard-shell.tsx` coloca `DropdownMenuLabel` directamente bajo `DropdownMenuContent`. El wrapper usa `Menu.GroupLabel`; la implementación instalada exige `Menu.Group` o `Menu.RadioGroup`. El owner añadió el Group.

**Cierre PASS:** el selector abre y cambia el workspace por UI; el detalle muestra not-found para el ID ajeno, no expone notas/archivos y restaura el registro al volver al workspace original.

Evidencia: screenshot y `error-context.md` de `/tmp/aureform-detail-1.2-qa/results/customer-detail-a-customer-d0179--cannot-leak-notes-or-files/`.

### D3 — Detalle móvil desborda y Files no recibe el tap

En viewport 360 × 900, la captura completa mide **633 × 2009**: la cabecera global conserva 360 px, mientras el banner, tabs y paneles se extienden a la derecha. El tap sobre Files no llega a su target; Playwright registra intercepción por el header, tabs o acciones del banner.

Medición causal posterior en Chromium: el section de detalle mide 328 px, pero su track grid medía 617,234 px. El `Tabs.Root`, hijo directo del grid, tenía `min-width: auto`, transmitiendo el ancho intrínseco de la fila de tabs al resto de cards. Cambiar únicamente ese nodo a `min-width: 0; max-width: 100%` redujo el track a 328 px y el ancho del documento de 633 a 360 px. El tap real sobre Files seleccionó la pestaña.

El fix de fuente aplica `className="min-w-0 max-w-full"` al `Tabs.Root` en `record-detail.tsx`. No fue necesario modificar `WorkspaceStatus` ni `customer-detail.tsx` para eliminar el desbordamiento medido.

**Cierre PASS en producción:** las cuatro combinaciones de idioma/tema miden 360 px de documento y seleccionan Files/Archivos mediante interacción de puntero real. Las capturas finales miden 360 × 2091 px en EN y 360 × 2115 px en ES.

El spec mide contra el viewport configurado, no sólo contra `innerWidth`, que se amplió a 633 px durante el defecto. Los taps tienen timeout acotado y son una condición estricta: no hay fallback por teclado ni click forzado.

Evidencia inicial: `/tmp/aureform-detail-1.2-qa/results/customer-detail-EN-ES-mobi-9a95e-t-found-pass-axe-and-reflow/detail-en-dark-mobile.png` y su trace. Las medidas normalizadas del ensayo DOM y el hash de fuente están en `/tmp/aureform-detail-1.2-qa/responsive-root-cause.json`; ese ensayo no representa una pasada del build final.

### T1 — El preview entrega RSC como octet-stream

Las respuestas `.../detail/index.txt?id=...&_rsc=...` y los segmentos `__next.*.txt` tuvieron HTTP 200 con `Content-Type: application/octet-stream`. Las llamadas reales a `router.push`/`replace` fueron seguidas de requests de documento y perdieron el marcador de identidad del documento.

Esto permite afirmar que se mostró el customer correcto, pero no que esa ruta hizo una transición SPA. La asociación con el MIME se ofrece como diagnóstico; el comportamiento y los headers sí se midieron.

Evidencia: `/tmp/aureform-detail-1.2-qa/baseline-next-router-transport.json`.

**Cierre PASS:** el preview final devuelve RSC como `text/plain; charset=utf-8`. La apertura lista → detalle y los cambios con `router.push`/`replace` conservan el marcador del documento, sin requests de documento. Los datos crudos finales están en `list-to-detail-transport.json` y `next-router-transport.json` del directorio de evidencia final.

## Accesibilidad

Se usan tags WCAG 2 A/AA, 2.1 A/AA y 2.2 AA, sin excluir reglas ni regiones. Se guardan tanto violaciones como resultados `incomplete`.

La primera pasada completó sólo Summary, Activity y Notes en EN Dark. El candidate y el cierre integrado completaron **32 scans cada uno**: cinco tabs, editor, validación y not-found, en EN/ES × Dark/Light.

En el cierre integrado hay **cero violaciones en los 32 scans y 32 resultados de regla `incomplete`**. Todos corresponden a `color-contrast`: **690 ocurrencias de nodos y 33 targets CSS únicos** entre estados. Son apariciones repetidas, no 690 elementos distintos. Axe informa que no puede determinar el fondo por un gradiente; su `contrastRatio: 0` es un resultado no calculado, no una medición de contraste cero.

La evidencia cubre estructura, etiquetas y las reglas que axe pudo evaluar. El contraste de esos targets requiere una comprobación aparte; no se declara conformidad AA a partir de cero violaciones. Los 32 adjuntos completos, incluidos sus targets y razones, están archivados bajo `/tmp/aureform-detail-1.2-qa/owner-final-flows-20261019T145536Z/axe/`.

Las capturas son renderizados reales del navegador y las cuatro composiciones móviles finales fueron revisadas.

## Integridad de source y evidencia

Los **149 hashes del manifiesto previo del owner coinciden** tras la suite; el build ID también coincide. Se conservan el reporte integrado exacto, su SHA-256, la configuración, los 13 resultados completos, el spec ejecutado, los 32 adjuntos axe y las 12 capturas adjuntas de Customer Detail.

SHA-256 del reporte integrado: `00c3f44a74a6723536984d884d090c570e69852b6154643d8808be05f4ddf03e`.

Los hashes completos están en [source-freeze-after.json](/tmp/aureform-detail-1.2-qa/owner-final-flows-20261019T145536Z/source-freeze-after.json). El [manifiesto posterior de source/export](/tmp/aureform-detail-1.2-qa/owner-final-flows-20261019T145536Z/source-export-after.json) contiene 141 archivos de source y 988 archivos exportados. Las diferencias de export frente al candidate afectan a previews actualizados; se mantienen los dos manifiestos.

Source y specs permanecieron congelados durante la ejecución integrada. Este cierre modifica únicamente este informe y evidencia en `/tmp`; no inició otro runner.

## Configuraciones de reproducción

La configuración normal del proyecto sólo selecciona `flows.spec.ts` y `mobile.spec.ts`. Este spec usa un config temporal con `testMatch: /customer-detail\.spec\.ts$/` y `baseURL` en 3012; no arranca ni reconstruye la aplicación.

Para una reproducción futura, con producción lista y sin otra suite concurrente, elegir un identificador nuevo para conservar los intentos:

```sh
AUREFORM_DETAIL_QA_RUN=recheck-YYYYMMDDTHHMMSSZ \
  node node_modules/@playwright/test/cli.js test \
  --config=/tmp/aureform-detail-1.2-qa/playwright.config.cjs
```

El runner escribe cada ejecución nombrada en su propio subdirectorio para conservar la primera pasada. La evidencia inicial permanece en `report.json`, `baseline-summary.json`, `source-snapshot.json`, `customer-detail.baseline.spec.ts` y `results/`.

El spec actual contiene **13 casos**. ESLint del spec corregido pasó. El fix responsive de source pasó Prettier, ESLint y TypeScript focalizado sin emisión, con cero diagnósticos. La aprobación funcional final procede del reporte integrado del owner, no de esos checks estáticos.
