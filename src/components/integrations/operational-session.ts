"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useIntegrationOperation } from "@/hooks/use-integration-operation";
import type {
  IntegrationAction,
  IntegrationResult,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  emptyOperationalSnapshot,
  mergeOperationalResult,
  operationalDefaultQuery,
  operationalPayload,
  operationalPermitted,
  scopedOperationalValues,
  validateOperationalValues,
} from "./operational-model";

export type OperationalHistoryEntry = {
  sequence: number;
  action: IntegrationAction;
  values: IntegrationValues;
  result: IntegrationResult;
  receivedAt: string;
};

/** Read and mutation channels keep a refresh from replacing an action receipt. */
export function useOperationalSession(props: IntegrationWorkbenchProps) {
  const read = useIntegrationOperation(props);
  const write = useIntegrationOperation(props);
  const { run: readRun, reset: readReset } = read;
  const { run: writeRun, upload: writeUpload, reset: writeReset } = write;
  const [snapshot, setSnapshot] = useState(emptyOperationalSnapshot);
  const [history, setHistory] = useState<OperationalHistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [queryId, setQueryId] = useState(
    () =>
      operationalDefaultQuery(
        props.definition,
        props.connection.resourceIds,
        props.connection.grantedPermissions,
      )?.id,
  );
  const historySequence = useRef(0);
  const queryInputs = useRef(new Map<string, IntegrationValues>());
  const generation = useRef(0);
  const mounted = useRef(false);
  const context = useRef(props);
  useLayoutEffect(() => {
    context.current = props;
  }, [props]);
  const queries = props.definition.actions.filter(
    (action) => action.kind === "query",
  );
  const query =
    queries.find((action) => action.id === queryId) ??
    operationalDefaultQuery(
      props.definition,
      props.connection.resourceIds,
      props.connection.grantedPermissions,
    );
  const connected =
    props.connection.status === "connected" && !props.scope.signal?.aborted;
  const can = (action: IntegrationAction | null) =>
    connected &&
    operationalPermitted(action, props.connection.grantedPermissions);

  const accept = useCallback((result: IntegrationResult, replace: boolean) => {
    setSnapshot((previous) =>
      mergeOperationalResult(previous, result, replace),
    );
    if (replace) {
      setLoaded(true);
      setTotal(result.kind === "records" ? result.total : null);
    }
  }, []);

  const runRead = useCallback(
    async (action: IntegrationAction, values: IntegrationValues = {}) => {
      const ticket = generation.current;
      const adapter = props.adapter;
      const result = await readRun(action, operationalPayload(action, values));
      if (
        !result ||
        !mounted.current ||
        ticket !== generation.current ||
        context.current.adapter !== adapter ||
        context.current.scope.signal?.aborted
      )
        return null;
      accept(result, true);
      return result;
    },
    [accept, props.adapter, readRun],
  );

  const refresh = useCallback(
    async (values?: IntegrationValues) => {
      if (!query) return null;
      const input =
        values ??
        queryInputs.current.get(query.id) ??
        scopedOperationalValues(query, props.connection.resourceIds);
      if (Object.keys(validateOperationalValues(query, input)).length)
        return null;
      queryInputs.current.set(
        query.id,
        Object.fromEntries(
          Object.entries(input).map(([key, value]) => [
            key,
            Array.isArray(value) ? [...value] : value,
          ]),
        ),
      );
      return runRead(query, input);
    },
    [props.connection.resourceIds, query, runRead],
  );

  const run = useCallback(
    async (action: IntegrationAction, values: IntegrationValues = {}) => {
      const ticket = generation.current;
      const adapter = props.adapter;
      const input = operationalPayload(action, values);
      const result = await writeRun(action, input);
      if (
        !result ||
        !mounted.current ||
        ticket !== generation.current ||
        context.current.adapter !== adapter ||
        context.current.scope.signal?.aborted
      )
        return null;
      accept(result, false);
      const entry: OperationalHistoryEntry = {
        sequence: ++historySequence.current,
        action,
        values: input,
        result,
        receivedAt: new Date().toISOString(),
      };
      setHistory((previous) => [entry, ...previous].slice(0, 20));
      return result;
    },
    [accept, props.adapter, writeRun],
  );

  const upload = useCallback(
    async (file: File, alt?: string) => {
      const ticket = generation.current;
      const adapter = props.adapter;
      const result = await writeUpload(file, alt);
      if (
        !result ||
        !mounted.current ||
        ticket !== generation.current ||
        context.current.adapter !== adapter ||
        context.current.scope.signal?.aborted
      )
        return null;
      accept(result, false);
      return result;
    },
    [accept, props.adapter, writeUpload],
  );

  // Adapter replacement is also a scope change, even when connection IDs match.
  useEffect(() => {
    mounted.current = true;
    generation.current += 1;
    setSnapshot(emptyOperationalSnapshot());
    setHistory([]);
    setLoaded(false);
    setTotal(null);
    queryInputs.current.clear();
    readReset();
    writeReset();
    return () => {
      mounted.current = false;
      generation.current += 1;
      readReset();
      writeReset();
    };
  }, [props.adapter, readReset, writeReset]);

  useEffect(() => {
    if (connected && !props.scope.signal?.aborted) void refresh();
  }, [connected, props.adapter, props.scope.signal, refresh]);

  return {
    read,
    write,
    run,
    upload,
    refresh,
    runRead,
    query,
    queries,
    setQueryId,
    can,
    initialQueryValues: scopedOperationalValues(
      query,
      props.connection.resourceIds,
    ),
    snapshot,
    history,
    loaded,
    total,
    connected,
  };
}

export type OperationalSession = ReturnType<typeof useOperationalSession>;
