"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  RefreshCw,
  Reply,
  Save,
  Send,
  Users,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useIntegrationOperation } from "@/hooks/use-integration-operation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  IntegrationAction,
  IntegrationDocument,
  IntegrationRecord,
  IntegrationUpdate,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import type { ProductEditorRenderer } from "./product-document";
import {
  findProductAction,
  invalidProductField,
  mergeProductRecords,
  productActionValues,
  productScopeKey,
} from "./product-model";
import { startProductSubscription } from "./product-subscription";
import {
  productCollaborationAuthor,
  productCollaborationPublishValues,
  productCollaborationRecords,
  productPresenceAvatarUrl,
  productPresenceRecords,
  productReplyIsCurrent,
  productReportedConversation,
  productSupportsReplies,
  type ProductReportedMessage,
  type ProductReplyTarget,
} from "./product-collaboration-model";
import {
  ProductActionUnavailable,
  ProductDate,
  ProductDocumentPreview,
  ProductEmpty,
  ProductFields,
  ProductLabeledTextarea,
  ProductOperationFeedback,
  ProductPanel,
  ProductRecordList,
  ProductResourcePicker,
  ProductResult,
  ProductReview,
  ProductStatus,
  ProductValidation,
  useProductResources,
} from "./product-ui";

export type ProductCollaborationUpdate =
  | IntegrationUpdate
  | { kind: "records"; records: IntegrationRecord[]; cursor?: string }
  | { kind: "presence"; records: IntegrationRecord[] }
  | { kind: "document"; document: IntegrationDocument }
  | { kind: "connection"; state: "connected" | "reconnecting" | "closed" };

export type ProductCollaborationSubscription = {
  integrationId: string;
  connectionId: string;
  workspaceId: string;
  resourceId: string;
  resumeCursor?: string;
  signal: AbortSignal;
  onUpdate: (update: ProductCollaborationUpdate) => void;
  onError: () => void;
};
/** Return a cleanup function; credentials and provider transports stay with the consumer. */
export type ProductCollaborationSubscribe = (
  request: ProductCollaborationSubscription,
) => (() => void) | Promise<() => void>;

export function ProductCollaborationWorkbench(
  props: IntegrationWorkbenchProps & {
    subscribe?: ProductCollaborationSubscribe;
    renderEditor?: ProductEditorRenderer;
  },
) {
  const { l, locale } = useLanguage();
  const read = useIntegrationOperation(props);
  const write = useIntegrationOperation(props);
  const readRun = read.run;
  const readCancel = read.cancel;
  const writeCancel = write.cancel;
  const resources = useProductResources(props);
  const queryAction = findProductAction(props.definition, "query");
  const publishAction = findProductAction(props.definition, "publish-message");
  const saveAction = findProductAction(props.definition, "save-document");
  const checkpointAction = findProductAction(props.definition, "checkpoint");
  const [resourceId, setResourceId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [records, setRecords] = useState<IntegrationRecord[]>([]);
  const [presence, setPresence] = useState<IntegrationRecord[]>([]);
  const [selectedThread, setSelectedThread] = useState("");
  const [reply, setReply] = useState<ProductReplyTarget | null>(null);
  const [message, setMessage] = useState("");
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const [extra, setExtra] = useState<IntegrationValues>({});
  const [base, setBase] = useState<IntegrationDocument | null>(null);
  const [draft, setDraft] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftFormat, setDraftFormat] =
    useState<IntegrationDocument["format"]>("markdown");
  const [remote, setRemote] = useState<IntegrationDocument | null>(null);
  const [cursor, setCursor] = useState("");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [follow, setFollow] = useState(false);
  const [streamState, setStreamState] = useState("idle");
  const [streamError, setStreamError] = useState(false);
  const [scopeStale, setScopeStale] = useState(false);
  const [streamEpoch, setStreamEpoch] = useState(0);
  const [review, setReview] = useState<{
    action: IntegrationAction;
    values: IntegrationValues;
    resourceId: string;
    reply?: ProductReplyTarget;
  } | null>(null);
  const [watermark, setWatermark] = useState("");
  const roomScope = useMemo(
    () => ({
      resourceId,
      connectionId: props.connection.id,
      workspaceId: props.scope.workspaceId,
      integrationId: props.definition.id,
    }),
    [
      resourceId,
      props.connection.id,
      props.scope.workspaceId,
      props.definition.id,
    ],
  );
  const conversation = useMemo(
    () => productReportedConversation(records, roomScope),
    [records, roomScope],
  );
  const current = useRef({
    resourceId,
    scopeStale,
    base,
    draft,
    draftTitle,
    draftFormat,
    cursor,
    lastUpdate,
    watermark,
    busy: false,
  });
  useEffect(() => {
    current.current = {
      resourceId,
      scopeStale,
      base,
      draft,
      draftTitle,
      draftFormat,
      cursor,
      lastUpdate,
      watermark,
      busy: read.pending || write.pending,
    };
  }, [
    resourceId,
    scopeStale,
    base,
    draft,
    draftTitle,
    draftFormat,
    cursor,
    lastUpdate,
    watermark,
    read.pending,
    write.pending,
  ]);

  const receive = useCallback(
    (update: ProductCollaborationUpdate, connectionWide = false) => {
      if (
        current.current.scopeStale ||
        current.current.resourceId !== resourceId
      )
        return;
      if (update.kind === "connection") {
        setStreamState(
          "connection" in update
            ? update.connection.status === "connected"
              ? "connected"
              : "closed"
            : update.state,
        );
        return;
      }
      if (update.kind === "result") {
        if (update.result.kind === "records") update = update.result;
        else if (update.result.kind === "record")
          update = { kind: "records", records: [update.result.record] };
        else if (update.result.kind === "document") update = update.result;
        else return;
      }
      if (update.kind === "records") {
        const scoped = productCollaborationRecords(
          update.records,
          roomScope,
          connectionWide,
        );
        if (update.records.length && !scoped.length) return;
        update = { ...update, records: scoped };
      }
      if (update.kind === "presence" && "records" in update) {
        const scoped = productCollaborationRecords(update.records, roomScope);
        if (update.records.length && !scoped.length) return;
        update = { ...update, records: scoped };
      }
      setLastUpdate(new Date().toISOString());
      setStreamState("connected");
      if (update.kind === "presence") {
        if ("members" in update)
          setPresence(productPresenceRecords(update.members));
        else
          setPresence((items) =>
            mergeProductRecords(items, update.records).slice(-1000),
          );
      }
      if (update.kind === "records") {
        setRecords((items) =>
          mergeProductRecords(
            items,
            update.records.filter(
              (record) => !["presence", "participant"].includes(record.type),
            ),
          ).slice(-100),
        );
        setPresence((items) =>
          mergeProductRecords(
            items,
            update.records.filter((record) =>
              ["presence", "participant"].includes(record.type),
            ),
          ).slice(-1000),
        );
        if (update.cursor !== undefined) setCursor(update.cursor);
        const timestamps = update.records
          .map((record) => record.updatedAt)
          .filter((value) => Number.isFinite(Date.parse(value)))
          .sort((a, b) => Date.parse(b) - Date.parse(a));
        if (timestamps[0])
          setWatermark((previous) =>
            !previous || Date.parse(timestamps[0]) > Date.parse(previous)
              ? timestamps[0]
              : previous,
          );
      }
      if (update.kind === "document") {
        const previous = current.current.base;
        if (previous && previous.id !== update.document.id) return;
        if (
          previous?.id === update.document.id &&
          previous.revision > update.document.revision
        )
          return;
        if (
          previous &&
          (current.current.draft !== previous.content ||
            current.current.draftTitle !== previous.title ||
            current.current.draftFormat !== previous.format)
        )
          setRemote(update.document);
        else {
          setBase(update.document);
          setDraft(update.document.content);
          setDraftTitle(update.document.title);
          setDraftFormat(update.document.format);
          current.current.base = update.document;
          current.current.draft = update.document.content;
          current.current.draftTitle = update.document.title;
          current.current.draftFormat = update.document.format;
        }
      }
    },
    [resourceId, roomScope],
  );

  const load = useCallback(
    async (view = "messages") => {
      if (!queryAction || current.current.busy || scopeStale) return;
      const result = await readRun(
        queryAction,
        productActionValues(
          queryAction,
          {
            ...extra,
            view,
            cursor: current.current.cursor,
            since: current.current.watermark,
            documentId: current.current.base?.id || extra.documentId || "",
          },
          resourceId,
        ),
      );
      if (result?.kind === "records") receive(result);
      else if (result?.kind === "document") receive(result);
    },
    [queryAction, readRun, extra, resourceId, receive, scopeStale],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    setNow(Date.now());
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!follow || props.subscribe || props.adapter.subscribe || scopeStale)
      return;
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15_000);
    return () => clearInterval(timer);
  }, [follow, props.subscribe, props.adapter.subscribe, load, scopeStale]);

  useEffect(() => {
    if (
      (!props.subscribe && !props.adapter.subscribe) ||
      !follow ||
      !props.connection.resourceIds.includes(resourceId) ||
      scopeStale
    )
      return;
    setStreamState("connecting");
    setStreamError(false);
    return startProductSubscription<ProductCollaborationUpdate>(
      (listener, signal) => {
        if (props.subscribe)
          return props.subscribe({
            integrationId: props.definition.id,
            connectionId: props.connection.id,
            workspaceId: props.scope.workspaceId,
            resourceId,
            resumeCursor: current.current.cursor || undefined,
            signal,
            onUpdate: listener,
            onError: () => {
              if (!signal.aborted) {
                setStreamError(true);
                setStreamState("reconnecting");
              }
            },
          });
        return props.adapter.subscribe!(props.connection.id, listener, {
          workspaceId: props.scope.workspaceId,
          signal,
        });
      },
      {
        signal: props.scope.signal,
        onUpdate: (update) => {
          if (update.kind === "connection" && "connection" in update) {
            if (
              update.connection.id !== props.connection.id ||
              update.connection.workspaceId !== props.scope.workspaceId ||
              update.connection.integrationId !== props.definition.id
            )
              return;
            if (
              productScopeKey({ ...props, connection: update.connection }) !==
              productScopeKey(props)
            ) {
              current.current.scopeStale = true;
              setScopeStale(true);
              setFollow(false);
              setPresence([]);
              setReply(null);
              setReview(null);
              readCancel();
              writeCancel();
              return;
            }
          }
          receive(update, !props.subscribe);
        },
        onError: () => {
          setStreamError(true);
          setStreamState("reconnecting");
        },
      },
    );
  }, [
    props,
    resourceId,
    receive,
    follow,
    streamEpoch,
    scopeStale,
    readCancel,
    writeCancel,
  ]);

  function stage(
    action: IntegrationAction | undefined,
    values: IntegrationValues,
  ) {
    if (!action || scopeStale || current.current.scopeStale || write.pending)
      return;
    const prepared =
      action.kind === "publish-message"
        ? productCollaborationPublishValues({
            action,
            extra,
            message,
            conversation,
            reply,
          })
        : productActionValues(action, { ...extra, ...values }, resourceId);
    if (prepared && !invalidProductField(action, prepared))
      setReview({
        action,
        values: prepared,
        resourceId,
        ...(action.kind === "publish-message" && reply ? { reply } : {}),
      });
  }
  async function submit() {
    if (
      !review ||
      scopeStale ||
      current.current.scopeStale ||
      review.resourceId !== resourceId ||
      (review.reply && !productReplyIsCurrent(conversation, review.reply))
    )
      return;
    const result = await write.run(review.action, review.values);
    if (!result) return;
    if (result.kind === "record")
      receive({ kind: "records", records: [result.record] });
    if (result.kind === "document") {
      setBase(result.document);
      setDraft(result.document.content);
      setDraftTitle(result.document.title);
      setDraftFormat(result.document.format);
      setRemote(null);
    }
    if (review.action.kind === "publish-message") {
      setMessage("");
      setReply(null);
      setSelectedThread(review.reply?.threadId ?? "");
    }
    setReview(null);
  }
  const stale = lastUpdate && now - Date.parse(lastUpdate) > 45_000;
  const messageValues = productCollaborationPublishValues({
    action: publishAction,
    extra,
    message,
    conversation,
    reply,
  });
  const canPublish =
    !!publishAction &&
    (publishAction.requiredPermissions ?? []).every((id) =>
      props.connection.grantedPermissions.includes(id),
    );
  const canReply = canPublish && productSupportsReplies(publishAction);
  const replyCurrent = !reply || productReplyIsCurrent(conversation, reply);
  const reviewCurrent =
    !review ||
    (review.resourceId === resourceId &&
      (!review.reply || productReplyIsCurrent(conversation, review.reply)));
  const replyMessage = reply
    ? conversation.messages.find(
        (item) =>
          item.record.id === reply.parentId && item.threadId === reply.threadId,
      )
    : undefined;
  const visibleThreads = selectedThread
    ? conversation.threads.filter((thread) => thread.id === selectedThread)
    : conversation.threads;
  const documentValues = productActionValues(
    saveAction,
    {
      ...extra,
      documentId: base?.id ?? "",
      id: base?.id ?? "",
      title: draftTitle,
      content: draft,
      format: draftFormat,
      revision: base?.revision ?? 0,
      expectedRevision: base?.revision ?? 0,
    },
    resourceId,
  );
  let validDocument = true;
  if (draftFormat === "json") {
    try {
      JSON.parse(draft);
    } catch {
      validDocument = false;
    }
  }
  const other = records.filter(
    (record) => !["message", "chat", "comment"].includes(record.type),
  );

  function renderMessage(item: ProductReportedMessage, index: number) {
    const { record } = item;
    const author = productCollaborationAuthor(record, presence);
    const authorName =
      author.name ?? l("Author not reported", "Autor no reportado");
    const parentAuthor = item.parent
      ? productCollaborationAuthor(item.parent, presence)
      : undefined;
    return (
      <li
        key={`${record.id}:${index}`}
        className={`rounded-xl border border-border bg-surface-subtle/30 p-4 ${
          item.relation === "reply" ? "ml-4 border-l-primary/35 sm:ml-8" : ""
        }`}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={authorName} src={author.avatarUrl} />
            <div className="min-w-0">
              <p className="wrap-break-word text-xs font-semibold">
                {authorName}
              </p>
              {record.name && record.name !== author.name && (
                <p className="mt-1 wrap-break-word text-[11px] text-muted-foreground">
                  {record.name}
                </p>
              )}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">
            <ProductDate value={record.updatedAt} />
          </span>
        </div>
        {item.parent && item.relation === "reply" && (
          <p className="mb-2 wrap-break-word text-[11px] text-muted-foreground">
            {l("Reply to", "Respuesta a")}{" "}
            {parentAuthor?.name ?? item.parent.name} · {item.parent.id}
          </p>
        )}
        {item.relation === "parent-unavailable" && (
          <p className="mb-2 wrap-break-word text-[11px] text-muted-foreground">
            {l(
              "Parent message is not loaded",
              "El mensaje padre no está cargado",
            )}
            {" · "}
            {item.parentId}
          </p>
        )}
        {item.relation === "invalid" && (
          <p className="mb-2 text-[11px] text-muted-foreground">
            {l(
              "Reply context is unavailable for this message.",
              "El contexto de respuesta no está disponible para este mensaje.",
            )}
          </p>
        )}
        <p className="whitespace-pre-wrap wrap-break-word text-xs leading-7">
          {record.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <ProductStatus value={record.status} />
          {item.replyTarget && productSupportsReplies(publishAction) && (
            <Button
              size="sm"
              variant="ghost"
              disabled={!canReply || write.pending || scopeStale}
              aria-label={`${l("Reply to", "Responder a")} ${authorName} · ${record.id}`}
              onClick={() => {
                setReply(item.replyTarget!);
                setSelectedThread(item.replyTarget!.threadId);
                setReview(null);
                messageInput.current?.focus();
              }}
            >
              <Reply className="size-3.5" />
              {l("Reply", "Responder")}
            </Button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-5">
      <ProductPanel
        title={l("Shared workspace", "Espacio compartido")}
        description={l(
          "Follow messages and document revisions within the selected resource.",
          "Sigue mensajes y revisiones de documentos dentro del recurso seleccionado.",
        )}
      >
        <ProductResourcePicker
          {...resources}
          value={resourceId}
          onChange={(value) => {
            read.reset();
            write.reset();
            current.current.resourceId = value;
            setResourceId(value);
            setRecords([]);
            setPresence([]);
            setSelectedThread("");
            setReply(null);
            setMessage("");
            setExtra({});
            setBase(null);
            setDraft("");
            setDraftTitle("");
            setDraftFormat("markdown");
            setRemote(null);
            setCursor("");
            setLastUpdate(null);
            setWatermark("");
            setReview(null);
          }}
          disabled={write.pending}
        />
        <div className="mt-4">
          <ProductFields
            action={queryAction}
            values={extra}
            onChange={(value) => {
              setExtra(value);
              setReview(null);
            }}
            exclude={["resourceId", "view", "cursor", "since"]}
            disabled={write.pending || scopeStale}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-11 items-center gap-3 text-xs">
            <Checkbox
              checked={follow}
              onCheckedChange={setFollow}
              disabled={scopeStale}
            />
            {props.subscribe || props.adapter.subscribe
              ? l("Follow live updates", "Seguir actualizaciones en vivo")
              : l("Refresh every 15 seconds", "Actualizar cada 15 segundos")}
          </label>
          <Button
            variant="outline"
            loading={read.pending}
            disabled={!queryAction || write.pending || scopeStale}
            onClick={() => {
              void load();
            }}
          >
            <RefreshCw />
            {l("Refresh room", "Actualizar espacio")}
          </Button>
        </div>
        <div
          role="status"
          className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
        >
          {lastUpdate ? (
            <>
              <span>
                {stale
                  ? l(
                      "Updates may be stale",
                      "Las actualizaciones pueden estar desfasadas",
                    )
                  : l("Recently updated", "Actualizado recientemente")}
              </span>
              <ProductDate value={lastUpdate} />
            </>
          ) : (
            <span>
              {l(
                "No updates received yet",
                "Aún no se han recibido actualizaciones",
              )}
            </span>
          )}
          {(props.subscribe || props.adapter.subscribe) && follow && (
            <>
              <ProductStatus value={streamState} />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStreamEpoch((value) => value + 1)}
              >
                {l("Reconnect from cursor", "Reconectar desde cursor")}
              </Button>
            </>
          )}
        </div>
        {streamError && (
          <p role="alert" className="mt-3 text-xs text-destructive-foreground">
            {l(
              "The live connection was interrupted. Reconnect or refresh the room.",
              "La conexión en vivo se interrumpió. Reconecta o actualiza el espacio.",
            )}
          </p>
        )}
        {scopeStale && (
          <p role="alert" className="mt-3 text-xs text-destructive-foreground">
            {l(
              "The connection scope changed. Reopen its settings before sending another action.",
              "El alcance de la conexión cambió. Vuelve a abrir su configuración antes de enviar otra acción.",
            )}
          </p>
        )}
        <div className="mt-4">
          <ProductOperationFeedback operation={read} />
          <ProductActionUnavailable action={queryAction} />
        </div>
      </ProductPanel>
      <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
        <ProductPanel title={l("Conversation", "Conversación")}>
          {conversation.threads.length > 0 && (
            <div className="mb-5">
              <Select
                label={l("Reported threads", "Hilos reportados")}
                value={selectedThread}
                onValueChange={(value) => {
                  setSelectedThread(value);
                  setReply(null);
                  setReview(null);
                }}
                options={[
                  {
                    value: "",
                    label: l(
                      "All room messages",
                      "Todos los mensajes del espacio",
                    ),
                  },
                  ...conversation.threads.map((thread) => ({
                    value: thread.id,
                    label: `${l("Thread", "Hilo")} · ${thread.id}`,
                  })),
                ]}
                disabled={write.pending || scopeStale}
              />
            </div>
          )}
          {conversation.messages.length ? (
            <div className="space-y-5">
              {!selectedThread && conversation.flat.length > 0 && (
                <section
                  aria-label={l("Room messages", "Mensajes del espacio")}
                >
                  {conversation.threads.length > 0 && (
                    <p className="mb-3 text-xs font-medium text-muted-foreground">
                      {l("Room messages", "Mensajes del espacio")}
                    </p>
                  )}
                  <ol className="space-y-3">
                    {conversation.flat.map(renderMessage)}
                  </ol>
                </section>
              )}
              {visibleThreads.map((thread) => (
                <section
                  key={thread.id}
                  aria-label={`${l("Thread", "Hilo")} ${thread.id}`}
                  className="space-y-3 rounded-xl border border-border bg-surface-subtle/15 p-3 sm:p-4"
                >
                  <h4 className="flex items-start gap-2 wrap-break-word text-xs font-medium">
                    <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span>
                      {l("Thread", "Hilo")} · {thread.id}
                    </span>
                  </h4>
                  <ol className="space-y-3">
                    {thread.messages.map(renderMessage)}
                  </ol>
                </section>
              ))}
              {selectedThread && !visibleThreads.length && (
                <ProductEmpty>
                  {l(
                    "This thread is no longer loaded. Show all room messages to choose another.",
                    "Este hilo ya no está cargado. Muestra todos los mensajes para elegir otro.",
                  )}
                  <Button
                    className="mt-3"
                    variant="outline"
                    disabled={write.pending || scopeStale}
                    onClick={() => {
                      setSelectedThread("");
                      setReply(null);
                      setReview(null);
                    }}
                  >
                    {l("Show all messages", "Mostrar todos los mensajes")}
                  </Button>
                </ProductEmpty>
              )}
              {!conversation.threads.length && (
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {l(
                    "No thread information has been reported for these messages.",
                    "No se ha reportado información de hilos para estos mensajes.",
                  )}
                </p>
              )}
            </div>
          ) : (
            <ProductEmpty>
              {l(
                "Refresh this room to load its conversation.",
                "Actualiza este espacio para cargar la conversación.",
              )}
            </ProductEmpty>
          )}
          {records.length === 100 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {l(
                "Showing the latest 100 loaded records.",
                "Se muestran los últimos 100 registros cargados.",
              )}
            </p>
          )}
          <div className="mt-5 space-y-4">
            {reply && (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p
                  role="status"
                  className="wrap-break-word text-xs font-medium"
                >
                  {l("Replying in thread", "Respondiendo en el hilo")}{" "}
                  {reply.threadId}
                </p>
                <p className="wrap-break-word text-[11px] text-muted-foreground">
                  {l("Parent message", "Mensaje padre")} · {reply.parentId}
                </p>
                {replyMessage && (
                  <p className="line-clamp-3 whitespace-pre-wrap wrap-break-word text-xs leading-6">
                    {replyMessage.record.description}
                  </p>
                )}
                {!replyCurrent && (
                  <p
                    role="alert"
                    className="text-xs text-destructive-foreground"
                  >
                    {l(
                      "This reply target is no longer available in the selected room. Choose a loaded message or start a new room message.",
                      "El destino de la respuesta ya no está disponible en este espacio. Elige un mensaje cargado o inicia un mensaje nuevo.",
                    )}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={write.pending || scopeStale}
                  onClick={() => {
                    setReply(null);
                    setReview(null);
                    messageInput.current?.focus();
                  }}
                >
                  {l("New room message", "Nuevo mensaje del espacio")}
                </Button>
              </div>
            )}
            <ProductLabeledTextarea
              ref={messageInput}
              label={reply ? l("Reply", "Respuesta") : l("Message", "Mensaje")}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setReview(null);
              }}
              disabled={write.pending || scopeStale}
            />
            <ProductFields
              action={publishAction}
              values={extra}
              onChange={(value) => {
                setExtra(value);
                setReview(null);
              }}
              exclude={[
                "resourceId",
                "roomId",
                "message",
                "content",
                "channelId",
                "threadId",
                "parentId",
                "authorId",
                "authorName",
              ]}
              disabled={write.pending || scopeStale}
            />
            <Button
              appearance="gradient"
              disabled={
                !publishAction ||
                !canPublish ||
                !message.trim() ||
                !messageValues ||
                write.pending ||
                scopeStale ||
                Boolean(
                  messageValues &&
                  invalidProductField(publishAction, messageValues),
                )
              }
              onClick={() =>
                stage(publishAction, { message, content: message })
              }
            >
              <Send />
              {reply
                ? l("Review reply", "Revisar respuesta")
                : l("Review message", "Revisar mensaje")}
            </Button>
            {publishAction && !canPublish && (
              <p className="text-xs leading-6 text-muted-foreground">
                {l(
                  "Publishing needs additional connection permissions. Review the connection settings.",
                  "Publicar requiere permisos adicionales. Revisa la configuración de la conexión.",
                )}
              </p>
            )}
            <ProductActionUnavailable action={publishAction} />
            {messageValues && (
              <ProductValidation
                action={publishAction}
                values={messageValues}
              />
            )}
          </div>
          {other.length > 0 && (
            <details className="mt-5">
              <summary className="cursor-pointer text-xs font-medium">
                {l("Other room records", "Otros registros del espacio")}
              </summary>
              <ProductRecordList records={other} />
            </details>
          )}
        </ProductPanel>
        <ProductPanel
          title={
            <span className="flex items-center gap-2">
              <Users className="size-4" />
              {l("Presence", "Presencia")}
            </span>
          }
          description={l(
            "Only participants reported by this connection are shown.",
            "Solo se muestran participantes reportados por esta conexión.",
          )}
        >
          {presence.length ? (
            <ul className="space-y-3">
              {presence.map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={record.name}
                      src={productPresenceAvatarUrl(record.fields?.avatarUrl)}
                    />
                    <div className="min-w-0">
                      <p className="wrap-break-word text-xs font-medium">
                        {record.name}
                      </p>
                      {record.updatedAt && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          <ProductDate value={record.updatedAt} />
                        </p>
                      )}
                    </div>
                  </div>
                  <ProductStatus value={record.status} />
                </li>
              ))}
            </ul>
          ) : (
            <ProductEmpty>
              {l(
                "No presence information has been received.",
                "No se ha recibido información de presencia.",
              )}
            </ProductEmpty>
          )}
        </ProductPanel>
      </div>
      {saveAction && (
        <ProductPanel
          title={l(
            "Resumable shared document",
            "Documento compartido reanudable",
          )}
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              loading={read.pending}
              onClick={() => {
                void load("document");
              }}
            >
              {l("Pull document revision", "Cargar revisión del documento")}
            </Button>
            {base && (
              <span className="text-xs text-muted-foreground">
                {base.title} · {l("Revision", "Revisión")} {base.revision}
              </span>
            )}
          </div>
          {base ? (
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-4">
                {props.renderEditor ? (
                  props.renderEditor({
                    value: {
                      ...base,
                      title: draftTitle,
                      content: draft,
                      format: draftFormat,
                    },
                    onChange: (value) => {
                      setDraft(value.content);
                      setDraftTitle(value.title);
                      setDraftFormat(value.format);
                      setReview(null);
                    },
                    disabled: write.pending,
                    locale,
                  })
                ) : (
                  <>
                    <label className="block space-y-2 text-xs font-medium">
                      {l("Title", "Título")}
                      <Input
                        value={draftTitle}
                        onChange={(event) => {
                          setDraftTitle(event.target.value);
                          setReview(null);
                        }}
                        disabled={write.pending || scopeStale}
                      />
                    </label>
                    <Select
                      label={l("Document format", "Formato del documento")}
                      value={draftFormat}
                      onValueChange={(value) => {
                        setDraftFormat(value as IntegrationDocument["format"]);
                        setReview(null);
                      }}
                      options={(
                        saveAction.fields.find((field) => field.id === "format")
                          ?.options ?? [
                          {
                            value: "markdown",
                            label: { en: "Markdown", es: "Markdown" },
                          },
                          {
                            value: "text",
                            label: { en: "Plain text", es: "Texto" },
                          },
                          { value: "json", label: { en: "JSON", es: "JSON" } },
                        ]
                      ).map((option) => ({
                        value: option.value,
                        label: l(option.label.en, option.label.es),
                      }))}
                      disabled={write.pending || scopeStale}
                    />
                    <ProductLabeledTextarea
                      label={l("Shared document", "Documento compartido")}
                      value={draft}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        setReview(null);
                      }}
                      disabled={write.pending || scopeStale}
                      aria-invalid={!validDocument}
                    />
                  </>
                )}
                <ProductFields
                  action={saveAction}
                  values={extra}
                  onChange={(value) => {
                    setExtra(value);
                    setReview(null);
                  }}
                  exclude={[
                    "resourceId",
                    "documentId",
                    "id",
                    "title",
                    "content",
                    "format",
                    "revision",
                    "expectedRevision",
                  ]}
                  disabled={write.pending}
                />
                <Button
                  appearance="gradient"
                  disabled={
                    write.pending ||
                    Boolean(remote) ||
                    write.errorCode === "conflict" ||
                    scopeStale ||
                    !validDocument ||
                    Boolean(invalidProductField(saveAction, documentValues))
                  }
                  onClick={() =>
                    stage(saveAction, {
                      ...documentValues,
                    })
                  }
                >
                  <Save />
                  {l("Review document update", "Revisar actualización")}
                </Button>
              </div>
              <ProductDocumentPreview content={draft} format={draftFormat} />
            </div>
          ) : (
            <ProductEmpty>
              {l(
                "Load a document revision before editing.",
                "Carga una revisión del documento antes de editar.",
              )}
            </ProductEmpty>
          )}
          {remote && (
            <div
              role="alert"
              className="mt-4 space-y-3 rounded-xl border border-primary/30 p-4"
            >
              <p className="text-xs">
                {l(
                  "A newer document arrived. Your changes are preserved.",
                  "Llegó un documento más reciente. Tus cambios se conservan.",
                )}
              </p>
              <ProductDocumentPreview
                content={remote.content}
                format={remote.format}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBase(remote);
                    setDraft(remote.content);
                    setDraftTitle(remote.title);
                    setDraftFormat(remote.format);
                    setRemote(null);
                    write.reset();
                    setReview(null);
                  }}
                >
                  {l("Use remote document", "Usar documento remoto")}
                </Button>
                <Button
                  onClick={() => {
                    setBase(remote);
                    setRemote(null);
                    write.reset();
                    setReview(null);
                  }}
                >
                  {l(
                    "Keep edits with latest revision",
                    "Conservar cambios con revisión actual",
                  )}
                </Button>
              </div>
            </div>
          )}
          {checkpointAction && (
            <div className="mt-5 space-y-3">
              <ProductFields
                action={checkpointAction}
                values={extra}
                onChange={(value) => {
                  setExtra(value);
                  setReview(null);
                }}
                exclude={["resourceId", "documentId", "revision", "cursor"]}
                disabled={write.pending}
              />
              <Button
                variant="outline"
                disabled={!base || write.pending}
                onClick={() =>
                  stage(checkpointAction, {
                    documentId: base?.id ?? "",
                    revision: base?.revision ?? 0,
                    cursor,
                  })
                }
              >
                {l("Review checkpoint", "Revisar punto de control")}
              </Button>
            </div>
          )}
        </ProductPanel>
      )}
      <ProductOperationFeedback operation={write} />
      {write.result && (
        <ProductPanel title={l("Action outcome", "Resultado de la acción")}>
          <ProductResult result={write.result} />
        </ProductPanel>
      )}
      {review && (
        <ProductReview
          action={review.action}
          values={review.values}
          pending={write.pending}
          disabled={scopeStale || !reviewCurrent}
          grantedPermissions={props.connection.grantedPermissions}
          onConfirm={() => {
            void submit();
          }}
          onReject={() => setReview(null)}
        >
          {!reviewCurrent && (
            <p
              role="alert"
              className="mb-3 text-xs text-destructive-foreground"
            >
              {l(
                "The room or reply target changed. Return to editing and review an available target before sending.",
                "El espacio o destino de la respuesta cambió. Vuelve a editar y revisa un destino disponible antes de enviar.",
              )}
            </p>
          )}
        </ProductReview>
      )}
    </div>
  );
}
