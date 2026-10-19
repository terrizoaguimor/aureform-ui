"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function TabsExample() {
  return (
    <Tabs defaultValue="overview">
      <TabsList aria-label="Project information">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm">
          A considered starting point for your next product.
        </p>
      </TabsContent>
      <TabsContent value="details">
        <p className="text-sm">
          Source components, design tokens and native Figma components.
        </p>
      </TabsContent>
    </Tabs>
  );
}
