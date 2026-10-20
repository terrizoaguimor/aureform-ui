"use client";

import { useId, useRef, useState } from "react";
import { Bell, Check, Eye, Flag, Send, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  operationalAction,
  operationalReadPatch,
  operationalReadState,
  operationalText,
  operationalValue,
  scopedOperationalValues,
  withOperationalValue,
} from "./operational-model";
import {
  OperationalActionForm,
  OperationalEmpty,
  OperationalPanel,
  OperationalRefresh,
} from "./operational-fields";
import {
  OperationalDate,
  OperationalMetrics,
  OperationalRecordDetail,
  OperationalRecordTable,
  OperationalStatus,
} from "./operational-results";
import type { OperationalDomainProps } from "./operational-workbench";

export function OperationalObservability({
  props,
  session,
  stage,
}: OperationalDomainProps) {
  const { l, number } = useLanguage();
  const consentId = useId();
  const eventRequested = useRef(false);
  const eventAction = operationalAction(props.definition, "track-event");
  const flagAction = operationalAction(props.definition, "set-flag");
  const [eventValues, setEventValues] = useState(() =>
    scopedOperationalValues(eventAction, props.connection.resourceIds),
  );
  const [flagValues, setFlagValues] = useState(() =>
    scopedOperationalValues(flagAction, props.connection.resourceIds),
  );
  const [consent, setConsent] = useState(false);
  const [filter, setFilter] = useState("all");
  const [type, setType] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const busy = session.write.pending || session.read.pending;
  const records = session.snapshot.records;
  const flagRecords = records.filter(
    (record) =>
      /flag|feature|experiment/i.test(record.type) ||
      typeof record.fields?.enabled === "boolean",
  );
  const eventRecords = records.filter(
    (record) => !flagRecords.some((flag) => flag.id === record.id),
  );
  const types = [...new Set(eventRecords.map((record) => record.type))];
  const statuses = [...new Set(eventRecords.map((record) => record.status))];
  const filtered = eventRecords.filter(
    (record) =>
      (filter === "all" || record.status === filter) &&
      (type === "all" || record.type === type),
  );
  const detail = records.find((record) => record.id === detailId);
  return (
    <div className="space-y-5">
      <OperationalPanel
        title={l("Signals overview", "Resumen de señales")}
        description={l(
          "Metrics and events returned by this connection.",
          "Métricas y eventos devueltos por esta conexión.",
        )}
        accessory={<OperationalRefresh session={session} />}
      >
        <OperationalMetrics metrics={session.snapshot.metrics} />
      </OperationalPanel>
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="events">
            {l("Events", "Eventos")} · {number(eventRecords.length)}
          </TabsTrigger>
          <TabsTrigger value="flags">
            {l("Feature flags", "Flags de funciones")}
          </TabsTrigger>
          <TabsTrigger value="submit">
            {l("Submit an event", "Enviar un evento")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="events">
          <OperationalPanel
            title={l("Event explorer", "Explorador de eventos")}
            description={l(
              "Filters apply to the currently loaded events.",
              "Los filtros se aplican a los eventos cargados.",
            )}
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <Select
                aria-label={l(
                  "Filter by event type",
                  "Filtrar por tipo de evento",
                )}
                value={type}
                options={[
                  { value: "all", label: l("All types", "Todos los tipos") },
                  ...types.map((value) => ({
                    value,
                    label: operationalText(value, 80),
                  })),
                ]}
                onValueChange={setType}
              />
              <Select
                aria-label={l(
                  "Filter by event status",
                  "Filtrar por estado del evento",
                )}
                value={filter}
                options={[
                  {
                    value: "all",
                    label: l("All statuses", "Todos los estados"),
                  },
                  ...statuses.map((value) => ({
                    value,
                    label: operationalText(value, 80),
                  })),
                ]}
                onValueChange={setFilter}
              />
            </div>
            <OperationalRecordTable
              records={filtered}
              loading={session.read.pending}
              error={session.read.error}
              onRetry={() => void session.refresh()}
              onSelect={(record) => setDetailId(record.id)}
            />
            {detail && (
              <div className="mt-4">
                <OperationalRecordDetail record={detail} />
              </div>
            )}
          </OperationalPanel>
        </TabsContent>
        <TabsContent value="flags">
          <div className="grid gap-5 xl:grid-cols-2">
            <OperationalPanel
              title={l("Reported flag states", "Estados de flags reportados")}
              description={l(
                "Refresh after an update to verify persisted state.",
                "Actualiza después de un cambio para comprobar el estado persistido.",
              )}
            >
              {flagRecords.length ? (
                <div className="grid gap-3">
                  {flagRecords.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-border bg-surface-subtle/40 p-4 text-left outline-none transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                      onClick={() => {
                        setDetailId(record.id);
                        let next = withOperationalValue(
                          flagAction,
                          flagValues,
                          "target",
                          record.id,
                        );
                        next = withOperationalValue(
                          flagAction,
                          next,
                          "enabled",
                          record.fields?.enabled === true,
                        );
                        setFlagValues(next);
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
                        <Flag
                          className="size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span className="break-words">
                          {operationalText(record.name, 200)}
                        </span>
                      </span>
                      <OperationalStatus
                        value={
                          typeof record.fields?.enabled === "boolean"
                            ? record.fields.enabled
                              ? "enabled"
                              : "disabled"
                            : record.status
                        }
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <OperationalEmpty>
                  {l(
                    "No flag states were returned by the backend.",
                    "El backend no devolvió estados de flags.",
                  )}
                </OperationalEmpty>
              )}
              {detail &&
                flagRecords.some((record) => record.id === detail.id) && (
                  <div className="mt-4">
                    <OperationalRecordDetail record={detail} />
                  </div>
                )}
            </OperationalPanel>
            <OperationalPanel
              title={l("Update a flag", "Actualizar un flag")}
              description={l(
                "Changes use the selected connection’s declared fields and permissions.",
                "Los cambios usan los campos y permisos declarados de la conexión.",
              )}
            >
              <OperationalActionForm
                action={flagAction}
                values={flagValues}
                onChange={setFlagValues}
                disabled={!session.connected || busy}
                pending={session.write.pending}
                onSubmit={(values) => {
                  if (!flagAction) return;
                  eventRequested.current = false;
                  stage(flagAction, values);
                }}
                buttonLabel={l("Review flag update", "Revisar cambio del flag")}
              />
            </OperationalPanel>
          </div>
        </TabsContent>
        <TabsContent value="submit">
          <OperationalPanel
            title={l(
              "Controlled event submission",
              "Envío controlado de eventos",
            )}
            description={l(
              "Viewing this workbench never submits an analytics event automatically.",
              "Ver este workbench nunca envía un evento de analítica automáticamente.",
            )}
          >
            <label
              htmlFor={consentId}
              className="mb-5 flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-surface-subtle/50 p-4"
            >
              <span className="flex items-start gap-2 text-xs leading-6">
                <ShieldCheck
                  className="mt-1 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {l(
                  "Allow me to submit the event entered below in this session.",
                  "Permíteme enviar el evento que introduzca abajo en esta sesión.",
                )}
              </span>
              <Switch
                id={consentId}
                checked={consent}
                onCheckedChange={(value) => {
                  setConsent(value);
                  if (!value && eventRequested.current && session.write.pending)
                    session.write.cancel();
                }}
              />
            </label>
            <OperationalActionForm
              action={eventAction}
              values={eventValues}
              onChange={setEventValues}
              disabled={!consent || !session.connected || busy}
              pending={session.write.pending}
              onSubmit={(values) => {
                if (!eventAction || !consent) return;
                eventRequested.current = true;
                stage(eventAction, values, { review: true });
              }}
              buttonLabel={l(
                "Review and submit event",
                "Revisar y enviar evento",
              )}
            >
              <p className="text-xs leading-6 text-muted-foreground">
                {l(
                  "Include only authorized, non-sensitive event properties. Consent here applies to this manual submission.",
                  "Incluye solo propiedades autorizadas y no sensibles. El consentimiento aquí corresponde a este envío manual.",
                )}
              </p>
            </OperationalActionForm>
          </OperationalPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function OperationalNotifications({
  props,
  session,
  stage,
}: OperationalDomainProps) {
  const { l, number } = useLanguage();
  const create = operationalAction(props.definition, "create-notification");
  const preferences = operationalAction(props.definition, "update-preferences");
  const markRead = operationalAction(props.definition, "update-record");
  const [createValues, setCreateValues] = useState(() =>
    scopedOperationalValues(create, props.connection.resourceIds),
  );
  const [preferenceValues, setPreferenceValues] = useState(() =>
    scopedOperationalValues(preferences, props.connection.resourceIds),
  );
  const [filter, setFilter] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const busy = session.write.pending || session.read.pending;
  const records = session.snapshot.records;
  const unread = records.filter(
    (record) => operationalReadState(record) === "unread",
  ).length;
  const visible = records.filter(
    (record) => filter === "all" || operationalReadState(record) === filter,
  );
  const detail = records.find((record) => record.id === detailId);
  const readPatch = detail ? operationalReadPatch(markRead, detail) : null;
  const title = operationalValue(
    create,
    createValues,
    "name",
    operationalValue(create, createValues, "subject"),
  );
  const message = operationalValue(create, createValues, "content");
  const target = operationalValue(
    create,
    createValues,
    "recipient",
    operationalValue(create, createValues, "target"),
  );
  return (
    <div className="space-y-5">
      <OperationalPanel
        title={l("Notification inbox", "Bandeja de notificaciones")}
        description={l(
          `${number(unread)} unread reported in the loaded set. Opening a card does not change provider read state.`,
          `${number(unread)} sin leer reportadas en el conjunto cargado. Abrir una tarjeta no cambia su estado en el proveedor.`,
        )}
        accessory={<OperationalRefresh session={session} />}
      >
        <div className="mb-4 max-w-xs">
          <Select
            value={filter}
            onValueChange={setFilter}
            aria-label={l("Inbox filter", "Filtro de bandeja")}
            options={[
              {
                value: "all",
                label: l("All notifications", "Todas las notificaciones"),
              },
              {
                value: "unread",
                label: l("Reported unread", "Reportadas sin leer"),
              },
              { value: "read", label: l("Reported read", "Reportadas leídas") },
              {
                value: "unknown",
                label: l(
                  "Read state unavailable",
                  "Estado de lectura no disponible",
                ),
              },
            ]}
          />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-3">
            {visible.length ? (
              visible.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className={cn(
                    "group flex min-h-24 w-full items-start gap-3 rounded-xl border bg-surface p-4 text-left outline-none transition-colors hover:border-primary/40 hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    detailId === record.id
                      ? "border-primary/50 bg-accent/25"
                      : "border-border",
                  )}
                  onClick={() => setDetailId(record.id)}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Bell className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="break-words text-xs font-semibold">
                        {operationalText(record.name, 180)}
                      </span>
                      {operationalReadState(record) === "unread" && (
                        <Badge variant="neutral" appearance="soft">
                          {l("Unread", "Sin leer")}
                        </Badge>
                      )}
                      {seen.has(record.id) && (
                        <span className="text-[10px] text-muted-foreground">
                          {l("Seen here", "Vista aquí")}
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 line-clamp-2 block break-words text-xs leading-6 text-muted-foreground">
                      {operationalText(record.description, 600)}
                    </span>
                    <span className="mt-2 block text-[11px] text-muted-foreground">
                      <OperationalDate value={record.updatedAt} />
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <OperationalEmpty>
                {session.read.pending
                  ? l("Loading inbox…", "Cargando bandeja…")
                  : l(
                      "No notifications match this filter.",
                      "No hay notificaciones con este filtro.",
                    )}
              </OperationalEmpty>
            )}
          </div>
          <div className="space-y-3">
            {detail ? (
              <>
                <OperationalRecordDetail record={detail} />
                {readPatch && markRead ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !session.can(markRead) ||
                      busy ||
                      operationalReadState(detail) === "read"
                    }
                    onClick={() => stage(markRead, readPatch)}
                  >
                    <Check aria-hidden="true" />
                    {l("Mark read in backend", "Marcar leída en backend")}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={seen.has(detail.id)}
                      onClick={() =>
                        setSeen((previous) => new Set([...previous, detail.id]))
                      }
                    >
                      <Eye aria-hidden="true" />
                      {l("Mark seen in this view", "Marcar vista aquí")}
                    </Button>
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      {l(
                        "Local to this view. The connection has not exposed a usable read-state update.",
                        "Solo en esta vista. La conexión no ofrece una actualización utilizable del estado de lectura.",
                      )}
                    </p>
                  </>
                )}
              </>
            ) : (
              <OperationalEmpty>
                {l(
                  "Select a notification to inspect its content and read state.",
                  "Selecciona una notificación para revisar su contenido y estado de lectura.",
                )}
              </OperationalEmpty>
            )}
          </div>
        </div>
      </OperationalPanel>
      <Tabs defaultValue="preferences" className="space-y-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="preferences">
            {l("Preferences", "Preferencias")}
          </TabsTrigger>
          <TabsTrigger value="create">
            {l("Create notification", "Crear notificación")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="preferences">
          <OperationalPanel
            title={l("Delivery preferences", "Preferencias de entrega")}
            description={l(
              "These are editable draft settings until the backend acknowledges them.",
              "Son ajustes en borrador hasta que el backend los confirme.",
            )}
          >
            <OperationalActionForm
              action={preferences}
              values={preferenceValues}
              onChange={setPreferenceValues}
              disabled={!session.connected || busy}
              pending={session.write.pending}
              onSubmit={(values) => {
                if (preferences) stage(preferences, values);
              }}
              buttonLabel={l("Review preferences", "Revisar preferencias")}
            />
          </OperationalPanel>
        </TabsContent>
        <TabsContent value="create">
          <div className="grid gap-5 xl:grid-cols-2">
            <OperationalPanel
              title={l("Create a notification", "Crear una notificación")}
              description={l(
                "Review the destination and message before requesting creation.",
                "Revisa el destino y el mensaje antes de solicitar su creación.",
              )}
            >
              <OperationalActionForm
                action={create}
                values={createValues}
                onChange={setCreateValues}
                disabled={!session.connected || busy}
                pending={session.write.pending}
                onSubmit={(values) => {
                  if (create)
                    stage(create, values, { review: true, content: message });
                }}
                buttonLabel={l("Review notification", "Revisar notificación")}
              />
            </OperationalPanel>
            <OperationalPanel
              title={l("Notification preview", "Vista previa de notificación")}
            >
              <article className="flex items-start gap-3 rounded-xl border border-primary/20 bg-accent/30 p-5">
                <Bell
                  className="mt-1 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h4 className="break-words text-sm font-semibold">
                    {operationalText(title, 200) ||
                      l("Notification title", "Título de notificación")}
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6">
                    {operationalText(message, 4000) ||
                      l(
                        "The message entered in the form appears here.",
                        "El mensaje del formulario aparece aquí.",
                      )}
                  </p>
                  {target && (
                    <p className="mt-3 break-all text-[11px] text-muted-foreground">
                      {l("Target:", "Destino:")} {operationalText(target, 200)}
                    </p>
                  )}
                  <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Send className="size-3" aria-hidden="true" />
                    {l(
                      "Draft; not yet requested.",
                      "Borrador; aún no solicitado.",
                    )}
                  </p>
                </div>
              </article>
            </OperationalPanel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
