from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
FIGMA = ROOT / ".figma"
OUT = FIGMA / "code-connect"
ADDITIONS_FILE = OUT / "native-additions.json"
NATIVE_EFFECTS_FILE = FIGMA / "native-effects-library-1.1.json"
LEDGER = json.loads((FIGMA / "component-properties.json").read_text())
STATE = json.loads((FIGMA / "state.json").read_text())
KEY = LEDGER["fileKey"]
assert KEY == STATE["fileKey"]
VERSION = json.loads((ROOT / "package.json").read_text())["version"]
ADDITIONS = json.loads(ADDITIONS_FILE.read_text()) if ADDITIONS_FILE.exists() else {"fileKey": KEY, "components": {}}
NATIVE_EFFECTS = json.loads(NATIVE_EFFECTS_FILE.read_text()) if NATIVE_EFFECTS_FILE.exists() else {"families": {}}
assert ADDITIONS["fileKey"] == KEY, "Native additions must belong to the authoritative Figma file."
OUT.mkdir(parents=True, exist_ok=True)
CATALOG = (ROOT / "src/lib/catalog.ts").read_text()
CORE = re.findall(r'"([^"]+)"', CATALOG.split("export const componentFamilies = [")[1].split("] as const;")[0])
assert len(CORE) == 44
entries = []
pending_native = []


def source_options(source, type_name):
    text = (ROOT / source).read_text()
    match = re.search(rf"export type {re.escape(type_name)}\s*=\s*([^;]+);", text)
    assert match, f"Missing source type {source}:{type_name}"
    values = re.findall(r'"([^"]+)"', match.group(1))
    assert values, f"Expected a string union in {source}:{type_name}"
    return values


APPEARANCE_CONTRACTS = {
    name: {
        "source": f"src/components/ui/{name.lower()}.tsx",
        "export": name,
        "property": "appearance",
        "type": f"{name}Appearance",
        "options": source_options(f"src/components/ui/{name.lower()}.tsx", f"{name}Appearance"),
    }
    for name in ["Button", "Badge", "Card"]
}
SHAPE_CONTRACT = {
    "source": "src/components/ui/button.tsx",
    "export": "Button",
    "property": "shape",
    "type": "ButtonShape",
    "options": source_options("src/components/ui/button.tsx", "ButtonShape"),
    "sizeMapping": {"Small": "sm", "Medium": "default", "Large": "lg"},
}
TABLE_CONTRACTS = [
    {
        "source": f"src/components/ui/{file}.tsx",
        "export": export,
        "propsType": f"{export}Props",
        "properties": [
            {
                "source": "src/components/ui/table.tsx",
                "export": export,
                "property": prop,
                "type": type_name,
                "options": source_options("src/components/ui/table.tsx", type_name),
            }
            for prop, type_name in [("appearance", "TableAppearance"), ("density", "TableDensity")]
        ],
    }
    for export, file in [("Table", "table"), ("DataTable", "data-table")]
]
EFFECT_EXPORTS = dict(re.findall(
    r"export\s*\{\s*(\w+),[\s\S]*?\}\s*from\s*\"\./([^\"]+)\";",
    (ROOT / "src/components/effects/index.ts").read_text(),
))
assert len(EFFECT_EXPORTS) == 6, "The approved effects index must expose six reusable effects."
CHART_SOURCE = "src/components/ui/chart.tsx"
CHART_CONTRACT = {
    "source": CHART_SOURCE,
    "export": "Chart",
    "property": "kind",
    "type": "ChartKind",
    "options": source_options(CHART_SOURCE, "ChartKind"),
    "dataType": "ChartDatum",
    "supportsTertiary": bool(re.search(r"\btertiary\s*\?\s*:\s*number\b", (ROOT / CHART_SOURCE).read_text())),
    "booleanMappings": [
        {"property": "legend", "type": "boolean", "nativeFields": ["legend"]},
        {"property": "appearance", "type": "ChartAppearance", "nativeFields": ["glow"],
         "options": source_options(CHART_SOURCE, "ChartAppearance"), "trueValue": "glow", "falseValue": "flat"},
        {"property": "visibleSeries", "type": "ChartSeries[]", "nativeFields": ["series1", "series2", "series3"],
         "itemType": "ChartSeries", "options": source_options(CHART_SOURCE, "ChartSeries")},
    ],
}


def native_chart_kind(value):
    if value == "Donut":
        return "pie"
    normalized = re.sub(r"[^a-z0-9]", "", value.lower())
    matches = [option for option in CHART_CONTRACT["options"] if re.sub(r"[^a-z0-9]", "", option.lower()) == normalized]
    assert len(matches) == 1, f"Native Chart Kind {value!r} has no unique declared source correspondence."
    return matches[0]


def j(value):
    return json.dumps(value, ensure_ascii=False)


def kebab(value):
    value = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1-\2", value)
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", value).lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


class Template:
    def __init__(self, name, source=None, export=None, kind="core", props=None, node=None, filename=None):
        self.name = name
        self.props = props if props is not None else ADDITIONS.get("components", {}).get(name, LEDGER["components"].get(name, {}))
        self.node = node or self.props.get("setId") or self.props.get("defaultId")
        assert self.node
        file = {"TextLink": "link", "DateRangePicker": "date-picker"}.get(name, kebab(name))
        self.source = source or f"src/components/ui/{file}.tsx"
        self.export = export or name
        self.kind = kind
        self.filename = filename or f"{name}.figma.ts"
        self.id = f"aureform-{kebab(name).replace(' / ', '-').replace(' & ', '-')}"
        self.axes = self.props.get("axes", {})
        self.axis_maps = {axis: {v: v for v in values} for axis, values in self.axes.items()}
        self.axis_vars = {axis: {"Style": "variant", "Tone": "tone"}.get(axis, axis[0].lower() + axis[1:]) for axis in self.axes}
        self.prelude = []
        self.base_imports = []
        self.mapped = []
        self.visual = []
        self.read_vars = {}
        self.extra_meta = {}
        self.notes = []
        self.source_properties = []
        self.nestable = True
        self.nested = False

    def imp(self, exports, module=None, type_only=False):
        module = module or self.source.replace("src/", "@/").removesuffix(".tsx")
        line = f'import {"type " if type_only else ""}{{ {exports} }} from "{module}";'
        if line not in self.base_imports:
            self.base_imports.append(line)
        return self

    def axis(self, axis, mapping=None, target=None):
        assert axis in self.axes, (self.name, axis)
        if mapping is not None:
            assert set(mapping) == set(self.axes[axis]), (self.name, axis, mapping)
            self.axis_maps[axis] = mapping
        if target:
            self.mapped.append({"property": axis, "type": "VARIANT", "codeTarget": target, "options": self.axis_maps[axis]})
        return self.axis_vars[axis]

    def read(self, key, target=None, var=None):
        assert key in self.props, (self.name, key)
        var = var or key
        prop = self.props[key]
        assert isinstance(prop, str) and "#" in prop
        self.prelude.append(f"const {var} = instance.getString({j(prop)});")
        self.read_vars[prop] = var
        if target:
            self.mapped.append({"property": prop, "type": "TEXT", "codeTarget": target})
        return var

    def boolean(self, key, target, var=None):
        assert key in self.props
        var = var or key
        prop = self.props[key]
        self.prelude.append(f"const {var} = instance.getBoolean({j(prop)});")
        self.read_vars[prop] = var
        self.mapped.append({"property": prop, "type": "BOOLEAN", "codeTarget": target})
        return var

    def appearance(self):
        contract = APPEARANCE_CONTRACTS[self.export]
        mapped = "Appearance" in self.axes
        self.source_properties.append({
            **contract,
            "nativeProperty": "Appearance" if mapped else None,
            "status": "mapped-native-axis" if mapped else "unreported-on-this-native-node",
        })
        if not mapped:
            self.notes.append(f"The source supports appearance: {contract['type']}. No Appearance axis is recorded for this native node, so no native property or appearance value is invented.")
            return ""
        mapping = {value: value.lower() for value in self.axes["Appearance"]}
        assert set(mapping.values()) <= set(contract["options"]), (self.name, "Unsupported source appearance", mapping)
        self.axis("Appearance", mapping, "appearance")
        return ' appearance="${appearance}"'

    def visual_only(self, prop, reason, values=None):
        self.visual.append({"property": self.props.get(prop, prop), **({"values": values} if values else {}), "reason": reason})

    def code(self, text):
        self.prelude.append(text)

    def swap(self, key, var, show_key=None):
        prop = self.props[key]
        if show_key:
            show = self.props[show_key]
            self.prelude.append(f"const show{var.title()} = instance.getBoolean({j(show)});")
            self.read_vars[show] = f"show{var.title()}"
            self.mapped.append({"property": show, "type": "BOOLEAN", "codeTarget": "conditional children"})
            access = f"show{var.title()} ? instance.getInstanceSwap({j(prop)}) : null"
        else:
            access = f"instance.getInstanceSwap({j(prop)})"
        self.prelude.extend([
            f"const {var}Instance = {access};",
            f"let {var}Code = figma.code``;",
            f"if ({var}Instance && {var}Instance.type === 'INSTANCE') {{",
            f"  const result = {var}Instance.executeTemplate();",
            f"  {var}Code = result.example;",
            "  nestedImports.push(...(result.metadata?.props?.imports ?? []));",
            "}",
        ])
        self.nested = True
        self.mapped.append({"property": prop, "type": "INSTANCE_SWAP", "codeTarget": "children" if self.export == "Button" else "icon"})
        return f"{var}Code"

    def child(self, child_id, var, layer=None, options=None):
        method = f"instance.findInstance({j(layer)}" if layer else f"instance.findConnectedInstance({j(child_id)}"
        access = method + (", " + j(options) if options else "") + ")"
        self.prelude.extend([
            f"const {var}Instance = {access};",
            f"let {var}Code = figma.code``;",
            f"if ({var}Instance && {var}Instance.type === 'INSTANCE') {{",
            f"  const result = {var}Instance.executeTemplate();",
            f"  {var}Code = result.example;",
            "  nestedImports.push(...(result.metadata?.props?.imports ?? []));",
            "}",
        ])
        self.nested = True
        return f"{var}Code"

    def children(self, ids, var="children"):
        predicate = " || ".join(f"child.codeConnectId() === {j(id)}" for id in ids)
        self.prelude.extend([
            f"const {var}Instances = instance.findConnectedInstances(child => {predicate});",
            f"let {var}Code = figma.code``;",
            f"for (const child of {var}Instances) {{",
            "  if (child && child.type === 'INSTANCE') {",
            "    const result = child.executeTemplate();",
            f"    if (result.example.length) {var}Code = figma.code`${{{var}Code}}{{${{result.example}}}}`;",
            "    nestedImports.push(...(result.metadata?.props?.imports ?? []));",
            "  }",
            "}",
        ])
        self.nested = True
        return f"{var}Code"

    def finish(self, body):
        for axis in self.axes:
            if not any(x["property"] == axis for x in self.mapped + self.visual):
                self.visual_only(axis, "Native presentation axis retained in metadata; the source component has no matching public prop.", self.axes[axis])
        definitions = [
            f"const {self.axis_vars[axis]} = instance.getEnum({j(axis)}, {j(mapping)});"
            for axis, mapping in self.axis_maps.items()
        ]
        native_values = {**{axis: var for axis, var in self.axis_vars.items()}, **self.read_vars}
        native_code = "{ " + ", ".join(f"{j(k)}: {v}" for k, v in native_values.items()) + " }"
        meta = {
            "status": "local-unpublished",
            "nativeName": self.name,
            "node": self.node,
            "source": self.source,
            "sourceExport": self.export,
            "axes": self.axes,
            "mappedProperties": self.mapped,
            "sourceProperties": self.source_properties,
            "intentionalVisualOnly": self.visual,
            "notes": self.notes,
        }
        props_code = j(meta)[:-1] + f', "imports": imports, "nativePropertyValues": {native_code}'
        for key, code in self.extra_meta.items():
            props_code += f", {j(key)}: {code}"
        props_code += "}"
        url = f"https://www.figma.com/design/{KEY}/Aureform-UI?node-id={self.node.replace(':', '-')}"
        content = "\n".join([
            f"// url={url}",
            f"// source={self.source}",
            f"// component={self.export}",
            "// Local parserless artifact. No Figma registration or publication has been performed.",
            "import figma from 'figma';",
            "const instance = figma.selectedInstance;",
            "const nestedImports: string[] = [];",
            *definitions,
            *self.prelude,
            f"const imports = [...new Set([...{j(self.base_imports)}, ...nestedImports])];",
            "export default {",
            f"  example: figma.code`{body}`,",
            f"  id: {j(self.id)},",
            "  imports,",
            f"  metadata: {{ nestable: {str(self.nestable).lower()}, props: {props_code} }},",
            "};",
            "",
        ])
        dest = OUT / self.filename
        assert dest.parent == OUT and dest.name.endswith(".figma.ts")
        dest.write_text(content)
        entries.append({
            "file": f".figma/code-connect/{self.filename}",
            "node": self.node,
            "defaultNode": self.props.get("defaultId", self.node),
            "url": url,
            "source": self.source,
            "export": self.export,
            "nativeName": self.name,
            "kind": self.kind,
            "id": self.id,
            "axes": self.axes,
            "mappedProperties": self.mapped,
            "sourceProperties": self.source_properties,
            "intentionalVisualOnly": self.visual,
            "notes": self.notes,
            "nestable": self.nestable,
            "status": "local-unpublished",
            "templateDataForFutureRegistration": {"isParserless": True, "nestable": self.nestable},
            **({
                "nativeVariants": self.props["variants"],
                "defaultAxes": {
                    axis: self.props["propertyDefinitions"][axis]["defaultValue"]
                    for axis in self.axes
                },
            } if "variants" in self.props and "propertyDefinitions" in self.props else {}),
        })


BUTTON_IDS = ["aureform-button", "aureform-button-additional-styles", "aureform-button-loading-icons"]
STYLE = {"Primary": "default", "Outline": "outline", "Ghost": "ghost", "Secondary": "secondary", "Destructive": "destructive", "Link": "link"}
for name, filename in [("Button", "Button.figma.ts"), ("Button / Additional styles", "ButtonAdditionalStyles.figma.ts")]:
    t = Template(name, "src/components/ui/button.tsx", "Button", "core" if name == "Button" else "button-extension", filename=filename).imp("Button")
    t.axis("Style", {v: STYLE[v] for v in t.axes["Style"]}, "variant")
    t.axis("Size", {"Small": "sm", "Medium": "default", "Large": "lg"}, "size")
    t.axis("State", target="disabled (Disabled); CSS pointer hover (Hover)")
    t.visual_only("State", "Hover is pointer/CSS presentation, not a force-hover source prop.", ["Hover"])
    t.read("label", "children")
    if "icon" in t.props:
        t.swap("icon", "icon", "showIcon")
        icon = "${iconCode}"
    else:
        t.children(["aureform-icon-arrow-up-right", "aureform-icon-plus"], "icons")
        icon = "${iconsCode}"
    t.finish('<Button variant="${variant}" size="${size}"' + t.appearance() + ' disabled={${state === "Disabled"}}>' + icon + '{${JSON.stringify(label)}}</Button>')

t = Template("Button / Loading & icons", "src/components/ui/button.tsx", "Button", "button-extension", filename="ButtonLoadingIcons.figma.ts").imp("Button")
t.axis("Style", STYLE, "variant")
t.axis("Kind", {"Loading": "default", "Icon": "icon", "Small icon": "icon-sm"}, "size; loading")
t.code("const loading = instance.getPropertyValue('Kind') === 'Loading';")
t.children(["aureform-icon-arrow-up-right", "aureform-icon-plus", "aureform-icon-sparkles"], "icons")
t.notes.append("Button renders its own loading spinner. Icon content is resolved dynamically and remains children; no icon prop is emitted. The accessible name is a local fixture.")
t.finish('<Button variant="${variant}" size="${kind}"' + t.appearance() + ' loading={${loading}} aria-label="Continue">${loading ? figma.code`Continue` : iconsCode}</Button>')

t = Template("Badge").imp("Badge")
t.axis("Tone", {"Success": "default", "Neutral": "neutral", "Warning": "warning", "Destructive": "destructive", "Outline": "outline"}, "variant")
t.read("label", "children")
t.finish('<Badge variant="${tone}"' + t.appearance() + '>{${JSON.stringify(label)}}</Badge>')

t = Template("Input").imp("Input")
t.read("value", "placeholder")
t.axis("State", target="disabled; aria-invalid")
t.visual_only("State", "Focus is interactive CSS presentation, not an input prop.", ["Focus"])
t.notes.append("Native Value is currently the empty input's placeholder. It is never emitted as value or defaultValue.")
t.finish('<Input aria-label="Email" type="email" placeholder={${JSON.stringify(value)}} disabled={${state === "Disabled"}} aria-invalid={${state === "Error"}} />')

t = Template("Textarea").imp("Textarea")
t.read("label", "placeholder")
t.axis("State", target="disabled; aria-invalid")
t.visual_only("State", "Focus is interactive CSS presentation.", ["Focus"])
t.notes.append("The native text is mapped as visual placeholder text. The accessible name is an independent local fixture.")
t.finish('<Textarea aria-label="Description" placeholder={${JSON.stringify(label)}} disabled={${state === "Disabled"}} aria-invalid={${state === "Error"}} />')

t = Template("Checkbox").imp("Checkbox")
t.axis("State", target="defaultChecked; indeterminate; disabled")
t.finish('<Checkbox aria-label="Select item" defaultChecked={${state === "Checked"}} indeterminate={${state === "Mixed"}} disabled={${state === "Disabled"}} />')

t = Template("Switch").imp("Switch")
t.axis("State", target="defaultChecked; disabled")
t.finish('<Switch aria-label="Weekly summary" defaultChecked={${state === "On"}} disabled={${state === "Disabled"}} />')

t = Template("RadioGroup").imp("RadioGroup, RadioGroupItem")
t.read("label", "RadioGroupItem visible children")
t.axis("State", target="disabled")
t.notes.append("Plan IDs and the second option are explicit source fixtures, not native properties.")
t.finish('<RadioGroup aria-label="Plan" defaultValue="starter" disabled={${state === "Disabled"}}><label className="flex items-center gap-2"><RadioGroupItem value="starter" />{${JSON.stringify(label)}}</label><label className="flex items-center gap-2"><RadioGroupItem value="team" />Team</label></RadioGroup>')

t = Template("Slider").imp("Slider").imp("useState", "react")
t.axis("State", target="disabled")
t.finish('''(() => {
  function SliderExample() {
    const [value, setValue] = useState(64);
    return <Slider label="Intensity" value={value} onValueChange={setValue} disabled={${state === "Disabled"}} min={0} max={100} />;
  }
  return <SliderExample />;
})()''')

t = Template("Field").imp("Field").imp("Input", "@/components/ui/input")
t.read("label", "label")
t.axis("State", target="error")
t.child("aureform-input", "control")
t.notes.append("If no connected input is available, a labelled source Input is an explicit local fixture. Field assigns its accessible relationships.")
t.finish('<Field label={${JSON.stringify(label)}} error={${state === "Error" ? \'"Enter a valid value."\': "undefined"}}>${controlCode.length ? figma.code`{${controlCode}}` : figma.code`<Input placeholder="you@company.com" />`}</Field>')

t = Template("Select").imp("Select")
t.read("label", "options[0].label")
t.axis("State", target="disabled")
t.visual_only("State", "The wrapper does not expose open/defaultOpen.", ["Open"])
t.notes.append("Native display text becomes a labelled fixture option, never an inferred domain value or accessible name.")
t.finish('<Select aria-label="Plan" options={[{ value: "native-choice", label: ${JSON.stringify(label)} }, { value: "team", label: "Team" }]} defaultValue="native-choice" disabled={${state === "Disabled"}} />')

t = Template("Combobox").imp("Combobox").imp("useState", "react")
t.read("label", "options[0].label; placeholder")
t.axis("State", target="options/value fixture (Empty); disabled")
t.visual_only("State", "Open is internal popup state with no public control prop.", ["Open"])
t.finish('''(() => {
  function ComboboxExample() {
    const [value, setValue] = useState<string | null>(${state === "Empty" ? "null" : '"native-choice"'});
    return <Combobox label="Framework" placeholder={${JSON.stringify(label)}} options={${state === "Empty" ? "[]" : figma.code`[{ value: "native-choice", label: ${JSON.stringify(label)} }, { value: "next", label: "Next.js" }]`}} value={value} onValueChange={setValue} emptyLabel="No matches" disabled={${state === "Disabled"}} />;
  }
  return <ComboboxExample />;
})()''')

t = Template("MultiSelect").imp("MultiSelect").imp("useState", "react")
t.read("label", "options[0].label; placeholder")
t.axis("State", target="value fixture for Empty/Selected/Open")
t.visual_only("State", "The source has no disabled prop and no public open prop.", ["Open", "Disabled"])
t.finish('''(() => {
  function MultiSelectExample() {
    const [values, setValues] = useState<string[]>(${state === "Empty" ? "[]" : '["native-choice"]'});
    return <MultiSelect label="Tools" placeholder={${JSON.stringify(label)}} options={[{ value: "native-choice", label: ${JSON.stringify(label)} }, { value: "next", label: "Next.js" }]} value={values} onValueChange={setValues} />;
  }
  return <MultiSelectExample />;
})()''')

for name in ["DatePicker", "DateRangePicker"]:
    t = Template(name).imp(name).imp("useState", "react")
    t.read("label")
    t.visual_only("label", "Native Label is formatted display-date text. It is not an accessible label and is not parsed as a Date or DateRange.")
    t.visual_only("State", "Popup open state is internal; the source wrapper exposes no open/defaultOpen prop.", ["Closed", "Open"])
    range_mode = name == "DateRangePicker"
    if range_mode:
        t.imp("DateRange", "react-day-picker", True)
        value_type = "DateRange | undefined"
        initial = "{ from: new Date(2026, 9, 18), to: new Date(2026, 9, 24) }"
    else:
        value_type = "Date | undefined"
        initial = "new Date(2026, 9, 18)"
    t.notes.append("The date is a declared local fixture independent of the native display string; replace it with product state.")
    t.finish(f'''(() => {{
  function {name}Example() {{
    const [value, setValue] = useState<{value_type}>({initial});
    return <{name} label="Choose {'date range' if range_mode else 'date'}" locale="en" value={{value}} onChange={{setValue}} />;
  }}
  return <{name}Example />;
}})()''')

t = Template("InputOTP").imp("InputOTP").imp("useState", "react")
t.read("label")
t.visual_only("label", "Native Label controls the first visual digit only. It must not become the accessible label or a six-digit source value.")
t.axis("State", target="declared value fixture; invalid; disabled")
t.finish('''(() => {
  function InputOTPExample() {
    const [code, setCode] = useState(${state === "Empty" || state === "Disabled" ? '""' : state === "Error" ? '"123"' : '"123456"'});
    return <InputOTP label="Verification code" length={6} value={code} onChange={setCode} invalid={${state === "Error"}} disabled={${state === "Disabled"}} />;
  }
  return <InputOTPExample />;
})()''')

t = Template("FileUpload").imp("FileUpload").imp("useState", "react")
t.read("label", "labels.title")
t.axis("State", target="files fixture for Uploaded; disabled")
t.visual_only("State", "Validation errors are internal and appear after actual file validation; no error prop exists.", ["Error"])
t.finish('''(() => {
  function FileUploadExample() {
    const [files, setFiles] = useState<File[]>(${state === "Uploaded" ? 'typeof File === "undefined" ? [] : [new File(["Local fixture"], "brief.txt", { type: "text/plain" })]' : "[]"});
    return <FileUpload files={files} onFilesChange={setFiles} accept=".txt,.pdf,image/*" disabled={${state === "Disabled"}} labels={{ title: ${JSON.stringify(label)}, description: "Drop files here or browse.", browse: "Browse files", remove: "Remove", tooLarge: "File is too large", invalidType: "Unsupported file type" }} />;
  }
  return <FileUploadExample />;
})()''')

t = Template("ButtonGroup").imp("ButtonGroup")
t.children(BUTTON_IDS)
t.visual_only("State", "Selected/Disabled belong to child buttons; ButtonGroup is a div and has no selected or disabled prop. Child templates preserve their own states.", ["Default", "Selected", "Disabled"])
t.finish('<ButtonGroup aria-label="View mode">${childrenCode}</ButtonGroup>')

t = Template("TextLink").imp("TextLink")
t.read("label", "children")
t.axis("State", target="href omission; aria-disabled; tabIndex for Disabled")
t.visual_only("State", "Hover is pointer/CSS presentation.", ["Hover"])
t.finish('''<TextLink href={${state === "Disabled" ? "undefined" : JSON.stringify("/en/docs/")}} aria-disabled={${state === "Disabled"}} tabIndex={${state === "Disabled" ? "-1" : "0"}}>{${JSON.stringify(label)}}</TextLink>''')

t = Template("Breadcrumb").imp("Breadcrumb")
t.axis("State", target="items fixture for Default/Long labels")
t.finish('<Breadcrumb label="Breadcrumb" items={[{ label: "Workspace", href: "/en/dashboard/" }, { label: ${JSON.stringify(state === "Long labels" ? "A long project name for an ambitious product" : "Customers")} }]} />')

t = Template("Pagination").imp("Pagination").imp("useState", "react")
t.axis("State", {"First": 1, "Middle": 4, "Last": 8}, "initial page fixture")
t.finish('''(() => {
  function PaginationExample() {
    const [page, setPage] = useState(${state});
    return <Pagination page={page} count={8} onPageChange={setPage} label="Pages" />;
  }
  return <PaginationExample />;
})()''')

t = Template("Tabs").imp("Tabs, TabsList, TabsTrigger, TabsContent")
t.read("label", "TabsContent paragraph children")
t.axis("State", target="defaultValue; TabsTrigger.disabled")
t.notes.append("Native Label is CONTENT paragraph text, not a tab name. Overview/Details trigger names are explicit source fixtures.")
t.finish('<Tabs defaultValue="${state === "Details" ? "details" : "overview"}"><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="details" disabled={${state === "Disabled"}}>Details</TabsTrigger></TabsList><TabsContent value="overview"><p>{${JSON.stringify(label)}}</p></TabsContent><TabsContent value="details"><p>{${JSON.stringify(label)}}</p></TabsContent></Tabs>')

t = Template("SidebarItem", "src/components/ui/sidebar.tsx", "Sidebar", "navigation-fragment").imp("SidebarLink", "@/components/ui/sidebar", True)
t.read("label", "SidebarLink.label")
t.axis("State", {"Default": False, "Active": True}, "SidebarLink.active")
t.swap("icon", "icon")
t.code('const iconProps = iconInstance && iconInstance.type === "INSTANCE" ? iconInstance.executeTemplate().metadata?.props : undefined;')
t.code("""const applicationRoutes: Record<string, string> = {
  'kanban-square': 'tasks', 'calendar-days': 'calendar', mail: 'mail',
  'folder-open': 'files', package: 'products', 'shopping-bag': 'orders',
  'credit-card': 'invoices', 'map-pin': 'maps', 'circle-help': 'support',
};
const nativeIconName = iconProps?.nativeName ?? '';
const applicationRoute = applicationRoutes[nativeIconName];
const sidebarSection = applicationRoute ? 'applications' : 'workspace';
const fixtureHref = applicationRoute ? '/en/' + applicationRoute + '/' : '/en/dashboard/';""")
t.code('const sidebarLink = figma.code`{ label: ${JSON.stringify(label)}, href: ${JSON.stringify(fixtureHref)}, active: ${state}, icon: ${iconCode.length ? figma.code`(${iconCode})` : "undefined"} }`;')
t.extra_meta["sidebarLink"] = "sidebarLink"
t.extra_meta["sidebarSection"] = "sidebarSection"
t.notes.append("SidebarItem is not an exported source component. This template emits typed SidebarLink data for the exported Sidebar. Application grouping and hrefs are declared fixtures corresponding to source shell routes, derived from executed icon metadata; they are not native href properties.")
t.finish('(${sidebarLink} satisfies SidebarLink)')

def sidebar_template(name, props=None, node=None, filename=None, kind="core"):
    t = Template(name, "src/components/ui/sidebar.tsx", "Sidebar", kind, props, node, filename).imp("Sidebar")
    if "State" in t.axes:
        t.axis("State", {"Expanded": False, "Compact": True}, "compact")
        compact = "${state}"
    else:
        compact = "false"
    if "label" in t.props:
        t.read("label", "workspace visible text")
        workspace = 'workspace={<span>{${JSON.stringify(label)}}</span>}'
        t.notes.append("The native visible Label becomes workspace text. It is not assumed to be the navigation's accessible name.")
    else:
        workspace = ""
    t.child("aureform-icon-aureform-mark", "mark")
    t.code('const links = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-sidebar-item");')
    if "applicationsOpen" in t.props:
        t.boolean("applicationsOpen", "SidebarGroup.open", "applicationsOpen")
    t.code("let itemCode = figma.code``;")
    t.code("let applicationItemCode = figma.code``;")
    t.code("""for (const child of links) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    const link = result.metadata?.props?.sidebarLink;
    if (link) {
      if (result.metadata?.props?.sidebarSection === 'applications') {
        applicationItemCode = figma.code`${applicationItemCode}${link},`;
      } else {
        itemCode = figma.code`${itemCode}${link},`;
      }
    }
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}""")
    t.notes.append("Navigation items come from dynamically executed SidebarItem metadata. No guessed icon or child component fallback is inserted; absent local connections yield an empty group.")
    applications = '${applicationsOpen}' if "applicationsOpen" in t.props else "true"
    t.finish(f'<Sidebar label="Main navigation" compact={{{compact}}} brand={{<span>${{markCode.length ? figma.code`{{${{markCode}}}}` : ""}}Aureform UI</span>}} {workspace} groups={{[{{ label: "Workspace", items: [${{itemCode}}] }}, {{ label: "Applications", collapsible: true, open: {applications}, items: [${{applicationItemCode}}] }}]}} />')

sidebar_template("Sidebar")

t = Template("Command").imp("Command").imp("CommandItem", "@/components/ui/command", True).imp("useState", "react")
t.axis("State", target="items fixture for Results/Empty")
t.finish('''(() => {
  function CommandExample() {
    const [open, setOpen] = useState(true);
    const items: CommandItem[] = ${state === "Empty" ? "[]" : figma.code`[{ id: "docs", label: "Read documentation", group: "Workspace", onSelect: () => setOpen(false) }]`};
    return <Command open={open} onOpenChange={setOpen} label="Search actions" placeholder="Search actions…" emptyLabel="No results" items={items} />;
  }
  return <CommandExample />;
})()''')

t = Template("Card").imp("Card, CardHeader, CardTitle, CardContent, CardFooter")
t.read("label", "CardTitle children")
t.children(BUTTON_IDS, "actions")
t.visual_only("State", "With actions controls composition, not a Card state prop. Source children are dynamically resolved.", ["Default", "With actions"])
t.finish('<Card' + t.appearance() + '><CardHeader><CardTitle>{${JSON.stringify(label)}}</CardTitle></CardHeader><CardContent><p>Local card content fixture.</p></CardContent>${state === "With actions" && actionsCode.length ? figma.code`<CardFooter>${actionsCode}</CardFooter>` : ""}</Card>')

t = Template("Avatar").imp("Avatar")
t.read("initials", "name fixture derived to preserve up to two initials")
t.axis("Size", {"Small": "sm", "Medium": "md", "Large": "lg"}, "size")
t.code('const fixtureName = Array.from(initials.trim()).slice(0, 2).join(" ");')
t.notes.append("Avatar has no initials prop; its name generates at most two initials. The letter-spaced synthetic name is only a preview fixture, not a person's accessible identity.")
t.finish('<Avatar name={${JSON.stringify(fixtureName)}} size="${size}" />')

def table_attributes(t):
    contract = next(item for item in TABLE_CONTRACTS if item["export"] == t.export)
    attributes = ""
    for prop in contract["properties"]:
        axis = prop["property"].title()
        mapped = axis in t.axes
        t.source_properties.append({
            **prop, "nativeProperty": axis if mapped else None,
            "status": "mapped-native-axis" if mapped else "unreported-on-this-native-node",
        })
        if mapped:
            mapping = {value: value.lower() for value in t.axes[axis]}
            assert set(mapping.values()) == set(prop["options"]), (t.name, axis, mapping)
            t.axis(axis, mapping, prop["property"])
            attributes += f' {prop["property"]}="${{{prop["property"]}}}"'
    return attributes


t = Template("Table").imp("Table, TableHeader, TableBody, TableRow, TableHead, TableCell")
t.axis("State", target="TableBody children fixture for Default/Empty")
attributes = table_attributes(t)
t.finish('<Table' + attributes + '><caption className="sr-only">Plans</caption><TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Price</TableHead></TableRow></TableHeader><TableBody>${state === "Empty" ? figma.code`<TableRow><TableCell colSpan={2}>No records</TableCell></TableRow>` : figma.code`<TableRow><TableCell>Solo</TableCell><TableCell>$149</TableCell></TableRow>`}</TableBody></Table>')

t = Template("DataTable").imp("DataTable").imp("ColumnDef", "@tanstack/react-table", True)
t.axis("State", target="data fixture for Empty; loading/error/onRetry for Loading/Error")
attributes = table_attributes(t)
t.visual_only("State", "Selection is internal source state. No initial selected-row prop exists; selectable enables real user interaction.", ["Selected"])
t.notes.append("Rows and error text are explicit local fixtures. The retry callback records the local interaction; replace it with the application's data adapter.")
t.finish('''(() => {
  type Row = { id: string; name: string };
  const rows: Row[] = ${state === "Empty" ? "[]" : '[{ id: "local-1", name: "Studio workspace" }]'};
  const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Name" }];
  return <DataTable<Row> data={rows} columns={columns}''' + attributes + ''' selectable pageSize={5} loading={${state === "Loading"}}${state === "Error" ? figma.code` error="Local data fixture could not load." onRetry={() => console.info("Connect retry to your data adapter.")}` : figma.code``} />;
})()''')

t = Template("Chart").imp("Chart")
t.read("label", "label")
for contract in CHART_CONTRACT["booleanMappings"]:
    for field in contract["nativeFields"]:
        assert t.props["propertyDefinitions"][t.props[field]]["type"] == "BOOLEAN"
        t.boolean(field, contract["property"])
    t.source_properties.append({
        "source": CHART_SOURCE, "export": "Chart", **contract,
        "nativeProperties": [t.props[field] for field in contract["nativeFields"]],
        "status": "mapped-native-properties",
    })
for field in ["dataVisibility", *[f"category{i}" for i in range(1, 7)]]:
    prop = t.props[field]
    assert t.props["propertyDefinitions"][prop]["type"] == "BOOLEAN"
    t.code(f"const {field} = instance.getBoolean({j(prop)});")
    t.read_vars[prop] = field
    t.visual.append({
        "property": prop, "type": "BOOLEAN",
        "reason": "Native presentation toggle retained in metadata. Chart has no public show-data or initial category-visibility prop; its accessible data table and category legend behavior remain source-owned.",
    })
t.code('const chartAppearance = glow ? "glow" : "flat";')
t.code('const visibleSeries = [series1 ? "value" : null, series2 ? "secondary" : null, series3 ? "tertiary" : null].filter((value) => value !== null);')
chart_mapping = {value: native_chart_kind(value) for value in t.axes["Kind"]}
t.axis("Kind", chart_mapping, "kind")
unmapped_chart_kinds = [option for option in CHART_CONTRACT["options"] if option not in chart_mapping.values()]
t.source_properties.append({
    **CHART_CONTRACT, "nativeProperty": "Kind", "status": "mapped-native-axis",
    "unmappedSourceOptions": unmapped_chart_kinds,
})
if unmapped_chart_kinds:
    pending_native.append({
        "nativeName": "Chart / Kind extensions", "source": CHART_SOURCE, "export": "Chart",
        "reason": "Source kinds need the owner's actual native Kind variants and authoritative property ledger; no variant IDs are inferred.",
        "sourceOptions": unmapped_chart_kinds,
    })
chart_data = [
    {"label": "May", "value": 28, "secondary": 24},
    {"label": "June", "value": 34, "secondary": 28},
    {"label": "July", "value": 42, "secondary": 31},
]
if CHART_CONTRACT["supportsTertiary"]:
    for row, value in zip(chart_data, [16, 20, 25]):
        row["tertiary"] = value
signed_chart_data = [{**row, "value": value} for row, value in zip(chart_data, [-12, 8, -6])]
t.code(f'const data = kind === "diverging-bar" ? {j(signed_chart_data)} : {j(chart_data)};')
t.extra_meta.update({"chartData": "data", "chartKind": "kind", "chartLabel": "label",
                     "chartLegend": "legend", "chartAppearance": "chartAppearance", "chartVisibleSeries": "visibleSeries"})
t.notes.append("Chart data is an explicit fixture, not reconstructed from plotted pixels. Native Donut maps to the source pie kind.")
t.notes.append("Show legend maps to legend; Glow maps to appearance glow/flat; Series 1–3 map to visibleSeries. Show data and Category 1–6 are visual-only, with no invented public props or data filtering.")
t.finish('<Chart kind="${kind}" label={${JSON.stringify(label)}} legend={${legend}} appearance="${chartAppearance}" visibleSeries={${JSON.stringify(visibleSeries)}} valueLabel="Revenue" secondaryLabel="Previous" tertiaryLabel="Forecast" data={${JSON.stringify(data)}} />')

t = Template("Alert").imp("Alert")
t.read("label", "title")
t.axis("State", {"Info": "info", "Success": "success", "Warning": "warning", "Destructive": "destructive"}, "variant")
t.finish('<Alert title={${JSON.stringify(label)}} variant="${state}">Local feedback detail.</Alert>')

t = Template("Toast", export="toast").imp("toast, Toaster")
t.read("label", "toast method message")
t.axis("State", {"Success": "success", "Error": "error", "Loading": "loading"}, "toast.success/error/loading")
t.nestable = False
t.notes.append("Toast is a function export, not a Toast React component. This standalone fixture mounts Toaster; omit that mount in an app already providing it.")
t.finish('<><Toaster /><button type="button" onClick={() => { toast.${state}(${JSON.stringify(label)}); }}>Show toast</button></>')

t = Template("Tooltip").imp("Tooltip, TooltipProvider")
t.visual_only("State", "Tooltip exposes content/children only. Open/Closed require pointer or keyboard interaction.", ["Open", "Closed"])
t.child("aureform-button", "trigger")
t.notes.append("Missing local trigger connections use a native HTML button fixture, never a guessed Figma child. TooltipProvider is included for a standalone snippet.")
t.finish('<TooltipProvider><Tooltip content="Helpful context">${triggerCode.length ? figma.code`{${triggerCode}}` : figma.code`<button type="button">Show help</button>`}</Tooltip></TooltipProvider>')

t = Template("Popover").imp("Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription")
t.read("label", "PopoverTitle children")
t.axis("State", {"Open": True, "Closed": False}, "defaultOpen")
t.child("aureform-button", "trigger")
t.finish('<Popover defaultOpen={${state}}>${triggerCode.length ? figma.code`<PopoverTrigger render={${triggerCode}} />` : figma.code`<PopoverTrigger>Details</PopoverTrigger>`}<PopoverContent><PopoverTitle>{${JSON.stringify(label)}}</PopoverTitle><PopoverDescription>Local contextual content.</PopoverDescription></PopoverContent></Popover>')

t = Template("Dialog").imp("Dialog, DialogContent, DialogTitle, DialogDescription")
t.read("label", "DialogTitle children")
t.axis("State", {"Open": True, "Destructive": True, "Closed": False}, "defaultOpen")
t.visual_only("State", "Destructive is a visual/action treatment; Dialog has no destructive variant prop.", ["Destructive"])
t.children(BUTTON_IDS, "actions")
t.finish('<Dialog defaultOpen={${state}}><DialogContent><DialogTitle>{${JSON.stringify(label)}}</DialogTitle><DialogDescription>Review this local example before continuing.</DialogDescription>${actionsCode}</DialogContent></Dialog>')

t = Template("Drawer").imp("Drawer, DrawerContent, DrawerTitle, DrawerDescription")
t.read("label", "DrawerTitle children")
t.axis("State", {"Open": True, "Closed": False}, "defaultOpen")
t.finish('<Drawer defaultOpen={${state}}><DrawerContent><DrawerTitle>{${JSON.stringify(label)}}</DrawerTitle><DrawerDescription>Local detail content.</DrawerDescription></DrawerContent></Drawer>')

t = Template("DropdownMenu").imp("DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem")
t.axis("State", target="defaultOpen; DropdownMenuTrigger.disabled")
t.finish('<DropdownMenu defaultOpen={${state === "Open"}}><DropdownMenuTrigger disabled={${state === "Disabled"}}>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => { /* Local edit action. */ }}>Edit</DropdownMenuItem></DropdownMenuContent></DropdownMenu>')

t = Template("Progress").imp("Progress")
t.axis("State", {"64": 64, "0": 0, "100": 100}, "value")
t.finish('<Progress value={${state}} max={100} label="Project progress" />')

t = Template("Spinner").imp("Spinner")
t.axis("State", {"Small": "text-xs", "Medium": "text-sm"}, "className text size")
t.notes.append("Spinner has no size prop; its source fixes the SVG size. This mapping affects text size only.")
t.finish('<Spinner label="Loading…" className="${state}" />')

t = Template("Skeleton").imp("Skeleton")
t.axis("State", {"Text": "h-5 w-40", "Card": "h-36 w-full"}, "className")
t.finish('<Skeleton className="${state}" />')

t = Template("Empty").imp("Empty")
t.read("label", "title")
t.axis("State", target="description fixture")
t.children(BUTTON_IDS, "actions")
t.finish('<Empty title={${JSON.stringify(label)}} description={${JSON.stringify(state === "Search" ? "Try another search or clear the filters." : "Create a first item to get started.")}} ${actionsCode.length ? figma.code`action={<>${actionsCode}</>}` : ""} />')

t = Template("Accordion").imp("Accordion, AccordionItem, AccordionTrigger, AccordionContent")
t.read("label", "AccordionTrigger children")
t.axis("State", {"Expanded": True, "Collapsed": False}, "defaultValue fixture")
t.finish('<Accordion defaultValue={${state ? \'["details"]\' : "[]"}}><AccordionItem value="details"><AccordionTrigger>{${JSON.stringify(label)}}</AccordionTrigger><AccordionContent>Source, tokens and local examples.</AccordionContent></AccordionItem></Accordion>')

t = Template("Carousel").imp("Carousel")
t.read("label", "items[0] visible title children")
t.visual_only("State", "Carousel initializes internal index at zero and has no selected-index prop.", ["First", "Middle", "Last"])
t.notes.append("Native Label is the visual CarouselTitle, not the accessibility label. Accessible carousel name and slide content are separate source fixtures.")
t.finish('<Carousel label="Featured compositions" items={[<article key="first"><h3>{${JSON.stringify(label)}}</h3><p>First local slide.</p></article>, <article key="second"><h3>Quiet forms</h3><p>Second local slide.</p></article>, <article key="third"><h3>A new possibility</h3><p>Third local slide.</p></article>]} />')

t = Template("Gallery").imp("Gallery")
t.visual_only("State", "Lightbox selection is internal and has no public initial-selection prop.", ["Grid", "Lightbox"])
t.finish('<Gallery label="Original compositions" images={[{ src: "/assets/art/arc.svg", alt: "An original geometric arch", caption: "Quiet forms" }, { src: "/assets/art/morrow.svg", alt: "An original editorial composition", caption: "Morrow" }]} />')

t = Template("VideoPlayer").imp("VideoPlayer")
t.visual_only("State", "Playback and failure are internal browser-media state; no playing/unavailable prop exists.", ["Paused", "Playing", "Unavailable"])
t.finish('<VideoPlayer src="/assets/aureform-motion.webm" poster="/assets/art/arc.svg" captionSrc="/assets/aureform-motion.vtt" label="Aureform product introduction" />')

t = Template("Ribbon").imp("Ribbon")
t.read("label", "children")
t.axis("State", {"Primary": "primary", "Subtle": "subtle", "Warning": "warning"}, "variant")
t.finish('<Ribbon variant="${state}">{${JSON.stringify(label)}}</Ribbon>')

# Source blocks: nine exports from eight source files, including native-Core MetricCard.
t = Template("MetricCard", "src/components/blocks/metric-card.tsx", "MetricCard", "block").imp("MetricCard")
t.read("label", "label")
t.read("value", "value")
t.axis("Trend", {"Positive": "up", "Negative": "down"}, "trend")
t.notes.append("Mapped to the native Core node; change/note/series are labelled local fixtures. No duplicate block node is invented.")
t.finish('<MetricCard label={${JSON.stringify(label)}} value={${JSON.stringify(value)}} trend="${trend}" change="12.8%" note="Compared with previous period" series={[8, 12, 11, 18, 24]} />')

t = Template("PageHeading", "src/components/blocks/page-heading.tsx", "PageHeading", "block").imp("PageHeading")
t.read("eyebrow", "eyebrow")
t.read("title", "title")
t.read("description", "description")
t.axis("State", {"Standard": False, "Editorial": True}, "editorial")
t.children(BUTTON_IDS, "actions")
t.finish('<PageHeading eyebrow={${JSON.stringify(eyebrow)}} title={${JSON.stringify(title)}} description={${JSON.stringify(description)}} editorial={${state}} ${actionsCode.length ? figma.code`actions={<>${actionsCode}</>}` : ""} />')

t = Template("DashboardShell", "src/components/blocks/dashboard-shell.tsx", "DashboardShell", "block").imp("DashboardShell").imp("PageHeading", "@/components/blocks/page-heading")
t.axis("Layout", {"Sidebar": "sidebar", "Compact": "compact", "Topbar": "topbar", "Split": "split", "Centered": "centered", "Floating": "floating"}, "layout")
t.code(f"const nativeContent = instance.getSlot({j(t.props['slot'])});")
t.visual_only("slot", "Content includes source-owned header plus Page content. It is intentionally not forwarded verbatim: DashboardShell already renders header.")
t.child("", "page", "Page content", {"traverseInstances": True})
t.extra_meta["nativeContentAvailable"] = "Boolean(nativeContent?.length)"
t.notes.extend([
    "Only a real INSTANCE named Page content can be executed safely through this local lookup. A frame is not coerced into an instance.",
    "If Page content is not a connected instance, emit an explicit local page-body fixture. Never insert the raw Content slot, DashboardHeader or source chrome into children.",
    "path=dashboard is a declared source fixture. The actual app requires its existing language/theme/demo providers.",
])
t.finish('<DashboardShell path="dashboard" layout="${layout}">${pageCode.length ? figma.code`{${pageCode}}` : figma.code`<section aria-label="Page content"><PageHeading title="Workspace overview" description="Explicit local body fixture; DashboardShell provides its own header." /><p className="mt-6 text-sm">Replace this body with your product page content.</p></section>`}</DashboardShell>')

for name in ["RevenuePanel", "PlanBreakdown", "CustomerTable", "CustomerDataTable", "AIComposer"]:
    source_file = "customer-table" if name == "CustomerDataTable" else kebab(name)
    t = Template(name, f"src/components/blocks/{source_file}.tsx", name, "block", props={}, node=LEDGER["blocks"][name]).imp(name)
    t.notes.append("The ledger exposes a native node but no component-property keys or axes for this block. Required source props are explicit local fixtures, never invented Figma properties.")
    if name == "RevenuePanel":
        t.children(BUTTON_IDS, "actions")
        t.child("aureform-chart", "chart")
        t.code('const chartProps = chartInstance && chartInstance.type === "INSTANCE" ? chartInstance.executeTemplate().metadata?.props : undefined;')
        t.finish('<RevenuePanel title="Revenue overview" description="Current and previous periods" label={${JSON.stringify(chartProps?.chartLabel ?? "Revenue by month")}} valueLabel="Revenue" secondaryLabel="Previous" kind="${chartProps?.chartKind ?? "area"}" data={${JSON.stringify(chartProps?.chartData ?? [{ label: "May", value: 28000, secondary: 24000 }, { label: "June", value: 34000, secondary: 28000 }])}} ${actionsCode.length ? figma.code`actions={<>${actionsCode}</>}` : ""} />')
    elif name == "PlanBreakdown":
        t.children(BUTTON_IDS, "actions")
        t.finish('<PlanBreakdown title="Plan mix" description="Local distribution fixture" items={[{ name: "Solo", value: "64 accounts", percentage: 64 }, { name: "Team", value: "36 accounts", percentage: 36 }]} ${actionsCode.length ? figma.code`footer={<>${actionsCode}</>}` : ""} />')
    elif name == "CustomerTable":
        t.finish('<CustomerTable data={[{ id: "local-1", name: "Jordan Reed", email: "jordan@studio.demo", plan: "Team", status: "active", amount: 399, joined: "2026-10-18" }]} labels={{ title: "Customers", viewAll: "View all", customer: "Customer", plan: "Plan", status: "Status", amount: "Amount", joined: "Joined", active: "Active", trial: "Trial", paused: "Paused", total: "1 local record" }} viewAllHref="/en/customers/" formatCurrency={(value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)} formatDate={(value) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))} />')
    elif name == "CustomerDataTable":
        t.imp("CustomerRecord", "@/components/blocks/customer-table", True).imp("ColumnDef", "@tanstack/react-table", True)
        t.finish('''(() => {
  const data: CustomerRecord[] = [{ id: "local-1", name: "Jordan Reed", email: "jordan@studio.demo", plan: "Team", status: "active", amount: 399, joined: "2026-10-18" }];
  const columns: ColumnDef<CustomerRecord>[] = [{ accessorKey: "name", header: "Customer" }, { accessorKey: "plan", header: "Plan" }, { accessorKey: "amount", header: "Amount" }];
  return <CustomerDataTable data={data} columns={columns} labels={{ search: "Search customers…", empty: "No customers" }} />;
})()''')
    elif name == "AIComposer":
        t.imp("useState", "react")
        t.finish('''(() => {
  function AIComposerExample() {
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("balanced");
    const [pending, setPending] = useState(false);
    return <AIComposer prompt={prompt} onPromptChange={setPrompt} model={model} onModelChange={setModel} pending={pending} onSend={() => setPending(true)} onCancel={() => setPending(false)} onAttach={(file) => setPrompt((current) => current + "\\\\nAttached local file: " + file.name)} labels={{ placeholder: "Describe your idea…", input: "Prompt", send: "Send", stop: "Stop", model: "Model", attach: "Attach file", balanced: "Balanced", precise: "Precise", creative: "Creative", attached: "Attached" }} />;
  }
  return <AIComposerExample />;
})()''')

# The native bar panel is a reusable visual variant of the same source export.
# Retain it during regeneration so its explicit default kind is reproducible.
t = Template(
    "RevenuePanel / Bar",
    "src/components/blocks/revenue-panel.tsx",
    "RevenuePanel",
    "block-variant",
    props={},
    node=LEDGER["blocks"]["RevenuePanel / Bar"],
    filename="RevenuePanelBar.figma.ts",
).imp("RevenuePanel")
t.children(BUTTON_IDS, "actions")
t.child("aureform-chart", "chart")
t.code('const chartProps = chartInstance && chartInstance.type === "INSTANCE" ? chartInstance.executeTemplate().metadata?.props : undefined;')
t.notes.append('This native Bar master has no reported component-property keys or axes. Without connected Chart metadata the example uses kind="bar"; a connected Chart supplies its actual kind, label and data. Required source props are explicit local fixtures, never invented Figma properties.')
t.finish('<RevenuePanel title="Revenue overview" description="Current and previous periods" label={${JSON.stringify(chartProps?.chartLabel ?? "Revenue by month")}} valueLabel="Revenue" secondaryLabel="Previous" kind="${chartProps?.chartKind ?? "bar"}" data={${JSON.stringify(chartProps?.chartData ?? [{ label: "May", value: 28000, secondary: 24000 }, { label: "June", value: 34000, secondary: 28000 }])}} ${actionsCode.length ? figma.code`actions={<>${actionsCode}</>}` : ""} />')

route_props = LEDGER["applicationComponents"]["RouteMap"]
t = Template("RouteMap", "src/components/blocks/route-map.tsx", "RouteMap", "block", props=route_props).imp("RouteMap")
t.read("caption")
t.visual_only("caption", "Native Caption is a visual footer, not the source label (accessible map name). Source footer is internal and cannot be controlled with a caption prop.")
t.notes.append("The ledger reports no exhaustive variant axes for this application block; selected=all is an explicit local source fixture, not a guessed native variant.")
t.finish('<RouteMap selected="all" label="Shipment routes" />')

# Native icon templates needed by dynamic swaps and chrome.
icon_map = {"LayoutDashboard": "layout-dashboard", "ChartNoAxesCombined": "chart", "Sparkles": "sparkles", "Users": "users", "Layers": "layers", "BookOpen": "book-open", "Settings": "settings", "Search": "search", "Bell": "bell", "Moon": "moon"}
icon_nodes = {**STATE["entities"]["icons"], "ArrowUpRight": LEDGER["components"]["ArrowUpRight"]["defaultId"], "AureformMark": LEDGER["components"]["AureformMark"]["defaultId"]}
for name, node in icon_nodes.items():
    if name in icon_map:
        t = Template(name, "src/components/design-icon.tsx", "DesignIcon", "icon", props={}, node=node, filename=f"Icon{name}.figma.ts").imp("DesignIcon")
        t.id = "aureform-icon-" + kebab(name)
        t.finish(f'<DesignIcon name="{icon_map[name]}" />')
    elif name == "AureformMark":
        t = Template(name, "src/components/brand.tsx", "AureformMark", "icon", props={}, node=node, filename=f"Icon{name}.figma.ts").imp("AureformMark")
        t.id = "aureform-icon-aureform-mark"
        t.finish('<AureformMark />')
    else:
        source_export = "".join(part[:1].upper() + part[1:] for part in name.split("-"))
        t = Template(name, "lucide-react", source_export, "icon", props={}, node=node, filename=f"Icon{source_export}.figma.ts").imp(source_export, "lucide-react")
        t.id = "aureform-icon-" + kebab(name)
        t.notes.append("Source is the installed lucide-react package export, rather than a fictitious local icon module.")
        t.finish(f'<{source_export} aria-hidden="true" />')

chrome = LEDGER["chrome"]
sidebar_template("DashboardSidebar", props={"applicationsOpen": chrome["applicationsOpen"]} if "applicationsOpen" in chrome else {}, node=chrome["sidebar"], filename="DashboardSidebar.figma.ts", kind="chrome")
t = Template("DashboardHeader", "src/components/blocks/dashboard-shell.tsx", "DashboardShell", "chrome", props={"title": chrome["headerTitle"]}, node=chrome["header"], filename="DashboardHeader.figma.ts").imp("Breadcrumb", "@/components/ui/breadcrumb")
t.read("title", "Breadcrumb.items[1].label")
t.children(BUTTON_IDS + ["aureform-avatar"], "controls")
t.notes.append("DashboardHeader is a local composition template name, not an exported React component. The actual header is internal to DashboardShell. Never render this composition again inside DashboardShell children.")
t.finish('<header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-8 py-4"><Breadcrumb label="Breadcrumb" items={[{ label: "Workspace", href: "/en/dashboard/" }, { label: ${JSON.stringify(title)} }]} /><div className="flex items-center gap-2">${controlsCode}</div></header>')
if "brandHeader" in chrome:
    t = Template("DashboardBrandHeader", "src/components/blocks/dashboard-shell.tsx", "DashboardShell", "chrome", props={}, node=chrome["brandHeader"], filename="DashboardBrandHeader.figma.ts")
    t.child("aureform-icon-aureform-mark", "mark")
    t.children(BUTTON_IDS + ["aureform-avatar"], "controls")
    t.notes.append("Standalone source-header composition for brand-based topbar/centered layouts, not an exported DashboardBrandHeader React component. Mark and configurable controls are dynamic children. Never insert this header again into DashboardShell children.")
    t.finish('<header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-8 py-4"><a href="/en/" aria-label="Aureform UI" className="inline-flex items-center gap-2">${markCode.length ? figma.code`{${markCode}}` : ""}<span>Aureform UI</span></a><div className="flex items-center gap-2">${controlsCode}</div></header>')

# Optional owner-recorded native additions. A source export or supported prop
# alone never supplies a native node or a Figma variant axis.
def native_effect_properties(name):
    record = NATIVE_EFFECTS.get("families", {}).get(name)
    if record is None:
        return None
    axes = {}
    for variant in record["variants"]:
        for part in variant["name"].split(","):
            axis, separator, value = part.strip().partition("=")
            assert separator and axis and value, f"{name}: malformed recorded variant name."
            values = axes.setdefault(axis, [])
            if value not in values:
                values.append(value)
    return {**record, "axes": axes}


def addition_properties(name):
    native_effect = native_effect_properties(name)
    for records in [
        ADDITIONS.get("components", {}),
        LEDGER["components"],
        LEDGER.get("applicationComponents", {}),
        LEDGER.get("effects", {}),
        {name: native_effect} if native_effect is not None else {},
    ]:
        if name in records:
            record = records[name]
            assert isinstance(record, dict), f"{name}: record node IDs and exact property keys in an object."
            node = record.get("setId") or record.get("defaultId") or record.get("node")
            if node is None:
                return None
            assert isinstance(node, str) and re.fullmatch(r"\d+:\d+", node), f"{name}: use the real native node ID."
            recorded = STATE["entities"]["components"].get(name)
            if isinstance(recorded, dict):
                recorded_node = recorded.get("setId") or recorded.get("id") or recorded.get("defaultId") or recorded.get("node")
                assert node == recorded_node, f"{name}: addition differs from the owner's state node."
                if record.get("defaultId") and recorded.get("defaultId"):
                    assert record["defaultId"] == recorded["defaultId"], f"{name}: addition differs from the owner's default node."
                for key, value in record.items():
                    if isinstance(value, str) and "#" in value and key in recorded:
                        assert value == recorded[key], f"{name}: {key} differs from the owner's recorded native property."
            elif isinstance(recorded, str):
                assert node == recorded, f"{name}: addition differs from the owner's state node."
            if native_effect is not None:
                for key in ["setId", "defaultId", "label", "axes"]:
                    assert record.get(key) == native_effect.get(key), f"{name}: {key} differs from the owner's native effect ledger."
            return {**record, "defaultId": record.get("defaultId", node)}
    return None


def addition_content(t, inline=False, include_label=True):
    content = "Explicit local content fixture." if inline else "<p>Explicit local content fixture.</p>"
    if include_label and "label" in t.props:
        t.read("label", "children")
        content = "{${JSON.stringify(label)}}" if inline else "<p>{${JSON.stringify(label)}}</p>"
    if "slot" in t.props:
        t.code(f"const content = instance.getSlot({j(t.props['slot'])});")
        t.read_vars[t.props["slot"]] = "content"
        t.mapped.append({"property": t.props["slot"], "type": "SLOT", "codeTarget": "children"})
        content = "${content}"
    accounted = {item["property"] for item in t.mapped + t.visual}
    for key, prop in t.props.items():
        if isinstance(prop, str) and "#" in prop and prop not in accounted:
            t.read(key, var=f"native{key[:1].upper()}{key[1:]}")
            t.visual_only(key, "Recorded native text retained in metadata; it has no established source-prop correspondence.")
    t.notes.append("Children and source defaults absent from the native ledger are explicit local fixtures, not inferred production content.")
    return content


props = addition_properties("Button / Shapes")
if props is not None:
    t = Template("Button / Shapes", SHAPE_CONTRACT["source"], "Button", "shape-extension",
                 props=props, filename="ButtonShapes.figma.ts").imp("Button")
    t.read("label", "children")
    t.axis("Shape", {value: value.lower() for value in t.axes["Shape"]}, "shape")
    t.axis("Size", SHAPE_CONTRACT["sizeMapping"], "size")
    t.source_properties.append({**SHAPE_CONTRACT, "nativeProperty": "Shape", "status": "mapped-native-axis"})
    t.appearance()
    t.swap("icon", "icon", "showIcon")
    t.notes.append("Shapes is additive to the existing core, appearance and loading/icon sets. This native set has no Appearance or State axis.")
    t.finish('<Button shape="${shape}" size="${size}">${iconCode}{${JSON.stringify(label)}}</Button>')
else:
    pending_native.append({
        "nativeName": "Button / Shapes", "source": SHAPE_CONTRACT["source"], "export": "Button",
        "reason": "A real Shapes set, exact property definitions and observed shape/size matrix are required.",
    })


for export, contract in APPEARANCE_CONTRACTS.items():
    names = ["Card / Material", "Card / Appearance"] if export == "Card" else [f"{export} / Appearance"]
    name = names[0]
    props = None
    for candidate in names:
        props = addition_properties(candidate)
        if props is not None:
            name = candidate
            break
    if props is None:
        if "Appearance" not in LEDGER["components"][export].get("axes", {}):
            pending_native.append({
                "nativeName": name,
                "source": contract["source"],
                "export": export,
                "reason": "Owner must record a real appearance master/set and its exact axes, or add Appearance to the existing native property ledger.",
                "sourceProperties": [contract],
            })
        continue
    filename = "CardMaterial.figma.ts" if name == "Card / Material" else f"{export}Appearance.figma.ts"
    t = Template(name, contract["source"], export, "appearance-extension", props=props,
                 node=props.get("setId") or props["defaultId"], filename=filename).imp(export)
    attributes = t.appearance()
    if export == "Button":
        if "Style" in t.axes:
            t.axis("Style", {value: STYLE[value] for value in t.axes["Style"]}, "variant")
            attributes += ' variant="${variant}"'
        if "Size" in t.axes:
            sizes = {"Small": "sm", "Medium": "default", "Large": "lg", "Icon": "icon", "Small icon": "icon-sm"}
            t.axis("Size", {value: sizes[value] for value in t.axes["Size"]}, "size")
            attributes += ' size="${size}"'
        if "State" in t.axes:
            t.axis("State", target="disabled (Disabled); interactive CSS presentation otherwise")
            t.visual_only("State", "Hover is pointer/CSS presentation, not a force-hover source prop.", ["Hover"])
            attributes += ' disabled={${state === "Disabled"}}'
        if "icon" in t.props:
            t.swap("icon", "icon", "showIcon" if "showIcon" in t.props else None)
            attributes += ' aria-label="Continue"'
        content = addition_content(t, inline=True)
        if "icon" in t.props:
            content = "${iconCode}" + content
    elif export == "Badge":
        if "Tone" in t.axes:
            tones = {"Success": "default", "Neutral": "neutral", "Warning": "warning", "Destructive": "destructive", "Outline": "outline"}
            t.axis("Tone", {value: tones[value] for value in t.axes["Tone"]}, "variant")
            attributes += ' variant="${tone}"'
        content = addition_content(t, inline=True)
    else:
        t.imp("CardHeader, CardTitle, CardContent")
        if "State" in t.axes:
            t.visual_only("State", "Card has no forced hover/state prop. Material is mapped through appearance; hover remains interactive CSS presentation.", t.axes["State"])
        if "label" in t.props:
            t.read("label", "CardTitle children")
            title = "{${JSON.stringify(label)}}"
        else:
            title = "Local card title fixture"
        content = f"<CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{addition_content(t, include_label=False)}</CardContent>"
    t.finish(f"<{export}{attributes}>{content}</{export}>")

for export, file in EFFECT_EXPORTS.items():
    source = f"src/components/effects/{file}.tsx"
    props = addition_properties(export)
    if props is None:
        pending_native.append({
            "nativeName": export, "source": source, "export": export,
            "reason": "Owner must record the real native master/set, exact property keys and reported axes.",
        })
        continue
    t = Template(export, source, export, "effect", props=props,
                 node=props.get("setId") or props["defaultId"]).imp(export)
    t.source_properties.append({"source": source, "export": export, "type": f"{export}Props"})
    attributes = ""
    if export in ["GradientBackground", "ShaderBackground"] and "Kind" in t.axes:
        type_name = "GradientKind" if export == "GradientBackground" else "ShaderKind"
        options = source_options("src/components/effects/effect-utils.ts", type_name)
        mapping = {value: value.lower() for value in t.axes["Kind"]}
        assert set(mapping.values()) <= set(options), (export, "Unsupported source kind", mapping)
        t.axis("Kind", mapping, "kind")
        attributes += ' kind="${kind}"'
    if export == "ShaderBackground" and "paused" in t.props:
        t.boolean("paused", "paused")
        attributes += ' paused={${paused}}'
    elif export == "ShaderBackground" and "State" in t.axes:
        t.axis("State", target="paused (Paused)")
        t.visual_only("State", "Loading, fallback and running are browser/WebGL runtime states; paused is the only public state control.",
                      [value for value in t.axes["State"] if value != "Paused"])
        attributes += ' paused={${state === "Paused"}}'
    if export == "MagneticButton":
        attributes += ' type="button"'
        if "disabled" in t.props:
            t.boolean("disabled", "disabled")
            attributes += ' disabled={${disabled}}'
        elif "State" in t.axes:
            t.axis("State", target="disabled (Disabled)")
            t.visual_only("State", "Hover/focus are pointer and keyboard presentation, not forced source states.",
                          [value for value in t.axes["State"] if value not in ["Default", "Disabled"]])
            attributes += ' disabled={${state === "Disabled"}}'
    if export in ["SpotlightCard", "GlowBorder", "TiltCard"] and "State" in t.axes:
        t.visual_only("State", "Default/Hover are native pointer/CSS specimens; this source export has no forced-hover or state prop.", t.axes["State"])
    content = addition_content(t, inline=export == "MagneticButton")
    if props.get("label", "").startswith("Title#"):
        t.notes.append("The native Title text is emitted as an explicit children fixture, not a title/label source prop.")
    t.notes.append("Decorative browser movement and WebGL output are not asserted by a native design mapping.")
    t.finish(f"<{export}{attributes}>{content}</{export}>")

assert {x["nativeName"] for x in entries if x["kind"] == "core"} == set(CORE)
block_entries = [x for x in entries if x["kind"] == "block"]
assert len(block_entries) >= 9, "Preserve the established native block mappings."
source_blocks = [
    {"export": name, "source": str(file.relative_to(ROOT))}
    for file in sorted((ROOT / "src/components/blocks").glob("*.tsx"))
    for name in re.findall(r"export\s+(?:function|const)\s+(\w+)", file.read_text())
]
assert all(
    {"export": entry["export"], "source": entry["source"]} in source_blocks
    for entry in block_entries
), "A native block mapping must refer to an actual source export."
assert len({x["id"] for x in entries}) == len(entries)
assert len({x["node"] for x in entries}) == len(entries)
manifest = {
    "schemaVersion": 1,
    "version": VERSION,
    "preparedOn": "2026-10-18",
    "status": "local-unpublished",
    "format": "parserless-figma-ts",
    "fileKey": KEY,
    "cloudPublication": {"performed": False, "accountPlan": "Professional", "nativeLibraryPublished": False},
    "authoritativeInputs": [
        {"file": f".figma/{name}", "sha256": hashlib.sha256((FIGMA / name).read_bytes()).hexdigest()}
        for name in ["component-properties.json", "state.json"]
    ] + ([{"file": ".figma/code-connect/native-additions.json", "sha256": hashlib.sha256(ADDITIONS_FILE.read_bytes()).hexdigest()}] if ADDITIONS_FILE.exists() else [])
      + ([{"file": ".figma/native-effects-library-1.1.json", "sha256": hashlib.sha256(NATIVE_EFFECTS_FILE.read_bytes()).hexdigest()}] if NATIVE_EFFECTS_FILE.exists() else [])
      + ([{"file": ".figma/code-connect/Chart.native-definitions-1.1.json", "sha256": hashlib.sha256((OUT / "Chart.native-definitions-1.1.json").read_bytes()).hexdigest()}] if (OUT / "Chart.native-definitions-1.1.json").exists() else []),
    "coverage": {
        "coreFamilies": len(CORE),
        "buttonExtensions": sum(x["kind"] == "button-extension" for x in entries),
        "shapeExtensions": sum(x["kind"] == "shape-extension" for x in entries),
        "sourceBlockExports": len(source_blocks),
        "sourceBlockFiles": len({x["source"] for x in source_blocks}),
        "mappedBlockExports": len(block_entries),
        "nativeIcons": len(icon_nodes),
        "navigationFragments": 1,
        "chromeCompositions": sum(x["kind"] == "chrome" for x in entries),
        "appearanceExtensions": sum(x["kind"] == "appearance-extension" for x in entries),
        "effectTemplates": sum(x["kind"] == "effect" for x in entries),
        "pendingNativeMappings": len(pending_native),
        "totalTemplates": len(entries),
    },
    "validation": {"status": "pending-local-smoke", "liveFigmaRuntimeTested": False, "cloudRegistered": False},
    "limitations": [
        "Native presentation axes without matching source props are retained and explained in intentionalVisualOnly.",
        "Explicit local fixtures satisfy required source props when no native property key is recorded; fixtures are not extracted production data.",
        "DashboardShell does not forward the raw Content slot because that slot includes source-owned header chrome.",
        "Nested lookup and structured-section rendering are prepared locally; their native Figma runtime behavior has not been verified.",
        "Source appearance options are additive to variant/tone/size. Only reported native Appearance axes are read; pending owner IDs are never invented.",
    ],
    "sourceContracts": {
        "appearance": list(APPEARANCE_CONTRACTS.values()),
        "effects": [
            {"source": f"src/components/effects/{file}.tsx", "export": export, "type": f"{export}Props"}
            for export, file in EFFECT_EXPORTS.items()
        ],
        "charts": [CHART_CONTRACT],
        "shapes": [SHAPE_CONTRACT],
        "tables": TABLE_CONTRACTS,
    },
    "sourceBlocks": [
        {**block, "mapped": any(
            entry["source"] == block["source"] and entry["export"] == block["export"]
            for entry in block_entries
        )}
        for block in source_blocks
    ],
    "pendingNativeMappings": pending_native,
    "configuration": ".figma/code-connect/figma.config.json",
    "templates": entries,
}
snapshot_files = {
    *[entry["source"] for entry in entries if entry["source"].startswith("src/")],
    *[block["source"] for block in source_blocks],
    *[contract["source"] for contract in manifest["sourceContracts"]["effects"]],
    "src/lib/catalog.ts", "src/lib/appearance.ts", "src/lib/appearance-bootstrap.ts",
    "src/components/appearance-provider.tsx", "src/components/appearance-controls.tsx",
    "src/styles/effects.css", "scripts/lib/source-graph.mjs",
    "scripts/generate-tokens.mjs", "scripts/lib/appearance-tokens.mjs",
    "tokens/aureform.tokens.json", "bin/aureform.mjs",
    *[str(file.relative_to(ROOT)) for file in (ROOT / "src/components/effects").iterdir() if file.suffix in [".ts", ".tsx", ".css"]],
}
manifest["sourceSnapshots"] = [
    {"file": file, "sha256": hashlib.sha256((ROOT / file).read_bytes()).hexdigest()}
    for file in sorted(snapshot_files)
]
manifest["templateSnapshots"] = [
    {"file": entry["file"], "sha256": hashlib.sha256((ROOT / entry["file"]).read_bytes()).hexdigest()}
    for entry in entries
]
(FIGMA / "code-connect-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
config = {
    "codeConnect": {
        "include": ["*.figma.ts"],
        "label": "Aureform React · local templates",
        "language": "tsx",
    }
}
(OUT / "figma.config.json").write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n")
print(j(manifest["coverage"]))
