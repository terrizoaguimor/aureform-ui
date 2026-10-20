"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type {
  IntegrationAction,
  IntegrationResult,
  IntegrationValues,
  IntegrationWorkbenchProps,
  IntegrationsAdapter,
} from "@/lib/integrations/contracts";
import {
  operationalPayload,
  validateOperationalValues,
} from "./operational-model";
import {
  OperationalActionForm,
  OperationalEmpty,
  OperationalFeedback,
  OperationalPanel,
  OperationalPermissionsProvider,
  OperationalReviewDialog,
  type OperationalReviewPacket,
} from "./operational-fields";
import { OperationalResult } from "./operational-results";
import {
  useOperationalSession,
  type OperationalSession,
} from "./operational-session";
import { OperationalEmail, OperationalFiles } from "./operational-files-email";
import {
  OperationalNotifications,
  OperationalObservability,
} from "./operational-observability-notifications";
import {
  OperationalAutomation,
  OperationalJobs,
} from "./operational-jobs-automation";

export type OperationalDomainProps = {
  props: IntegrationWorkbenchProps;
  session: OperationalSession;
  stage: (
    action: IntegrationAction,
    values: IntegrationValues,
    options?: {
      review?: boolean;
      summary?: OperationalReviewPacket["summary"];
      content?: string;
    },
  ) => void;
};

const handledResults: Partial<
  Record<
    IntegrationWorkbenchProps["definition"]["family"],
    IntegrationResult["kind"][]
  >
> = {
  files: ["upload", "record", "records"],
  email: ["delivery"],
  observability: ["metrics", "record", "records"],
  notifications: ["record", "records"],
  jobs: ["job"],
  automation: ["job", "record", "records"],
};

function OperationalQuery({ session }: { session: OperationalSession }) {
  const { l } = useLanguage();
  const [values, setValues] = useState(() =>
    session.query ? session.initialQueryValues : {},
  );
  if (
    !session.query ||
    (!session.query.fields.length && session.queries.length < 2)
  )
    return null;
  const needsInput =
    Object.keys(
      validateOperationalValues(session.query, session.initialQueryValues),
    ).length > 0;
  return (
    <details
      open={needsInput}
      className="rounded-xl border border-border bg-surface"
    >
      <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium marker:text-muted-foreground">
        {l("Load records with filters", "Cargar registros con filtros")}
      </summary>
      <div className="border-t border-border p-4">
        {session.queries.length > 1 && (
          <div className="mb-4">
            <Select
              label={l("Read operation", "Operación de lectura")}
              aria-label={l("Read operation", "Operación de lectura")}
              value={session.query.id}
              options={session.queries.map((action) => ({
                value: action.id,
                label: l(action.label.en, action.label.es),
              }))}
              onValueChange={(value) => {
                session.read.reset();
                session.setQueryId(value);
              }}
              disabled={session.read.pending || session.write.pending}
            />
          </div>
        )}
        <OperationalActionForm
          action={session.query}
          values={values}
          onChange={setValues}
          onSubmit={(input) => void session.refresh(input)}
          disabled={!session.connected || session.write.pending}
          pending={session.read.pending}
          buttonLabel={l("Load records", "Cargar registros")}
        />
      </div>
    </details>
  );
}

function OperationalScopeWorkbench(props: IntegrationWorkbenchProps) {
  const { l } = useLanguage();
  const session = useOperationalSession(props);
  const [review, setReview] = useState<
    (OperationalReviewPacket & { adapter: IntegrationsAdapter }) | null
  >(null);
  const stage: OperationalDomainProps["stage"] = (action, values, options) => {
    if (!session.connected || session.write.pending || session.read.pending)
      return;
    const payload = operationalPayload(action, values);
    if (Object.keys(validateOperationalValues(action, payload)).length) return;
    if (!session.can(action)) {
      void session.run(action, payload);
      return;
    }
    if (options?.review || action.requiresReview) {
      setReview({
        action,
        values: Object.fromEntries(
          Object.entries(payload).map(([key, value]) => [
            key,
            Array.isArray(value) ? [...value] : value,
          ]),
        ),
        summary: options?.summary?.map((row) => ({ ...row })),
        content: options?.content,
        adapter: props.adapter,
      });
    } else {
      void session.run(action, payload);
    }
  };
  const domain: OperationalDomainProps = { props, session, stage };
  let workbench: React.ReactNode;
  switch (props.definition.family) {
    case "files":
      workbench = <OperationalFiles {...domain} />;
      break;
    case "email":
      workbench = <OperationalEmail {...domain} />;
      break;
    case "observability":
      workbench = <OperationalObservability {...domain} />;
      break;
    case "notifications":
      workbench = <OperationalNotifications {...domain} />;
      break;
    case "jobs":
      workbench = <OperationalJobs {...domain} />;
      break;
    case "automation":
      workbench = <OperationalAutomation {...domain} />;
      break;
    default:
      workbench = (
        <OperationalEmpty>
          {l(
            "Choose an operational integration.",
            "Elige una integración operativa.",
          )}
        </OperationalEmpty>
      );
  }
  const last = session.write.result;
  const readResult = session.read.result;
  const readHandled = [
    ...(handledResults[props.definition.family] ?? []),
    "records",
    "record",
  ];
  return (
    <OperationalPermissionsProvider
      permissions={props.connection.grantedPermissions}
    >
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface-subtle/50 p-4">
          <p className="flex min-w-0 flex-1 items-start gap-2 text-xs leading-6 text-muted-foreground">
            <ShieldCheck
              className="mt-1 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {props.adapter.mode === "demo"
              ? l(
                  "Local demo data. Uploads, messages, tracking and triggers stay in the preview.",
                  "Datos demo locales. Las subidas, los mensajes, el seguimiento y las activaciones quedan en la vista previa.",
                )
              : l(
                  "Operations use your connected backend and this workspace’s permissions.",
                  "Las operaciones usan tu backend conectado y los permisos de este espacio.",
                )}
          </p>
          <Badge variant="neutral" appearance="soft">
            {props.adapter.mode === "demo"
              ? l("Demo", "Demo")
              : l("Connected adapter", "Adapter conectado")}
          </Badge>
        </div>
        {!session.connected && (
          <Alert
            variant="warning"
            title={l(
              "Connect this integration to continue",
              "Conecta esta integración para continuar",
            )}
          >
            {l(
              "Your draft stays editable. Operations become available when the connection is ready.",
              "Tu borrador sigue siendo editable. Las operaciones estarán disponibles cuando la conexión esté lista.",
            )}
          </Alert>
        )}
        <OperationalQuery key={session.query?.id} session={session} />
        <OperationalFeedback
          operation={session.read}
          label={l("Loading records…", "Cargando registros…")}
        />
        <OperationalFeedback operation={session.write} />
        {workbench}
        {readResult && !readHandled.includes(readResult.kind) && (
          <OperationalPanel title={l("Read response", "Respuesta de lectura")}>
            <OperationalResult
              result={readResult}
              demo={props.adapter.mode === "demo"}
            />
          </OperationalPanel>
        )}
        {last &&
          !handledResults[props.definition.family]?.includes(last.kind) && (
            <OperationalPanel
              title={l("Backend response", "Respuesta del backend")}
            >
              <OperationalResult
                result={last}
                demo={props.adapter.mode === "demo"}
              />
            </OperationalPanel>
          )}
        {review && review.adapter === props.adapter && (
          <OperationalReviewDialog
            packet={review}
            demo={props.adapter.mode === "demo"}
            onReject={() => setReview(null)}
            onConfirm={() => {
              if (session.write.pending || !session.connected) return;
              const packet = review;
              setReview(null);
              void session.run(packet.action, packet.values);
            }}
          />
        )}
      </div>
    </OperationalPermissionsProvider>
  );
}

/** Pass the adapter from a client component; no provider SDK or server route is required here. */
export function OperationalIntegrationWorkbench(
  props: IntegrationWorkbenchProps,
) {
  const key = JSON.stringify([
    props.scope.workspaceId,
    props.definition.id,
    props.definition.family,
    props.connection.id,
    props.connection.providerOptionId,
    props.connection.revision,
    props.adapter.mode,
  ]);
  return <OperationalScopeWorkbench key={key} {...props} />;
}
