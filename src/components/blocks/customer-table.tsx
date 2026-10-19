"use client";
import { publicPath } from "@/lib/public-path";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, type DataTableLabels } from "@/components/ui/data-table";
export type CustomerRecord = {
  id: string;
  name: string;
  avatarSrc?: string;
  email: string;
  plan: string;
  status: string;
  amount: number;
  joined: string;
};
export type CustomerTableLabels = {
  title: string;
  viewAll: string;
  customer: string;
  plan: string;
  status: string;
  amount: string;
  joined: string;
  active: string;
  trial: string;
  paused: string;
  total: string;
};
export function CustomerTable({
  data,
  labels,
  viewAllHref,
  formatCurrency,
  formatDate,
}: {
  data: CustomerRecord[];
  labels: CustomerTableLabels;
  viewAllHref: string;
  formatCurrency: (n: number) => string;
  formatDate: (date: string) => string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between py-4">
        <CardTitle>{labels.title}</CardTitle>
        <a
          href={publicPath(viewAllHref)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {labels.viewAll}
        </a>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            {[
              labels.customer,
              labels.plan,
              labels.status,
              labels.amount,
              labels.joined,
            ].map((label) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 4).map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <div className="flex min-w-48 items-center gap-3">
                  <Avatar
                    name={customer.name}
                    src={customer.avatarSrc}
                    className="size-8 text-[10px]"
                  />
                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {customer.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{customer.plan}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    customer.status === "active"
                      ? "default"
                      : customer.status === "trial"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {customer.status === "active"
                    ? labels.active
                    : customer.status === "trial"
                      ? labels.trial
                      : labels.paused}
                </Badge>
              </TableCell>
              <TableCell className="font-medium tabular-nums">
                {formatCurrency(customer.amount)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                {formatDate(customer.joined)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">
        {labels.total}
      </div>
    </Card>
  );
}
export function CustomerDataTable({
  data,
  columns,
  labels,
  toolbar,
}: {
  data: CustomerRecord[];
  columns: ColumnDef<CustomerRecord>[];
  labels: Partial<DataTableLabels>;
  toolbar?: React.ReactNode;
}) {
  return (
    <DataTable
      data={data}
      columns={columns}
      labels={labels}
      toolbar={toolbar}
    />
  );
}
