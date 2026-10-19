"use client";

import { useState } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function RowActions({
  name,
  edit,
  remove,
  view,
  viewLabel,
}: {
  name: string;
  edit?: () => void;
  remove?: () => void;
  view?: () => void;
  viewLabel?: string;
}) {
  const { l, common: t } = useLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${l("Actions for", "Acciones de")} ${name}`} />}><MoreHorizontal aria-hidden /></DropdownMenuTrigger>
      <DropdownMenuContent>
        {view && <DropdownMenuItem onClick={view}><Eye aria-hidden />{viewLabel ?? l("View invoice", "Ver factura")}</DropdownMenuItem>}
        {edit && <DropdownMenuItem onClick={edit}><Pencil aria-hidden />{t("edit")}</DropdownMenuItem>}
        {remove && <DropdownMenuItem destructive onClick={remove}><Trash2 aria-hidden />{t("delete")}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DeleteDialog({
  open,
  onOpenChange,
  onDelete,
  count,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onDelete: () => void | Promise<void>;
  count: number;
}) {
  const { l, common: t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (busy) return;
      setFailure("");
      onOpenChange(next);
    }}>
      <DialogContent closeLabel={t("close")}>
        <DialogTitle>{l(`Remove ${count} record${count === 1 ? "" : "s"}?`, `¿Eliminar ${count} registro${count === 1 ? "" : "s"}?`)}</DialogTitle>
        <DialogDescription>{l("This removes the selected records from the browser demo.", "Se eliminarán los registros seleccionados de la demo del navegador.")}</DialogDescription>
        {failure && <Alert variant="destructive" title={l("The records were not removed", "No se eliminaron los registros")} className="mt-4">{failure}</Alert>}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button variant="destructive" disabled={!count} loading={busy} onClick={async () => {
            if (busy) return;
            setFailure("");
            setBusy(true);
            try { await onDelete(); }
            catch (cause) { setFailure(cause instanceof Error ? cause.message : l("Try again.", "Inténtalo de nuevo.")); }
            finally { setBusy(false); }
          }}>{t("delete")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
