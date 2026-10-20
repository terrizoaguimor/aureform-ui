# Aureform 1.4.0: investigación consolidada de brechas

Fecha de corte: **19 de octubre de 2026**. Baseline: **`56803d54f48dc00b635d19197e0de792ac5f7ead`**, versión **1.4.0**. Documento de investigación para priorizar contratos, experiencias y documentación; no acredita implementaciones posteriores de `feat/cloudflare-docs-seo`.

## Alcance y lectura de la evidencia

Se integraron los cuatro informes conservados en `artifacts/research-gap-2026-10-19/`: `adoption-maintenance.md`, `commerce-media-maps.md`, `saas-ai-workflows.md` y `accessibility-i18n.md`, junto con `runtime-performance.json` y `static-script-audit.json`. Esta síntesis contiene la evidencia necesaria para leerla por separado. Las rutas y líneas enlazadas corresponden al baseline; cambios posteriores pueden mover los anclajes.

Las fuentes externas son primarias, verificadas en los informes de área o en la revisión complementaria del owner. Sus capacidades sirven para contrastar escenarios y contratos; **no demuestran demanda de mercado**. No hubo entrevistas, mediciones de adopción ni sesiones con cuentas reales. Esta consolidación no ejecutó nuevas pruebas de aplicación.

Los totales de las observaciones exploratorias se conservan como recibos resumidos recuperados de los registros de medición en [el recibo de cargas](research/1.4.0-runtime-performance.json) y [el inventario estático](research/1.4.0-static-script-audit.json). Los enlaces con números de línea quedan fijados al commit del baseline para que la evidencia siga siendo revisable después de actualizar el código.

**Hecho / confianza alta** significa código, recibo o documentación verificable. **Inferencia / confianza media** identifica una consecuencia plausible o una propuesta aún no validada con consumidores. **Desconocido** señala comportamiento de producción, preferencias de usuarios o integración que la evidencia disponible no permite afirmar.

**P1** prioriza integridad de datos, continuidad, interpretación correcta o el siguiente ciclo explícitamente solicitado; no significa incidencia crítica demostrada. **P2** cubre escenarios adicionales para consumidores que los necesiten. **P3** corresponde a expansión y mantenimiento condicionados a alcance confirmado. No se propone un P0.

La base ya incluye catálogo y editor real de imágenes, órdenes, facturas y planes mock, transporte Stripe tipado, mapas locales y Google opt-in, controles de acceso SaaS, importaciones cancelables y tablas controladas. También tiene EN/ES, apariencia, movimiento reducido, alternativas de interacción y documentación extensa. El [recibo de QA](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/docs/qa-runtime-1.4.0.json#L30) registra 244 pruebas unitarias, 92 E2E raíz y 18 montadas; su [delta posterior](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/docs/qa-runtime-1.4.0.json#L47) y [límites](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/docs/qa-runtime-1.4.0.json#L972) deben acompañar esas cifras.

En todo el informe, **frontend/mock** significa pantallas y contratos deterministas que un consumidor puede probar sin servicios reales. El **backend consumidor** conserva la autoridad sobre identidad, permisos, dinero, existencias, almacenamiento, ejecución duradera y secretos. Una simulación no certifica esas operaciones.

## Veinte hallazgos consolidados

### 01 · P1 · Medir y reducir el coste de entrada por ruta

**Hecho, alta.** [AppPage importa estáticamente las familias de plantillas](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/app-page.tsx#L9) y [envuelve todas las rutas en Providers](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/app-page.tsx#L160), incluidos acceso y landing. Dos observaciones exploratorias de Chromium con caché fría registraron:

| Ruta      | Solicitudes de script | Transferencia codificada / decodificada | LCP de laboratorio | `loadEventEnd` |
| --------- | --------------------: | --------------------------------------: | -----------------: | -------------: |
| Acceso    |                     8 |                   829.527 / 2.781.204 B |           1.032 ms |       6.156 ms |
| Productos |                     8 |                   829.527 / 2.781.204 B |           2.088 ms |       6.204 ms |

Viewport 390 × 844 táctil, CPU 4× respecto al host, latencia 150 ms, descarga 200.000 B/s y subida 93.750 B/s. Los JSON identifican el export `50c9179`; su `src` coincide con `56803d5`. El inventario estático cuenta diez etiquetas de script: no equivale a ocho solicitudes observadas ni su estimación gzip a transferencia real.

**Inferencia, media.** Conviene comparar partición por ruta y alcance de providers. La igualdad de bytes no atribuye el coste a cada import. [Web Vitals exige datos de campo y percentil 75](https://web.dev/articles/vitals); [las tareas largas pueden afectar interacciones](https://web.dev/articles/optimize-inp), pero estas dos cargas no demuestran fallo de INP.

**Frontend/mock y aceptación.** Comparación reproducible antes/después de acceso, landing, productos y mapas, preservando contexto y funcionalidad. Informar carga e interacciones por separado. **Desconocido:** CWV de campo, dispositivos reales y beneficio efectivo de cada partición.

### 02 · P1 · Convertir el QA registrado en puertas reproducibles

**Hecho, alta.** La [CI ejecuta instalación, tipos, lint, unidades, ejemplos, build y Pages](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/.github/workflows/ci.yml#L28), pero no E2E ni Axe. Los [cuatro proyectos Playwright](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/playwright.config.ts#L27) usan Chromium; el viewport móvil no configura tactilidad. Hay QA manual y automatizado amplio, no ausencia de QA.

**Inferencia, media.** Una matriz corta de recorridos críticos daría continuidad a esa evidencia. [Playwright distingue Chromium, Firefox y WebKit](https://playwright.dev/docs/browsers); WebKit no constituye una prueba en Safari físico. [WAI exige evaluación humana además de herramientas](https://www.w3.org/WAI/test-evaluate/). Los contrastes incompletos del recibo no son aprobaciones automáticas.

**Frontend/mock y aceptación.** Seleccionar acceso, cambio de workspace, compra simulada, crop, importación parcial y mapa degradado; registrar motor, tactilidad, basePath y commit. Añadir revisión humana de contraste, foco y lector de pantalla a los casos elegidos. Mantener los recibos históricos separados de nuevas ejecuciones.

**Desconocido:** regresiones actuales fuera de la matriz y comportamiento en Safari/dispositivos reales. El consumidor valida además sus adapters y su host; estas puertas no certifican proveedores externos.

### 03 · P1 · Explicar la integración mínima y el alcance de estilos

**Hecho, alta.** El kit ofrece [44 ejemplos](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/examples/README.md#L3) y una [entrada completa con adapters](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/examples/ApplicationAdapters.tsx#L12). Sin embargo, [el generador de registry](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/scripts/generate-registry.mjs#L175) no aporta recetas particulares mediante `docs`/`meta` en los 107 elementos auditados. El [CLI incluye CSS compartido](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/bin/aureform.mjs#L895), con [selectores globales](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/app/globals.css#L35). Ya existe [AppearanceScope sin aplicación al documento](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/appearance-provider.tsx#L126); algunos bloques siguen requiriendo contextos específicos.

**Inferencia, media.** Un consumidor que copia un bloque necesita conocer providers, datos, estilos y efectos sobre su host. El [schema oficial de registry permite documentación y metadatos](https://ui.shadcn.com/docs/registry/registry-item-json); incorporarlos sería una ayuda concreta, no garantía de integración automática.

**Documentación/frontend y aceptación.** Publicar recetas mínimas verificables para bloque autónomo, bloque con contexto y aplicación completa. Incluir límites de CSS, dependencias, adapters y alcance de apariencia. Probar en un host que tenga sus propios `header`, `aside`, formularios y estilos de impresión.

**Desconocido:** conflictos en hosts no evaluados. Distinguir aislamiento visual de aislamiento de datos; el consumidor configura su composición de providers.

### 04 · P1 · Dar continuidad verificable a las actualizaciones copiadas

**Hecho, alta.** Ya hay preview, diff, protección de cambios, receipts y rollback, descritos en [actualizaciones CLI](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/docs/cli-updates-1.2.md#L18). El [receipt registra hashes de fuente y destino](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/bin/aureform.mjs#L1110), pero no una base transformada para comparación de tres vías. La [comprobación de dependencias](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/bin/aureform.mjs#L1017) compara versiones mayores, límite que la documentación reconoce.

**Inferencia, media.** Tras personalizar código copiado, distinguir cambio local y cambio del kit requiere una base rastreable. El [CLI de shadcn documenta inspección y sobrescritura](https://ui.shadcn.com/docs/cli); [MUI distingue estabilidad y compatibilidad por versión](https://mui.com/material-ui/getting-started/versions/). Ninguna fuente garantiza compatibilidad de cualquier rango Aureform.

**Herramientas/documentación y aceptación.** Proponer manifiesto de procedencia con versión, transformación y base; preview de conflictos antes de escribir, decisiones por archivo y rollback verificable. Ensayar archivo intacto, editado, renombrado, eliminado y dependencia compatible/incompatible mediante criterios de rango explícitos.

**Desconocido:** incidencia real de conflictos y coste de mantener esas bases. La propuesta no presupone un merger automático fiable ni reemplaza los controles ya entregados; su adopción se valida con consumidores que actualizan copias.

### 05 · P3 · Mantener explícita la frontera Figma nativo / source-only

**Hecho, alta.** [Design README declara las ampliaciones 1.4 source-only](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/design/README.md#L29). El [manifest](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/.figma/code-connect-manifest.json#L35) registra 44 exports de bloques, nueve mapeados y 92 plantillas locales. El [recibo Code Connect](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/docs/qa-runtime-1.4.0.json#L909) valida snapshots y sintaxis mediante stub local; no publica ni verifica nodos nuevos de Figma 1.4.

**Inferencia, media.** La distinción ya es honesta; el riesgo aparece si capturas, SVG o validación local se presentan después como componentes nativos equivalentes. [Figma documenta verificaciones de Code Connect en CI](https://developers.figma.com/docs/code-connect/ci-cd/) y [tokens de diseño](https://www.figma.com/resource-library/design-tokens/); no convierte screenshots en auto-layout, variables o conexiones publicadas.

**Documentación y aceptación.** Mantener una matriz por versión: fuente, captura, componente nativo, nodo y conexión publicada. Solo ampliar cobertura nativa cuando se acuerde ese entregable; aceptar con IDs reales, propiedades/variantes, bindings y recibo de publicación. Separar checks locales de evidencia nativa.

**Desconocido:** necesidad de nuevos masters entre consumidores. El alcance source-only 1.4 no constituye por sí solo un defecto ni bloquea usar el frontend.

### 06 · P1 · Un laboratorio de escenarios sobre contratos compartidos

**Hecho, alta.** La [galería muestra preview y código](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/components.tsx#L808), y los ejemplos cubren adapters. El [transporte Stripe distingue varios errores HTTP](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/stripe-commerce-adapter.ts#L65), pero no establece un vocabulario compartido de errores de campo, reintento y resultado tardío para todas las aplicaciones.

**Inferencia, media.** Un catálogo de escenarios reduciría ambigüedad al conectar proveedores. [React-admin diferencia mutaciones pesimistas, optimistas y deshacibles](https://marmelab.com/react-admin/EditBase.html); [Refine separa providers, errores de campo y sincronización con URL](https://refine.dev/core/docs/core/refine-component/). Son patrones de contrato, no razones para incorporar esos frameworks.

**Frontend/mock y aceptación.** Fixtures seleccionables para sesión vencida, permiso revocado, conflicto 409, límite 429 con `retryAt`, desconexión, fallo parcial y respuesta posterior al cambio de workspace. Tipar `code`, campos afectados, recuperabilidad y versión; conservar borradores cuando corresponda. Mostrar estado y siguiente acción junto al contenido.

Cada escenario debe terminar en un resultado observable, sin depender solo de toast. **Backend consumidor:** verifica autorización, idempotencia y política real de reintento. **Desconocido:** equivalencia entre errores de cada proveedor; el contrato necesita mappings explícitos.

### 07 · P1 · Sesión vencida e invitación desde la perspectiva del destinatario

**Hecho, alta.** Hay cuatro [pantallas de autenticación](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/auth.tsx#L41), login social con [cancelación y errores](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/social-auth.tsx#L94), y [invitaciones con expiración y permisos](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/workspace-provider.tsx#L420). El [perfil demo](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/demo-auth.ts#L8) no modela expiración; el OTP fijo es demostrativo. La gestión de invitaciones se centra en administración.

**Inferencia, media.** Falta representar pérdida de sesión durante una edición y aceptación/rechazo con cuenta elegible. [OWASP recomienda controlar expiración de sesión](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html); [WorkOS describe el recorrido del destinatario](https://workos.com/docs/authkit/invitations).

**Frontend/mock y aceptación.** Modelar `expired`, reautenticación, retorno permitido y borrador recuperable; invitación pendiente, vencida, revocada y cuenta incorrecta. Comprobar que la operación no continúa tras revocación y que reautenticar no la duplica.

SSO, MFA, passkeys y linking son ampliaciones P2/P3 condicionadas: [Clerk documenta estrategias distintas](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options) y [Auth0 exige verificar identidades antes de vincular](https://auth0.com/docs/manage-users/user-accounts/user-account-linking/link-user-accounts). **Backend consumidor:** identidad y seguridad efectivas. **Desconocido:** demanda empresarial; el OTP demo no prueba MFA real.

### 08 · P1 · Scope de aplicaciones y conflictos entre pestañas

**Hecho, alta.** [WorkspaceProvider comprueba capacidad y miembro activo](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/workspace-provider.tsx#L175); [CommerceProvider descarta resultados fuera de scope](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/commerce-provider.tsx#L220). En cambio, [useDemoStore](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/hooks/use-demo-store.ts#L7) usa únicamente la clave recibida, y [IA](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/ai-workspace.tsx#L85), [comunicación](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/communication.tsx#L66) y [boards](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/work-board.tsx#L109) tienen namespaces no ligados al workspace. El [listener SaaS reemplaza el estado completo](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/workspace-provider.tsx#L122), sin revisión de conflicto.

**Inferencia, media.** Dos pestañas o cambio de workspace pueden producir una experiencia ambigua. [Linear documenta actualización pendiente y reconexión](https://linear.app/docs/get-the-app); no demuestra un fallo equivalente en Aureform.

**Frontend/mock y aceptación.** Declarar scope por aplicación: global deliberado, usuario o workspace. Versionar snapshots, representar `stale`/`conflict`, y ofrecer recarga o resolución conservando el borrador. Probar edición concurrente, cambio de scope y respuesta tardía. Mantener selección y vista previa locales donde corresponda.

**Backend consumidor:** aislamiento de tenant, concurrencia y autorización. **Desconocido:** pérdida de datos reproducible en producción; no se observó una fuga entre tenants reales. El aislamiento existente de SaaS/comercio debe preservarse.

### 09 · P2 · Extender DataTable solo donde el contrato lo necesita

**Hecho, alta.** [DataTable ya admite modo externo](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/ui/data-table.tsx#L132), query controlada, filtros, orden y paginación manual, además de [selección estable por IDs fuera de la página](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/ui/data-table.tsx#L160). El modo externo requiere `rowCount` numérico; no modela selección de todos los resultados por query, cursor o cantidad desconocida.

**Inferencia, media.** Esas extensiones sirven a catálogos grandes; no justifican sustituir la tabla. [MUI Data Source centraliza acceso y cache](https://mui.com/x/react-data-grid/server-side-data/), mientras callbacks manuales dejan deduplicación y cache al integrador. [Refine ofrece sincronización opcional de query con URL](https://refine.dev/core/docs/core/refine-component/).

**Frontend/mock y aceptación.** Adapter opcional con cursor, `rowCount: known | unknown`, firma de query y selección `ids | allMatching` con exclusiones. Resultado bulk por ID: éxito, conflicto, denegado o fallo. Fixtures de página tardía, filtro cambiado, fila eliminada y éxito parcial; invalidar cache por scope y query.

**Backend consumidor:** decide qué filas coinciden y autoriza cada operación. **Desconocido:** volumen que exige estas extensiones. Conservar la selección por IDs ya entregada y explicitar su semántica.

### 10 · P2 · Importaciones como jobs y continuidad de actividad

**Hecho, alta.** El importador ya tiene cancelación, progreso, resultados parciales, fallos por fila y [contratos de commit/rollback](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/csv-import.ts#L694), hasta [10.000 filas](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/csv-import.ts#L21). [Desmontar aborta la operación](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/import-wizard.tsx#L444); el [preview síncrono](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/import-wizard.tsx#L488) y [parse tras lectura](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/import-wizard.tsx#L552) permanecen en el hilo de interfaz.

**Inferencia, media.** Conviene una actividad consultable fuera del modal y explorar procesamiento por lotes/worker. [Optimizar INP requiere medir interacciones y tareas relevantes](https://web.dev/articles/optimize-inp); el código síncrono no demuestra por sí solo un fallo de INP.

**Frontend/mock y aceptación.** `ImportJobSnapshot` con scope, estado, progreso, fallos indexados y capacidades `cancel/retry/resume`. Centro de actividad que conserve resultados al navegar. Un mock sin reanudación debe declarar esa capacidad ausente y registrar interrupción/cancelación; no simular un job ejecutándose tras un abort real.

Probar desmontaje, cambio de workspace, cancelación durante commit y reintento solo de filas fallidas. **Backend consumidor:** continuidad duradera y rollback efectivo. **Desconocido:** latencia máxima de parse y disponibilidad real de resume.

### 11 · P1 · Analytics: ausencia, cero, frescura y drilldown

**Hecho, alta.** [ChartDatum exige `value: number`](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/ui/chart.tsx#L28); las series opcionales no equivalen a calidad o timestamp. El [heatmap convierte ausencias en cero](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/ui/chart.tsx#L654), y la [tabla presenta valores sin el formatter visual](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/ui/chart.tsx#L818). Dashboard recibe [solo `kind`](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/dashboard.tsx#L452) y escala datos seed mediante factores de periodo.

**Inferencia, media.** Con datos externos, cero medido, dato ausente y dato desactualizado necesitan lecturas distintas. [WAI pide conservar la información esencial de gráficos complejos](https://www.w3.org/WAI/tutorials/images/complex/); eso incluye una tabla coherente con unidades y series.

**Frontend/mock y aceptación.** `MetricAnalyticsAdapter` con dominio temporal, granularidad, zona, unidad, `null`, calidad, `observedAt`, fuente y destino de drilldown. Mostrar ausencia sin colorearla como cero; comunicar frescura y cobertura. Tabla y tooltip deben coincidir en formato, unidades y visibilidad.

Fixtures: serie incompleta, periodo vacío, respuesta tardía, agregado parcial y revisión del dato. **Backend consumidor:** agregación y exactitud de métricas. **Desconocido:** necesidades de analytics de cada producto; no se propone un motor analítico real.

### 12 · P1 · Preferencias regionales que gobiernen la presentación

**Hecho, alta.** EN/ES ya está implementado. Settings [persiste zona y formato con preview](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/settings.tsx#L269), pero [IntlProvider fija Bogotá](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/providers.tsx#L36) y [useLanguage](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/hooks/use-language.ts#L12) mantiene convenciones propias. Su helper monetario usa cero decimales; comercio tiene su formato de centavos, por lo que no cabe afirmar que todos los importes se redondean incorrectamente.

**Inferencia, media.** Un contrato de preferencias reduciría divergencias. [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) separa moneda y precisión; [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) permite zona explícita.

**Frontend/mock y aceptación.** PreferencesProvider con locale, zona, calendario/formato y política monetaria. Cambiar zona debe actualizar instantes, sin desplazar fechas civiles deliberadas. Probar centavos, medianoche, horario de verano, facturas y exportaciones.

RTL es P3 si se amplían idiomas: [W3C distingue `lang` de `dir`](https://www.w3.org/International/questions/qa-html-dir). No constituye una carencia de EN/ES. **Desconocido:** alcance regional requerido; el consumidor define moneda de negocio y semántica de fechas.

### 13 · P1 · Pan táctil y navegación de visualizaciones densas

**Hecho, alta.** Hay alternativas de movimiento en boards y mejoras de tamaño táctil en Button. El [mapa local admite flechas de teclado](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/maps-workspace.tsx#L1283), pero los [botones visibles cubren zoom/reset](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/maps-workspace.tsx#L1439), no pan direccional. El heatmap [hace enfocables sus celdas](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/ui/chart.tsx#L677); un SVG de 19 unidades no determina por sí solo su tamaño en píxeles CSS.

**Inferencia, media.** En conjuntos densos, muchos tab stops dificultan explorar; falta comprobar alternativas de puntero para mover el mapa. [WCAG distingue alternativa al arrastre de teclado](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) y [define tamaño mínimo con excepciones](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). No se afirma incumplimiento solo por leer dimensiones SVG.

**Frontend y aceptación.** Añadir pan mediante controles de pulsación; explorar foco único con navegación interna o tabla equivalente en gráficos densos. Medir targets renderizados, solapamiento y zoom. Probar touch real/emulado, teclado y lector con datos pequeños y cientos de celdas.

**Desconocido:** dificultad percibida y cumplimiento completo. Mantener las alternativas y semántica existentes; no convertir esta revisión en una declaración global de inaccesibilidad.

### 14 · P1 · Cotización completa; variantes como extensión P2

**Hecho, alta.** ProductsManager tiene [cuatro pestañas](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/product-manager.tsx#L637), validación, dirty-close y [reset por workspace](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/product-manager.tsx#L2108). El [producto es plano, con un SKU](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/commerce.ts#L14), y las líneas no capturan variante. El [total mock suma líneas](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/commerce.ts#L344); [parseSnapshot exige esa igualdad](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/commerce-state.ts#L43). Una orden legítima con impuestos, descuento o envío necesita otro contrato.

**Inferencia, media.** [Shopify calcula cotizaciones con impuestos, descuentos y envío](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/draftOrderCalculate) y [modela variantes con opciones, precio e inventario](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/ProductVariant). No todos los consumidores necesitan variantes.

**Frontend/mock y aceptación.** `OrderQuote` desglosado, redondeo explícito, moneda única, vencimiento y snapshot de precio/SKU. Fixtures de descuento limitado, impuesto incluido/excluido, envío y cotización vencida. Para P2, opciones y variantes con identidad estable e inventario propio.

**Backend consumidor:** calcula y valida totales/precios; el adapter ya [invalida correctamente el Stripe Price anterior](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/commerce-state.ts#L83). **Desconocido:** reglas fiscales reales; las fixtures no son asesoría ni motor tributario.

### 15 · P1 · Pago diferido e inventario comprometido

**Hecho, alta.** Checkout devuelve [redirect validado](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/stripe-commerce-adapter.ts#L238) sin marcar pago confirmado. El mock [revalida stock y evita descontarlo dos veces](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/commerce-state.ts#L104). Crear orden no reserva existencias; `paymentStatus` distingue [unpaid, paid, failed y refunded](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/commerce.ts#L45), sin estado diferido explícito.

**Inferencia, media.** [Stripe exige fulfillment basado en confirmación y contempla pagos asíncronos](https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted). [Shopify separa on-hand, available, committed y unavailable](https://help.shopify.com/en/manual/inventory-and-locations/fundamentals/inventory-states). Esas distinciones evitan presentar stock físico como vendible.

**Frontend/mock y aceptación.** Estado `processing` de pago independiente del procesamiento de orden; stock disponible/comprometido, reserva con vencimiento y espera de confirmación. Simular checkout abandonado, éxito tardío, rechazo tardío y dos órdenes sobre la última unidad. Repetir eventos no debe cambiar cantidades dos veces.

**Backend consumidor:** confirmación auténtica, reservas atómicas y fulfillment idempotente. **Desconocido:** comportamiento con métodos reales y concurrencia productiva. Conservar el redirect sin confirmación prematura y las defensas mock existentes.

### 16 · P1 · Reembolso parcial y devolución como operaciones distintas

**Hecho, alta.** La UI reconoce [estado refunded en el timeline](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/commerce-order-editor.tsx#L705); el [adapter no ofrece operación de refund](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/commerce.ts#L107). Cancelar cambia estado, sin devolver dinero ni reponer stock. La [factura modela un importe y estado](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/commerce.ts#L51), sin balance o ledger de ajustes.

**Inferencia, media.** [Stripe admite reembolsos parciales múltiples y estados pendientes/fallidos](https://docs.stripe.com/refunds), limitados por el importe cobrado. Devolución física, restitución de inventario y reembolso financiero requieren decisiones separadas.

**Frontend/mock y aceptación.** Pantalla de retorno por líneas/cantidades, motivo y destino del stock; ledger de reembolsos con importe, moneda y estado. Mostrar restante reembolsable y efecto en factura/recibo. Fixtures: devolución parcial sin refund, refund sin devolución, dos parciales, pendiente, fallo y exceso de importe.

**Backend consumidor:** autoriza y ejecuta dinero, conciliación y ajustes contables; la UI no debe considerar una cancelación como refund exitoso. **Desconocido:** políticas de devolución y requisitos documentales del consumidor. No se solicita un backend financiero dentro del kit.

### 17 · P2 · Planes: fecha efectiva, prorrata y factura pendiente

**Hecho, alta.** Los planes mock tienen importe, intervalo y periodo. [Cambiar plan crea factura completa y reinicia el periodo mensual](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/commerce-state.ts#L196), con `setUTCMonth`; no hay preview de prorrata ni cambio programado. El posible desbordamiento al sumar meses a fin de mes es una inferencia del cálculo, no un fallo ejecutado en esta revisión.

**Inferencia, media.** [Stripe documenta previews, créditos y efectos de facturas impagadas sobre prorrata](https://docs.stripe.com/billing/subscriptions/prorations). Un crédito negativo no implica refund automático y la política de cobro requiere explicitarse.

**Frontend/mock y aceptación.** `PlanChangeQuote` con fecha de cálculo, efecto inmediato/al fin del periodo, débitos, créditos y siguiente factura. Mostrar el total antes de confirmar y exigir recotización al vencer. Fixtures de upgrade, downgrade, factura impagada, cancelación al cierre, enero 31 y año bisiesto.

**Backend consumidor:** calcula prorrata, configura precios y agenda cambios reales. **Desconocido:** políticas comerciales objetivo. Mantener el flujo mensual actual como demo simple, claramente etiquetado; no presentarlo como equivalente a facturación Stripe completa.

### 18 · P2 · Media: recuperación por archivo y límites de transporte

**Hecho, alta.** Hay crop real, zoom, rotación, alt, orden, primaria y reemplazo. Los [helpers limitan MIME, firma, tamaño, decode y salida](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/product-images.ts#L3): PNG/JPEG/WebP, 8 MiB de entrada, 900 px de normalización y data URI ≤1.000.000 caracteres. Revocan blob URLs y evitan canvas remoto arbitrario. Las [subidas múltiples se aplican al concluir el lote](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/product-image-editor.tsx#L615); un fallo no ofrece recuperación individual.

**Inferencia, media.** [Uppy Dashboard muestra progreso y recuperación por archivo](https://uppy.io/docs/dashboard/). Ese patrón es útil, pero no convierte un procesamiento local en upload de red reanudable.

**Frontend/mock y aceptación.** Cola con validando/procesando/listo/fallido/cancelado; conservar éxitos y reintentar el archivo fallido respetando seis imágenes. Diferenciar imagen remota mostrable de imagen recortable; ofrecer reemplazo o importación autorizada mediante adapter.

Probar lote mixto, corrupción, exceso de dimensiones, cancelación y cambio de workspace. **Backend consumidor:** almacenamiento, URLs firmadas, permisos y transporte resume si existe. **Desconocido:** necesidad de archivos grandes; los límites actuales son defensas entregadas, no un editor pendiente.

### 19 · P2 · Mapas: degradación y coste observable

**Hecho, alta.** Mapas arranca local y Google requiere opt-in; ya [advierte sobre cuota/facturación](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/maps-workspace.tsx#L963). La [vista lista oculta el mapa](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/maps-workspace.tsx#L813), pero la [condición de montaje Google](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/maps-workspace.tsx#L834) no depende de esa vista. El [efecto crea una instancia nueva](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/blocks/google-map.tsx#L266) al cambiar varias opciones; compartir loader no equivale a reutilizar mapa. Las [rutas actuales son geometría local](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/lib/google-maps.ts#L27), no llamadas a Directions.

**Inferencia, media.** [Google explica quotas y control de coste](https://developers.google.com/maps/billing-and-pricing/manage-costs): alertas de presupuesto no son topes. Montaje bajo demanda y reutilización merecen medir su efecto; no hay importe real observado.

**Frontend/mock y aceptación.** Estados separados de autorización, SDK, red y límite de consumo; fallback local/lista usable. Adapter de diagnóstico con cuota conocida o desconocida y última actualización. Ensayar opt-in desde lista, cambio de tema/locale y reintento acotado.

**Backend/operador consumidor:** restricciones, facturación y cuotas reales. **Desconocido:** consumo y restricciones de una cuenta real; los dobles de SDK no validan billing ni tiles productivos.

### 20 · P1 · IA: capturar petición, resultado parcial y continuidad

**Hecho, alta.** AI Workspace ya ofrece stream, stop y retry sobre estado local. El [namespace por modo](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/ai-workspace.tsx#L85) no expresa scope SaaS. [Retry vuelve a generar](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/ai-workspace.tsx#L213) con controles actuales; [streaming precede al primer fragmento](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/ai-workspace.tsx#L147), [el adjunto se corta a 1.000 caracteres](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/ai-workspace.tsx#L152) y [ChatMessage](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/ai-workspace.tsx#L60) no representa fuentes ni resultados de herramientas.

**Inferencia, media.** [AI SDK distingue envío, streaming y regeneración, e incluye fuentes estructuradas](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot); [su flujo de herramientas contempla aprobación y resultado](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage). Son referencias de estados, no una exigencia de RAG o agentes reales.

**Frontend/mock y aceptación.** Snapshot inmutable de petición: modelo, instrucciones, contexto, parámetros y scope. Separar esperando, generando, parcial, cancelado y fallido; retry exacto o petición nueva explícita. Mostrar contexto incluido/omitido, fuentes tipadas y resultado de herramienta cuando la fixture los tenga; aprobación antes de acciones simuladas.

Probar fallo antes del primer chunk, stop parcial, retry tras cambiar controles y navegación. **Backend consumidor:** modelo, autorización y ejecución de herramientas. **Desconocido:** calidad o veracidad del output real; un mock no prueba groundedness.

## Entrega posterior: Cloudflare, SEO, landing y docs

El ciclo **1.4.1** incorpora despliegue en Cloudflare, metadata por idioma, una nueva landing y documentación completa de 22 capítulos. Esta investigación mantiene el baseline **1.4.0 / `56803d5`**: ya existían [landing](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/landing.tsx#L58), [DocsTemplate](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/templates/docs.tsx#L155) y [metadata/robots](https://github.com/terrizoaguimor/aureform-ui/blob/56803d54f48dc00b635d19197e0de792ac5f7ead/src/components/document-layout.tsx#L29); se amplían esas capacidades.

La implementación y su verificación posterior se documentan por separado en la [guía de Cloudflare](cloudflare-deployment.es.md), el [recibo de QA 1.4.1](qa-runtime-1.4.1.json), el [recibo de carga inicial](research/1.4.1-website-loading.json) y la [lista de entrega 1.4.1](release-checklist-1.4.1.md). Esos registros separan export estático, pruebas locales y verificación de producción. Los veinte hallazgos anteriores y el QA histórico conservan su alcance original.

La aceptación distingue experiencia pública adaptable, canonical/social previews coherentes por ruta e idioma, documentación con instalación y contratos, y recibo reproducible del despliegue. Las recetas y el scope de providers ayudan a explicar lo que ofrece el frontend. Esta entrega no demuestra demanda, conversión ni SEO de campo, ni agrega identidad, pagos o persistencia de backend. La versión nativa de Figma conserva su checkpoint publicado.

## Secuencia de decisión y cierre

Primero, cerrar los entregables explícitos y sus recibos; después, ensayar los P1 en el laboratorio de escenarios. Agrupar continuidad y scope; cotización/pago/refund; y calidad de analytics/presentación, para validar contratos completos. Incorporar P2 cuando un consumidor confirme el escenario. Reservar P3 para alcance nativo o regional acordado.

Cada incremento debería adjuntar baseline, contrato, fixture, aceptación y evidencia nueva, manteniendo los informes originales. Una capacidad pasa de propuesta a implementada únicamente con diff y verificación posterior identificables. Los desconocidos permanecen abiertos hasta obtener esa evidencia: no se resuelven añadiendo pantallas que aparenten ejecutar un backend.
