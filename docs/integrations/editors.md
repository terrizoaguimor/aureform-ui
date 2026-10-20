# Optional native document editors

These are complete consumer bindings for the public
`ProductIntegrationWorkbench.renderEditor` slot. The consumer installs the
chosen SDK and supplies the existing `definition`, `connection`, `adapter` and
`scope` props from its Client Component. Aureform's root dependencies do not
include these SDKs. These examples provide local editing, not account access,
collaboration transport or native-provider certification.

The slot receives `ProductDocumentEditorProps`: `value`, `onChange`, `disabled`
and `locale`. Each binding reports `onChange({ title, content, format: "json" })`.
The workbench retains revision checks, save review, preview and conflict recovery.
The binding never calls a save endpoint or modifies a document's revision.

## Selected SDK versions and licenses

Keep packages within each SDK family on the same exact version. The recipes
target these release lines; the exact pins below are the validation targets,
not a claim that every future patch or other release was tested.

| Binding | Selected release line | Exact pin | Primary references |
| --- | --- | --- | --- |
| Tiptap | `3.32.x` | `3.32.0` | [Next.js setup](https://tiptap.dev/docs/editor/getting-started/install/nextjs), [setContent](https://tiptap.dev/docs/editor/api/commands/content/set-content), [MIT license](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md) |
| Lexical | `0.52.x` | `0.52.0` | [React extension composer](https://lexical.dev/docs/getting-started/react), [editor state](https://lexical.dev/docs/concepts/editor-state), [MIT license](https://github.com/facebook/lexical/blob/main/LICENSE) |
| BlockNote | `0.56.x` | `0.56.0` | [React API](https://www.blocknotejs.org/docs/react/overview), [suggestion menus](https://www.blocknotejs.org/docs/react/components/suggestion-menus), [MPL/XL license boundary](https://github.com/TypeCellOS/BlockNote/blob/main/LICENSE.txt) |

BlockNote core and React are **MPL-2.0**, not MIT. `@blocknote/xl-*` packages have
the separate GPL-3.0/commercial license boundary. This recipe uses only core and
React, and installs no XL package. See the [upstream license](https://github.com/TypeCellOS/BlockNote/blob/main/LICENSE.txt)
and [XL commercial terms](https://www.blocknotejs.org/legal/blocknote-xl-commercial-license).

Install only the binding you use in your own application:

```sh
pnpm add @tiptap/core@3.32.0 @tiptap/react@3.32.0 @tiptap/pm@3.32.0 @tiptap/starter-kit@3.32.0

pnpm add lexical@0.52.0 @lexical/react@0.52.0 @lexical/extension@0.52.0 @lexical/rich-text@0.52.0 @lexical/history@0.52.0 @lexical/list@0.52.0 @lexical/selection@0.52.0 @lexical/code@0.52.0 @lexical/clipboard@0.52.0

pnpm add @blocknote/core@0.56.0 @blocknote/react@0.56.0
```

## Shared Aureform controls and document boundary

Import the shipped `product-editor-controls.tsx` block. `ProductEditorControls`
accepts `actions`, `blockCommands`, `disabled`, `locale` and optional controlled
`blockMenuOpen`/`onBlockMenuOpenChange`. An action has `id`, `label`, `onSelect`,
optional `icon`, `active`, `disabled` and `shortcut`; a block command can also
have `description`. The callback performs the SDK command and restores editor
focus. Base UI supplies toolbar navigation, menu arrows, typeahead and Escape.

`ProductEditorSlashMenu` also works independently. `ProductEditorBlockCommands`
renders a suggestion list whose native controller supplies filtering,
`selectedIndex` and selection callbacks, as in the BlockNote recipe.
The controls use Aureform's palette/theme variables and reduced-motion button
styles. They contain no SDK, network, credential or persistence logic.

Copy this shared file alongside the three example files you choose to use:

```tsx filename="editor-shared.tsx"
"use client";
import { Component, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProductDocumentEditorProps } from "@/components/integrations/product-workbench";

export type EditorProps = ProductDocumentEditorProps;
export const word = (locale: "en" | "es", en: string, es: string) =>
  locale === "es" ? es : en;
export const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function nativeContent<T>(
  value: EditorProps["value"],
  accepts: (value: unknown) => value is T,
  empty: T,
): { content: T; blank: boolean } | { error: string } {
  const text = value.content.trim();
  // The workbench's new JSON document is a generic "{}" placeholder.
  // Only blank content is initialized. Nonblank invalid content is preserved.
  if (text === "" || text === "{}") return { content: empty, blank: true };
  if (value.format !== "json") return { error: "format" };
  try {
    const parsed: unknown = JSON.parse(text);
    return accepts(parsed) ? { content: parsed, blank: false } : { error: "schema" };
  } catch {
    return { error: "syntax" };
  }
}

export function EditorTitle(props: EditorProps) {
  return <label className="block space-y-2 text-xs font-medium">
    {word(props.locale, "Title", "Título")}
    <Input disabled={props.disabled} value={props.value.title}
      onChange={(event) => props.onChange({
        title: event.target.value, content: props.value.content, format: props.value.format,
      })} />
  </label>;
}

export function CorrectionEditor(props: EditorProps) {
  return <div className="space-y-4">
    <EditorTitle {...props} />
    <p role="alert" className="text-xs leading-6 text-destructive-foreground">
      {word(props.locale,
        "This binding needs valid native JSON. The original document is preserved below; correct it or load a compatible document.",
        "Este editor necesita JSON nativo válido. El documento original se conserva debajo; corrígelo o carga uno compatible.")}
    </p>
    <label className="block space-y-2 text-xs">
      {word(props.locale, "Original content", "Contenido original")}
      <Textarea className="min-h-48 font-mono" disabled={props.disabled}
        value={props.value.content} aria-invalid="true"
        onChange={(event) => props.onChange({
          title: props.value.title, content: event.target.value, format: props.value.format,
        })} />
    </label>
  </div>;
}

export class NativeEditorBoundary extends Component<
  { editor: EditorProps; children: ReactNode }, { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<{ editor: EditorProps; children: ReactNode }>) {
    if (this.state.failed && (
      previous.editor.value.content !== this.props.editor.value.content ||
      previous.editor.value.format !== this.props.editor.value.format
    )) this.setState({ failed: false });
  }
  render() {
    return this.state.failed
      ? <CorrectionEditor {...this.props.editor} />
      : this.props.children;
  }
}
```

The shape checks below identify the native envelope. Each SDK still interprets
its registered nodes/schema; initialization failures retain the raw correction
view. The consumer backend validates the complete native schema, supported
extensions, content size and document permissions before storing it.
JSON from one editor is not interchangeable with another editor's JSON.

## Tiptap: StarterKit and JSON round-trip

This binding uses `StarterKit`, `getJSON()`, `onUpdate` and
`setContent(..., { emitUpdate: false, errorOnInvalidContent: true })`.
`immediatelyRender: false` follows the [official Next.js recipe](https://tiptap.dev/docs/editor/getting-started/install/nextjs).
The normal workbench keeps its existing Markdown/text/JSON form; the consumer
selects the JSON rich editor explicitly. Existing Markdown is not silently
converted. Typing `/` in an empty block opens the shared block menu.

```tsx filename="tiptap-editor.tsx"
"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { ProductIntegrationWorkbench, type ProductIntegrationWorkbenchProps } from "@/components/integrations/product-workbench";
import { ProductEditorControls } from "@/components/integrations/product-editor-controls";
import { CorrectionEditor, EditorTitle, NativeEditorBoundary, nativeContent, object, word, type EditorProps } from "./editor-shared";

const empty: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
function isTiptap(value: unknown): value is JSONContent {
  return object(value) && value.type === "doc" && Array.isArray(value.content);
}

function TiptapSession(props: EditorProps & { initial: JSONContent; blank: boolean }) {
  const { value, onChange, disabled, locale } = props;
  const [open, setOpen] = useState(false);
  const published = useRef(value.content);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2] } })],
    immediatelyRender: false,
    content: props.initial,
    editable: !disabled,
    editorProps: {
      attributes: {
        "aria-label": word(locale, "Document content", "Contenido del documento"),
        class: "min-h-64 rounded-xl border border-border bg-surface p-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-ring [&_h1]:text-2xl [&_h2]:text-xl [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_pre]:overflow-x-auto",
      },
      handleKeyDown(view, event) {
        const selection = view.state.selection;
        if (!disabled && event.key === "/" && selection.empty &&
            selection.$from.parent.isTextblock && selection.$from.parent.content.size === 0) {
          event.preventDefault(); setOpen(true); return true;
        }
        return false;
      },
    },
    onUpdate({ editor: current }) {
      if (disabled) return;
      const content = JSON.stringify(current.getJSON());
      published.current = content;
      onChange({ title: value.title, content, format: "json" });
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      undo: current?.can().undo() ?? false,
      redo: current?.can().redo() ?? false,
    }),
  });
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
    if (props.blank) {
      const content = JSON.stringify(editor.getJSON());
      if (content !== value.content && !disabled) {
        published.current = content;
        onChange({ title: value.title, content, format: "json" });
      }
    } else if (value.content !== published.current) {
      editor.commands.setContent(props.initial, { emitUpdate: false, errorOnInvalidContent: true });
      published.current = value.content;
    }
  }, [editor, disabled, value.content, value.title, onChange, props.blank, props.initial]);
  const l = (en: string, es: string) => word(locale, en, es);
  return <div className="space-y-4">
    <EditorTitle {...props} />
    <ProductEditorControls locale={locale} disabled={disabled || !editor}
      blockMenuOpen={open} onBlockMenuOpenChange={setOpen}
      actions={[
        { id: "bold", label: l("Bold", "Negrita"), active: state?.bold, onSelect: () => { editor?.chain().focus().toggleBold().run(); } },
        { id: "italic", label: l("Italic", "Cursiva"), active: state?.italic, onSelect: () => { editor?.chain().focus().toggleItalic().run(); } },
        { id: "undo", label: l("Undo", "Deshacer"), disabled: !state?.undo, onSelect: () => { editor?.chain().focus().undo().run(); } },
        { id: "redo", label: l("Redo", "Rehacer"), disabled: !state?.redo, onSelect: () => { editor?.chain().focus().redo().run(); } },
      ]}
      blockCommands={[
        { id: "paragraph", label: l("Paragraph", "Párrafo"), onSelect: () => { editor?.chain().focus().setParagraph().run(); } },
        { id: "heading", label: l("Heading", "Encabezado"), onSelect: () => { editor?.chain().focus().toggleHeading({ level: 2 }).run(); } },
        { id: "bullet-list", label: l("Bullet list", "Lista con viñetas"), onSelect: () => { editor?.chain().focus().toggleBulletList().run(); } },
        { id: "numbered-list", label: l("Numbered list", "Lista numerada"), onSelect: () => { editor?.chain().focus().toggleOrderedList().run(); } },
        { id: "quote", label: l("Quote", "Cita"), onSelect: () => { editor?.chain().focus().toggleBlockquote().run(); } },
        { id: "code", label: l("Code block", "Bloque de código"), onSelect: () => { editor?.chain().focus().toggleCodeBlock().run(); } },
        { id: "divider", label: l("Divider", "Separador"), onSelect: () => { editor?.chain().focus().setHorizontalRule().run(); } },
      ]} />
    <EditorContent editor={editor} />
  </div>;
}

function TiptapDocumentEditor(props: EditorProps) {
  const decoded = nativeContent(props.value, isTiptap, empty);
  if ("error" in decoded) return <CorrectionEditor {...props} />;
  return <NativeEditorBoundary editor={props}>
    <TiptapSession {...props} initial={decoded.content} blank={decoded.blank} />
  </NativeEditorBoundary>;
}

export function ConnectedTiptapDocuments(props: Omit<ProductIntegrationWorkbenchProps, "renderEditor">) {
  const [rich, setRich] = useState(false);
  return <div className="space-y-4">
    <label className="block space-y-2 text-xs">
      Document editor / Editor del documento
      <select className="rounded-lg border border-border bg-surface px-3 py-2"
        value={rich ? "json" : "default"} onChange={(event) => setRich(event.target.value === "json")}>
        <option value="default">Default Markdown / text / JSON</option>
        <option value="json">Tiptap · Structured JSON</option>
      </select>
    </label>
    <ProductIntegrationWorkbench {...props}
      renderEditor={rich ? (editorProps) => <TiptapDocumentEditor
        key={`${editorProps.value.id}:${editorProps.value.revision}`} {...editorProps} /> : undefined} />
  </div>;
}
```

## Lexical: extension composer, commands and serialized editor state

This uses the current `LexicalExtensionComposer`, rather than the deprecated
`LexicalComposer`. Rich-text, history, list, code, clipboard and horizontal-rule
extensions register the corresponding nodes/behavior. Update listeners publish
`EditorState.toJSON()`; externally replaced documents use `parseEditorState()`
and `setEditorState()` only when the payload is not the latest local edit.
See the [current React extension guide](https://lexical.dev/docs/extensions/react).

```tsx filename="lexical-editor.tsx"
"use client";
import { useEffect, useRef, useState } from "react";
import {
  $createParagraphNode, $getRoot, $getSelection, $isRangeSelection,
  CAN_REDO_COMMAND, CAN_UNDO_COMMAND, COMMAND_PRIORITY_LOW, FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND, REDO_COMMAND, UNDO_COMMAND, defineExtension,
  type ElementNode, type SerializedEditorState,
} from "lexical";
import { ClipboardDOMImportExtension } from "@lexical/clipboard";
import { HorizontalRuleExtension, INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import { CodeExtension, $createCodeNode } from "@lexical/code";
import { ListExtension, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { RichTextExtension, $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ProductIntegrationWorkbench, type ProductIntegrationWorkbenchProps } from "@/components/integrations/product-workbench";
import { ProductEditorControls } from "@/components/integrations/product-editor-controls";
import { CorrectionEditor, EditorTitle, NativeEditorBoundary, nativeContent, object, word, type EditorProps } from "./editor-shared";

const paragraph = {
  type: "paragraph", version: 1, format: "", indent: 0, direction: null,
  children: [], textFormat: 0, textStyle: "",
};
const empty: SerializedEditorState = { root: {
  type: "root", version: 1, format: "", indent: 0, direction: null,
  children: [paragraph],
} };
function isLexical(value: unknown): value is SerializedEditorState {
  return object(value) && object(value.root) && value.root.type === "root" &&
    Array.isArray(value.root.children) && value.root.children.length > 0;
}
const extension = defineExtension({
  name: "consumer/aureform-document",
  namespace: "aureform-document",
  dependencies: [RichTextExtension, HistoryExtension, ListExtension,
    CodeExtension, ClipboardDOMImportExtension, HorizontalRuleExtension],
  $initialEditorState() { $getRoot().append($createParagraphNode()); },
  theme: {
    paragraph: "mb-3", heading: { h1: "text-2xl font-semibold", h2: "text-xl font-semibold" },
    text: { bold: "font-bold", italic: "italic", code: "rounded bg-surface-subtle px-1 font-mono" },
    list: { ul: "list-disc pl-6", ol: "list-decimal pl-6" },
    quote: "border-l-2 border-primary pl-4", code: "overflow-x-auto rounded bg-surface-subtle p-3 font-mono",
  },
});

function LexicalSession(props: EditorProps & { initial: SerializedEditorState; blank: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [undo, setUndo] = useState(false);
  const [redo, setRedo] = useState(false);
  const [marks, setMarks] = useState({ bold: false, italic: false });
  const published = useRef<string | null>(null);
  const loading = useRef(false);
  const { value, onChange, disabled, locale } = props;
  useEffect(() => {
    editor.setEditable(!disabled);
    if (value.content === published.current) return;
    loading.current = true;
    const next = editor.parseEditorState(JSON.stringify(props.initial));
    editor.setEditorState(next);
    loading.current = false;
    const content = JSON.stringify(next.toJSON());
    published.current = props.blank ? content : value.content;
    if (props.blank && !disabled) onChange({ title: value.title, content, format: "json" });
  }, [editor, value.content, value.title, onChange, disabled, props.initial, props.blank]);
  useEffect(() => editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
    editorState.read(() => {
      const selection = $getSelection();
      setMarks({
        bold: $isRangeSelection(selection) && selection.hasFormat("bold"),
        italic: $isRangeSelection(selection) && selection.hasFormat("italic"),
      });
    });
    if (disabled || loading.current || (!dirtyElements.size && !dirtyLeaves.size)) return;
    const content = JSON.stringify(editorState.toJSON());
    if (content === published.current) return;
    published.current = content;
    onChange({ title: value.title, content, format: "json" });
  }), [editor, disabled, onChange, value.title]);
  useEffect(() => {
    const undoCleanup = editor.registerCommand(CAN_UNDO_COMMAND, (next) => { setUndo(next); return false; }, COMMAND_PRIORITY_LOW);
    const redoCleanup = editor.registerCommand(CAN_REDO_COMMAND, (next) => { setRedo(next); return false; }, COMMAND_PRIORITY_LOW);
    const slashCleanup = editor.registerCommand(KEY_DOWN_COMMAND, (event) => {
      const selection = $getSelection();
      if (!disabled && event.key === "/" && $isRangeSelection(selection) &&
          selection.isCollapsed() && selection.anchor.getNode().getTextContentSize() === 0) {
        event.preventDefault(); setOpen(true); return true;
      }
      return false;
    }, COMMAND_PRIORITY_LOW);
    return () => { undoCleanup(); redoCleanup(); slashCleanup(); };
  }, [editor, disabled]);
  const l = (en: string, es: string) => word(locale, en, es);
  const block = (create: () => ElementNode) => {
    editor.focus();
    editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $setBlocksType(selection, create); });
  };
  return <div className="space-y-4">
    <EditorTitle {...props} />
    <ProductEditorControls locale={locale} disabled={disabled}
      blockMenuOpen={open} onBlockMenuOpenChange={setOpen}
      actions={[
        { id: "bold", label: l("Bold", "Negrita"), active: marks.bold, onSelect: () => { editor.focus(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"); } },
        { id: "italic", label: l("Italic", "Cursiva"), active: marks.italic, onSelect: () => { editor.focus(); editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"); } },
        { id: "undo", label: l("Undo", "Deshacer"), disabled: !undo, onSelect: () => { editor.focus(); editor.dispatchCommand(UNDO_COMMAND, undefined); } },
        { id: "redo", label: l("Redo", "Rehacer"), disabled: !redo, onSelect: () => { editor.focus(); editor.dispatchCommand(REDO_COMMAND, undefined); } },
      ]}
      blockCommands={[
        { id: "paragraph", label: l("Paragraph", "Párrafo"), onSelect: () => block($createParagraphNode) },
        { id: "heading", label: l("Heading", "Encabezado"), onSelect: () => block(() => $createHeadingNode("h2")) },
        { id: "quote", label: l("Quote", "Cita"), onSelect: () => block($createQuoteNode) },
        { id: "code", label: l("Code block", "Bloque de código"), onSelect: () => block($createCodeNode) },
        { id: "bullet-list", label: l("Bullet list", "Lista con viñetas"), onSelect: () => { editor.focus(); editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined); } },
        { id: "numbered-list", label: l("Numbered list", "Lista numerada"), onSelect: () => { editor.focus(); editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined); } },
        { id: "divider", label: l("Divider", "Separador"), onSelect: () => { editor.focus(); editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined); } },
      ]} />
    <ContentEditable aria-label={l("Document content", "Contenido del documento")}
      className="min-h-64 rounded-xl border border-border bg-surface p-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-ring" />
  </div>;
}

function LexicalDocumentEditor(props: EditorProps) {
  const decoded = nativeContent(props.value, isLexical, empty);
  if ("error" in decoded) return <CorrectionEditor {...props} />;
  return <NativeEditorBoundary editor={props}>
    <LexicalExtensionComposer extension={extension} contentEditable={null}>
      <LexicalSession {...props} initial={decoded.content} blank={decoded.blank} />
    </LexicalExtensionComposer>
  </NativeEditorBoundary>;
}
export function ConnectedLexicalDocuments(props: Omit<ProductIntegrationWorkbenchProps, "renderEditor">) {
  return <ProductIntegrationWorkbench {...props} renderEditor={(editorProps) =>
    <LexicalDocumentEditor key={`${editorProps.value.id}:${editorProps.value.revision}`} {...editorProps} />} />;
}
```

## BlockNote: native blocks, change events and Aureform slash suggestions

`BlockNoteViewRaw` avoids adding another UI framework. Its default floating UI
is disabled, and Aureform's toolbar plus a real `SuggestionMenuController`
provide block commands. Native block JSON is read from `editor.document` and
restored with `replaceBlocks()`. Empty `{}` initializes a paragraph and publishes
the SDK's serialization, including its real generated block IDs.
See [content manipulation](https://www.blocknotejs.org/docs/reference/editor/manipulating-content)
and [change/selection events](https://www.blocknotejs.org/docs/reference/editor/events).

BlockNote is client-only. The wrapper below uses `next/dynamic` with `ssr: false`
inside a Client Component; do not pass a render callback across an RSC boundary.

```tsx filename="blocknote-editor.tsx"
"use client";
import { useEffect, useRef, useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import { en, es } from "@blocknote/core/locales";
import {
  BlockNoteViewRaw, SuggestionMenuController, getDefaultReactSlashMenuItems, useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { ProductEditorBlockCommands, ProductEditorControls } from "@/components/integrations/product-editor-controls";
import { useAppearance } from "@/components/appearance-provider";
import { CorrectionEditor, EditorTitle, NativeEditorBoundary, nativeContent, object, word, type EditorProps } from "./editor-shared";

const empty: PartialBlock[] = [{ type: "paragraph", content: "" }];
function isBlockNote(value: unknown): value is PartialBlock[] {
  return Array.isArray(value) && value.every((block: unknown) =>
    object(block) && typeof block.type === "string" &&
    (block.children === undefined || Array.isArray(block.children)));
}
function BlockNoteSession(props: EditorProps & { initial: PartialBlock[]; blank: boolean }) {
  const { value, onChange, disabled, locale } = props;
  const { appearance } = useAppearance();
  const editor = useCreateBlockNote({
    initialContent: props.initial.length ? props.initial : empty,
    dictionary: locale === "es" ? es : en,
  });
  const published = useRef(value.content);
  const loading = useRef(false);
  const [styles, setStyles] = useState({ bold: false, italic: false });
  const [open, setOpen] = useState(false);
  const l = (english: string, spanish: string) => word(locale, english, spanish);
  const publish = () => {
    if (loading.current || disabled) return;
    const content = JSON.stringify(editor.document);
    published.current = content;
    onChange({ title: value.title, content, format: "json" });
  };
  useEffect(() => {
    if (props.blank) {
      const content = JSON.stringify(editor.document);
      if (content !== value.content && !disabled) {
        published.current = content;
        onChange({ title: value.title, content, format: "json" });
      }
    } else if (value.content !== published.current) {
      loading.current = true;
      editor.replaceBlocks(editor.document, props.initial.length ? props.initial : empty);
      published.current = value.content;
      loading.current = false;
    }
  }, [editor, props.initial, props.blank, value.content, value.title, onChange, disabled]);
  const items = getDefaultReactSlashMenuItems(editor);
  return <div className="space-y-4">
    <EditorTitle {...props} />
    <ProductEditorControls locale={locale} disabled={disabled}
      blockMenuOpen={open} onBlockMenuOpenChange={setOpen}
      actions={[
        { id: "bold", label: l("Bold", "Negrita"), active: styles.bold, onSelect: () => { editor.focus(); editor.toggleStyles({ bold: true }); } },
        { id: "italic", label: l("Italic", "Cursiva"), active: styles.italic, onSelect: () => { editor.focus(); editor.toggleStyles({ italic: true }); } },
        { id: "undo", label: l("Undo", "Deshacer"), onSelect: () => { editor.focus(); editor.undo(); } },
        { id: "redo", label: l("Redo", "Rehacer"), onSelect: () => { editor.focus(); editor.redo(); } },
      ]}
      blockCommands={items.map((item) => ({
        id: item.title, label: item.title, description: item.subtext, icon: item.icon,
        onSelect: () => { editor.focus(); item.onItemClick(); },
      }))} />
    <BlockNoteViewRaw editor={editor} editable={!disabled} theme={appearance.theme}
      formattingToolbar={false} slashMenu={false} sideMenu={false}
      linkToolbar={false} filePanel={false} tableHandles={false} emojiPicker={false}
      className="rounded-xl border border-border bg-surface p-3 text-foreground"
      onChange={publish}
      onSelectionChange={() => {
        const active = editor.getActiveStyles();
        setStyles({ bold: !!active.bold, italic: !!active.italic });
      }}>
      <SuggestionMenuController triggerCharacter="/"
        getItems={async (query) => items.filter((item) =>
          `${item.title} ${item.aliases?.join(" ") ?? ""}`.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)))}
        suggestionMenuComponent={(menu) => <ProductEditorBlockCommands locale={locale}
          selectedIndex={menu.selectedIndex}
          commands={menu.items.map((item) => ({
            id: item.title, label: item.title, description: item.subtext, icon: item.icon,
            disabled: disabled || !menu.onItemClick,
            onSelect: () => menu.onItemClick?.(item),
          }))} />} />
    </BlockNoteViewRaw>
  </div>;
}
export default function BlockNoteDocumentEditor(props: EditorProps) {
  const decoded = nativeContent(props.value, isBlockNote, empty);
  if ("error" in decoded) return <CorrectionEditor {...props} />;
  return <NativeEditorBoundary editor={props}>
    <BlockNoteSession {...props} initial={decoded.content} blank={decoded.blank} />
  </NativeEditorBoundary>;
}
```

```tsx filename="blocknote-workbench.tsx"
"use client";
import dynamic from "next/dynamic";
import { ProductIntegrationWorkbench, type ProductIntegrationWorkbenchProps } from "@/components/integrations/product-workbench";
const BlockNoteDocumentEditor = dynamic(() => import("./blocknote-editor"), { ssr: false });
export function ConnectedBlockNoteDocuments(props: Omit<ProductIntegrationWorkbenchProps, "renderEditor">) {
  return <ProductIntegrationWorkbench {...props} renderEditor={(editorProps) =>
    <BlockNoteDocumentEditor key={`${editorProps.value.id}:${editorProps.value.revision}`} {...editorProps} />} />;
}
```

Lexical and BlockNote recipes stay JSON-only. A loaded incompatible nonblank
payload remains in the correction view rather than becoming a new blank
document. The consumer can register additional supported nodes/extensions
deliberately and validate that schema on its backend. BlockNote's default core
blocks do not establish file upload connectivity; supply an authorized
`uploadFile` callback and the corresponding file UI only if your application
supports those actions.

## Compile receipt and verification scope

Validation uses an isolated temporary pnpm application, the exact SDK pins
above, Next.js `16.4.2`, React/React DOM `19.3.1` and TypeScript `5.9.3`. It compiles these code
blocks against the actual exported workbench props and shared controls with
`strict: true`, `noEmit: true`, `moduleResolution: "Bundler"` and
`skipLibCheck: true` (application code is checked; third-party declaration
internals are not rechecked). No SDK is added to Aureform's root dependencies.

Completed on 2026-10-20:

| Check | Result |
| --- | --- |
| All five copied TSX files, real public slot props and shared controls | **PASS**, zero TypeScript diagnostics |
| Shared controls lint | **PASS**, zero errors/warnings |
| Tiptap `onUpdate`, `getJSON()` → `setContent()` → `getJSON()` | **PASS**, payload and text preserved |
| Lexical update listener, `toJSON()` → `parseEditorState()` → `toJSON()` | **PASS**, payload and text preserved |
| BlockNote ESM `onChange`, `document` → `replaceBlocks()` → `document` | **PASS**, payload, native block IDs and text preserved |

The serialization checks use local jsdom fixtures with network access disabled.
Their data contains ordinary paragraphs/formatting and returned coordinates,
not account credentials. Reproduce the editor checks and the optional native
Mapbox example from the checkout with Node >=22.12, pnpm 10 and its normal
dependencies installed:

```sh
node scripts/verify-optional-bindings.mjs
```

Use `--write-receipt` to regenerate
[the public validation receipt](./optional-binding-validation.json), or `--keep`
to inspect the temporary files. The script copies the exact
[optional package manifest](../../scripts/optional-bindings/package.json) and
[frozen lockfile](../../scripts/optional-bindings/pnpm-lock.yaml) into a new OS
temporary directory. SDK dependencies are installed there from the public npm
registry with lifecycle scripts disabled and isolated empty npm configuration.
It does not add optional SDKs to the application's dependencies.

All six TSX payloads use their real SDK and Aureform imports with `strict: true`
and `noEmit: true`, without ambient stubs. The consumer-code project uses
`skipLibCheck: true`, as in the initial editor validation, because BlockNote
exports optional Yjs declarations whose library internals are not part of this
check. A separate Mapbox-only project uses `skipLibCheck: false`. Both settings
are explicit in the receipt, which records exact installed versions,
parsed package licenses, package/declaration hashes, source hashes, compiler
settings and four local round-trips. The Mapbox round-trip covers its actual
coordinate/bounds classes and GeoJSON serialization without initializing a map
or making tile requests.

This receipt covers optional bindings and local serialization checks. It is not
browser certification of these examples, native-provider certification, authenticated connectivity, Figma verification
or a shared application build.
