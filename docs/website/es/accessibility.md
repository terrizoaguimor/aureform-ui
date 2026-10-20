# Accesibilidad

Aureform aporta componentes y patrones de interacción accesibles que puedes conservar al adaptar el código. La accesibilidad depende de la composición final, contenido, colores y servicios; el kit no proporciona un certificado WCAG de toda la aplicación.

## Conecta etiquetas, ayuda y errores

Usa etiquetas visibles; el placeholder no debe ser el único nombre. `Field` vincula su etiqueta y texto de apoyo al control hijo directo, y asocia un error mediante `aria-invalid`, `aria-describedby` y un mensaje de alerta.

```tsx
"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function EmailField() {
  return (
    <Field
      htmlFor="contact-email"
      label="Email"
      description="Usa una dirección de correo a la que tengas acceso."
    >
      <Input type="email" name="email" autoComplete="email" />
    </Field>
  );
}
```

Pasa un texto en `error` cuando tu validación rechace un valor. Al componer un hijo más complejo, verifica que el control real reciba el ID y las descripciones correspondientes. Las acciones con solo icono necesitan un nombre accesible explícito; los iconos decorativos no deben duplicarlo.

## Conserva teclado y foco

1. Recorre el flujo completo con Tab y Shift+Tab.
2. Abre diálogos y menús, usa sus controles de teclado, cierra con Escape y comprueba que el foco vuelva al disparador.
3. Comprueba que los controles ocupados o deshabilitados no repitan acciones accidentalmente.
4. Mantén visibles los indicadores de foco sobre cada superficie elegida.

Base UI aporta comportamiento a sus componentes, pero el markup del consumidor puede romperlo. Conserva títulos, descripciones y composición documentada. Asigna el `type` apropiado a botones de envío y otras acciones.

## Ofrece alternativas legibles para los datos

`DataTable` usa encabezados nativos, estado de ordenación, controles de selección y una región de desplazamiento horizontal enfocable con teclado. Aporta un caption descriptivo y etiquetas traducidas.

`Chart` requiere un `label` descriptivo y renderiza una tabla para lectores de pantalla con encabezados de categorías y series. Usa nombres útiles en `valueLabel`, `secondaryLabel` y `tertiaryLabel`. Conserva esta alternativa al personalizar el gráfico y comunica los estados con algo más que color.

## Revisa apariencia y movimiento

Comprueba ambos idiomas, ambos temas, pantallas estrechas y zoom aumentado. Describe el contenido real de las imágenes después de recortarlas o sustituirlas. Respeta el movimiento reducido del sistema; [MotionSystem](motion.md) restaura contenido visible y desplazamiento nativo.

Los análisis automatizados tienen entradas y límites concretos. El [alcance de la versión 1.4](../../../docs/release-checklist-1.4.0.md) conserva resultados incompletos de contraste y no acredita conformidad total. Revisa tu aplicación final con teclado y tecnologías de asistencia. Los [ejemplos](../../../examples/README.md), la [guía de tablas](../../../docs/data-table.md) y los [contratos de gráficos](../../../docs/charts.md) ofrecen patrones concretos.
