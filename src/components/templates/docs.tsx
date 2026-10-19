"use client";
import { publicPath } from "@/lib/public-path";
import { useState } from "react";
import { ArrowUpRight, Download, Check, Copy, BookOpen } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useCopy } from "@/hooks/use-copy";
import { PageHeading } from "@/components/blocks/page-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  figmaUrl,
  githubUrl,
  demoUrl,
  kitVersion,
  routes,
  componentFamilies,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

type DocumentationText = (en: string, es: string) => string;

const releaseDownloadUrl = `${githubUrl}/releases/download/v${kitVersion}`;

const appearanceExample = (l: DocumentationText) => `"use client";

import { useState } from "react";
import { AppearanceScope } from "@/components/appearance-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { createAppearance } from "@/lib/appearance";

export default function AppearanceExample() {
  const [appearance, setAppearance] = useState(
    () => createAppearance("ocean", "light"),
  );

  return (
    <AppearanceScope appearance={appearance} className="p-6">
      <Card appearance={appearance.material}>
        <CardHeader>
          <Badge appearance="soft">{${JSON.stringify(l("Ocean palette", "Paleta Ocean"))}}</Badge>
          <CardTitle>{${JSON.stringify(l("Your palette, your surface", "Tu paleta, tu superficie"))}}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            appearance="gradient"
            onClick={() => setAppearance((current) => ({
              ...current,
              theme: current.theme === "light" ? "dark" : "light",
            }))}
          >
            {${JSON.stringify(l("Switch Light / Dark", "Cambiar claro / oscuro"))}}
          </Button>
        </CardContent>
      </Card>
    </AppearanceScope>
  );
}`;

const shaderExample = (l: DocumentationText) => `"use client";

import { useState } from "react";
import { AppearanceScope } from "@/components/appearance-provider";
import { ShaderBackground } from "@/components/effects/shader-background";
import { Button } from "@/components/ui/button";
import { createAppearance } from "@/lib/appearance";

export default function ShaderExample() {
  const [appearance, setAppearance] = useState(
    () => createAppearance("aurora", "dark"),
  );
  const [paused, setPaused] = useState(false);

  return (
    <AppearanceScope appearance={appearance}>
      <ShaderBackground
        {...appearance.shader}
        colors={Object.values(appearance.colors)}
        paused={paused || appearance.motion === "off"}
        className="p-8"
      >
        <h2 className="text-2xl font-semibold">
          {${JSON.stringify(l("A readable foreground", "Contenido legible en primer plano"))}}
        </h2>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            appearance="glass"
            aria-pressed={paused}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? ${JSON.stringify(l("Resume shader", "Reanudar shader"))} : ${JSON.stringify(l("Pause shader", "Pausar shader"))}}
          </Button>
          <Button
            appearance="outline"
            onClick={() => setAppearance((current) => ({
              ...current,
              motion: current.motion === "off" ? "gentle" : "off",
            }))}
          >
            {appearance.motion === "off"
              ? ${JSON.stringify(l("Enable Gentle motion", "Activar movimiento suave"))}
              : ${JSON.stringify(l("Motion Off", "Desactivar movimiento"))}}
          </Button>
        </div>
      </ShaderBackground>
    </AppearanceScope>
  );
}`;

const chapters = [
  ["start", "Getting started", "Primeros pasos", "docs"],
  ["tokens", "Design tokens", "Tokens de diseño", "docs/tokens"],
  ["cli", "CLI & registry", "CLI y registro", "docs/cli"],
  ["figma", "Figma & Code Connect", "Figma y Code Connect", "docs/figma"],
  ["adapters", "Demo adapters", "Adaptadores de demostración", "docs/adapters"],
  ["accessibility", "Accessibility", "Accesibilidad", "docs/accessibility"],
  ["license", "Apache 2.0 license", "Licencia Apache 2.0", "docs/license"],
  ["roadmap", "Suite coverage", "Cobertura de la suite", "docs/roadmap"],
];
function Code({ children }: { children: string }) {
  const { l } = useLanguage(),
    { copy, copied } = useCopy();
  return (
    <div className="relative my-4">
      <button
        type="button"
        aria-label={l("Copy code", "Copiar código")}
        onClick={() => void copy(children)}
        className="absolute right-3 top-3 rounded p-1.5 text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      <pre className="pr-12">{children}</pre>
    </div>
  );
}
export function DocsTemplate({ section = "start" }: { section?: string }) {
  const [motionPreview, setMotionPreview] = useState(0);
  const { l, locale } = useLanguage(),
    chapter = chapters.find((item) => item[0] === section) ?? chapters[0];
  const paragraph = (en: string, es: string) => <p>{l(en, es)}</p>;
  const heading = (en: string, es: string) => <h2>{l(en, es)}</h2>;
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l("A thoughtful handoff", "Una entrega cuidada")}
        title={l(chapter[1], chapter[2])}
        description={l(
          "A practical guide to owning, adapting and shipping the source.",
          "Una guía práctica para usar, adaptar y entregar el código.",
        )}
        actions={
          <a
            href={`${releaseDownloadUrl}/aureform-ui-source.zip`}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download />
            {l("Download source", "Descargar código")}
          </a>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[200px_minmax(0,1fr)]">
        <nav
          aria-label={l("Documentation chapters", "Capítulos de documentación")}
          className="flex flex-wrap gap-1 xl:sticky xl:top-6 xl:grid"
        >
          {chapters.map(([id, en, es, path]) => (
            <a
              key={id}
              href={publicPath(`/${locale}/${path}/`)}
              aria-current={section === id ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2.5 text-[11px] outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring",
                section === id
                  ? "bg-accent font-semibold text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <BookOpen className="size-3" />
              {l(en, es)}
            </a>
          ))}
        </nav>
        <Card className="min-w-0 p-6 sm:p-9">
          <article className="prose-doc max-w-3xl text-sm">
            {section === "start" && (
              <>
                <Badge variant="outline">
                  Aureform UI {kitVersion} · Apache 2.0 · Next.js 16 · React 19
                  · Tailwind 4
                </Badge>
                {paragraph(
                  "Aureform is an open-source kit under Apache 2.0: editable React components, complete application templates, a native Figma library and local installation tools. The demo runs entirely in the browser. You own the application architecture.",
                  "Aureform es un kit abierto bajo Apache 2.0: componentes React editables, plantillas completas, una biblioteca nativa de Figma y herramientas locales de instalación. La demo funciona en el navegador. Tú defines la arquitectura de tu aplicación.",
                )}
                {paragraph(
                  `Version ${kitVersion} includes ${routes.length} suite routes plus the landing (${routes.length + 1} views), ${componentFamilies.length} core component families, six palettes, six reusable effects and 32 generated image assets. The complete suite is available on GitHub.`,
                  `La versión ${kitVersion} incluye ${routes.length} rutas de suite más la landing (${routes.length + 1} vistas), ${componentFamilies.length} familias core, seis paletas, seis efectos reutilizables y 32 imágenes generadas. La suite completa está disponible en GitHub.`,
                )}
                {heading("Run the complete suite", "Ejecuta la suite completa")}
                <Code>{`git clone ${githubUrl}.git\ncd aureform-ui\ncorepack enable\npnpm install --frozen-lockfile\npnpm dev\n# http://localhost:3000/es/ or /en/`}</Code>
                <div className="my-5 flex flex-wrap gap-3">
                  <a
                    href={githubUrl}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    {l("Source on GitHub", "Código en GitHub")} <ArrowUpRight />
                  </a>
                  <a
                    href={`${demoUrl}/en/`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    {l("Public demo", "Demo pública")} <ArrowUpRight />
                  </a>
                </div>
                {paragraph(
                  "Use Node.js 22.16 or newer and pnpm 10. The lockfile is included. For a mounted drive that cannot create package symlinks, extract the source onto a normal local filesystem before installing.",
                  "Usa Node.js 22.16 o posterior y pnpm 10. Se incluye el archivo de versiones bloqueadas. Si tu unidad montada no permite crear enlaces de paquetes, extrae el código en un sistema de archivos local antes de instalar.",
                )}
                {heading("Ready-to-use images", "Imágenes listas para usar")}
                {paragraph(
                  "The source includes 16 fictional portrait avatars, two organization avatars, eight product photos and six editorial images. The separate image collection includes all 32 optimized WebP files, 32 self-contained SVG wrappers, dimensions, English/Spanish alternative text and the complete prompt catalog. Displaying them requires no API key or remote image service.",
                  "El código incluye 16 retratos ficticios, dos avatares de organizaciones, ocho fotos de productos y seis imágenes editoriales. La colección independiente contiene los 32 WebP optimizados, 32 SVG autónomos, dimensiones, textos alternativos en inglés/español y el catálogo completo de prompts. Mostrarlas no requiere clave API ni servicio remoto de imágenes.",
                )}
                {paragraph(
                  "Each SVG embeds its corresponding WebP: it contains raster image content, not editable vector artwork. Extract the image ZIP into your project root to preserve public/assets paths. The source ZIP already contains these files; the image ZIP is useful for a separate host or asset download.",
                  "Cada SVG incorpora su WebP: contiene una imagen rasterizada, no ilustración vectorial editable. Extrae el ZIP de imágenes en la raíz del proyecto para conservar las rutas public/assets. El ZIP de código ya incluye estos archivos; el de imágenes sirve para otro proyecto o para descargarlos por separado.",
                )}
                <div className="my-5 flex flex-wrap gap-3">
                  <a
                    href={`${releaseDownloadUrl}/aureform-ui-images.zip`}
                    download
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <Download />
                    {l("Download 32 images", "Descargar 32 imágenes")}
                  </a>
                  <a
                    href={publicPath("/assets/generated-images.json")}
                    download
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    {l("Image manifest", "Manifiesto de imágenes")}
                  </a>
                  <a
                    href={`${githubUrl}/blob/v1.3.0/public/downloads/verification-1.2.1.json`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    {l(
                      "Image verification · 1.2.1",
                      "Verificación de imágenes · 1.2.1",
                    )}
                  </a>
                </div>
                {paragraph(
                  "Match the current release version in downloads/checksums.json before comparing archive hashes. Historical 1.2.1 image verification and 1.2 runtime/native receipts retain their original scope; they do not certify later source changes.",
                  "Comprueba la versión actual en downloads/checksums.json antes de comparar hashes de archivos. La verificación histórica de imágenes 1.2.1 y los recibos de runtime/diseño 1.2 conservan su alcance original; no certifican cambios posteriores del código.",
                )}
                {heading("Start smaller", "Empieza con menos")}
                <Code>{`node bin/aureform.mjs init ../my-product --no-install\ncd ../my-product\npnpm install\npnpm dev\n# Add only what you need, from the source kit:\nnode ../aureform-ui/bin/aureform.mjs add button revenue-panel --cwd .`}</Code>
                {paragraph(
                  `The starter includes local fonts, internationalization, palette and appearance controls, MotionSystem and all six effects on a small overview page. The complete ${routes.length}-route suite is delivered separately. The add command follows the source dependency graph, including styles and shader helpers.`,
                  `El proyecto inicial incluye fuentes locales, internacionalización, controles de paleta y apariencia, MotionSystem y los seis efectos en una página de resumen. La suite completa de ${routes.length} rutas se entrega por separado. El comando add sigue las dependencias, incluidos estilos y helpers de shaders.`,
                )}
                {heading(
                  "Before connecting real data",
                  "Antes de conectar datos reales",
                )}
                {paragraph(
                  "Replace the local adapters, provide server-side authorization, validate inputs on the server and use your own authentication and billing services. Demo keys, verification codes and transactions have no authority outside this browser.",
                  "Sustituye los adaptadores locales, implementa autorización en el servidor, valida entradas en el servidor y conecta tus servicios de identidad y cobro. Las claves, códigos y transacciones de ejemplo solo sirven en esta demo.",
                )}
                <a
                  href={publicPath(`/${locale}/templates/`)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {l("Explore the suite", "Explorar la suite")}
                  <ArrowUpRight />
                </a>
              </>
            )}
            {section === "tokens" && (
              <>
                {paragraph(
                  "src/lib/appearance.ts is the pure appearance configuration. The token generator uses scripts/lib/appearance-tokens.mjs to refresh colors, palettes, materials, effects and radii in tokens/aureform.tokens.json and src/styles/tokens.css, including --af-control-color-1 through --af-control-color-4 for gradient controls. Semantic colors describe purpose; primitive colors describe a value. Counts come from generated output. Customize the source configuration or Studio colors.",
                  "src/lib/appearance.ts contiene la configuración pura de apariencia. El generador usa scripts/lib/appearance-tokens.mjs para actualizar colores, paletas, materiales, efectos y radios en tokens/aureform.tokens.json y src/styles/tokens.css, incluidos --af-control-color-1 a --af-control-color-4 para controles con gradiente. Los colores semánticos describen una función; los primitivos, un valor. Los conteos vienen de la salida generada. Personaliza la configuración de source o los colores del estudio.",
                )}
                {heading(
                  "Palettes, materials and type",
                  "Paletas, materiales y tipografía",
                )}
                {paragraph(
                  "Choose Aurora, Violet, Ocean, Mint, Ember or Rose in Light or Dark. Aurora is the default, with Manrope for the modern interface; Instrument Serif is an optional editorial display style. Each configuration resolves 33 shades: 11 steps for each of its primary, secondary and tertiary colors. Materials are flat, elevated, glass and gradient.",
                  "Elige Aurora, Violet, Ocean, Mint, Ember o Rose en claro u oscuro. Aurora es la opción inicial, con Manrope para la interfaz moderna; Instrument Serif es una alternativa editorial para títulos. Cada configuración resuelve 33 shades: 11 pasos para cada color primario, secundario y terciario. Los materiales son flat, elevated, glass y gradient.",
                )}
                {heading("Depth with intention", "Profundidad con intención")}
                {paragraph(
                  'Soft shadows, gradients, glass and hover states share appearance-aware tokens. Card accepts flat, elevated, glass or gradient through its additive appearance prop. Button and Badge accept solid, soft, outline, glass or gradient alongside their existing variant props. Button also accepts shape="rounded", "pill" or "square" with its existing size, loading and disabled controls.',
                  'Las sombras suaves, los gradientes, el cristal y hover comparten tokens de apariencia. Card acepta flat, elevated, glass o gradient mediante la prop aditiva appearance. Button y Badge aceptan solid, soft, outline, glass o gradient junto con sus props variant existentes. Button también acepta shape="rounded", "pill" o "square" con sus controles de tamaño, carga y deshabilitado.',
                )}
                <div className="my-6 grid gap-4 sm:grid-cols-3">
                  <div className="af-shadow-soft rounded-xl border border-border bg-surface p-5">
                    <h3 className="text-xs font-semibold">
                      {l("Soft", "Suave")}
                    </h3>
                    <p className="!mb-0 !text-xs">
                      {l("A little separation.", "Una separación sutil.")}
                    </p>
                  </div>
                  <div className="af-shadow-elevated rounded-xl border border-border bg-surface p-5">
                    <h3 className="text-xs font-semibold">
                      {l("Elevated", "Elevada")}
                    </h3>
                    <p className="!mb-0 !text-xs">
                      {l(
                        "For a focused surface.",
                        "Para una superficie destacada.",
                      )}
                    </p>
                  </div>
                  <a
                    href={publicPath(`/${locale}/components/`)}
                    className="af-surface-gradient af-hover-card block rounded-xl border border-border p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <h3 className="text-xs font-semibold">
                      {l("Tonal", "Tonal")}
                    </h3>
                    <p className="!mb-0 !text-xs">
                      {l("Explore the components.", "Explora los componentes.")}
                    </p>
                  </a>
                </div>
                {heading(
                  "A complete appearance example",
                  "Un ejemplo completo de apariencia",
                )}
                {paragraph(
                  "Save this as a client component in a host with the kit’s global styles and fonts, such as the CLI starter. AppearanceScope isolates its Ocean configuration; the button switches Light/Dark locally without changing the rest of your application.",
                  "Guárdalo como componente cliente en un proyecto con los estilos globales y fuentes del kit, como el starter de la CLI. AppearanceScope aísla la configuración Ocean; el botón cambia claro/oscuro localmente sin alterar el resto de la aplicación.",
                )}
                <Code>{appearanceExample(l)}</Code>
                {heading("A considered rhythm", "Un ritmo cuidado")}
                {paragraph(
                  "Choose Off, Gentle or Expressive motion. GSAP adds finite entrances and Lenis smooths the landing on fine pointers; the workspace keeps native scrolling. Motion Off and the operating system’s reduced-motion preference disable decorative movement. Useful content stays visible before JavaScript loads.",
                  "Elige movimiento desactivado, suave o expresivo. GSAP añade entradas finitas y Lenis suaviza la landing con mouse; el espacio de trabajo conserva su desplazamiento nativo. El modo desactivado y la preferencia de movimiento reducido del sistema detienen el movimiento decorativo. El contenido permanece visible antes de cargar JavaScript.",
                )}
                <div className="my-5 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-5">
                  <div
                    key={motionPreview}
                    data-motion="intro"
                    className="af-surface-gradient flex size-12 items-center justify-center rounded-xl border border-border"
                  >
                    <span className="text-lg font-semibold text-primary">
                      A
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMotionPreview((value) => value + 1)}
                  >
                    {l("Replay motion", "Repetir movimiento")}
                  </Button>
                </div>
                <Code>{`import { MotionSystem } from "@/components/motion-system";\n\n<MotionSystem smoothScroll>\n  <h1 data-motion="intro">A good beginning.</h1>\n  <section data-motion="reveal">Always-visible content</section>\n</MotionSystem>\n\n// Install the reusable runtime:\n// node bin/aureform.mjs add motion-system --cwd ../my-product`}</Code>
                <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    "background",
                    "surface",
                    "surface-subtle",
                    "primary",
                    "accent",
                    "warning",
                    "destructive",
                    "foreground",
                    "border",
                  ].map((name) => (
                    <div
                      key={name}
                      className="rounded-lg border border-border p-3"
                    >
                      <div
                        className="mb-3 h-14 rounded-md border border-border"
                        style={{ background: `var(--${name})` }}
                      />
                      <code>{name}</code>
                    </div>
                  ))}
                </div>
                {heading(
                  "Change once, regenerate deliberately",
                  "Cambia la base y regenera",
                )}
                <Code>{`# Customize palettePresets / createAppearance in src/lib/appearance.ts\npnpm tokens\npnpm registry\n# Generated: tokens/aureform.tokens.json and src/styles/tokens.css\n# pnpm tokens uses Node --experimental-strip-types.\n# Review matching Figma variables before releasing.`}</Code>
                {paragraph(
                  "Spacing follows a 4 px rhythm. Appearance radius is adjustable from 0 to 24 px; the current 16 px default resolves small/medium/large/extra-large aliases to 6.4/10.4/16/16 px. These values follow the configuration. Custom colors belong in src/lib/appearance.ts or in the Studio. Editing generated token JSON will be overwritten by pnpm tokens.",
                  "El espaciado sigue un ritmo de 4 px. El radio de apariencia se ajusta entre 0 y 24 px; el valor inicial actual de 16 px resuelve los alias pequeño/mediano/grande/extra grande a 6.4/10.4/16/16 px. Los valores siguen la configuración. Personaliza colores en src/lib/appearance.ts o en el estudio. pnpm tokens sobrescribe los cambios al JSON generado.",
                )}
                {heading(
                  "Studio, presets and exports",
                  "Estudio, presets y exportaciones",
                )}
                {paragraph(
                  "In Appearance Studio, choose a palette, edit its colors and material, then save, apply or delete a named preset. Settings and presets remain in your browser. Export JSON for a complete configuration, CSS for resolved variables, or React for a complete configured example. Import an exported appearance JSON file or paste its contents; validation runs before applying it.",
                  "En el estudio visual, elige una paleta, edita sus colores y material, y guarda, aplica o elimina un preset con nombre. Los ajustes y presets permanecen en tu navegador. Exporta JSON para una configuración completa, CSS para variables resueltas o React para un ejemplo completo configurado. Importa un JSON de apariencia exportado o pega su contenido; se valida antes de aplicarlo.",
                )}
                {paragraph(
                  "For a custom host theme, load the Studio’s CSS export after the kit styles. If AppearanceProvider manages that host, apply the JSON configuration through the provider instead: its resolved values control the document. Appearance JSON uses schema version 1 independently of the kit release.",
                  "Para un tema personalizado en otro proyecto, carga el CSS exportado del estudio después de los estilos del kit. Si AppearanceProvider controla ese proyecto, aplica la configuración JSON mediante el proveedor: sus valores resueltos controlan el documento. El JSON de apariencia usa el esquema versión 1, independiente de la versión del kit.",
                )}
                <a
                  href={publicPath(`/${locale}/studio/`)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {l("Open Appearance Studio", "Abrir el estudio visual")}
                  <ArrowUpRight />
                </a>
                {heading(
                  "Bind purpose to components",
                  "Vincula la función al componente",
                )}
                {paragraph(
                  "Prefer semantic classes and appearance props over hardcoded colors. The source includes reduced-motion rules, shared focus rings and bundled font licenses. Recheck contrast in both themes after changing colors.",
                  "Prefiere clases semánticas y props de apariencia a colores fijos. El código incluye movimiento reducido, foco visible y licencias de las fuentes. Revisa el contraste en ambos temas al cambiar colores.",
                )}
              </>
            )}
            {section === "cli" && (
              <>
                {paragraph(
                  "The local CLI is delivered with the kit; it does not pretend to be a published npm package. Run it from the extracted source. Files are inspected before copying, and existing files are protected unless you request --overwrite.",
                  "La CLI local se entrega con el kit; no requiere un paquete publicado en npm. Ejecútala desde el código extraído. El instalador revisa los archivos antes de copiar y protege los existentes salvo que uses --overwrite.",
                )}
                <Code>{`node bin/aureform.mjs list\nnode bin/aureform.mjs init ../new-app --no-install\nnode bin/aureform.mjs add combobox metric-card --cwd ../new-app\nnode bin/aureform.mjs add button --cwd ../new-app --overwrite\nnode bin/aureform.mjs add --help`}</Code>
                {heading("What gets installed", "Qué se instala")}
                {paragraph(
                  "add copies the selected source files, their transitive local imports and required static assets, then merges the required npm dependencies. Run your package manager afterwards. init includes styles, local fonts, palette/appearance controls, MotionSystem and all six effects. It also copies the token generator, its appearance-tokens helper and src/lib/appearance.ts.",
                  "add copia los archivos seleccionados, sus importaciones locales y recursos necesarios, y combina las dependencias npm. Después ejecuta tu gestor de paquetes. init incluye estilos, fuentes locales, controles de paleta y apariencia, MotionSystem y los seis efectos. También copia el generador de tokens, su helper appearance-tokens y src/lib/appearance.ts.",
                )}
                {paragraph(
                  "Image assets follow the selected source dependency graph. The local CLI preserves binary WebP files; the shadcn 4.22.0 registry delivers self-contained SVG wrappers as text files at their public/assets targets. The generic Avatar primitive and minimal component bundle do not require the generated image collection.",
                  "Las imágenes siguen las dependencias del código seleccionado. La CLI local conserva archivos WebP binarios; el registro shadcn 4.22.0 entrega los SVG autónomos como archivos de texto en sus destinos public/assets. Avatar genérico y el paquete mínimo de componentes no necesitan la colección de imágenes generadas.",
                )}
                {heading("Six reusable effects", "Seis efectos reutilizables")}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{l("Effect", "Efecto")}</TableHead>
                      <TableHead>{l("Use", "Uso")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      [
                        "GradientBackground",
                        l(
                          "Static linear, radial or mesh color field; no GPU context.",
                          "Campo de color lineal, radial o mesh estático; sin contexto GPU.",
                        ),
                      ],
                      [
                        "ShaderBackground",
                        l(
                          "Original Aurora, Waves or Iridescent WebGL background; none disables the shader.",
                          "Fondo WebGL original Aurora, Waves o Iridescent; none desactiva el shader.",
                        ),
                      ],
                      [
                        "SpotlightCard",
                        l(
                          "A local light follows the pointer.",
                          "Una luz local sigue el puntero.",
                        ),
                      ],
                      [
                        "GlowBorder",
                        l(
                          "A colored perimeter with optional motion.",
                          "Un contorno de color con movimiento opcional.",
                        ),
                      ],
                      [
                        "TiltCard",
                        l(
                          "A surface tilts on a fine pointer.",
                          "Una superficie se inclina con un puntero preciso.",
                        ),
                      ],
                      [
                        "MagneticButton",
                        l(
                          "A button moves toward a nearby pointer.",
                          "Un botón se desplaza hacia un puntero cercano.",
                        ),
                      ],
                    ].map(([name, description]) => (
                      <TableRow key={name}>
                        <TableCell className="font-mono text-[10px]">
                          {name}
                        </TableCell>
                        <TableCell>{description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {heading(
                  "A complete shader example",
                  "Un ejemplo completo de shader",
                )}
                {paragraph(
                  "The starter already contains these dependencies. For an existing configured host, add them from the source kit, then save the complete component below. The local source graph includes the effect CSS, lazy shader runtime and shader source files.",
                  "El starter ya contiene estas dependencias. Para otro proyecto ya configurado, añádelas desde el kit y guarda el componente completo de abajo. El grafo local incluye el CSS del efecto, el runtime diferido y los archivos de shaders.",
                )}
                <Code>{`node bin/aureform.mjs add button appearance-provider shader-background --cwd ../my-product\n# In ../my-product, run your package manager afterwards.`}</Code>
                <Code>{shaderExample(l)}</Code>
                {paragraph(
                  "Shader draws are capped at 30 FPS. Motion Off disables decorative animation; OS reduced motion overrides Gentle/Expressive. Hidden tabs and offscreen effects pause; a CSS fallback keeps the foreground readable when WebGL is unavailable. paused is a real source prop, and the example’s controls only update local state.",
                  "El shader tiene un máximo de 30 FPS. El modo desactivado detiene la animación decorativa; el movimiento reducido del sistema tiene prioridad sobre suave/expresivo. Las pestañas ocultas y efectos fuera de pantalla se pausan; una alternativa CSS mantiene legible el contenido cuando no hay WebGL. paused es una prop real; los controles del ejemplo solo actualizan estado local.",
                )}
                {heading("shadcn registry", "Registro shadcn")}
                <Code>{`# Public registry:\nnpx shadcn@4.22.0 add ${demoUrl}/r/button.json --yes\n# Or generate and install from local source:\npnpm registry\nnpx shadcn@4.22.0 add ./public/r/button.json --yes`}</Code>
                {paragraph(
                  "The registry uses the documented shadcn schema and Base UI components. It supports configured component aliases and carries source dependencies inline. Aureform’s semantic theme is applied during installation; review your existing theme before adding it to a customized product.",
                  "El registro usa el esquema oficial de shadcn y componentes Base UI. Respeta los alias de componentes y lleva las dependencias de código necesarias. La instalación aplica el tema semántico de Aureform; revisa el tema de tu producto si ya está personalizado.",
                )}
                {heading(
                  "Review changes before installing",
                  "Revisa los cambios antes de instalar",
                )}
                <Code>{`node bin/aureform.mjs add data-workbench import-wizard --cwd ../my-product --dry-run\nnode bin/aureform.mjs add data-workbench import-wizard --cwd ../my-product --diff\n# Review the proposed files, dependencies and conflicts.\nnode bin/aureform.mjs add data-workbench import-wizard --cwd ../my-product`}</Code>
                {paragraph(
                  "Preview commands do not write files or install dependencies. Successful adds record source and installed-file hashes in .aureform/manifest.json. Later adds protect personalized files; --overwrite remains an explicit choice.",
                  "Los comandos de vista previa no escriben archivos ni instalan dependencias. Las instalaciones guardan hashes del código de origen y destino en .aureform/manifest.json. Las siguientes instalaciones protegen los archivos personalizados; --overwrite sigue siendo una decisión explícita.",
                )}
                {paragraph(
                  `The public MCP-compatible discovery manifest is available at ${demoUrl}/r/registry.json. You can also serve the included public/r files from your own host.`,
                  `El manifiesto público de descubrimiento compatible con MCP está en ${demoUrl}/r/registry.json. También puedes servir los archivos public/r incluidos desde tu propio host.`,
                )}
                <a
                  href={publicPath("/r/registry.json")}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {l("Open registry manifest", "Abrir manifiesto del registro")}{" "}
                  <ArrowUpRight />
                </a>
                <Alert
                  title={l(
                    "Source, without a subscription dependency",
                    "Código sin depender de una suscripción",
                  )}
                >
                  {l(
                    "The source, public demo, registry and download bundles are open. Clone or fork the repository, self-host the kit and contribute improvements through GitHub.",
                    "El código, la demo pública, el registro y los paquetes descargables son abiertos. Clona el repositorio, crea tu fork, aloja el kit y contribuye mejoras en GitHub.",
                  )}
                </Alert>
              </>
            )}
            {section === "figma" && (
              <>
                {paragraph(
                  "The companion file contains native editable frames, semantic variables, component sets, variants and instances. Foundations, controls, blocks and suite pages are organized separately so the same visual rules can be maintained across the product.",
                  "El archivo complementario contiene frames editables, variables semánticas, conjuntos de componentes, variantes e instancias. La base visual, los controles, los bloques y las pantallas comparten las mismas reglas.",
                )}
                {paragraph(
                  "The native image ledger records content image fills and their placements separately from editable interface nodes. Whole-interface rasterization is excluded. The retained 1.2 native audit is tied to its frozen historical state; the separate native-generated-images-1.2.1 ledger records the exact new asset and placement review scope.",
                  "El ledger nativo de imágenes registra los rellenos de contenido y sus colocaciones separados de los nodos editables de interfaz. Se excluye rasterizar interfaces completas. La auditoría nativa conservada de 1.2 corresponde a su state histórico congelado; el ledger native-generated-images-1.2.1 registra el alcance exacto de la revisión nueva de imágenes y colocaciones.",
                )}
                <a
                  href={publicPath(figmaUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ size: "sm" })}
                >
                  {l("Open native Figma file", "Abrir archivo nativo de Figma")}
                  <ArrowUpRight />
                </a>
                {heading(
                  "Local Code Connect templates",
                  "Plantillas locales de Code Connect",
                )}
                {paragraph(
                  "The current .figma/code-connect directory contains .figma.ts templates that map real component IDs to source examples, preserving the 44 core families and adding recorded appearance/material sets and all six effects. The manifest records exact native properties and source hashes. Publishing to Figma is a separate account operation and has not been performed.",
                  "La carpeta actual .figma/code-connect contiene plantillas .figma.ts que vinculan IDs reales con ejemplos, conservan las 44 familias core y añaden los sets registrados de apariencia/material y los seis efectos. El manifiesto registra propiedades nativas exactas y hashes del código. Publicar en Figma es una operación independiente y no se ha realizado.",
                )}
                <Code>{`// .figma/code-connect/Button.figma.ts — abbreviated example\nimport figma from "figma";\nconst instance = figma.selectedInstance;\nconst label = instance.getString("Label#3:0");\nexport default {\n  id: "aureform-button",\n  imports: ['import { Button } from "@/components/ui/button";'],\n  example: figma.code\`<Button>{\${JSON.stringify(label)}}</Button>\`,\n  metadata: { props: { node: "3:113" } }\n};\n// The delivered file also maps styles, sizes, states and icons.`}</Code>
                {heading(
                  "Keep the handoff coherent",
                  "Mantén la entrega coherente",
                )}
                {paragraph(
                  "When changing a component, review its default, focus, disabled and error states, its long Spanish labels and its dark-mode appearance. Regenerate the coverage manifest after updating a Figma node mapping. The exact file URL and node IDs are recorded in .figma/state.json.",
                  "Al cambiar un componente, revisa sus estados inicial, de foco, deshabilitado y de error; sus textos largos en español y su apariencia oscura. Regenera la cobertura al actualizar un vínculo de Figma. La URL y los identificadores están en .figma/state.json.",
                )}
              </>
            )}
            {section === "adapters" && (
              <>
                {heading(
                  "Commerce, maps and social access",
                  "Comercio, mapas y acceso social",
                )}
                {paragraph(
                  "The commerce provider shares products, orders, invoices and subscription state within each workspace. Its default Checkout and customer portal are local mocks. Connect the supplied Stripe HTTP adapter to your own authenticated backend; secret keys, payment status and OAuth sessions belong to that backend. Google Maps is an optional, explicit connection with a restricted browser key.",
                  "El provider de comercio comparte productos, pedidos, facturas y suscripción por workspace. Checkout y portal funcionan como mocks locales. Conecta el adaptador HTTP de Stripe a tu backend autenticado; las claves secretas, los pagos y las sesiones OAuth corresponden a ese backend. Google Maps permite una conexión opcional con una clave de navegador restringida.",
                )}
                <div className="my-5 flex flex-wrap gap-2">
                  {[
                    ["products", l("Product editor", "Editor de productos")],
                    ["orders", l("Orders & Checkout", "Pedidos y Checkout")],
                    ["invoices", l("Invoices", "Facturas")],
                    [
                      "settings/billing",
                      l("Billing & portal", "Facturación y portal"),
                    ],
                    ["maps", l("Maps", "Mapas")],
                    ["auth/sign-in", l("Social login", "Login social")],
                  ].map(([path, label]) => (
                    <a
                      key={path}
                      href={publicPath(`/${locale}/${path}/`)}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      {label}
                    </a>
                  ))}
                </div>
                <a
                  href={`https://github.com/terrizoaguimor/aureform-ui/blob/main/docs/application-integrations${locale === "es" ? ".es" : ""}.md`}
                  className="text-sm font-semibold text-primary underline underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  {l(
                    "Read the integration contracts and examples",
                    "Leer los contratos y ejemplos de integración",
                  )}
                </a>
                {heading(
                  "A complete SaaS operation",
                  "Una operación SaaS completa",
                )}
                {paragraph(
                  "WorkspaceProvider connects onboarding, invitations, role previews, customer lists, notes, file metadata and saved views in the demo. Customer queries cancel obsolete requests and keep page totals in external mode. The reusable blocks receive controlled values and callbacks so you can connect your own services.",
                  "WorkspaceProvider conecta onboarding, invitaciones, vistas por rol, clientes, notas, metadatos de archivos y vistas guardadas de la demo. Las consultas de clientes cancelan solicitudes antiguas y conservan los totales en modo externo. Los bloques reciben valores y callbacks controlados para conectar tus servicios.",
                )}
                <Code>{`node bin/aureform.mjs add onboarding-flow member-management data-workbench import-wizard record-detail --cwd ../my-product --dry-run\n# Each block works with controlled props and callbacks.\n# Add workspace-provider for the complete local demo context.\nnode bin/aureform.mjs add workspace-provider --cwd ../my-product`}</Code>
                <div className="my-5 flex flex-wrap gap-2">
                  {[
                    ["onboarding", l("Onboarding", "Primeros pasos")],
                    [
                      "settings/workspace",
                      l("Workspace settings", "Configurar espacio"),
                    ],
                    [
                      "settings/team",
                      l("Members & invitations", "Miembros e invitaciones"),
                    ],
                    ["imports", l("CSV import", "Importar CSV")],
                    [
                      "customers",
                      l("Customer workbench", "Gestión de clientes"),
                    ],
                  ].map(([path, label]) => (
                    <a
                      key={path}
                      href={publicPath(`/${locale}/${path}/`)}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      {label}
                    </a>
                  ))}
                </div>
                {paragraph(
                  "Every interactive screen uses deterministic sample data and browser persistence. There is no production backend in this source kit. The separation between interface and adapter gives your product a clear integration point.",
                  "Cada pantalla interactiva usa datos de ejemplo y persistencia en el navegador. El kit no incluye un servidor de producción. La separación entre interfaz y adaptador facilita conectar los servicios de tu producto.",
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{l("Boundary", "Interfaz")}</TableHead>
                      <TableHead>
                        {l("Current behavior", "Comportamiento actual")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      [
                        "commerce-provider.tsx",
                        l(
                          "Workspace-scoped catalog, orders, invoices and subscription; idempotent mock payments.",
                          "Catálogo, pedidos, facturas y suscripción por workspace; pagos mock idempotentes.",
                        ),
                      ],
                      [
                        "lib/stripe-commerce-adapter.ts",
                        l(
                          "Typed same-origin backend transport for catalog sync, Checkout, invoices and customer portal.",
                          "Transporte tipado al backend del mismo origen para catálogo, Checkout, facturas y portal.",
                        ),
                      ],
                      [
                        "lib/demo-auth.ts",
                        l(
                          "Google, GitHub and Microsoft mock profiles with replaceable client callbacks.",
                          "Perfiles mock de Google, GitHub y Microsoft con callbacks sustituibles.",
                        ),
                      ],
                      [
                        "workspace-provider.tsx",
                        l(
                          "Validated workspace snapshots; scoped customers, members, notes, views and attachment metadata.",
                          "Snapshots validados; clientes, miembros, notas, vistas y metadatos de adjuntos separados por espacio.",
                        ),
                      ],
                      [
                        "demo/customer-adapter.ts",
                        l(
                          "Controlled queries, AND filters, sorting, page totals and AbortSignal.",
                          "Consultas controladas, filtros AND, orden, totales de página y AbortSignal.",
                        ),
                      ],
                      [
                        "lib/csv-import.ts",
                        l(
                          "CSV parsing, typed field mapping, duplicates and validated callback results.",
                          "Lectura de CSV, mapeo tipado, duplicados y validación de resultados del callback.",
                        ),
                      ],
                      [
                        "use-demo-store.ts",
                        l(
                          "LocalStorage: CRUD, settings, boards, messages",
                          "LocalStorage: registros, configuración, tableros y mensajes",
                        ),
                      ],
                      [
                        "demo/ai-adapter.ts",
                        l(
                          "Async text generator with abort and simulated errors",
                          "Generador asíncrono de texto, cancelación y errores simulados",
                        ),
                      ],
                      [
                        "demo/file-adapter.ts",
                        l(
                          "IndexedDB blobs and local downloads",
                          "Archivos en IndexedDB y descargas locales",
                        ),
                      ],
                      [
                        "demo/visual-adapter.ts",
                        l(
                          "Prepared original SVG/video previews",
                          "Vistas previas SVG y video originales preparadas",
                        ),
                      ],
                      [
                        "auth.tsx",
                        l(
                          "Local form validation; no real identity session",
                          "Validación de formularios; sin sesión de identidad real",
                        ),
                      ],
                      [
                        "lib/google-maps.ts",
                        l(
                          "Local GeoJSON by default; opt-in Google Maps SDK with an in-memory browser key.",
                          "GeoJSON local por defecto; SDK de Google Maps opcional con clave de navegador en memoria.",
                        ),
                      ],
                    ].map(([file, description]) => (
                      <TableRow key={file}>
                        <TableCell className="font-mono text-[10px]">
                          {file}
                        </TableCell>
                        <TableCell>{description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {heading(
                  "Stream through your own server",
                  "Transmite desde tu servidor",
                )}
                <Code>{`type AssistantRequest = {\n  prompt: string;\n  model: string;\n  signal: AbortSignal;\n};\n// Keep credentials on the server.\n// Replace the demo generator with an authenticated endpoint.\n// Preserve pending, cancellation, retry and error states.`}</Code>
                {paragraph(
                  "The demonstration verification code is 123456. API keys are inert strings prefixed af_demo_. Email actions remain local. Billing buttons update illustrative settings; they charge nothing. Resetting the demo clears Aureform records and local uploaded files.",
                  "El código de verificación de ejemplo es 123456. Las claves API son cadenas inertes con prefijo af_demo_. Los correos permanecen locales. Los botones de facturación cambian datos ilustrativos sin realizar cobros. Restablecer la demo borra los registros de Aureform y los archivos locales.",
                )}
              </>
            )}
            {section === "accessibility" && (
              <>
                {paragraph(
                  "Interactive primitives use Base UI. Native inputs, visible labels, keyboard actions, focus rings, dialog focus management and accessible chart data alternatives form the baseline. Tests supplement manual review; they do not certify every future application built from the kit.",
                  "Los controles interactivos usan Base UI. Entradas nativas, etiquetas visibles, teclado, foco visible, manejo del foco en diálogos y tablas alternativas para los gráficos definen la base. Las pruebas complementan la revisión manual.",
                )}
                {heading(
                  "Verify the important paths",
                  "Verifica los flujos principales",
                )}
                <Code>{`pnpm typecheck\npnpm lint\npnpm test\npnpm build\npnpm test:e2e\n# See docs/verification.md for the actual recorded results.`}</Code>
                {paragraph(
                  "Check both languages and themes, 360 / 768 / 1440 px widths, long strings, 200% zoom, reduced motion and keyboard-only navigation. Charts offer a data table. Maps have a schematic fallback. Carousels use manual controls. Video has descriptive captions.",
                  "Revisa ambos idiomas y temas, anchos de 360 / 768 / 1440 px, textos largos, zoom al 200 %, movimiento reducido y navegación con teclado. Los gráficos ofrecen una tabla; los mapas una alternativa esquemática; los carruseles controles manuales y el video subtítulos descriptivos.",
                )}
                {heading("Customize with care", "Personaliza con cuidado")}
                {paragraph(
                  "Keep one clear page heading, preserve field label relationships and announce pending or error states. Provide meaningful image descriptions and control labels. A color-only distinction needs an accompanying text or icon. Recheck contrast after changing tokens.",
                  "Mantén un encabezado principal claro, conserva la relación entre campos y etiquetas y anuncia los estados de espera o error. Incluye descripciones útiles para imágenes y controles. Acompaña las diferencias de color con texto o iconos. Revisa el contraste después de cambiar los tokens.",
                )}
              </>
            )}
            {section === "license" && (
              <>
                <Alert
                  title={l(
                    "Open source · Apache 2.0",
                    "Código abierto · Apache 2.0",
                  )}
                >
                  {l(
                    "The complete Aureform UI source is available to everyone. There are no paid kit tiers, developer-seat limits or activation keys.",
                    "Todo el código de Aureform UI está disponible para cualquier persona. No hay niveles de pago del kit, límites por desarrollador ni claves de activación.",
                  )}
                </Alert>
                {heading(
                  "Build, adapt and share",
                  "Construye, adapta y comparte",
                )}
                {paragraph(
                  "Apache 2.0 permits use, modification and redistribution, including in commercial products. Preserve the required license, copyright and attribution notices, identify modified files, and include applicable NOTICE information when distributing your work.",
                  "Apache 2.0 permite usar, modificar y redistribuir el proyecto, incluso en productos comerciales. Conserva la licencia, los avisos de autoría y atribución requeridos, identifica los archivos modificados e incluye la información de NOTICE que corresponda al distribuir tu trabajo.",
                )}
                {paragraph(
                  "Read the full license and NOTICE in the repository. Third-party libraries, fonts and other attributed resources retain their own licenses, listed in THIRD_PARTY_NOTICES.md. Apache 2.0 does not grant trademark rights, and the project is provided without warranty.",
                  "Lee la licencia completa y NOTICE en el repositorio. Las bibliotecas, fuentes y otros recursos atribuidos conservan sus licencias, enumeradas en THIRD_PARTY_NOTICES.md. Apache 2.0 no concede derechos de marca y el proyecto se entrega sin garantía.",
                )}
                <div className="my-5 flex flex-wrap gap-3">
                  <a
                    href={githubUrl}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    {l("Explore the repository", "Explorar el repositorio")}{" "}
                    <ArrowUpRight />
                  </a>
                  <a
                    href={`${releaseDownloadUrl}/aureform-ui-source.zip`}
                    download
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <Download />{" "}
                    {l(
                      "Download the complete source",
                      "Descargar todo el código",
                    )}
                  </a>
                </div>
                {heading(
                  "A shared starting point",
                  "Un punto de partida compartido",
                )}
                {paragraph(
                  "Aureform combines warm light with the craft of shaping interfaces. Make it your own: use the components, remix the appearance, improve the documentation or contribute a new pattern. GitHub issues and pull requests are the place to collaborate.",
                  "Aureform une la luz cálida con el oficio de dar forma a las interfaces. Hazlo tuyo: usa los componentes, cambia la apariencia, mejora la documentación o aporta un nuevo patrón. Colabora mediante issues y pull requests en GitHub.",
                )}
              </>
            )}
            {section === "roadmap" && (
              <>
                <div className="mb-6 grid grid-cols-3 gap-3">
                  {[
                    [routes.length, l("Suite routes", "Rutas de suite")],
                    [componentFamilies.length, l("Families", "Familias")],
                    [2, l("Languages", "Idiomas")],
                  ].map(([value, label]) => (
                    <div
                      key={String(label)}
                      className="rounded-lg bg-surface-subtle p-4"
                    >
                      <p className="text-2xl font-semibold">{value}</p>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                {paragraph(
                  `This ${kitVersion} source release has ${routes.length} suite routes plus the landing, ${routes.length + 1} views in total. The original delivery stages remain suite categories; every listed route is included. These categories describe frontend coverage, not backend integrations or separate npm releases.`,
                  `Esta entrega ${kitVersion} tiene ${routes.length} rutas de suite más la landing: ${routes.length + 1} vistas en total. Las etapas originales siguen siendo categorías de la suite; todas las rutas enumeradas están incluidas. Representan cobertura de interfaces, no integraciones de servidor ni versiones separadas en npm.`,
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Suite</TableHead>
                      <TableHead>
                        {l("Included scope", "Alcance incluido")}
                      </TableHead>
                      <TableHead>{l("Routes", "Rutas")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      [
                        "1.0",
                        l(
                          "Foundations, SaaS, analytics, AI, auth, settings, docs",
                          "Base visual, SaaS, analítica, IA, identidad, configuración y guías",
                        ),
                      ],
                      [
                        "1.1",
                        l(
                          "CRM, commerce, pipeline, customers and financial records",
                          "CRM, comercio, embudo, clientes y registros financieros",
                        ),
                      ],
                      [
                        "1.2",
                        l(
                          "Calendar, boards, mail, chat, files, support and maps",
                          "Calendario, tableros, correo, chat, archivos, soporte y mapas",
                        ),
                      ],
                      [
                        "1.3",
                        l(
                          "Finance, stocks, studios, six shells, charts and media",
                          "Finanzas, acciones, estudios, seis estructuras, gráficos y medios",
                        ),
                      ],
                      [
                        "1.4",
                        l(
                          "Product and image editors, connected commerce, maps and social-auth mocks",
                          "Editores de productos e imágenes, comercio conectado, mapas y acceso social mock",
                        ),
                      ],
                    ].map(([version, description]) => (
                      <TableRow key={version}>
                        <TableCell>
                          <Badge variant="outline">{version}</Badge>
                        </TableCell>
                        <TableCell>{description}</TableCell>
                        <TableCell>
                          {
                            routes.filter((route) => route.delivery === version)
                              .length
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {heading("Traceable source", "Código trazable")}
                {paragraph(
                  "docs/coverage.json and the downloadable manifest map route paths, source files, component families and actual Figma node IDs. They also identify local-only adapters and the reference categories examined without copying proprietary source.",
                  "docs/coverage.json y el manifiesto descargable relacionan rutas, archivos, familias de componentes e identificadores reales de Figma. También identifican los adaptadores locales y las categorías de referencia examinadas sin copiar código propietario.",
                )}
                <a
                  href={publicPath("/coverage.json")}
                  download
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Download />
                  {l(
                    "Download coverage manifest",
                    "Descargar manifiesto de cobertura",
                  )}
                </a>
              </>
            )}
          </article>
        </Card>
      </div>
    </div>
  );
}
