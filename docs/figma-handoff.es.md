# Aureform UI 1.1 — handoff de Figma y source

> **Checkpoint histórico anterior a la publicación abierta.** Los resultados, pendientes y referencias a publicaciones privadas o paquetes describen únicamente la versión indicada; no son comprobaciones nuevas de la versión 1.3. El trabajo original distribuido de Aureform usa ahora [Apache 2.0](../LICENSE), incluida la muestra, el starter, el diseño y las imágenes originales. Las antiguas propuestas comerciales no son condiciones vigentes; los avisos de terceros siguen aplicando.

Archivo: [Aureform UI](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N).

El source 1.1 contiene **65 vistas: 64 rutas de suite más landing**, conserva **44 familias core** e incluye seis paletas, Appearance Studio y seis efectos. El owner registró los sets Button/Badge Appearance, Card Material, Shapes9, Table16/DataTable28, Chart13 y los seis efectos. Pasan el runtime actual, la auditoría estructural real de las 65 raíces y las revisiones PNG del owner con sus alcances registrados. Code Connect sigue siendo local, parserless y sin publicar; una prueba sintética no acredita ejecución en Dev Mode.

La auditoría histórica **1.0** registró 62 raíces, 44 especímenes y 46 previews editables. Sus conteos no se presentan como auditoría de 1.1. Los archivos del owner y la cobertura generada son la referencia para los totales actuales.

La aplicación/registry están congelados en build 17106. El consumer oficial fresh de shadcn pasa instalación/tipos/lint/build y **85 checks: 71 de UI más 14 del provider actual**, con 14 exports reales, sin botones anidados ni errores de hidratación. La matriz final pasa **780/780 EN/ES**, apariencia **44/348** y movimiento **14/74**. Los **130 previews de galería son en inglés**, 65 rutas × claro/oscuro. El owner también reporta Chart/Button fresh/deep aprobados y diez tests distintos de tabla con pruebas consolidadas. El resync nativo y sus PNGs están registrados. CC final pasa con **92 templates, 1.646 evaluaciones, 556 ejemplos tipados y cero diagnósticos/mappings pendientes**, ligado al state SHA256 `7520e555c299b0978de6837e2f504271117a8e563a7538683cd61fc043c1aa52`. La auditoría real de 21 + 44 raíces pasa con cero flags, fuentes ausentes, fills de imagen UI o mutaciones; incluye SLOT/minHeight8. Ver [handoff 1.1](handoff-1.1.md), [checklist final](release-checklist-1.1.md) y [charts y reconocimiento](charts.md).

## Mapas y evidencia

| Archivo                                                                                     | Uso                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`.figma/state.json`](../.figma/state.json)                                                 | IDs reales de páginas, variables, estilos, componentes y `entities.routeScreens`; la clave vacía corresponde a landing  |
| [`.figma/native-audit.json`](../.figma/native-audit.json)                                   | Auditoría estructural/visual y estado de revisión del owner                                                             |
| [`.figma/component-properties.json`](../.figma/component-properties.json)                   | Keys exactas de texto, booleanos, swaps, slots y ejes de variantes; conservar sufijos `#…`                              |
| [`.figma/code-connect-manifest.json`](../.figma/code-connect-manifest.json)                 | Mappings actuales, contratos de source, hashes y validación local                                                       |
| [`.figma/code-connect/README.md`](../.figma/code-connect/README.md)                         | Contrato parserless actual y configuración de generación                                                                |
| [`.figma/code-connect/native-additions.json`](../.figma/code-connect/native-additions.json) | Nuevos registros con IDs y propiedades reales del owner                                                                 |
| [`.figma/native-effects-library-1.1.json`](../.figma/native-effects-library-1.1.json)       | Sets, variantes y keys reales de los seis efectos; los uniforms de shader son independientes de las props de componente |
| [`docs/coverage.json`](coverage.json)                                                       | Dispatcher, 65 vistas source/nativas, 83 grafos del registry y mappings completos sin pendientes                           |
| [`src/lib/catalog.ts`](../src/lib/catalog.ts)                                               | 64 rutas de suite y 44 familias core                                                                                    |
| [`src/lib/appearance.ts`](../src/lib/appearance.ts)                                         | Configuración pura de seis paletas, materiales y exportaciones                                                          |
| [`tokens/aureform.tokens.json`](../tokens/aureform.tokens.json)                             | Primitivas, colores semánticos, dimensiones, paletas y efectos generados                                                |
| [`examples/README.md`](../examples/README.md)                                               | 44 ejemplos completos y sus recursos                                                                                    |

Source, auditoría nativa y validación de Code Connect son evidencias diferentes. Tener un ID nativo no demuestra auditoría visual; tener una vista de source no inventa ese ID.

## Inventario y modos

| Área                      | Contrato                                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vistas de source          | 65, incluidas Studio, Themes y Effects                                                                                                                                  |
| Core                      | 44 familias y ejemplos React completos                                                                                                                                  |
| Bloques                   | Diez exports desde nueve archivos; TableToolbar es un helper de source sin master nativo independiente                                                     |
| Shells                    | sidebar, compact, topbar, split, centered y floating                                                                                                                    |
| Charts                    | Trece tipos de source y trece Kind nativos, conservando los seis originales; Donut nativo → `pie`; ver [charts](charts.md)                                    |
| Paletas                   | Aurora, Violet, Ocean, Mint, Ember y Rose, con claro/oscuro                                                                                                             |
| Apariencia                | Button/Badge: solid/soft/outline/glass/gradient; Card: flat/elevated/glass/gradient; nueve masters Button rounded/pill/square × Small/Medium/Large registrados |
| Efectos                   | GradientBackground, ShaderBackground, SpotlightCard, GlowBorder, TiltCard y MagneticButton                                                                              |
| Variables/estilos nativos | 714 variables, 332 primitivas, ocho colecciones, 14 estilos de texto, 36 paint y seis efectos; conteos nativos separados del token generator                  |
| Source de tokens          | 21 colores semánticos y 15 tokens base de efectos; primitivas, shades y defaults derivados del contrato puro                                                            |

Las colecciones nativas del owner representan paletas y shades. Elegir el modo de color correcto; sombras/gradientes tienen estilos separados. Cambiar un modo de variable no selecciona automáticamente otro estilo de efecto. En la aplicación, AppearanceProvider resuelve los valores completos y CSS aplica material, color y radio.

CustomerTable y CustomerDataTable comparten archivo. MetricCard utiliza su master Core. El arte original sigue siendo SVG/vector nativo. Las tablas pueden consolidar registros: cobertura de rutas no implica paridad pixel-perfect ni ejecución de handlers, persistencia o shaders en Figma.

## Pruebas nativas históricas

Estas pruebas responsivas pertenecen a la auditoría 1.0 y mantienen IDs reales:

| Prueba                | Nodo                                                                             | Tamaño         |
| --------------------- | -------------------------------------------------------------------------------- | -------------- |
| EN oscuro, escritorio | [`74:8012`](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=74-8012) | 1440 × 1240 px |
| ES oscuro, móvil      | [`77:8192`](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=77-8192) | 360 × 1339 px  |

La revisión actual de paletas, nuevas raíces y masters conserva los recibos reales del owner. Las revisiones visuales incluyen 54 ejemplos Button claro/oscuro, 20 muestras Table/DataTable y los PNGs finales de Chart y defaults/galerías. La estructura de las 65 rutas se leyó por separado; no se presenta ese read como 65 revisiones de píxeles. GSAP/Lenis y los shaders corresponden al navegador: [runtime](motion-runtime.md) · [shaders](shaders.md) · [verificación](verification.es.md).

## Semántica de Code Connect

| Caso                               | Mapping                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Button e iconos                    | Hijos dinámicos; swaps con la key exacta y comprobación `type === "INSTANCE"`               |
| Button/Badge/Card `Appearance`     | Prop aditiva solo cuando el ledger reporta el eje; opciones y tipos reales del source       |
| Input `Value`                      | Placeholder del espécimen vacío                                                             |
| InputOTP `Label`                   | Dígito visual; nombre accesible y valor completo son fixtures independientes                |
| DatePicker/DateRangePicker `Label` | Texto mostrado; no convertirlo en Date ni usarlo como nombre accesible                      |
| Carousel `Label`                   | Título visual; nombre accesible independiente                                               |
| Tabs `Label`                       | Párrafo de TabsContent, independiente del nombre de pestaña                                 |
| FileUpload `Label`                 | `labels.title`, con mensajes requeridos por separado                                        |
| Hover/foco/estados internos        | Limitación visual cuando no existe prop pública                                             |
| Sidebar                            | `Applications open#38:0` controla SidebarGroup.open; navegación/URLs son fixtures           |
| DashboardShell                     | Content incluye chrome; el source ya renderiza header y solo se inserta el cuerpo de página |
| Efectos/shaders                    | Propiedades registradas; ejecución GPU y movimiento son runtime del navegador               |

La base de **82 templates** conserva 44 familias core, 2 extensiones de Button, 9 exports de bloques, RevenuePanel/Bar adicional, 22 iconos, un fragmento de navegación y 3 composiciones de chrome. Los sets reales Button / Appearance (`97:655`), Badge / Appearance (`97:666`) y Card / Material (`97:715`) añaden tres mappings; los seis efectos añaden otros seis. Button Disabled controla `disabled`, y `Title#97:22` de Card controla `CardTitle`; Hover conserva su limitación visual. En efectos, Title se usa como children; MagneticButton conserva Label inline y mapea Disabled. El total actual figura en el manifiesto.

El generador escribe `.figma/code-connect/*.figma.ts` y el manifiesto. Los snapshots de source/templates se registran al generar y se comprueban antes/después de validar; no se sustituyen por hashes nuevos para declarar éxito. El validador verifica tipos de apariencia, seis contratos de efectos y JSX emitido con dependencias instaladas.

El resultado actual pertenece al manifiesto: 92 templates / 1.646 evaluaciones / 556 ejemplos tipados, cero diagnósticos y pendientes. Los antiguos 754 casos / 367 ejemplos tipados corresponden a 1.0 y permanecen en `previousRelease` de [verification-results.json](verification-results.json). **No se realizó ejecución real de templates en Figma ni registro cloud.** La cuenta Professional y la biblioteca sin publicar registradas no acreditan elegibilidad.

## Integración y registros actuales

El owner registra las raíces reales de `studio`, `themes` y `effects` en state.json. Los tres sets de apariencia están en `native-additions.json`; los seis efectos se leen directamente de `native-effects-library-1.1.json`, incluidos los ejes de sus nombres de variante. Ambos se verifican contra state.json. No se reutilizan IDs de otra familia ni se deducen IDs desde source. [Contrato exacto de handoff](handoff-1.1.md).

```sh
python3 scripts/generate-code-connect.py
pnpm verify:code-connect
pnpm coverage
```

El registry es automático e incluye MotionSystem, AppearanceProvider/Controls y seis efectos. La CLI starter copia sus dependencias, incluyendo el helper de tokens y la configuración pura. [Apariencia/presets](appearance.md) · [Efectos](effects.es.md).

La QA actual de runtime, el consumer oficial fresco y el cierre nativo/documental pasan con sus alcances registrados. El owner empaqueta `aureform-ui-source.zip`, `aureform-ui-starter.zip` y `aureform-ui-free.zip`; sus consumers nuevos y la publicación privada siguen pendientes. Consultar `public/downloads/verification-1.1.json` y `public/downloads/checksums.json` por versión y SHA256 exacto para resultados reales de entrega. Esos recibos se excluyen del source ZIP y no requieren reescribir los docs congelados. Los downloads existentes siguen siendo 1.0 hasta regenerarlos.
