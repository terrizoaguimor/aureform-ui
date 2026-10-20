# Operaciones SaaS: contrato de integración para 1.2

[English](saas-operations.md).

Esta guía conserva los **contratos de frontend implementados** para operaciones SaaS de equipos desde Source 1.2. Esas APIs siguen disponibles en el kit actual. Incluye onboarding, workspaces, miembros, importación CSV, consulta externa de clientes, vistas guardadas y detalle. Los exports y ejemplos siguientes proceden de las APIs reales de source. Los checkpoints ejecutados de consumers/nativo conservan su alcance en el [handoff](#handoff-del-release); estos ejemplos no certifican todos los estados interactivos ni la entrega final.

La base histórica 1.1 tiene **65 vistas, 44 familias y 83 entradas de registro**. La versión 1.2 añadió cuatro rutas para **69 vistas: 68 de suite más landing**, antes de expandir idiomas, y mejoró clientes/equipo en dos rutas existentes. Su registro contenía **96 entradas, incluidas 13 instalaciones nuevas**. El [catálogo actual](../src/lib/catalog.ts) conserva esas rutas y el [registro generado actual](../public/r/index.json) contiene **107 entradas**. Se conservan seis paletas y entrega EN/ES. El inventario actual no amplía el alcance de las pruebas históricas 1.2.

## Entrega y responsabilidad sobre los datos

Aureform aporta código de interfaz, patrones de composición y una demostración local. La aplicación consumidora controla los servicios de producción y el modelo de dominio. Consulta externa significa que quien integra controla los datos y el ciclo de consulta; no implica una API alojada por Aureform.

| Aspecto              | Límite de la demo local                                                                | Responsabilidad de la aplicación consumidora                                                  |
| -------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Onboarding           | Pasos controlados y borrador persistido; completar crea un workspace local.            | Creación de cuentas, identidad autenticada y reglas de negocio.                               |
| Workspace            | `WorkspaceProvider` selecciona registros de cada ámbito en el navegador.               | Pertenencia autorizada, IDs duraderos y aislamiento entre tenants en cada petición.           |
| Miembros             | Invitaciones locales, cambios de rol y transferencia de propiedad. Sin envío de email. | Autorización, entrega de invitaciones y cambios autoritativos de pertenencia.                 |
| Importación CSV      | Parseo, mapeo, validación y commit local por etapas.                                   | Esquema admitido, transacción/rollback, idempotencia y escritura duradera.                    |
| Consulta de clientes | Un adaptador asíncrono consulta el array local del workspace activo.                   | Carga, filtros, ordenación, paginación, totales y cancelación para una fuente de producción.  |
| Vistas guardadas     | Consulta, configuración de columnas y densidad dentro del workspace local.             | Propiedad personal/compartida, control de acceso y sincronización duradera.                   |
| Detalle y archivos   | Edición, notas/actividad locales y sólo metadatos de adjuntos.                         | Acceso al registro, conflictos, subida/almacenamiento binario y URLs de descarga autorizadas. |
| Apariencia           | Configuración existente y presets locales opcionales.                                  | Política de marca y persistencia fuera del navegador actual cuando se necesite.               |

Un éxito local tiene alcance local: registrar una invitación no envía un email, preview de rol no autentica y editar no escribe en la base del consumer. Los bloques controlados aceptan callbacks de quien integra; no requieren el `WorkspaceProvider` de demo.

Las credenciales de producción permanecen en el servidor del consumer. Los registros del navegador, archivos y parámetros de consulta son entradas no confiables. La visibilidad y los controles deshabilitados ayudan a comprender las acciones; los permisos se comprueban en el servidor.

## APIs implementadas en Source

| Export y fuente                                                                                                   | Puntos de integración públicos                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`WorkspaceProvider`, `useWorkspace`, `WorkspaceContextValue`](../src/components/workspace-provider.tsx)          | El provider recibe `children`; el hook expone `ready`, workspace/datos, capacidades y operaciones locales detalladas abajo. No hay prop de backend, seed ni reset inyectable.                                                                                                                     |
| [`SaasDemoState`, `WorkspaceRole`, `WorkspaceCapability`, `SaasError`](../src/lib/saas.ts)                        | Validación de estado, capacidades y helpers puros para política de miembros y merge de clientes. `SaasDemoState.version` es versión de serialización `1`, no release 1.1 ni 1.2.                                                                                                                  |
| [`OnboardingFlow`, `OnboardingFlowValue`, `OnboardingFlowProps`](../src/components/blocks/onboarding-flow.tsx)    | Requiere `value`, `onChange`, `onComplete`; opcionales `locale`, `onOpenCustomers`, `onOpenImports`, `className`. El callback de finalización devuelve `void` o `Promise<void>`.                                                                                                                  |
| [`OnboardingTemplate`, `WorkspaceSettingsTemplate`](../src/components/templates/saas-setup.tsx)                   | Onboarding reenvía las props del flujo. Ajustes recibe `workspace`, `canManage`, `onSave` y opcionales `onCreate`, `locale`, `className`; su valor es `{ id, name, slug, description }`.                                                                                                          |
| [`MemberManagement`, `MemberManagementProps`](../src/components/blocks/member-management.tsx)                     | `members`, `invitations`, `currentMemberId`, `canManage`, opcional `canTransferOwnership`; callbacks `onInvite`, `onChangeRole`, `onRemoveMember`, `onResendInvitation`, `onAcceptInvitation`, `onRevokeInvitation`, `onTransferOwnership`. Cada operación admite resultado síncrono o asíncrono. |
| [`ImportWizard<T>`, `ImportWizardProps<T>`](../src/components/blocks/import-wizard.tsx)                           | Requiere `fields`, `onImport`; opcionales `locale`, `getRowKey`, `existingKeys`, `validateRow`, `limits`, textos/archivo de ejemplo y `resourceHref`.                                                                                                                                             |
| [`ImportField<T>`, `ImportCallback<T>`, `ImportContext`, `ImportResult`](../src/lib/csv-import.ts)                | Mapeo y validación tipados; commit asíncrono con abort/progreso y recuentos verificables. También exporta campos de clientes, helpers de parseo/preview y `serializeCSV`.                                                                                                                         |
| [`DataWorkbench<T>`, `DataWorkbenchValue`, `DataWorkbenchSavedView`](../src/components/blocks/data-workbench.tsx) | Requiere `value`, `onValueChange`, datos/columnas de tabla; `filterFields`, callbacks de vistas, notificación opcional de consulta, selección, carga/error/reintento y props de tabla.                                                                                                            |
| [`DataTable<T>`, `DataTableProps<T>`](../src/components/ui/data-table.tsx)                                        | Por defecto `mode="client"`; externo requiere `rowCount`. Admite `query`, `columnState`, `rowSelection` controlados y sus callbacks; `onSelectedIdsChange` comunica IDs seleccionados. Los defaults anteriores siguen como contrato base.                                                         |
| [`DataTableQuery`, `DataTableColumnState` y helpers de normalización/serialización](../src/lib/data-query.ts)     | Búsqueda, filtros, ordenación múltiple y paginación desde cero; visibilidad/orden/tamaño/pinning de columnas son estado de presentación separado.                                                                                                                                                 |
| [`DataView`, `normalizeDataView`, `serializeDataView`, `parseDataView`](../src/lib/saved-view.ts)                 | Serialización versionada de consulta/presentación con allowlist de IDs de columnas.                                                                                                                                                                                                               |
| [`GenericRecordDetail`, `GenericRecordDetailProps`](../src/components/blocks/record-detail.tsx)                   | Presentación con título, metadatos, acciones, tabs, carga/error/reintento, registro ausente y contenido relacionado. No carga ni muta registros.                                                                                                                                                  |
| [`CustomerDetailTemplate`, `CustomerDetailTemplateProps`](../src/components/templates/customer-detail.tsx)        | Requiere `customer` (nullable), `notes`, `activity`; opcionales `canEdit`, `onSave`, `onAddNote`, `attachedFiles`, `onAttach`, `relatedInvoices`, carga/error/reintento y navegación de regreso.                                                                                                  |

`OnboardingFlow`, ajustes de workspace, `MemberManagement` e `ImportWizard` reciben `locale: "en" | "es"` explícito y usan inglés por defecto. `DataWorkbench` consulta `next-intl` mediante `useLocale`; detalle utiliza `useLanguage` y los mensajes `common`. Proporcionar `NextIntlClientProvider` incluso si se sustituyen etiquetas. Los callbacks de datos son neutrales respecto al provider; eso no elimina los requisitos de localización ni estilos instalados.

Las otras dos entradas nuevas de helpers son [`workspace-status`](../src/components/blocks/workspace-status.tsx) y [`record-actions`](../src/components/blocks/record-actions.tsx). `WorkspaceStatus({ roles?: boolean })` requiere contexto local de workspace/idioma; `WorkspaceLoading` y `WorkspacePermission` presentan estados localizados. `RowActions` recibe `name`, opcionales `edit`, `remove`, `view`, `viewLabel`. `DeleteDialog` recibe `open`, `onOpenChange`, `count`, `onDelete: () => void | Promise<void>` con feedback asíncrono; su confirmación describe la demo de navegador.

### Wrappers de suite y rutas

Los [providers de suite](../src/components/providers.tsx) ya componen `NextIntlClientProvider`, `AppearanceProvider` y `WorkspaceProvider`. Estos wrappers conectan la UI controlada con demo local y navegación Next.js; usar los bloques internos para un modelo de producción.

| Ruta por idioma                    | Wrapper local                                                                                                | Cambio de catálogo         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `/{locale}/onboarding/`            | `OnboardingOperationsTemplate` en [`saas-operations`](../src/components/templates/saas-operations.tsx)       | Nueva                      |
| `/{locale}/settings/workspace/`    | `WorkspaceOperationsPanel` dentro de ajustes                                                                 | Nueva                      |
| `/{locale}/settings/team/`         | `MembersOperationsPanel` dentro de ajustes                                                                   | Ruta existente enriquecida |
| `/{locale}/customers/`             | [`CustomerOperationsTemplate`](../src/components/templates/customer-operations.tsx) desde el gestor de datos | Ruta existente enriquecida |
| `/{locale}/customers/detail/?id=…` | `CustomerRecordOperationsTemplate` en `saas-operations`                                                      | Nueva                      |
| `/{locale}/imports/`               | [`CustomerImportTemplate`](../src/components/templates/customer-import.tsx)                                  | Nueva                      |

`useSaasAction()` de `saas-operations` traduce códigos síncronos de `SaasError` a mensajes `Error` EN/ES para estos wrappers. No captura de forma general rechazos asíncronos.

### Contexto local de workspace

| Miembros del contexto                                                                                                                                         | Contrato                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`, `persistenceError`, `retryPersistence()`                                                                                                             | La lectura termina antes de `ready`; errores `"read"`, `"write"`, `"invalid"` o `null`. Reintentar escribe el estado de sesión actual; no lo resetea. |
| `workspace`, `workspaces`, `workspaceId`, `setWorkspace(id)`                                                                                                  | Seleccionar un ID conocido cambia el ámbito y borra preview de rol. ID desconocido lanza `SaasError("missing")`.                                      |
| `currentMember`, `currentMemberId`, `role`, `previewRole`, `setPreviewRole(roleOrNull)`, `can(capability)`                                                    | El rol efectivo es preview persistido o rol real del miembro; preview simula capacidades de interfaz/demo.                                            |
| `createWorkspace(input)`, `updateWorkspace(input)`                                                                                                            | Input es `Omit<Workspace, "id">`, incluido `organizationName`. Crear devuelve el nuevo workspace local; actualizar conserva su ID.                    |
| `customers`, `setCustomers`, `importCustomers(rows, "skip" \| "update")`                                                                                      | Clientes del ámbito local; importar devuelve `{ created, updated, skipped, failed }`.                                                                 |
| `members`, `invitations`, `inviteMember`, `resendInvitation`, `acceptInvitation`, `revokeInvitation`, `changeMemberRole`, `removeMember`, `transferOwnership` | Aplican política local; las operaciones de invitación reciben ID excepto `inviteMember(email, role)`.                                                 |
| `notes`, `addNote(customerId, text)`, `files`, `attachFiles(customerId, files)`                                                                               | Notas y metadatos de adjuntos del ámbito; entrada de archivos `readonly File[]`.                                                                      |
| `activity`, `recordActivity(detail, kind, resourceId?)`                                                                                                       | Feed local de eventos, no auditoría de producción resistente a alteración.                                                                            |
| `savedViews`, `setSavedViews`, `customerView`, `setCustomerView`                                                                                              | Preferencias por workspace. Los valores persistidos de vista son `unknown`; normalizarlos antes de usar.                                              |
| `onboarding`, `setOnboarding`, `completeOnboarding`                                                                                                           | `OnboardingDraft` persistido; completar crea/selecciona workspace e invitaciones locales.                                                             |

## Contratos por operación

### Onboarding y workspaces

`OnboardingFlowValue` contiene `step`, `organizationName`, `workspaceName`, `workspaceSlug`, `invites` y `completed`. Los pasos van de 0 a 3: organización, workspace, invitaciones y primera acción. El bloque valida antes de avanzar y espera `onComplete`; el padre debe reflejar la finalización aceptada en `value`. El fallo conserva el borrador.

`OnboardingDraft` local admite además `workspaceId`. Nombres de organización/workspace tienen 2–100 caracteres; slug tiene 2–64 caracteres alfanuméricos en minúscula separados por guiones y debe ser único localmente. `completeOnboarding` admite hasta 50 invitaciones, valida correo/rol y excluye al miembro actual de las invitaciones. Quien no sea viewer puede crear otro workspace local; comienza con el miembro actual como owner y datos operativos vacíos.

`WorkspaceProvider` lee/escribe `SaasDemoState` validado bajo **`aureform:saas:v1`** en `localStorage`, y recibe cambios válidos mediante eventos de almacenamiento. `data[workspaceId]` separa clientes, miembros, invitaciones, notas, archivos, actividad y vistas. `previewRole` persiste en `SaasDemoState.previewRole`; `setWorkspace` lo borra y `setPreviewRole(null)` vuelve al rol del miembro. No existe método público de reset. Borrar almacenamiento del navegador no es un callback documentado; no inventar `resetWorkspace()`.

Los wrappers locales utilizan keys de workspace para estado de clientes/importación/miembros. El consumer debe aplicar el mismo límite a peticiones, selección y borradores; cancelar o descartar peticiones antiguas al cambiar. Separar registros en el navegador no garantiza aislamiento de tenants de producción.

### Miembros

Roles: `owner`, `admin`, `member`, `viewer`; las invitaciones no pueden asignar `owner`.

| Capacidad                                                            | Owner | Admin | Member | Viewer |
| -------------------------------------------------------------------- | ----- | ----- | ------ | ------ |
| `workspace.manage`, `members.manage`                                 | Sí    | Sí    | No     | No     |
| `ownership.transfer`                                                 | Sí    | No    | No     | No     |
| `customers.write`, `customers.import`, `notes.write`, `views.manage` | Sí    | Sí    | Sí     | No     |

Las invitaciones locales caducan a los siete días; reenviar renueva una pendiente/caducada, aceptar añade un miembro local y revocar modifica el estado local. No hay servicio de correo. Estados de miembro: `active`/`suspended`; de invitación: `pending`/`accepted`/`expired`/`revoked`.

El provider impide cambiar/eliminar un owner mediante acciones ordinarias de rol/eliminación e impide autoeliminación. Transferir requiere owner real activo y otro destinatario activo; convierte al owner anterior en admin y al destinatario en owner. Preview de owner no concede esa transferencia. Los helpers puros de `lib/saas.ts` implementan estas reglas. `SaasError.code` es `permission`, `invalid`, `duplicate`, `owner`, `expired` o `missing`.

`MemberManagement` controla espera/error de formulario y diálogo; sus callbacks controlan registros aceptados. Cancelar no llama a una mutación. Pertenencia, protección de miembros y autorización de producción siguen siendo responsabilidad del host.

### Importación CSV

`parseCSV` admite CSV UTF-8 separado por comas, incluidos BOM, comillas dobles escapadas, comas/celdas multilínea entrecomilladas y CRLF. Defaults: **5 MiB, 10.000 filas de datos y 200 columnas**, configurables mediante `limits: Partial<CSVLimits>`. Comillas malformadas, cabeceras inseguras/vacías/duplicadas y límites inválidos son errores de parser/configuración, no imports vacíos exitosos.

`ImportField<T>` define `key`, `label` localizado y opcionales `required`, `aliases`, `sample`, `defaultValue`, `parse`, `validate`. Los helpers de mapeo/preview no mutan el conjunto. El wizard organiza archivo → mapeo → preview → revisión. Filas inválidas requieren corrección o exclusión explícita; duplicados usan `"skip"`/`"update"` y clave/conjunto de claves del consumer. Error de campo y fallo de commit son diferentes.

`CustomerImportRow` contiene `name`, `email`, `company`, `plan`, `status`, `amount`, `joined`. Company queda vacío por defecto; los demás campos son obligatorios. Los campos suministrados usan planes Starter/Pro/Enterprise, estados active/trial/paused, importe numérico no negativo y fecha real `YYYY-MM-DD`. `getCustomerImportKey` normaliza email. El merge del provider conserva IDs existentes al actualizar.

`ImportCallback<T>` es `(rows: readonly T[], context: ImportContext) => Promise<ImportResult>`. Context aporta `mode`, `signal`, `onProgress({ completed, total?, message? })`. Los recuentos `created + updated + skipped + failed` deben sumar exactamente las filas enviadas. Para reintentar sólo fallos de forma segura, aportar un `{ index, message }` por fila fallida; índices desde cero en el array enviado a esa invocación, no números de línea CSV.

El consumer prepara/revierte escrituras antes de rechazar o confirmar cancelación. Un resultado parcial resuelto sólo reintenta fallos identificados. Resolver después de abort es **no verificado**, no demuestra rollback ni permite reintento automático. `CustomerImportTemplate` local comprueba abort durante preparación/progreso asíncronos y luego realiza un único merge síncrono del provider; no sube el CSV a un backend. `serializeCSV` entrecomilla celdas y protege texto que parezca fórmula al exportar.

### Tabla de clientes y consulta externa

`DataTableQuery` es `{ search, filters, sorting, pagination }`; paginación usa **`pageIndex` desde cero** y `pageSize`. `normalizeDataTableQuery` comienza en página 0/tamaño 5 y admite allowlist de columnas/tamaño máximo. El adaptador de clientes usa tamaño 5 y máximo 100. La ordenación preserva precedencia múltiple. Cambiar búsqueda/filtros/ordenación vuelve a página 0; el adaptador debe reconciliar una página inválida después de modificar datos.

`DataTable` procesa el array completo en modo `"client"` por defecto. Con **`mode="external"` y `rowCount` obligatorio**, filtros, ordenación y paginación son manuales: suministrar sólo la página aceptada y su total de coincidencias. El componente no hace fetch, no vuelve a filtrar una página localmente ni deduce el total de su longitud.

`DataWorkbenchValue` contiene `query`, opcionales `columns` y `density`. Los filtros incluyen texto, selección simple/múltiple, rango numérico y fechas. Los helpers de consulta admiten contains/startsWith, igualdad/desigualdad, in/notIn, comparaciones/between, dateBetween y vacío/no vacío. Los filtros se combinan con AND; valores de un `in` son alternativas. El estado de columnas incluye visibilidad, orden, tamaño y pinning; densidad comfortable/compact.

El [adaptador de clientes de demo](../src/demo/customer-adapter.ts) exporta `matchingCustomers`, `queryCustomers` y `loadDemoCustomerPage(source, query, { signal, delay?, fail? })` asíncrono. Usa el array recibido, comprueba abort y devuelve `{ rows, total, query }` con página acotada. No realiza peticiones de red. `CustomerOperationsTemplate` suministra sólo `scope.customers`, identifica peticiones por consulta y fuente, cancela las sustituidas y se remonta al cambiar de workspace.

**Exportar filtrado abarca todos los registros coincidentes**, no sólo la página: el wrapper local llama a `matchingCustomers(scope.customers, value.query)` antes de generar CSV. El consumer de producción necesita una operación equivalente de exportación completa; una página remota no basta.

`rowSelection` controlado es un mapa de IDs; `onRowSelectionChange` y `onSelectedIdsChange` pueden representar IDs fuera de la página cargada. El callback anterior `onSelectionChange` y `selectedAction` basado en filas sólo conocen registros cargados. El host resuelve IDs entre páginas y define selección tras filtros. El wrapper local puede resolverlos desde su array completo del ámbito. Seleccionar página nunca significa todas las coincidencias.

### Vistas guardadas y detalle

`DataView` conserva `{ query, columns, density }`. `serializeDataView(value, columnIds)` emite un envelope versión 1; `parseDataView(text, columnIds)` devuelve vista normalizada o `null`, rechazando entrada malformada/demasiado grande. Elimina columnas desconocidas. No guarda snapshots de clientes ni selección. Los valores de búsqueda/filtro pueden contener información de negocio; copiar una URL de vista no concede acceso.

`DataWorkbench` recibe `savedViews`, `activeViewId`/`onActiveViewChange` controlados opcionales y `onSaveView(view)`, `onDeleteView(id)`, `onShareView(value, view?)`, todos compatibles con callbacks asíncronos. El wrapper local guarda vistas por workspace y copia configuración con URL del origen actual al clipboard. Propiedad compartida, acceso y sincronización corresponden al host.

El wrapper local de detalle lee un parámetro `id` codificado y busca sólo en clientes del workspace activo. El formulario conserva la entrada al rechazarse `onSave`, presenta el rechazo como error general y cierra edición sólo tras aceptación. Los errores del esquema local se asocian a campos; no hay objeto documentado de retorno para errores de campo del servidor. Cancelar vuelve al cliente suministrado; cambiar su ID remonta el detalle. El host de producción resuelve conflictos y actualiza datos aceptados del padre.

`attachFiles(customerId, files)` registra **sólo metadatos**: `{ id, name, size, type, createdAt }`, **máximo 100 entradas por cliente y 10 MiB por archivo**. No conserva binarios, object URLs ni URLs de descarga inventadas. `CustomerDetailTemplate` admite `CustomerDetailFile.url` real y opcional del host; el wrapper local no lo fabrica. El límite de entrada CSV de 5 MiB es otro contrato.

Estos contratos permiten encontrar, comparar, editar y actuar sobre registros siguiendo las tareas descritas en [la guía de tablas de NN/G](https://www.nngroup.com/articles/data-tables/).

## Matriz de estados

Los nombres siguientes describen comportamiento; no son valores de un enum exportado. Los textos EN/ES son ejemplos que deben reconciliarse con las etiquetas reales.

| Estado                       | Comportamiento de interfaz                                                       | Límite demo local / consumer                                        | Ejemplo EN / ES                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Disponible                   | Mostrar contexto confirmado, registros y acciones.                               | Seed de demo o resultado aceptado de consulta.                      | Customers / Clientes                                                                 |
| Carga inicial                | Identificar la operación pendiente; evitar un vacío prematuro.                   | El adaptador comunica carga inicial.                                | Loading customers / Cargando clientes                                                |
| Actualizando                 | Indicar actualización y distinguir filas anteriores de nuevos datos confirmados. | El adaptador debe proporcionar esa distinción.                      | Updating results / Actualizando resultados                                           |
| Vacío de primer uso          | Explicar qué falta y ofrecer crear/importar.                                     | Consulta sin filtros completada sin registros.                      | Add your first customer / Añade tu primer cliente                                    |
| Sin coincidencias            | Conservar controles y ofrecer un reset específico.                               | Consulta filtrada completada sin coincidencias.                     | No matches for these filters / Sin coincidencias con estos filtros                   |
| Entrada inválida             | Asociar errores a campos/filas CSV y conservar la entrada.                       | Validación de cliente y validación autoritativa del host.           | Review the marked fields / Revisa los campos señalados                               |
| Mutación pendiente           | Conservar el nombre de acción, anunciar progreso e impedir envíos duplicados.    | Operación real sin resolver todavía.                                | Saving changes / Guardando cambios                                                   |
| Éxito                        | Actualizar estado aceptado y anunciar resultado con su alcance.                  | Aceptación local o mutación confirmada por el host.                 | Changes saved / Cambios guardados                                                    |
| Error recuperable            | Explicar la operación fallida, conservar entrada/consulta y permitir reintento.  | Fallo de lectura/parseo/escritura identificado correctamente.       | Could not save changes / No se pudieron guardar los cambios                          |
| Restringido/sólo lectura     | Explicar acciones no disponibles cuando el host comunica ese estado.             | La autorización de producción sigue en el servidor.                 | You can view this record / Puedes consultar este registro                            |
| Registro ausente             | Ofrecer regreso al contexto existente de lista.                                  | Ausencia confirmada o política elegida para registros inaccesibles. | Customer unavailable / Cliente no disponible                                         |
| Almacenamiento no disponible | Mantener sesión utilizable; exponer fallo/reintento de persistencia.             | `persistenceError` y `retryPersistence()` del provider local.       | Changes are available in this session / Los cambios están disponibles en esta sesión |
| Cambio de workspace          | Identificar el nuevo contexto y descartar resultados del anterior.               | Host/demo reconcilian estado y operaciones de cada ámbito.          | Switching workspace / Cambiando de espacio de trabajo                                |

Vacío y error deben diferenciarse visualmente y ofrecer la siguiente acción apropiada, siguiendo [la guía de estados vacíos de NN/G](https://www.nngroup.com/articles/empty-state-interface-design/).

La cancelación de import distingue además cancelando, cancelación confirmada, resultado parcial y finalización no verificada. Actualización y estados de autorización/conflicto de producción requieren información real del host; esta matriz no es un reporte de cobertura completado.

## Consumo del código

El [CLI local](../bin/aureform.mjs) descubre las **13 entradas nuevas de Source**: `workspace-provider`, `workspace-status`, `onboarding-flow`, `member-management`, `import-wizard`, `data-workbench`, `record-detail`, `record-actions`, `saas-setup`, `saas-operations`, `customer-operations`, `customer-import` y `customer-detail`. Por ejemplo, desde el kit extraído:

```sh
node bin/aureform.mjs list
node bin/aureform.mjs init ../team-product --no-install
node bin/aureform.mjs add saas-operations customer-operations customer-import --cwd ../existing-product --dry-run
node bin/aureform.mjs add saas-operations customer-operations customer-import --cwd ../existing-product --diff
```

`--dry-run` informa destinos, cambios de dependencias y conflictos protegidos sin escribir. `--diff` añade diferencias de texto e implica siempre dry-run. Ninguno instala paquetes. Un `add` real copia el cierre de dependencias y fusiona requisitos de integración; después el consumer ejecuta su gestor de paquetes.

Un `add` exitoso escribe **`.aureform/manifest.json`** con origen/versión de cada item y sus `sourcePath`, `sourceHash`, `targetPath`, `targetHash`. El hash de fuente cubre bytes originales; el de destino cubre bytes instalados tras reescribir aliases. Preview también expone hashes actual/propuesto. El receipt distingue archivos unmodified/customized/unknown; acredita procedencia, no firma ni permiso de overwrite. El código existente distinto se protege incluso con receipt previo unmodified. Revisar diff antes de elegir `--overwrite` explícito; no evita incompatibilidades de dependencias. Véase [CLI previews and receipts](cli-updates-1.2.md).

El [generador del registro](../scripts/generate-registry.mjs) escribe `registry.json` y `public/r/registry.json` estándar, además de `public/r/index.json` versionado y payloads de items. El índice 1.2.0 actual contiene 96 entradas. Son manifests de descubrimiento, también para herramientas MCP de registro; existir no acredita un MCP desplegado ni publicación cloud. Las validaciones registradas y los gates pendientes de archivos se separan en el [checklist](release-checklist-1.2.md).

Los callbacks de consulta/formulario pertenecen a un límite cliente apropiado. La guía instalada de Next.js para `'use client'` exige props serializables entre servidor y cliente; un callback convencional de evento no se puede pasar sin más desde un Server Component. Usar un adaptador cliente o el patrón de interacción de servidor admitido por el host. Si el host utiliza Server Actions, la guía instalada de formularios exige comprobar autorización dentro de cada acción.

Usar los contratos existentes de `AppearanceProvider` y `AppearanceScope` cuando corresponda; véase [Appearance](appearance.md). Las modificaciones de marca deben seguir tokens semánticos y scopes, revisando lectura de tablas, foco visible, claro/oscuro y preferencias de movimiento.

Los ejemplos locales deben identificar los datos sintéticos y el límite de persistencia. Un ejemplo de producción debe mostrar datos y respuestas controlados por quien integra, sin depender del catálogo de rutas ni del store de demo de la suite.

## Ejemplos reutilizables

Estos ejemplos usan exports existentes. Requieren el cierre de dependencias copiado, estilos y un límite cliente del host. Son ejemplos de documentación; ejecutarlos en consumidores sigue como comprobación del release. La [guía EN](saas-operations.md) utiliza los mismos contratos con textos en inglés.

### Composición local de suite

Dentro de una aplicación Next.js, el provider de suite aporta idioma, apariencia y store local de workspace. Es demo de navegador, no adaptador de backend.

```tsx
"use client";
import { Providers } from "@/components/providers";
import { OnboardingOperationsTemplate } from "@/components/templates/saas-operations";

export function TeamDemo() {
  return (
    <Providers locale="es">
      <OnboardingOperationsTemplate />
    </Providers>
  );
}
```

### Onboarding controlado sin store de workspace

`finish` pertenece al consumer. Rechaza al fallar; después de aceptar, este padre refleja el valor completado que aporta el bloque.

```tsx
"use client";
import { useState } from "react";
import {
  OnboardingFlow,
  type OnboardingFlowProps,
  type OnboardingFlowValue,
} from "@/components/blocks/onboarding-flow";

export function ConsumerSetup({
  finish,
}: {
  finish: OnboardingFlowProps["onComplete"];
}) {
  const [value, setValue] = useState<OnboardingFlowValue>({
    step: 0,
    organizationName: "",
    workspaceName: "",
    workspaceSlug: "",
    invites: [],
    completed: false,
  });
  return (
    <OnboardingFlow
      locale="es"
      value={value}
      onChange={setValue}
      onComplete={async (completed) => {
        await finish(completed);
        setValue(completed);
      }}
    />
  );
}
```

### Importación mediante commit del consumer

Este componente reutilizable suministra esquema/clave de cliente existentes y reenvía el contrato completo de abort/progreso a `commit`. Aportar sólo claves existentes del ámbito activo. El callback del consumer implementa persistencia y rollback; la UI no crea ese servicio.

```tsx
"use client";
import { ImportWizard } from "@/components/blocks/import-wizard";
import {
  customerImportFields,
  getCustomerImportKey,
  type CustomerImportRow,
  type ImportCallback,
  type ImportKey,
} from "@/lib/csv-import";

export function ConsumerImport({
  existingKeys,
  commit,
}: {
  existingKeys: readonly ImportKey[];
  commit: ImportCallback<CustomerImportRow>;
}) {
  return (
    <ImportWizard<CustomerImportRow>
      locale="es"
      fields={customerImportFields}
      getRowKey={getCustomerImportKey}
      existingKeys={existingKeys}
      onImport={commit}
      title="Importar clientes"
      description="Revisa el mapeo y las filas antes de confirmar."
    />
  );
}
```

### Consulta externa controlada con cancelación asíncrona real

El ejemplo utiliza el adaptador sintético existente sobre un array del consumer; no hace peticiones de red ni utiliza `useWorkspace`. Montar bajo `NextIntlClientProvider` con locale `es` y mensajes del host. Remontar con `key={workspaceId}` al cambiar ámbito. Mantener estable la referencia del array hasta que cambien sus datos.

```tsx
"use client";
import { useEffect, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  DataWorkbench,
  type DataWorkbenchValue,
} from "@/components/blocks/data-workbench";
import {
  customerColumnIds,
  loadDemoCustomerPage,
} from "@/demo/customer-adapter";
import type { Customer } from "@/demo/data";
import {
  normalizeDataTableQuery,
  serializeDataTableQuery,
} from "@/lib/data-query";

const columns: ColumnDef<Customer>[] = [
  { accessorKey: "name", header: "Nombre" },
  { accessorKey: "email", header: "Correo" },
  { accessorKey: "company", header: "Empresa" },
  { accessorKey: "plan", header: "Plan" },
  { accessorKey: "status", header: "Estado" },
  { accessorKey: "amount", header: "Importe" },
  { accessorKey: "joined", header: "Alta" },
];
type Snapshot = {
  source: readonly Customer[];
  key: string;
  rows: Customer[];
  total: number;
  error?: string;
};

export function ExternalCustomers({ source }: { source: readonly Customer[] }) {
  const [value, setValue] = useState<DataWorkbenchValue>(() => ({
    query: normalizeDataTableQuery(
      {},
      { columnIds: customerColumnIds, maxPageSize: 100 },
    ),
  }));
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [retry, setRetry] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const key = `${serializeDataTableQuery(value.query)}:${retry}`;

  useEffect(() => {
    const controller = new AbortController();
    loadDemoCustomerPage(source, value.query, { signal: controller.signal })
      .then((page) => {
        if (controller.signal.aborted) return;
        if (
          serializeDataTableQuery(page.query) !==
          serializeDataTableQuery(value.query)
        ) {
          setValue((previous) => ({ ...previous, query: page.query }));
          return;
        }
        setSnapshot({ source, key, rows: page.rows, total: page.total });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setSnapshot({
            source,
            key,
            rows: [],
            total: 0,
            error: "No se pudieron cargar los clientes. Reintenta.",
          });
      });
    return () => controller.abort();
  }, [source, value.query, key]);

  const current =
    snapshot?.source === source && snapshot.key === key ? snapshot : undefined;
  return (
    <DataWorkbench<Customer>
      mode="external"
      value={value}
      onValueChange={setValue}
      columns={columns}
      data={current?.rows ?? []}
      rowCount={current?.total ?? 0}
      loading={!current}
      error={current?.error}
      onRetry={() => setRetry((previous) => previous + 1)}
      filterFields={[{ id: "company", label: "Empresa", type: "text" }]}
      pageSizeOptions={[5, 10, 25, 50, 100]}
      selectable
      rowSelection={selection}
      onRowSelectionChange={setSelection}
    />
  );
}
```

Para un adaptador de producción, sustituir la lectura asíncrona por la fuente autenticada del host conservando identidad de consulta, abort/descarte y totales autoritativos. Para exportar todas las coincidencias de esta demo, usar `matchingCustomers(source, value.query)`; para serializar una vista, `serializeDataView(value, customerColumnIds)`. Ninguna operación debe limitarse a `current.rows`.

### Rechazo real de formulario como fixture del piloto

Bajo el mismo provider de idioma, esta fixture rechaza el primer guardado mediante `onSave` real. El siguiente intento delega en el consumer, que actualiza el cliente aceptado. Es una fixture de prueba, no una política de errores de producción.

```tsx
"use client";
import { useState } from "react";
import {
  CustomerDetailTemplate,
  type CustomerDetailTemplateProps,
} from "@/components/templates/customer-detail";

export function RecoverableDetail(props: CustomerDetailTemplateProps) {
  const [rejectOnce, setRejectOnce] = useState(true);
  return (
    <CustomerDetailTemplate
      {...props}
      onSave={
        props.onSave
          ? async (customer) => {
              if (rejectOnce) {
                setRejectOnce(false);
                throw new Error(
                  "Fallo temporal al guardar. Tu borrador sigue aquí; reintenta.",
                );
              }
              await props.onSave?.(customer);
            }
          : undefined
      }
    />
  );
}
```

## Handoff del release

Los contratos de Source y ejemplos reutilizables están documentados. El [checkpoint 1.2 de consumers independientes ejecutado](consumer-verification-1.2.md#final-executed-consumer-checkpoint) registra 811/811 checks en tres modos — CLI add, registry HTTP oficial y CLI init — con comandos reales de tipos/lint/producción de esos consumers y entradas capturadas sin cambios. Se planifican seis modos de instalación: esos tres más consumers de ZIP source/starter/free. Los companions de evidencia se comprueban por integridad de archivos; no son modos de instalación. El retake final de seis modos con pin y la publicación siguen pendientes.

El [audit nativo 1.2](../.figma/native-audit-1.2.json) registra 69 raíces: 63 heredadas y seis rutas SaaS revisadas en Light/Dark. La [biblioteca SaaS](../.figma/native-saas-library-1.2.json) registra nueve sets / 68 variantes y 12 raíces Light/Dark con [22 exports PNG aprobados por owner](../.figma/proofs/saas-1.2/owner-visual-approval.json). La [validación local de Code Connect](../.figma/code-connect/validation/validation-summary.json) comprobó 92 templates previos sin cambios contra source 1.2: 1.646 evaluaciones / 556 ejemplos tipados, cero diagnósticos y 98 snapshots de source. Usa un runtime sintético local y no acredita publicación cloud ni templates nuevos. La [verificación registrada](release-checklist-1.2.md#recorded-verification-at-source-freeze) también cierra la suite integrada de 74 casos E2E, motion 14/74, copy 188, responsive acotado 72, previews/galería servidos y checks frescos unit 184/tipos/lint sin warnings. El [recibo portátil de runtime del source actual](qa-runtime-1.2.json) registra esos resultados y los hashes de los informes completos conservados. Cincuenta y cuatro análisis axe acotados dieron cero violaciones y conservan 54 resultados de reglas incompletos; no equivalen a certificación total de accesibilidad. Copy cubre 176 payloads de clipboard dinámico y 12 combinaciones de code-view, 188 checks estrictos en total. La compilación separada cubre **688 payloads generados = 44 copiados + 616 configurados + 28 Studio**; 44 archivos de ejemplos canónicos y un barrel elevan las raíces de compilación a **733**. Esto y sus controles negativos sólo acreditan compilación.

La estructura del ZIP source 1.2 conserva fuente/assets, docs, manifests nativos y scripts de reproducción, excluyendo PNG de prueba nativa. Los PNG de prueba se distribuyen por separado como `aureform-ui-native-evidence-1.1.zip` y `aureform-ui-native-evidence-1.2.zip`, conservando 23 PNG históricos y 22 nuevos aceptados, sus rutas y hashes originales. Son **opcionales para build/uso de suite e instalación de componentes**. La generación preliminar de los cinco archivos pasó el gate de tamaño; los archivos finales se regeneran y fijan después de congelar las docs incluidas. Para reproducir el gate de evidencia de `pnpm package:source`, verificar los checksums finales correspondientes y extraer ambos companions en el root del kit source extraído, conservando `.figma/proofs/...`, y ejecutar el comando. Véanse [paquetes y comandos de extracción](../README.md#figma-source-and-packages) y [checklist de release](release-checklist-1.2.md). El pin final de cinco ZIP, los resultados de seis modos de consumer y los checks de source/nativo/navegador se registran en `public/downloads/verification-1.2.json`, excluido del Source ZIP y fijado antes de publicar; este snapshot incluido no fija ningún hash preliminar. La autoridad de publicación es el registro nativo de Sites de versión guardada/commit/confirmación de despliegue, conservado después de desplegar en `artifacts/publication-1.2.json` ignorado y el handoff final. El recibo público estático no se actualiza para insertar el commit de publicación posterior.

Quedan integraciones de producción: identidad autenticada, autorización/aislamiento de tenants en servidor, email de invitación, base duradera, transacciones/idempotencia, almacenamiento y descarga autorizada de archivos, acceso a vistas compartidas y conflictos de registros obsoletos. Son integraciones del host, no servicios ocultos suministrados por el frontend.

El [checklist histórico 1.2](release-checklist-1.2.md) registra la evidencia técnica y el alcance de publicación privada de aquella entrega. El source original, los ejemplos y los recursos de diseño distribuidos de Aureform usan ahora [Apache 2.0](../LICENSE); la versión abierta tiene su propio checkpoint de publicación. El [piloto comunitario planificado](pilot-validation.es.md) sigue siendo investigación futura fuera de los gates de entrega. Esta guía no afirma entrevistas, adopción ni Code Connect publicado en cloud.

1.3 está planificado para inbox, uso, facturación, auditoría y webhooks. Los artefactos de IA, un editor y emails son trabajo posterior; los servicios de producción correspondientes siguen siendo responsabilidad del consumer, salvo que un release futuro cambie explícitamente el modelo de entrega.
