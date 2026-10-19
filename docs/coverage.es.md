# Aureform UI 1.4.0 — cobertura de entrega

Generado desde catálogo y dispatcher reales, state actual, baseline nativo 1.2 conservado y ledger independiente de imágenes 1.2.1. [Datos completos](coverage.json).

69 vistas (68 rutas de suite + landing) · 44 familias y ejemplos completos · 26 archivos / 36 exports de bloques · 6 layouts · 13 gráficos · 6 paletas · 6 efectos reutilizables · 107 elementos de registry · 92 templates locales de Code Connect.

Source verificado por el catálogo, dispatcher y grafo de imports. 69 raíces con ID nativo; 0 rutas pendientes del owner. Estos conteos describen source e IDs. El [recibo runtime 1.2](qa-runtime-1.2.json) y sus [checks al freeze](release-checklist-1.2.md#recorded-verification-at-source-freeze) son baselines históricos: los resultados 184/74 y sus demás scopes no se reetiquetan como pruebas de 1.2.1. La [verificación 1.1](verification.es.md) mantiene su alcance histórico.

Baseline nativo 1.2 conservado: PASS compuesto para 69 raíces (63 heredadas del checkpoint 1.1 y 6 rutas SaaS revisadas en Light/Dark), ligado al SHA256 `8be9d3c1c46565296bd90c43f086b3d7159889c48167ab48d1d5f88e415b1963` de [state-1.2-final](../.figma/history/state-1.2-final.json). [Informe inmutable](../.figma/native-audit-1.2.json). No certifica una revisión visual nueva de las 69 vistas en 1.2.1.

Auditoría histórica 1.1: 65 raíces, status `passed-native-structure-and-visual-review`. [Informe histórico](../.figma/native-audit.json). Conserva su propio checkpoint y no certifica 1.2.1.

Prueba nativa SaaS 1.2 retenida: PASS, seis vistas / 12 raíces Light–Dark y 68 variantes en nueve sets. [Sidecar](../.figma/native-saas-library-1.2.json). La evidencia pertenece al audit compuesto y state congelado de 1.2.

Imágenes generadas 1.2.1: 32 recursos (18 avatares, 8 productos y 6 editoriales), con WebP optimizados y SVG que incorporan esos mismos bytes. [Manifest](../public/assets/generated-images.json) y [prompts completos](generated-images/catalog.json). Son imágenes de contenido; no son capturas de interfaz ni gráficos vectoriales editables. No requieren clave API para su uso.

Checkpoint nativo de imágenes 1.2.1 conservado: PASS acotado al scope `32 native image asset components, explicitly matched existing photo/product/media slots, seven owner-reviewed scoped exports; inherited1.2 evidence remains immutable.`, ligado al state `917031950cf95f8b7aa993c2b9e278d03f308f1f12ba54549497c2b207ff9c03` y al manifest exacto. 7 PNG con bytes verificados; 32 recursos subidos/componentes, cero rasterizaciones de interfaz. [Ledger](../.figma/native-generated-images-1.2.1.json). Es evidencia histórica de la misma colección, no una revisión visual nueva de 1.4.0 ni de las 69 rutas.

| Prueba nueva de imágenes | SHA256 |
| --- | --- |
| `.figma/proofs/images-1.2.1/asset-board-avatars.png` | `9792541b1cd8f9d5022ebadfabcb6a59c8723db4a3fcb3b91d60e8bc780cb3f9` |
| `.figma/proofs/images-1.2.1/asset-board-products.png` | `bba66170f651d7beeaacc61ceb27b3ce5ec5161849f85e797df54cd626f9aa7e` |
| `.figma/proofs/images-1.2.1/asset-board-art.png` | `89a5d2fe657f69190a1f9cf14da73c70792aca6c4a4773df18a3661cb3705ec1` |
| `.figma/proofs/images-1.2.1/team-dark-native.png` | `ddff107d29bb865a91819b8455e49ffd68bec6f4e2e4d27c6ce91f511051b632` |
| `.figma/proofs/images-1.2.1/customers-light-native.png` | `dd8b926df57446e05041ad9dff113331cabf468e860a785fa50bbf9cc7a46b12` |
| `.figma/proofs/images-1.2.1/products-native.png` | `f842ab589d12dfdd0c3ef30f25c50e0b1766d3808d9d73baecd0fc82bedae784` |
| `.figma/proofs/images-1.2.1/media-native-revised.png` | `494499d9a83762a38ae66bb20827451986e2f980cffdd2448183ea2667e58ec1` |

Code Connect local: los 92 templates del checkpoint 1.4.0 se conservaron sin modificar y se comprobaron contra el source actual 1.4.0: 1646 evaluaciones, 556 ejemplos tipados y 0 diagnósticos. [Resumen de validación](../.figma/code-connect/validation/validation-summary.json). La prueba utiliza un runtime sintético local; no acredita ejecución en Figma ni publicación cloud.

Los nuevos bloques SaaS se asocian directamente por source/export e IDs del sidecar, aunque `codeConnect` sea null. No se exige cloud ni se generan templates nuevos: biblioteca sin publicar / alcance Professional. El checkpoint original de mappings 1.1 permanece archivado.

La referencia TailAdmin se utiliza para inventariar categorías funcionales. Código, layouts, marca y recursos son originales. Las integraciones de backend se sustituyen mediante los adaptadores documentados.

Las etiquetas 1.0–1.3 son categorías del roadmap original; las vistas listadas se incluyen en la versión 1.4.0.

| Vista | Categoría original | Implementación | Figma editable |
| --- | --- | --- | --- |
| landing | 1.0 | [LandingTemplate](../src/components/templates/landing.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=55-8072) |
| onboarding | 1.2 | [OnboardingOperationsTemplate](../src/components/templates/saas-operations.tsx) | [Light](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-16428) / [Dark](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-16692) |
| settings/workspace | 1.2 | [SettingsTemplate](../src/components/templates/settings.tsx) | [Light](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-16887) / [Dark](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-17079) |
| customers/detail | 1.2 | [CustomerRecordOperationsTemplate](../src/components/templates/saas-operations.tsx) | [Light](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-17271) / [Dark](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-17522) |
| imports | 1.2 | [CustomerImportTemplate](../src/components/templates/customer-import.tsx) | [Light](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-17773) / [Dark](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-17965) |
| studio | 1.3 | [AppearanceStudio](../src/components/templates/appearance-studio.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=134-8412) |
| themes | 1.3 | [ThemesTemplate](../src/components/templates/appearance-gallery.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=135-8894) |
| effects | 1.3 | [EffectsTemplate](../src/components/templates/appearance-gallery.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=136-9476) |
| dashboard | 1.0 | [DashboardTemplate](../src/components/templates/dashboard.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=5-2) |
| analytics | 1.0 | [DashboardTemplate](../src/components/templates/dashboard.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=53-494) |
| ai | 1.0 | [AIWorkspace](../src/components/templates/ai-workspace.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=5-4) |
| ai/playground | 1.0 | [AIWorkspace](../src/components/templates/ai-workspace.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=53-1272) |
| ai/code | 1.0 | [AIWorkspace](../src/components/templates/ai-workspace.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=53-1044) |
| ai/images | 1.3 | [StudioTemplate](../src/components/templates/media-studio.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=45-6768) |
| ai/video | 1.3 | [StudioTemplate](../src/components/templates/media-studio.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=45-7088) |
| customers | 1.1 | [DataManager](../src/components/templates/data-manager.tsx) | [Light](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-18156) / [Dark](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-18891) |
| crm | 1.1 | [DashboardTemplate](../src/components/templates/dashboard.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=39-24) |
| pipeline | 1.1 | [WorkBoard](../src/components/templates/work-board.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=41-4387) |
| ecommerce | 1.1 | [DashboardTemplate](../src/components/templates/dashboard.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=39-730) |
| products | 1.4 | [DataManager](../src/components/templates/data-manager.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=41-2363) |
| orders | 1.4 | [DataManager](../src/components/templates/data-manager.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=41-2816) |
| invoices | 1.4 | [DataManager](../src/components/templates/data-manager.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=41-3207) |
| invoice | 1.4 | [InvoiceTemplate](../src/components/templates/map-invoice.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=45-6451) |
| transactions | 1.1 | [DataManager](../src/components/templates/data-manager.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=41-3597) |
| sales | 1.1 | [DashboardTemplate](../src/components/templates/dashboard.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=39-1132) |
| marketing | 1.1 | [DashboardTemplate](../src/components/templates/dashboard.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=39-1521) |
| calendar | 1.2 | [CalendarTemplate](../src/components/templates/calendar.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=41-5151) |
| tasks | 1.2 | [WorkBoard](../src/components/templates/work-board.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=41-3982) |
| task-list | 1.2 | [WorkBoard](../src/components/templates/work-board.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=41-4794) |
| mail | 1.2 | [MailTemplate](../src/components/templates/communication.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=45-4589) |
| chat | 1.2 | [ChatTemplate](../src/components/templates/communication.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=45-5003) |
| files | 1.2 | [FilesTemplate](../src/components/templates/files-support.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=45-5363) |
| support | 1.2 | [SupportTemplate](../src/components/templates/files-support.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=45-5707) |
| maps | 1.4 | [MapsTemplate](../src/components/templates/map-invoice.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=45-6076) |
| logistics | 1.2 | [DashboardTemplate](../src/components/templates/dashboard.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=39-1923) |
| finance | 1.3 | [DashboardTemplate](../src/components/templates/dashboard.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=39-2310) |
| stocks | 1.3 | [DashboardTemplate](../src/components/templates/dashboard.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=39-2702) |
| settings/profile | 1.0 | [SettingsTemplate](../src/components/templates/settings.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=48-6454) |
| settings/team | 1.0 | [SettingsTemplate](../src/components/templates/settings.tsx) | [Light](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-19625) / [Dark](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=237-19873) |
| settings/preferences | 1.0 | [SettingsTemplate](../src/components/templates/settings.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=48-7128) |
| settings/billing | 1.4 | [SettingsTemplate](../src/components/templates/settings.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=48-7437) |
| settings/api-keys | 1.0 | [SettingsTemplate](../src/components/templates/settings.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=48-7753) |
| settings/integrations | 1.0 | [SettingsTemplate](../src/components/templates/settings.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=48-8021) |
| components | 1.0 | [ComponentsTemplate](../src/components/templates/components.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=59-2549) |
| forms | 1.0 | [FormsTemplate](../src/components/templates/forms.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=59-2725) |
| charts | 1.3 | [ChartsTemplate](../src/components/templates/catalogs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=59-2901) |
| media | 1.3 | [MediaTemplate](../src/components/templates/media-studio.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=59-3077) |
| layouts | 1.3 | [LayoutsTemplate](../src/components/templates/catalogs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=59-3253) |
| blocks | 1.4 | [BlocksTemplate](../src/components/templates/catalogs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=59-3429) |
| templates | 1.0 | [TemplatesTemplate](../src/components/templates/catalogs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=59-3605) |
| docs | 1.0 | [DocsTemplate](../src/components/templates/docs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=54-1108) |
| docs/tokens | 1.0 | [DocsTemplate](../src/components/templates/docs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=54-1451) |
| docs/cli | 1.0 | [DocsTemplate](../src/components/templates/docs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=54-1764) |
| docs/figma | 1.0 | [DocsTemplate](../src/components/templates/docs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=54-2045) |
| docs/adapters | 1.0 | [DocsTemplate](../src/components/templates/docs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=54-2325) |
| docs/accessibility | 1.0 | [DocsTemplate](../src/components/templates/docs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=54-2600) |
| docs/license | 1.0 | [DocsTemplate](../src/components/templates/docs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=54-2873) |
| docs/roadmap | 1.0 | [DocsTemplate](../src/components/templates/docs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=54-3151) |
| pricing | 1.0 | [PricingTemplate](../src/components/templates/auxiliary.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=55-7541) |
| faq | 1.0 | [FAQTemplate](../src/components/templates/auxiliary.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=55-7856) |
| auth/sign-in | 1.4 | [AuthTemplate](../src/components/templates/auth.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=52-7472) |
| auth/sign-up | 1.4 | [AuthTemplate](../src/components/templates/auth.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=52-7509) |
| auth/reset-password | 1.4 | [AuthTemplate](../src/components/templates/auth.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=52-7551) |
| auth/verify | 1.4 | [AuthTemplate](../src/components/templates/auth.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=52-7581) |
| status/not-found | 1.3 | [StatusTemplate](../src/components/templates/auxiliary.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=52-7622) |
| status/error | 1.3 | [StatusTemplate](../src/components/templates/auxiliary.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=52-7650) |
| status/maintenance | 1.3 | [StatusTemplate](../src/components/templates/auxiliary.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=52-7684) |
| status/coming-soon | 1.3 | [StatusTemplate](../src/components/templates/auxiliary.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=52-7713) |
| status/success | 1.3 | [StatusTemplate](../src/components/templates/auxiliary.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=52-7751) |

| Bloque de source | Archivo | Registry | Figma | Code Connect local |
| --- | --- | --- | --- | --- |
| AIComposer | [Fuente](../src/components/blocks/ai-composer.tsx) | `ai-composer` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=6-118) | [Template](../.figma/code-connect/AIComposer.figma.ts) |
| CommerceBilling | [Fuente](../src/components/blocks/commerce-billing.tsx) | `commerce-billing` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceCheckout | [Fuente](../src/components/blocks/commerce-checkout.tsx) | `commerce-checkout` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceStatusBadge | [Fuente](../src/components/blocks/commerce-checkout.tsx) | `commerce-checkout` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceTotals | [Fuente](../src/components/blocks/commerce-checkout.tsx) | `commerce-checkout` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceProductThumbnail | [Fuente](../src/components/blocks/commerce-checkout.tsx) | `commerce-checkout` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceInvoiceView | [Fuente](../src/components/blocks/commerce-invoice-view.tsx) | `commerce-invoice-view` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceInvoiceTable | [Fuente](../src/components/blocks/commerce-invoice-view.tsx) | `commerce-invoice-view` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceInvoiceEditor | [Fuente](../src/components/blocks/commerce-invoice-view.tsx) | `commerce-invoice-view` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceOrderEditor | [Fuente](../src/components/blocks/commerce-order-editor.tsx) | `commerce-order-editor` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceOrderDetail | [Fuente](../src/components/blocks/commerce-order-editor.tsx) | `commerce-order-editor` | Helper de source | Sin template local; asociación directa si consta ID |
| CommerceWorkspace | [Fuente](../src/components/blocks/commerce-workspace.tsx) | `commerce-workspace` | Helper de source | Sin template local; asociación directa si consta ID |
| CustomerTable | [Fuente](../src/components/blocks/customer-table.tsx) | `customer-table` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=6-51) | [Template](../.figma/code-connect/CustomerTable.figma.ts) |
| DashboardShell | [Fuente](../src/components/blocks/dashboard-shell.tsx) | `dashboard-shell` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=30-969) | [Template](../.figma/code-connect/DashboardShell.figma.ts) |
| DataWorkbench | [Fuente](../src/components/blocks/data-workbench.tsx) | `data-workbench` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=228-1851) | Sin template local; asociación directa si consta ID |
| GoogleMap | [Fuente](../src/components/blocks/google-map.tsx) | `google-map` | Helper de source | Sin template local; asociación directa si consta ID |
| ImportWizard | [Fuente](../src/components/blocks/import-wizard.tsx) | `import-wizard` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=228-3645) | Sin template local; asociación directa si consta ID |
| MapsWorkspace | [Fuente](../src/components/blocks/maps-workspace.tsx) | `maps-workspace` | Helper de source | Sin template local; asociación directa si consta ID |
| MemberManagement | [Fuente](../src/components/blocks/member-management.tsx) | `member-management` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=225-2069) | Sin template local; asociación directa si consta ID |
| MetricCard | [Fuente](../src/components/blocks/metric-card.tsx) | `metric-card` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-160) | [Template](../.figma/code-connect/MetricCard.figma.ts) |
| OnboardingFlow | [Fuente](../src/components/blocks/onboarding-flow.tsx) | `onboarding-flow` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=225-1709) | Sin template local; asociación directa si consta ID |
| PageHeading | [Fuente](../src/components/blocks/page-heading.tsx) | `page-heading` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=29-142) | [Template](../.figma/code-connect/PageHeading.figma.ts) |
| PlanBreakdown | [Fuente](../src/components/blocks/plan-breakdown.tsx) | `plan-breakdown` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=6-33) | [Template](../.figma/code-connect/PlanBreakdown.figma.ts) |
| ProductImageEditor | [Fuente](../src/components/blocks/product-image-editor.tsx) | `product-image-editor` | Helper de source | Sin template local; asociación directa si consta ID |
| ProductImageThumbnail | [Fuente](../src/components/blocks/product-image-editor.tsx) | `product-image-editor` | Helper de source | Sin template local; asociación directa si consta ID |
| ProductsManager | [Fuente](../src/components/blocks/product-manager.tsx) | `product-manager` | Helper de source | Sin template local; asociación directa si consta ID |
| RowActions | [Fuente](../src/components/blocks/record-actions.tsx) | `record-actions` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=232-3940) | Sin template local; asociación directa si consta ID |
| DeleteDialog | [Fuente](../src/components/blocks/record-actions.tsx) | `record-actions` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=232-3990) | Sin template local; asociación directa si consta ID |
| GenericRecordDetail | [Fuente](../src/components/blocks/record-detail.tsx) | `record-detail` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=228-4135) | Sin template local; asociación directa si consta ID |
| RevenuePanel | [Fuente](../src/components/blocks/revenue-panel.tsx) | `revenue-panel` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=6-2) | [Template](../.figma/code-connect/RevenuePanel.figma.ts) |
| RouteMap | [Fuente](../src/components/blocks/route-map.tsx) | `route-map` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=31-1609) | [Template](../.figma/code-connect/RouteMap.figma.ts) |
| SocialAuth | [Fuente](../src/components/blocks/social-auth.tsx) | `social-auth` | Helper de source | Sin template local; asociación directa si consta ID |
| SocialProviderLogo | [Fuente](../src/components/blocks/social-auth.tsx) | `social-auth` | Helper de source | Sin template local; asociación directa si consta ID |
| TableToolbar | [Fuente](../src/components/blocks/table-toolbar.tsx) | `table-toolbar` | Helper de source | Sin template local; asociación directa si consta ID |
| WorkspaceStatus | [Fuente](../src/components/blocks/workspace-status.tsx) | `workspace-status` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=225-1615) | Sin template local; asociación directa si consta ID |
| CustomerDataTable | [Fuente](../src/components/blocks/customer-table.tsx) | `customer-data-table` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=17-18) | [Template](../.figma/code-connect/CustomerDataTable.figma.ts) |

| Master SaaS 1.2 | Export real | Fuente | Variantes registradas | Figma |
| --- | --- | --- | --- | --- |
| WorkspaceStatus | `WorkspaceStatus` | [Fuente](../src/components/blocks/workspace-status.tsx) | 6 | [Default](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=225-1615) / [Set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=225-1708) |
| OnboardingFlow | `OnboardingFlow` | [Fuente](../src/components/blocks/onboarding-flow.tsx) | 10 | [Default](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=225-1709) / [Set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=225-2068) |
| MemberManagement | `MemberManagement` | [Fuente](../src/components/blocks/member-management.tsx) | 8 | [Default](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=225-2069) / [Set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=225-2482) |
| DataWorkbench | `DataWorkbench` | [Fuente](../src/components/blocks/data-workbench.tsx) | 10 | [Default](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=228-1851) / [Set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=228-3644) |
| ImportWizard | `ImportWizard` | [Fuente](../src/components/blocks/import-wizard.tsx) | 12 | [Default](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=228-3645) / [Set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=228-4134) |
| RecordDetail | `GenericRecordDetail` | [Fuente](../src/components/blocks/record-detail.tsx) | 12 | [Default](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=228-4135) / [Set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=228-4817) |
| WorkspaceSettingsTemplate | `WorkspaceSettingsTemplate` | [Fuente](../src/components/templates/saas-setup.tsx) | 2 | [Default](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=232-3883) / [Set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=232-3939) |
| RowActions | `RowActions` | [Fuente](../src/components/blocks/record-actions.tsx) | 4 | [Default](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=232-3940) / [Set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=232-3989) |
| DeleteDialog | `DeleteDialog` | [Fuente](../src/components/blocks/record-actions.tsx) | 4 | [Default](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=232-3990) / [Set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=232-4040) |

| Efecto reutilizable | Código | Registry | Figma / Code Connect |
| --- | --- | --- | --- |
| GradientBackground | [Fuente](../src/components/effects/gradient-background.tsx) | `gradient-background` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-734) |
| ShaderBackground | [Fuente](../src/components/effects/shader-background.tsx) | `shader-background` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-766) |
| SpotlightCard | [Fuente](../src/components/effects/spotlight-card.tsx) | `spotlight-card` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-777) |
| GlowBorder | [Fuente](../src/components/effects/glow-border.tsx) | `glow-border` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-786) |
| TiltCard | [Fuente](../src/components/effects/tilt-card.tsx) | `tilt-card` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-797) |
| MagneticButton | [Fuente](../src/components/effects/magnetic-button.tsx) | `magnetic-button` | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=104-804) |

El registry se calcula desde el grafo de source e incluye `appearance-provider`, `appearance-controls`, `motion-system` y los seis efectos. Los presets y las exportaciones JSON/CSS/React están implementados en source; ver [uso de apariencia](appearance.md).

Helpers de source sin master nativo independiente: CommerceBilling, CommerceCheckout, CommerceStatusBadge, CommerceTotals, CommerceProductThumbnail, CommerceInvoiceView, CommerceInvoiceTable, CommerceInvoiceEditor, CommerceOrderEditor, CommerceOrderDetail, CommerceWorkspace, GoogleMap, MapsWorkspace, ProductImageEditor, ProductImageThumbnail, ProductsManager, SocialAuth, SocialProviderLogo, TableToolbar. Se conserva cada export del registry y no se inventa un ID de Figma.

| Familia | Código | Ejemplo completo | Figma |
| --- | --- | --- | --- |
| Button | [Fuente](../src/components/ui/button.tsx) | [Ejemplo](../examples/components/Button.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-113) |
| ButtonGroup | [Fuente](../src/components/ui/button-group.tsx) | [Ejemplo](../examples/components/ButtonGroup.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-97) |
| TextLink | [Fuente](../src/components/ui/link.tsx) | [Ejemplo](../examples/components/TextLink.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-110) |
| Breadcrumb | [Fuente](../src/components/ui/breadcrumb.tsx) | [Ejemplo](../examples/components/Breadcrumb.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-119) |
| Pagination | [Fuente](../src/components/ui/pagination.tsx) | [Ejemplo](../examples/components/Pagination.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-183) |
| Tabs | [Fuente](../src/components/ui/tabs.tsx) | [Ejemplo](../examples/components/Tabs.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-217) |
| Sidebar | [Fuente](../src/components/ui/sidebar.tsx) | [Ejemplo](../examples/components/Sidebar.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-282) |
| Command | [Fuente](../src/components/ui/command.tsx) | [Ejemplo](../examples/components/Command.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-320) |
| Input | [Fuente](../src/components/ui/input.tsx) | [Ejemplo](../examples/components/Input.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-133) |
| Field | [Fuente](../src/components/ui/field.tsx) | [Ejemplo](../examples/components/Field.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-78) |
| Textarea | [Fuente](../src/components/ui/textarea.tsx) | [Ejemplo](../examples/components/Textarea.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-67) |
| Select | [Fuente](../src/components/ui/select.tsx) | [Ejemplo](../examples/components/Select.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-98) |
| Combobox | [Fuente](../src/components/ui/combobox.tsx) | [Ejemplo](../examples/components/Combobox.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-124) |
| MultiSelect | [Fuente](../src/components/ui/multi-select.tsx) | [Ejemplo](../examples/components/MultiSelect.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-150) |
| Checkbox | [Fuente](../src/components/ui/checkbox.tsx) | [Ejemplo](../examples/components/Checkbox.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-14) |
| RadioGroup | [Fuente](../src/components/ui/radio-group.tsx) | [Ejemplo](../examples/components/RadioGroup.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-44) |
| Switch | [Fuente](../src/components/ui/switch.tsx) | [Ejemplo](../examples/components/Switch.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-21) |
| Slider | [Fuente](../src/components/ui/slider.tsx) | [Ejemplo](../examples/components/Slider.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-53) |
| DatePicker | [Fuente](../src/components/ui/date-picker.tsx) | [Ejemplo](../examples/components/DatePicker.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-242) |
| DateRangePicker | [Fuente](../src/components/ui/date-picker.tsx) | [Ejemplo](../examples/components/DateRangePicker.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-334) |
| InputOTP | [Fuente](../src/components/ui/input-otp.tsx) | [Ejemplo](../examples/components/InputOTP.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-387) |
| FileUpload | [Fuente](../src/components/ui/file-upload.tsx) | [Ejemplo](../examples/components/FileUpload.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-412) |
| Card | [Fuente](../src/components/ui/card.tsx) | [Ejemplo](../examples/components/Card.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-335) |
| Avatar | [Fuente](../src/components/ui/avatar.tsx) | [Ejemplo](../examples/components/Avatar.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-149) |
| Badge | [Fuente](../src/components/ui/badge.tsx) | [Ejemplo](../examples/components/Badge.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-124) |
| Table | [Fuente](../src/components/ui/table.tsx) | [Ejemplo](../examples/components/Table.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-355) |
| DataTable | [Fuente](../src/components/ui/data-table.tsx) | [Ejemplo](../examples/components/DataTable.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-443) |
| Chart | [Fuente](../src/components/ui/chart.tsx) | [Ejemplo](../examples/components/Chart.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-501) |
| Alert | [Fuente](../src/components/ui/alert.tsx) | [Ejemplo](../examples/components/Alert.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-363) |
| Toast | [Fuente](../src/components/ui/toast.tsx) | [Ejemplo](../examples/components/Toast.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-373) |
| Tooltip | [Fuente](../src/components/ui/tooltip.tsx) | [Ejemplo](../examples/components/Tooltip.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-387) |
| Popover | [Fuente](../src/components/ui/popover.tsx) | [Ejemplo](../examples/components/Popover.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-403) |
| Dialog | [Fuente](../src/components/ui/dialog.tsx) | [Ejemplo](../examples/components/Dialog.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-437) |
| Drawer | [Fuente](../src/components/ui/drawer.tsx) | [Ejemplo](../examples/components/Drawer.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-457) |
| DropdownMenu | [Fuente](../src/components/ui/dropdown-menu.tsx) | [Ejemplo](../examples/components/DropdownMenu.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-480) |
| Progress | [Fuente](../src/components/ui/progress.tsx) | [Ejemplo](../examples/components/Progress.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-492) |
| Spinner | [Fuente](../src/components/ui/spinner.tsx) | [Ejemplo](../examples/components/Spinner.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-501) |
| Skeleton | [Fuente](../src/components/ui/skeleton.tsx) | [Ejemplo](../examples/components/Skeleton.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-512) |
| Empty | [Fuente](../src/components/ui/empty.tsx) | [Ejemplo](../examples/components/Empty.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-531) |
| Accordion | [Fuente](../src/components/ui/accordion.tsx) | [Ejemplo](../examples/components/Accordion.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-537) |
| Carousel | [Fuente](../src/components/ui/carousel.tsx) | [Ejemplo](../examples/components/Carousel.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-511) |
| Gallery | [Fuente](../src/components/ui/gallery.tsx) | [Ejemplo](../examples/components/Gallery.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-585) |
| VideoPlayer | [Fuente](../src/components/ui/video-player.tsx) | [Ejemplo](../examples/components/VideoPlayer.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-638) |
| Ribbon | [Fuente](../src/components/ui/ribbon.tsx) | [Ejemplo](../examples/components/Ribbon.tsx) | [Abrir](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-645) |

Code Connect permanece local y sin publicar. El audit compuesto y la prueba SaaS 1.2 se conservan como baseline; el ledger de imágenes 1.2.1 registra exclusivamente su scope nuevo. Las composiciones no implican equivalencia pixel-perfect ni comportamiento de navegador en Figma. Ver [recibo runtime histórico 1.2](qa-runtime-1.2.json), [validación histórica 1.1](verification.es.md), [handoff](figma-handoff.es.md) y [gates de entrega 1.2.1](release-checklist-1.2.1.md).

Este inventario no certifica ZIP ni publicación. La entrega actual es 1.4.0; el owner registra la nueva QA y las identidades finales en `public/downloads/verification-1.4.0.json` después de ejecutar los checks acordados. Los archivos originales de 1.2, su checksum manifest y su recibo se conservan en `artifacts/release-1.2-original/`; el checkpoint público `public/downloads/verification-1.2.json` mantiene su pin histórico y no se compara con checksums nuevos. Los documentos incluidos se congelan antes de empaquetar.

La distribución 1.4.0 usa Apache 2.0 para el trabajo original: Source, Starter, muestra de componentes e imágenes. Source incluye los 32 originales en `design/images/masters/`, los recursos optimizados, las pruebas PNG, los tokens y los diseños disponibles. Se excluyen credenciales, configuración privada, dependencias instaladas y output/tmp locales. El límite de Source es 90 MiB y el de los otros ZIP es 25 MiB. Los tres ZIP de evidencia conservan sus bytes y scopes históricos: 23 PNG de 1.1, 22 de 1.2 y siete de 1.2.1. Ningún ZIP ni publicación queda certificado solo por generar este inventario. Ver [guía open source](open-source.es.md) y [checklist actual](release-checklist-1.3.0.md).
