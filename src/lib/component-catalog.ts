import { componentFamilies } from "@/lib/catalog";
export type ComponentFamily = (typeof componentFamilies)[number];
export type ComponentCategory =
  | "actions"
  | "navigation"
  | "forms"
  | "data"
  | "feedback"
  | "overlays"
  | "media";
const categories: Record<ComponentCategory, ComponentFamily[]> = {
  actions: ["Button", "ButtonGroup", "TextLink"],
  navigation: ["Breadcrumb", "Pagination", "Tabs", "Sidebar", "Command"],
  forms: [
    "Input",
    "Field",
    "Textarea",
    "Select",
    "Combobox",
    "MultiSelect",
    "Checkbox",
    "RadioGroup",
    "Switch",
    "Slider",
    "DatePicker",
    "DateRangePicker",
    "InputOTP",
    "FileUpload",
  ],
  data: ["Card", "Avatar", "Badge", "Table", "DataTable", "Chart"],
  feedback: ["Alert", "Toast", "Progress", "Spinner", "Skeleton", "Empty"],
  overlays: [
    "Tooltip",
    "Popover",
    "Dialog",
    "Drawer",
    "DropdownMenu",
    "Accordion",
  ],
  media: ["Carousel", "Gallery", "VideoPlayer", "Ribbon"],
};
const files: Partial<Record<ComponentFamily, string>> = {
  TextLink: "link",
  DateRangePicker: "date-picker",
};
const descriptions: Record<ComponentFamily, [string, string]> = {
  Button: [
    "Six styles, five sizes, focus and loading states.",
    "Seis estilos, cinco tamaños y estados de foco y carga.",
  ],
  ButtonGroup: [
    "A shared container for related actions.",
    "Un contenedor para acciones relacionadas.",
  ],
  TextLink: [
    "A text action with a consistent focus treatment.",
    "Una acción de texto con foco coherente.",
  ],
  Breadcrumb: [
    "A labelled navigation trail with current-page semantics.",
    "Un recorrido de navegación con semántica de página actual.",
  ],
  Pagination: [
    "Controlled pages with previous and next actions.",
    "Páginas controladas con acciones anterior y siguiente.",
  ],
  Tabs: [
    "Keyboard-aware tabs built on Base UI.",
    "Pestañas accesibles por teclado con Base UI.",
  ],
  Sidebar: [
    "Composable navigation groups and responsive shell support.",
    "Grupos de navegación componibles y layouts adaptables.",
  ],
  Command: [
    "Searchable grouped actions in a focus-managed dialog.",
    "Acciones agrupadas y buscables en un diálogo con control de foco.",
  ],
  Input: [
    "A native input with semantic focus and invalid states.",
    "Un campo nativo con estados semánticos de foco y error.",
  ],
  Field: [
    "A linked label, description and error message.",
    "Etiqueta, descripción y mensaje de error vinculados.",
  ],
  Textarea: [
    "Multiline input with a consistent visual vocabulary.",
    "Campo de varias líneas con un lenguaje visual coherente.",
  ],
  Select: [
    "Controlled selection with popup keyboard navigation.",
    "Selección controlada con navegación por teclado.",
  ],
  Combobox: [
    "A searchable single-select control.",
    "Un control de selección con búsqueda.",
  ],
  MultiSelect: [
    "Search, select and remove multiple values.",
    "Busca, selecciona y elimina varios valores.",
  ],
  Checkbox: [
    "Checked, unchecked, mixed and disabled states.",
    "Estados marcado, vacío, mixto y deshabilitado.",
  ],
  RadioGroup: [
    "One choice from a clearly labelled set.",
    "Una elección entre opciones claramente etiquetadas.",
  ],
  Switch: [
    "A controlled on/off setting.",
    "Un ajuste controlado de activación.",
  ],
  Slider: [
    "Pointer and keyboard control for a numeric value.",
    "Control numérico con mouse y teclado.",
  ],
  DatePicker: [
    "A localized single-date calendar popup.",
    "Un calendario localizado para elegir una fecha.",
  ],
  DateRangePicker: [
    "A localized from/to date selection.",
    "Selección localizada de fecha inicial y final.",
  ],
  InputOTP: [
    "A single accessible input with visual digit slots.",
    "Un campo accesible con casillas visuales para dígitos.",
  ],
  FileUpload: [
    "Browse or drop files with size and MIME checks.",
    "Elige o arrastra archivos con validación de tamaño y tipo.",
  ],
  Card: [
    "Composable header, content and footer sections.",
    "Secciones componibles de cabecera, contenido y pie.",
  ],
  Avatar: [
    "Generated portraits, initials fallback and three sizes.",
    "Retratos generados, iniciales de reserva y tres tamaños.",
  ],
  Badge: [
    "Five semantic tones for status and metadata.",
    "Cinco tonos semánticos para estados y metadatos.",
  ],
  Table: [
    "Native table elements in a scroll-safe wrapper.",
    "Elementos de tabla nativos en un contenedor desplazable.",
  ],
  DataTable: [
    "Typed sorting, filtering, selection and pagination.",
    "Ordenación, filtros, selección y paginación con tipos.",
  ],
  Chart: [
    "Six chart types with accessible data-table alternatives.",
    "Seis tipos de gráfico con tablas de datos accesibles.",
  ],
  Alert: [
    "Four semantic tones with alert announcements.",
    "Cuatro tonos semánticos y anuncios accesibles.",
  ],
  Toast: [
    "Non-blocking feedback with Sonner.",
    "Mensajes de estado con Sonner.",
  ],
  Tooltip: [
    "Contextual help with pointer and keyboard access.",
    "Ayuda contextual con acceso por mouse y teclado.",
  ],
  Popover: [
    "A positioned surface for contextual controls.",
    "Una superficie posicionada para controles contextuales.",
  ],
  Dialog: [
    "Modal content with a title, description and focus trap.",
    "Contenido modal con título, descripción y control de foco.",
  ],
  Drawer: [
    "A side sheet with the same focus contract as Dialog.",
    "Un panel lateral con el mismo control de foco del diálogo.",
  ],
  DropdownMenu: [
    "Keyboard-aware actions, groups and separators.",
    "Acciones, grupos y separadores accesibles por teclado.",
  ],
  Progress: [
    "A labelled, clamped determinate progress indicator.",
    "Un indicador de progreso etiquetado y acotado.",
  ],
  Spinner: [
    "A loading indicator with an accessible label.",
    "Un indicador de carga con etiqueta accesible.",
  ],
  Skeleton: [
    "Reduced-motion-friendly loading shapes.",
    "Formas de carga que respetan el movimiento reducido.",
  ],
  Empty: [
    "A clear empty state with an optional next action.",
    "Un estado vacío claro con una acción opcional.",
  ],
  Accordion: [
    "Expandable sections built on Base UI.",
    "Secciones desplegables con Base UI.",
  ],
  Carousel: [
    "Generated images with manual navigation and labelled controls.",
    "Imágenes generadas con navegación manual y controles etiquetados.",
  ],
  Gallery: [
    "Generated images in a responsive grid with a focus-managed lightbox.",
    "Imágenes generadas en una galería adaptable con vista ampliada y control de foco.",
  ],
  VideoPlayer: [
    "Playback, seeking, mute, captions and fullscreen.",
    "Reproducción, posición, silencio, subtítulos y pantalla completa.",
  ],
  Ribbon: [
    "A compact accent for highlights and releases.",
    "Un acento compacto para novedades y destacados.",
  ],
};
export const componentCatalog = componentFamilies.map((name) => ({
  name,
  category: Object.entries(categories).find(([, names]) =>
    names.includes(name),
  )![0] as ComponentCategory,
  file:
    files[name] ?? name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
  description: descriptions[name],
}));
export const categoryLabels: Record<ComponentCategory, [string, string]> = {
  actions: ["Actions", "Acciones"],
  navigation: ["Navigation", "Navegación"],
  forms: ["Form controls", "Formularios"],
  data: ["Data & structure", "Datos y estructura"],
  feedback: ["Feedback", "Mensajes y estados"],
  overlays: ["Overlays", "Capas y paneles"],
  media: ["Media", "Medios"],
};
export const codeExamples: Record<ComponentFamily, string> = {
  Button:
    '<Button variant="outline" size="sm" loading={pending} onClick={save}>Save changes</Button>',
  ButtonGroup:
    '<ButtonGroup aria-label="View"><Button variant="outline">Grid</Button><Button variant="outline">List</Button></ButtonGroup>',
  TextLink: '<TextLink href="/en/docs/">Read the documentation</TextLink>',
  Breadcrumb:
    '<Breadcrumb items={[{label:"Workspace",href:"/en/dashboard/"},{label:"Customers"}]} />',
  Pagination:
    '<Pagination page={page} count={8} onPageChange={setPage} label="Pages" />',
  Tabs: '<Tabs defaultValue="overview"><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger></TabsList><TabsContent value="overview">Overview content</TabsContent><TabsContent value="details">Details content</TabsContent></Tabs>',
  Sidebar:
    '<Sidebar brand={<Brand />} label="Main navigation" groups={[{label:"Workspace",items:[{label:"Overview",href:"/en/dashboard/",active:true}]}]} />',
  Command:
    '<Command open={open} onOpenChange={setOpen} label="Search" placeholder="Search actions…" emptyLabel="No results" items={[{id:"save",label:"Save",onSelect:save}]} />',
  Input:
    '<Input aria-label="Email" type="email" placeholder="you@company.com" />',
  Field:
    '<Field label="Email" description="We only use this locally." error={errors.email?.message}><Input {...register("email")} /></Field>',
  Textarea:
    '<Textarea aria-label="Description" maxLength={400} placeholder="A little about your idea…" />',
  Select:
    '<Select label="Plan" options={[{value:"pro",label:"Pro"},{value:"starter",label:"Starter"}]} value={plan} onValueChange={setPlan} />',
  Combobox:
    '<Combobox label="Framework" options={options} value={framework} onValueChange={setFramework} emptyLabel="No matches" />',
  MultiSelect:
    '<MultiSelect label="Tools" options={options} value={tools} onValueChange={setTools} />',
  Checkbox:
    '<label className="flex items-center gap-2"><Checkbox checked={accepted} onCheckedChange={setAccepted} />Accept the terms</label>',
  RadioGroup:
    '<RadioGroup aria-label="Plan" value={plan} onValueChange={setPlan}><label><RadioGroupItem value="starter" /> Starter</label><label><RadioGroupItem value="pro" /> Pro</label></RadioGroup>',
  Switch:
    '<Switch aria-label="Weekly summary" checked={enabled} onCheckedChange={setEnabled} />',
  Slider:
    '<Slider label="Intensity" value={value} onValueChange={setValue} min={0} max={100} />',
  DatePicker:
    '<DatePicker value={date} onChange={setDate} label="Choose date" locale="en" />',
  DateRangePicker:
    '<DateRangePicker value={range} onChange={setRange} label="Choose range" locale="en" />',
  InputOTP:
    '<InputOTP value={code} onChange={setCode} label="Verification code" length={6} />',
  FileUpload:
    '<FileUpload files={files} onFilesChange={setFiles} accept="image/*,.pdf" maxBytes={10*1024*1024} labels={uploadLabels} />',
  Card: "<Card><CardHeader><CardTitle>A little clarity.</CardTitle><CardDescription>Your next good idea.</CardDescription></CardHeader><CardContent>Content</CardContent><CardFooter>Footer</CardFooter></Card>",
  Avatar:
    '<div className="flex items-center gap-3"><Avatar name="Alex Morgan" src="/assets/avatars/alex-morgan.svg" size="sm" /><Avatar name="Isabel Torres" size="sm" /></div>',
  Badge: '<Badge variant="warning">In progress</Badge>',
  Table:
    "<Table><TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Price</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Pro</TableCell><TableCell>$249</TableCell></TableRow></TableBody></Table>",
  DataTable:
    "<DataTable<Customer> data={customers} columns={columns} pageSize={5} labels={tableLabels} selectable />",
  Chart:
    '<Chart kind="line" label="Revenue by month" valueLabel="Revenue" data={[{label:"May",value:28000},{label:"June",value:34000}]} />',
  Alert:
    '<Alert title="Changes saved" variant="success">Your workspace is up to date.</Alert>',
  Toast:
    'toast.success("Changes saved", {description:"Your workspace is up to date."});',
  Tooltip:
    '<Tooltip content="More information"><Button variant="outline" aria-label="Information">?</Button></Tooltip>',
  Popover:
    '<Popover><PopoverTrigger render={<Button variant="outline" />}>Details</PopoverTrigger><PopoverContent><PopoverTitle>Details</PopoverTitle><PopoverDescription>Contextual content.</PopoverDescription></PopoverContent></Popover>',
  Dialog:
    "<Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button />}>Open</DialogTrigger><DialogContent><DialogTitle>A considered choice</DialogTitle><DialogDescription>Choose what comes next.</DialogDescription></DialogContent></Dialog>",
  Drawer:
    "<Drawer open={open} onOpenChange={setOpen}><DrawerTrigger render={<Button />}>Open</DrawerTrigger><DrawerContent><DrawerTitle>Details</DrawerTitle><DrawerDescription>A little more context.</DrawerDescription></DrawerContent></Drawer>",
  DropdownMenu:
    '<DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" />}>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={edit}>Edit</DropdownMenuItem></DropdownMenuContent></DropdownMenu>',
  Progress: '<Progress value={64} label="Project progress" />',
  Spinner: '<Spinner label="Loading…" />',
  Skeleton: '<Skeleton className="h-5 w-40" />',
  Empty:
    '<Empty title="A little quiet here." description="Start with something new." action={<Button onClick={create}>Create</Button>} />',
  Accordion:
    '<Accordion><AccordionItem value="details"><AccordionTrigger>What’s included?</AccordionTrigger><AccordionContent>Source, tokens and examples.</AccordionContent></AccordionItem></Accordion>',
  Carousel:
    '<Carousel label="Generated art collection" items={[<img key="arc" src={publicPath("/assets/art/arc.svg")} alt="A terracotta arch and amber glass sphere with sweeping shadows" width={1200} height={800} />]} />',
  Gallery:
    '<Gallery label="Generated art collection" images={[{src:"/assets/art/arc.svg",alt:"A terracotta arch and amber glass sphere with sweeping shadows",caption:"Arc"}]} />',
  VideoPlayer:
    '<VideoPlayer src="/clip.mp4" poster="/poster.svg" captionSrc="/captions.vtt" label="Product introduction" />',
  Ribbon: '<Ribbon variant="subtle">A new possibility</Ribbon>',
};
