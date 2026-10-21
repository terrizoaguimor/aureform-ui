# Communications — preguntas abiertas y experimentos

**Corte documental: 20 de octubre de 2026, America/Bogota. Estado: investigación y plan; integración real pendiente.**

Fuente de diseño: [tablero editable de decisiones y experimentos en Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=341-807). La evidencia nativa del 21 de octubre y sus pendientes están en el [recibo de diseño](../../design/reports/communications-2026-10-21.md).

Este registro identifica qué falta demostrar para un softphone de navegador entrante con Twilio y Telnyx. Una API documentada, una pantalla de ejemplo y una llamada real aceptada son evidencias distintas. Ningún experimento de este documento se declara ejecutado ni autoriza compras, instalaciones, cuentas, llamadas o despliegues.

Referencias de diseño y alcance: [investigación](RESEARCH.md), [matriz de capacidades](CAPABILITY-MATRIX.md), [arquitectura](ARCHITECTURE-RFC.md), [motor de flujos](FLOW-ENGINE-RFC.md), [seguridad](SECURITY-COMPLIANCE.md) y [hoja de ruta](ROADMAP.md).

## 1. Requisitos y decisiones del plan

| ID | Decisión | Consecuencia para las preguntas pendientes |
| --- | --- | --- |
| D01 | Alcance **GLOBAL**, mediante perfiles explícitos por país, tipo, canal, dirección y cuenta. | El laboratorio US no define la cobertura del producto. Una combinación desconocida no se habilita por inferencia. Diferenciar país del número empresarial, destino y ubicación del agente. |
| D02 | Backend de referencia **Node.js/TypeScript + Docker**, portable. | La demo estática consume servicios externos; no se convierte en servidor de telefonía. Hosting, almacenamiento y operación se dimensionan después de elegir la topología. |
| D03 | **MVP primero: voz entrante con dos proveedores, fase P1.** | Recorrido mínimo: entrada → horario → FIFO → softphone → cierre e historial. WhatsApp, dialer, IA y editor visual completo no bloquean ese primer recorrido. |
| D04 | **Voice AI portable primero** cuando se aborde IA, en P5. | Es una preferencia de arquitectura, no una entrega anterior a P1. STT/TTS/LLM y transporte deben poder sustituirse; IA nativa del carrier queda como opción posterior. |
| D05 | Laboratorio futuro US: **un número por proveedor, dos agentes compartidos, FIFO y grabación OFF**. | Son dos números en total. Capacidad por agente, reservas, topología y presupuesto se deben cerrar antes de usar recursos reales. |
| D06 | Communications y sus bindings se distribuyen de forma selectiva. | Twilio, Telnyx y React Flow no se incorporan como dependencias pesadas de la landing global. Separar contratos comunes de tipos e imports de SDK. |
| D07 | La entrega presente es el conjunto de **siete documentos de investigación**, sin código de integración. | Un RFC o una matriz no acreditan implementación, interoperabilidad ni aceptación de producción. |
| D08 | **Figma es la fuente y la paridad comprende TODA la UI**, incluidos pendientes de funcionalidades ya implementadas. | Recuperar la base existente antes de implementar nuevas pantallas. Cada UI futura necesita nodos, mapa de estados, móvil, temas, interacción y accesibilidad. |
| D09 | **n8n no pertenece al core**. | La cola, el routing, el runtime de voz y la ejecución básica no dependen de n8n. Cualquier conector de automatización sería opcional y separado. |

**Requisitos expresos del usuario:** investigación documental open source para Twilio y Telnyx (dos proveedores en D03), entrega sin integración de producción (D07) y fuente nativa Figma con paridad de la UI (D08). El alcance GLOBAL (D01), Node/Docker (D02), la prioridad del runtime IA portable (D04), el orden de fases y las demás elecciones técnicas y de laboratorio son propuestas del plan por revisar; no son autorizaciones de producción. Los experimentos investigan sus condiciones de ejecución y evidencia.

## 2. Qué evidencia existe y qué no demuestra

### Diseño y repositorio

| Evidencia al corte | Referencia exacta | Límite y consecuencia |
| --- | --- | --- |
| Lectura estructural **inicial del 20 de octubre**: 7 páginas, 714 variables, 14 estilos de texto y 6 estilos de sombra. Las páginas inspeccionadas incluyen Suite 1.1–1.3 e Image assets 1.2.1. | [Archivo Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N), [docs/communications/RESEARCH.md:69](RESEARCH.md#3-auditoría-del-punto-de-partida-de-aureform). | Es el inventario inicial, no el conteo final tras la recuperación ni una revisión integral de vistas, estados o interacciones. |
| Recuperación nativa del **21 de octubre**: fuentes nuevas y actualizadas, 24 capítulos web completos y revisión nativa acotada de Landing, Quality y Changelog en EN/Dark/desktop. | [Registro fechado de recuperación](../../design/reports/communications-2026-10-21.md). | Acredita creación y revisiones concretas. No certifica navegador, todos los breakpoints, idiomas, estados ni paridad integral 1.4/1.5; esos gates siguen abiertos. |
| **69 raíces nativas históricas y 92 plantillas/mappings Code Connect locales sin publicar**, asociados al handoff congelado **1.2.1**. | [docs/figma-distribution.es.md:28](../figma-distribution.es.md#código-diseño-y-evidencia), [design/maps/routes.md:3](../../design/maps/routes.md#native-route-map). | Este baseline histórico no se sustituye por los nuevos conteos estructurales ni certifica ampliaciones posteriores. |
| El manifiesto local tiene etiqueta 1.4.0, 92 plantillas y validación con `synthetic-figma-stub`; `liveFigmaRuntimeTested` y `cloudRegistered` son `false`. Declara la ampliación 1.4 como `source-only`. | [.figma/code-connect-manifest.json:3](../../.figma/code-connect-manifest.json#L3), [:48](../../.figma/code-connect-manifest.json#L48), [:56](../../.figma/code-connect-manifest.json#L56), [:95](../../.figma/code-connect-manifest.json#L95), [:100](../../.figma/code-connect-manifest.json#L100). | Una versión local del manifiesto o `pendingNativeMappings: 0` dentro de su alcance no prueban nuevos masters nativos ni cobertura total. |
| El inventario de fuente **1.5.0** declara **127 entradas de registry y 135 vistas**, antes de expandir idiomas. | [docs/integrations/coverage-audit.md:60](../integrations/coverage-audit.md#inventory-and-evidence-boundaries). | Son unidades diferentes de raíces Figma y mappings. Las ampliaciones 1.4/1.5 conservan estado de fuente y paridad nativa pendiente; no son un nuevo hecho de diseño aceptado. |
| `AppPage` usa `MotionSystem` con ``key={`${locale}:${path}`}``. | [src/components/app-page.tsx:243](../../src/components/app-page.tsx#L243). | Ese subárbol se remonta al cambiar ruta o idioma. Un host de voz ubicado allí podría destruir listeners, audio o registro; no existe prueba de continuidad por navegación. |
| `importsOf` alcanza imports de tipos y dinámicos literales; `dependencyClosure` consulta dependencias del `package.json` raíz. | [scripts/lib/source-graph.mjs:48](../../scripts/lib/source-graph.mjs#L48), [:218](../../scripts/lib/source-graph.mjs#L218), [:237](../../scripts/lib/source-graph.mjs#L237). | Lazy loading en navegador no garantiza instalación selectiva. Un manifiesto opcional independiente no modifica por sí solo la resolución del generador. |
| CLI pública `list/init/add`; `add` ofrece `--dry-run`/`--diff`, protege archivos existentes y registra hashes. No hay comando público de actualización automática ni opción `--namespace`. | [bin/aureform.mjs:27](../../bin/aureform.mjs#L27), [:50](../../bin/aureform.mjs#L50), [:155](../../bin/aureform.mjs#L155), [:1110](../../bin/aureform.mjs#L1110), [:1374](../../bin/aureform.mjs#L1374). | El recibo no implementa merge automático de código editado. Namespace, aliases, archivos y rutas de Communications requieren pruebas futuras de distribución. |
| Hay UI reutilizable para AI, tablero/kanban/pipeline, calendario, mail/inbox y chat; también hub y workbenches de integración. | [src/components/app-page.tsx:152](../../src/components/app-page.tsx#L152), [:185](../../src/components/app-page.tsx#L185), [src/components/integrations/integration-hub.tsx:1](../../src/components/integrations/integration-hub.tsx#L1). | Son patrones de producto reutilizables. No acreditan bandeja SMS/WhatsApp conectada, números operativos, audio, routing ni adaptadores telefónicos reales. |
| Existen seis paletas, Light/Dark, niveles de movimiento y tratamiento de `prefers-reduced-motion`; QA y bindings opcionales tienen alcance declarado. | [src/lib/appearance.ts:1](../../src/lib/appearance.ts#L1), [src/components/motion-system.tsx:59](../../src/components/motion-system.tsx#L59), [docs/integrations/coverage-audit.md:310](../integrations/coverage-audit.md#scope-of-verification-and-retained-evidence), [:318](../integrations/coverage-audit.md#scope-of-verification-and-retained-evidence). | Typechecks, roundtrips offline, Axe y visitas de la demo no prueban SDK de voz, eventos del carrier, facturación ni paridad nativa. |

**Estado del diseño:** recuperación e inventario de paridad en progreso; aceptación pendiente hasta disponer de evidencia nativa actual. Los registros históricos conservan su fecha y alcance. Capturas, SVG, conteos coincidentes y Code Connect local sirven como apoyo, pero no sustituyen masters editables, propiedades, bindings y mapas de estados.

### SDKs y operaciones

En este documento, **Nativo** significa primitiva oficial documentada, no integración aceptada en Aureform; **Infraestructura** requiere orquestación o servicios adicionales; **Parcial** tiene restricciones; **No verificado** carece de prueba suficiente o presenta conflicto.

| Superficie | Hecho documental/versionado | Clasificación y pendiente |
| --- | --- | --- |
| Twilio Voice JS **2.18.5** | Metadata publicada con `gitHead` `003820c95bd592bc7fbb6fd8f6231c20e8ad02bc`. `Device.register()` habilita recepción; `tokenWillExpire` usa `tokenRefreshMs`, **10 s** por defecto. `updateToken()` advierte posible pérdida de audio de **~1 s** durante actualización. | Nativo. Confirmar artefacto publicado, ciclo de registro y renovación real antes de aceptar continuidad. [Metadata](https://registry.npmjs.org/@twilio%2fvoice-sdk/2.18.5), [Device fijado, líneas 341 y 827](https://github.com/twilio/twilio-voice.js/blob/003820c95bd592bc7fbb6fd8f6231c20e8ad02bc/lib/twilio/device.ts#L827), [referencia Device](https://www.twilio.com/docs/voice/sdks/javascript/twiliodevice). |
| Telnyx WebRTC JS **2.28.0** | Metadata con `gitHead` `ee2d3dabc1bc202abf9e8e6aacc5d25209d5c419`. El código admite `login({ creds: { login_token } })`; aviso `34001`/`TOKEN_EXPIRING_SOON` a **120 s**, con payload de warning envuelto. | Nativo en código fijado; renovación real no verificada. `login()` puede retornar sin actualizar credenciales si el socket no está vivo. [Metadata](https://registry.npmjs.org/@telnyx%2fwebrtc/2.28.0), [BaseSession fijado, línea 671](https://github.com/team-telnyx/webrtc/blob/ee2d3dabc1bc202abf9e8e6aacc5d25209d5c419/packages/js/src/Modules/Verto/BaseSession.ts#L671), [warning fijado](https://github.com/team-telnyx/webrtc/blob/ee2d3dabc1bc202abf9e8e6aacc5d25209d5c419/packages/js/docs/error-handling.md). |
| Conflicto de renovación Telnyx | La guía recomienda `client.updateToken(newToken)` y aviso de aproximadamente **1 h**; esa superficie no coincide con la versión fijada. | No verificado: no crear una interfaz común ficticia. Resolver con código/declaraciones del paquete publicado fijado y pruebas reales independientes. [Guía de autenticación](https://developers.telnyx.com/docs/development/webrtc/js-sdk/how-to/authenticating-your-app). |
| Expiración | Twilio Access Token admite máximo **24 h**; Telnyx JWT vence a las **24 h o con su telephony credential**, lo que ocurra primero. | No inventar soporte para TTLs más cortos ni usar los 10/120 s de aviso como TTL. La política de emisión pertenece al contrato de seguridad. [Twilio](https://www.twilio.com/docs/iam/access-tokens), [Telnyx](https://developers.telnyx.com/docs/voice/webrtc/auth/jwt). |
| Controles básicos Twilio | `accept`, `reject`, `ignore`, `mute`, `sendDigits` y `disconnect` tienen semánticas diferentes. `ignore` no equivale a rechazar remotamente. No hay métodos públicos `Call.hold()` o `Call.transfer()`. | Nativo para primitivas locales; hold/transfer requieren infraestructura. [Call](https://www.twilio.com/docs/voice/sdks/javascript/twiliocall), [superficie pública](https://twilio.github.io/twilio-voice.js/classes/Call.html). |
| Controles básicos Telnyx | `answer`, `muteAudio`/`unmuteAudio`, `dtmf`, `hangup`, `hold`/`unhold`/`toggleHold`; no método público `Call.transfer()`. El fallo de hold puede devolver `false` y emitir `HOLD_FAILED`. | Nativo para estas primitivas; transferencia requiere infraestructura. No confiar exclusivamente en un `catch`. [Call](https://team-telnyx.github.io/webrtc/classes/Call.html), [BaseCall fijado](https://github.com/team-telnyx/webrtc/blob/ee2d3dabc1bc202abf9e8e6aacc5d25209d5c419/packages/js/src/Modules/Verto/webrtc/BaseCall.ts). |
| Navegadores y móvil | Twilio publica matriz por SO/navegador N…N−2; Telnyx publica su propia matriz, con iOS Safari y restricciones distintas para Chrome/Firefox iOS. | Parcial: certificar combinaciones concretas. No trasladar la matriz de un proveedor al otro. **Segundo plano móvil sin garantía**; push nativo APNs/FCM no acredita recepción de llamadas en JS suspendido. [Twilio](https://www.twilio.com/docs/voice/sdks/javascript#supported-browsers), [TelnyxRTC](https://team-telnyx.github.io/webrtc/classes/TelnyxRTC.html), [push nativo](https://developers.telnyx.com/docs/voice/webrtc/push-notifications). |

## 3. Prioridades, responsables y costos

Las fases P1–P7 corresponden a la [hoja de ruta](ROADMAP.md#4-fases-y-esfuerzo). La prioridad de investigación no adelanta una funcionalidad a su fase de entrega.

| Prioridad | Preguntas | Qué bloquean |
| --- | --- | --- |
| **Crítica** | E01–E07, E09 y control mode de E10. | Fuente Figma y paridad de la base; contrato distribuible, sesión estable, recepción real, exclusión de agentes, finalización y costo del MVP P1. |
| **Alta después de P1** | E08; E11 y E16 antes de P5. | Hold/transfer de P2 y la topología/licencias de IA portable. Estos experimentos no son condición para contestar la primera llamada del MVP. |
| **Condicional al canal/opción** | E12–E15 antes de P4; comparación de IA nativa de E10. | WhatsApp y opciones alojadas. Una capacidad no demostrada permanece deshabilitada en el perfil correspondiente. |

**Responsables propuestos:** Diseño/Figma; Frontend y distribución; Backend/routing; Ingeniería de SDK/adaptadores; Media/Voice AI; Operación y costos; Producto/perfiles; Legal/licencias; QA independiente. Son roles por asignar, no aceptación de trabajo ni atribución de resultados.

**Costos propuestos:** las horas de cada experimento son estimaciones de investigación y preparación de evidencia, no esfuerzo total de implementación ni horas ya consumidas. No se suman mecánicamente porque comparten preparación. La revisión documental no requiere gasto en proveedores.

Para pruebas reales de P1, la referencia presupuestaria provisional es **USD 75 compartidos**, no por experimento: 30 telecom, 25 infraestructura y 20 contingencia, para una ventana de hasta un mes. Es una propuesta pendiente de cotización, recursos concretos y autorización; véase [docs/communications/ROADMAP.md:315](ROADMAP.md#7-modelo-de-costos-del-laboratorio-p1). IA y WhatsApp quedan fuera de esa referencia.

El costo real se obtiene por escenario: **dos rentas de número + unidades cobrables de cada pierna + espera contestada + participante-minutos de conferencia + operaciones cobrables + infraestructura e impuestos**. Aplicar solo las unidades que la topología efectivamente use. No deducir gratuidad de una tarifa parcial ni asumir que retirar al agente termina las piernas facturables.

## 4. Experimentos numerados

### E01 — ¿Qué UI tiene fuente nativa y qué falta para paridad ALL UI?

**Prioridad:** crítica; gate compartido antes de nueva UI P1 y al cierre de cada fase. **Estado:** inventario y recuperación pendientes de aceptación completa.

La lectura estructural actual y el baseline histórico son válidos dentro de sus alcances. Falta una reconciliación de todas las vistas/exports actuales y de los pendientes 1.4/1.5, sin convertir la validación local en un nuevo hecho Figma.

1. Reconciliar catálogo/rutas, entradas del registry y componentes compartidos con páginas, nodos y propiedades nativas actuales. Registrar nodos preservados, sustituidos, faltantes y estados sin fuente.
2. Para cada UI existente o futura —incluidos número/perfil, softphone, cola, inbox, calendario, tablero, panel AI y editor de flujos— vincular ruta/símbolo → nodo/instancia → estado → prueba de interacción.
3. Documentar desktop/móvil, EN/ES, seis paletas, Light/Dark, loading/empty/denied/error/recovery y contratos de movimiento/teclado. Usar variantes y variables nativas cuando correspondan; no exigir artificialmente una raíz distinta por cada combinación.

- **Responsables propuestos:** Diseño/Figma + Frontend; QA de interacción.
- **Costo propuesto:** 8–16 h para inventario y mapa de brechas; recuperación nativa por estimar tras conocer vistas/estados faltantes. Sin gasto cloud asumido.
- **Gate:** inventario nativo actual con fecha, alcance y IDs; preservar recibos históricos. Recuperación en progreso no equivale a gate cerrado.
- **Evidencia exigida:** lectura nativa posterior a cada reparación, propiedades/bindings, mapa de estados, cobertura explícita de rutas/exports y resultados de interacción/accesibilidad. Publicación de Code Connect se informa por su estado real.
- **Aceptación:** toda UI del alcance tiene fuente editable y trazabilidad; los pendientes previos quedan cerrados o impiden aceptación de paridad completa. Ninguna captura, conteo, stub o screenshot diff cierra por sí solo ALL UI.

### E02 — ¿Cómo se expresa elegibilidad GLOBAL sin prometer capacidades desconocidas?

**Prioridad:** crítica para P1; mantenimiento por canal/fase.

La pregunta no es qué único país elegir, sino qué dimensiones y procedencia hacen comprobable una combinación. País empresarial, destino, tipo de número, canal, dirección y cuenta pueden cambiar restricciones y costos.

1. Revisar perfiles de ejemplo US y al menos un perfil no US solo documental, distinguiendo número disponible, adquirido, pendiente regulatorio y habilitado para la capacidad.
2. Mostrar resultados `permitido`, `denegado`, `condicional` y `desconocido` con fuente, fecha, cuenta y motivo; comprobar que un cambio de canal/dirección no conserva permisos de otra combinación.
3. Revisar filtros, selección de cuenta y estados vacíos con inbox/calendario/tablero existentes; no presentar fixtures de números como inventario comprado.

- **Responsables propuestos:** Producto/perfiles + Ingeniería de adaptadores; Frontend.
- **Costo propuesto:** 4–8 h documentales; cotizaciones/registros reales fuera de esta fase.
- **Gate:** D01 y matriz de capacidades vigente; autorización de cuenta consumidora definida en seguridad.
- **Evidencia exigida:** tabla de combinaciones con origen de cada regla y ejemplos de UI/nodos; casos desconocido/denegado.
- **Aceptación:** el perfil US de laboratorio no habilita globalmente voz o WhatsApp. No se conserva permiso de una cuenta al cambiar a otra; no se presenta “GLOBAL” como disponibilidad universal.

### E03 — ¿El paquete selectivo mantiene cerrados sus tipos, dependencias, archivos y rutas?

**Prioridad:** crítica antes de distribución P1.

El resolver raíz y los imports de tipos hacen insuficiente mover un SDK a un manifiesto opcional o usar `dynamic import`. El namespace del dominio tampoco crea una opción CLI ni una ruta pública.

1. Trazar, en lectura, la closure propuesta de UI común, contratos, adaptador Twilio, adaptador Telnyx y editor opcional. Identificar qué tipos arrastrarían SDKs o React Flow y qué cambio de distribución necesitarían.
2. Preparar casos futuros de consumidor aislado: solo UI; UI + cada binding por separado; ambos bindings; editor opcional. Comprobar exports y ejemplos TSX con declaraciones reales, sin ambient stubs que oculten dependencias.
3. Verificar en una fase autorizada la CLI con aliases/namespace de archivos, colisiones, destino protegido, hashes del recibo, `--dry-run`/`--diff` e instalación repetida. Revisar explícitamente catálogo, registro de ruta, loader de documentación y EN/ES.

- **Responsables propuestos:** Frontend/distribución + QA de consumidor.
- **Costo propuesto:** 6–12 h de análisis y diseño de casos; instalación/compilación futura en consumidor aislado, sin gasto de carrier.
- **Gate:** límites de exports y dependencias aprobados; no ejecutar generadores para acreditar esta investigación.
- **Evidencia exigida:** closure por entrada, dependencias alcanzadas, ejemplos tipados y recibos futuros de archivos/rutas. Referencias: `source-graph.mjs:48/218/237`, `aureform.mjs:50/447/1110/1374` y `app-page.tsx:209`.
- **Aceptación:** landing/UI común no alcanzan Twilio, Telnyx ni React Flow; cada binding instala exactamente su dependencia. Archivos editados quedan protegidos y la ruta solo aparece si está registrada. No se anuncia auto-update, merge ni registro arbitrario que la CLI no implementa.

### E04 — ¿VoiceSessionHost permanece estable al navegar, cambiar idioma y recuperar la pantalla?

**Prioridad:** crítica para P1.

La ubicación propuesta debe conservar cliente, listeners, llamada y elemento de audio fuera del subárbol con clave ruta/locale. Cambiar pantalla no es logout ni una orden de `unregister()`/`disconnect()`. Cambiar cuenta exige una política distinta.

1. Definir ownership del cliente y del audio remoto, suscripciones de pantallas y cleanup deliberado. Separar proyección de pantalla de estado observado de llamada; identificar doble montaje/listeners duplicados.
2. En laboratorio futuro, contestar y navegar chat → calendario → cola, cambiar EN/ES, tema y tamaño móvil durante audio. Repetir con reconexión y evento tardío mientras la pantalla no está montada.
3. Probar permisos de micrófono/autoplay, dispositivo retirado, suspensión/bloqueo móvil y llamada GSM. Diseñar estado de disponibilidad incierta y recuperación; no simular soporte de background.
4. Verificar teclado y foco: contestar/rechazar/mute/hangup, dialpad, modal de confirmación, anuncios accesibles y retorno de foco. Los atajos no capturan texto de chat, formularios o composición IME; reduced motion no elimina controles ni avisos.

- **Responsables propuestos:** Frontend/SDK + Diseño; QA en navegadores/dispositivos reales.
- **Costo propuesto:** 6–12 h de especificación y matriz; pruebas reales comparten presupuesto P1, hardware por confirmar.
- **Gate:** E01 para diseño; E03 para aislamiento; E05 para registro. Matriz SO/navegador exacta de cada SDK.
- **Evidencia exigida:** identidad de instancia/llamada/audio antes y después, listeners y registro, eventos con orden temporal, prueba audible sin guardar grabación, teclado y lector de pantalla.
- **Aceptación:** navegar/cambiar locale no destruye la sesión ni pierde audio por desmontaje. Logout/cambio de cuenta tiene cierre/reconciliación explícitos. Móvil en primer plano solo se declara para combinaciones probadas; background sigue sin garantía.

### E05 — ¿Qué contrato de renovación ejecuta realmente cada SDK publicado?

**Prioridad:** crítica para P1. **Estado:** conflicto Telnyx y continuidad de audio pendientes.

1. Fijar versión, integridad del paquete publicado y correspondencia con commit; inspeccionar declaraciones/artefacto publicado, no únicamente una rama flotante o una guía.
2. Twilio 2.18.5: observar registro, aviso de 10 s por defecto, `updateToken()` en reposo y durante audio; medir cualquier gap, incluida la posibilidad documental de ~1 s.
3. Telnyx 2.28.0: comprobar warning envuelto a 120 s, reautenticación con `login({ creds: { login_token } })`, callbacks y estado con socket vivo/caído. Contrastar la ausencia de `updateToken` con la guía de 1 h.
4. Probar token expirado, renovación fallida/tardía, credencial terminal y reinicio. Los relojes simulados sirven para unidades; la prueba real debe usar `exp`/caducidad reales soportados, sin inventar un parámetro TTL corto.

- **Responsables propuestos:** Ingeniería de SDK + QA independiente; contrato de emisión revisado con seguridad.
- **Costo propuesto:** 4–8 h para evidencia del paquete; 8–12 h de trabajo activo de laboratorio. La ventana transcurrida depende de la expiración real y puede superar una jornada.
- **Gate:** recursos y presupuesto P1 habilitados para pruebas futuras; versión e integridad fijadas antes de comparar resultados.
- **Evidencia exigida:** operaciones públicas del artefacto, offset observado del warning, ack/eventos de reautenticación, disponibilidad para una segunda llamada y medición de audio sin persistir voz. Dos ejecuciones independientes por proveedor.
- **Aceptación:** cada binding conserva su API real y una política medida de renovación; un retorno de Promise o un token recibido no se presenta como registro válido. El conflicto Telnyx permanece abierto hasta reunir evidencia publicada y real consistente; no se promete renovación sin interrupción.

### E06 — ¿Dos agentes pueden atender ambos carriers con FIFO y leases sin doble asignación?

**Prioridad:** crítica para P1.

Una cola nativa por proveedor no coordina automáticamente la capacidad compartida. Proponer inicialmente capacidad uno por agente; falta cerrar elegibilidad, orden FIFO entre llamadas elegibles y expiración/reconciliación de reservas.

1. Especificar lease de agente/capacidad, propietario, revisión/fencing y vínculo con pierna/reserva. Revisar dos llamadas simultáneas, una Twilio y otra Telnyx, sobre el mismo agente libre.
2. Añadir una tercera llamada, aceptación tardía, pestaña duplicada, heartbeat perdido y reinicio del coordinador. Distinguir abandono real del llamante de pérdida local de signaling.
3. Observar un carrier indisponible mientras el otro funciona. No proponer migración transparente de llamada activa, número o identidad entre proveedores.

- **Responsables propuestos:** Backend/routing + QA de concurrencia; Frontend para proyección.
- **Costo propuesto:** 6–12 h de especificación/simulaciones; pruebas reales comparten presupuesto P1.
- **Gate:** capacidad propuesta acordada, modos de control separados y estados de finalización E07; no fijar duraciones de lease por intuición.
- **Evidencia exigida:** historial correlacionado de reservas, versiones y piernas; casos de carrera/reinicio; resultado real separado por carrier.
- **Aceptación:** cero asignaciones dobles; FIFO se conserva entre llamadas elegibles o documenta exclusión. Una reserva expirada con llamada remota incierta no libera capacidad hasta reconciliarla; el propietario antiguo no puede actuar sobre la nueva reserva.

### E07 — ¿Qué significa contestar, rechazar y finalizar cuando UI, SDK y servidor discrepan?

**Prioridad:** crítica para P1; ampliar la misma matriz en P2/P5.

`disconnect()`/`hangup()` local, fin de una pierna, salida de conferencia y fin de sesión completa no son equivalentes. El control remoto se realiza desde backend sobre recursos concretos: [Twilio Call update](https://www.twilio.com/docs/voice/api/call-resource#update-a-call), [Telnyx hangup](https://developers.telnyx.com/api-reference/call-commands/hangup-call). La limpieza local de Telnyx puede completarse tras timeout de BYE sin demostrar cierre remoto.

| Caso obligatorio en ambos proveedores | Evidencia que debe distinguirse |
| --- | --- |
| Entrada, answer/accept y rechazo antes de respuesta | Invite, estado abierto/activo, audio bidireccional y disposición remota; diferenciar rechazo de ignorar localmente. |
| Mute/unmute y DTMF | Micrófono frente a speaker/deaf; dígitos recibidos por destino. No portar la pausa `w` de Twilio como capacidad Telnyx asumida. |
| Hangup local y hangup desde servidor/remoto | Intención, comando/ack, fin de cada pierna, fin facturable e historial. |
| Socket perdido, red cambiada y reconexión | Registro frente a llamada; audio que sobrevivió o se perdió; correlación de llamada recuperada sin duplicar oferta. |
| Cierre de pestaña, logout, token/credencial inválidos | Cleanup local frente a piernas todavía vivas; capacidad bloqueada hasta reconciliación. |
| Eventos duplicados, tardíos, fuera de orden y comando fallido | UI recuperable y resultado observado; no cerrar por optimismo ni reabrir una sesión terminal por un callback viejo. |
| Hold/transfer fallidos, agente que sale y conferencia/IA que continúa | Original/destino/participantes vivos y cargo residual. Añadir estas filas antes de habilitar P2/P5, no declarar su prueba en P1. |

1. Ejecutar primero casos simulados de proyección y luego la matriz P1 con cada proveedor independientemente. Configuración de recovery se registra explícitamente; `hangupOnBeforeUnload: false` no mantiene vivo un proceso suspendido.
2. Tras cada fallo, consultar y reconciliar estados remotos de piernas/participantes antes de marcar finalización o devolver el agente a FIFO.
3. Repetir operaciones terminales y errores del backend; determinar qué acción reintenta, qué identifica la sesión y cuándo se muestra “resultado incierto”.

- **Responsables propuestos:** SDK/adaptadores + Backend; QA independiente y Operación.
- **Costo propuesto:** 8–16 h de preparación/matriz; consumo real dentro del presupuesto P1, ampliaciones con presupuesto propio.
- **Gate:** E04–E06; procedimiento operativo de reconciliación y parada.
- **Evidencia exigida:** línea temporal UI/SDK/backend/carrier, IDs de piernas, resultado remoto y CDR/uso; sin secretos ni grabación. [Recovery Telnyx](https://developers.telnyx.com/docs/development/webrtc/js-sdk/how-to/handle-reconnection).
- **Aceptación:** las filas P1 pasan por separado en Twilio y Telnyx; no hay llamadas huérfanas ni agente reutilizado con pierna incierta. Reconexión condicional no se vende como garantía. P2/P5 no heredan pruebas de operaciones que P1 no ejecutó.

### E08 — ¿Qué hold y transferencia puede habilitarse sin inventar métodos comunes?

**Prioridad:** alta, P2 después del MVP entrante.

Twilio no tiene métodos SDK públicos hold/transfer: el backend puede mantener un participante con `hold: true`/`holdUrl` o cambiar el flujo remoto. Telnyx tiene hold/unhold SDK, pero eso no equivale a hold de conferencia; su transferencia usa Call Control. Fuentes: [Twilio Conference Participant](https://www.twilio.com/docs/voice/api/conference-participant-resource), [Telnyx transfer](https://developers.telnyx.com/api-reference/call-commands/transfer-call), [hold de participantes](https://developers.telnyx.com/api-reference/conference-commands/hold-conference-participants).

1. Separar mute local, hold de pierna WebRTC, música al llamante y hold de participante. Probar error/`false`, doble click y unhold tras reconexión.
2. Describir transferencia fría y atendida con originales, consulta, destino y dueño de la finalización. Confirmar qué backend/conferencia se usa en cada perfil.
3. Probar destino ocupado/no-answer, rechazo, cancelación, timeout, aceptación tardía, hangup del original durante consulta y fallo de comando/evento. Inspeccionar también participantes que salen pero quedan aparcados.

- **Responsables propuestos:** Backend/control + SDK; QA de audio y Operación.
- **Costo propuesto:** 6–12 h de investigación; laboratorio P2 con minutos de piernas adicionales, participante-minutos e invocaciones cobrables, por cotizar.
- **Gate:** P1 aceptado, E09 con costos de topología y E10 con modo correcto. UI diseñada en E01 antes de habilitar controles.
- **Evidencia exigida:** secuencia de comandos/eventos y audio efectivo por participante; estado/cargos después de éxito y de cada fallo.
- **Aceptación:** el original no queda abandonado ni se elimina antes de confirmar el destino según estrategia. Si la transferencia falla, UI y backend preservan/reconcilian la llamada original y liberan el destino. No aparece un botón activo sustentado solo en un método inexistente.

### E09 — ¿Cuánto cuestan realmente la cola, la conferencia y las piernas residuales?

**Prioridad:** crítica antes del laboratorio P1; repetir por topología P2/P5.

Las tarifas públicas distinguen voz, browser/app, conferencia y otras operaciones; una única tarifa por minuto no basta. Fuentes consultadas: [Twilio Voice US](https://www.twilio.com/en-us/voice/pricing/us), [Telnyx Voice API](https://telnyx.com/pricing/voice-api).

1. Dibujar dos alternativas de entrada/FIFO: espera/bridge mínimos y conferencia cuando sea necesaria. Identificar cuándo se responde, cuántas piernas/participantes existen y qué unidad dispara cada cargo.
2. Cotizar renta de un número US por proveedor y el escenario de dos agentes, incluidos espera contestada, held, cancelación y leg que sigue viva tras salida local.
3. En laboratorio futuro, conciliar llamadas breves, espera y fallo de cierre con CDR, uso facturado y recibo de cuenta. Verificar grabación OFF en número, flujo/conferencia, SDK y automatismos de IA.

- **Responsables propuestos:** Operación/costos + Backend; QA para correlación.
- **Costo propuesto:** 4–8 h documentales; presupuesto P1 compartido provisional. P2/P5 no se financian implícitamente con esa reserva.
- **Gate:** cotización de cuenta/país/unidades, límites de uso y autorización concreta antes de gastar.
- **Evidencia exigida:** topología, tarifas con fecha/moneda, IDs de uso, duración cobrable, impuestos y recibo real; distinguir estimación, usage report y factura.
- **Aceptación:** cada unidad cobrada se explica por un recurso observado; diferencias quedan conciliadas. Cola no se presenta como espera gratuita, conferencia no se cobra teóricamente cuando no existe y grabación/almacenamiento no se activan.

### E10 — ¿Qué control mode permite cada operación Telnyx y cómo resolver el conflicto de IA nativa?

**Prioridad:** crítica para el modo de P1; condicional para IA nativa posterior.

La [guía de compatibilidad de soporte](https://support.telnyx.com/en/articles/8118086-texml-and-telnyx-voice-api-compatibility) desaconseja mezclar TeXML y Call Control y extiende esa advertencia a AI Assistants. La [guía actual de AI Assistant](https://developers.telnyx.com/docs/voice/programmable-voice/ai-assistant-start) documenta `answer`/`dial` con `assistant.id` y `ai_assistant_start` sobre Call Control. La contradicción sobre IA no habilita mezclar paradigmas.

1. Registrar control mode por conexión/perfil y mantenerlo durante la llamada. TeXML y Call Control usan conexiones/rutas de prueba separadas; no reutilizar un ID de webhook para emitir comandos de otro modo.
2. Antes de ofrecer IA nativa, contrastar versiones, esquema y respuesta técnica vigente con pruebas independientes de inicio/stop/handoff, éxito y fallo, en cada modo soportado.
3. Verificar que HTTP exitoso/conversación creada no demuestra primer audio. Investigar `start_failed` y `conversation.ended`: en Call Control detener el asistente no equivale a colgar la llamada.

- **Responsables propuestos:** Ingeniería Telnyx/control + Media; QA independiente.
- **Costo propuesto:** 4–8 h para ADR de modo; comparación IA 6–12 h adicionales y consumo propio por cotizar, excluido de P1.
- **Gate:** modo seleccionado antes de operaciones remotas; IA portable sigue siendo baseline P5 y esta alternativa no se convierte en dependencia.
- **Evidencia exigida:** matriz operación/modo, fuentes fechadas, paquete/API fijados y pruebas de cuenta/legs/audio. Respuesta técnica que delimite el conflicto, sin tomar soporte antiguo o guía nueva como certificación universal.
- **Aceptación:** ninguna llamada mezcla TeXML/Call Control. IA nativa permanece no verificada hasta resolver compatibilidad y demostrar fallback/cierre; finalizar conversación no deja una llamada facturable sin dueño.

### E11 — ¿Cómo se entrega una llamada de IA portable a un humano sin confundir WebRTC, SIP y conectores Cloud?

**Prioridad:** alta de investigación; gate P5 después de voz estable.

Un agente en una room LiveKit/SIP y un agente humano con Twilio.Device/TelnyxRTC pertenecen a topologías distintas. El SDK del softphone no se convierte en participante LiveKit por compartir “WebRTC”.

| Alternativa a comparar | Frontera real |
| --- | --- |
| Softphone WebRTC nativo del carrier | Registro y pierna de navegador propios del proveedor; control remoto mediante backend. |
| Carrier SIP → LiveKit/SIP → runtime portable | SFU/SIP, codecs, red, room, dispatch y handoff adicionales. Existe [SIP self-hosted](https://docs.livekit.io/transport/self-hosting/sip-server.md); eso no incorpora un conector Cloud. |
| Media Streams → pipeline propio | Adaptación distinta por carrier; no asumir codecs, buffering o cierre equivalentes. |
| Conector Twilio por WebSocket de LiveKit | La [documentación del conector](https://docs.livekit.io/telephony/connectors/twilio/) exige **LiveKit Cloud**. Agents pueden ejecutarse fuera de Cloud; el conector no pasa a ser self-hosted. |
| Conector WhatsApp de LiveKit | También [Cloud-only](https://docs.livekit.io/telephony/connectors/whatsapp/); no prueba compatibilidad con el backend portable ni con PSTN. |

1. Dibujar trayectorias de audio/control/estado para IA → humano navegador, humano SIP y retorno a cola. Identificar quién posee, drena y termina cada pierna, stream y room.
2. Comparar SIP portable y streams propios sin convertir Cloud o IA del carrier en requisito. Registrar qué transferencia usa REFER, nueva pierna o conferencia y cuáles quedan fuera de una topología concreta.
3. En laboratorio P5 futuro, probar interrupción, silencio inicial, caída del runtime/modelo, humano no-answer y cierre durante handoff; medir audio real, latencia y costo, sin grabación persistente.

- **Responsables propuestos:** Media/Voice AI + Backend/control; Operación y QA de audio.
- **Costo propuesto:** 8–16 h de ADR; SIP/SFU/TURN, cómputo y STT/TTS/LLM por dimensionar y cotizar separadamente.
- **Gate:** P1/P2 pertinentes, E08–E10 y E16; contratos de medios y ownership aceptados.
- **Evidencia exigida:** diagramas por alternativa, endpoints/interfaces verificadas, codecs, cierre de recursos, medidas y recibos del handoff en ambos carriers.
- **Aceptación:** runtime portable probado sin conector Cloud obligatorio; handoff efectivo al endpoint elegido y fallback cuando falla. Una librería JS/TS o Docker no basta para declarar portable toda la trayectoria.

La documentación de [LiveKit on Telnyx](https://developers.telnyx.com/docs/livekit/compatibility) contiene aviso de retirada, mientras su índice aún lo presenta como beta. Esa oferta no se adopta como baseline ni como evidencia de equivalencia con LiveKit Cloud/self-hosted.

### E12 — ¿Qué contrato de permisos WhatsApp ofrece realmente Telnyx y qué ocurre con Turquía?

**Prioridad:** condicional; gate P4, sin bloquear voz entrante PSTN.

La [guía Telnyx Calling](https://developers.telnyx.com/docs/messaging/whatsapp/business-calling) documenta habilitación y conceptos de permiso; no queda verificado el contrato completo para solicitar/consultar permisos individuales y recibir sus cambios. `calling_settings.enabled` no demuestra permiso de un destinatario.

1. Obtener esquema/documentación de cada operación de consentimiento, estados temporal/permanente, revocación/expiración y correlación usuario/número/cuenta. Separar permiso de messaging de permiso de llamada.
2. Conciliar la restricción de **TR/Turquía** entre documentación Meta/BSP y registros previos. Diferenciar país del número empresarial y país del receptor; una fila de pricing de Turquía no acredita autorización saliente.
3. En un perfil futuro elegible, probar ausencia/denegación/expiración/revocación y destino permitido. Verificar la frontera VoIP/SIP y restricciones de bridge con PSTN; no usar el laboratorio US como prueba de WhatsApp outbound.

- **Responsables propuestos:** Ingeniería WhatsApp/Telnyx + Producto/perfiles; QA.
- **Costo propuesto:** 6–12 h de contrato; recursos WABA/BSP y mensajes/llamadas por cotizar, fuera de P1.
- **Gate:** E02, E14 y E15; ninguna operación de cuenta durante investigación.
- **Evidencia exigida:** esquema y versión API, confirmación de soporte por perfil, payloads/redacciones de pruebas futuras y estado antes/después. [Registro de conflicto](RESEARCH.md#8-whatsapp-business-investigar-messaging-y-calling-por-separado), [anuncio Twilio con restricción TR](https://www.twilio.com/en-us/blog/products/launches/generally-available-whatsapp-business-calling-twilio-voice).
- **Aceptación:** permiso ausente/desconocido bloquea outbound; TR permanece condicional/deshabilitado hasta conciliación aplicable. La disponibilidad PSTN o un número comprado no habilitan WhatsApp Calling.

### E13 — ¿Qué cuotas 5/100 y 1.000/5.000 y qué cobro desde 1-Oct-2026 aplican a la cuenta?

**Prioridad:** condicional; gate P4 y estimación económica del canal.

Twilio mantiene **5 llamadas por 24 h tras permiso y 1.000 concurrentes por sender** en su [guía Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling); Telnyx también publica 1.000 concurrentes. Los valores **100** y **5.000** del registro Meta requieren conciliación de versión, unidad y perfil. No son dos defaults intercambiables.

La investigación registra cambios de billing desde **1 de octubre de 2026**, incluida franquicia de service messages y utility dentro de ventana: [docs/communications/RESEARCH.md:181](RESEARCH.md#cambio-de-precios-y-políticas-que-impide-asumir-reglas-antiguas). El contrato y recibo aplicables todavía no están probados.

1. Crear una tabla límite/unidad/ventana/ámbito: usuario, número, sender, WABA, portfolio, cuenta o concurrencia. Separar sandbox, documentación general y límite efectivo BSP.
2. Leer límites efectivos y rate cards vigentes en una fase autorizada; obtener confirmación de discrepancias sin agotar cuotas mediante campañas.
3. Conciliar una muestra mínima controlada posterior a 1-Oct-2026: service, utility dentro/fuera de ventana, permiso de llamada y voz entrante/saliente elegible. Separar Meta, BSP, telefonía y otros cargos.

- **Responsables propuestos:** Operación/costos + Ingeniería WhatsApp; Producto.
- **Costo propuesto:** 6–12 h de conciliación; muestra real con presupuesto propio, recipients internos y límites explícitos.
- **Gate:** E12, E14–E15 y rate cards de cuenta/moneda/fecha. No afirmar exenciones universales.
- **Evidencia exigida:** límites de cuenta, versión documental, categoría/ventana reales, price sheet y **recibos reales**. [Meta permissions](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/user-call-permissions/), [FAQ](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/faq/), [pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/).
- **Aceptación:** queda explicado si cada discrepancia es versión, sandbox, implementación BSP o límite de cuenta. El costo calculado coincide con el recibo o conserva una diferencia abierta. “Inbound gratis en Meta” nunca se convierte en “costo total cero”.

### E14 — ¿Qué implementación Embedded Signup v4 ofrece cada BSP para nuestro operador?

**Prioridad:** condicional; gate de onboarding P4.

Twilio anunció soporte GA de Signup v4 en Console el 30-Sep-2026; eso no certifica el flujo ISV/BSP de un producto consumidor. La versión de session info o Graph API no demuestra versión v4. Fuentes: [anuncio Twilio](https://www.twilio.com/en-us/changelog/whatsapp-esu-v4), [guía Telnyx Tech Provider](https://developers.telnyx.com/docs/messaging/whatsapp/embedded-signup/tech-provider), [Meta v4](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4).

1. Precisar quién posee Meta App, configuración de Facebook Login for Business, WABA, número, credit line y relación con el BSP.
2. Obtener evidencia de configuración v4 y del flujo BSP que se usará: estándar, hosted o coexistence; no extrapolar soporte de uno al otro.
3. Diseñar pruebas futuras de alta nueva, cancelación, fallo parcial, repetición y desvinculación, conservando ownership y resultado de provisioning.

- **Responsables propuestos:** Ingeniería onboarding/BSP + Producto; seguridad para permisos.
- **Costo propuesto:** 4–8 h de revisión; app review/soporte/elegibilidad tienen plazo y costo externos por confirmar.
- **Gate:** contrato de operador y producto seleccionado; no crear cuentas/apps en esta entrega.
- **Evidencia exigida:** versión/configuración, productos/permisos solicitados, documentación BSP vigente y prueba autorizada del recorrido completo, sin secretos.
- **Aceptación:** v4 se demuestra en la implementación concreta, no con un anuncio ni un snippet antiguo. Un WABA enlazado no implica Calling, coexistence o todas las capacidades disponibles.

### E15 — ¿Los términos de 2026 permiten el uso concreto de IA en WhatsApp?

**Prioridad:** condicional; gate legal P4 para experiencias AI del canal.

La preferencia por IA portable no resuelve la clasificación contractual del operador. La investigación registra términos de septiembre de 2026 y reglas de AI Providers actualizadas en octubre; deben contrastarse por función real, país y tratamiento de datos. Fuentes: [términos Meta](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform?locale=en_US), [AI Providers](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers/), [Business Messaging Policy](https://whatsappbusiness.com/policy/).

1. Describir casos concretos: atención a clientes de un negocio, asistente incidental y asistente general como función primaria. Identificar operador, modelos, herramientas y finalidades.
2. Obtener texto oficial vigente, fecha efectiva, alcance territorial, excepciones y condiciones de precios/datos aplicables; resolver contradicciones con las afirmaciones comerciales BSP.
3. Revisar clasificación y experiencia de producto con Legal antes de habilitar AI en WhatsApp; no inferir permiso global desde una licencia OSS o desde voz PSTN.

- **Responsables propuestos:** Legal + Producto; Ingeniería AI/datos.
- **Costo propuesto:** 4–8 h de preparación; asesoría contractual externa por cotizar.
- **Gate:** texto contractual accesible y vigente, operador y países concretos; incertidumbre impide habilitar ese perfil AI.
- **Evidencia exigida:** cláusulas/versiones oficiales y decisión de aplicación al caso de uso, con condiciones registradas.
- **Aceptación:** cada caso recibe una decisión aplicable y trazable. La revisión no se presenta como aprobación general de todos los chatbots, mercados o modelos.

### E16 — ¿Qué licencias tienen los pesos concretos y cómo preservar portabilidad sin n8n core?

**Prioridad:** alta de investigación; gate antes de build, descarga implícita, vendoring o distribución P5.

Hay un conflicto verificable de artefactos: upstream Silero VAD publica [MIT](https://raw.githubusercontent.com/snakers4/silero-vad/master/LICENSE), pero [REUSE.toml de LiveKit Agents JS](https://raw.githubusercontent.com/livekit/agents-js/main/REUSE.toml) anota `silero_vad.onnx` como **CC-BY-NC-SA-4.0**. El [MODEL_LICENSE](https://raw.githubusercontent.com/livekit/agents-js/main/MODEL_LICENSE) de LiveKit limita sus modelos al framework LiveKit Agents; la etiqueta Apache del SDK/anotación no sustituye ese texto.

1. Inventariar por artefacto publicado: código, plugin, pesos, modelo de turn detection, ONNX runtime, descarga automática y recursos de ejemplo. Fijar versión, origen y hash antes de resolver atribución/licencia.
2. Conciliar el ONNX empaquetado con upstream y sus permisos reales de uso/redistribución; pedir aclaración si el conflicto persiste. No elegir la licencia conveniente ni generalizar Silero VAD a todos los modelos Silero.
3. Evaluar endpointing/VAD alternativo con artefactos comprobables si los pesos no permiten la distribución prevista. Mantener workflow/routing ejecutables sin n8n; conectores externos conservan contratos y licencias propios.

- **Responsables propuestos:** Legal/licencias + Media/Voice AI; distribución para artefactos.
- **Costo propuesto:** 4–8 h de inventario; revisión/aclaración y pruebas de alternativas por estimar.
- **Gate:** E11 y lista de artefactos fijada. Una separación en servicio Docker no elimina restricciones de pesos.
- **Evidencia exigida:** matriz artefacto/versión/hash/licencia/obligaciones, procedencia y resolución escrita de conflictos; demostración futura de operación sin n8n.
- **Aceptación:** ningún peso se anuncia o redistribuye como Apache por herencia del SDK. Artefactos incompatibles/desconocidos se excluyen o sustituyen; el runtime portable y el core no dependen de n8n.

## 5. Fuentes y límites de verificación

**Corte base de consulta: 20-Oct-2026; adenda de Meta y Figma: 21-Oct-2026.** Son fechas de consulta, no necesariamente de publicación. Los enlaces junto a cada hecho apuntan a fuentes primarias o a registros locales explícitos, conservando su fecha y resultado de acceso. Las referencias a `main`/`master` son lectura documental al corte y requieren pin de artefacto antes de implementación.

| Grupo | Estado de consulta y límite |
| --- | --- |
| SDKs Twilio/Telnyx | Metadata NPM y código de commits fijados accesibles; referencias oficiales consultadas. No instalación ni prueba autenticada. Inspeccionar y probar el artefacto publicado fijado sigue siendo gate E05. |
| Control, precios y LiveKit | Documentación oficial de operaciones, páginas de precios, conectores y self-hosting accesibles. No acreditan cuenta elegible, costo contratado, audio ni handoff aceptado. |
| Licencias Silero/LiveKit | Textos upstream, `REUSE.toml` y `MODEL_LICENSE` accesibles; conflicto documentado. Ramas flotantes no certifican la licencia del futuro binario/peso empaquetado. |
| Meta Calling/pricing/Signup | URLs oficiales referenciadas en la investigación y consultadas; varias lecturas independientes respondieron **429/throttling**. No se marca su contenido como nuevamente verificado por esa respuesta. Las discrepancias y receipts pendientes se conservan en E12–E14. |
| Términos Meta | Research y Security registran una lectura de los [términos canónicos](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform?locale=en_US) consultados el **20-Oct-2026**. Un reacceso independiente remitió a login: ese intento limitado no retira la lectura documentada ni constituye una nueva verificación contractual. La [política pública](https://whatsappbusiness.com/policy/) fue accesible y muestra actualización 23-Sep-2026; no sustituye los términos ni acredita la clasificación AI. |
| Figma | Inventario estructural actual registrado en `RESEARCH.md:69`; mapas y Code Connect tienen alcance histórico/local separado. Recuperación y paridad completa pendientes de evidencia nativa actual. |
| Repositorio y pruebas | Referencias `path:line` corresponden a lectura de fuente. Los recibos existentes conservan su alcance; no hubo build, generador, nueva ejecución de QA ni prueba real de voz para cerrar estos experimentos. |

## 6. Cuándo puede cerrarse una pregunta

Un cierre registra decisión, rol responsable, fecha, perfil/cuenta sin secretos, versión/artefacto, evidencia, costo observado y resultado de los casos de aceptación. Una discrepancia no se borra: se explica qué fuente/capacidad quedó limitada y qué prueba resolvió el conflicto.

La salida documental deja listo un plan revisable. **P1 se acepta únicamente con paridad de toda la UI, recepción real independiente en ambos carriers, dos agentes/FIFO sin doble asignación, cierre reconciliado, grabación OFF y costos comprobados.** Funcionalidades de P2/P4/P5 conservan sus propios gates; ni una captura Figma ni el éxito de un proveedor acreditan el otro.
