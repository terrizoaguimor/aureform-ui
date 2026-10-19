# Colección de imágenes generadas de Aureform

[English](README.md)

[catalog.json](catalog.json) define 32 imágenes pregeneradas: 16 retratos de perfiles ficticios, dos imágenes de organizaciones ficticias, ocho productos ficticios y seis escenas artísticas/de estudio. Es la fuente de cada prompt, slug, texto alternativo en español e inglés, nombre del original y dimensiones optimizadas.

El catálogo registra **GPTImage2.5 Flare**, con el snapshot exacto de OpenAI Images API **`gpt-image-2.5-flare-2026-09-08`**. Sus parámetros de generación son calidad alta, fondo opaco y salida WebP con compresión 92. Son los parámetros registrados de generación; los archivos optimizados para distribución tienen las dimensiones indicadas abajo.

| Grupo                         | Imágenes | Dimensiones del original | Dimensiones optimizadas | Ruta de uso                   |
| ----------------------------- | -------: | ------------------------ | ----------------------- | ----------------------------- |
| Avatars                       |       18 | 1024 × 1024              | 320 × 320               | `/assets/avatars/<slug>.svg`  |
| Productos                     |        8 | 1024 × 1024              | 640 × 640               | `/assets/products/<slug>.svg` |
| Escenas artísticas/de estudio |        6 | 1536 × 1024              | 1200 × 800              | `/assets/art/<slug>.svg`      |

Las personas, organizaciones y diseños de productos son ficticios y sirven como contenido de demostración. Las escenas son imágenes generadas. No identifican a personas reales ni anuncian productos a la venta.

## Formatos de uso

Cada `.svg` es un contenedor de portabilidad que incorpora el WebP optimizado real mediante una URI de datos de imagen. Conserva el transporte de texto del registro shadcn y las rutas existentes de los assets. La imagen es rasterizada, no una ilustración vectorial editable; la extensión SVG no añade detalle a la imagen.

Un archivo `.webp` junto al SVG contiene la misma imagen optimizada para uso directo y descarga. Por ejemplo:

- `/assets/avatars/alex-morgan.svg` y `/assets/avatars/alex-morgan.webp`
- `/assets/products/forma-desk-lamp.svg` y `/assets/products/forma-desk-lamp.webp`
- `/assets/art/arc.svg` y `/assets/art/arc.webp`

La generación ocurre fuera de la aplicación. Ejecutar la demo o usar estos assets incluidos no requiere una clave API en el cliente, una solicitud de generación ni un servicio remoto de imágenes.

## Ejemplos de componentes

Avatar recibe un `src` explícito y no importa un mapa de nombres de la demo. Conserva el nombre accesible del perfil mediante `name`. Si la aplicación no incluye los archivos de imagen, omitir `src` permite usar las iniciales como alternativa.

```tsx
import { Avatar } from "@/components/ui/avatar";

export function ProfileImages() {
  return (
    <div className="flex items-center gap-3">
      <Avatar name="Alex Morgan" src="/assets/avatars/alex-morgan.svg" />
      <Avatar name="Isabel Torres" />
    </div>
  );
}
```

Las imágenes artísticas usan dimensiones de 1200 × 800 y el texto alternativo descriptivo del catálogo:

```tsx
export function GeneratedArt() {
  return (
    <img
      src="/assets/art/arc.svg"
      alt="Un arco terracota y una esfera de vidrio ámbar con sombras amplias"
      width={1200}
      height={800}
      className="aspect-[3/2] w-full object-cover"
    />
  );
}
```

Los ejemplos completos de [Avatar](../../examples/components/Avatar.tsx), [Carousel](../../examples/components/Carousel.tsx) y [Gallery](../../examples/components/Gallery.tsx) usan rutas literales. El registro de código para copiar contiene los archivos canónicos completos de las 44 familias de componentes. Copia los assets correspondientes al directorio `public/assets` del proyecto junto al código del ejemplo.

## Manifest y distribución

El destino del manifest del proceso de assets es **`public/assets/generated-images.json`**, servido en **`/assets/generated-images.json`**. Consulta ese registro de distribución para conocer los archivos realmente generados, su procedencia y sus dimensiones optimizadas; el catálogo define las 32 imágenes solicitadas.

Los archivos Source e Images de código abierto incluyen los pares `.svg`/`.webp` optimizados, el manifest, el catálogo completo de prompts y los 32 originales en **`design/images/masters/<nombre del original>`**. Los originales mantienen los nombres exactos de `catalog.json`; el manifest histórico 1.2.1 registra sus ubicaciones previas en `output/imagegen/masters` sin alterar sus hashes de procedencia.

La colección original, sus originales, prompts y derivados de imagen para Figma usan la misma [licencia Apache 2.0](../../LICENSE) que el trabajo original de Aureform, en la medida en que los contribuidores posean derechos sobre esos materiales. Conserva [NOTICE](../../NOTICE) al redistribuirlos. El starter y la muestra de ocho componentes tienen la misma licencia.

Las credenciales y los resultados locales de generación quedan fuera de la distribución. Se incluyen los originales para edición y reproducibilidad; ni los originales ni una clave API son dependencias de ejecución. Los prompts conservan su redacción original, incluida la descripción histórica de un kit premium; esa redacción documenta la procedencia y no establece otra licencia.

## Conservar las imágenes generadas

`scripts/generate-demo-assets.mjs` conserva la colección por defecto y no escribe assets. Sus operaciones opcionales están separadas:

```bash
node scripts/generate-demo-assets.mjs
node scripts/generate-demo-assets.mjs --video
node scripts/generate-demo-assets.mjs --legacy
```

`--video` requiere ffmpeg y escribe únicamente `public/assets/aureform-motion.webm` y sus subtítulos `.vtt`. No reemplaza retratos, productos, imágenes artísticas ni sus contenedores SVG. `--legacy` crea los antiguos ejemplos vectoriales solo en `public/assets/legacy/art` y conserva los archivos que ya existan allí. Ninguna de estas operaciones llama a Images API.
