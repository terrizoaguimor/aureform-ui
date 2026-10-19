"use client";

import { publicPath } from "@/lib/public-path";
import { ArrowUpRight, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useWorkspace } from "@/components/workspace-provider";
import { PageHeading } from "@/components/blocks/page-heading";
import {
  WorkspaceLoading,
  WorkspacePermission,
  WorkspaceStatus,
} from "@/components/blocks/workspace-status";
import { ImportWizard } from "@/components/blocks/import-wizard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useSaasAction } from "@/components/templates/saas-operations";
import {
  customerImportFields,
  getCustomerImportKey,
  type ImportCallback,
  type CustomerImportRow,
} from "@/lib/csv-import";
import { cn } from "@/lib/utils";

function beforeCommit(signal: AbortSignal, delay: number) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, delay);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export function CustomerImportTemplate() {
  const scope = useWorkspace();
  const { l, locale } = useLanguage();
  const action = useSaasAction();
  const importRows: ImportCallback<CustomerImportRow> = async (
    rows,
    context,
  ) => {
    // Stage all records first. Cancellation/rejection cannot leave a partial write.
    const staged = rows.map((row) => ({
      ...row,
      id: `customer-${crypto.randomUUID()}`,
    }));
    for (let completed = 0; completed < staged.length; completed += 25) {
      await beforeCommit(context.signal, 45);
      context.onProgress({
        completed: Math.min(completed + 25, staged.length),
        total: staged.length,
      });
    }
    await beforeCommit(context.signal, 120);
    context.signal.throwIfAborted();
    return action(() => scope.importCustomers(staged, context.mode));
  };
  if (!scope.ready) return <WorkspaceLoading />;
  return (
    <div className="grid min-w-0 gap-5">
      <PageHeading
        eyebrow={l("Every record, considered", "Cada registro, con cuidado")}
        title={l(
          "Bring your customers with you.",
          "Trae a tus clientes contigo.",
        )}
        description={l(
          "Map your columns, resolve duplicates and review every change before it reaches your workspace.",
          "Relaciona las columnas, resuelve duplicados y revisa los cambios antes de guardarlos en tu espacio.",
        )}
        actions={
          <a
            href={publicPath(`/${locale}/customers/`)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {l("View customers", "Ver clientes")}
            <ArrowUpRight aria-hidden />
          </a>
        }
      />
      <WorkspaceStatus />
      <Card appearance="gradient">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-primary/20 bg-surface/80 p-2.5 text-primary">
              <FileSpreadsheet aria-hidden className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {l(
                  "A clear path from spreadsheet to workspace",
                  "De la hoja de cálculo al espacio de trabajo",
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {l(
                  "CSV · up to 5 MiB · 10,000 records",
                  "CSV · hasta 5 MiB · 10.000 registros",
                )}
              </p>
            </div>
          </div>
          <Badge variant="outline">
            <ShieldCheck aria-hidden className="size-3" />
            {l("Review before saving", "Revisión antes de guardar")}
          </Badge>
        </CardContent>
      </Card>
      {scope.can("customers.import") ? (
        <ImportWizard<CustomerImportRow>
          key={scope.workspaceId}
          locale={locale}
          fields={customerImportFields}
          onImport={importRows}
          getRowKey={getCustomerImportKey}
          existingKeys={scope.customers.map(getCustomerImportKey)}
          sampleFilename="aureform-customers.csv"
          sampleRows={[
            {
              name: "Alex Rivera",
              email: "alex@north.demo",
              company: "North Studio",
              plan: "Pro",
              status: "active",
              amount: 249,
              joined: "2026-10-19",
            },
            {
              name: "Isabel Moreno",
              email: "isabel@luma.demo",
              company: "Luma",
              plan: "Enterprise",
              status: "trial",
              amount: 699,
              joined: "2026-10-19",
            },
          ]}
          resourceHref={`/${locale}/customers/`}
          title={l("Import customers", "Importar clientes")}
          description={l(
            "Changes are saved to the selected workspace in this browser demo.",
            "Los cambios se guardan en el espacio seleccionado de esta demo del navegador.",
          )}
        />
      ) : (
        <div className={cn("py-2")}>
          <WorkspacePermission
            description={l(
              "A member or administrator can import customers into this workspace.",
              "Un miembro o administrador puede importar clientes en este espacio.",
            )}
          />
        </div>
      )}
    </div>
  );
}
