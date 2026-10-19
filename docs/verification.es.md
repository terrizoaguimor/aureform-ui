# Aureform UI 1.1 — verificación

> **Checkpoint histórico anterior a la publicación abierta.** Los resultados, pendientes y referencias a publicaciones privadas o paquetes describen únicamente la versión indicada; no son comprobaciones nuevas de la versión 1.3. El trabajo original distribuido de Aureform usa ahora [Apache 2.0](../LICENSE), incluida la muestra, el starter, el diseño y las imágenes originales. Las antiguas propuestas comerciales no son condiciones vigentes; los avisos de terceros siguen aplicando.

Build 17106: compilación/tipos aprobados, 133 páginas y 83 entradas de registry. La matriz final pasa **780/780 combinaciones EN/ES**, con 780 auditorías axe sin hallazgos serious/critical, errores de página ni desbordamiento, y **130 previews de galería en inglés**. Apariencia completa **44/44 escenarios / 348 checks**, movimiento **14/14 / 74** y consumer oficial fresco **85/85 checks** pasan con el provider actual. CC final local pasa contra el state congelado: **92 templates / 1.646 evaluaciones / 556 ejemplos tipados**, cero diagnósticos y cero mappings pendientes. Pasan la auditoría estructural real de **65 raíces** y las revisiones PNG acotadas del owner. Coverage docs-only y documentación source/nativa quedan cerrados para empaquetar; siguen pendientes los nuevos ZIPs, sus consumers y la publicación privada.

**El QA actual de runtime pasa; el cierre de distribución sigue pendiente.** [English](verification.md) · [Resultados estructurados](verification-results.json).

La versión 1.1 contiene **65 vistas: 64 rutas de suite más landing**, seis paletas, Appearance Studio y seis efectos reutilizables. La matriz de navegador completada tiene **780 combinaciones**: 65 × EN/ES × claro/oscuro × 360/768/1440 px. Las pruebas de paletas, presets, importación/exportación, materiales y runtime de efectos tienen evidencia adicional registrada.

El informe final sustituye el checkpoint inicial de la matriz. Las copias canónica y del mirror son idénticas, y los 130 archivos de previews coinciden byte por byte. Son **65 rutas × claro/oscuro en inglés**, capturadas a 1440×900 y reducidas a WebP de 960 px de ancho. La matriz de runtime sí cubre EN y ES. Los 122 archivos de aplicación coinciden con el freeze del build 17106, incluidos el provider `d4c5cf…` y la UI de documentación sin modificar. Las ejecuciones actuales de apariencia, movimiento y consumer oficial cubren el fix del provider; no queda un defecto de runtime abierto registrado. Las pruebas anteriores de unit, copias, E2E y Chart/Button/tablas conservan su alcance de source. El [summary local actual](../.figma/code-connect/validation/validation-summary.json), [manifest](../.figma/code-connect-manifest.json) y [audit65 nativo aceptado](../.figma/native-audit.json) están ligados al state SHA256 `7520e555c299b0978de6837e2f504271117a8e563a7538683cd61fc043c1aa52`. [Alcance y reconocimiento de charts](charts.md).

Inventario nativo registrado por owner: **65 raíces, 714 variables (332 primitivas), ocho colecciones, 14 estilos de texto, 36 paint y seis efectos**. Estas cifras nativas se separan del total de colores source. [Página 2:5](../.figma/native-owner-default-fix-2-5-1.1.json) registra 86 asignaciones de fuente/18 de modo y [página 2:6](../.figma/native-owner-default-fix-2-6-1.1.json), 45/36, aplicadas sin errores ni cambios de state/IDs/propiedades/ejes. La [revisión visual acotada del owner](../.figma/proofs/defaults-1.1/owner-visual-review.json) pasó sin hallazgos tras esas 185 asignaciones, 198 correcciones de tokens y superficies transparentes, cuatro etiquetas de versión y dos clips de slots Table. El read de 21 raíces de Huygens a `2026-10-19T08:20:56.047Z` y el [read de 44 del owner](../.figma/native-owner-final-route-audit-2-6-1.1.json) a `2026-10-19T08:25:51.154Z` pasan las 65 raíces con cero flags, fuentes ausentes, fills de imagen UI o mutaciones. La política de layouts blancos incluye SLOT a altura mínima de 8 px; la revisión PNG acotada conserva su alcance independiente.

| Comprobación actual 1.1                                                | Estado / evidencia                                                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Cobertura de source y grafos del registry                              | PASS docs-only: 65 vistas source/nativas, 44 ejemplos core, 83 grafos registry y 92 templates CC locales; cero IDs ausentes  |
| Code Connect, tipos de apariencia y seis contratos de efectos          | PASS contra state congelado: 92 templates, 1.646 evaluaciones, 556 ejemplos tipados, cero diagnósticos/pending; runtime sintético |
| Tipos, lint y build de producción                                      | Build 17106 aprobado: 133 páginas y 83 entradas; lint sin warnings; log previo de unit con 79/79 aprobados                 |
| Navegador de producción y previews actuales                            | PASS: 780/780 combinaciones EN/ES, 780 auditorías axe sin hallazgos serious/critical y 130 previews claro/oscuro en inglés |
| Runtime de movimiento                                                  | PASS: 14/14 escenarios, 74/74 checks y cero errores                                                                        |
| Apariencia, presets, exportaciones y shaders/efectos                   | PASS: 44/44 escenarios completos, 348/348 checks, cero errores y source sin modificar                                      |
| Raíces nativas, fundamentos de paletas y masters de apariencia/efectos | PASS: auditoría real de solo lectura de 21 + 44 raíces ligada al state congelado; revisiones PNG acotadas PASS con sus límites |
| Consumer fresh del registry oficial                                    | PASS: 12 elementos, frozen install/tipos/lint/build de ocho páginas, 14 exports sin transformar y 85/85 checks             |
| ZIPs finales y consumers de archivos                                   | Pendientes de nativo/docs/previews finales, packaging del owner y verificación específica de los nuevos archivos           |

El [checkpoint original](consumer-verification-1.1.md) conserva el fallo de hidratación de MagneticButton mediante el registry oficial. El [consumer oficial actual](registry-compatibility.md) pasa **71 checks de UI de producción más 14 del provider instalado**, incluidos cambios de props, flags de scope, commits de layout de hijos, refs sincronizadas y storage nativo. Ocean Light y Ember Dark pasan sin botones anidados, errores de hidratación/página ni fallos de recursos compilados, y sin sustituciones del source instalado ni reparaciones locales. La evidencia completa está en `artifacts/consumer-registry-provider-refresh-1.1-report.json`; el resultado compacto está en el JSON. El navegador final está en `artifacts/browser/report.json`, completado a las `2026-10-19T03:34:22.638Z`. El [checklist final](release-checklist-1.1.md) registra el cierre source/nativo/docs y mantiene pendientes los nuevos ZIPs y la publicación privada.

| Checkpoint acotado                  | Resultado registrado                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Tablas                              | 10/10 casos distintos aprobados entre baseline y retests de etiquetas/material; source coincide con freeze                      |
| Chart/Button                        | Owner reporta 12 casos fresh, tres grupos y 22 checks deep; fix aria del texto copiado compilado y revisado                     |
| Unit/lint/build previos             | Antes del fix del provider: 79/79 unit tests, lint sin warnings y build con 133 páginas                                         |
| Copias reales finales               | 176 payloads dinámicos del portapapeles más 12 capturas responsive; los 188 compilados en modo estricto con cero diagnósticos   |
| Apariencia dirigida                 | Controles EN/ES aprobados; build actual y apariencia completa 44/348 sustituyen el checkpoint dirigido anterior                 |
| E2E desktop/mobile                  | Nueve casos desktop y el caso mobile corregido aprobados en su checkpoint; la matriz actual de rutas pasa por separado          |
| Runtime nativo de paletas/controles | Seis paletas, doce gradientes y quince primitivas nuevas registrados; postshots Light y auditoría estructural final de 65 raíces PASS |

La consolidación de tabla está en `/tmp/aureform-table-audit-45mi6l56/runtime3010/merged-proofs.json`. Conserva fallos anteriores y el último resultado aprobado por caso; no se presenta como una ejecución completa nueva. El resultado incompleto de contraste glass y los límites de fixtures estáticos de footer/loading/error/ref/callback siguen documentados en el JSON. El [ledger del owner](../.figma/native-runtime-resync-1.1.json) conserva el resync acotado; registros posteriores añadieron Studio/Themes/Effects y completaron los 65 IDs de raíz. La auditoría estructural final aceptada conserva su alcance independiente.

## Evidencia histórica 1.0

La ejecución completada de **1.0** registró **744 combinaciones del navegador, 10 pruebas funcionales E2E, 14 escenarios de movimiento / 74 comprobaciones, 44 ejemplos copiados completos y tres instalaciones independientes de Next.js**. La tabla siguiente y `previousRelease` del JSON conservan esa evidencia; no certifican el source ni los archivos modificados de 1.1.

| Comprobación                             | Resultado                                                                                                     | Evidencia                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| TypeScript, ESLint, pruebas Node y build | PASS; sin avisos de lint; 10 pruebas; 127 páginas estáticas                                                   | Comandos portables debajo                                                                      |
| Matriz de producción                     | 744/744; 62 vistas × EN/ES × claro/oscuro × 360/768/1440 px                                                   | `verification-results.json` → `previousRelease`                                                |
| Runtime, desbordamiento y accesibilidad  | 0 errores, 0 px de desbordamiento del documento, 0 hallazgos axe serious/critical                             | Etiquetas WCAG 2 A/AA y 2.1 A/AA                                                               |
| Comportamiento funcional                 | 10/10                                                                                                         | `artifacts/e2e-report.json`                                                                    |
| Movimiento y efectos                     | 14/14 escenarios, 74/74 comprobaciones                                                                        | `artifacts/motion-report.json`                                                                 |
| Ejemplos y botones de copia reales       | 44 archivos + 44 payloads idénticos; 0 diagnósticos; 12 combinaciones del diálogo                             | `artifacts/examples-validation/validation-summary.json`, `artifacts/copy-examples-report.json` |
| Code Connect local                       | 82 plantillas; 754 casos; 239 combinaciones de variantes; 367 ejemplos emitidos tipados; 0 diagnósticos       | `verification-results.json` → `previousRelease`                                                |
| Figma nativo                             | 62 raíces editables; 44 especímenes; 46 previews; 0 fills de imagen                                           | `.figma/native-audit.json`                                                                     |
| Proyecto inicial desde ZIP               | Extracción, instalación, tipos, lint y build aprobados                                                        | `artifacts/consumer-starter-zip-report.json`                                                   |
| Consumer de CLI local                    | MotionSystem, DateRangePicker y AIComposer; instalación, tipos, lint y build aprobados                        | `artifacts/consumer-cli-motion-report.json`                                                    |
| Consumer de shadcn oficial               | Host mínimo independiente; DataTable, RevenuePanel y MotionSystem; instalación, tipos, lint y build aprobados | `artifacts/consumer-registry-effects-report.json`                                              |

Los informes históricos se generaron en `artifacts/` y se excluyeron del ZIP. Las 127 páginas del build histórico incluyen rutas localizadas y páginas del framework; esa versión contenía 62 vistas únicas. El inventario actual está en [cobertura](coverage.json).

## Cobertura funcional

CRUD de clientes, eliminación confirmada, persistencia, ordenar/filtrar/paginar/seleccionar filas, exportación CSV, foco de diálogos, navegación de Command, detener y reintentar IA, identidad y OTP locales, calendario, bytes de archivos en IndexedDB, descargas, perfil, seis layouts, zoom al 200 %, navegación móvil española y temas persistentes.

La prueba de movimiento observa estilos reales de GSAP y desplazamiento real con rueda y anclas. Comprueba cambio de movimiento reducido en vivo, limpieza/restauración, teclado, mouse/touch, gradientes, hover y contenido inicial en ambos idiomas. Los dos escenarios sin JavaScript mantienen deshabilitados los scripts de la aplicación en la página original; axe mide una copia del DOM sin scripts después de comprobar igualdad de presentación. [Detalle de movimiento](motion-verification.md).

El servidor emite el idioma correcto antes de hidratar, incluido español en `/` y `/es/`. Los avatares tienen rol de imagen y nombre accesible explícitos.

## Reproducir

Desde la raíz del kit extraído, con Node.js 22.16+ y pnpm 10. Chromium es necesario para las comprobaciones de navegador. Si hace falta, define `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; la alternativa es `/usr/bin/chromium-browser` o el Chromium instalado por Playwright.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
python3 scripts/generate-code-connect.py
pnpm verify:examples
pnpm verify:code-connect
pnpm coverage
```

```sh
# Terminal 1
PORT=3010 pnpm start

# Terminal 2
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:motion
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:appearance
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:copy
AUREFORM_BASE_URL=http://127.0.0.1:3010 \
  node --experimental-strip-types scripts/verify-browser.mjs --full --capture
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm test:e2e
```

E2E inicia su propio servidor en 3001; la variable de entorno selecciona el destino. Mantener las otras suites en 3010 evita que dependan del ciclo de vida de ese servidor temporal.

Para repetir las instalaciones, sigue el [README raíz](../README.es.md) y ejecuta `pnpm install`, `pnpm exec tsc --noEmit`, `pnpm lint` y `pnpm build` en cada destino independiente. Estas comprobaciones validan instalación y compilación; el runtime tiene las pruebas anteriores.

## Alcance

Los adaptadores son locales y deterministas. Autenticación, autorización, modelos, correo y cobros reales necesitan servidor. Axe se limita a Chromium, esos anchos, etiquetas y severidades; el contraste de gradientes y otros resultados incompletos requieren revisión humana y no constituyen certificación.

Code Connect usa un stub local y los tipos reales del código. No se ejecutó su runtime en Figma ni se publicó en la nube. El diseño nativo es editable y revisado; las tablas densas consolidan registros. [Handoff de Figma](figma-handoff.es.md) · [Cobertura](coverage.json).

Para comprobar source canónico con las dependencias restauradas del owner, seguir [handoff-1.1.md](handoff-1.1.md). `AUREFORM_DEPENDENCIES` selecciona los tipos instalados; `node scripts/generate-coverage.mjs --docs-only` no escribe cobertura pública. Regenerar Code Connect después de cambios en source o ledger; los hashes obsoletos hacen fallar la validación.

Después de QA actual, el owner ejecuta `pnpm package:source` para crear source, starter y muestra MIT de ocho componentes con versión 1.1 y checksums SHA256. La extracción, instalación y build de los nuevos ZIP siguen pendientes. Los archivos excluyen dependencias instaladas, salida de build, Git, secretos e identidad del hosting.

Para verificar la entrega, consultar `public/downloads/verification-1.1.json` y `public/downloads/checksums.json`: versión correspondiente, SHA256 exacto del archivo y resultados reales de consumer y publicación. Los informes detallados van en `artifacts/`; estas ubicaciones de recibos se excluyen del source ZIP. Congelar todos los archivos canónicos incluidos antes de crear los ZIP y mantenerlos intactos durante el runner independiente. Un cambio documental incluido exige un repack controlado, hashes nuevos y prueba independiente de CRC/conservación de hashes del código.
