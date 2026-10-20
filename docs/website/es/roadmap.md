# Hoja de ruta y alcance de versiones

Esta página distingue las capacidades de frontend entregadas de las propuestas de investigación. Las propuestas no tienen fecha de entrega comprometida; su prioridad depende de una necesidad concreta, un contrato acordado y una aceptación documentada.

## Incluido en el kit actual

La base de la aplicación tiene 69 vistas de demo, 44 familias principales, 107 entradas del registro, seis paletas y 13 tipos de gráficos, con inglés/español y temas claro/oscuro.

- Componentes editables, ejemplos completos, instalación local, registro, preview/diff y recibos de instalación.
- Estudio de apariencia, presets locales, exportaciones JSON/CSS/React, movimiento acotado y seis efectos reutilizables.
- Onboarding, workspaces, miembros, importación CSV, tablas controladas de clientes, vistas guardadas y detalle.
- Edición de productos e imágenes, precios fijados al comprar, pagos simulados, facturas y facturación, con transporte tipado hacia un backend Stripe del consumidor.
- Mapas locales con conexión Google opcional y cuatro pantallas de autenticación con callbacks sociales sustituibles.

Son flujos y contratos de frontend. Identidad real, autorización de tenants, almacenamiento compartido, operaciones financieras y jobs duraderos pertenecen al consumidor. Consulta la [integración de aplicaciones](../../../docs/application-integrations.es.md) y el [registro de la versión 1.4](../../../docs/release-checklist-1.4.0.md).

## Evidencia y comunidad

La [investigación de octubre de 2026](research.md) compara ocho referencias, revisa los 20 hallazgos originales sobre el commit `70b40b5` y prioriza ocho mejoras. Tres investigaciones headless de AGY completadas registraron 52 búsquedas web, seguidas por revisión independiente de fuentes primarias y código. El [estudio anterior](../../research-gaps-1.4.es.md) conserva su alcance original.

El [research de integraciones](integration-research.md) es un estudio separado sobre la base `a93ab113`: cuatro investigaciones de AGY completadas, 99 búsquedas observadas y una ventana común de npm del 12 al 18 de octubre para 70 paquetes. Su selección P0/P1/P2 empieza por datos conectados, identidad sustituible, el transporte Stripe existente y recetas opcionales de AI SDK; después cubre servicios operativos y conectores de producto. Las fichas distinguen contratos actuales, UI propuesta, requisitos del backend consumidor y licencias. Estas recomendaciones no añaden conexiones reales ni nuevas APIs públicas de adaptadores.

La [página pública de calidad](https://aureformui.com/es/quality/) muestra la última muestra publicada de Lighthouse y el commit exacto que se auditó. La recolección cubre tres páginas, dos perfiles y tres ejecuciones por combinación. Las herramientas conservan informes completos y verifican sus hashes; una muestra vacía se presenta sin inventar scores.

El primer commit de aplicación medido es `0caf7c8`: rendimiento 93/100 en landing, 94/100 en documentación y 40/67 en dashboard, móvil/escritorio. Estas medianas de laboratorio convierten el profiling del dashboard y la carga de rutas en un siguiente paso concreto. No identifican una causa única ni acreditan otras pantallas de aplicación.

GitHub Sponsors permite apoyar al mantenedor. La [guía de difusión en GitHub](../../github-discovery.es.md) registra directorios adecuados, reglas de contribución y propuestas preparadas. La aceptación en directorios y la adopción siguen siendo resultados externos.

## Prioridades para los siguientes cambios de producto

Su presencia en un documento no añade APIs públicas. Cada propuesta necesita una implementación acotada y nueva evidencia de aceptación. El informe detalla impacto, esfuerzo, confianza y resultados observables para cada prioridad.

| Prioridad | Cambio propuesto                                       | Evidencia necesaria para considerarlo entregado                                                                                             |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Recetas de instalación y diagnóstico del consumidor    | Instalar en aplicaciones nuevas, comprobar rangos reales de dependencias y explicar requisitos de CSS/contexto                              |
| 2         | Laboratorio de escenarios y recuperación               | Demostrar respuestas tardías, conflictos, fallos parciales, cancelación y borradores recuperables con contratos compartidos                 |
| 3         | Accesibilidad de tareas densas y presupuestos visuales | Completar tareas con teclado y tacto, revisar foco/overlays y medir movimiento con el volumen de datos real                                 |
| 4         | Ausencia, frescura y formato común de datos            | Distinguir cero, desconocido y error; conservar valores, unidades, zonas horarias y filtros entre gráfico y tabla                           |
| 5         | Continuidad al actualizar código personalizado         | Conservar una base de comparación, revisar conflictos locales/upstream antes de escribir y restaurar la instalación                         |
| 6         | Contexto, sesiones y trabajos prolongados              | Ejercitar cambios de workspace, pestañas concurrentes, invitaciones del destinatario y estado consultable de importaciones                  |
| 7         | Estados operativos de comercio e integraciones         | Elegir y completar un recorrido de cotización/pago/devolución con transportes tipados sustituibles y estados pendientes/de error explícitos |
| 8         | Evidencia, documentación y difusión                    | Conservar mediciones, validar ejemplos de instalación y registrar integraciones reales de la comunidad                                      |

Empezar por claridad de instalación y un laboratorio pequeño; después evaluar tareas densas y semántica analítica. La continuidad de actualizaciones y los flujos duraderos necesitan contratos más amplios. Elegir un recorrido de integración cada vez, sin convertir todas las pantallas propuestas en una entrega simultánea.

El [plan de piloto](../../pilot-validation.es.md) propone 8–12 entrevistas y 3–5 integraciones voluntarias. Son objetivos de convocatoria, no entrevistas realizadas ni cifras de adopción. Registrar tareas completadas, ayuda necesaria, fallos e intención de reutilizar antes de cambiar el orden.

## Límites del diseño nativo y la verificación

El checkpoint nativo de Figma 1.2.1 sigue congelado. Los bloques de aplicación nuevos de 1.4 son solo código, sin nuevos masters nativos declarados. Las 92 plantillas locales de Code Connect usan un runtime sintético; no están certificadas en la nube ni acreditan publicación real.

Las pruebas de navegador, código, diseño nativo y archivos distribuidos tienen alcances distintos. Cambiar la versión o añadir capturas no recertifica evidencias históricas. Consulta la [distribución de diseño](../../../docs/figma-distribution.es.md).

## Ayuda a priorizar

1. Describe una tarea reproducible con versión, método de instalación, idioma y estado relevante.
2. Explica el resultado necesario y las responsabilidades de backend que puedes cubrir.
3. Propón un cambio acotado con estados accesibles y textos EN/ES.

Sigue [CONTRIBUTING](../../../CONTRIBUTING.md) y conserva contratos y avisos de licencia.
