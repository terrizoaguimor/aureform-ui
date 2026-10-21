# Aureform Communications & Voice AI — roadmap documental

Fecha de corte y consulta de fuentes: **2026-10-20, America/Bogota**. Importes en USD, salvo indicación contraria. Estado: **propuesta de ingeniería; entrega documental de P0**.

El alcance es un **paquete documental de siete documentos**: investigación, matriz de capacidades, arquitectura, motor de flujos, seguridad, roadmap y preguntas/experimentos. Se añaden las fuentes nativas Figma y la recuperación de pendientes de diseño solicitada por el usuario. Este roadmap define fases, dependencias, aceptación y costos; las integraciones y pruebas operacionales de P1–P7 siguen pendientes. Comprar números, provisionar infraestructura, realizar llamadas, activar servicios o publicar flujos operativos requerirá autorización posterior del alcance correspondiente; el presupuesto sugerido tampoco está autorizado.

Fuente de diseño: [tablero editable de fases en Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=341-789). El [recibo nativo](../../design/reports/communications-2026-10-21.md) diferencia recuperación estructural, revisión visual y paridad aún no demostrada.

## 1. Cómo interpretar la evidencia

| Etiqueta | Significado y límite |
| --- | --- |
| **HECHO** | Información observada en el repositorio o documentada por una fuente primaria enlazada. Una capacidad documentada no demuestra disponibilidad en una cuenta, país o versión concreta. |
| **PROPUESTA** | Decisión de arquitectura, alcance o criterio de aceptación para trabajo futuro. |
| **HIPÓTESIS** | Supuesto explícito utilizado para dimensionar esfuerzo, topología o costos. Debe contrastarse antes de gastar o declarar aceptación. |
| **PENDIENTE** | Falta evidencia suficiente, existe una contradicción o todavía no se ejecutó la comprobación. No equivale a capacidad soportada. |

Las fuentes oficiales citadas se consultaron el **20 de octubre de 2026**; esa fecha no es necesariamente su fecha de publicación. Las páginas de precios acreditan unidades y tarifas públicas, **no GA, certificación de capacidades ni una cotización contractual**. Una release OSS publicada tampoco certifica la integración de Aureform. Las URLs a ramas `main`, `master` o `develop` son fotografías documentales: una implementación futura deberá fijar versión, commit y artefacto.

**HECHO local.** [La arquitectura existente](../architecture.md) describe un frontend estático con 135 rutas antes de expandir idiomas, incluyendo recetas que comparten workbenches. Sus adaptadores y estados locales no aportan autenticación servidor, llamadas ni persistencia operacional. El [contrato de identidad](../integrations/identity.md) exige un backend consumidor que aplique sesiones y autorización. El código original usa [Apache-2.0](../../LICENSE); las dependencias conservan [sus licencias](../../THIRD_PARTY_NOTICES.md).

Los seis documentos complementarios organizan la evidencia y las decisiones del paquete:

| Referencia complementaria | Uso en este roadmap |
| --- | --- |
| R1 — [RESEARCH.md](RESEARCH.md) | Comparación de mercado/OSS, evidencia y propuestas. |
| R2 — [CAPABILITY-MATRIX.md](CAPABILITY-MATRIX.md) | Cobertura global, capacidades y restricciones por dirección. |
| R3 — [ARCHITECTURE-RFC.md](ARCHITECTURE-RFC.md) | Node/Docker, contratos, control/media y Figma. |
| R4 — [FLOW-ENGINE-RFC.md](FLOW-ENGINE-RFC.md) | DSL, editor, ejecución y Prompt-to-Flow. |
| R5 — [SECURITY-COMPLIANCE.md](SECURITY-COMPLIANCE.md) | Identidad, permisos, ingress, abuso, consentimiento y gates. |
| R6 — [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) | Decisiones abiertas y experimentos para cerrar los gates. |

La evidencia documental de esos estudios se distingue de la aceptación operacional exigida en cada fase.

## 2. Decisiones y límites desde el inicio

**PROPUESTA para revisión.** Backend de referencia portable **Node.js/TypeScript + Docker + SQL**, con PostgreSQL como candidato; autenticación OIDC y autorización por workspace/rol en servidor. Keycloak será una opción de despliegue, no una dependencia obligatoria. Separar API, workers, base de datos y adaptadores para que el frontend existente pueda consumirlos sin convertirse en el servidor de telefonía.

**Orden de producto propuesto para revisión:** primero el MVP de voz entrante P1 y la voz avanzada P2. **Se propone “portable primero” para la elección del runtime dentro de la fase IA, P5**: priorizar un runtime operable por el consumidor antes de hacer obligatoria la IA alojada del carrier.

Se propone un catálogo de alcance global desde P0. La primera activación propuesta será un laboratorio de Estados Unidos. **Catálogo global no significa disponibilidad mundial activada**. Cada perfil deberá registrar:

- Proveedor, país del número y del destino, tipo de número, canal y dirección entrante/saliente.
- Modo de control, versión de API/SDK, requisitos de cuenta, KYC, dirección local, registros y permisos.
- Capacidades independientes: recibir, originar, navegador, DTMF, conferencia, transferencia, grabación, SMS, MMS y WhatsApp.
- Región de media/datos, zona horaria de horarios, límites de concurrencia/CPS, formatos y restricciones.
- URL oficial, fecha, unidad de cobro y estado: documentado, verificado en laboratorio, bloqueado o desconocido.

**PROPUESTA de gate en runtime.** El servidor deberá comprobar ese perfil antes de ejecutar cada operación. Un valor desconocido bloqueará la acción e indicará qué falta; un precio publicado no habilitará la capacidad. Los horarios usarán zonas IANA y deberán probar cambios de fecha y horario de verano. Residencia de datos, disponibilidad del número y enrutamiento de audio se verifican por separado.

**PROPUESTA de contratos propios.** Identificadores internos de conversación, llamada, leg, agente y ejecución; IDs del proveedor como referencias; comandos idempotentes; inbox/outbox SQL; leases de reserva de agentes; máquina de estados, temporizadores persistentes, auditoría y reconciliación. Los eventos podrán duplicarse o llegar fuera de orden: está documentado en [Telnyx Receiving Webhooks](https://developers.telnyx.com/docs/voice/programmable-voice/receiving-webhooks), consultado 2026-10-20. No se prometerá ejecución exactamente una vez de un efecto externo.

Distinguir endpoints síncronos de instrucciones TwiML/TeXML y webhooks asíncronos de estado. Un ACK vacío seguido de trabajo en cola no sustituye el XML que espera un endpoint de instrucciones. Proponer respuestas acotadas y seguras, con deadlines/fallbacks por producto, y persistencia/deduplicación de eventos; ver [el RFC de ejecución](FLOW-ENGINE-RFC.md) y [seguridad del ingress](SECURITY-COMPLIANCE.md). Su verificación por proveedor sigue pendiente.

Una llamada activa conservará su carrier y topología. La selección de proveedor para una nueva sesión no implica migrar de manera transparente el estado de otra llamada que falla a mitad de conversación. Ante una caída, mostrar estado verificable, reconciliar y aplicar una salida explícita compatible con ese carrier.

| Responsabilidad | Propiedad propuesta | Qué se delega y qué falta comprobar |
| --- | --- | --- |
| Contratos, FIFO, horarios, permisos, versiones de flows y políticas | Aureform Apache-2.0 | Persistencia SQL y pruebas propias; los SDK no sustituyen estas reglas. |
| Números, SIP/PSTN y terminación/originación | Twilio/Telnyx u otro carrier habilitado | Aprobación del número, regulación, dirección, tarifas, capacidad real y límites de cuenta. |
| Transporte de audio durante la llamada, jitter, codecs, mezcla y conectividad | Carrier en P1; servicios de media especializados en P5 | La continuidad del audio no se reconstruye desde una cola SQL. SFU, SIP, TURN y recuperación requieren operación adicional. |
| Pipeline Voice AI y ciclo de vida del worker | Runtime separable operado por el consumidor | LiveKit Agents JS/TS como primera opción; Pipecat como alternativa. Estado de negocio e historial duradero permanecen fuera del proceso de audio. |
| STT, LLM y TTS | Proveedores intercambiables o modelos con licencia comprobada | Latencia, regiones, retención, formatos, cuotas y costo propios. Portable no significa inferencia gratuita. |
| Editor y UX de configuración | Aureform; React Flow como biblioteca candidata | El grafo visual no ejecuta la cola ni garantiza recuperación. El backend valida y ejecuta un contrato versionado. |

No habrá equivalencia directa entre TwiML/Voice SDK, Call Control, TeXML, SDK WebRTC y SIP. Los adaptadores expondrán operaciones y errores comunes **solo donde exista capacidad comprobada**.

## 3. Recuperación de Figma y gate de paridad

Fuente de diseño: [archivo Figma de Aureform](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N).

**HECHO — auditoría estructural nativa.** La [investigación](RESEARCH.md) registra **7 páginas, 714 variables, 14 estilos de texto y 6 estilos de sombra**: Cover, Foundations, Core, Blocks, Templates 1.0, Suite 1.1–1.3 e Image assets 1.2.1. Es una auditoría real de estructura; no acredita por sí sola paridad de todas las rutas, estados y variantes actuales.

**HECHO local.** El [mapa de rutas](../../design/maps/routes.md) conserva **69 raíces exactas del handoff congelado 1.2.1**, expresamente sin una nueva auditoría completa. La [distribución de Figma](../figma-distribution.es.md) distingue exportaciones SVG, pruebas históricas y plantillas locales de Code Connect sin publicación. El [paquete de diseño](../../design/README.md) advierte que importar SVG no recupera auto-layout, propiedades, variantes ni bindings nativos. No hay una exportación `.fig` cuya existencia pueda afirmarse.

**PENDIENTE — recuperación nativa en curso.** La paridad de las ampliaciones [1.4](../release-checklist-1.4.0.md) y [1.5](../release-checklist-1.5.0.md) permanece pendiente de aceptación mediante mapas y readbacks actuales. El [recibo 1.5](../qa-runtime-1.5.0.json) contiene 135 vistas, 69 vistas nativas mapeadas y un campo `pendingNativeViews: 0`. **Ese cero no prueba que las 135 rutas actuales tengan fuente y paridad nativa**. Tampoco se debe inferir una cantidad exacta de masters faltantes restando rutas: hay reutilización de componentes y recetas.

**PROPUESTA — G-Figma, obligatorio antes de UI productiva nueva y al cerrar cada fase:**

1. Inventariar todas las rutas y componentes actuales, incluyendo ampliaciones 1.4/1.5; comparar código, mapas e IDs reales. Clasificar por fuente confirmada, desactualizada, ausente o reutilizada con trazabilidad.
2. Completar y aceptar la recuperación nativa en curso antes de implementar pantallas productivas de Communications. Las composiciones exploratorias de esta investigación son propuestas de diseño y no cierran el gate. Conservar los checkpoints históricos; registrar los nuevos resultados con su propio alcance y fecha.
3. Mantener componentes nativos editables: texto, auto-layout, constraints, propiedades, variantes, variables/tokens e instancias. Las imágenes de producto son contenido; una captura de pantalla no sustituye un master.
4. Mapear componente/ruta/estado ↔ nodo Figma ↔ fuente. Incluir escritorio y móvil, Light/Dark, EN/ES y las variantes de apariencia existentes donde correspondan. Documentar reutilización y comportamiento responsive sin inventar IDs.
5. Diseñar estados normal, vacío, carga, error, permiso denegado, capacidad bloqueada, offline y recuperación; para voz, además espera, ringing, conversación, mute, DTMF, finalización y agente ocupado.
6. Obtener **readbacks reales** tras cada cambio: estructura y propiedades del nodo, bindings, instancias y exportación visual; comparar con el frontend de la fase. Verificar teclado, foco, anuncios de estado, contraste y movimiento reducido. Registrar cobertura por matriz, no solo totales.

El gate es compartido por P0–P7: P0 utiliza la auditoría estructural y completa la reconciliación de paridad; la base debe quedar aceptada **antes de implementar UI nueva en P1**. Cada fase posterior debe tener diseño aceptado antes de su UI y evidencia de paridad al cierre. Un mock, una plantilla local de Code Connect o una prueba visual histórica no cierra este gate.

**PENDIENTE — esfuerzo adicional de Figma: `UNESTIMATED`, pendiente del inventario de paridad y del desglose de trabajo restante.** La auditoría estructural ya aporta evidencia; falta estimar recuperación 1.4/1.5, biblioteca nativa, estados y variantes, mapas y readbacks de la expansión completa. Se estimará por separado y **se añadirá** al esfuerzo y al plazo siguientes; no se considera absorbido por los mismos números.

## 4. Fases y esfuerzo

**HIPÓTESIS de planificación.** Una engineer-week es una semana de trabajo de un ingeniero, no una semana calendario de todo el equipo. Los rangos son estimaciones del alcance descrito, no compromisos de entrega.

| Fase | Prioridad | Engineer-weeks | Dependencias principales |
| --- | --- | ---: | --- |
| P0 — documentación y decisiones verificables | Inmediata | 1–2 | Paquete documental, auditoría estructural y reconciliación G-Figma. |
| P1 — voz entrante con dos proveedores | MVP imprescindible | 8–12 | P0 aceptado, base Figma recuperada, números/cuentas habilitados y aprobación de laboratorio. |
| P2 — voz avanzada | Alta tras MVP | 6–10 | P1, topologías y capacidades por carrier comprobadas. |
| P3 — SMS/MMS | Expansión posterior | 6–8 | Contratos/catálogo P0–P1; registros y perfiles de messaging. |
| P4 — WhatsApp | Expansión posterior | 6–10 | Conversaciones de P3, requisitos WABA/BSP y reglas vigentes verificadas. |
| P5 — Voice AI portable | Estratégica, después de voz estable | 10–14 | P1–P2, gate de licencias, SIP/media y handoff definidos. |
| P6 — Flow completo / Prompt-to-Flow | Producto avanzado | 8–12 | Contrato básico P0–P1; capacidades de los canales integrados y P5 para nodos AI. |
| P7 — dialer secuencial | Última, salida controlada | 6–8 | P1–P2, perfiles salientes, consentimiento; P6 cuando use flows. |
| **Total de ingeniería base** | | **51–76** | **Excluye esfuerzo adicional de Figma y trámites legales/KYC.** |

Con **dos ingenieros y QA a tiempo parcial**, se propone una ventana orientativa de **aproximadamente 6–9 meses** para la ingeniería base, sin calendario fijo ni paralelismo perfecto. La recuperación/diseño Figma no estimada, disponibilidad de QA y bloqueos externos pueden ampliarla. No se inventa costo por hora, salarios, costo total de desarrollo ni duración de aprobaciones legales/KYC.

### P0 — documentación y contratos mínimos · 1–2 engineer-weeks

**PROPUESTA. Prioridad:** inmediata. **Dependencias:** fuentes primarias, los seis documentos complementarios, auditoría estructural y recuperación nativa de paridad.

**Alcance:** consolidar decisiones y coherencia entre los siete documentos; matriz global con datos desconocidos visibles; ADR de modos de control y media; contratos de llamadas/eventos/permisos/costos; registro de recuperación Figma; especificación del laboratorio y su eventual autorización. Definir desde aquí un flow mínimo de horario → FIFO → agente → cierre; el editor completo se difiere a P6.

**Riesgos:** documentación contradictoria, precios “desde”, confundir frontend con backend operativo, o heredar recibos históricos como aceptación nueva.

**Criterios de aceptación futuros:** cada decisión tiene etiqueta y fuente; los perfiles no habilitan países por inferencia; están identificados ownership, topología y límites del MVP; el inventario de paridad Figma y su estimación adicional quedan explícitos; los siete documentos mantienen decisiones, referencias y gates coherentes.

**Pruebas obligatorias:** revisar enlaces internos, aritmética y unidades; contrastar contradicciones; revisar contratos con escenarios duplicados/fuera de orden y aislamiento entre tenants; comprobar la trazabilidad del plan Figma. No exige llamadas ni un build para aceptar una entrega exclusivamente documental.

**Modelo de costo operativo:** sin runtime necesario para el paquete documental. Prototipos externos o herramientas de pago requieren presupuesto específico. La entrega de los siete documentos es el paso documental de P0; no acredita aceptación de los gates ni operación del sistema.

### P1 — MVP de voz entrante dual-provider · 8–12 engineer-weeks

**PROPUESTA. Prioridad:** imprescindible. **Dependencias:** P0, G-Figma de base, backend Node/Docker/SQL/OIDC, configuración habilitada por carrier y autorización independiente de laboratorio/gasto.

**Alcance exacto:** laboratorio hipotético US; **un número local aprobado por proveedor**, **dos agentes de navegador**, **una cola FIFO compartida**, horarios, contestar, mute, DTMF, colgar e historial; **dos conversaciones simultáneas** como límite de servicio. Grabación **OFF**; sin IA, WhatsApp, campañas PSTN salientes ni devolución automática de llamadas. “Sin callbacks” se interpreta aquí como sin devoluciones de llamada de negocio; los webhooks técnicos de estado sí son necesarios y forman parte del contrato propuesto.

Proponer reserva transaccional del agente y puente de media por adaptador. Antes de implementar, resolver si cada ruta usa bridge directo o conferencia y qué ocurre con el audio facturable durante la espera. No exigir Flex, Studio ni una licencia CCaaS para este vertical.

**Riesgos:** doble asignación, FIFO roto por carreras, agentes desconectados, micrófono denegado, audio unidireccional, eventos atrasados, legs huérfanos y cargos adicionales.

**Criterios de aceptación futuros:** prueba independiente **real de Twilio y real de Telnyx**, con audio PSTN ↔ navegador bidireccional, controles, cierre e historial reconciliado. Probar concurrencia 2+0, 0+2 y 1+1 con los mismos dos agentes; no asignar un agente a dos llamadas. Probar horario cerrado, espera, abandono y un agente ausente. Recibos, CDR y SDK/API utilizados deben corresponder a cada ruta, sin certificar compatibilidad por analogía.

**Pruebas obligatorias:** contratos/webhook autenticado, respuestas síncronas/deadlines/fallback, deduplicación, eventos fuera de orden, reservas y leases, restart/reconciliación, aislamiento por tenant/rol, expiración de tokens; E2E de FIFO/horarios y estados de UI; audio, DTMF, mute y hangup reales por carrier; cierre de todos los legs y conciliación de cobro. La recuperación propuesta tras restart es del control: no se garantiza que sobreviva el audio. G-Figma y matriz explícita de navegadores soportados son obligatorios; diseño móvil no certifica telefonía en background móvil.

**Modelo de costo operativo:** números + PSTN + navegador + API aplicable + participantes de conferencia/espera + infraestructura y extras. Los escenarios de USD 12/15,80 de la sección 7 son hipótesis de unidades, no una factura ni prueba de topología.

### P2 — voz avanzada · 6–10 engineer-weeks

**PROPUESTA. Prioridad:** alta tras P1. **Dependencias:** voz real aceptada y perfiles separados de transferencia, conferencia, destino y permisos.

**Alcance:** hold/resume, transferencia fría y asistida entre agentes/destinos habilitados, conferencia y trazabilidad de participantes. Diseñar grabación opt-in con consentimiento, permisos, retención y almacenamiento; habilitarla solo si se acepta esa capacidad y su costo. Callback automático y dialer permanecen fuera del núcleo de esta fase.

**Riesgos:** pérdida de audio/contexto, caller ID inesperado, transferencia rechazada, grabación sin consentimiento o sesiones que continúan cobrando después de un cierre aparente.

**Criterios de aceptación futuros:** definir qué significa “transferir” en cada adaptador — puente, nuevo leg o REFER —, quién controla la llamada antes/después y quién termina cada leg. Aceptar éxito, rechazo, timeout y abandono con facturación observable. Grabación desactivada por defecto y bloqueada donde el perfil no la permita.

**Pruebas obligatorias:** cold/warm transfer y conferencia por carrier/destino soportado, rollback visible, caller ID, DTMF, hold audio, desconexión del agente, cancelación concurrente, cierre y CDR; permisos/consentimiento/retención si se incorpora grabación. G-Figma para controles, participante, consulta, error y estados de consentimiento.

**Modelo de costo operativo:** costo P1 + minutos de legs adicionales + participante-minutos + invocaciones de transferencia cuando realmente se use ese comando + grabación/almacenamiento si se habilitan. [Telnyx Voice API pricing](https://telnyx.com/pricing/voice-api), consultado 2026-10-20, publica USD 0,10 por invocación de transfer; no debe aplicarse automáticamente a cualquier cambio de agente en la UI.

### P3 — SMS/MMS · 6–8 engineer-weeks

**PROPUESTA. Prioridad:** expansión después de voz. **Dependencias:** conversación durable, perfiles país/dirección, sender habilitado y registros requeridos.

**Alcance:** inbox/send, estados de entrega, segmentos, opt-in/opt-out, adjuntos, límites, retención y costos por mensaje. Evitar fallback MMS→SMS silencioso; mostrar el canal realmente utilizado.

**HECHO documental:** [Twilio Global MMS](https://help.twilio.com/articles/12557401622811-Twilio-Global-MMS) incluye **US, Canadá y Australia**; la matriz australiana documenta longcodes entrantes/salientes y límites propios. [Sending and receiving MMS](https://help.twilio.com/articles/223179808-Sending-and-receiving-MMS-messages) restringe el envío australiano a números australianos habilitados; no acredita libre intercambio entre todos esos países. La consulta de Twilio Help usó contenido oficial indexado porque la apertura directa devolvió una shell JavaScript. [Telnyx MMS FAQ](https://support.telnyx.com/en/articles/4450150-faqs-about-mms-at-telnyx) limita MMS a **US/Canadá**, con límites por carrier y adjunto. Fuentes consultadas 2026-10-20; operación no verificada.

**Riesgos:** segmentación/cobro inesperado, adjuntos rechazados, DLR incompleto, duplicados y bloqueo del sender. Los trámites de registro no están incluidos en semanas de ingeniería.

**Criterios de aceptación futuros:** bloquear combinaciones país/número/dirección no demostradas; registrar canal, segmentos y estado real; consentimiento y baja efectivos; explicar límites de adjunto y entrega sin presentar un DLR como lectura humana.

**Pruebas obligatorias:** GSM/Unicode y segmentación; eventos repetidos/tardíos, opt-out, MIME/tamaño y URLs caducadas, política de fallback, tenant isolation, envío/recepción real por perfil autorizado y conciliación MDR. G-Figma de inbox, composer, adjuntos y estados.

**Modelo de costo operativo:** suma por país/dirección de segmentos SMS × tarifa + MMS × tarifa + carrier fees + números/capacidades + registros recurrentes + almacenamiento/egress. Tarifas exactas de messaging y registros quedan **PENDIENTES**; no usar el costo de voz como sustituto.

### P4 — WhatsApp · 6–10 engineer-weeks

**PROPUESTA. Prioridad:** expansión posterior. **Dependencias:** conversación/inbox de P3 y verificación vigente de WABA, remitente, BSP/CPaaS, templates, categorías y reglas de sesión.

**Alcance:** canal WhatsApp de mensajería, plantillas aprobadas, mensajes de servicio permitidos, adjuntos y handoff humano. Voice AI por WhatsApp calling no está incluido por equivalencia con messaging.

**Riesgos:** cambios de políticas/precio, plantilla rechazada, restricciones de país/categoría, account limits y suspensión. En este paso no se ha inspeccionado una WABA ni se ha certificado la disponibilidad de ambos carriers.

**Criterios de aceptación futuros:** capacidad por proveedor/cuenta/dirección sustentada en documentación actual; bloqueo de envío fuera de reglas; lifecycle de templates y permisos visible; estado de entrega conciliado. Si falta soporte en un proveedor, se declara explícitamente en lugar de simular paridad.

**Pruebas obligatorias:** template permitido/rechazado, categorías y ventana vigente, reintentos idempotentes, opt-out, attachments, webhooks firmados, límites y aislamiento; intercambio real con destinatarios de laboratorio autorizados. G-Figma en EN/ES, Light/Dark y móvil.

**Modelo de costo operativo:** tarifas vigentes de Meta por mercado/categoría/unidad + cargos BSP/CPaaS + media/almacenamiento + infraestructura. **HECHO documental:** el paquete identifica [Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/), [Twilio WhatsApp pricing](https://www.twilio.com/en-us/whatsapp/pricing) y [Telnyx WhatsApp pricing](https://telnyx.com/pricing/whatsapp), consultados el **20-Oct-2026**, con la adenda Meta del **21-Oct-2026**. **PENDIENTE antes de activar P4:** revalidar las reglas y rate cards vigentes, elegibilidad y cargos efectivos de cuenta, y conciliar la factura; no se inventa una tarifa plana mundial ni se declara GA desde una página comercial.

### P5 — Voice AI con runtime portable · 10–14 engineer-weeks

**PROPUESTA. Prioridad:** estratégica después de voz estable. **Dependencias:** P1–P2, G-Figma, resolución de licencias de artefactos, topología SIP/media y contrato de handoff aceptados.

**Alcance de referencia:** **LiveKit Agents JS/TS**, worker Node/Docker separado de la API de negocio; servicios SIP y SFU autoalojados con los carriers Twilio/Telnyx como trunks compatibles por validar. Delegar SIP/RTP y mezcla a servicios de media, STT/TTS a adaptadores y herramientas/routing/permisos al control propio.

```text
Twilio SIP / Telnyx SIP -> servicio LiveKit SIP -> LiveKit SFU / sala
                                                   |-> navegador humano
                                                   |-> worker Agents JS/TS
API Aureform Node <-> SQL / auditoría <-> contrato de sesión / handoff
Worker -> adaptadores STT / LLM / TTS permitidos
```

El esquema es **PROPUESTA**, no integración probada. [Self-hosting](https://docs.livekit.io/transport/self-hosting/) documenta SIP como servicio separado; SFU, TURN/TLS, red, workers y almacenamiento requieren operación. Egress se agrega si se autoriza grabación; Ingress solo donde la topología lo necesite. [Provider quickstarts](https://docs.livekit.io/telephony/start/providers/) incluye Twilio y Telnyx, sin certificar esta implementación. Fuentes consultadas 2026-10-20.

La base **no es un conector exclusivo de WebSocket de LiveKit Cloud** ni IA nativa first. Cloud será una alternativa de despliegue/costo, no requisito. Un participante SIP añade una ruta/leg y costos del carrier; media/SIP autoalojados añaden cómputo y red, y Cloud, si se elige, tiene [su propia facturación](https://livekit.com/pricing), consultada 2026-10-20.

**HECHO de versión/requisitos:** [releases Agents JS](https://github.com/livekit/agents-js/releases) y [manifest](https://raw.githubusercontent.com/livekit/agents-js/main/agents/package.json) registran 1.9.3, publicada en octubre de 2026, código Apache-2.0 con excepciones de modelos. [Quickstart](https://docs.livekit.io/agents/start/voice-ai/) exige Node ≥20 y pnpm ≥10.15.0; [Docker builds](https://docs.livekit.io/deploy/agents/builds/) recomienda `node:24-slim`. Consultadas 2026-10-20. Se propone fijar una versión Node 24 compatible con el mínimo local ≥22.18; todavía no se ha instalado ni probado.

**Alternativa:** [Pipecat 1.13.0](https://github.com/pipecat-ai/pipecat/releases), publicada 2026-10-19; [manifest versionado](https://raw.githubusercontent.com/pipecat-ai/pipecat/v1.13.0/pyproject.toml): Python ≥3.11, BSD-2-Clause y clasificador upstream Production/Stable. Consulta 2026-10-20. Puede operar como sidecar detrás del mismo contrato, pero **Python no es un segundo lenguaje requerido para el baseline**. Su [despliegue](https://docs.pipecat.ai/pipecat/deployment/overview) requiere supervisión/dispatch propio o managed; [Pipecat Cloud](https://docs.pipecat.ai/pipecat-cloud/introduction) es un servicio distinto, sin paridad automática entre transportes.

**Riesgos:** latencia y endpointing, interrupciones tardías, audio roto en handoff, pérdida de ownership, modelos incompatibles, recursos de media insuficientes y dependencia inadvertida de servicios Cloud.

**Criterios de aceptación futuros:** demostrar despliegue portable con artefactos licenciados, sin plugin Cloud obligatorio; probar ambos trunks independientemente. Documentar ownership de sesión, cancelación y finalización, contexto mínimo, permisos de tools y resultado del handoff. Medir **objetivos propuestos** p95 de fin de turno del usuario a primer audio de respuesta **≤2 s**, y p95 de inicio de interrupción del usuario a corte audible de respuesta **≤300 ms**, con carga, idiomas y punto de medición declarados. Son objetivos experimentales, **no SLA verificado**.

**Gate de audio/handoff:** transferencia de conversación entre agentes AI, ingreso de humano a una sala y transferencia PSTN por REFER son operaciones distintas. [Cold transfer](https://docs.livekit.io/telephony/features/transfers/cold/) exige permiso del trunk y finaliza la sesión LiveKit al completar el REFER; no asegura continuidad de un estado propio en otro carrier. [WarmTransferTask](https://docs.livekit.io/agents/prebuilt/tasks/warm-transfer/) documenta consulta privada/contexto/merge; su namespace Node es estable desde v1.5+, mientras Python usa `beta.workflows`. Consultadas 2026-10-20. Esa tarea SIP no demuestra por sí sola el handoff al web-softphone de P1: hay que elegir y probar la topología real.

**Pruebas obligatorias:** audio PSTN y navegador real, codecs/resampling, packet loss, interrupciones y silencios, CPU/memoria por sesión, reinicio/drain de workers, STT/TTS/LLM fallidos, aislamiento y autorización de herramientas; handoff exitoso, rechazado, timeout y caller hangup con media efectiva y cierre de legs; medición p95 reproducible y licencias por hash. G-Figma de sesión AI/humano, bloqueos, transcripción y estado de handoff.

**Modelo de costo operativo:** carrier/trunk + API si se utiliza + media/SIP/TURN + worker compute/reserva + STT (audio) + LLM (tokens) + TTS (unidad del proveedor) + red/telemetría/retención. Inferencia o hosting managed añaden sus cargos. El presupuesto P1 de USD 75 y su VM mínima **no dimensionan P5**.

### P6 — Flow completo y Prompt-to-Flow · 8–12 engineer-weeks

**PROPUESTA. Prioridad:** producto avanzado. **Dependencias:** contrato mínimo P0/P1 y capacidades aceptadas de las fases cuyos nodos se habiliten.

**Alcance:** editor de nodos tipados, puertos y transiciones; drafts/revisiones/publicación explícita, validación, diff, simulación, límites de loops, replay de control y observabilidad. Prompt-to-Flow genera un **draft validable**; no publica ni ejecuta efectos por recibir un prompt. Separar rutas deterministas y decisiones LLM con salida restringida.

**Riesgos:** confundir grafo visual con ejecución durable, cambios sobre llamadas activas, secretos en exports, efectos duplicados y flows generados con operaciones no soportadas.

**Criterios de aceptación futuros:** export/import de contrato propio versionado; cada sesión fija una revisión; validación de país/canal y permisos en servidor; simulación sin efectos externos; aprobación de cambios y operaciones costosas; interfaz lista/formulario utilizable además del canvas.

**Pruebas obligatorias:** tipos y puertos, reachability, loops/timeouts, migración de revisiones, idempotencia y restart; fixtures de generación inválida y prompt injection; impedir publicación/efectos sin permisos; teclado y lector de pantalla, EN/ES y navegación móvil alternativa; G-Figma con nodes, inspector, edges, errores y drafts.

**Modelo de costo operativo:** ejecución SQL/workers/eventos + almacenamiento de versiones/trazas + tokens de generación si se utiliza IA + uso real de canales/nodos. [React Flow accessibility](https://reactflow.dev/learn/advanced-use/accessibility), consultado 2026-10-20, aporta teclado/ARIA configurables, pero no certifica accesibilidad del producto; [computing flows](https://reactflow.dev/learn/advanced-use/computing-flows) no aporta una queue engine durable. Editor y motor operacional se presupuestan por separado.

### P7 — dialer secuencial · 6–8 engineer-weeks

**PROPUESTA. Prioridad:** última. **Dependencias:** P1–P2, permisos salientes/country gates, consentimiento y opt-out; P6 si las campañas usan flows. SMS/WhatsApp no son dependencias técnicas obligatorias de una lista de voz.

**Alcance:** lista E.164/importación, validación, deduplicación, pause/resume/skip, una llamada activa por agente, wrap-up y resultados. Coordinar con la cola entrante; política explícita de ocupación, interrupción y prioridad. Sin predictive dialer, marcación paralela especulativa ni AMD habilitado por defecto.

**Riesgos:** marcación duplicada tras reinicio, costos de intentos, destinos restringidos, conflictos con inbound y contacto sin permiso.

**Criterios de aceptación futuros:** solo marcar destinatarios/countries permitidos con reglas y autorización; límites de intentos y gasto; no iniciar otra llamada hasta cierre/wrap-up; rechazos y opt-out excluyen la siguiente ejecución. La activación de campañas salientes requiere su propia autorización.

**Pruebas obligatorias:** importar inválidos/duplicados, estados de lista, cancelación y restart, timezone, opt-out y permisos, rechazo/no-answer/busy/answer reales por carrier, entrada simultánea, límite de una llamada por agente y CDR por intento. G-Figma de lista, dialer, wrap-up y casos bloqueados.

**Modelo de costo operativo:** números + minutos salientes facturables por destino/leg + API/navegador + intentos, transferencias y conferencias + AMD solo si luego se decide + infraestructura. Un minuto conectado no representa todo el costo del dialer; tarifas y restricciones salientes deben actualizarse antes de aprobar una campaña.

## 5. Elecciones de componentes que afectan las fases

La comparación de mercado y OSS se desarrolla en [RESEARCH.md](RESEARCH.md); las restricciones por proveedor están en [CAPABILITY-MATRIX.md](CAPABILITY-MATRIX.md). Aquí se conserva su efecto sobre las decisiones del plan:

| Categoría | Ventaja | Decisión para este roadmap |
| --- | --- | --- |
| CCaaS/SaaS y builders CPaaS | Operación integrada o ejecución alojada. | Referencias y alternativas; P1 usa primitivas de carrier y control propio. Precio API y suite completa no equivalen en costo total. |
| Frameworks LiveKit Agents / Pipecat | Pipeline programable y providers sustituibles. | P5 prioriza JS/TS portable; operación, modelos y managed conservan condiciones separadas. |
| Servicios y engines de media/SIP | Transporte, mezcla y telefonía especializados. | Delegarlos; agregar solo servicios exigidos por la topología, con sus licencias y costos. |
| Bibliotecas de editor | Nodos, puertos e interacción visual. | P6 separa canvas y contrato de ejecución durable. React Flow no es queue engine. |

**PROPUESTA de diferenciación:** contratos y exports originales Apache-2.0, catálogo global con restricciones por dirección, runtime portable, simulación, costos por unidad y paridad Figma editable. La demanda es una hipótesis por validar; no se atribuye market share. El diseño será propio, sin copiar UX ni assets propietarios.

## 6. Licencias y contradicciones que bloquean decisiones

**PROPUESTA de política:** Apache-2.0 cubre código/documentación/diseño original de Aureform, no relicencia SDKs, engines, modelos ni SaaS. Mantener procesos/servicios separados, versiones y avisos propios; el inventario SPDX/SBOM y las licencias por artefacto serán requisitos previos al build/distribución, incluidas imágenes Docker, dependencias transitivas, voces, audio y pesos.

**Gate de pesos:** bloquear incorporación, vendoring y descarga implícita en una imagen distribuida de modelos sujetos a `MODEL_LICENSE` o a licencia/procedencia no resuelta hasta revisar el artefacto exacto y sus condiciones. Solo una selección que respete esas condiciones puede aceptarse; etiquetar el servicio por separado no convierte sus pesos en Apache.

| Dependencia / fuentes oficiales, consulta 2026-10-20 | Restricción y decisión propuesta |
| --- | --- |
| [Agents JS Apache manifest](https://raw.githubusercontent.com/livekit/agents-js/main/agents/package.json) + [MODEL_LICENSE](https://raw.githubusercontent.com/livekit/agents-js/main/MODEL_LICENSE) | Apache para código no implica Apache para modelos propietarios: la licencia de modelos limita uso a LiveKit Agents, no standalone ni otros frameworks. Mantener modelos fuera del core Apache; evaluar cada peso y no trasladarlo a Pipecat. Usar un `LicenseRef` apropiado donde no exista SPDX estándar. |
| [LiveKit REUSE.toml](https://raw.githubusercontent.com/livekit/agents-js/main/REUSE.toml) + [Silero upstream LICENSE](https://raw.githubusercontent.com/snakers4/silero-vad/master/LICENSE) | REUSE marca `silero_vad.onnx` como **CC-BY-NC-SA-4.0**, mientras upstream publica MIT. **Conflicto abierto:** bloquear vendoring/redistribución y aceptación del artefacto para uso comercial hasta probar procedencia/hash/licencia del peso exacto y resolver la contradicción. Una licencia Apache del plugin no lo resuelve. |
| [Pipecat manifest BSD-2-Clause](https://raw.githubusercontent.com/pipecat-ai/pipecat/v1.13.0/pyproject.toml) | Conservar copyright/avisos; plugins y modelos requieren auditoría independiente. Opcional como servicio Python, no paquete obligatorio del core Node. |
| [xyflow LICENSE MIT](https://raw.githubusercontent.com/xyflow/xyflow/main/LICENSE) / [React Flow Pro](https://reactflow.dev/pro) | Core `@xyflow/react` MIT con avisos. Ejemplos/soporte Pro tienen condiciones propias; no asumir una licencia para assets comerciales ni accesibilidad automática. Candidato preferido de editor. |
| [Rete licensing](https://retejs.org/docs/licensing/) | La mayoría de paquetes son MIT; `rete-structures` y `rete-scopes-plugin` tienen CC-BY-NC-SA-4.0. Auditar plugin por plugin y excluir componentes NC del baseline comercial. |
| [n8n license FAQ](https://support.n8n.io/article/can-i-use-your-license-for-my-use-case), actualizada 2026-10-06 | Community usa Sustainable Use License, no OSS OSI. Si clientes externos crean/configuran workflows, incluso por UI propia, API/MCP/AI, exige licencia comercial; también hosting como servicio/white-label. No incluirlo como runtime Apache por defecto. |
| [FreeSWITCH LICENSE](https://raw.githubusercontent.com/signalwire/freeswitch/master/LICENSE) | Base MPL-1.1 con excepciones por archivo; [módulos comerciales](https://developer.signalwire.com/freeswitch/module-reference/commercial-modules/) aparte. Servicio separado opcional, con obligaciones de distribución/modificaciones según artefacto; no atribuirle Apache. |
| [Asterisk License Information](https://docs.asterisk.org/About-the-Project/License-Information/) + [ASF GPL compatibility](https://www.apache.org/licenses/GPL-compatibility.html) | GPLv2/alternativa comercial y módulos sujetos a condiciones propias. Interfaces externas ARI/AMI/AGI permiten programas con otras licencias según su documentación. Preferir servicio independiente; evitar código/módulos enlazados bajo un supuesto “todo Apache”. Apache-2.0/GPLv2 no son compatibles para una obra combinada; distribución concreta requiere revisión. |

**PENDIENTE de modelos:** resolver también turn detectors y cualquier download implícito durante build. Proponer inicialmente endpointing del STT o VAD cuyo artefacto se pueda verificar; si no satisface las mediciones, P5 queda pendiente. Separar un servicio no elimina restricciones NC ni otorga derechos de redistribución.

**HECHO contradictorio de Telnyx, sin conclusión categórica.** [Support 8118086](https://support.telnyx.com/en/articles/8118086-texml-and-telnyx-voice-api-compatibility) desaconseja mezclar TeXML y Call Control en la misma aplicación/llamada y atribuye AI Assistants a TeXML. Sin embargo, [Attach an AI Assistant to a Call](https://developers.telnyx.com/docs/voice/programmable-voice/ai-assistant-start) exige aplicación Call Control, documenta `answer`/`dial` con `assistant.id`, `ai_assistant_start` y `ai_assistant_stop`; después de stop, Call Control continúa y se factura hasta terminar la llamada. Ambas consultadas 2026-10-20.

Se conserva un solo modo de control por llamada y conexiones separadas para TeXML/Call Control. **Native AI sobre Call Control está documentada; disponibilidad/control efectivos siguen sin verificar por versión y cuenta debido al conflicto**. No se afirma que toda IA nativa sea incompatible con Call Control ni que TeXML y Call Control sean intercambiables.

Para IA propia por stream, [Telnyx media streaming](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming) y [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams) documentan transportes con límites distintos, consultados 2026-10-20. Son opciones de adaptador no nativo, no prueba del baseline SIP portable, del handoff ni de equivalencia entre APIs.

## 7. Modelo de costos del laboratorio P1

**HIPÓTESIS acotada:** un mes de alquiler; un número local US aprobado por carrier; dos agentes registrados; 1.000 minutos PSTN entrantes conectados totales, divididos **500/500**. Para el ejemplo, navegador **B = 500** por carrier y Telnyx API **A = 500**; estos son minutos supuestos facturables, todavía no CDR medidos. Cero campañas/transferencias externas, AI, grabación y WhatsApp.

| Unidad pública | Twilio US | Telnyx | Fuente oficial / consulta / restricción |
| --- | ---: | ---: | --- |
| Número local, mes | 1,15 | Desde 1,00 | [Twilio US Voice](https://www.twilio.com/en-us/voice/pricing/us), [Telnyx Numbers](https://telnyx.com/pricing/numbers); **2026-10-20**. “Desde” no cotiza el número elegido. |
| PSTN entrante, minuto | 0,0085 | Trunk desde 0,0032 | [Twilio US Voice](https://www.twilio.com/en-us/voice/pricing/us), [Telnyx Elastic SIP](https://telnyx.com/pricing/elastic-sip); **2026-10-20**. País, origen/destino y modalidad pueden variar. |
| Voice API, minuto aplicable | No añadir una línea equivalente ficticia | 0,002 adicional al trunk | [Telnyx Voice API](https://telnyx.com/pricing/voice-api); **2026-10-20**. TeXML tiene la misma tarifa publicada; falta demostrar qué legs generan minutos API en esta topología. |
| Browser/app leg, minuto | 0,004 | 0,002 | [Twilio US Voice](https://www.twilio.com/en-us/voice/pricing/us), [Telnyx Voice API](https://telnyx.com/pricing/voice-api); **2026-10-20**. Medir duración del leg, no número de agentes registrados. |
| Conferencia, participante-minuto | 0,0018 US | 0,002 | [Twilio Conference](https://www.twilio.com/en-us/voice/conference/pricing), [Telnyx Voice API](https://telnyx.com/pricing/voice-api); **2026-10-20**. Adicional donde se utilice; región y espera importan. |
| Transfer command, invocación | Fuera del ejemplo | 0,10 | [Telnyx Voice API](https://telnyx.com/pricing/voice-api); **2026-10-20**. X=0 en P1; no cobrarlo teóricamente por cualquier bridge. |
| Queue, rounding y cargos adicionales | Pendientes | Pendientes | No se identificó una tarifa de queue suficiente para certificar este diseño. Ausencia de una fila no significa gratuidad. |

Definir **P** = minutos PSTN facturables; **B** = minutos de legs de navegador; **K** = suma de participante-minutos de conferencia; **A** = minutos API facturables de Telnyx; **X** = invocaciones de transferencia; **Q** = cargos de queue aplicables por resolver; **N/r** = alquiler/tarifa efectiva del número y trunk.

```text
C_Twilio = 1,15 + 0,0085·P_Tw + 0,004·B_Tw + 0,0018·K_Tw + Q_Tw
C_Telnyx = N_Te + r_Te·P_Te + 0,002·A_Te + 0,002·B_Te
           + 0,002·K_Te + 0,10·X_Te + Q_Te
C_total = C_Twilio + C_Telnyx + infraestructura + otros cargos aplicables
```

| Cálculo ilustrativo, antes de Q/extras/impuestos | Twilio | Telnyx | Total telecom |
| --- | ---: | ---: | ---: |
| P=B=500 por carrier; A_Te=500; N_Te=1; r_Te=0,0032; K=0; X=0 | 7,40 | 4,60 | **12,00** |
| Igual, con K=1.000 participante-minutos en cada carrier | 9,20 | 6,60 | **15,80** |

El segundo caso presupone dos participantes durante 500 minutos por proveedor. No prueba que la topología de cola/softphone permita el primer caso. Si los legs API de Telnyx sumaran **A=1.000**, el ejemplo subiría USD 1,00; esto es sensibilidad, **no regla de factura confirmada**.

Esperas, ringing/answer timing, redondeo por leg, reintentos, participantes adicionales, queue nativa, impuestos, recargos, emergencia y eventuales cargos del número siguen pendientes. Si la espera ya está en P no se suma dos veces; si queda fuera de los 1.000 minutos conectados, puede añadir uso. Revisar [Twilio rounding](https://help.twilio.com/articles/223132307-How-do-you-round-minutes-for-billing-), consultado 2026-10-20 mediante contenido oficial indexado, y las reglas aplicables a cada producto antes de presupuestar. Dos agentes registrados no duplican automáticamente B.

**Requisitos documentados, no configurados:** [Twilio Voice SDK JS](https://www.twilio.com/docs/voice/sdks/javascript) y [Access Tokens](https://www.twilio.com/docs/iam/access-tokens) requieren aplicación/routing de voz, identidad/grants y tokens emitidos desde servidor; HTTPS/micrófono y soporte de navegador deben comprobarse. [Telnyx WebRTC fundamentals](https://developers.telnyx.com/docs/voice/webrtc/fundamentals) y [Voice API fundamentals](https://developers.telnyx.com/docs/voice/programmable-voice/voice-api-fundamentals) exigen los objetos de conexión/aplicación y autenticación/routing correspondientes. Consultadas 2026-10-20. Ninguna cuenta, aprobación ni número de este laboratorio se ha inspeccionado aquí.

**HIPÓTESIS de infraestructura mínima P1:** una VM con Docker para API/worker de control y SQL, disco persistente, TLS, backups y logs básicos; sin HA ni servidores propios de audio/SFU. [DigitalOcean Droplets](https://www.digitalocean.com/pricing/droplets), consultado 2026-10-20, publica **USD 12/mes por 1 vCPU, 2 GiB RAM, 50 GiB SSD y 2.000 GiB de transferencia**. Es una referencia pública, no selección/provisión. Reservar **USD 15–25/mes** para ese laboratorio es una hipótesis de planificación; dimensionamiento, backups, IP/red, tráfico y costos efectivos deben comprobarse. Keycloak propio puede exigir más recursos. No representa un mínimo certificado de producción ni cubre media/AI de P5.

**PROPUESTA de autorización futura acotada: USD 75**, distribuida en **30 telecom + 25 infraestructura + 20 contingencia** para una ventana de laboratorio de hasta un mes. Antes de gastar: revalidar tarifas/números/topología, aclarar A/Q, fijar límite de uso y procedimiento de parada, y obtener **aprobación explícita separada** del usuario para servicios, llamadas y monto. El presente documento **no autoriza nada de ese presupuesto**.

**Referencia AI excluida de P1:** la URL canónica es [Twilio ConversationRelay overview](https://www.twilio.com/docs/voice/conversationrelay), con [contrato TwiML](https://www.twilio.com/docs/voice/twiml/connect/conversationrelay). El [changelog](https://www.twilio.com/en-us/changelog/conversationrelay-is-now-available-in-ga) acredita GA desde **2025-05-14**; [pricing oficial vigente](https://www.twilio.com/en-us/products/conversational-ai/pricing) publica **USD 0,07/min**, con voz cobrada por separado. Consulta **2026-10-20**; no hay quote de cuenta. Es una opción alojada posterior, no inferencia gratis ni el runtime portable baseline.

## 8. Pendientes y evidencia exigida para avanzar

| Pendiente | Gate / responsable propuesto | Evidencia futura exigida |
| --- | --- | --- |
| Paridad 1.4/1.5 en recuperación nativa y expansión Communications | G-Figma / diseño + ingeniería | Partir de la auditoría estructural de 7 páginas, 714 variables, 14 estilos de texto y 6 de sombra; aceptar masters/componentes/estados, mapa EN/ES-Light/Dark-móvil y readbacks actuales; resolver la estimación adicional `UNESTIMATED`. |
| Coherencia del paquete de siete documentos | P0 / documentación | Mantener alineados perfiles, contratos, decisiones de runtime, gates y experimentos entre R1–R6 y el roadmap. |
| Perfil global y requisitos por dirección | Antes de habilitar cada perfil / producto + operador | Fuente fechada, permisos de cuenta y prueba independiente; unknown bloqueado. Trámites legales/KYC fuera de la estimación. |
| Topología mínima de bridge/queue/conferencia y A/Q de Telnyx | Antes de laboratorio P1 / backend + operador | Diagrama de legs, comandos, estados, tarifas/unidades y CDR conciliados por ruta. |
| Prueba real de ambos carriers | Aceptación P1 / ingeniería + QA | Audio y controles PSTN/browser, FIFO, horarios y concurrencia 2; evidencia Twilio y Telnyx separada. |
| Ownership del runtime Voice AI | ADR previo a P5 / backend | Quién inicia, posee, drena y termina la sesión; límites/restarts; contrato de sesión, eventos y cancelación. |
| Interfaz de handoff y responsable SIP | Gate P5 / operador media + backend | Humano navegador vs endpoint SIP vs REFER, contexto permitido, transfer outcome y hangup ownership; audio real y billing después de cada transición. |
| Pesos/turn detection/Silero y licencias | Antes de build/vendoring/distribución P5 / responsable de licencias | Artefacto/versión/hash, licencia exacta y resolución del conflicto REUSE; modelos no heredan Apache del SDK. |
| Native AI Telnyx con Call Control | Solo si se añade esa opción / adaptador | Version/account proof y resolución del conflicto oficial; no sustituye el baseline portable. |
| Latencia p95 y continuidad de media | Aceptación P5 / ingeniería + QA | Mediciones reproducibles, regiones/carga/idiomas, audio efectivo durante handoff; sin vender el objetivo como SLA. |
| SMS/MMS, WhatsApp y outbound vigentes | Antes de P3/P4/P7 / operador + producto | Rate cards, requisitos, capacidades por número/país/dirección y prueba autorizada. No extrapolar Voice US al resto. |

**PROPUESTA de cierre por fase:** contrato y perfiles actualizados; G-Figma de su alcance aceptado; pruebas obligatorias ejecutadas con resultados y limitaciones propios; licencias por artefacto verificadas; costos por unidad conciliados y operación documentada. Las pruebas con efectos externos solo se ejecutarán con autorización correspondiente. Un stub local o una captura de UI no sustituye prueba de audio ni disponibilidad del proveedor.

**Estado del plan:** paquete documental de P0 para revisión. La auditoría estructural Figma aporta evidencia; la recuperación nativa 1.4/1.5 está en curso y su paridad sigue pendiente de aceptación. P1–P7 describen trabajo futuro, sin certificación actual de integraciones, audio, facturación ni SLA.
