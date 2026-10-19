"use client";

import { Breadcrumb } from "@/components/ui/breadcrumb";

export default function BreadcrumbExample() {
  return (
    <Breadcrumb
      label="Workspace breadcrumb"
      items={[
        { label: "Workspace", href: "/en/dashboard/" },
        { label: "Customers", href: "/en/customers/" },
        { label: "Customer details" },
      ]}
    />
  );
}
