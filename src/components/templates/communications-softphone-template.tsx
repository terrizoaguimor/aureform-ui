"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Settings2, ShieldCheck } from "lucide-react";
import { CommunicationsSetup } from "@/components/blocks/communications-setup";
import { SoftphoneTemplate } from "./softphone-template";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import type { CommunicationsAdapter } from "@/lib/communications/contracts";
import type { ConnectedSoftphoneLiveProps } from "@/components/communications/connected-softphone";

const ConnectedSoftphone = dynamic(() =>
  import("@/components/communications/connected-softphone").then(
    (module) => module.ConnectedSoftphone,
  ),
);
const ReferenceConnection = dynamic(() =>
  import("@/components/communications/reference-connection").then(
    (module) => module.ReferenceConnection,
  ),
);

/** Keep the original softphone public contract and its Figma source intact. */
export function CommunicationsSoftphoneTemplate({
  adapter,
  connection,
}: {
  adapter?: CommunicationsAdapter;
  connection?: ConnectedSoftphoneLiveProps;
}) {
  const { l } = useLanguage();
  const [open, setOpen] = useState(false);
  const referenceUrl = process.env.NEXT_PUBLIC_COMMUNICATIONS_BACKEND_URL;
  if (connection) return <ConnectedSoftphone {...connection} />;
  if (!adapter && referenceUrl)
    return <ReferenceConnection backendUrl={referenceUrl} />;
  return (
    <div className="grid gap-5">
      {!adapter && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 via-surface to-surface p-4 shadow-sm sm:px-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck
              aria-hidden="true"
              className="size-4 shrink-0 text-primary"
            />
            {l(
              "Explore setup with two credentials per provider.",
              "Explora la configuración con dos credenciales por proveedor.",
            )}
          </p>
          <Button
            variant="outline"
            className="min-h-11"
            data-testid="communications-configure-provider"
            onClick={() => setOpen(true)}
          >
            <Settings2 aria-hidden="true" className="size-4" />
            {l("Configure provider", "Configurar proveedor")}
          </Button>
        </div>
      )}
      <SoftphoneTemplate adapter={adapter} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-3xl"
          closeLabel={l("Close setup", "Cerrar configuración")}
        >
          <DialogTitle>
            {l("Provider setup", "Configuración del proveedor")}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Local demo with read-only example credentials. An authenticated backend enables automatic configuration for your own account.",
              "Demo local con credenciales de ejemplo de solo lectura. Un backend autenticado habilita la configuración automática de tu propia cuenta.",
            )}
          </DialogDescription>
          {open && (
            <CommunicationsSetup
              className="mt-5"
              defaultProvider="twilio"
              onOpenSoftphone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
