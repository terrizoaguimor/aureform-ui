"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { useIntegrationOperation } from "@/hooks/use-integration-operation";
import type { IntegrationValues, IntegrationWorkbenchProps } from "@/lib/integrations/contracts";
import { Select } from "@/components/ui/select";
import {
  OperationalActionForm, OperationalFeedback, OperationalPermissionsProvider,
  OperationalReviewDialog, type OperationalReviewPacket,
} from "./operational-fields";
import { operationalPayload, scopedOperationalValues, operationalPermitted } from "./operational-model";
import { OperationalResult } from "./operational-results";

/** Every declared provider action remains accessible beside the main domain UI. */
export function IntegrationActionExplorer(props: IntegrationWorkbenchProps) {
  const { l, locale } = useLanguage();
  const [actionId, setActionId] = useState(props.definition.actions[0].id);
  const action = props.definition.actions.find((item) => item.id === actionId) ?? props.definition.actions[0];
  return (
    <div className="grid gap-5 p-5">
      <Select label={l("Available action", "Acción disponible")} value={action.id} onValueChange={setActionId} options={props.definition.actions.map((item) => ({ value: item.id, label: item.label[locale] }))} />
      <ActionForm key={`${props.connection.id}:${props.connection.revision}:${action.id}`} {...props} actionId={action.id} />
    </div>
  );
}
function ActionForm(props: IntegrationWorkbenchProps & { actionId: string }) {
  const { locale } = useLanguage();
  const action = props.definition.actions.find((item) => item.id === props.actionId)!;
  const operation = useIntegrationOperation(props);
  const [values, setValues] = useState(() => scopedOperationalValues(action, props.connection.resourceIds));
  const [review, setReview] = useState<OperationalReviewPacket | null>(null);
  const submit = (input: IntegrationValues) => {
    const payload = operationalPayload(action, input);
    if (action.requiresReview) setReview({ action, values: structuredClone(payload) });
    else void operation.run(action, payload);
  };
  return (
    <OperationalPermissionsProvider permissions={props.connection.grantedPermissions}>
      <div className="grid gap-5">
        <p className="text-xs leading-6 text-muted-foreground">{action.description[locale]}</p>
        <OperationalActionForm action={action} values={values} onChange={setValues} onSubmit={submit} pending={operation.pending} disabled={!operationalPermitted(action, props.connection.grantedPermissions) || props.connection.status !== "connected"} />
        <OperationalFeedback operation={operation} />
        {operation.result && <OperationalResult result={operation.result} demo={props.adapter.mode === "demo"} />}
        {review && <OperationalReviewDialog packet={review} demo={props.adapter.mode === "demo"} onReject={() => setReview(null)} onConfirm={() => { const packet = review; setReview(null); void operation.run(packet.action, packet.values); }} />}
      </div>
    </OperationalPermissionsProvider>
  );
}
