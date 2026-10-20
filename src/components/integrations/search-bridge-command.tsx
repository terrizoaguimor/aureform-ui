"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import {
  ArrowUpRight,
  FileSearch,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { integrationErrorMessage } from "@/hooks/use-integration-operation";
import { Button } from "@/components/ui/button";
import type { CommandItem } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  IntegrationErrorCode,
  IntegrationSearchHit,
} from "@/lib/integrations/contracts";
import {
  createSearchBridgeSession,
  filterShellNavigation,
  searchBridgeErrorCode,
  searchBridgeHref,
  type ShellSearchAdapter,
  type ShellSearchResult,
} from "@/lib/integrations/search-bridge";

type SearchState = {
  adapter?: ShellSearchAdapter;
  workspaceId: string;
  query: string;
  status: "idle" | "pending" | "success" | "error" | "cancelled";
  result?: ShellSearchResult;
  errorCode?: IntegrationErrorCode;
};

function useShellSearch({
  adapter,
  workspaceId,
  query,
  open,
  enabled,
}: {
  adapter?: ShellSearchAdapter;
  workspaceId: string;
  query: string;
  open: boolean;
  enabled: boolean;
}) {
  const [session] = useState(createSearchBridgeSession);
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  const text = query.trim();
  const [state, setState] = useState<SearchState>({
    workspaceId,
    query: "",
    status: "idle",
  });

  // Invalidate during commit, before a passive effect or an ignored abort can
  // publish data belonging to the previous provider, workspace or query.
  useLayoutEffect(() => {
    sequence.current += 1;
    session.cancel();
    return () => {
      sequence.current += 1;
      session.cancel();
    };
  }, [adapter, workspaceId, text, open, enabled, revision, session]);

  useEffect(() => {
    const ticket = sequence.current;
    const context = { adapter, workspaceId, query: text };
    if (!open || !enabled || !adapter || !text) {
      setState({ ...context, status: "idle" });
      return;
    }
    setState({ ...context, status: "pending" });
    const timer = setTimeout(() => {
      if (ticket !== sequence.current) return;
      void session
        .run(adapter, { workspaceId, query: text })
        .then((result) => {
          if (!result || ticket !== sequence.current) return;
          setState({ ...context, status: "success", result });
        })
        .catch((cause: unknown) => {
          if (ticket !== sequence.current) return;
          setState({
            ...context,
            status: "error",
            errorCode: searchBridgeErrorCode(cause),
          });
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [adapter, workspaceId, text, open, enabled, revision, session]);

  const current =
    open &&
    enabled &&
    state.adapter === adapter &&
    state.workspaceId === workspaceId &&
    state.query === text;
  const visibleState: SearchState = current
    ? state
    : { workspaceId, query: text, status: "idle" };
  return {
    state: visibleState,
    retry: () => setRevision((value) => value + 1),
    cancel: () => {
      sequence.current += 1;
      session.cancel();
      setState({
        adapter,
        workspaceId,
        query: text,
        status: "cancelled",
      });
    },
  };
}

type SearchBridgeCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  label: string;
  placeholder: string;
  emptyLabel: string;
  closeLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  workspaceId: string;
  enabled: boolean;
  adapter?: ShellSearchAdapter;
  onNavigate: (href: string) => void;
};

/** Reuses the shell's dialog and cmdk keyboard behavior without filtering source ranking. */
export function SearchBridgeCommand({
  open,
  onOpenChange,
  items,
  label,
  placeholder,
  emptyLabel,
  closeLabel,
  search,
  onSearchChange,
  workspaceId,
  enabled,
  adapter,
  onNavigate,
}: SearchBridgeCommandProps) {
  const { l, locale, number } = useLanguage();
  const localPreview = adapter?.mode === "demo";
  const request = useShellSearch({
    adapter,
    workspaceId,
    query: search,
    open,
    enabled,
  });
  const navigation = filterShellNavigation(items, search);
  const groups = [...new Set(navigation.map((item) => item.group ?? ""))];
  const hits = request.state.result?.hits ?? [];
  const [preview, setPreview] = useState<{
    hit: IntegrationSearchHit;
    adapter?: ShellSearchAdapter;
    workspaceId: string;
    query: string;
  } | null>(null);
  const visiblePreview =
    preview &&
    open &&
    request.state.status === "success" &&
    request.state.result?.hits.includes(preview.hit) &&
    preview.adapter === adapter &&
    preview.workspaceId === workspaceId &&
    preview.query === search.trim()
      ? preview.hit
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="min-w-0 overflow-hidden p-0"
        closeLabel={closeLabel}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <DialogDescription className="sr-only">
          {adapter
            ? l(
                "Search authorized workspace sources and navigate with the arrow keys.",
                "Busca en las fuentes autorizadas del espacio y navega con las flechas.",
              )
            : placeholder}
        </DialogDescription>
        <CommandPrimitive label={label} shouldFilter={false}>
          <div className="flex items-center gap-3 border-b border-border px-5 pr-12">
            <Search
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <CommandPrimitive.Input
              value={search}
              onValueChange={onSearchChange}
              placeholder={placeholder}
              maxLength={2000}
              className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {adapter && (
            <div className="border-b border-border bg-surface-subtle/40 px-5 py-3">
              {request.state.status === "pending" ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    role="status"
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <LoaderCircle
                      className="size-3.5 motion-safe:animate-spin"
                      aria-hidden
                    />
                    {l(
                      "Searching this workspace…",
                      "Buscando en este espacio…",
                    )}
                  </p>
                  <Button variant="ghost" size="sm" onClick={request.cancel}>
                    {l("Cancel search", "Cancelar búsqueda")}
                  </Button>
                </div>
              ) : request.state.status === "error" ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    role="alert"
                    className="max-w-sm text-xs leading-6 text-destructive-foreground"
                  >
                    {integrationErrorMessage(
                      request.state.errorCode ?? "provider-error",
                      locale,
                    )}
                  </p>
                  <Button variant="outline" size="sm" onClick={request.retry}>
                    {l("Retry search", "Reintentar búsqueda")}
                  </Button>
                </div>
              ) : request.state.status === "cancelled" ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    role="status"
                    className="text-xs leading-6 text-muted-foreground"
                  >
                    {l(
                      "Search cancelled. Your query is still here.",
                      "Búsqueda cancelada. La consulta sigue aquí.",
                    )}
                  </p>
                  <Button variant="outline" size="sm" onClick={request.retry}>
                    {l("Retry search", "Reintentar búsqueda")}
                  </Button>
                </div>
              ) : request.state.status === "success" ? (
                <p
                  role="status"
                  className="text-xs leading-6 text-muted-foreground"
                >
                  {hits.length
                    ? `${number(request.state.result?.total ?? 0)} ${
                        localPreview
                          ? l(
                              "local preview results",
                              "resultados de la demo local",
                            )
                          : l("connected results", "resultados conectados")
                      }`
                    : l(
                        "No connected items returned. Try different terms or an authorized source.",
                        "No se devolvieron elementos conectados. Prueba otros términos o una fuente autorizada.",
                      )}
                </p>
              ) : (
                <p
                  role="status"
                  className="text-xs leading-6 text-muted-foreground"
                >
                  {enabled
                    ? localPreview
                      ? l(
                          "Type to search the local workspace preview.",
                          "Escribe para buscar en la demo local del espacio.",
                        )
                      : l(
                          "Type to search your connected workspace.",
                          "Escribe para buscar en tu espacio conectado.",
                        )
                    : l(
                        "Preparing this workspace…",
                        "Preparando este espacio…",
                      )}
                </p>
              )}
            </div>
          )}
          <CommandPrimitive.List className="max-h-[min(60vh,400px)] overflow-y-auto p-2">
            {request.state.status !== "pending" && (
              <CommandPrimitive.Empty className="p-8 text-center text-xs text-muted-foreground">
                {adapter
                  ? l(
                      "No navigation matches this query.",
                      "Ninguna ruta coincide con esta consulta.",
                    )
                  : emptyLabel}
              </CommandPrimitive.Empty>
            )}
            {hits.length > 0 && (
              <CommandPrimitive.Group
                heading={
                  localPreview
                    ? l("Local workspace preview", "Demo local del espacio")
                    : l("Connected workspace", "Espacio conectado")
                }
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {hits.map((hit, index) => (
                  <CommandPrimitive.Item
                    key={`${hit.source}:${hit.id}:${index}`}
                    value={`connected-result-${index}`}
                    onSelect={() => {
                      const href = searchBridgeHref(hit.url);
                      if (href) {
                        onNavigate(href);
                        onOpenChange(false);
                      } else {
                        setPreview({
                          hit,
                          adapter,
                          workspaceId,
                          query: search.trim(),
                        });
                      }
                    }}
                    className="flex min-h-11 cursor-default items-start gap-3 rounded-lg px-3 py-3 text-xs aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <FileSearch
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-medium">
                        {hit.title}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                        {hit.source}
                      </span>
                      {hit.snippet && (
                        <span className="mt-1 line-clamp-2 block break-words text-[11px] leading-5 text-muted-foreground">
                          {hit.snippet}
                        </span>
                      )}
                    </span>
                    {hit.url && (
                      <ArrowUpRight
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            )}
            {groups.map((group) => (
              <CommandPrimitive.Group
                key={group}
                heading={group || undefined}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {navigation
                  .filter((item) => (item.group ?? "") === group)
                  .map((item) => (
                    <CommandPrimitive.Item
                      key={item.id}
                      value={`navigation:${item.id}`}
                      onSelect={() => {
                        item.onSelect();
                        onOpenChange(false);
                      }}
                      className="flex min-h-11 cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-xs aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg]:size-4"
                    >
                      {item.icon}
                      {item.label}
                    </CommandPrimitive.Item>
                  ))}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
        {visiblePreview && (
          <section
            aria-label={l(
              "Search result preview",
              "Vista previa del resultado",
            )}
            className="max-h-52 overflow-y-auto border-t border-border bg-surface-subtle/40 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 break-words text-sm font-semibold">
                {visiblePreview.title}
              </h3>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={l(
                  "Close result preview",
                  "Cerrar vista previa del resultado",
                )}
                onClick={() => setPreview(null)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
            <p className="mt-2 break-words text-xs leading-6">
              {visiblePreview.snippet ||
                l(
                  "This source supplied a title without a passage.",
                  "Esta fuente proporcionó un título sin fragmento.",
                )}
            </p>
            <p className="mt-2 break-words text-[10px] text-muted-foreground">
              {visiblePreview.source}
            </p>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
