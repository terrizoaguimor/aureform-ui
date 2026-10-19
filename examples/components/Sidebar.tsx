"use client";

import { CalendarDays, LayoutDashboard, Layers } from "lucide-react";
import { Brand } from "@/components/brand";
import { Sidebar, type SidebarGroup } from "@/components/ui/sidebar";

const groups: SidebarGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        href: "/en/dashboard/",
        icon: <LayoutDashboard aria-hidden="true" />,
        active: true,
      },
      {
        label: "Components",
        href: "/en/components/",
        icon: <Layers aria-hidden="true" />,
      },
    ],
  },
  {
    label: "Applications",
    collapsible: true,
    open: true,
    items: [
      {
        label: "Calendar",
        href: "/en/calendar/",
        icon: <CalendarDays aria-hidden="true" />,
      },
    ],
  },
];

export default function SidebarExample() {
  return (
    <Sidebar
      brand={<Brand />}
      label="Example main navigation"
      groups={groups}
      className="h-[28rem] max-w-full rounded-xl border border-border"
      footer={<p className="text-xs text-muted-foreground">Studio workspace</p>}
    />
  );
}
