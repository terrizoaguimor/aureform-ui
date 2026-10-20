# Investigación de producto y oportunidades

Aureform tiene una base visual amplia. La oportunidad siguiente consiste en hacer que esa base sea más fácil de integrar, operar y mantener: conservar su personalidad cuando aparecen datos incompletos, errores, pantallas pequeñas, cambios de sesión y código personalizado.

Este informe compara ocho referencias, revisa los 20 hallazgos anteriores y propone ocho prioridades. El punto de partida es **v1.4.1, commit `70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0`**: 69 vistas demo, 44 familias principales, 107 entradas de registro, seis paletas y frontend abierto bajo Apache 2.0. La implementación posterior de Lighthouse y Sponsors tiene su propia evidencia; no se atribuye retrospectivamente a esa base.

## Método y alcance

Se utilizaron **tres investigaciones headless con `agy` y Gemini 4 Argon High**, sobre diseño/interacción, flujos de aplicación y adopción/mantenimiento. Flujos y diseño registraron CLI 1.4.2; adopción registró 1.4.3. Las ejecuciones completadas registraron **52 consultas `search_web` observadas**. Dos intentos iniciales fallaron sin entregar resultados; diseño y adopción se reintentaron con proyectos independientes y búsqueda pública, acompañados por revisión independiente del código. No se cuentan los intentos fallidos como investigación completada.

El [registro de ejecución](../../research/2026-10-20/agy-provenance.json) conserva modelo, versiones, tiempos, estado, consultas y hashes de las respuestas finales retenidas localmente. El [registro de verificación](../../research/2026-10-20/verification.json) conserva fuentes primarias, redirecciones, contexto de issues y referencias exactas al código de la base. La fecha de corte inicial es 20 de octubre de 2026 UTC; las páginas sin versión fija pueden cambiar.

La revisión separa cuatro clases de evidencia: capacidades documentadas por un proveedor; experiencias particulares descritas en issues; comportamiento y contratos presentes en Aureform; y hipótesis que requieren usuarios reales. Una funcionalidad de un competidor no demuestra demanda. Un issue abierto no prueba un defecto reproducido aquí; un issue cerrado no identifica por sí solo una versión que lo corrigió.

La audiencia prioritaria son equipos pequeños y agencias que construyen SaaS, dashboards y herramientas internas. El [piloto comunitario](../../pilot-validation.es.md) sigue siendo un protocolo pendiente, con objetivos de 8–12 entrevistas voluntarias y 3–5 integraciones abiertas. No hay entrevistas, adopción, conversión o ahorro de tiempo medidos que permitan afirmar qué quiere “la mayoría”.

## Qué muestran las referencias

Estas referencias tienen productos y formas de distribución distintos. La clasificación expresa su foco documentado y permite elegir ejemplos útiles sin tratar todos los proyectos como sustitutos equivalentes.

| Referencia                                                              | Tipo                                                | Aprendizaje aplicable a Aureform                                                                                                                                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [TailAdmin](https://tailadmin.com/docs/installation/nextjs)             | Plantilla de dashboard                              | Un punto de partida completo facilita evaluar navegación, composición y cobertura. Su disponibilidad de pantallas depende de edición y versión. La mejora relevante es mostrar recorridos terminables y requisitos claros para cada módulo. |
| [Untitled UI React](https://www.untitledui.com/react/docs/introduction) | Kit de componentes con estilos y recursos de diseño | Fuente editable, tokens y documentación de instalación ayudan al trabajo de marca. Copiar componentes sigue requiriendo paquetes, utilidades y CSS; “editable” no elimina el coste de integración.                                          |
| [shadcn/ui](https://ui.shadcn.com/docs/registry/registry-item-json)     | Componentes y distribución de código                | Cada entrada puede documentar dependencias, archivos, instrucciones y metadatos. Esto permite explicar el contexto de instalación junto al componente que una persona está añadiendo.                                                       |
| [Tremor](https://www.tremor.so/docs/getting-started/about)              | Composición de datos y dashboards                   | Microvisualizaciones, tooltips e interacciones ofrecen referencias para una lectura útil de datos. Raw y la biblioteca NPM tienen recetas de instalación diferentes; no deben fusionarse en una promesa de compatibilidad única.            |
| [Magic UI](https://magicui.design/docs/components/bento-grid)           | Inspiración visual y movimiento                     | Sus composiciones sirven para jerarquía, presentación y descubrimiento. Los logotipos y diagramas de integración de una demo representan una relación visual; no implementan los servicios ilustrados.                                      |
| [Mantine](https://mantine.dev/guides/next/)                             | Biblioteca con estilos y paquetes especializados    | Los ejemplos completos y mínimos muestran una progresión de adopción. La guía de [capas de CSS](https://mantine.dev/styles/mantine-styles/) explica precedencia; aislar variables y selectores requiere un tratamiento separado.            |
| [HeroUI](https://heroui.com/en/docs/react/getting-started/cli)          | Biblioteca con estilos y herramientas de adopción   | Su CLI actual documenta diagnóstico de paquetes y requisitos peer. Es una referencia para detectar problemas concretos de instalación antes del primer render, sin convertir un diagnóstico en garantía de compatibilidad universal.        |
| [Base UI](https://base-ui.com/react/overview/about)                     | Fundamentos de interacción sin estilos              | Es una base que Aureform ya utiliza. La [guía de accesibilidad](https://base-ui.com/react/overview/accessibility) asigna al producto responsabilidades como contraste, etiquetas y foco visible, además del comportamiento de la primitiva. |

La verificación encontró diferencias que cambian la interpretación de la investigación: la antigua URL de CLI de HeroUI redirige a migración, pero existe una página actual que documenta `doctor`; los documentos de Tremor describen dos líneas de instalación; y las instrucciones de Untitled UI siguen incluyendo dependencias y CSS. No se infieren funciones actuales desde URLs antiguas ni desde texto comercial.

## Dificultades que conviene validar con usuarios

**El primer render y la primera personalización.** La persona necesita saber si un botón es independiente, si un bloque requiere un proveedor, qué estilos importa y qué modifica en su aplicación. El [issue shadcn #8669](https://github.com/shadcn-ui/ui/issues/8669) muestra un caso concreto de inserción de estilos base al añadir variables de un registro personalizado. Incluye respuestas del mantenedor y una reproducción discutida; no demuestra que toda instalación falle. En Aureform conviene comprobar proyectos con estilos propios, además del starter preparado.

**La actualización después de editar.** Fuente editable significa libertad, pero también responsabilidad al actualizar. Aureform ya ofrece preview, diff, recibos y protección de archivos. La pregunta pendiente es cómo decidir entre preservar, combinar y reemplazar cuando ambos lados han cambiado. Las [instrucciones de actualización de Untitled UI](https://www.untitledui.com/react/docs/installation) y el [CLI de shadcn](https://ui.shadcn.com/docs/cli) son referencias de flujo; el resultado necesario debe demostrarse en un consumidor con una modificación propia.

**La operación cuando algo sale mal.** Tablas, importación, sesión, pagos e IA tienen estados temporales. Un error de red, un resultado tardío y una sesión vencida necesitan respuestas distintas. La demo ya tiene contratos asíncronos, cancelación y reintentos acotados; la oportunidad consiste en hacer observables esos límites y conservar el trabajo de la persona.

**La lectura de datos y la densidad.** Un gráfico atractivo debe distinguir cero, ausencia y dato obsoleto, y permitir una alternativa legible. Una tabla compacta puede beneficiar al teclado de escritorio mientras perjudica objetivos táctiles. Los ejemplos de [Tremor Area Chart](https://www.tremor.so/docs/visualizations/area-chart) son referencias de composición; la aceptación de teclado, formatos y tacto pertenece a nuestro producto.

**La continuidad de diseño y código.** La frontera Figma/source-only ya está documentada. El siguiente aprendizaje consiste en saber cuáles bloques faltantes frenan un trabajo real de diseño. Hasta identificar esa demanda, conviene hacer el alcance fácil de encontrar y evitar afirmar paridad completa.

**La confianza al elegir una base.** Una instalación reproducible, ejemplos exactos, evidencia pública y mantenibilidad reducen incertidumbre de evaluación. Los scores de una página no acreditan todo el kit. La [guía de accesibilidad de Mantine](https://help.mantine.dev/q/are-mantine-components-accessible) y la discusión de [Base UI #5237](https://github.com/mui/base-ui/issues/5237) ilustran por qué resultados automáticos y comportamiento deben revisarse con su contexto.

## Qué cambió frente al estudio anterior

La [investigación anterior](../../research-gaps-1.4.es.md) conserva sus fuentes y su base 1.4.0. La revisión de v1.4.1 clasifica **un hallazgo entregado, tres parciales y dieciséis extensiones pendientes**. “Entregado” puede referirse a una frontera documental cumplida; no significa que se haya ampliado la biblioteca nativa de Figma.

| Hallazgo anterior                           | Estado en la base revisada | Diferencia importante                                                                                                                             |
| ------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01. Coste de entrada por ruta               | Parcial                    | Landing y documentación están separadas de los proveedores de aplicaciones; la partición de app/auth y la comparación completa siguen pendientes. |
| 02. Puertas reproducibles de QA             | Parcial                    | Existen pruebas de sitio, teclado, tacto y escaneos acotados; no hay una aceptación equivalente de todos los motores y tecnologías de asistencia. |
| 03. Integración mínima y estilos            | Parcial                    | Hay ejemplo de botón sin proveedor y guía de contexto; faltan recetas por entrada y aceptación nueva con estilos del host.                        |
| 04. Actualización de código copiado         | Pendiente                  | Preview, diff y protección existen; la combinación de tres versiones y resolución por archivo requieren trabajo adicional.                        |
| 05. Frontera Figma/source-only              | Entregado                  | El checkpoint nativo y los bloques posteriores solo en código tienen límites explícitos.                                                          |
| 06. Laboratorio de escenarios               | Pendiente                  | Los errores existen en contratos separados; falta una experiencia común para explorar escenarios entre módulos.                                   |
| 07. Sesión e invitación del destinatario    | Pendiente                  | Hay cuatro pantallas de auth y acciones de administración; faltan recuperación del borrador y aceptación del invitado.                            |
| 08. Contexto y conflictos entre pestañas    | Pendiente                  | SaaS y comercio tienen protecciones de scope; otras demos y conflictos de revisión no tienen el mismo contrato.                                   |
| 09. Extensiones de DataTable                | Pendiente                  | Query controlada, paginación manual e IDs estables existen; cursor, total desconocido y selección de toda la consulta son extensiones.            |
| 10. Continuidad de importaciones            | Pendiente                  | Cancelación y reintento parcial existen; el job consultable tras abandonar el wizard no está implementado.                                        |
| 11. Semántica de analytics                  | Pendiente                  | Faltan ausencia explícita, frescura, dominio temporal y drilldown tipado.                                                                         |
| 12. Preferencias regionales                 | Pendiente                  | EN/ES existe; zona horaria, precisión monetaria y fecha requieren un contrato de presentación común.                                              |
| 13. Visualizaciones densas en tacto/teclado | Pendiente                  | Hay controles de mapa; falta aceptación específica de navegación densa y pan táctil.                                                              |
| 14. Cotización y variantes                  | Pendiente                  | El editor y precios fijados al comprar existen; impuestos, descuento, envío y variantes no forman parte del contrato actual.                      |
| 15. Pago diferido e inventario              | Pendiente                  | Redirect y pago mock repetido están protegidos; falta modelar procesamiento y disponibilidad comprometida.                                        |
| 16. Reembolso y devolución                  | Pendiente                  | Mostrar `refunded` no implementa operaciones ni ajustes parciales.                                                                                |
| 17. Cambio efectivo de plan                 | Pendiente                  | El cambio mock no modela preview de prorrata ni fecha efectiva programada.                                                                        |
| 18. Recuperación de media por archivo       | Pendiente                  | Crop, validación, orden y alt existen; falta recuperación independiente tras un fallo de lote.                                                    |
| 19. Degradación y coste de Maps             | Pendiente                  | Fallback y opt-in existen; ciclo de montaje, diagnóstico y costes reales requieren aceptación adicional.                                          |
| 20. Continuidad de IA                       | Pendiente                  | Streaming y stop mock existen; reintento exacto, evidencia y estados parciales siguen propuestos.                                                 |

El registro de verificación incluye las rutas y líneas de código de cada fila. Estas clasificaciones no convierten ausencia de evidencia en un fallo demostrado: el alcance de una propuesta puede exceder deliberadamente al de la demo existente.

## Ocho prioridades recomendadas

El orden combina alcance, beneficio esperado y coste relativo. **Impacto y confianza son juicios de investigación, no resultados de un experimento.** Esfuerzo pequeño/medio/grande compara extensión de contratos, pruebas e integración; no promete días de entrega.

### 1. Recetas de instalación por entrada y diagnóstico del consumidor

**Impacto alto · esfuerzo medio · confianza alta · extensión de un hallazgo parcial.** El catálogo tiene 107 entradas y la revisión no encontró `docs` o `meta` por entrada. La [especificación de registro](https://ui.shadcn.com/docs/registry/registry-item-json) permite incluir instrucciones y contexto.

Añadir requisitos de proveedor, CSS, assets y ejemplo mínimo en el punto de instalación; complementar los recibos existentes con un diagnóstico que explique versiones, aliases y configuración faltante. Mantener una muestra de consumidores con tema propio, código personalizado y composición de efectos.

**Aceptación:** instalar una primitiva, un bloque SaaS y un efecto en un proyecto nuevo y otro existente; abrir su UI con sus estilos propios, sin importaciones ausentes ni composición inválida. Registrar la versión y el diff exactos. Un aviso debe explicar qué corregir. Un chequeo de paquetes no sustituye el render.

### 2. Laboratorio de estados y recuperación

**Impacto alto · esfuerzo medio · confianza alta · pendiente del estudio anterior.** Unificar la presentación de `loading`, vacío, búsqueda sin resultados, error recuperable, respuesta tardía y sesión vencida. El [comportamiento de validación de Mantine](https://mantine.dev/form/validation/) aporta ejemplos concretos de estado asíncrono, cancelación y foco de error.

Usar los callbacks reales de Aureform y fixtures deterministas, evitando un simulador paralelo que no ejerza el componente. El laboratorio debe funcionar con teclado y explicar cuándo interviene el backend del consumidor.

**Aceptación:** un envío rechazado conserva el borrador; un resultado antiguo no reemplaza el nuevo; reintentar corrige el error mostrado y restaura el contexto esperado. Los fixtures deberán ejecutarse en inglés/español y tacto/escritorio.

### 3. Accesibilidad de tareas densas y presupuesto visual

**Impacto alto · esfuerzo medio · confianza media-alta · nueva aceptación sobre capacidades existentes.** GSAP/Lenis ya respetan movimiento reducido y el scroll de aplicaciones es nativo. La mejora consiste en comprobar la tarea completa: overlays anidados, teclado virtual, foco después de filtrar y charts con muchos elementos.

Agregar objetivos táctiles adecuados y navegación de celdas que reduzca tabulaciones innecesarias; comprobar contraste de presets y de configuraciones personalizadas. Las superficies, gradientes y hover deben conservar jerarquía y foco. [Base UI accesibilidad](https://base-ui.com/react/overview/accessibility) describe responsabilidades que permanecen en la capa visual.

**Aceptación:** abrir, usar y cerrar controles compuestos con teclado; recuperar foco al disparador; completar edición móvil con teclado virtual; interpretar un chart sin depender del color. Añadir revisión humana con una tecnología de asistencia y al menos otro motor antes de ampliar la afirmación de cobertura.

### 4. Analytics con semántica y formato compartidos

**Impacto alto · esfuerzo medio · confianza alta · pendiente.** `ChartDatum` exige números, el heatmap utiliza cero para una serie ausente y la tabla accesible presenta valores sin el formatter visual. Revisar el [Chart de la base](https://github.com/terrizoaguimor/aureform-ui/blob/70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0/src/components/ui/chart.tsx).

Modelar ausencia, período, frescura y estado de consulta; usar el mismo formato en tooltip, alternativa tabular y exportación. Aplicar preferencias regionales de forma explícita, conservando importes en unidades menores cuando corresponda.

**Aceptación:** `0`, dato ausente y error producen resultados distinguibles; la tabla comunica los mismos valores y unidades que el gráfico; cambiar zona horaria conserva la interpretación del período; un drilldown transmite filtros al consumidor.

### 5. Continuidad al actualizar fuente personalizada

**Impacto alto · esfuerzo grande · confianza alta · pendiente.** Aprovechar protección, recibos y rollback ante fallo de la transacción. La base retenida para una comparación de tres versiones y las decisiones por archivo deben añadirse como una evolución del [CLI actual](https://github.com/terrizoaguimor/aureform-ui/blob/70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0/bin/aureform.mjs).

**Aceptación:** modificar un componente instalado, preparar una actualización con cambios propios y del upstream, revisar conflictos antes de escribir, combinar solo lo seleccionado y recuperar el estado anterior. Validar rangos reales de dependencias; igualdad de major no acredita compatibilidad.

### 6. Contexto, sesión y trabajo de larga duración

**Impacto alto · esfuerzo grande · confianza alta · agrupación de pendientes.** Declarar qué demos son globales y cuáles pertenecen al workspace. Añadir revisión/conflicto entre pestañas, reautenticación con borrador y un estado de importación consultable al abandonar la pantalla.

**Aceptación:** cambiar de workspace descarta resultados tardíos del contexto anterior; otra pestaña no sobrescribe silenciosamente un borrador; aceptar una invitación prueba el recorrido del destinatario; navegar fuera de una importación permite conocer su estado o su cancelación. La autoridad, persistencia duradera y autorización reales pertenecen al servidor del consumidor; no se afirma una fuga de datos de producción.

### 7. Comercio e integraciones con estados operativos completos

**Impacto medio-alto · esfuerzo grande · confianza alta · pendiente por dominio.** Priorizar un recorrido concreto antes de ampliar muchas pantallas: cotización completa, pago en procesamiento, fecha efectiva de plan, devolución y reembolso distintos. Revisar los [contratos actuales de comercio](https://github.com/terrizoaguimor/aureform-ui/blob/70b40b56ffc7096ffa32ef2f1210ee550ea6d0b0/src/lib/commerce.ts).

Acompañar ese recorrido con fallos recuperables por archivo en media, montaje visible/reutilizable del mapa y una captura inmutable de los parámetros de una petición de IA.

**Aceptación:** el frontend conserva estados de importe y operación coherentes al recibir callbacks; un redirect no confirma un pago; cancelar no promete devolver dinero; reintentar IA utiliza la petición registrada; un archivo fallido no borra silenciosamente el resto. Las operaciones financieras y la reconciliación corresponden al backend.

### 8. Evidencia pública, documentación y descubrimiento

**Impacto alto · esfuerzo pequeño/medio · confianza alta · primera entrega medida verificada.** Publicar mediciones por ruta y perfil, mantener referencias bilingües y ofrecer una entrada clara al patrocinio voluntario. La [página de calidad](https://aureformui.com/es/quality/) presenta snapshots verificados y sus commits auditados, conservando el alcance de laboratorio. Las combinaciones sin medición se indican expresamente.

La [investigación de difusión en GitHub](../../github-discovery.es.md) revisa 17 destinos y prepara propuestas para los cinco prioritarios. About y topics describen capacidades reales. El directorio oficial de shadcn es una oportunidad que requiere su validador y una instalación nueva antes de enviar una propuesta.

**Aceptación:** cada badge deriva del mismo snapshot que la página; todos los originales descargan con su hash; enlaces de patrocinio apuntan al mantenedor; las propuestas cumplen el formato del destino y declaran el vínculo con el proyecto. La aceptación y la exposición dependen de cada comunidad.

## Medición posterior a la base de investigación

El **20 de octubre de 2026**, la [primera muestra de producción](../../quality/lighthouse/index.json) auditó el commit **`0caf7c8874ea8bb2b1580c0d59a9bda4497cbdd4`**, posterior a la base inmutable del estudio. Dieciocho auditorías secuenciales dieron medianas de rendimiento móvil/escritorio de **93/100 en landing, 94/100 en documentación de instalación y 40/67 en dashboard**. La [página de calidad](https://aureformui.com/es/quality/) presenta las cuatro categorías completas y cinco métricas de carga.

Esto aporta evidencia medida para continuar mejorando la carga de aplicaciones y el coste del hilo principal. No determina una causa única, el rendimiento de otras rutas ni la experiencia de usuarios reales. Perfilar el dashboard antes de elegir el cambio; conservar los mejores resultados del sitio público al aislar módulos de aplicación. La mediana SEO de 69 del dashboard refleja su política deliberada `noindex`, sin justificar la indexación de registros ficticios.

Este suplemento no cambia la clasificación de los veinte hallazgos originales ni atribuye Lighthouse retrospectivamente al commit `70b40b5`. Describe una medición separada y plenamente identificada.

## Secuencia de trabajo

Primero consolidar evidencia y claridad de adopción: calidad pública, guías por entrada, una muestra de consumidores y el laboratorio de errores. Después elegir una tarea densa y completar su accesibilidad y semántica de datos. Actualización de fuente, conflictos multi-tab y recorridos financieros requieren diseño de contratos y aceptación más amplios; pueden desarrollarse por dominios independientes.

Antes de ampliar el checkpoint de Figma, preguntar por los tres bloques que una integración concreta necesita diseñar. Una lista extensa de nuevos componentes aporta menos aprendizaje que un recorrido que se pueda terminar y personalizar.

La [hoja de ruta](roadmap.md) distingue lo entregado de estas recomendaciones. Ninguna propuesta añade APIs por aparecer aquí. Las tareas deberán tener un consumidor, una aceptación observable y una nueva evidencia antes de anunciarse como disponibles.

## Validación que todavía falta

En el piloto, medir hasta dónde llega una instalación sin ayuda, qué CSS o proveedor bloquea el primer render y cómo se resuelve una actualización personalizada. Observar el último error real de la persona, la tarea que intenta terminar y el dispositivo que usa. Separar tiempos observados de estimaciones recordadas.

Registrar abandono, asistencia, resultado y fallo de contrato. Compartir hallazgos anonimizados o atribuciones acordadas; no publicar datos de clientes. El piloto debe validar estas prioridades, no confirmar una conclusión fijada de antemano.

La base disponible permite avanzar con decisiones concretas; las fuentes primarias y pruebas acotadas deben conservar su alcance cuando se comunique el producto.

## Fuentes y trazabilidad

El [registro completo de fuentes](../../research/2026-10-20/verification.json) contiene URLs solicitadas y finales, fecha, versiones documentadas, estado de issues y correcciones de afirmaciones. El [registro de AGY](../../research/2026-10-20/agy-provenance.json) muestra las consultas reales de las tres investigaciones completadas.

Las referencias técnicas verificadas se listan a continuación. Sus versiones describen la documentación consultada, no una certificación de interoperabilidad con Aureform.

<!-- BEGIN:verified-research-sources -->

### Documentación de referencias e issues de primera parte

- [TailAdmin Next.js Installation Guide](https://tailadmin.com/docs/installation/nextjs)
- [TailAdmin React Installation Guide](https://tailadmin.com/docs/installation/react)
- [TailAdmin FAQ](https://tailadmin.com/docs/others/faq)
- [TailAdmin Dark Mode](https://tailadmin.com/docs/customizations/dark-mode)
- [TailAdmin Next.js Changelogs](https://tailadmin.com/docs/update-logs/nextjs)
- [Untitled UI React Introduction](https://www.untitledui.com/react/docs/introduction)
- [Untitled UI React Installation](https://www.untitledui.com/react/docs/installation)
- [Untitled UI CLI](https://www.untitledui.com/react/docs/cli)
- [Untitled UI Theming](https://www.untitledui.com/react/docs/theming)
- [shadcn/ui Introduction](https://ui.shadcn.com/docs)
- [shadcn CLI](https://ui.shadcn.com/docs/cli)
- [shadcn Registry Item Specification](https://ui.shadcn.com/docs/registry/registry-item-json)
- [shadcn Registry Examples](https://ui.shadcn.com/docs/registry/examples)
- [shadcn Theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui #8669: custom registry cssVars and default base styles](https://github.com/shadcn-ui/ui/issues/8669)
- [Tremor: Towards Copy and Paste](https://www.tremor.so/docs/getting-started/about)
- [Tremor Raw Installation](https://www.tremor.so/docs/getting-started/installation)
- [Tremor Area Chart](https://www.tremor.so/docs/visualizations/area-chart)
- [Tremor NPM Installation](https://npm.tremor.so/docs/getting-started/installation)
- [Magic UI Installation](https://magicui.design/docs/installation)
- [Magic UI Animated Beam](https://magicui.design/docs/components/animated-beam)
- [Magic UI Bento Grid](https://magicui.design/docs/components/bento-grid)
- [Magic UI MCP Server](https://magicui.design/docs/mcp)
- [Magic UI #611: unresolved motion/react import during manual setup](https://github.com/magicuidesign/magicui/issues/611)
- [Mantine Usage with Next.js](https://mantine.dev/guides/next/)
- [Mantine Styles](https://mantine.dev/styles/mantine-styles/)
- [Are Mantine Components Accessible?](https://help.mantine.dev/q/are-mantine-components-accessible)
- [Mantine Form Validation](https://mantine.dev/form/validation/)
- [HeroUI Legacy CLI URL Now Resolves to Migration](https://heroui.com/en/docs/react/migration)
- [HeroUI Current React CLI](https://heroui.com/en/docs/react/getting-started/cli)
- [HeroUI React Quick Start](https://heroui.com/en/docs/react/getting-started/quick-start)
- [HeroUI Styling and Theming Migration](https://heroui.com/en/docs/react/migration/styling)
- [About Base UI](https://base-ui.com/react/overview/about)
- [Base UI Accessibility](https://base-ui.com/react/overview/accessibility)
- [Base UI Styling](https://base-ui.com/react/handbook/styling)
- [Base UI Releases](https://base-ui.com/react/overview/releases)
- [Base UI #5237: focus guard names in WebKit accessibility checks](https://github.com/mui/base-ui/issues/5237)

### Referencias de flujos, accesibilidad y adopción

- [TanStack Table v8 row selection guide](https://tanstack.com/table/v8/docs/guide/row-selection)
- [TanStack Table v8 pagination guide](https://tanstack.com/table/v8/docs/guide/pagination)
- [TanStack Table #4781: pagination and row selection](https://github.com/TanStack/table/issues/4781)
- [shadcn/ui #1151: fixed table header with scrollable body](https://github.com/shadcn-ui/ui/issues/1151)
- [shadcn/ui #1960: row selection freezes a data table](https://github.com/shadcn-ui/ui/issues/1960)
- [shadcn/ui current Base UI data-table recipe](https://ui.shadcn.com/docs/components/base/data-table)
- [shadcn/ui changelog: CLI v4 and October 2026 agentic patterns](https://ui.shadcn.com/docs/changelog)
- [Mantine notifications and promise lifecycle](https://mantine.dev/x/notifications/)
- [Mantine 8.0.0 historical changelog](https://mantine.dev/changelog/8-0-0/)
- [Mantine 7.2.0: named form actions](https://mantine.dev/changelog/7-2-0/)
- [HeroUI v3 Table composition and infinite loading](https://heroui.com/en/docs/react/components/table)
- [Stripe payment-method integration comparison](https://docs.stripe.com/payments/payment-methods/integration-options)
- [Stripe Checkout fulfillment and delayed payment confirmation](https://docs.stripe.com/checkout/fulfillment)
- [Stripe subscription prorations and previews](https://docs.stripe.com/billing/subscriptions/prorations)
- [Vercel AI SDK useChat states and tool approval response](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [Google Maps JavaScript usage and billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing)
- [Google Maps Platform Dynamic Maps billable event](https://developers.google.com/maps/billing-and-pricing/sku-details#dynamic-maps-ess-sku)
- [Recharts #877: tooltip visibility for null values](https://github.com/recharts/recharts/issues/877)
- [Recharts #5552: tooltip when all Y values are null](https://github.com/recharts/recharts/issues/5552)
- [Recharts #6782: connectNulls edge behavior in stacked areas](https://github.com/recharts/recharts/issues/6782)
- [Recharts discussion #4228: snapping at null points](https://github.com/recharts/recharts/discussions/4228)
- [Magic UI #42: historical Globe GPU/scroll report](https://github.com/magicuidesign/magicui/issues/42)
- [Base UI #3630: keyboard access to Combobox.Clear](https://github.com/mui/base-ui/issues/3630)
- [Base UI PR #5537: proposed closing-popup focus/accessibility changes](https://github.com/mui/base-ui/pull/5537)
- [Mantine #7085: closed combobox aria-controls report](https://github.com/mantinedev/mantine/issues/7085)
- [Mantine #9233: disabled options and aria-disabled](https://github.com/mantinedev/mantine/issues/9233)
- [Base UI #1455: mobile keyboard/dialog positioning](https://github.com/mui/base-ui/issues/1455)
- [Mantine #6553: nested overlay Escape report](https://github.com/mantinedev/mantine/issues/6553)
- [Tremor NPM PR #1087: proposed tooltip z-index change](https://github.com/tremorlabs/tremor-npm/pull/1087)
- [W3C explanation of WCAG 2.2 target-size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [W3C explanation of enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
- [W3C explanation of meaningful non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [W3C explanation of text contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WAI-ARIA APG interactive grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [shadcn/ui #10496: third-party registry style override](https://github.com/shadcn-ui/ui/issues/10496)
- [HeroUI #4753: historical plugin/Tailwind v4 report](https://github.com/heroui-inc/heroui/issues/4753)
- [HeroUI #5733: historical package/style configuration](https://github.com/heroui-inc/heroui/issues/5733)
- [Tremor NPM #1054: React 19 RC chart report](https://github.com/tremorlabs/tremor-npm/issues/1054)
- [Tremor NPM #1072: React 19 support request](https://github.com/tremorlabs/tremor-npm/issues/1072)
- [Base UI public machine-readable documentation index](https://base-ui.com/llms.txt)
- [Mantine documentation, MCP and skills for coding assistants](https://mantine.dev/guides/llms/)
- [shadcn/ui MCP server and configured registries](https://ui.shadcn.com/docs/mcp)

<!-- END:verified-research-sources -->
