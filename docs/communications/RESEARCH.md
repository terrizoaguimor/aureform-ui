# Aureform Communications & AI Contact Center: investigación

Estado: **investigación y propuestas para revisión**. Fuentes consultadas el **2026-10-20**, zona `America/Bogota`, salvo la fecha específica indicada. Base inspeccionada: Aureform **1.5.0**, commit `6fa717365b81336603707d2742420906c878767d`.

Fuente de diseño: [tablero editable de investigación en Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=341-696). La recuperación nativa y sus límites se registran en el [recibo de diseño](../../design/reports/communications-2026-10-21.md); los tableros de comunicaciones son propuestas, no pantallas productivas implementadas.

[Matriz de capacidades](CAPABILITY-MATRIX.md) · [Arquitectura](ARCHITECTURE-RFC.md) · [Flow Engine / Prompt-to-Flow](FLOW-ENGINE-RFC.md) · [Seguridad y cumplimiento](SECURITY-COMPLIANCE.md) · [Hoja de ruta](ROADMAP.md) · [Preguntas y experimentos](OPEN-QUESTIONS.md)

## 1. Recomendación y alcance de esta entrega

Es viable ampliar Aureform como framework open source para construir interfaces de comunicaciones con **Twilio y Telnyx de primera clase**, siempre que se separe UI de ejecución y se limite la afirmación de soporte a combinaciones realmente probadas.

Recomendamos un dominio común, adaptadores explícitos, backend de referencia Node/Docker, un DSL propio y un runtime de voz con IA reemplazable. El sitio y las demos estáticas permanecen útiles sin cuentas. Los flujos con llamadas, mensajes, números, routing durable o medios necesitan infraestructura real.

La primera prueba futura debe ser pequeña: una llamada entrante por cada proveedor, horario de atención, cola FIFO y un agente atendiendo desde un softphone web autenticado. No comenzar con campañas, IA, WhatsApp y compilación visual universal a la vez.

**Esta entrega es documental.** No se compraron números, no se configuraron cuentas/WABA, no se enviaron mensajes, no se realizaron llamadas ni se modificaron los contratos productivos. Ninguna capacidad de carrier está certificada en Aureform por esta investigación.

**Requisitos del usuario incorporados:** investigación documental open source para Twilio y Telnyx; fuente nativa Figma y paridad para lo nuevo y para pendientes previos; sin integración ni operación de producción en esta entrega. **Propuestas del plan por revisar:** modelo global mediante perfiles de elegibilidad; referencia portable Node/Docker; priorizar IA portable frente a un runtime alojado obligatorio.

## 2. Cómo se obtuvo y cómo leer la evidencia

### Niveles de evidencia

| Etiqueta | Significado | Qué no demuestra |
| --- | --- | --- |
| **Hecho verificado: repositorio** | Fuente, contrato, ejemplo, script o recibo inspeccionado. | Que una futura integración de telecomunicaciones funciona. |
| **Hecho verificado: documentación** | Afirmación localizada en documentación, API, código publicado, release note, licencia o norma oficial. | Habilitación de nuestra cuenta, inventario actual, interop o factura. |
| **Hipótesis** | Interpretación o ventaja que requiere experimento o validación de usuarios. | Disponibilidad o demanda del mercado medida. |
| **Decisión propuesta** | Diseño recomendado para Aureform. | API existente o compromiso de implementación aprobado. |
| **No demostrado / no verificado** | Falta evidencia suficiente o hay contradicción. | Que el proveedor no tenga la capacidad; se bloquea esa afirmación hasta resolverla. |

En todas las tablas técnicas, la fecha de consulta general es **2026-10-20**. La columna de disponibilidad se refiere al producto/documento. Los requisitos y restricciones determinan qué cuenta, país, canal, modo, SDK y prueba serían necesarios. Las fechas de anuncios no se confunden con una disponibilidad universal ni con la fecha de consulta.

Prioridad de fuentes: documentación y código oficiales; normas y autoridades; licencias upstream; anuncios oficiales. No usar blogs comerciales como prueba de un contrato ni precios recordados como cotización. Cuando una página tiene contenido dinámico o un lector recibe 429, se consultó el HTML público o la versión oficial indexada; eso no sustituye una API autenticada.

### Agy: invocación real y limitación

Se invocó el CLI instalado **Agy 1.4.3** en modo headless/plan, solicitando **`gemini-4-argon-high`**. El inventario de modelos del CLI incluía ese identificador. Se observaron invocaciones reales de `search_web`, no búsquedas simuladas.

| Ejecución | Inicio y final UTC | Búsquedas observadas | Resultado verificable |
| --- | --- | --- | --- |
| Twilio | 2026-10-21 03:27:34 → 03:36:02 | 19 consultas; 4.606 palabras de borrador. | Proceso hijo exit 0, pero `providerStatus: ERROR`; ejecución **incompleta**. |
| Telnyx | 2026-10-21 03:27:34 → 03:39:25 | 18 consultas; 4.470 palabras de borrador. | Proceso hijo exit 0, pero `providerStatus: ERROR`; ejecución **incompleta**. |

Estas horas son todavía 2026-10-20 en Bogotá. El wrapper rechazó ambos resultados como finalización satisfactoria. La causa concreta del estado de error no quedó acreditada; no se inventa una explicación.

Ejemplos de consultas efectivamente observadas: `Twilio AvailablePhoneNumbers IncomingPhoneNumbers Regulatory Compliance Bundles REST API documentation`, `Twilio Media Streams bidirectional Connect Stream Start Stream audio mulaw mark clear DTMF documentation`, `Twilio Studio REST API v2 Flow definition JSON validate publish revisions documentation`, `Telnyx API v2 available_phone_numbers number_orders regulatory_requirements porting_orders documentation`, `Telnyx Call Control call_control_id call_leg_id call_session_id command_id transfer bridge conference` y `Telnyx TeXML supported verbs unsupported TwiML differences Pay Gather Connect Stream AiAssistant`.

El metadato observable identifica la herramienta de búsqueda, **no acredita independientemente que su backend fuera Google Search Grounding**. Los borradores de Agy se trataron como pistas. Se corrigieron errores sobre MMS, voicemail, URLs, estados de disponibilidad y compatibilidad de modos mediante fuentes oficiales.

No se publican transcripts de herramientas, credenciales, razonamiento interno, redirecciones opacas de grounding ni sesiones privadas. Los hallazgos aceptados aparecen abajo con URLs canónicas verificables.

## 3. Auditoría del punto de partida de Aureform

Disponibilidad de estos hechos: **actual en el commit base**. Consulta: 2026-10-20. Restricción común: las cifras y recibos describen el proyecto existente, no el sistema de comunicaciones futuro.

| Área inspeccionada | Resultado | Fuente |
| --- | --- | --- |
| Stack y licencia | Next 16.4.2, React 19.3.1, TypeScript 5.9.3; Zod declara `^4.3.5` y resuelve **4.6.7**. Node ≥22.18. Fuente original Apache 2.0; paquete raíz privado. | [package.json](https://github.com/terrizoaguimor/aureform-ui/blob/6fa717365b81336603707d2742420906c878767d/package.json), [lockfile](../../pnpm-lock.yaml), [LICENSE](../../LICENSE), [notices](../../THIRD_PARTY_NOTICES.md) |
| Arquitectura y hosting | Export estático, ruta EN/ES y base path; separación de UI, demos y contratos. | [arquitectura](../architecture.md), [next.config.ts](https://github.com/terrizoaguimor/aureform-ui/blob/6fa717365b81336603707d2742420906c878767d/next.config.ts), [Cloudflare](../cloudflare-deployment.md) |
| Integraciones | 65 recetas, 17 familias, 86 elecciones y 248 acciones; 317 bindings de elección/acción auditados. | [auditoría de cobertura](../integrations/coverage-audit.md), [provider coverage](../integrations/provider-coverage.json), [validación de acciones](../integrations/provider-action-validation.json) |
| Contratos/adaptadores | Scope de workspace, valores y operaciones tipadas; HTTP, cancelación, revisiones, errores y adapters locales. No hay call legs, media ni colas telefónicas. | [contracts.ts](https://github.com/terrizoaguimor/aureform-ui/blob/6fa717365b81336603707d2742420906c878767d/src/lib/integrations/contracts.ts), [operaciones](../integrations/operations.md), [browser bindings](../integrations/browser-bindings.md) |
| IA e identidad | Contratos reemplazables; NDJSON v1 de IA para texto/tools, UI de login social y ejemplos de auth. No son un backend de voz ni una autorización multitenant productiva. | [IA](../integrations/ai.md), [identidad](../integrations/identity.md), [aplicaciones](../application-integrations.md) |
| UI y aplicaciones | 127 entradas de registry, 135 vistas de catálogo y 24 capítulos web. Componentes, aplicaciones y workflows reutilizables, con demos locales. | [catálogo](https://github.com/terrizoaguimor/aureform-ui/blob/6fa717365b81336603707d2742420906c878767d/src/lib/catalog.ts), [registry](https://github.com/terrizoaguimor/aureform-ui/tree/6fa717365b81336603707d2742420906c878767d/public/r), [documentación](../website-documentation.es.md) |
| Ejemplos y distribución | CLI local `list/init/add`, ejemplos completos y recibos de instalación. Closure incluye imports de tipos; dependencias del resolver proceden del root. No hay merge/update remoto de código editado. | [registry compatibility](../registry-compatibility.md), [CLI](../cli-updates-1.2.md), [installation verification](../integrations/installation-verification.md), [source graph](https://github.com/terrizoaguimor/aureform-ui/blob/6fa717365b81336603707d2742420906c878767d/scripts/lib/source-graph.mjs) |
| Pruebas históricas | Recibo 1.5.0: 865 pruebas unitarias y una matriz browser acotada de 290 casos por host. Bindings opcionales: seis validaciones TSX y cuatro roundtrips offline. | [QA 1.5.0](../qa-runtime-1.5.0.json), [optional bindings](../integrations/optional-binding-validation.json), [verificación](../verification.md) |
| Diseño y movimiento | Seis paletas, Light/Dark, Manrope/Instrument Serif, shades, hover, gradients, GSAP scoped y Lenis opcional en landing. | [appearance](../appearance.md), [motion runtime](../motion-runtime.md), [tokens](../../design/tokens/README.md), [contribución](../../CONTRIBUTING.md) |
| Figma y distribución | Archivo nativo existente; mapa histórico de 69 raíces y 92 mappings Code Connect locales sin publicar. Ampliaciones posteriores no certificadas por ese mapa. | [Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N), [rutas](../../design/maps/routes.md), [componentes](../../design/maps/components.json), [distribución](../figma-distribution.md) |

La auditoría nativa **inicial del 20 de octubre** encontró páginas Cover, Foundations, Core, Blocks, Templates 1.0, Suite 1.1–1.3 e Image assets 1.2.1; **714 variables, 14 estilos de texto y 6 estilos de sombra**. Es inventario real del punto de partida, no el conteo final tras la recuperación ni una revisión visual completa. El [registro del 21 de octubre](../../design/reports/communications-2026-10-21.md) separa las fuentes recuperadas y las revisiones nativas acotadas de la paridad integral todavía pendiente.

El proyecto ofrece una base fuerte para estados, formularios, tablas, autenticación de ejemplo, workflows y estilos. Faltan dominio telefónico, backend de ejecución, controles de medios, eventos de carriers y pruebas reales. El archivo de diseño también necesita reconciliar las ampliaciones 1.4/1.5. Resolver ambas brechas de forma explícita es parte de la propuesta; no usar el volumen de componentes como prueba de madurez de telefonía.

## 4. Mercado: qué existe y dónde diferenciarse

Comparación documental, no ranking de popularidad ni estudio de adopción. Consulta general: 2026-10-20. Los pain points siguientes son **inferencias de las restricciones observadas**; requieren entrevistas/pilotos para estimar demanda.

| Solución | Ventaja verificable | Disponibilidad y dependencia | Límite / oportunidad para Aureform | Fuentes oficiales |
| --- | --- | --- | --- | --- |
| Twilio Flex | Contact center integrado sobre Twilio, routing y personalización de UI. | Producto comercial; planes y servicios de cuenta. Copilot documentado como Public Beta, sin convertirlo en SLA de Aureform. | Menos ensamblaje, más acoplamiento. Aureform puede ofrecer código editable y dos proveedores sin imponer Flex. | [Qué es Flex](https://www.twilio.com/docs/flex/admin-guide/what-is-twilio-flex), [Copilot](https://www.twilio.com/docs/flex/admin-guide/setup/copilot), [pricing](https://www.twilio.com/en-us/flex/pricing) |
| Twilio Studio | Editor visual, definiciones JSON, API Validate y revisiones. | API v2 documentada; widgets y ejecución Twilio. | Útil como target opcional; no cubre un DSL neutral ni valida todo el negocio. | [REST](https://www.twilio.com/docs/studio/rest-api), [Definition](https://www.twilio.com/docs/studio/rest-api/v2/flow-definition), [Validate](https://www.twilio.com/docs/studio/rest-api/v2/flow-validate) |
| Telnyx Voice / AI | Control de llamadas, SIP/WebRTC, medios y asistentes nativos. | APIs y features por conexión/mode/account; builder/AI workflows con evidencia específica. | Adapter de primera clase y extensiones avanzadas; falta demostrar un contact center equivalente completo y compilación nativa. | [WebRTC architecture](https://developers.telnyx.com/docs/voice/webrtc/architecture), [AI attachment](https://developers.telnyx.com/docs/voice/programmable-voice/ai-assistant-start), [AI Workflows](https://telnyx.com/release-notes/conversation-workflows-ai-assistants) |
| Aircall | Workspace y operación telefónica listos, Smartflows y Power Dialer. | SaaS comercial. Power Dialer Professional, desktop/web, no móvil; capacidad/listas y disponibilidad de agente condicionadas. | Referencia de UX operativa. Aureform ofrecería ensamblaje editable, sin copiar layouts o diseños propietarios. | [Planes](https://aircall.io/pricing/), [Power Dialer](https://support.aircall.io/en-gb/articles/23996034990493), [Smartflows](https://support.aircall.io/en-gb/articles/15411885354013), [Workspace](https://support.aircall.io/en-gb/articles/21534389189149) |
| LiveKit Agents | Runtime de agentes y transporte SIP con guías para ambos carriers. | Agents JS/TS 1.9.3 publicado; servicios de media/SIP adicionales. Conector Twilio WS solo Cloud. | Delegar medios/turnos; construir dominio, UI, routing, compliance y evidencia de handoff. | [Releases](https://github.com/livekit/agents-js/releases), [proveedores](https://docs.livekit.io/telephony/start/providers/), [Twilio Connector](https://docs.livekit.io/telephony/connectors/twilio/) |
| Pipecat | Pipeline de voz portable, transports y modelos sustituibles. | Código BSD-2-Clause; versión 1.13.0 examinada, Python ≥3.11. Dev runner no es servidor productivo. | Alternativa real si supera pruebas; añade un lenguaje a la referencia Node/TS. | [Licencia](https://raw.githubusercontent.com/pipecat-ai/pipecat/main/LICENSE), [versión/requisitos](https://raw.githubusercontent.com/pipecat-ai/pipecat/v1.13.0/pyproject.toml), [deployment](https://docs.pipecat.ai/pipecat/deployment/overview), [telephony](https://docs.pipecat.ai/pipecat/telephony/overview) |
| Chatwoot | Inbox y canales de soporte autoalojables. | Comunidad MIT; enterprise y features comerciales separados. | Buena referencia omnicanal; no asumir Voice/Captain/roles/SLA de planes comerciales como OSS disponible. | [Licencia](https://raw.githubusercontent.com/chatwoot/chatwoot/develop/LICENSE), [self-hosted plans](https://www.chatwoot.com/pricing/self-hosted-plans) |
| FreeSWITCH / Asterisk | Motores PBX y extensiones maduras. | MPL 1.1 y GPL v2/comercial respectivamente, con módulos/operación propios. | Delegar si una topología exige PBX; evitar construir SIP desde cero. Integración externa y módulos embebidos tienen implicaciones de licencia distintas. | [FreeSWITCH LICENSE](https://raw.githubusercontent.com/signalwire/freeswitch/master/LICENSE), [módulos](https://developer.signalwire.com/freeswitch/module-reference/commercial-modules/), [Asterisk licensing](https://docs.asterisk.org/About-the-Project/License-Information/), [Apache/GPL](https://www.apache.org/licenses/GPL-compatibility.html) |
| n8n | Automatización y jobs conectables. | Sustainable Use License, no OSI open source; usos con UI/API/AI de configuración por clientes pueden requerir licencia comercial. | Integración opcional de una instancia del consumidor; no motor canónico distribuido como Apache 2.0 ni transporte de audio. | [Licencia](https://docs.n8n.io/n8n-community-license), [casos de uso](https://support.n8n.io/article/can-i-use-your-license-for-my-use-case), [queue mode](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/enable-queue-mode.md) |

Precios de mercado consultados, **referencias de lista y condiciones, no cotizaciones**: Flex anuncia opciones de usuario activo mensual, usuario nombrado y hora activa; Aircall anuncia Essentials US$30 y Professional US$50 por usuario/mes con facturación anual y mínimo de tres usuarios. Elegibilidad, extras, país y modalidad cambian el total. Las páginas de pricing anteriores son la fuente; no convertir una comparación de licencias en costo de operación equivalente.

### Pain points y oportunidades que validar

| Inferencia / hipótesis de necesidad | Evidencia que la motiva | Respuesta propuesta de Aureform | Validación necesaria |
| --- | --- | --- | --- |
| Una demo atractiva no revela qué falta para recibir la primera llamada. | SDK, token, número, webhook y routing son recursos independientes. | Guía vertical reproducible y estado “local / conectada” inequívoco. | Dos desarrolladores nuevos completan ambos providers siguiendo el ejemplo. |
| “Connected” oculta problemas de micrófono, autoplay o token. | Estados y restricciones de SDK/browser distintos. | Preflight y status por signaling/media/token, con recuperación útil. | Pruebas audio y usability en browsers certificados. |
| La abstracción común elimina capacidades avanzadas. | TaskRouter, Call Control, hold y control modes no equivalentes. | Core común + extensiones tipadas y matriz visible. | Implementar una feature avanzada específica sin romper el consumidor común. |
| Cambios visuales y código quedan desalineados. | La biblioteca histórica no incluye todas las ampliaciones posteriores. | Fuente Figma, hashes, mappings de estados y revisión actual por feature. | Auditoría nativa + comparación visual/funcional de estados, no solo conteos. |
| Facturas difíciles de prever y llamadas huérfanas. | Cobro por piernas, participantes, espera, transferencias y modelos. | Estimación por unidad, límites, reconciliación y cierre remoto auditable. | Recibos reales y pruebas de timeout/unknown sin redial duplicado. |
| Los builders no explican por qué una ruta no se puede publicar. | Validez del JSON no acredita permisos ni capacidades de una cuenta. | Diagnósticos sobre nodos, calendario, perfil y costo, con simulación. | Casos de error observados por operadores, tareas por teclado y comprensión del diff. |
| Las reglas por país/canal cambian después de lanzar. | Regulaciones dinámicas y cambios recientes Meta/SDK. | Snapshots, freshness, owners y perfiles bloqueados hasta revisión. | Proceso de actualización y prueba de un cambio de términos real. |
| “Omnicanal” fusiona identidad, consentimiento o métricas incorrectamente. | Mensaje enviado/delivered/read y permiso de llamada son estados diferentes. | Contactos, canales, conversaciones y ledgers separados. | Pruebas de número reciclado, opt-out, permiso vencido y cuentas distintas. |

La diferenciación no será un mayor número de pantallas. Será una UI elegante y editable con un recorrido real comprobable, límites honestos, costos visibles, fuente de diseño coherente y capacidad de sustituir proveedor/backend.

## 5. Numeración y aprovisionamiento global

| Hallazgo documental | Disponibilidad | Requisitos y restricciones | Fuentes |
| --- | --- | --- | --- |
| Twilio permite buscar por país/tipo y adquirir/configurar/eliminar números propios. | APIs documentadas, sujetas a cuenta e inventario. | Búsqueda no reserva ni acredita aprobación regulatoria. Capacidades pueden variar por número, país y tipo. | [AvailablePhoneNumber](https://www.twilio.com/docs/phone-numbers/api/availablephonenumber-resource), [IncomingPhoneNumber](https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource) |
| Twilio expresa regulación por país, tipo y usuario final. | API y guías disponibles. | No hardcodear reglas; documentos/bundles y aprobación pueden ser previos al uso. | [Regulations](https://www.twilio.com/docs/phone-numbers/regulatory/api/regulations), [guidelines](https://www.twilio.com/en-us/guidelines/regulatory), [Colombia](https://www.twilio.com/en-us/guidelines/co/regulatory) |
| Twilio Port In Request API tiene un alcance limitado. | **Public Beta**, números US no toll-free. | Hasta 1.000 números por request; documentación y condiciones de portabilidad. Países/casos fuera del API pueden requerir soporte/manual. | [Port In Request](https://www.twilio.com/docs/phone-numbers/port-in/port-in-request-api), [Portability](https://www.twilio.com/docs/phone-numbers/port-in/portability-api), [porting guidelines](https://www.twilio.com/en-us/guidelines/porting) |
| Telnyx separa búsqueda, órdenes, reservas y requirement groups. | APIs v2 documentadas. | País/tipo/acción distinguen requisitos; aprobación no equivale a crear una orden. Reservas y cobertura están sujetas a elegibilidad. | [Search](https://developers.telnyx.com/docs/numbers/phone-numbers/number-search), [Orders](https://developers.telnyx.com/docs/numbers/phone-numbers/number-orders), [Reservations](https://developers.telnyx.com/docs/numbers/phone-numbers/number-reservations), [requirements](https://developers.telnyx.com/docs/numbers/phone-numbers/regulatory-requirements), [groups](https://developers.telnyx.com/docs/numbers/phone-numbers/requirement-groups) |
| Telnyx publica Country Coverage y un workflow de porting asíncrono. | APIs/documentos disponibles. | La respuesta de ejemplo no es inventario actual. Órdenes pueden dividirse por país/tipo/operador; LOA/factura/FOC y activación de messaging son pasos independientes. | [Country Coverage](https://developers.telnyx.com/api-reference/country-coverage/get-country-coverage), [porting](https://developers.telnyx.com/docs/numbers/porting/getting-started), [requisitos](https://developers.telnyx.com/docs/numbers/porting/port-in-requirements), [messaging porting](https://developers.telnyx.com/docs/numbers/porting/messaging-porting) |

**Decisión propuesta:** Number Manager muestra `available → reservation/order → regulatory-pending → active`, costos/moneda y bindings por canal. Compra, portabilidad, liberación y cambios de routing requieren permisos y aprobación de su impacto. Portar no permite mover llamadas activas ni garantiza cero downtime.

El alcance global significa que el contrato puede representar cualquier perfil. No significa que todas las combinaciones estén habilitadas. País del negocio, país del número, destino, ubicación del agente y leyes aplicables deben permanecer separados. La [matriz](CAPABILITY-MATRIX.md) registra los perfiles y pendientes; el primer piloto no sirve como certificación de Colombia, UE u otros mercados.

## 6. Telefonía, softphone y contact center

### Operaciones de voz

Disponibilidad: documentación pública para llamadas PSTN, SDK web, SIP, conferencias y grabación. Requisitos: cuenta habilitada, número/conexión, tokens, HTTPS, micrófono, signaling y backend. Restricción común: interop, audio y comportamiento de fallo no probados por esta entrega.

| Operación | Hallazgo y diferencia relevante | Fuentes |
| --- | --- | --- |
| Entrantes/salientes y click-to-call | APIs de llamada y backend pueden iniciar/controlar legs. La UI necesita permiso, consentimiento y presupuesto; marcar un contacto no concede autorización. | [Twilio Call](https://www.twilio.com/docs/voice/api/call-resource), [Telnyx WebRTC architecture](https://developers.telnyx.com/docs/voice/webrtc/architecture), [Telnyx transfer](https://developers.telnyx.com/api-reference/call-commands/transfer-call) |
| WebRTC y dispositivos | Twilio `Device.register()` habilita entradas; Telnyx usa eventos de ready/call update y credenciales. Separar sesión del router React y probar token refresh con audio activo. | [Twilio Device](https://www.twilio.com/docs/voice/sdks/javascript/twiliodevice), [TelnyxRTC](https://team-telnyx.github.io/webrtc/classes/TelnyxRTC.html), [Telnyx login](https://team-telnyx.github.io/webrtc/classes/TelnyxRTC.html#login) |
| Mute y DTMF | Operaciones del cliente no son hold, transferencia o terminación confirmada de todos los legs. | [Twilio Call SDK](https://www.twilio.com/docs/voice/sdks/javascript/twiliocall), [Telnyx Call SDK](https://team-telnyx.github.io/webrtc/classes/Call.html) |
| Hold, transferencias y conferencia | Twilio hold vía participante; Telnyx también tiene hold WebRTC. Blind/warm transfer crean/controlan piernas y pueden fallar parcialmente. | [Twilio participant](https://www.twilio.com/docs/voice/api/conference-participant-resource), [Twilio conference](https://www.twilio.com/docs/voice/conference), [Telnyx transfer](https://developers.telnyx.com/api-reference/call-commands/transfer-call), [conference hold](https://developers.telnyx.com/api-reference/conference-commands/hold-conference-participants) |
| Extensiones SIP | Se pueden construir políticas de directorio/routing; una extensión interna no es automáticamente un número PSTN ni una PBX completa. | [Twilio Dial SIP](https://www.twilio.com/docs/voice/twiml/sip), [Telnyx SIP/WebRTC](https://developers.telnyx.com/docs/voice/webrtc/architecture), [SIP transfer RFC 5589](https://www.rfc-editor.org/rfc/rfc5589.html) |
| Voicemail y grabación | Twilio tiene `Record`; Telnyx tiene configuración nativa de voicemail de número, además de workflows de voz. No asumir equivalencia entre mailbox y grabar audio en cualquier topología. | [Twilio Record](https://www.twilio.com/docs/voice/twiml/record), [Telnyx voicemail API](https://developers.telnyx.com/api-reference/voicemail/get-voicemail), [Telnyx voice features](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming) |
| Navegadores móviles | Uso en primer plano puede funcionar según browser; mantenimiento/recepción de llamadas en background no debe prometerse para web. Push FCM/APNS corresponde a SDKs nativos. | [Browsers Twilio](https://www.twilio.com/docs/voice/sdks/javascript#supported-browsers), [Telnyx browsers](https://team-telnyx.github.io/webrtc/classes/TelnyxRTC.html#webRTCSupportedBrowserList), [push Telnyx](https://developers.telnyx.com/docs/voice/webrtc/push-notifications) |

Se revisaron los SDKs publicados **Twilio Voice 2.18.5** y **Telnyx WebRTC 2.28.0**, sin instalarlos como dependencias productivas. Telnyx presenta una discrepancia entre una guía de auth y la superficie/código publicados de renovación; debe resolverse con versiones fijadas y pruebas, no inventando `updateToken` como interfaz común. [Guía Telnyx](https://developers.telnyx.com/docs/development/webrtc/js-sdk/how-to/authenticating-your-app), [código 2.28.0](https://github.com/team-telnyx/webrtc/blob/webrtc/v2.28.0/packages/js/src/Modules/Verto/BaseSession.ts#L671), [error handling 2.28.0](https://github.com/team-telnyx/webrtc/blob/webrtc/v2.28.0/packages/js/docs/error-handling.md).

### Routing y operación

| Capacidad | Estado verificado | Qué debe construir/probar Aureform | Fuentes |
| --- | --- | --- | --- |
| FIFO/parking | Twilio Queue/Enqueue y Telnyx enqueue/bridge documentados. | Dominio de posición, límites, overflow, agentes y cierre de legs. Telnyx timeout/leave puede dejar una llamada parked. | [Twilio Queue](https://www.twilio.com/docs/voice/twiml/queue), [Enqueue](https://www.twilio.com/docs/voice/twiml/enqueue), [Telnyx queueing](https://developers.telnyx.com/docs/voice/programmable-voice/queueing-calls), [enqueue API](https://developers.telnyx.com/api-reference/call-commands/enqueue-call) |
| Prioridad/skills/distribución | TaskRouter documenta Workflows, Tasks y Workers. Equivalente nativo integral Telnyx no demostrado. | Policies compartidas, capacidad/leases y extensiones específicas; no imitar un ACD con solo un array en React. | [Workflow](https://www.twilio.com/docs/taskrouter/api/workflow), [Task](https://www.twilio.com/docs/taskrouter/api/task), [Worker](https://www.twilio.com/docs/taskrouter/api/worker) |
| Horarios/festivos | Zona IANA y calendarios/normas públicos. | Calendar contract con región/año/versionado; excepciones; DST y años sin cobertura. | [IANA](https://www.iana.org/time-zones/), [Colombia](https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4954), [UK regional](https://www.gov.uk/bank-holidays) |
| SLA/callback/supervisión | Se pueden derivar de eventos y construir workflows; no hay evidencia de una API neutral universal. | Scheduling durable, métricas por definición, permisos de supervisor y callbacks consentidos/autorizados. | [recursos de llamada Twilio](https://www.twilio.com/docs/voice/api/call-resource), [webhooks Telnyx](https://developers.telnyx.com/docs/voice/programmable-voice/receiving-webhooks) |
| Power dialer/notas/disposiciones | Aircall demuestra un producto operativo, con límites de plan/dispositivo. | Primer dialer secuencial, historial y contacto; controles de frecuencia y detención. Predictive dialing fuera del MVP. | [Power Dialer oficial](https://support.aircall.io/en-gb/articles/23996034990493), [FTC TSR](https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule) |

No tratar un provider outage como autorización para cambiar un número o redirigir llamadas a una cuenta nueva. El failover viable es de nuevas sesiones hacia recursos alternativos habilitados y aprobados; las sesiones ya iniciadas conservan su proveedor.

## 7. SMS/MMS e inbox unificada

| Hallazgo | Disponibilidad | Requisitos/restricciones | Fuentes |
| --- | --- | --- | --- |
| Ambos providers ofrecen mensajes entrantes/salientes y callbacks. | APIs documentadas. | Sender/number/profile elegible, regulación de destino, webhook firmado. Accepted/delivered/read son estados distintos; reconciliar resultados desconocidos antes de resend. | [Twilio Message](https://www.twilio.com/docs/messaging/api/message-resource), [webhook](https://www.twilio.com/docs/messaging/guides/webhook-request), [Telnyx messages](https://developers.telnyx.com/docs/messaging/messages), [receiving webhooks](https://developers.telnyx.com/docs/messaging/messages/receiving-webhooks) |
| MMS no tiene cobertura mundial equivalente. | Twilio documenta US/Canadá/**Australia**; Telnyx US/Canadá. | Australia Twilio: long codes documentados. Límites de carrier/media y receipt varían; link fallback no es MMS nativo. | [Twilio Global MMS](https://help.twilio.com/articles/12557401622811-Twilio-Global-MMS), [Telnyx MMS FAQ](https://support.telnyx.com/en/articles/4450150-faqs-about-mms-at-telnyx) |
| Twilio Conversations añade objetos de conversación/participantes. | API documentada. | Servicio adicional; no imponer esa representación como backend común de Telnyx. | [Conversations API](https://www.twilio.com/docs/conversations/api) |
| Opt-out y A2P tienen mecanismos específicos. | Features y registro documentados. | Mantener ledger común de consentimiento además del bloqueo de proveedor; 10DLC no autoriza por sí mismo marketing ni llamadas. | [Twilio Advanced Opt-Out](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out), [A2P 10DLC](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc), [Telnyx 10DLC](https://developers.telnyx.com/docs/messaging/10dlc) |

**Propuesta de dominio:** `Message` con contenido/attachments, sender/destino, consentRef, IDs externos, intento, error, costo estimado y estados observados. Contar segmentos/encoding con el carrier, validar MIME/tamaño y URLs de medios contra SSRF. Duplicación de eventos no debe duplicar mensajes salientes. Un inbox común no elimina ventanas de WhatsApp, registros SMS ni diferencias de delivery receipts.

## 8. WhatsApp Business: investigar messaging y Calling por separado

Consulta: 2026-10-20. Disponibilidad de cuenta/WABA, permisos, plantillas, límites y factura **no demostrada**. Estos hallazgos no son una habilitación productiva.

| Tema | Hecho documental y disponibilidad | Restricción / decisión propuesta | Fuentes |
| --- | --- | --- | --- |
| Twilio messaging | GA anunciado; Self Sign-up y Tech Provider para distintos operadores. Senders v2 obligatorio desde 2026-09-01 según documentación. | Cuenta adecuada, permisos Meta, OTP y verificación según flujo. No asumir coexistence de Business App en el onboarding estándar. | [GA](https://www.twilio.com/en-us/changelog/whatsapp-generally-available), [Self Sign-up](https://www.twilio.com/docs/whatsapp/self-sign-up), [ISV](https://www.twilio.com/docs/whatsapp/isv/tech-provider-program), [Senders](https://www.twilio.com/docs/whatsapp/api/senders) |
| Telnyx messaging | Anunciado 2026-04-02; Embedded Signup y API propia. | Cuenta sobre Trial, permisos Meta y vinculación Tech Provider; comenzar con capacidad baja no habilita Calling. | [release](https://telnyx.com/release-notes/whatsapp-business-messaging-telnyx-numbers), [signup](https://developers.telnyx.com/docs/messaging/whatsapp/embedded-signup), [Tech Provider](https://developers.telnyx.com/docs/messaging/whatsapp/embedded-signup/tech-provider), [quickstart](https://developers.telnyx.com/docs/messaging/whatsapp/quickstart) |
| Meta onboarding | v2/v3 deprecadas desde 2026-10-15; WABA-only v2 continúa hasta 2026-11-16. El catálogo publica v5 desde 2026-10-20. | v4 es el baseline propuesto, no una declaración de “última versión”. Session info y signup son versiones distintas; comprobar compatibilidad v4/v5 de cada BSP. Relectura oficial: **2026-10-21**. | [Meta versions](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/versions/), [implementation](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation/), [Tech Provider](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers/) |
| Calling Twilio | GA anunciado 2025-07-15; Voice API/WhatsApp Dial. | Capacidad de messaging ≥2.000, habilitación de llamadas y permiso de voz. Algunos contenidos de call-to-action siguen beta regional. | [GA Calling](https://www.twilio.com/en-us/changelog/whatsapp_business_calling_available), [Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling), [content call-to-action](https://www.twilio.com/docs/content/twilio-call-to-action) |
| Calling Telnyx | Anunciado 2026-04-28; settings y conexión de voz/SIP documentados. | No inferir GA contractual universal. Requiere setup específico; API completa de solicitud/consulta de permisos no verificada. | [release](https://telnyx.com/release-notes/whatsapp-business-calling-telnyx), [Calling](https://developers.telnyx.com/docs/messaging/whatsapp/business-calling) |
| País de número empresarial | Twilio excluye salientes US/CA/EG/NG/**TR**/VN; Meta y Telnyx excluyen US/CA/EG/NG/VN. | Conflicto sobre Turquía: bloquear esa afirmación hasta confirmación. Son reglas del país del negocio/número, no una prohibición automática del país receptor. | [Twilio Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling), [Meta Calling](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/), [Telnyx Calling](https://developers.telnyx.com/docs/messaging/whatsapp/business-calling) |
| Permiso y cuotas | Permiso de messaging no es permiso para llamar. Meta documenta expiración y consultas; existen cifras contradictorias entre documentos/ejemplos/BSP. | No hardcodear 5/100 llamadas ni 1.000/5.000 concurrencia como cuota universal. No hay webhook de expiración del permiso: conservar vencimiento y consultar. | [Meta permissions](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/user-call-permissions/), [Meta FAQ](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/faq/), [Twilio Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling) |
| Llamadas y PSTN | Ambos BSP documentan restricciones a puentear WhatsApp Calling con PSTN. | Diseñar atención VoIP/SIP elegible y validar escalamiento; no reutilizar indiscriminadamente la transferencia PSTN. | [Twilio Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling), [Telnyx soporte](https://support.telnyx.com/en/articles/14668631-enabling-whatsapp-business-calling-on-telnyx-numbers) |
| BYON y coexistence Telnyx | BYON Calling anunciado 2026-09-30; coexistence 2026-10-07. | Coexistence messaging documentado a 20 msg/s; Calling programático **no disponible en ese modo**. BYON no implica esa equivalencia. | [BYON release](https://telnyx.com/release-notes/whatsapp-calling-bring-your-own-number), [coexistence release](https://telnyx.com/release-notes/whatsapp-coexistence), [coexistence docs](https://developers.telnyx.com/docs/messaging/whatsapp/coexistence) |

La condición de 2.000 es **capacidad habilitada**, no la obligación de enviar 2.000 mensajes diarios. WABA/portfolio, business verification, calidad, plantillas y límites siguen siendo pasos separados. [Meta messaging limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits/).

### Cambio de precios y políticas que impide asumir reglas antiguas

Meta documenta desde **2026-10-01** una franquicia ordinaria de 1.000 mensajes service por mes/número y cobro de utility en la ventana de atención. Gobiernos/ONG **elegibles** conservan service gratuito hasta 2027-12-31, identificado con `paid_exempt`; no clasificar a Aureform por inferencia. Reconciliar excepciones, régimen de IA y comisiones BSP con la cuenta. [Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/), consultas **2026-10-20 y 2026-10-21**; facturación no probada.

Los términos vigentes visibles de Meta, de 2026-09-23, distinguen proveedores de IA y usos incidentales frente a IA como función primaria; la página de AI Providers tiene reglas propias y una actualización 2026-10-15. Publicar tooling Apache no determina por sí solo la clasificación del operador de un servicio. Revisar propósito, mercados, tratamiento de datos, proveedor de modelos y condiciones; no presentar un chatbot general como permitido globalmente. [Términos Meta](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform?locale=en_US), [AI Provider pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers/), [Business Messaging Policy](https://business.whatsapp.com/policy).

Soporte de país también depende de sanciones y destino/categoría. No extrapolar restricciones de marketing a todas las conversaciones o todo `+1`. [Meta support](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/), [marketing per-user limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits/).

## 9. Agentes de voz con IA y medios

| Hallazgo | Disponibilidad documental | Requisitos y restricciones | Fuentes |
| --- | --- | --- | --- |
| Twilio Media Streams | Unidireccional `Start/Stream` y bidireccional `Connect/Stream`. | Bidireccional bloquea instrucciones posteriores, inbound track, µ-law 8 kHz; buffering/mark/clear y DTMF tienen reglas específicas. Handoff requiere controlar stream y leg. | [Media Streams](https://www.twilio.com/docs/voice/media-streams), [Stream](https://www.twilio.com/docs/voice/twiml/stream), [WS messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages) |
| Twilio ConversationRelay | GA anunciado 2025-05-14, STT/TTS administrados y protocolo de texto. | LLM/tools/RAG/backend siguen siendo adicionales; costos aparte de telefonía. No usar la URL errónea bajo Media Streams. | [Relay](https://www.twilio.com/docs/voice/conversationrelay), [TwiML Relay](https://www.twilio.com/docs/voice/twiml/connect/conversationrelay), [GA](https://www.twilio.com/en-us/changelog/conversationrelay-is-now-available-in-ga), [pricing](https://www.twilio.com/en-us/products/conversational-ai/pricing) |
| Telnyx media bidireccional | WebSocket con distintos modos/codecs y comandos. | RTP y envío de archivos MP3 no son el mismo protocolo. Transcoding depende del codec de llamada; un stream/fork por llamada condiciona topología. | [Media Streaming](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming) |
| Telnyx AI nativo | Guía actual permite iniciar/detener/adjuntar AI Assistant desde Call Control. | Fallar al iniciar IA no implica que la llamada termine. Detener el asistente no elimina necesariamente costos de la llamada. Compatibilidad con modos debe resolverse. | [AI Assistant start](https://developers.telnyx.com/docs/voice/programmable-voice/ai-assistant-start) |
| LiveKit portable | Agents Node y SIP guides de ambos carriers. | Servicios SIP/SFU, configuración de red/codecs y control de transferencias adicionales. El conector WS Twilio no es autoalojable. | [Voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai/), [builds](https://docs.livekit.io/deploy/agents/builds/), [providers](https://docs.livekit.io/telephony/start/providers/), [connector](https://docs.livekit.io/telephony/connectors/twilio/) |
| Transferencia humano/IA | Cold/warm transfer y tareas tienen implementaciones específicas. | Una integración TwiML→SIP inbound no acredita outbound/REFER. Habilitación trunk, topología y restauración tras fallo requieren experimento. | [inbound Twilio](https://docs.livekit.io/telephony/accepting-calls/inbound-twilio/), [cold transfer](https://docs.livekit.io/telephony/features/transfers/cold/), [warm task](https://docs.livekit.io/agents/prebuilt/tasks/warm-transfer/), [troubleshooting](https://docs.livekit.io/reference/telephony/troubleshooting/) |

**Decisión propuesta:** puertos de STT/TTS/LLM y transporte separados, tools allowlisted, RAG por tenant, barge-in, turn detection, timeouts y escalamiento. Medir latencia desde fin del habla humana hasta primer audio audible; el tiempo al primer token del LLM no basta. Las metas iniciales del roadmap son objetivos de piloto, no SLA.

**No demostrado:** calidad de español/acento, manejo de ruido, interrupción, call transfer real en ambas topologías, recuperación de modelos/red y costo por conversación. Requieren un dataset consentido o sintético, pruebas de audio end-to-end y fallos inducidos.

### Licencias que afectan la promesa open source

| Elemento | Hecho verificado | Restricción / decisión propuesta | Fuente |
| --- | --- | --- | --- |
| LiveKit Agents JS | Código Apache 2.0. | La licencia del SDK no cubre automáticamente todos los modelos. | [LICENSE](https://raw.githubusercontent.com/livekit/agents-js/main/LICENSE), [releases](https://github.com/livekit/agents-js/releases) |
| Modelos de turn detection LiveKit | `MODEL_LICENSE` permite ciertos usos ligados a LiveKit Agents. | No relicenciar pesos como Apache ni usarlos en cualquier runtime por inferencia. | [MODEL_LICENSE](https://raw.githubusercontent.com/livekit/agents-js/main/MODEL_LICENSE) |
| Artefacto Silero empaquetado | `REUSE.toml` anota un ONNX como CC-BY-NC-SA, mientras upstream muestra MIT. | Conflicto de procedencia/licencia: gate de revisión antes de distribuir artefactos; no resolverlo eligiendo la licencia conveniente. | [REUSE](https://raw.githubusercontent.com/livekit/agents-js/main/REUSE.toml), [Silero upstream](https://raw.githubusercontent.com/snakers4/silero-vad/master/LICENSE) |
| React Flow / Rete | React Flow core MIT; Rete tiene paquetes con licencias distintas. | Usar core permitido, no ejemplos Pro o paquetes NC como si fueran Apache. | [React Flow](https://raw.githubusercontent.com/xyflow/xyflow/main/LICENSE), [Pro](https://reactflow.dev/pro), [Rete licensing](https://retejs.org/docs/licensing/) |

## 10. Flow Builder y Prompt-to-Flow

La oportunidad estratégica es un flujo que se pueda **explicar, corregir, simular y auditar**, con controles de publicación. El [RFC del motor](FLOW-ENGINE-RFC.md) diseña el AST, pipeline, ejemplo del usuario, validaciones, compilación y source maps.

Hechos: Studio exporta/valida JSON, sus revisiones son propias; TeXML no cubre todos los verbos TwiML; un editor como React Flow no ejecuta un workflow; Structured Outputs valida una forma, no autorización o semántica. Fuentes y disponibilidad están en la tabla inicial del RFC.

Propuesta: schema JSON 2020-12 con catálogo acotado y Zod, predicados sin código arbitrario, detección de ciclos/rutas incompletas, límites en runtime y bindings revisados. El modelo genera `FlowProposal`; el servidor emite la aprobación de un plan inmutable con recursos, moneda y presupuesto.

Una compilación nativa solo es válida si preserva comportamiento normal, errores, timeouts y control de costos. Si falta equivalencia, elegir un runtime propio explícitamente o bloquear ese target. No llamar “compilación Telnyx” a cambiar nombres de widgets Twilio.

La trazabilidad enlaza prompt, generación, ediciones, revisión, capacidades, simulación, aprobación, artefactos, sesiones y eventos. Conserva datos privados bajo control de retención y no publica razonamiento interno.

## 11. Seguridad, regulación y fallos: límites de producción

El detalle obligatorio está en [SECURITY-COMPLIANCE.md](SECURITY-COMPLIANCE.md). Los siguientes hallazgos justifican gates, no una certificación legal.

| Hecho verificado | Disponibilidad / requisitos / restricciones | Fuentes |
| --- | --- | --- |
| Firmas de webhook distintas | Twilio valida URL/payload con su firma; Telnyx Ed25519 usa timestamp y cuerpo. Reverse proxy, bytes originales y dedup importan. | [Twilio security](https://www.twilio.com/docs/usage/webhooks/webhooks-security), [Telnyx receiving](https://developers.telnyx.com/docs/development/api-fundamentals/webhooks/receiving-webhooks), [SDK Telnyx](https://github.com/team-telnyx/telnyx-node/blob/master/src/lib/webhooks.ts) |
| Consentimiento/registros por canal | US TCPA/TSR, 10DLC y reglas de país no son permisos intercambiables. AI voice puede ser voz artificial a efectos TCPA. | [FCC 24-17](https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf), [47 CFR 64.1200](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200), [FTC TSR](https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule), [Twilio 10DLC](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc) |
| Colombia tiene reglas de contacto y privacidad | Ley 2300, RNE y protección de datos requieren perfil de propósito/canal/horarios. Atención entrante no es una autorización de marketing. | [Ley 2300](https://normograma.crcom.gov.co/crc/compilacion/docs/ley_2300_2023.htm), [RNE](https://normograma.crcom.gov.co/crc/compilacion/docs/circular_superindustria_0001_2024.htm), [Ley 1581](https://normograma.crcom.gov.co/crc/compilacion/docs/ley_1581_2012.htm), [IA SIC](https://normograma.crcom.gov.co/crc/compilacion/docs/circular_superindustria_0002_2024.htm) |
| UE: privacidad e información sobre IA | GDPR y Article 50 tienen ámbitos/obligaciones específicos. Publicar código abierto no elimina Article 50 del sistema aplicable. | [GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679), [Article 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50), [Article 2](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-2), [enforcement](https://ai-act-service-desk.ec.europa.eu/en/ai-act/faq/when-does-enforcement-start) |
| Identidad y emergencias requieren perfiles reales | STIR/SHAKEN no equivale a consentimiento. Emergency calling depende de servicio/jurisdicción/configuración; no se realizaron pruebas a números de emergencia. | [STIR/SHAKEN](https://www.ecfr.gov/current/title-47/section-64.6301), [47 CFR 9.11](https://www.ecfr.gov/current/title-47/section-9.11), [Twilio emergency](https://www.twilio.com/docs/voice/tutorials/emergency-calling-for-programmable-voice), [Telnyx E911](https://support.telnyx.com/en/articles/1130683-e911-setup-guide) |

Los riesgos de operación incluyen llamada simultánea, WebRTC perdido, token vencido, agente no disponible, transferencia incompleta, media silencioso, callback duplicado, eventos tardíos y carrier outage. El estado `unknown` y la reconciliación son necesarios; desconectar el frontend no prueba que terminó la facturación.

Propuesta: credenciales solo servidor, tokens por agente/conexión, aislamiento por tenant en SQL/WS/RAG/media, mínimos permisos, inbox/outbox durable, autorización explícita de costos, DNC/opt-out, grabación OFF en el piloto y observabilidad redactada.

## 12. Costos y sostenibilidad

Las unidades importan más que una cifra plana: renta/setup de números; minutos por leg PSTN/WebRTC; participante-minuto de conferencia; transferencia/espera; grabación/storage; segmentos SMS/MMS y carrier fees; registro; Meta+BSP; STT/TTS/LLM; infraestructura/egress; impuestos y trabajo de cumplimiento.

| Referencia pública de lista | Disponibilidad / restricciones | Fuente |
| --- | --- | --- |
| Twilio US local: US$1,15/mes; entrada local US$0,0085/min; browser/app US$0,004/min. | Tarifas públicas consultadas, no quote de cuenta. Rounding por leg, país/tipo y extras modifican factura. | [Voice US](https://www.twilio.com/en-us/voice/pricing/us), [rounding](https://help.twilio.com/articles/223132307-How-do-you-round-minutes-for-billing-) |
| Twilio Conference US: US$0,0018/participante-minuto; Relay US$0,07/min. | Telefonía/modelos pueden cobrarse aparte; topología afecta suma de minutos. | [Conference pricing](https://www.twilio.com/en-us/voice/conference/pricing), [AI pricing](https://www.twilio.com/en-us/products/conversational-ai/pricing) |
| Telnyx Voice API: US$0,002/min más SIP trunk; ejemplo US inbound US$0,0032/min; browser/app US$0,002/min. | Qué legs generan API minutes requiere factura/contrato. No aplicar el ejemplo US a otros destinos. | [Voice API pricing](https://telnyx.com/pricing/voice-api), [Elastic SIP](https://telnyx.com/pricing/elastic-sip) |
| Telnyx conferencia US$0,002/participante-minuto; transfer US$0,10/invocación; números desde US$1/mes. | Transfer fee no se aplica por inferencia a todo bridge; número/tipo/feature tiene quote propio. | [Voice API pricing](https://telnyx.com/pricing/voice-api), [number pricing](https://telnyx.com/pricing/numbers) |
| WhatsApp BSP y Meta se suman. | País/categoría/billing/tier y política AI pueden cambiar total. Reconciliar cambios Meta de octubre y recibos. | [Twilio WA pricing](https://www.twilio.com/en-us/whatsapp/pricing), [Telnyx WA pricing](https://telnyx.com/pricing/whatsapp), [Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/) |
| Infra de laboratorio portable | Una VM pública de referencia no certifica carga, HA, media ni capacidad de IA. | [DigitalOcean Droplets](https://www.digitalocean.com/pricing/droplets), [LiveKit builds](https://docs.livekit.io/deploy/agents/builds/) |

Una lectura pública sin credenciales de la ruta de pricing anunciada por Telnyx, usando el host API estándar asumido, devolvió HTTP 404/resource-not-found. Esto **no acredita que la API anunciada no exista**: falta confirmar host y contrato. No usar esa respuesta como cotización ni como prueba de cuenta.

La [hoja de ruta](ROADMAP.md) incluye fórmulas, escenario acotado y presupuesto futuro propuesto. No autoriza gasto. No calcular rentabilidad global a partir del piloto US o de un precio de modelo que omite telefonía.

## 13. Qué puede permanecer completamente local

**Propuestas de demos locales:** las doce pantallas con fixtures, estados de fallos y capacidades; formularios de recursos sin provisioning; softphone simulado con oferta/estados; inbox ficticio; calendarios/horarios con datasets suministrados; editor DSL, validación de grafos y simulación determinista; historial, métricas y diffs de publicación ficticios.

La UI siempre informa que es local. Un modo conectado que falla no cae a mocks silenciosamente. Micrófono/audio local puede ensayarse con permiso del usuario, pero no demuestra PSTN. Generar flujos con un LLM remoto necesita proveedor/modelo/configuración y puede generar costo; un fixture de prompt no es esa integración real.

**Requieren backend/servicios:** compra/configuración/portabilidad, tokens y signaling real, webhooks firmados, routing multitenant, estado/reconciliación, números y llamadas, SMS/WhatsApp, callback jobs, grabaciones/media storage, STT/TTS/LLM/RAG y auditoría productiva.

## 14. Respuestas para decidir el siguiente paso

**¿Es viable mantenerlo open source?** Sí. El código original de UI, contratos, validación, DSL, simulador y backend puede seguir Apache 2.0. Dependencias y servicios conservan sus licencias; pesos y recursos con condiciones incompatibles no se incluyen como Apache.

**¿Qué es reutilizable y qué necesita backend?** Controles, estados, editor, tablas, formularios, validadores y simulador son reutilizables. Identidad/autorización, credenciales, aprovisionamiento, llamadas reales, colas/presencia durable, medios, mensajes y auditoría necesitan backend y servicios externos.

**¿Qué se comparte y qué difiere?** Contactos, conversaciones, políticas, horarios, consentimiento, DSL y proyecciones pueden compartir dominio. APIs, tokens, números, call legs/control mode, topologías, codecs, permisos WhatsApp y compilers exigen implementaciones independientes. Recursos activos no migran transparentemente.

**¿Qué demos son locales?** Todas las pantallas y el motor de simulación pueden usar fixtures declarados. Las demos no certifican delivery, audio, billing, compliance o cuenta. Un modelo real para Prompt-to-Flow es una integración adicional.

**¿Cuáles son los riesgos principales?** Fraude y aislamiento, consentimiento/jurisdicción, cambios Meta, llamadas huérfanas y gasto, calidad/latencia de audio, diferencias SDK/topología, licencias de modelos, mantenimiento de perfiles y drift entre Figma/código.

**¿Cuál es el MVP end-to-end más pequeño?** Laboratorio elegible con un número autorizado por carrier, dos agentes autenticados y el recorrido inbound→horario→FIFO→softphone→cierre/historial; grabación OFF. Dos pruebas independientes, incluyendo concurrencia y fallos, antes de afirmar compatibilidad.

**¿Qué construir y qué delegar?** Construir dominio, UI con fuente Figma, DSL, policies, validators, simulador, routing compartido mínimo, adapters y evidence harness. Delegar carrier/PSTN, SDK/media WebRTC/SIP, identidad estándar y modelos STT/TTS/LLM; integrar servicios existentes con límites explícitos.

Recomendamos revisar los RFC y priorizar la recuperación de paridad Figma y la vertical acotada. La [hoja de ruta](ROADMAP.md) y las [preguntas abiertas](OPEN-QUESTIONS.md) contienen dependencias, aceptación y experimentos que deben cerrarse antes de cualquier habilitación productiva.
