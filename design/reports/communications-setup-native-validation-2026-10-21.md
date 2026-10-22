La fuente nativa de Communications está terminada en la página **585:59**, «14 · Communications · Automatic setup», del archivo `lHp5p10yGb7lqXJDnAox0N`. La fecha de sesión de los nombres de archivo es 2026-10-21; las lecturas finales ocurrieron el 2026-10-22 UTC.

| Fuente editable | ID real | Cobertura |
| --- | --- | --- |
| CommunicationsSetup | 591:1343; default 591:105 | 8 variantes: proveedor × desktop/mobile × demo/live |
| CommunicationsSoftphoneTemplate | 593:2614; default 593:741 | 4 entradas de la ruta Softphone |
| ConnectedSoftphone | 600:5022; default 600:4170 | 8 variantes: proveedor × desktop/mobile × Light/Dark |
| Provider setup dialog | 604:5565 | 4 variantes desktop/mobile × Light/Dark |
| Flujo A / flujo B / casos límite | 594:3809 / 595:4580 / 599:4678 | 20 snapshots visuales; no prop React `phase` inventada |
| Referencia privada | 603:5006 / 603:5069 / 603:5112 / 603:5175 | Login y autorización de prueba; únicamente asociaciones privadas |

Entradas preferidas para la ruta `softphone`:

| Modo | ID | Dimensiones nativas |
| --- | --- | --- |
| Desktop Light | 593:741 | 1440 × 1900 |
| Desktop Dark | 593:1391 | 1440 × 1900 |
| Mobile Light | 593:1746 | 390 × 3099 |
| Mobile Dark | 593:2303 | 390 × 3099 |

La lectura de **01:32:11.838 UTC** confirmó los IDs, las propiedades del set principal y los modos explícitos Light `2:1` / Dark `2:2` de la colección `VariableCollectionId:2:36`. El baseline permaneció en **714 variables, 14 estilos de texto y 6 estilos de efectos**. La página contiene **6001 nodos actuales**, incluidos **1701 textos editables**, **1097 vectores**, **57 componentes** y **9 sets**. Hay cuatro pinturas IMAGE heredadas de avatares; ninguna imagen de interfaz se usa como fuente del diseño.

El journal conserva los 6001 IDs actuales sin duplicados y los cuatro IDs de hints eliminados observados. Los tres fragmentos coinciden con los checksums devueltos por Figma: `f3c24ebd`, `548bd495`, `13909323`. Es una unión completa de identidades actuales, no una reconstrucción de cada override transitorio.

La captura seleccionada **604:5566** se exportó realmente después de corregir el texto móvil del Account SID: **1198 × 1531 PNG, 562404 bytes, 01:23:44.811 UTC**. Se revisaron el modal desktop Light y el cuerpo móvil Dark. El connector devolvió la imagen inline y no suministró una URL de descarga; no se afirma que exista un PNG local ni un SHA256 de esa imagen. El registro verificable está en `design/proofs/communications-setup-2026-10-21/native-selected-readback.json`.

La lectura semántica de **01:39:33.471 UTC** verificó **6/6** textos de Twilio y Telnyx en `configured`, `unknown` y `failed`: **«Configuración de webhooks»**, correspondiente a **“Webhook configuration”** en la fuente congelada, línea 977. Es readback de configuración. No acredita entrega de webhook firmado, conexión del navegador ni llamada real. Los nodos ya tenían el texto correcto; esa operación no escribió en el canvas.

El helper preparatorio se sincronizó con ese literal y el copy se volvió a extraer mediante el AST real de TypeScript: **101 pares literales EN/ES** de tres fuentes actuales. No se inventaron traducciones. La extracción no pretende cubrir expresiones dinámicas ni condicionales. Su lint dirigido pasa con **0 errores y 0 warnings**. El helper no es un replay completo de la página final.

Los nueve `sourceSnapshots` SHA256 del mapa corresponden a los archivos runtime congelados. El único template nuevo autorizado es `.figma/CommunicationsSetup.figma.ts`: enlaza `Provider` con el prop real `defaultProvider`; `Viewport` y `Mode` son dimensiones visuales explícitas, y el ejemplo emitido utiliza el adapter demo inerte real. La verificación local independiente cubre ocho variantes, dos ejemplos tipados distintos y nueve guards. Sus resultados y el hash exacto del mapa comprobado se conservan en el receipt y en `artifacts/communications-design/setup-code-connect-validation.json`.

ReferenceConnection permanece en `sourceAssociations` y `privateFrames`, fuera de `components`; este trabajo no agrega una entrada de registry. Las páginas anteriores, las 69 raíces y los 92 templates históricos, las 20 fuentes anteriores de Softphone y los fundamentos no fueron modificados por este scope.

Persisten límites concretos: chrome/workspace heredado en EN frente al nuevo setup ES; gradientes aproximados; placa Telnyx nativa de 66 px frente a 64 px de fuente; truncamiento nativo con elipsis en campos estrechos; scroll y foco del modal no certificados por Figma. El cierre de 28 px y los inputs privados de 40 px siguen la fuente y excluyen una afirmación universal de targets de 44 px. La captura seleccionada no certifica todos los perfiles ni paridad de píxel. Configuración autenticada, permisos del proveedor, SDK, entrega firmada y llamada real requieren evidencia runtime independiente.

El lease de escritura quedó **inactivo** y se devolvió el **2026-10-22T01:36:22.791297Z**. La comprobación semántica posterior fue únicamente lectura. El mapa final y el receipt son los artefactos de handoff; Main conserva publicación y empaquetado.
