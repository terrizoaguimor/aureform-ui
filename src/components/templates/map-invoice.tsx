"use client";

import { MapsWorkspace } from "@/components/blocks/maps-workspace";
import { CommerceWorkspace } from "@/components/blocks/commerce-workspace";

/** Stable template entry points retained for source installs and Code Connect. */
export function MapsTemplate() {
  return <MapsWorkspace />;
}

export function InvoiceTemplate() {
  return <CommerceWorkspace mode="invoice" />;
}
