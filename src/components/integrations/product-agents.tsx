"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ListRestart,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useIntegrationOperation } from "@/hooks/use-integration-operation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductAgentRunSummary } from "./product-agent-run";
import type {
  IntegrationAction,
  IntegrationJob,
  IntegrationRecord,
  IntegrationToolRun,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  findProductAction,
  invalidProductField,
  parseProductArguments,
  productActionValues,
  productReadDefaults,
  productToolFields,
} from "./product-model";
import {
  ProductActionUnavailable,
  ProductDocumentPreview,
  ProductEmpty,
  ProductFields,
  ProductJobResult,
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

export function ProductAgentsWorkbench(props: IntegrationWorkbenchProps) {
  const { l } = useLanguage();
  const read = useIntegrationOperation(props);
  const execute = useIntegrationOperation(props);
  const approval = useIntegrationOperation(props);
  const resources = useProductResources(props);
  const queryAction = findProductAction(props.definition, "query");
  const agentAction = findProductAction(props.definition, "run-agent");
  const toolAction = findProductAction(props.definition, "execute-tool");
  const approveAction = findProductAction(props.definition, "approve-tool");
  const checkpointAction = findProductAction(props.definition, "checkpoint");
  const [resourceId, setResourceId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [tools, setTools] = useState<IntegrationRecord[]>([]);
  const [toolId, setToolId] = useState("");
  const [manualToolName, setManualToolName] = useState("");
  const [toolValues, setToolValues] = useState<IntegrationValues>({});
  const [parameters, setParameters] = useState<
    { name: string; value: string }[]
  >([]);
  const [structured, setStructured] = useState(false);
  const [inputText, setInputText] = useState("{}");
  const [mode, setMode] = useState(agentAction ? "agent" : "tool");
  const [goal, setGoal] = useState("");
  const [extra, setExtra] = useState<IntegrationValues>(() =>
    productReadDefaults(queryAction, props),
  );
  const [run, setRun] = useState<IntegrationToolRun | null>(null);
  const [submittedApproval, setSubmittedApproval] = useState("");
  const [history, setHistory] = useState<IntegrationToolRun[]>([]);
  const [job, setJob] = useState<IntegrationJob | null>(null);
  const [checkpoints, setCheckpoints] = useState<IntegrationRecord[]>([]);
  const [checkpointId, setCheckpointId] = useState("");
  const [review, setReview] = useState<{
    action: IntegrationAction;
    values: IntegrationValues;
    lane: "execute" | "approval";
  } | null>(null);
  const selectedTool = tools.find((tool) => tool.id === toolId);
  const toolName = selectedTool?.name ?? manualToolName.trim();
  const fields = useMemo(() => productToolFields(selectedTool), [selectedTool]);
  const action = mode === "agent" ? agentAction : toolAction;
  const parameterNames = parameters.map((parameter) => parameter.name.trim());
  const validParameters =
    parameterNames.every(
      (name) =>
        name && !["__proto__", "constructor", "prototype"].includes(name),
    ) && new Set(parameterNames).size === parameterNames.length;
  const input: IntegrationValues = fields.length
    ? toolValues
    : Object.fromEntries(
        parameters.map((parameter) => [parameter.name.trim(), parameter.value]),
      );
  const structuredInput = parseProductArguments(inputText);
  const serializedInput = structured ? inputText : JSON.stringify(input);
  const inputValid = !structured
    ? validParameters && !invalidProductField({ fields }, toolValues)
    : structuredInput.ok;
  const prepared = productActionValues(
    action,
    {
      ...extra,
      toolId,
      tool: toolName,
      toolName,
      goal,
      prompt: goal,
      task: goal,
      input: serializedInput,
      arguments: serializedInput,
      checkpointId,
    },
    resourceId,
  );

  async function discover(view = "tools") {
    if (!queryAction) return;
    const values = productActionValues(
      queryAction,
      { ...extra, view, runId: run?.id ?? job?.id ?? extra.runId ?? "" },
      resourceId,
    );
    if (invalidProductField(queryAction, values)) return;
    const result = await read.run(queryAction, values);
    if (result?.kind === "records") {
      if (view === "checkpoints") setCheckpoints(result.records);
      else if (view === "tools") setTools(result.records);
    }
    if (result?.kind === "tool") acceptRun(result.run);
    if (result?.kind === "job") setJob(result.job);
  }
  function acceptRun(value: IntegrationToolRun) {
    setReview(null);
    setRun(value);
    setHistory((items) =>
      [...items.filter((item) => item.id !== value.id), value].slice(-30),
    );
  }
  function stage(
    target: IntegrationAction | undefined,
    values: IntegrationValues,
    lane: "execute" | "approval" = "execute",
  ) {
    if (!target) return;
    const input = productActionValues(target, values, resourceId);
    if (!invalidProductField(target, input))
      setReview({ action: target, values: input, lane });
  }
  async function submit() {
    if (!review) return;
    const result = await (review.lane === "approval" ? approval : execute).run(
      review.action,
      review.values,
    );
    if (!result) return;
    if (result.kind === "tool") acceptRun(result.run);
    if (result.kind === "job") setJob(result.job);
    if (review.action.kind === "approve-tool")
      setSubmittedApproval(String(review.values.approvalId ?? ""));
    if (review.action.kind === "checkpoint" && result.kind === "receipt")
      setCheckpointId(result.id);
    setReview(null);
  }
  const busy = execute.pending || approval.pending;
  const canApprove =
    run?.state === "approval-required" &&
    Boolean(run.approvalId) &&
    Boolean(approveAction) &&
    submittedApproval !== run.approvalId;

  return (
    <div className="space-y-5">
      <ProductPanel
        title={l(
          "Agent and tool discovery",
          "Descubrimiento de agentes y herramientas",
        )}
        description={l(
          "Discover tools through the selected connection and review each requested action.",
          "Descubre herramientas mediante la conexión seleccionada y revisa cada acción solicitada.",
        )}
      >
        <ProductResourcePicker
          {...resources}
          value={resourceId}
          onChange={(value) => {
            [read, execute, approval].forEach((operation) => operation.reset());
            setResourceId(value);
            setTools([]);
            setToolId("");
            setManualToolName("");
            setRun(null);
            setSubmittedApproval("");
            setJob(null);
            setHistory([]);
            setReview(null);
          }}
          disabled={busy}
        />
        <div className="mt-4">
          <ProductFields
            action={queryAction}
            values={extra}
            onChange={(value) => {
              setExtra(value);
              setReview(null);
            }}
            exclude={["resourceId", "view"]}
          />
        </div>
        <div className="my-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            loading={read.pending}
            disabled={!queryAction || busy}
            onClick={() => {
              void discover();
            }}
          >
            <RefreshCw />
            {queryAction
              ? l(queryAction.label.en, queryAction.label.es)
              : l(
                  "Discover available tools",
                  "Descubrir herramientas disponibles",
                )}
          </Button>
          <Button
            variant="outline"
            disabled={!queryAction || busy || read.pending || (!run && !job)}
            onClick={() => {
              void discover("run");
            }}
          >
            {l("Refresh execution", "Actualizar ejecución")}
          </Button>
        </div>
        <ProductRecordList
          records={tools}
          selected={toolId}
          onSelect={(tool) => {
            if (!toolAction) {
              setExtra((values) => ({
                ...values,
                threadId: tool.id,
                runId: tool.id,
              }));
              setReview(null);
              return;
            }
            setToolId(tool.id);
            setMode("tool");
            const schemaFields = productToolFields(tool);
            setToolValues(
              Object.fromEntries(
                schemaFields.map((field) => [
                  field.id,
                  field.type === "toggle"
                    ? false
                    : (field.options?.[0]?.value ?? ""),
                ]),
              ),
            );
            setParameters([]);
            setInputText("{}");
            setReview(null);
          }}
        />
        <ProductOperationFeedback operation={read} />
        <ProductActionUnavailable action={queryAction} />
      </ProductPanel>
      <ProductPanel title={l("Prepare an execution", "Preparar una ejecución")}>
        <div className="space-y-4">
          <Select
            label={l("Execution type", "Tipo de ejecución")}
            value={mode}
            onValueChange={(value) => {
              setMode(value);
              setReview(null);
            }}
            options={[
              {
                value: "agent",
                label: l("Agent task", "Tarea de agente"),
                disabled: !agentAction,
              },
              {
                value: "tool",
                label: l("Tool call", "Llamada a herramienta"),
                disabled: !toolAction,
              },
            ]}
          />
          {mode === "agent" ? (
            <ProductLabeledTextarea
              label={l(
                "Task and expected outcome",
                "Tarea y resultado esperado",
              )}
              value={goal}
              onChange={(event) => {
                setGoal(event.target.value);
                setReview(null);
              }}
              disabled={busy}
            />
          ) : (
            <>
              <Select
                label={l("Discovered tool", "Herramienta descubierta")}
                value={toolId}
                options={tools.map((tool) => ({
                  value: tool.id,
                  label: tool.name,
                }))}
                onValueChange={(value) => {
                  setToolId(value);
                  setManualToolName("");
                  setToolValues({});
                  setReview(null);
                }}
                disabled={busy}
              />
              <label className="block space-y-2 text-xs font-medium">
                {l(
                  "Or enter a tool name exposed by your backend",
                  "O introduce una herramienta expuesta por tu backend",
                )}
                <Input
                  value={manualToolName}
                  disabled={busy}
                  onChange={(event) => {
                    setManualToolName(event.target.value);
                    setToolId("");
                    setToolValues({});
                    setReview(null);
                  }}
                />
                <span className="block font-normal leading-6 text-muted-foreground">
                  {l(
                    "Your backend must resolve the name against its authorized tool catalog.",
                    "Tu backend debe resolver el nombre en su catálogo de herramientas autorizadas.",
                  )}
                </span>
              </label>
              {selectedTool && (
                <p className="text-xs leading-6 text-muted-foreground">
                  {selectedTool.description}
                </p>
              )}
              <label className="flex min-h-11 items-center gap-2 text-xs">
                <Checkbox
                  checked={structured}
                  onCheckedChange={(value) => {
                    setStructured(value);
                    setReview(null);
                  }}
                  disabled={busy}
                />
                {l("Use a JSON input object", "Usar un objeto JSON de entrada")}
              </label>
              {structured ? (
                <ProductLabeledTextarea
                  label={l("Tool arguments", "Argumentos de la herramienta")}
                  value={inputText}
                  className="font-mono text-xs"
                  spellCheck={false}
                  aria-invalid={!inputValid}
                  onChange={(event) => {
                    setInputText(event.target.value);
                    setReview(null);
                  }}
                  disabled={busy}
                />
              ) : fields.length ? (
                <ProductFields
                  fields={fields}
                  values={toolValues}
                  onChange={(value) => {
                    setToolValues(value);
                    setReview(null);
                  }}
                  disabled={busy}
                />
              ) : (
                <div className="space-y-3">
                  {parameters.map((parameter, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_1fr_auto] gap-2"
                    >
                      <Input
                        aria-label={`${l("Parameter name", "Nombre del parámetro")} ${index + 1}`}
                        value={parameter.name}
                        disabled={busy}
                        onChange={(event) => {
                          setParameters((items) =>
                            items.map((item, i) =>
                              i === index
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          );
                          setReview(null);
                        }}
                      />
                      <Input
                        aria-label={`${l("Parameter value", "Valor del parámetro")} ${index + 1}`}
                        value={parameter.value}
                        disabled={busy}
                        onChange={(event) => {
                          setParameters((items) =>
                            items.map((item, i) =>
                              i === index
                                ? { ...item, value: event.target.value }
                                : item,
                            ),
                          );
                          setReview(null);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={l("Remove parameter", "Quitar parámetro")}
                        onClick={() => {
                          setParameters((items) =>
                            items.filter((_, i) => i !== index),
                          );
                          setReview(null);
                        }}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      setParameters((items) => [
                        ...items,
                        { name: "", value: "" },
                      ])
                    }
                  >
                    <Plus />
                    {l("Add parameter", "Añadir parámetro")}
                  </Button>
                </div>
              )}
              {!inputValid && (
                <p role="alert" className="text-xs text-destructive-foreground">
                  {l(
                    "Complete the tool fields, use unique parameter names, or provide a valid JSON arguments object.",
                    "Completa los campos de la herramienta, usa nombres únicos o introduce un objeto JSON válido de argumentos.",
                  )}
                </p>
              )}
            </>
          )}
          <ProductFields
            action={action}
            values={extra}
            onChange={(value) => {
              setExtra(value);
              setReview(null);
            }}
            disabled={busy}
            exclude={[
              "resourceId",
              "toolId",
              "tool",
              "toolName",
              "goal",
              "prompt",
              "task",
              "input",
              "arguments",
              "checkpointId",
            ]}
          />
          <label className="block space-y-2 text-xs font-medium">
            {l(
              "Resume checkpoint ID (optional)",
              "ID del punto de reanudación (opcional)",
            )}
            <Input
              value={checkpointId}
              onChange={(event) => {
                setCheckpointId(event.target.value);
                setReview(null);
              }}
              disabled={busy}
            />
          </label>
          <ProductValidation action={action} values={prepared} />
          <Button
            appearance="gradient"
            disabled={
              !action ||
              busy ||
              Boolean(invalidProductField(action, prepared)) ||
              (mode === "agent" ? !goal.trim() : !toolName || !inputValid)
            }
            onClick={() => stage(action, prepared)}
          >
            <Play />
            {l("Review execution", "Revisar ejecución")}
          </Button>
          <ProductActionUnavailable action={action} />
          <ProductOperationFeedback operation={execute} />
        </div>
      </ProductPanel>
      {run && (
        <ProductPanel
          title={l(
            "Tool action and approval",
            "Acción y aprobación de herramienta",
          )}
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <ShieldCheck className="size-4 text-primary" />
            <h4 className="text-sm font-medium">{run.name}</h4>
            <ProductStatus value={run.state} />
          </div>
          <ProductDocumentPreview
            content={JSON.stringify(run.input)}
            format="json"
          />
          {run.state === "approval-required" && (
            <div className="mt-4 space-y-3">
              <p className="text-xs leading-6">
                {l(
                  "Review the input returned by the backend before approving or rejecting this pending action.",
                  "Revisa la entrada devuelta por el backend antes de aprobar o rechazar esta acción pendiente.",
                )}
              </p>
              <ProductFields
                action={approveAction}
                values={extra}
                onChange={(value) => {
                  setExtra(value);
                  setReview(null);
                }}
                exclude={[
                  "resourceId",
                  "approvalId",
                  "runId",
                  "decision",
                  "approved",
                ]}
                disabled={busy}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  appearance="gradient"
                  disabled={!canApprove || busy}
                  onClick={() =>
                    stage(
                      approveAction,
                      {
                        ...extra,
                        approvalId: run.approvalId!,
                        runId: run.id,
                        decision: "approve",
                        approved: true,
                      },
                      "approval",
                    )
                  }
                >
                  <Check />
                  {l("Review approval", "Revisar aprobación")}
                </Button>
                <Button
                  variant="outline"
                  disabled={!canApprove || busy}
                  onClick={() =>
                    stage(
                      approveAction,
                      {
                        ...extra,
                        approvalId: run.approvalId!,
                        runId: run.id,
                        decision: "reject",
                        approved: false,
                      },
                      "approval",
                    )
                  }
                >
                  <X />
                  {l("Review rejection", "Revisar rechazo")}
                </Button>
              </div>
              {!run.approvalId && (
                <p role="alert" className="text-xs text-destructive-foreground">
                  {l(
                    "The backend did not provide an approval ID. Reload this execution before making a decision.",
                    "El backend no proporcionó un ID de aprobación. Recarga la ejecución antes de decidir.",
                  )}
                </p>
              )}
              <ProductActionUnavailable action={approveAction} />
            </div>
          )}
          {run.output && (
            <div className="mt-5">
              <ProductDocumentPreview content={run.output} format="markdown" />
            </div>
          )}
          <ProductAgentRunSummary run={run} demo={props.adapter.mode === "demo"} />
          <div className="mt-4">
            <ProductOperationFeedback operation={approval} />
            {approval.result && approval.result.kind !== "tool" && (
              <>
                <ProductResult result={approval.result} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {l(
                    "Decision submitted. Refresh the execution to inspect its backend state.",
                    "Decisión enviada. Actualiza la ejecución para consultar su estado en el backend.",
                  )}
                </p>
              </>
            )}
          </div>
        </ProductPanel>
      )}
      {job && (
        <ProductPanel
          title={l(
            "Execution progress and logs",
            "Progreso y registro de ejecución",
          )}
        >
          <ProductJobResult job={job} />
        </ProductPanel>
      )}
      <ProductPanel
        title={l(
          "Checkpoints and execution history",
          "Puntos de control e historial",
        )}
      >
        <div className="mb-4 space-y-3">
          <ProductFields
            action={checkpointAction}
            values={extra}
            onChange={(value) => {
              setExtra(value);
              setReview(null);
            }}
            exclude={["resourceId", "runId"]}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!checkpointAction || busy || (!run && !job)}
              onClick={() =>
                stage(checkpointAction, {
                  ...extra,
                  runId: run?.id ?? job?.id ?? "",
                })
              }
            >
              <ListRestart />
              {l("Review checkpoint", "Revisar punto de control")}
            </Button>
            <Button
              variant="outline"
              disabled={!queryAction || read.pending}
              onClick={() => {
                void discover("checkpoints");
              }}
            >
              {l("Load checkpoints", "Cargar puntos de control")}
            </Button>
          </div>
        </div>
        {checkpoints.length > 0 && (
          <ProductRecordList
            records={checkpoints}
            selected={checkpointId}
            onSelect={(record) => {
              setCheckpointId(record.id);
              setReview(null);
            }}
          />
        )}
        {history.length ? (
          <ol className="space-y-2">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div>
                  <p className="text-xs font-medium">{item.name}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {item.id}
                  </p>
                </div>
                <ProductStatus value={item.state} />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setRun(item);
                    setReview(null);
                  }}
                >
                  {l("Inspect", "Revisar")}
                </Button>
              </li>
            ))}
          </ol>
        ) : (
          <ProductEmpty>
            {l(
              "Completed requests and backend checkpoints will appear here.",
              "Las solicitudes realizadas y los puntos de control del backend aparecerán aquí.",
            )}
          </ProductEmpty>
        )}
        {execute.result && !["tool", "job"].includes(execute.result.kind) && (
          <div className="mt-4">
            <ProductResult result={execute.result} />
          </div>
        )}
      </ProductPanel>
      {review && (
        <ProductReview
          action={review.action}
          values={review.values}
          pending={busy}
          grantedPermissions={props.connection.grantedPermissions}
          disabled={
            review.lane === "approval" &&
            (run?.approvalId !== review.values.approvalId ||
              submittedApproval === review.values.approvalId)
          }
          onConfirm={() => {
            void submit();
          }}
          onReject={() => setReview(null)}
        >
          {review.values.input && (
            <div className="mb-4">
              <ProductDocumentPreview
                content={String(review.values.input)}
                format="json"
              />
            </div>
          )}
          {review.action.kind === "approve-tool" && run && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold">{run.name}</p>
              <ProductDocumentPreview
                content={JSON.stringify(run.input)}
                format="json"
              />
            </div>
          )}
        </ProductReview>
      )}
    </div>
  );
}
