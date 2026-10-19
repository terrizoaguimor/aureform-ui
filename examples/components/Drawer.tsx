"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";

export default function DrawerExample() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={<Button type="button" variant="outline" />}>
        View project details
      </DrawerTrigger>
      <DrawerContent closeLabel="Close project details">
        <DrawerTitle className="pr-10 text-lg font-semibold">
          Studio project
        </DrawerTitle>
        <DrawerDescription className="mt-2 text-sm text-muted-foreground">
          A little more context for your next good idea.
        </DrawerDescription>
        <dl className="mt-6 grid gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd>Ready for review</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Next step</dt>
            <dd>Review the local interface preview</dd>
          </div>
        </dl>
        <DrawerClose render={<Button type="button" className="mt-6" />}>
          Done
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
