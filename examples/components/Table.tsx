"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";

type Plan = { id: string; name: string; priceUSD: number };

const plans: Plan[] = [
  { id: "starter", name: "Starter", priceUSD: 19 },
  { id: "pro", name: "Pro", priceUSD: 49 },
  { id: "studio", name: "Studio", priceUSD: 99 },
];
const labels: Record<"caption" | "plan" | "price", string> = {
  caption: "Illustrative plans and monthly prices. No purchase is made.",
  plan: "Plan",
  price: "Price (USD)",
};

export default function TableExample() {
  return (
    <Table>
      <TableCaption>{labels.caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{labels.plan}</TableHead>
          <TableHead scope="col">{labels.price}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.map((plan) => (
          <TableRow key={plan.id}>
            <TableHead scope="row" className="font-medium text-foreground">
              {plan.name}
            </TableHead>
            <TableCell>${plan.priceUSD}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
