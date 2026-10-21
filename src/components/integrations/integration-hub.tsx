"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleCheck,
  Code2,
  Globe2,
  Plug,
  RefreshCw,
  Search,
  Settings2,
  Workflow,
  X,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { useLanguage } from "@/hooks/use-language";
import {
  integrationErrorMessage,
  useIntegrationOperation,
} from "@/hooks/use-integration-operation";
import { PageHeading } from "@/components/blocks/page-heading";
import { EffectSurface } from "@/components/effects/effect-surface";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  IntegrationProviderLogo,
  IntegrationProviderMarks,
} from "@/components/integrations/provider-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IntegrationError,
  type IntegrationConnection,
  type IntegrationDefinition,
  type IntegrationEvent,
  type IntegrationResource,
  type IntegrationStatus,
  type IntegrationValues,
  type IntegrationsAdapter,
  type IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  integrationDefinitions,
  integrationFamilies,
  getIntegrationDefinition,
  getIntegrationActionsForOption,
} from "@/lib/integrations/definitions";
import {
  createDemoIntegrationsAdapter,
  demoIntegrationConfiguration,
} from "@/lib/integrations/demo-adapter";
import {
  parseIntegrationConnection,
  parseIntegrationUpdate,
  validateIntegrationFields,
  validateIntegrationSelection,
} from "@/lib/integrations/validation";
import { isTrustedIntegrationAuthorizationUrl } from "@/lib/integrations/http-adapter";
import type { ProductIntegrationWorkbenchProps } from "./product-workbench";
import type { IntegrationSuite } from "@/lib/integrations/suite";
import type { IntegrationUiBindings } from "@/lib/integrations/ui-bindings";
import { createDemoMediaCollectionBinding } from "@/lib/integrations/media-collection";
import { publicPath } from "@/lib/public-path";
import { cn } from "@/lib/utils";

function WorkbenchLoading() {
  const { l } = useLanguage();
  return (
    <div
      role="status"
      aria-label={l("Loading workflow", "Cargando flujo")}
      className="grid gap-4"
    >
      <Skeleton className="h-24" />
      <Skeleton className="h-72" />
    </div>
  );
}
const OperationalWorkbench = dynamic(
  () =>
    import("./operational-workbench").then(
      (m) => m.OperationalIntegrationWorkbench,
    ),
  { loading: WorkbenchLoading },
);
const ProductWorkbench = dynamic(
  () =>
    import("./product-workbench").then((m) => m.ProductIntegrationWorkbench),
  { loading: WorkbenchLoading },
);
const SpecializedWorkbench = dynamic(
  () =>
    import("./specialized-workbench").then(
      (m) => m.SpecializedIntegrationWorkbench,
    ),
  { loading: WorkbenchLoading },
);
const ActionExplorer = dynamic(
  () => import("./action-explorer").then((m) => m.IntegrationActionExplorer),
  { loading: WorkbenchLoading },
);
const DrivePickerPanel = dynamic(
  () => import("./drive-picker-panel").then((m) => m.DrivePickerPanel),
  { loading: WorkbenchLoading },
);
const MediaCollectionPanel = dynamic(
  () => import("./media-collection-panel").then((m) => m.MediaCollectionPanel),
  { loading: WorkbenchLoading },
);
const EnterpriseDiagnostics = dynamic(
  () => import("./enterprise-diagnostics").then((m) => m.EnterpriseDiagnostics),
  { loading: WorkbenchLoading },
);

const statusLabels: Record<IntegrationStatus, [string, string]> = {
  "not-configured": ["Ready to configure", "Lista para configurar"],
  connected: ["Connected", "Conectada"],
  syncing: ["Syncing", "Sincronizando"],
  expired: ["Reconnect required", "Necesita reconexión"],
  "permission-denied": ["Permission required", "Necesita permiso"],
  error: ["Needs attention", "Requiere atención"],
  disconnected: ["Disconnected", "Desconectada"],
};
function ConnectionBadge({ status }: { status: IntegrationStatus }) {
  const { l } = useLanguage();
  return (
    <Badge
      variant={
        status === "connected"
          ? "default"
          : ["error", "expired", "permission-denied"].includes(status)
            ? "warning"
            : "neutral"
      }
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "connected" ? "bg-primary" : "bg-current opacity-50",
        )}
      />
      {l(...statusLabels[status])}
    </Badge>
  );
}
export type IntegrationHubProps = IntegrationUiBindings & {
  adapter?: IntegrationsAdapter;
  suite?: IntegrationSuite;
  selectedId?: string;
  workspaceId?: string;
  /** Presentation restriction only. The consumer backend owns authorization. */
  canManage?: boolean;
};

export function IntegrationHub({
  adapter,
  suite,
  selectedId,
  workspaceId: requestedWorkspace,
  canManage,
  ...ui
}: IntegrationHubProps) {
  const { l, locale } = useLanguage();
  const workspace = useWorkspace();
  const demo = useMemo(() => createDemoIntegrationsAdapter(), []);
  const transport = adapter ?? suite?.connections ?? demo;
  const localMedia = useMemo(() => createDemoMediaCollectionBinding(), []);
  const workspaceId = requestedWorkspace ?? workspace.workspaceId;
  const [selected, setSelected] = useState<string | null>(selectedId ?? null);
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("all");
  const [health, setHealth] = useState("all");
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => setSelected(selectedId ?? null), [selectedId]);
  useEffect(() => {
    const controller = new AbortController();
    setConnections([]);
    setError(null);
    setLoading(true);
    transport
      .list({ workspaceId, signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted) setConnections(items);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            integrationErrorMessage(
              cause instanceof IntegrationError ? cause.code : "provider-error",
              locale,
            ),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [transport, workspaceId, locale, refresh]);
  const changed = useCallback((connection: IntegrationConnection) => {
    setConnections((previous) => [
      ...previous.filter(
        (item) => item.integrationId !== connection.integrationId,
      ),
      connection,
    ]);
  }, []);
  const byId = new Map(
    connections.map((connection) => [connection.integrationId, connection]),
  );
  const definition = selected ? getIntegrationDefinition(selected) : undefined;
  const query = search.trim().toLowerCase();
  const visible = integrationDefinitions.filter(
    (item) =>
      (family === "all" || item.family === family) &&
      (health === "all" ||
        (health === "connected"
          ? byId.get(item.id)?.status === "connected"
          : ["expired", "error", "permission-denied"].includes(
              byId.get(item.id)?.status ?? "",
            ))) &&
      `${item.name} ${item.description[locale]} ${item.options.map((option) => option.name).join(" ")}`
        .toLowerCase()
        .includes(query),
  );
  const connectedCount = connections.filter(
    (connection) => connection.status === "connected",
  ).length;
  const providerCount = integrationDefinitions.reduce(
    (sum, item) => sum + item.options.length,
    0,
  );
  const managed = canManage ?? workspace.can("workspace.manage");
  const bindings = { ...suite?.ui, ...ui };
  if (
    transport.mode === "demo" &&
    definition?.id === "cloudinary" &&
    !bindings.media
  )
    bindings.media = localMedia;
  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-6"
      data-integration-hub
      data-integration-mode={transport.mode}
      data-integration-count={integrationDefinitions.length}
    >
      <PageHeading
        eyebrow={l(
          "Build your connected workspace",
          "Construye tu workspace conectado",
        )}
        title={l("Integrations", "Integraciones")}
        description={l(
          "Useful workflows, thoughtful controls. Bring the services that fit your product.",
          "Flujos útiles y controles cuidados. Conecta los servicios que encajan con tu producto.",
        )}
      />
      {!definition && (
        <Card
          appearance="gradient"
          className="relative overflow-hidden p-5 sm:p-7"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 size-64 rounded-full border-[32px] border-primary/10"
          />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <Badge appearance="glass" className="mb-4">
                <Plug aria-hidden />
                {transport.mode === "demo"
                  ? l("Working local previews", "Demos locales funcionales")
                  : l("Your application backend", "Backend de tu aplicación")}
              </Badge>
              <h2 className="editorial text-2xl sm:text-3xl">
                {l(
                  "A place for every connection.",
                  "Un lugar para cada conexión.",
                )}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {transport.mode === "demo"
                  ? l(
                      "Explore configuration, resources and complete workflows. Demo actions stay in memory and do not access external accounts.",
                      "Explora configuración, recursos y flujos completos. Las acciones demo viven en memoria y no acceden a cuentas externas.",
                    )
                  : l(
                      "Connections and actions use your injected adapter. Your backend provides account access and authorized data.",
                      "Las conexiones y acciones usan tu adaptador. Tu backend aporta acceso a cuentas y datos autorizados.",
                    )}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 text-center md:min-w-72">
              {[
                [integrationDefinitions.length, l("Recipes", "Recetas")],
                [providerCount, l("Choices", "Opciones")],
                [connectedCount, l("Connected", "Conectadas")],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-xl border border-primary/15 bg-surface/70 px-3 py-4 backdrop-blur-sm"
                >
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      )}
      {error && (
        <Alert
          variant="destructive"
          title={l(
            "Connection status unavailable",
            "Estado de conexiones no disponible",
          )}
        >
          {error}
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setRefresh((value) => value + 1)}
          >
            {l("Retry", "Reintentar")}
          </Button>
        </Alert>
      )}
      {definition ? (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft aria-hidden />
              {l("All integrations", "Todas las integraciones")}
            </Button>
            <a
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href={publicPath(`/${locale}/integrations/${definition.id}/`)}
            >
              <ArrowUpRight aria-hidden className="size-4" />
              {l("Open this recipe", "Abrir esta receta")}
            </a>
          </div>
          <ConnectionWorkbench
            key={`${workspaceId}:${definition.id}`}
            definition={definition}
            adapter={transport}
            suite={suite}
            scope={{ workspaceId }}
            onConnectionChange={changed}
            canManage={managed}
            {...bindings}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_220px_200px]">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              />
              <Input
                aria-label={l("Find an integration", "Buscar integración")}
                placeholder={l(
                  "Search providers and workflows…",
                  "Busca proveedores y flujos…",
                )}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              aria-label={l("Integration family", "Familia de integración")}
              value={family}
              onValueChange={setFamily}
              options={[
                {
                  value: "all",
                  label: l("All categories", "Todas las categorías"),
                },
                ...integrationFamilies.map((item) => ({
                  value: item.id,
                  label: item.name[locale],
                })),
              ]}
            />
            <Select
              aria-label={l("Connection health", "Estado de conexión")}
              value={health}
              onValueChange={setHealth}
              options={[
                { value: "all", label: l("All statuses", "Todos los estados") },
                { value: "connected", label: l("Connected", "Conectadas") },
                {
                  value: "attention",
                  label: l("Needs attention", "Requiere atención"),
                },
              ]}
            />
          </div>
          <div
            className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <p>
              {visible.length} {l("recipes", "recetas")} ·{" "}
              {workspace.workspace.name}
            </p>
            <span className="inline-flex items-center gap-2">
              {loading ? (
                <RefreshCw
                  aria-hidden
                  className="size-3.5 motion-safe:animate-spin"
                />
              ) : (
                <CircleCheck aria-hidden className="size-3.5 text-primary" />
              )}
              {loading
                ? l("Loading connection status", "Cargando estado de conexión")
                : l(
                    "Configuration and workflows included",
                    "Configuración y flujos incluidos",
                  )}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((item) => {
              return (
                <EffectSurface key={item.id} asChild className="af-hover-card">
                  <button
                    type="button"
                    data-integration-card={item.id}
                    onClick={() => setSelected(item.id)}
                    className="group flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-5 text-left outline-none transition-[border-color,box-shadow,transform] hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="mb-5 flex w-full items-center justify-between gap-2">
                      <IntegrationProviderMarks options={item.options} />
                      <ConnectionBadge
                        status={byId.get(item.id)?.status ?? "not-configured"}
                      />
                    </span>
                    <span className="flex w-full items-center gap-2">
                      <span className="min-w-0 flex-1 text-[15px] font-semibold">
                        {item.name}
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                      />
                    </span>
                    <span className="mt-2 flex-1 text-xs leading-6 text-muted-foreground">
                      {item.description[locale]}
                    </span>
                    <span className="mt-5 flex w-full flex-wrap items-center gap-2 border-t border-border pt-4">
                      <Badge variant="outline">
                        {
                          integrationFamilies.find(
                            (entry) => entry.id === item.family,
                          )?.name[locale]
                        }
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {item.options.length > 1
                          ? `${item.options.length} ${l("provider choices", "opciones")}`
                          : l("Injectable adapter", "Adaptador inyectable")}
                      </span>
                    </span>
                  </button>
                </EffectSurface>
              );
            })}
          </div>
          {!visible.length && (
            <Card>
              <Empty
                title={l(
                  "No integrations match",
                  "No hay integraciones coincidentes",
                )}
                description={l(
                  "Try another name, category or connection status.",
                  "Prueba otro nombre, categoría o estado.",
                )}
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setFamily("all");
                      setHealth("all");
                    }}
                  >
                    {l("Clear filters", "Limpiar filtros")}
                  </Button>
                }
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function configurationDefaults(
  definition: IntegrationDefinition,
): IntegrationValues {
  return Object.fromEntries(
    definition.configurationFields.map((field) => [
      field.id,
      field.type === "toggle"
        ? false
        : field.type === "number"
          ? 0
          : field.type === "select"
            ? (field.options?.[0]?.value ?? "")
            : "",
    ]),
  );
}
function ConfigurationFields({
  definition,
  values,
  onChange,
  disabled,
}: {
  definition: IntegrationDefinition;
  values: IntegrationValues;
  onChange: (values: IntegrationValues) => void;
  disabled: boolean;
}) {
  const { locale } = useLanguage();
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {definition.configurationFields.map((field) => {
        const update = (value: string | number | boolean) =>
          onChange({ ...values, [field.id]: value });
        return (
          <Field
            key={field.id}
            label={`${field.label[locale]}${field.required ? " *" : ""}`}
            description={field.description?.[locale]}
          >
            {field.type === "select" ? (
              <Select
                value={String(values[field.id] ?? "")}
                onValueChange={update}
                disabled={disabled}
                options={(field.options ?? []).map((option) => ({
                  value: option.value,
                  label: option.label[locale],
                }))}
              />
            ) : field.type === "toggle" ? (
              <Switch
                checked={values[field.id] === true}
                onCheckedChange={update}
                disabled={disabled}
              />
            ) : (
              <Input
                type={
                  field.type === "number"
                    ? "number"
                    : field.type === "url"
                      ? "url"
                      : "text"
                }
                value={String(values[field.id] ?? "")}
                onChange={(event) =>
                  update(
                    field.type === "number"
                      ? Number(event.target.value)
                      : event.target.value,
                  )
                }
                required={field.required}
                disabled={disabled}
                autoComplete="off"
                maxLength={2000}
                placeholder={field.placeholder}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}
type ConnectionWorkbenchProps = IntegrationWorkbenchProps &
  IntegrationUiBindings & {
    suite?: IntegrationSuite;
    onConnectionChange: (connection: IntegrationConnection) => void;
    canManage: boolean;
  };
function ConnectionWorkbench({
  definition,
  adapter,
  suite,
  scope,
  onConnectionChange,
  canManage,
  ...ui
}: Omit<ConnectionWorkbenchProps, "connection">) {
  const { l, locale, date } = useLanguage();
  const [connection, setConnection] = useState<IntegrationConnection | null>(
    null,
  );
  const [values, setValues] = useState<IntegrationValues>(() =>
    adapter.mode === "demo"
      ? demoIntegrationConfiguration(definition)
      : configurationDefaults(definition),
  );
  const [option, setOption] = useState(definition.options[0].id);
  const [permissions, setPermissions] = useState(() =>
    definition.permissions
      .filter((item) => adapter.mode === "demo" || item.required)
      .map((item) => item.id),
  );
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  const [resources, setResources] = useState<IntegrationResource[]>([]);
  const [resourceQuery, setResourceQuery] = useState("");
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>("load");
  const [tab, setTab] = useState("workflow");
  const [authorization, setAuthorization] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [draftRevision, setDraftRevision] = useState(0);
  const [reload, setReload] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const pending = useRef(false);
  const applyConnection = useCallback(
    (value: IntegrationConnection, fillDraft = false) => {
      const parsed = parseIntegrationConnection(value, definition, {
        workspaceId: scope.workspaceId,
      });
      setConnection(parsed);
      onConnectionChange(parsed);
      if (fillDraft) {
        setDraftRevision(parsed.revision);
        setOption(value.providerOptionId);
        if (Object.keys(value.configuration).length)
          setValues(value.configuration);
        if (value.status === "connected") {
          setPermissions(value.grantedPermissions);
          setResourceIds(value.resourceIds);
        }
      }
    },
    [definition, onConnectionChange, scope.workspaceId],
  );
  const showError = useCallback(
    (cause: unknown) =>
      integrationErrorMessage(
        cause instanceof IntegrationError ? cause.code : "provider-error",
        locale,
      ),
    [locale],
  );
  useEffect(() => {
    mounted.current = true;
    const request = new AbortController();
    controller.current = request;
    pending.current = true;
    setBusy("load");
    setError(null);
    adapter
      .get(definition.id, {
        workspaceId: scope.workspaceId,
        signal: request.signal,
      })
      .then(async (value) => {
        if (request.signal.aborted) return;
        applyConnection(value, true);
        const activity = await adapter.events(value.id, {
          workspaceId: scope.workspaceId,
          signal: request.signal,
        });
        if (!request.signal.aborted) setEvents(activity);
      })
      .catch((cause) => {
        if (!request.signal.aborted) setError(showError(cause));
      })
      .finally(() => {
        if (!request.signal.aborted) {
          pending.current = false;
          setBusy(null);
          controller.current = null;
        }
      });
    return () => {
      mounted.current = false;
      request.abort();
      controller.current?.abort();
      pending.current = false;
    };
  }, [
    adapter,
    definition.id,
    scope.workspaceId,
    applyConnection,
    showError,
    reload,
  ]);
  useEffect(() => {
    const request = new AbortController();
    const timer = setTimeout(
      () => {
        setResourceError(null);
        adapter
          .resources(
            definition.id,
            { workspaceId: scope.workspaceId, signal: request.signal },
            resourceQuery,
          )
          .then((items) => {
            if (!request.signal.aborted) setResources(items);
          })
          .catch((cause) => {
            if (!request.signal.aborted) setResourceError(showError(cause));
          });
      },
      resourceQuery ? 200 : 0,
    );
    return () => {
      clearTimeout(timer);
      request.abort();
    };
  }, [
    adapter,
    definition.id,
    scope.workspaceId,
    resourceQuery,
    showError,
    reload,
  ]);
  useEffect(() => {
    if (
      !adapter.subscribe ||
      !connection?.id ||
      connection.workspaceId !== scope.workspaceId ||
      connection.integrationId !== definition.id
    )
      return;
    const request = new AbortController();
    let cleanup: (() => void) | undefined;
    const connectedId = connection.id;
    Promise.resolve()
      .then(() => {
        if (request.signal.aborted) return () => {};
        return adapter.subscribe!(
          connectedId,
          (input) => {
            if (request.signal.aborted) return;
            try {
              const update = parseIntegrationUpdate(
                input,
                definition,
                connectedId,
                { workspaceId: scope.workspaceId },
              );
              if (update.kind === "connection")
                applyConnection(update.connection);
            } catch (cause) {
              setError(showError(cause));
            }
          },
          { workspaceId: scope.workspaceId, signal: request.signal },
        );
      })
      .then((close) => {
        if (request.signal.aborted) close();
        else cleanup = close;
      })
      .catch((cause) => {
        if (!request.signal.aborted) setError(showError(cause));
      });
    return () => {
      request.abort();
      try {
        cleanup?.();
      } catch {
        // Scoped callbacks are already inactive even if consumer teardown fails.
      }
    };
  }, [
    adapter,
    connection?.id,
    connection?.workspaceId,
    connection?.integrationId,
    definition,
    scope.workspaceId,
    applyConnection,
    showError,
  ]);
  const task = async (
    label: string,
    operation: (signal: AbortSignal) => Promise<void>,
  ) => {
    if (pending.current) return;
    const request = new AbortController();
    controller.current = request;
    pending.current = true;
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await operation(request.signal);
    } catch (cause) {
      if (mounted.current && !request.signal.aborted)
        setError(showError(cause));
    } finally {
      if (mounted.current && !request.signal.aborted) {
        pending.current = false;
        setBusy(null);
        controller.current = null;
      }
    }
  };
  const connect = () => {
    if (!canManage) return;
    void task("connect", async (signal) => {
      validateIntegrationFields(definition.configurationFields, values);
      const selectedResources =
        adapter.mode === "demo" && !resourceIds.length && resources[0]
          ? [resources[0].id]
          : resourceIds;
      validateIntegrationSelection(definition, permissions, selectedResources);
      const result = await adapter.connect(
        {
          integrationId: definition.id,
          providerOptionId: option,
          configuration: values,
          permissions,
          resourceIds: selectedResources,
        },
        { workspaceId: scope.workspaceId, signal },
      );
      if (signal.aborted) return;
      if (
        result.connection.providerOptionId !== option ||
        (result.kind === "authorization" &&
          (!isTrustedIntegrationAuthorizationUrl(
            result.url,
            adapter.authorizationOrigins,
          ) ||
            result.connection.status === "connected"))
      )
        throw new IntegrationError("provider-error");
      setResourceIds(selectedResources);
      setDraftRevision(result.connection.revision);
      applyConnection(result.connection);
      if (result.kind === "authorization") {
        setAuthorization(result.url);
        setTab("connection");
      } else {
        setAuthorization(null);
        setTab("workflow");
        setNotice(
          adapter.mode === "demo"
            ? l("Local preview configured.", "Demo local configurada.")
            : l("Connection configured.", "Conexión configurada."),
        );
      }
    });
  };
  const save = () => {
    if (!canManage || !connection) return;
    if (option !== connection.providerOptionId) {
      connect();
      return;
    }
    void task("save", async (signal) => {
      const result = await adapter.configure(
        connection.id,
        {
          configuration: values,
          permissions,
          resourceIds,
          revision: draftRevision,
        },
        { workspaceId: scope.workspaceId, signal },
      );
      if (!signal.aborted) {
        applyConnection(result);
        setDraftRevision(result.revision);
        setNotice(l("Configuration saved.", "Configuración guardada."));
      }
    });
  };
  const isConnected = connection?.status === "connected";
  const workflowDefinition = useMemo(
    () =>
      connection
        ? {
            ...definition,
            actions: getIntegrationActionsForOption(
              definition,
              connection.providerOptionId,
            ),
          }
        : definition,
    [definition, connection],
  );
  const scoped = connection
    ? { definition: workflowDefinition, connection, adapter, scope }
    : null;
  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-5"
      data-integration-workbench={definition.id}
    >
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <IntegrationProviderLogo optionId={option} size="lg" />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">
                {definition.name}
              </h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground">
                {definition.description[locale]}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {adapter.mode === "demo"
                ? l("Local demo", "Demo local")
                : l("Consumer adapter", "Adaptador del usuario")}
            </Badge>
            <ConnectionBadge status={connection?.status ?? "not-configured"} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {connection?.account.name ||
              l("No account connected", "Ninguna cuenta conectada")}
            {connection?.lastSyncAt &&
              ` · ${l("Synced", "Sincronizada")} ${date(connection.lastSyncAt)}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={busy === "sync"}
              disabled={!!busy || !isConnected || !canManage}
              onClick={() => {
                if (!connection) return;
                void task("sync", async (signal) => {
                  const result = await adapter.sync(connection.id, {
                    workspaceId: scope.workspaceId,
                    signal,
                  });
                  if (!signal.aborted) applyConnection(result);
                });
              }}
            >
              <RefreshCw aria-hidden />
              {l("Sync resources", "Sincronizar recursos")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!!busy || !isConnected || !canManage}
              onClick={() => setRevokeOpen(true)}
            >
              {l("Disconnect", "Desconectar")}
            </Button>
          </div>
        </div>
      </Card>
      {!canManage && (
        <Alert
          variant="warning"
          title={l(
            "Read-only connection settings",
            "Ajustes de conexión de solo lectura",
          )}
        >
          {l(
            "Your workspace role can inspect this recipe. A workspace administrator manages the connection.",
            "Tu rol puede consultar esta receta. Un administrador gestiona la conexión.",
          )}
        </Alert>
      )}
      {error && (
        <Alert
          variant="destructive"
          title={l("The action could not finish", "La acción no pudo terminar")}
        >
          {error}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!!busy}
              onClick={() => setReload((value) => value + 1)}
            >
              {l("Reload connection", "Recargar conexión")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              {l("Dismiss", "Cerrar")}
            </Button>
          </div>
        </Alert>
      )}
      {notice && <Alert variant="success" title={notice} />}
      {busy && (
        <div
          className="flex items-center gap-3 text-xs text-muted-foreground"
          role="status"
        >
          <RefreshCw aria-hidden className="size-4 motion-safe:animate-spin" />
          {l("Working with this connection…", "Trabajando con esta conexión…")}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              controller.current?.abort();
              controller.current = null;
              pending.current = false;
              setBusy(null);
              setNotice(l("Request cancelled.", "Solicitud cancelada."));
            }}
          >
            <X aria-hidden />
            {l("Cancel", "Cancelar")}
          </Button>
        </div>
      )}
      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList
          aria-label={l("Integration sections", "Secciones de integración")}
        >
          <TabsTrigger value="workflow">
            <Workflow aria-hidden />
            {l("Workflow", "Flujo")}
          </TabsTrigger>
          <TabsTrigger value="connection">
            <Settings2 aria-hidden />
            {l("Connection", "Conexión")}
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity aria-hidden />
            {l("Activity", "Actividad")}
          </TabsTrigger>
          <TabsTrigger value="developer">
            <Code2 aria-hidden />
            {l("Setup guide", "Guía de conexión")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="workflow">
          {isConnected && scoped ? (
            <IntegrationWorkflow
              {...scoped}
              suite={suite}
              {...ui}
              onConnectionChange={(value) => {
                applyConnection(value, true);
                setReload((previous) => previous + 1);
              }}
              canManage={canManage}
            />
          ) : (
            <Card>
              <Empty
                icon={<Plug className="size-5" aria-hidden />}
                title={l("Configure this workflow", "Configura este flujo")}
                description={
                  adapter.mode === "demo"
                    ? l(
                        "Use the prepared demo configuration to explore the complete interface.",
                        "Usa la configuración demo preparada para explorar la interfaz completa.",
                      )
                    : l(
                        "Choose an account, permissions and authorized resources to begin.",
                        "Elige cuenta, permisos y recursos autorizados para comenzar.",
                      )
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      disabled={!!busy || !canManage}
                      onClick={
                        adapter.mode === "demo"
                          ? connect
                          : () => setTab("connection")
                      }
                    >
                      {adapter.mode === "demo"
                        ? l("Start local demo", "Iniciar demo local")
                        : l("Configure connection", "Configurar conexión")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTab("connection")}
                    >
                      {l("Review configuration", "Revisar configuración")}
                    </Button>
                  </div>
                }
              />
            </Card>
          )}
        </TabsContent>
        <TabsContent value="connection" className="grid gap-5">
          {isConnected && scoped && (
            <Card className="p-5">
              <IntegrationConnectionTest {...scoped} />
            </Card>
          )}
          {authorization && (
            <Alert
              title={l(
                "Finish account authorization",
                "Completa la autorización de cuenta",
              )}
            >
              {l(
                "Continue to the authorization destination returned by your backend, then refresh this connection.",
                "Continúa al destino de autorización de tu backend y después actualiza esta conexión.",
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={authorization}
                  className={buttonVariants({ size: "sm" })}
                >
                  {l("Continue authorization", "Continuar autorización")}
                  <ArrowUpRight aria-hidden className="size-4" />
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReload((value) => value + 1)}
                >
                  {l("Check connection", "Comprobar conexión")}
                </Button>
              </div>
            </Alert>
          )}
          <Card className="p-5 sm:p-6">
            <h3 className="text-sm font-semibold">
              {l("Connection details", "Detalles de conexión")}
            </h3>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {l(
                "Use references and public settings from your application. Provider secrets belong to your backend.",
                "Usa referencias y ajustes públicos de tu aplicación. Los secretos del proveedor pertenecen a tu backend.",
              )}
            </p>
            <form
              className="mt-6 grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (isConnected) save();
                else connect();
              }}
            >
              <Select
                label={l("Provider choice", "Proveedor")}
                value={option}
                disabled={!!busy || !canManage}
                onValueChange={setOption}
                options={definition.options.map((item) => ({
                  value: item.id,
                  label: item.name,
                  icon: (
                    <IntegrationProviderLogo optionId={item.id} size="inline" />
                  ),
                }))}
              />
              <ConfigurationFields
                definition={definition}
                values={values}
                onChange={setValues}
                disabled={!!busy || !canManage}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <span className="text-xs text-muted-foreground">
                  {adapter.mode === "demo"
                    ? l(
                        "No external credentials needed for this preview.",
                        "Esta demo no necesita credenciales externas.",
                      )
                    : l(
                        "Your backend verifies this connection.",
                        "Tu backend verifica esta conexión.",
                      )}
                </span>
                <Button
                  type="submit"
                  loading={busy === "connect" || busy === "save"}
                  disabled={!!busy || !canManage}
                >
                  {isConnected
                    ? l("Save configuration", "Guardar configuración")
                    : adapter.mode === "demo"
                      ? l("Connect local demo", "Conectar demo local")
                      : l("Connect account", "Conectar cuenta")}
                </Button>
              </div>
            </form>
          </Card>
          <Card className="p-5 sm:p-6">
            <h3 className="text-sm font-semibold">
              {l("Permissions", "Permisos")}
            </h3>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {l(
                "Logical application permissions. Your backend maps these to the service's actual scopes.",
                "Permisos lógicos de la aplicación. Tu backend los mapea a los scopes reales del servicio.",
              )}
            </p>
            <div className="mt-5 grid gap-4">
              {definition.permissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface-subtle/40 p-4"
                >
                  <Checkbox
                    checked={permissions.includes(permission.id)}
                    disabled={!!busy || !canManage || permission.required}
                    onCheckedChange={(checked) =>
                      setPermissions((previous) =>
                        checked
                          ? [...previous, permission.id]
                          : previous.filter((id) => id !== permission.id),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold">
                      {permission.label[locale]}
                      {permission.required
                        ? ` · ${l("required", "obligatorio")}`
                        : ""}
                    </span>
                    <span className="mt-1 block text-xs leading-6 text-muted-foreground">
                      {permission.description[locale]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {definition.resourceLabel[locale]}
              </h3>
              <Badge variant="neutral">
                {resourceIds.length} {l("selected", "seleccionados")}
              </Badge>
            </div>
            <Input
              aria-label={l(
                "Find an authorized resource",
                "Buscar recurso autorizado",
              )}
              placeholder={l(
                "Filter available resources…",
                "Filtra recursos disponibles…",
              )}
              className="mt-5"
              value={resourceQuery}
              onChange={(event) => setResourceQuery(event.target.value)}
            />
            {resourceError ? (
              <Alert
                className="mt-4"
                variant="warning"
                title={l("Resources unavailable", "Recursos no disponibles")}
              >
                {resourceError}
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => setReload((value) => value + 1)}
                >
                  {l("Retry", "Reintentar")}
                </Button>
              </Alert>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {resources.map((resource) => (
                  <label
                    key={resource.id}
                    className="flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary/35"
                  >
                    <Checkbox
                      checked={resourceIds.includes(resource.id)}
                      disabled={!!busy || !canManage}
                      onCheckedChange={(checked) =>
                        setResourceIds((previous) =>
                          checked
                            ? [...previous, resource.id]
                            : previous.filter((id) => id !== resource.id),
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">
                        {resource.name}
                      </span>
                      <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">
                        {resource.description}
                      </span>
                      <Badge variant="neutral" className="mt-2">
                        {resource.type}
                      </Badge>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {!resourceError && !resources.length && (
              <p className="mt-4 text-xs text-muted-foreground">
                {l(
                  "No matching authorized resources.",
                  "No hay recursos autorizados coincidentes.",
                )}
              </p>
            )}
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              {l(
                "Save the connection configuration after changing permissions or resource selection.",
                "Guarda la configuración después de cambiar permisos o recursos.",
              )}
            </p>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {l("Connection activity", "Actividad de conexión")}
              </h3>
              <Button
                variant="outline"
                size="sm"
                disabled={!!busy || !connection}
                onClick={() => {
                  if (!connection) return;
                  void task("events", async (signal) => {
                    const result = await adapter.events(connection.id, {
                      workspaceId: scope.workspaceId,
                      signal,
                    });
                    if (!signal.aborted) setEvents(result);
                  });
                }}
              >
                <RefreshCw aria-hidden />
                {l("Refresh activity", "Actualizar actividad")}
              </Button>
            </div>
            {events.length ? (
              <ol className="mt-5 grid gap-4">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex gap-3 rounded-xl border border-border p-4"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                      <Check aria-hidden className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs leading-6">
                        {event.message[locale]}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {date(event.createdAt)} · {event.kind}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty
                title={l(
                  "Activity will appear here",
                  "La actividad aparecerá aquí",
                )}
                description={l(
                  "Configure or use this connection, then refresh its activity.",
                  "Configura o usa esta conexión y después actualiza su actividad.",
                )}
              />
            )}
          </Card>
        </TabsContent>
        <TabsContent value="developer">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Code2 aria-hidden className="size-5 text-primary" />
              <h3 className="text-sm font-semibold">
                {l("Connect your application", "Conecta tu aplicación")}
              </h3>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              {definition.serviceNote[locale]}
            </p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {l(
                    "Optional SDK references",
                    "Referencias de SDK opcionales",
                  )}
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {definition.packages.map((name) => (
                    <Badge key={name} variant="outline">
                      {name}
                    </Badge>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {l("SDK license reference", "Referencia de licencia del SDK")}
                </dt>
                <dd className="mt-2 text-xs leading-6">{definition.license}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={publicPath(`/${locale}/docs/integrations/`)}
                className={buttonVariants({ variant: "outline" })}
              >
                <Code2 aria-hidden className="size-4" />
                {l(
                  "Integration documentation",
                  "Documentación de integraciones",
                )}
              </a>
              <a
                href={definition.documentationUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "ghost" })}
              >
                <Globe2 aria-hidden className="size-4" />
                {l("Provider documentation", "Documentación del proveedor")}
                <ArrowUpRight aria-hidden className="size-4" />
              </a>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent closeLabel={l("Close", "Cerrar")}>
          <DialogTitle>
            {l("Disconnect this account?", "¿Desconectar esta cuenta?")}
          </DialogTitle>
          <DialogDescription>
            {adapter.mode === "demo"
              ? l(
                  "This resets the local connection settings. The preview's records remain in memory.",
                  "Esto restablece los ajustes de conexión local. Los registros demo siguen en memoria.",
                )
              : l(
                  "Your backend revokes this workspace connection. Review any workflows that depend on it.",
                  "Tu backend revoca esta conexión del workspace. Revisa los flujos que dependen de ella.",
                )}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(false)}>
              {l("Keep connection", "Mantener conexión")}
            </Button>
            <Button
              variant="destructive"
              disabled={!!busy || !canManage}
              onClick={() => {
                if (!connection) return;
                setRevokeOpen(false);
                void task("disconnect", async (signal) => {
                  const result = await adapter.disconnect(connection.id, {
                    workspaceId: scope.workspaceId,
                    signal,
                  });
                  if (!signal.aborted) {
                    applyConnection(result);
                    setAuthorization(null);
                    setTab("connection");
                  }
                });
              }}
            >
              {l("Disconnect", "Desconectar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntegrationWorkflow(
  props: ProductIntegrationWorkbenchProps &
    IntegrationUiBindings & {
      suite?: IntegrationSuite;
      canManage: boolean;
      onConnectionChange(connection: IntegrationConnection): void;
    },
) {
  const { l } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const { definition } = props;
  const demoMedia = useMemo(() => createDemoMediaCollectionBinding(), []);
  const workbench = ["identity", "commerce", "ai"].includes(
    definition.family,
  ) ? (
    <SpecializedWorkbench {...props} />
  ) : [
      "files",
      "email",
      "observability",
      "notifications",
      "jobs",
      "automation",
    ].includes(definition.family) ? (
    <OperationalWorkbench {...props} />
  ) : (
    <ProductWorkbench {...props} />
  );
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      {definition.id === "google-drive" && (
        <DrivePickerPanel {...props} binding={props.drivePicker} />
      )}
      {(definition.id === "cloudinary" ||
        (definition.family === "files" && props.media)) && (
        <MediaCollectionPanel
          {...props}
          binding={
            props.media ??
            (props.adapter.mode === "demo" ? demoMedia : undefined)
          }
        />
      )}
      {["enterprise-identity", "microsoft-365", "salesforce"].includes(
        definition.id,
      ) && <EnterpriseDiagnostics {...props} binding={props.enterprise} />}
      {workbench}
      <details
        className="rounded-xl border border-border bg-surface"
        open={expanded}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary className="min-h-11 cursor-pointer px-5 py-4 text-xs font-semibold">
          {l(
            "Explore all available actions",
            "Explorar todas las acciones disponibles",
          )}{" "}
          · {definition.actions.length}
        </summary>
        {expanded && (
          <div className="border-t border-border">
            <ActionExplorer {...props} />
          </div>
        )}
      </details>
    </div>
  );
}

/** Optional compact diagnostic action for consumers embedding a recipe. */
export function IntegrationConnectionTest(props: IntegrationWorkbenchProps) {
  const { l } = useLanguage();
  const operation = useIntegrationOperation(props);
  const action = props.definition.actions.find(
    (item) => item.kind === "test-connection",
  );
  if (!action) return null;
  return (
    <div className="grid gap-3">
      <Button
        variant="outline"
        loading={operation.pending}
        onClick={() => void operation.run(action)}
      >
        {l("Test connection", "Probar conexión")}
      </Button>
      {operation.error && (
        <Alert variant="destructive" title={operation.error} />
      )}
      {operation.result?.kind === "receipt" && (
        <Alert variant="success" title={operation.result.message} />
      )}
    </div>
  );
}
