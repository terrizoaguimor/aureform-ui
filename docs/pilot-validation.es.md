# Piloto comunitario de integración SaaS

**Estado: planificado; no se han ejecutado entrevistas ni integraciones para este plan.** La política abierta reemplaza la anterior propuesta de trials pagados. El objetivo es realizar **8–12 entrevistas voluntarias** y **3–5 integraciones abiertas**, sin pago ni acceso privilegiado. Estas cifras son objetivos de aprendizaje, no resultados ni una muestra estadística del mercado.

El piloto evalúa el kit de frontend abierto bajo [Apache 2.0](../LICENSE), con el [enfoque SaaS](research-saas.es.md). Debe comprobar qué trabajo de implementación resuelve, qué bloqueos introduce y si una persona con un proyecto concreto puede integrar, mantener y contribuir a lo entregado.

Es investigación futura separada de los gates técnicos de publicación. La fuente, el diseño original y los paquetes están abiertos; realizar una sesión no otorga ni limita sus permisos de uso. El protocolo no acredita reclutamiento ni ejecución.

## Participantes y cualificación

Priorizar implementadores de equipos pequeños, agencias o estudios con un producto SaaS o herramienta de operaciones en desarrollo. Registrar el contexto individual; no asignarles necesidades por pertenecer a un segmento.

| Criterio                    | Pregunta o evidencia                                           | Registro                                                                         |
| --------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Proyecto activo             | ¿Qué operación concreta necesitas entregar y en qué fase está? | Dominio, tarea y próximo hito, sin datos de clientes reales.                     |
| Stack adecuado              | ¿Cuál es el stack y qué puedes cambiar dentro del proyecto?    | Framework/versiones declaradas por la persona, estilos, aliases y restricciones. |
| Capacidad de implementación | ¿Quién integrará y mantendrá los componentes?                  | Rol, experiencia y disponibilidad para una tarea práctica.                       |
| Capacidad de adopción       | ¿Qué necesita tu equipo para integrar una biblioteca abierta?  | Tiempo disponible, política de dependencias y proceso de revisión.               |
| Referencia actual           | ¿Qué utilizaste en la última entrega similar?                  | Kit o solución propia, trabajo realizado y evidencia disponible.                 |
| Necesidad de colaboración   | ¿Quién necesita adaptar el código y el diseño?                 | Entrega al cliente, idiomas y requisitos de colaboración, sin límites de plazas. |

Una persona sin proyecto inmediato puede aportar una entrevista exploratoria, pero no se contará como integración práctica. Separar implementación, revisión de dependencias y mantenimiento cuando correspondan a personas distintas.

La persona que modere organiza la participación y el consentimiento para cada sesión. Usar IDs de participante y ejemplos sintéticos en el material distribuible; mantener notas identificables y grabaciones fuera del repositorio público. Publicar únicamente resultados anonimizados o citas cuya atribución haya sido acordada.

## Preparación antes de cada sesión

- Elegir y registrar una versión o commit público estable y el artefacto exacto. El inventario tiene 69 vistas/68 suite más landing, 96 entradas de registro, seis paletas y EN/ES. Los checks históricos de source/navegador están en el [recibo portátil 1.2](qa-runtime-1.2.json) y conservan su alcance. Usar los checksums y el registro de publicación de la versión probada; no transferir resultados históricos a una integración nueva.
- Usar las firmas reales y los ejemplos EN/ES de la [guía de operaciones](saas-operations.es.md). Las APIs ya existen en Source; eso no afirma que sus consumidores hayan pasado QA.
- Preparar proyecto nuevo y existente con tema, aliases, receipt `.aureform/manifest.json` y una modificación propia visibles. Conservar también un archivo existente sin receipt para distinguir `customized` de `unknown`.
- Entregar CSV sintéticos para `customerImportFields`: nombre/email, empresa, plan Starter/Pro/Enterprise, estado active/trial/paused, importe no negativo y fecha `YYYY-MM-DD`. Incluir comas entrecomilladas, email duplicado e importe/fecha inválidos. Registrar límites reales: UTF-8/comas, 5 MiB, 10.000 filas y 200 columnas por defecto.
- Disponer de una fuente asíncrona del consumer con páginas desde cero, totales y fallo recuperable programado. `loadDemoCustomerPage` ofrece `signal`, `delay` y `fail` sobre un array sintético; es fixture sin backend. Para observar respuesta tardía, el consumer puede inyectar un lector con latencias distintas manteniendo el mismo contrato de tabla.
- Preparar rechazo real de `CustomerDetailTemplate.onSave`: `throw new Error(...)` o Promise rechazada presenta error general y conserva el borrador. Los errores por campo provienen de validación local; no suponer un objeto de errores de servidor que la API no declara. El ejemplo `RecoverableDetail` rechaza una vez y después delega en el commit del consumer.
- Preparar dos workspaces con clientes/IDs distintos para comprobar aislamiento local, `SaasDemoState.previewRole` persistido y su limpieza al cambiar. Para adjuntos, comprobar metadatos únicamente, máximo 100 por cliente/10 MiB individual; no anunciar subida ni descarga real.
- Acordar consentimiento, duración y política de asistencia. Verificar qué puede grabarse o compartirse.

La instalación no debe poner en riesgo el proyecto habitual de la persona: usar una rama o copia de trabajo elegida por ella. Su aplicación, cambios y datos siguen bajo su control.

## Entrevista breve

Antes de enseñar la demo, recoger el último caso real:

1. «Cuéntame la última vez que construiste una lista, un detalle y un formulario para un equipo».
2. «¿Qué pudiste reutilizar y qué tuviste que rehacer?».
3. «¿Dónde aparecieron conflictos de estilos, datos, instalación o actualización?».
4. «¿Cómo distinguías un error, una lista vacía y una consulta sin resultados?».
5. «¿Qué proceso seguiste para elegir dependencias y revisar sus permisos?».
6. «¿Qué tendría que poder integrar y mantener tu equipo para adoptar este kit?».

Distinguir hechos relatados, evidencia que la persona aporta y opiniones. El tiempo que recuerde de otra entrega se marca como **declarado**, sin convertirlo en una comparación cronometrada. Evitar preguntas que sugieran que Aureform necesariamente ahorra tiempo.

## Guion de tareas

Planificar una sesión práctica de 60–90 minutos y un seguimiento de la integración. El límite es organizativo, no un resultado de usabilidad. Alternar, cuando sea viable, el orden de instalación nueva/existente y registrar el orden para interpretar el efecto de aprendizaje.

Presentar el objetivo de cada tarea sin indicar el control que debe pulsarse. Registrar fin, abandono y ayuda por separado. Las APIs de interfaz están escritas, pero el entorno/servicio del consumer puede no estarlo: marcar tareas sin sus requisitos reales como **no ejecutables en ese checkpoint**, sin simular su finalización.

| ID                                 | Consigna para la persona                                                                                                                | Criterio observable de finalización                                                                                                                        | Qué registrar                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| T1 — Proyecto nuevo                | «Integra la operación de clientes en este proyecto nuevo usando lo entregado».                                                          | Instala entradas reales como `data-workbench`, `import-wizard` o `customer-detail`, resuelve dependencias/providers y abre una pantalla utilizable.        | Instalación, destinos, primer render, errores y ayuda.                                                      |
| T2 — Proyecto existente            | «Añade esta operación a tu base existente conservando su marca y su modificación propia».                                               | Revisa `add --dry-run`/`--diff`, identifica conflicto protegido, conserva el cambio y entiende hashes fuente/destino del receipt.                          | Archivos revisados, estados customized/unknown, decisión de reemplazo y trabajo manual.                     |
| T3 — Marca y edición               | «Adapta la apariencia a esta marca y cambia un campo o acción para tu dominio».                                                         | Personaliza tokens/scopes y hace una edición funcional; revisa claro/oscuro y textos EN/ES relevantes.                                                     | Tiempo de adaptación, alcance de cambios y estados que se rompan.                                           |
| T4 — Inicio y equipo               | «Prepara un workspace para trabajar y modifica un miembro con los permisos de esta fixture».                                            | Completa onboarding, utiliza callbacks de miembros y cambia de workspace sin conservar preview de rol; distingue invitación local de envío real.           | Comprensión de contexto, owner protegido, permisos y alcance local.                                         |
| T5 — CSV                           | «Importa estos clientes; primero revisa el archivo con un error y corrígelo o cancela».                                                 | Identifica errores, conserva el conjunto antes de confirmar y verifica el resultado aceptado.                                                              | Mapeo, filas rechazadas, cancelación, reintento y duplicados según contrato.                                |
| T6 — Consulta externa y vistas     | «Conecta la fuente del consumer, encuentra estos clientes, pasa de página, exporta las coincidencias y guarda la consulta para volver». | `mode="external"` devuelve otra página y total real; exporta todos los resultados filtrados; una vista restaura consulta/columnas/densidad.                | Abort/descarte, workspace, alcance de selección/exportación, error/reintento y vista.                       |
| T7 — Detalle y fallo de formulario | «Abre este cliente, modifica el dato, resuelve el fallo programado y vuelve a la lista».                                                | Resuelve ID dentro del workspace; preserva entrada ante rechazo, acepta reintento y actualiza el padre; identifica que un adjunto local es sólo metadatos. | Error local de campo versus rechazo general, foco, duplicación de envíos, cancelación y límites de archivo. |

Para T5, comprobar preview sin escritura, modos skip/update, abort antes del commit y resultado parcial con índices de fallo de la invocación. Un callback que resuelva después de abort queda no verificado; no contar rollback supuesto como tarea completada.

Para T6, incluir una petición que tarde más que la siguiente y un cambio de workspace. Observar si aparecen datos obsoletos; no dar por completada la tarea porque cambie el número de página. Usar más coincidencias que el tamaño de página y comparar la exportación completa con la página visible. Guardar vista mediante `onSaveView`; aplicar y compartir configuración no comparte permisos sobre clientes.

Para T7, la fixture distingue validación local, rechazo de operación y éxito aceptado. El callback no devuelve datos por sí solo a la tabla: el consumer debe actualizar su fuente aceptada. Cancelar vuelve al cliente suministrado. No interpretar un listado de metadatos como almacenamiento binario.

Una variante con datos del host puede utilizar una API existente sólo si la persona decide conectarla y cumple su política de acceso. El kit sigue entregando frontend; el piloto no promete autenticar tenants, enviar invitaciones o guardar en una base real sin esa integración.

## Registro de tiempo, bloqueos y asistencia

Usar el mismo formulario por participante y tarea:

| Campo                      | Definición                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| ID de participante / tarea | Código anónimo, checkpoint, idioma, orden y contexto nuevo/existente.                    |
| Inicio / fin               | Marcas reales; separar instalación de dependencias, ejecución activa y pausas externas.  |
| Resultado                  | Completada, completada con ayuda, bloqueada, abandonada o no ejecutable.                 |
| Bloqueo                    | Paso exacto, mensaje o comportamiento, consecuencia y recuperación; sin copiar secretos. |
| Asistencia                 | Qué se dijo o hizo y en qué momento. Registrar también si el moderador tomó el teclado.  |
| Edición requerida          | Ajustes de dominio/estilo previstos y trabajo adicional para reparar integración.        |
| Valor observado            | Tarea completada y reutilización visible; opinión textual sólo con permiso.              |
| Decisión de adopción       | Integración aceptada, rechazada o pendiente, y razón observable.                         |
| Seguimiento                | Uso después de la sesión, cambios conservados, issues o contribuciones y asistencia.     |

Codificar asistencia de forma simple: **A0** sin ayuda; **A1** orientación hacia documentación; **A2** instrucciones concretas; **A3** intervención sobre el código. No sumar una tarea A3 como ejecución independiente. El protocolo de ayuda se acuerda antes de la sesión y se aplica de la misma forma; esperar un tiempo fijo no convierte un bloqueo en fracaso automático.

Informar tiempos individuales y dispersión con el contexto necesario. Una media de esta muestra pequeña no justifica promesas de ahorro ni porcentajes de adopción. Separar espera de red, configuración del entorno y trabajo de adaptación.

## Integraciones abiertas

El objetivo posterior es **3–5 integraciones voluntarias** con participantes cualificados. Cada participante usa los mismos artefactos públicos y permisos Apache 2.0. Antes de la sesión, concretar:

- Versión o commit, código y diseño que se utilizarán, y ruta de instalación elegida.
- Límites de frontend y APIs que el consumer debe aportar.
- Duración de la observación, asistencia disponible y método de seguimiento.
- Cómo registrar un issue reproducible o proponer un cambio, sin incluir datos privados.
- Qué evidencia de uso puede conservarse y qué datos quedan privados.

Los precios históricos de competidores son contexto de [investigación](research-saas.es.md), no una condición de uso de Aureform. Separar interés verbal, descarga, primer render, integración real, mantenimiento y contribución. Terminar una sesión no hace caducar los derechos de la licencia.

En el seguimiento, comprobar con la persona si incorporó la operación, qué mantuvo o sustituyó, qué bloqueos quedaron y qué asistencia necesitó. Registrar abandono y cambios de enfoque según hechos; publicar problemas técnicos reproducibles y aprendizajes anonimizados.

## Criterios de decisión propuestos

Antes de las sesiones, definir criterios observables y una disponibilidad de mantenimiento sostenible. Esta propuesta orienta la decisión:

| Decisión                     | Evidencia que la apoya                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corregir antes de ampliar    | Un bloqueo reproducible en instalación, conservación de marca, consulta externa, importación o recuperación de formulario; confusión reiterada sobre servicios incluidos. |
| Mantener el enfoque          | Integraciones independientes que completan la tarea prevista, pueden repetirse con la documentación y producen problemas o mejoras que el equipo puede mantener.          |
| Reducir o cambiar enfoque    | El trabajo principal del segmento no encaja con las operaciones entregadas, o necesita servicios que el paquete frontend no proporciona.                                  |
| Priorizar nuevas operaciones | Observaciones de uso que hacen necesario inbox, uso, facturación, auditoría o webhooks; registrar tarea y efecto esperado.                                                |

No decidir expansión únicamente por elogios visuales, estrellas o descargas. Reportar las tareas y el contexto que expliquen cada decisión. Un grupo de 8–12 entrevistas y 3–5 integraciones ayuda a descubrir problemas de uso; no estima conversión o prevalencia en el mercado.

## Informe posterior y pendientes

El informe, cuando exista, debe separar método, participantes cualificados, tareas ejecutadas, resultados con asistencia, uso posterior y limitaciones. Las inferencias deben apuntar a observaciones concretas.

Source, las guías y el registro de 96 entradas contienen APIs, ejemplos e inventario reales. Los [checkpoints 1.2](release-checklist-1.2.md) y [1.2.1](release-checklist-1.2.1.md) conservan sus scopes técnicos; no acreditan este piloto futuro. Quedan pendientes participantes, consentimiento, sesiones, servicios del consumer y resultados. La investigación no bloquea la publicación del código abierto.
