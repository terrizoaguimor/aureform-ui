"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export default function AccordionExample() {
  return (
    <Accordion defaultValue={["source"]} className="max-w-xl">
      <AccordionItem value="source">
        <AccordionTrigger>What is included in the source kit?</AccordionTrigger>
        <AccordionContent>
          Original components, semantic design tokens and independent React
          examples.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="figma">
        <AccordionTrigger>Can I adapt the designs?</AccordionTrigger>
        <AccordionContent>
          Use the native Figma components and source APIs as a starting point
          for your product.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
