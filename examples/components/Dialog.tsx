"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function DialogExample() {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="grid justify-items-start gap-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button type="button" />}>
          Choose a layout
        </DialogTrigger>
        <DialogContent closeLabel="Close layout choice">
          <DialogTitle>A considered choice</DialogTitle>
          <DialogDescription>
            Use the Studio layout for this local preview? You can change it
            later.
          </DialogDescription>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              onClick={() => {
                setConfirmed(true);
                setOpen(false);
              }}
            >
              Use Studio layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p role="status" className="text-xs text-muted-foreground">
        {confirmed ? "Studio layout selected locally." : "No layout selected."}
      </p>
    </div>
  );
}
