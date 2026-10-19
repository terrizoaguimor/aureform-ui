import { entitySeeds } from "./entities";
import { getProductAsset } from "./product-assets";
import type {
  CommerceProduct,
  CommerceSnapshot,
  OrderLine,
} from "../lib/commerce";

const descriptions: Record<string, string> = {
  "prd-001":
    "A sculptural desk lamp with a warm, focused glow. Made for considered workspaces.",
  "prd-002":
    "A generous lounge chair with soft upholstery and a quietly architectural frame.",
  "prd-003":
    "A cloth-bound notebook with smooth, responsibly sourced paper for everyday ideas.",
  "prd-004":
    "A durable cotton tote with a generous interior and a comfortable shoulder strap.",
  "prd-005":
    "A hand-finished ceramic cup with a tactile glaze and a balanced everyday shape.",
  "prd-006":
    "A sculptural ceramic vase with an understated silhouette and a matte finish.",
  "prd-007":
    "A compact side table with a folded profile, made to move easily between rooms.",
  "prd-008":
    "An original wall print on textured archival paper, ready for your favorite frame.",
};

export function createCommerceSeed(): CommerceSnapshot {
  const products: CommerceProduct[] = entitySeeds.products.map((item) => {
    const image = getProductAsset(item.id);
    return {
      id: item.id,
      name: item.name,
      sku: item.detail,
      description: descriptions[item.id] ?? "",
      category: item.category,
      status: item.status as CommerceProduct["status"],
      unitAmount: Math.round(item.amount * 100),
      currency: "usd",
      inventory: item.stock ?? 0,
      images: image
        ? [
            {
              id: `${item.id}-cover`,
              src: image.src,
              alt: image.alt.en,
              width: 1024,
              height: 1024,
            },
          ]
        : [],
      tags: [item.category, "Studio collection"],
      updatedAt: `${item.date}T12:00:00.000Z`,
    };
  });
  // Order lines are purchase-time snapshots; catalog edits never change them.
  const line = (
    productId: string,
    quantity = 1,
    unitAmount?: number,
  ): OrderLine => {
    const product = products.find((item) => item.id === productId)!;
    return {
      productId,
      name: product.name,
      quantity,
      unitAmount: unitAmount ?? product.unitAmount,
      image: product.images[0]?.src,
    };
  };
  const orderItems: OrderLine[][] = [
    [line("prd-001"), line("prd-006", 2)],
    [line("prd-002"), line("prd-001")],
    [line("prd-001")],
    [
      line("prd-001"),
      line("prd-008"),
      line("prd-005"),
      line("prd-006", 1, 6000),
    ],
    [line("prd-001"), line("prd-008", 1, 8600)],
    [line("prd-002")],
    [line("prd-006", 3)],
  ];
  return {
    version: 1,
    products,
    orders: entitySeeds.orders.map((item, index) => ({
      id: item.id,
      number: item.name,
      customerName: item.detail,
      customerEmail: `${item.detail.toLowerCase().replaceAll(" ", ".")}@example.com`,
      currency: "usd",
      total: Math.round(item.amount * 100),
      status: item.status as CommerceSnapshot["orders"][number]["status"],
      paymentStatus:
        item.status === "cancelled"
          ? "refunded"
          : item.status === "processing"
            ? "unpaid"
            : "paid",
      items: orderItems[index],
      createdAt: `${item.date}T12:00:00.000Z`,
      shippingAddress: "123 Studio Avenue, New York, NY 10013",
    })),
    invoices: entitySeeds.invoices.map((item) => ({
      id: item.id,
      number: item.name,
      customerName: item.detail,
      customerEmail: `billing@${item.detail.toLowerCase().replaceAll(" ", "")}.example`,
      description: item.category,
      amount: Math.round(item.amount * 100),
      currency: "usd",
      status:
        item.status === "pending"
          ? "open"
          : (item.status as CommerceSnapshot["invoices"][number]["status"]),
      issuedAt: `${item.date}T12:00:00.000Z`,
      dueAt:
        item.status === "overdue"
          ? "2026-10-15T23:59:59.000Z"
          : "2026-10-30T23:59:59.000Z",
    })),
    billing: {
      plan: "Pro",
      status: "active",
      amount: 24900,
      currency: "usd",
      interval: "month",
      currentPeriodEnd: "2026-11-14T12:00:00.000Z",
      cardBrand: "Visa",
      cardLast4: "4242",
      customerEmail: "billing@aureform.example",
    },
  };
}
