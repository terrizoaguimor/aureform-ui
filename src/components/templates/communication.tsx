"use client";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  Plus,
  Inbox,
  Send,
  Archive,
  Star,
  FileEdit,
  Reply,
  MoreHorizontal,
  Trash2,
  ArrowLeft,
  Hash,
  Smile,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  mailSeed,
  chatSeed,
  type MailRecord,
  type ChatRecord,
} from "@/demo/application-data";
import {
  demoAvatarSources,
  getDemoChatAuthorAvatarSrc,
  getDemoFixtureAvatarSrc,
  getDemoMailSenderAvatarSrc,
} from "@/demo/avatar-assets";
import { useLanguage } from "@/hooks/use-language";
import { useDemoStore } from "@/hooks/use-demo-store";
import { PageHeading } from "@/components/blocks/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Empty } from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/templates/data-manager";
import { cn, downloadText } from "@/lib/utils";
type DemoMailRecord = MailRecord & { senderAvatarSrc?: string };
type DemoChatRecord = ChatRecord & { authorAvatarSrc?: string };

export function MailTemplate() {
  const { l, common: t, date } = useLanguage(),
    [messages, setMessages] = useDemoStore<DemoMailRecord[]>("mail", mailSeed);
  const [folder, setFolder] = useState("inbox"),
    [query, setQuery] = useState(""),
    [selectedId, setSelectedId] = useState<string | null>("mail-1"),
    [compose, setCompose] = useState(false),
    [draft, setDraft] = useState<{
      to: string;
      subject: string;
      body: string;
      id?: string;
    }>({ to: "", subject: "", body: "" }),
    [removing, setRemoving] = useState<string | null>(null);
  const folders = [
    { id: "inbox", label: l("Inbox", "Entrada"), icon: Inbox },
    { id: "starred", label: l("Starred", "Destacados"), icon: Star },
    { id: "sent", label: l("Sent", "Enviados"), icon: Send },
    { id: "drafts", label: l("Drafts", "Borradores"), icon: FileEdit },
    { id: "archive", label: l("Archive", "Archivo"), icon: Archive },
  ];
  const visible = messages
    .filter(
      (message) =>
        (folder === "starred" ? message.starred : message.folder === folder) &&
        (!query ||
          `${message.from} ${message.subject} ${message.body}`
            .toLowerCase()
            .includes(query.toLowerCase())),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const selected = messages.find(
    (message) =>
      message.id === selectedId &&
      visible.some((item) => item.id === message.id),
  );
  const openMessage = (message: MailRecord) => {
    setSelectedId(message.id);
    setMessages((previous) =>
      previous.map((item) =>
        item.id === message.id ? { ...item, read: true } : item,
      ),
    );
  };
  const newMessage = () => {
    setDraft({ to: "", subject: "", body: "" });
    setCompose(true);
  };
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l(
          "Keep every conversation considered",
          "Cuida cada conversación",
        )}
        title={l("A good place to connect.", "Un buen lugar para conectar.")}
        description={l(
          "Read, reply and organize your local demo messages.",
          "Lee, responde y organiza tus mensajes de demostración.",
        )}
        actions={
          <Button size="sm" onClick={newMessage}>
            <Plus />
            {l("Compose", "Redactar")}
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="grid min-h-[640px] xl:grid-cols-[160px_320px_minmax(0,1fr)]">
          <nav
            aria-label={l("Mail folders", "Carpetas de correo")}
            className="flex gap-1 overflow-x-auto border-b border-border p-3 xl:flex-col xl:border-r xl:border-b-0"
          >
            {folders.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFolder(item.id);
                  setSelectedId(null);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-[11px] font-medium",
                  folder === item.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-surface-subtle",
                )}
                aria-current={folder === item.id ? "page" : undefined}
              >
                <item.icon className="size-3.5" />
                {item.label}
                {item.id === "inbox" && (
                  <span className="ml-auto text-[10px]">
                    {
                      messages.filter(
                        (message) =>
                          message.folder === "inbox" && !message.read,
                      ).length
                    }
                  </span>
                )}
              </button>
            ))}
            <p className="mt-auto hidden px-3 py-4 text-[9px] leading-5 text-muted-foreground xl:block">
              {l(
                "Local preview. No email is delivered.",
                "Vista local. No se envían correos.",
              )}
            </p>
          </nav>
          <div
            className={cn(
              "border-border xl:border-r",
              selected && "hidden xl:block",
            )}
          >
            <div className="relative border-b border-border p-4">
              <Search className="absolute left-7 top-7 size-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={l("Search messages…", "Buscar mensajes…")}
                aria-label={l("Search messages", "Buscar mensajes")}
                className="h-9 pl-9"
              />
            </div>
            <div className="max-h-[620px] overflow-y-auto">
              {visible.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => openMessage(message)}
                  className={cn(
                    "block w-full border-b border-border p-5 text-left outline-none hover:bg-accent/30 focus-visible:bg-accent/40",
                    selected?.id === message.id && "bg-accent/35",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-xs",
                        message.read ? "font-medium" : "font-bold",
                      )}
                    >
                      {message.from}
                    </span>
                    <span className="shrink-0 text-[9px] text-muted-foreground">
                      {date(message.date, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "truncate text-[11px]",
                      !message.read && "font-semibold",
                    )}
                  >
                    {message.subject}
                  </p>
                  <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-muted-foreground">
                    {message.body}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {!message.read && (
                      <span className="size-1.5 rounded-full bg-primary" />
                    )}
                    {message.starred && (
                      <Star className="size-3 fill-warning-foreground text-warning-foreground" />
                    )}
                  </div>
                </button>
              ))}
              {!visible.length && (
                <Empty
                  title={l(
                    "A little quiet here.",
                    "Un poco de calma por aquí.",
                  )}
                  description={
                    query
                      ? t("noMatch")
                      : l(
                          "No messages in this folder.",
                          "No hay mensajes en esta carpeta.",
                        )
                  }
                />
              )}
            </div>
          </div>
          <div className={cn("min-w-0", !selected && "hidden xl:block")}>
            {selected ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="xl:hidden"
                    aria-label={l("Back to messages", "Volver a mensajes")}
                    onClick={() => setSelectedId(null)}
                  >
                    <ArrowLeft />
                  </Button>
                  <span className="text-[10px] text-muted-foreground">
                    {l("Message details", "Detalles del mensaje")}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={
                        selected.starred
                          ? l("Remove star", "Quitar destacado")
                          : l("Star message", "Destacar mensaje")
                      }
                      onClick={() =>
                        setMessages((previous) =>
                          previous.map((message) =>
                            message.id === selected.id
                              ? { ...message, starred: !message.starred }
                              : message,
                          ),
                        )
                      }
                    >
                      <Star
                        className={
                          selected.starred
                            ? "fill-warning-foreground text-warning-foreground"
                            : ""
                        }
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={l("Archive message", "Archivar mensaje")}
                      disabled={selected.folder === "archive"}
                      onClick={() => {
                        setMessages((previous) =>
                          previous.map((message) =>
                            message.id === selected.id
                              ? { ...message, folder: "archive" }
                              : message,
                          ),
                        );
                        setSelectedId(null);
                        toast.success(
                          l("Message archived", "Mensaje archivado"),
                        );
                      }}
                    >
                      <Archive />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={l(
                              "Message actions",
                              "Acciones de mensaje",
                            )}
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setMessages((previous) =>
                              previous.map((message) =>
                                message.id === selected.id
                                  ? { ...message, read: !message.read }
                                  : message,
                              ),
                            );
                          }}
                        >
                          {selected.read
                            ? l("Mark unread", "Marcar sin leer")
                            : l("Mark read", "Marcar leído")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const exported = { ...selected };
                            delete exported.senderAvatarSrc;
                            downloadText(
                              "message.json",
                              JSON.stringify(exported, null, 2),
                              "application/json",
                            );
                          }}
                        >
                          <Download />
                          {t("export")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onClick={() => setRemoving(selected.id)}
                        >
                          <Trash2 />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <article className="flex-1 px-6 py-7 sm:px-8">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {selected.subject}
                  </h2>
                  <div className="mt-5 flex items-center gap-3">
                    <Avatar
                      name={selected.from}
                      src={
                        selected.senderAvatarSrc ??
                        getDemoMailSenderAvatarSrc(selected.id)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">
                        {selected.from}
                        <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                          &lt;{selected.email}&gt;
                        </span>
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {date(selected.date, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="mt-8 whitespace-pre-wrap text-[13px] leading-8">
                    {selected.body}
                  </p>
                </article>
                <div className="border-t border-border p-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDraft(
                        selected.folder === "drafts"
                          ? {
                              to: selected.email,
                              subject: selected.subject,
                              body: selected.body,
                              id: selected.id,
                            }
                          : {
                              to: selected.email,
                              subject: `Re: ${selected.subject}`,
                              body: "",
                            },
                      );
                      setCompose(true);
                    }}
                  >
                    <Reply />
                    {selected.folder === "drafts"
                      ? l("Edit draft", "Editar borrador")
                      : l("Reply locally", "Responder en la demo")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <Empty
                  title={l(
                    "A conversation starts here.",
                    "Una conversación empieza aquí.",
                  )}
                  description={l(
                    "Choose a message or make room for a new one.",
                    "Elige un mensaje o comienza uno nuevo.",
                  )}
                  action={
                    <Button variant="outline" size="sm" onClick={newMessage}>
                      {l("Compose", "Redactar")}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </Card>
      <p className="text-[10px] text-muted-foreground">
        {l(
          "Messages and drafts stay in this browser. Nothing is sent to an email service.",
          "Los mensajes y borradores se guardan en este navegador. No se envían a un servicio de correo.",
        )}
      </p>
      <MailComposer
        key={`${compose}-${draft.id}-${draft.subject}`}
        open={compose}
        onOpenChange={setCompose}
        initial={draft}
        onSave={(values, isDraft) => {
          const message: DemoMailRecord = {
            id: draft.id ?? crypto.randomUUID(),
            from: "Alex Morgan",
            senderAvatarSrc: demoAvatarSources["alex-morgan"],
            email: values.to,
            subject: values.subject,
            body: values.body,
            date: new Date().toISOString(),
            read: true,
            starred: false,
            folder: isDraft ? "drafts" : "sent",
          };
          setMessages((previous) =>
            draft.id
              ? previous.map((item) => (item.id === draft.id ? message : item))
              : [message, ...previous],
          );
          setCompose(false);
          setFolder(isDraft ? "drafts" : "sent");
          setSelectedId(message.id);
          toast.success(
            isDraft
              ? l("Draft saved", "Borrador guardado")
              : l(
                  "Saved to demo sent folder",
                  "Guardado en enviados de la demo",
                ),
          );
        }}
      />
      <DeleteDialog
        open={!!removing}
        onOpenChange={(v) => {
          if (!v) setRemoving(null);
        }}
        count={1}
        onDelete={() => {
          setMessages((previous) =>
            previous.filter((message) => message.id !== removing),
          );
          setRemoving(null);
          setSelectedId(null);
        }}
      />
    </div>
  );
}
function MailComposer({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: { to: string; subject: string; body: string };
  onSave: (
    values: { to: string; subject: string; body: string },
    draft: boolean,
  ) => void;
}) {
  const { l, common: t } = useLanguage(),
    [savingDraft, setSavingDraft] = useState(false);
  const schema = z.object({
    to: z.email(
      l(
        "Enter a valid recipient email.",
        "Escribe un correo de destinatario válido.",
      ),
    ),
    subject: z
      .string()
      .trim()
      .min(2, l("Enter a subject.", "Escribe un asunto."))
      .max(160),
    body: z
      .string()
      .trim()
      .min(1, l("Write a message.", "Escribe un mensaje."))
      .max(10000),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" closeLabel={t("close")}>
        <DialogTitle>
          {l("A considered message", "Un mensaje cuidado")}
        </DialogTitle>
        <DialogDescription>
          {l(
            "This composer saves local examples. No email is sent.",
            "El editor guarda ejemplos locales. No se envían correos.",
          )}
        </DialogDescription>
        <form
          onSubmit={form.handleSubmit((values) => onSave(values, savingDraft))}
          className="mt-5 grid gap-4"
        >
          <Field
            label={l("To", "Para")}
            error={form.formState.errors.to?.message}
          >
            <Input type="email" {...form.register("to")} />
          </Field>
          <Field
            label={l("Subject", "Asunto")}
            error={form.formState.errors.subject?.message}
          >
            <Input {...form.register("subject")} maxLength={160} />
          </Field>
          <Field
            label={l("Message", "Mensaje")}
            error={form.formState.errors.body?.message}
          >
            <Textarea
              className="min-h-52"
              {...form.register("body")}
              maxLength={10000}
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="outline"
              onClick={() => setSavingDraft(true)}
            >
              {l("Save draft", "Guardar borrador")}
            </Button>
            <Button type="submit" onClick={() => setSavingDraft(false)}>
              <Send />
              {l("Save demo reply", "Guardar respuesta de ejemplo")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function ChatTemplate() {
  const { l, common: t } = useLanguage(),
    [messages, setMessages] = useDemoStore<DemoChatRecord[]>("chat", chatSeed);
  const [room, setRoom] = useState("general"),
    [body, setBody] = useState(""),
    [search, setSearch] = useState(""),
    [newRoom, setNewRoom] = useState(false),
    [roomName, setRoomName] = useState(""),
    [extraRooms, setExtraRooms] = useDemoStore<string[]>("chat-rooms", []),
    [roomError, setRoomError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const rooms = ["general", "design", "engineering", ...extraRooms];
  const visible = messages.filter(
    (message) =>
      message.room === room &&
      (!search ||
        `${message.author} ${message.body}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  useEffect(() => {
    if (scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, room]);
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        room,
        author: "Alex Morgan",
        authorAvatarSrc: demoAvatarSources["alex-morgan"],
        body: body.trim(),
        time: new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Bogota",
        }).format(new Date()),
      },
    ]);
    setBody("");
  };
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l(
          "Good work is a shared conversation",
          "El buen trabajo se conversa",
        )}
        title={l("A little closer, together.", "Un poco más cerca, juntos.")}
        description={l(
          "A calm place for your team’s local demo conversations.",
          "Un lugar tranquilo para las conversaciones de ejemplo del equipo.",
        )}
        actions={
          <Button size="sm" variant="outline" onClick={() => setNewRoom(true)}>
            <Plus />
            {l("New channel", "Nuevo canal")}
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="grid min-h-[670px] md:grid-cols-[200px_minmax(0,1fr)]">
          <nav
            aria-label={l("Chat channels", "Canales de chat")}
            className="flex gap-1 overflow-x-auto border-b border-border bg-surface-subtle/35 p-4 md:flex-col md:border-r md:border-b-0"
          >
            <p className="mb-3 hidden px-3 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground md:block">
              {l("Channels", "Canales")}
            </p>
            {rooms.map((name) => (
              <button
                type="button"
                key={name}
                onClick={() => {
                  setRoom(name);
                  setSearch("");
                }}
                aria-current={name === room ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-xs",
                  name === room
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-surface-subtle",
                )}
              >
                <Hash className="size-3.5" />
                {name}
              </button>
            ))}
            <div className="mt-auto hidden border-t border-border px-3 pt-6 md:block">
              <p className="mb-3 text-[9px] font-semibold tracking-widest text-muted-foreground">
                {l("YOUR PEOPLE", "TU EQUIPO")}
              </p>
              {["Alex Morgan", "Isabel Torres", "Leo Martin", "Noor Ahmed"].map(
                (name) => (
                  <div key={name} className="mb-3 flex items-center gap-2">
                    <Avatar
                      size="sm"
                      name={name}
                      src={getDemoFixtureAvatarSrc(name)}
                    />
                    <span className="text-[10px]">{name}</span>
                    <span
                      role="img"
                      aria-label={l(
                        "Demo availability",
                        "Disponibilidad de ejemplo",
                      )}
                      className="ml-auto size-1.5 rounded-full bg-primary"
                    />
                  </div>
                ),
              )}
            </div>
          </nav>
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Hash className="size-4 text-muted-foreground" />
                {room}
                <Badge variant="outline">Demo</Badge>
              </h2>
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={l(
                    "Search conversation",
                    "Buscar en la conversación",
                  )}
                  placeholder={l("Find a message…", "Buscar un mensaje…")}
                  className="h-8 pl-8 text-[11px]"
                />
              </div>
            </div>
            <div
              ref={scroller}
              className="h-[470px] flex-1 overflow-y-auto px-5 py-7 sm:px-8"
              aria-label={l("Messages", "Mensajes")}
            >
              <p className="mb-7 text-center text-[9px] text-muted-foreground">
                {l(
                  "A new shared direction starts here.",
                  "Una nueva dirección compartida empieza aquí.",
                )}
              </p>
              {visible.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "mb-6 flex items-start gap-3",
                    message.author === "Alex Morgan" && "flex-row-reverse",
                  )}
                >
                  <Avatar
                    name={message.author}
                    src={
                      message.authorAvatarSrc ??
                      getDemoChatAuthorAvatarSrc(message.id)
                    }
                    size="sm"
                  />
                  <div
                    className={cn(
                      "min-w-0 max-w-[85%]",
                      message.author === "Alex Morgan" && "text-right",
                    )}
                  >
                    <p className="mb-2 text-[10px]">
                      <span className="font-semibold">{message.author}</span>
                      <span className="ml-2 text-[9px] text-muted-foreground">
                        {message.time}
                      </span>
                    </p>
                    <p
                      className={cn(
                        "rounded-xl px-4 py-3 text-left text-xs leading-7",
                        message.author === "Alex Morgan"
                          ? "rounded-tr-sm bg-accent text-accent-foreground"
                          : "rounded-tl-sm bg-surface-subtle",
                      )}
                    >
                      {message.body}
                    </p>
                  </div>
                </article>
              ))}
              {!visible.length && (
                <Empty
                  title={
                    search
                      ? t("empty")
                      : l(
                          "Make room for a conversation.",
                          "Dale espacio a una conversación.",
                        )
                  }
                  description={
                    search
                      ? t("noMatch")
                      : l(
                          "Write the first message below.",
                          "Escribe el primer mensaje.",
                        )
                  }
                />
              )}
            </div>
            <form onSubmit={send} className="border-t border-border p-4">
              <label htmlFor="chat-message" className="sr-only">
                {l("Message", "Mensaje")}
              </label>
              <Textarea
                id="chat-message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={l(`Message #${room}…`, `Mensaje para #${room}…`)}
                maxLength={4000}
                className="min-h-20 resize-none border-0 shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    if (body.trim()) send(e);
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={l("Add a smile", "Añadir una sonrisa")}
                    onClick={() => setBody((previous) => previous + " 🙂")}
                  >
                    <Smile />
                  </Button>
                  <span className="text-[9px] text-muted-foreground">
                    {l(
                      "Enter to send · Shift + Enter for a new line",
                      "Enter para enviar · Mayús + Enter para una nueva línea",
                    )}
                  </span>
                </div>
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={!body.trim()}
                  aria-label={l("Send local message", "Enviar mensaje local")}
                >
                  <Send />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Card>
      <p className="text-[10px] text-muted-foreground">
        {l(
          "Local messages, no real-time service. Connect your own messaging adapter for a shared team workspace.",
          "Mensajes locales, sin servicio en tiempo real. Conecta tu adaptador para un espacio de equipo compartido.",
        )}
      </p>
      <Dialog open={newRoom} onOpenChange={setNewRoom}>
        <DialogContent closeLabel={t("close")}>
          <DialogTitle>
            {l("A new space to connect", "Un nuevo espacio para conectar")}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Create a channel in this local demo.",
              "Crea un canal en esta demo local.",
            )}
          </DialogDescription>
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              const name = roomName.trim().toLowerCase();
              if (!/^[a-z0-9-]{2,40}$/.test(name) || rooms.includes(name)) {
                setRoomError(
                  l(
                    "Use a unique name with 2–40 letters, numbers or hyphens.",
                    "Usa un nombre único de 2 a 40 letras, números o guiones.",
                  ),
                );
                return;
              }
              setExtraRooms((previous) => [...previous, name]);
              setRoom(name);
              setNewRoom(false);
              setRoomName("");
              setRoomError("");
            }}
          >
            <Field
              label={l("Channel name", "Nombre del canal")}
              error={roomError}
            >
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="product-notes"
                maxLength={40}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewRoom(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit">
                {l("Create channel", "Crear canal")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
