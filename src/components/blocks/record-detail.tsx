"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { FileSearch, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type RecordDetailMetadata = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
};

export type RecordDetailTab = {
  value: string;
  label: ReactNode;
  content: ReactNode;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
  keepMounted?: boolean;
};

export type RecordDetailLabels = {
  loading: string;
  refreshing: string;
  errorTitle: string;
  retry: string;
  retryError: string;
  notFoundTitle: string;
  notFoundDescription: string;
  tabs: string;
};

export type GenericRecordDetailProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  avatar?: ReactNode;
  status?: ReactNode;
  metadata?: readonly RecordDetailMetadata[];
  actions?: ReactNode;
  backAction?: ReactNode;
  tabs?: readonly RecordDetailTab[];
  activeTab?: string;
  defaultTab?: string;
  onTabChange?: (value: string) => void;
  children?: ReactNode;
  relatedContent?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void | Promise<void>;
  notFound?: boolean;
  notFoundAction?: ReactNode;
  labels?: Partial<RecordDetailLabels>;
  className?: string;
};

/** Presentation and UI state only. Data, permissions and mutations stay with the caller. */
export function GenericRecordDetail({
  title,
  subtitle,
  eyebrow,
  avatar,
  status,
  metadata = [],
  actions,
  backAction,
  tabs = [],
  activeTab,
  defaultTab,
  onTabChange,
  children,
  relatedContent,
  loading = false,
  error,
  onRetry,
  notFound = false,
  notFoundAction,
  labels,
  className,
}: GenericRecordDetailProps) {
  const { l } = useLanguage();
  const headingId = useId();
  const retryPending = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  useEffect(() => setRetryError(null), [error]);
  const copy: RecordDetailLabels = {
    loading: l("Loading record…", "Cargando registro…"),
    refreshing: l("Updating record…", "Actualizando registro…"),
    errorTitle: l("Something needs attention", "Algo necesita atención"),
    retry: l("Try again", "Intentar de nuevo"),
    retryError: l(
      "The record could not be loaded. Please try again.",
      "No se pudo cargar el registro. Intenta de nuevo.",
    ),
    notFoundTitle: l("Record not found", "Registro no encontrado"),
    notFoundDescription: l(
      "This record may have been removed, or you may not have access to it.",
      "Es posible que este registro se haya eliminado o que no tengas acceso.",
    ),
    tabs: l("Record sections", "Secciones del registro"),
    ...labels,
  };
  const hasContent =
    children != null ||
    tabs.length > 0 ||
    metadata.length > 0 ||
    avatar != null;
  const initialLoading = loading && !hasContent;
  const missing = notFound && !loading;
  const problem = retryError || error;
  const firstTab = tabs.find((tab) => !tab.disabled)?.value;
  const initialTab = tabs.some(
    (tab) => tab.value === defaultTab && !tab.disabled,
  )
    ? defaultTab
    : firstTab;
  const selectedTab =
    activeTab === undefined
      ? undefined
      : tabs.some((tab) => tab.value === activeTab && !tab.disabled)
        ? activeTab
        : firstTab;

  const retry = async () => {
    if (!onRetry || retryPending.current || loading) return;
    retryPending.current = true;
    setRetrying(true);
    setRetryError(null);
    try {
      await onRetry();
    } catch (cause) {
      setRetryError(
        cause instanceof Error && cause.message
          ? cause.message
          : copy.retryError,
      );
    } finally {
      retryPending.current = false;
      setRetrying(false);
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={loading || retrying}
      className={cn("grid min-w-0 gap-5 sm:gap-6", className)}
      data-slot="record-detail"
    >
      {backAction && <div className="flex min-w-0">{backAction}</div>}
      {initialLoading ? (
        <Card appearance="flat" className="p-5 sm:p-7">
          <h1 id={headingId} className="sr-only">
            {copy.loading}
          </h1>
          <p role="status" className="mb-5 text-sm text-muted-foreground">
            {copy.loading}
          </p>
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-2xl" />
            <div className="grid w-full max-w-md gap-3">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-24" />
            ))}
          </div>
        </Card>
      ) : missing ? (
        <Card
          appearance="flat"
          className="flex flex-col items-center gap-4 px-5 py-14 text-center"
        >
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-2xl border border-border bg-surface-subtle text-muted-foreground"
          >
            <FileSearch className="size-5" />
          </span>
          <h1 id={headingId} className="text-xl font-semibold tracking-tight">
            {copy.notFoundTitle}
          </h1>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            {copy.notFoundDescription}
          </p>
          {notFoundAction && <div className="mt-2">{notFoundAction}</div>}
        </Card>
      ) : (
        <Card appearance="gradient" className="overflow-hidden p-5 sm:p-7">
          {eyebrow && (
            <p className="mb-5 text-[11px] font-semibold tracking-[.1em] text-primary uppercase">
              {eyebrow}
            </p>
          )}
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              {avatar && <div className="shrink-0">{avatar}</div>}
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <h1
                    id={headingId}
                    className="min-w-0 text-[28px] leading-tight font-semibold tracking-[-.035em] break-words sm:text-[34px]"
                  >
                    {title}
                  </h1>
                  {status}
                </div>
                {subtitle && (
                  <p className="mt-2 text-[13px] leading-6 break-words text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {actions}
              </div>
            )}
          </div>
          {metadata.length > 0 && (
            <dl className="mt-6 grid min-w-0 grid-cols-2 gap-x-5 gap-y-5 border-t border-border/70 pt-5 lg:grid-cols-4">
              {metadata.map((item) => (
                <div key={item.id} className="min-w-0">
                  <dt className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {item.icon && (
                      <span aria-hidden="true" className="[&_svg]:size-3.5">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-sm font-semibold break-words">
                    {item.value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      )}

      {loading && hasContent && !missing && (
        <p role="status" className="text-xs text-muted-foreground">
          {copy.refreshing}
        </p>
      )}
      {problem && (
        <div className="grid gap-3">
          <Alert variant="destructive" title={copy.errorTitle}>
            {problem}
          </Alert>
          {onRetry && (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void retry()}
                loading={retrying}
                disabled={loading}
              >
                <RefreshCw aria-hidden="true" />
                {copy.retry}
              </Button>
            </div>
          )}
        </div>
      )}
      {!initialLoading && !missing && (
        <>
          {tabs.length > 0 ? (
            <Tabs
              className="min-w-0 max-w-full"
              value={selectedTab}
              defaultValue={initialTab}
              onValueChange={(value) => onTabChange?.(String(value))}
            >
              <TabsList
                aria-label={copy.tabs}
                className="w-full justify-start sm:w-auto"
              >
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    disabled={tab.disabled}
                  >
                    {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="rounded-md bg-surface-subtle px-1.5 py-0.5 text-[10px] tabular-nums">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((tab) => (
                <TabsContent
                  key={tab.value}
                  value={tab.value}
                  keepMounted={tab.keepMounted ?? true}
                >
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            children
          )}
          {relatedContent}
        </>
      )}
    </section>
  );
}
