import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => {
  const now = new Date();
  return {
    prisma: {
      sales: {
        findMany: vi.fn(async () => [
          {
            id: "sale-1",
            code: "SAT-0001",
            name: "Demo Müşteri",
            payload: { netTotal: 1200 },
            occurredAt: now,
            createdAt: now,
          },
        ]),
      },
      saleItems: {
        findMany: vi.fn(async () => [
          {
            id: "sale-item-1",
            code: "SAT-0001",
            name: "Demo Ürün",
            payload: {
              productId: "product-1",
              quantity: 2,
              unitPrice: 600,
              netAmount: 1200,
            },
            occurredAt: now,
            createdAt: now,
          },
        ]),
      },
      stockBalances: {
        findMany: vi.fn(async () => [
          {
            name: "Demo Ürün",
            payload: { productId: "product-1", quantity: 2, minStockLevel: 5 },
          },
        ]),
      },
      products: {
        findMany: vi.fn(async () => [
          {
            id: "product-1",
            code: "URUN-1",
            name: "Demo Ürün",
            payload: { minStockLevel: 5 },
          },
        ]),
      },
      collections: {
        findMany: vi.fn(async () => [{ payload: { amount: 400 } }]),
      },
      paymentsOut: {
        findMany: vi.fn(async () => [{ payload: { amount: 100 } }]),
      },
      cashTransactions: {
        findMany: vi.fn(async () => [
          { payload: { direction: "in", amount: 400 }, occurredAt: now, createdAt: now },
          { payload: { direction: "out", amount: 100 }, occurredAt: now, createdAt: now },
        ]),
      },
      purchaseInvoices: {
        findMany: vi.fn(async () => []),
      },
      saleRegisterSessions: {
        count: vi.fn(async () => 0),
      },
      suspendedSales: {
        count: vi.fn(async () => 0),
      },
      customers: {
        findMany: vi.fn(async () => []),
      },
      user: {
        findMany: vi.fn(async () => []),
      },
      branches: {
        findMany: vi.fn(async () => []),
      },
      customerRiskProfiles: {
        findMany: vi.fn(async () => []),
      },
      balanceSnapshots: {
        findMany: vi.fn(async () => []),
      },
    },
  };
});

import { getDashboardSummary } from "@/modules/reporting/application/dashboard-service";

describe("dashboard service", () => {
  it("dashboard özet metriklerini üretir", async () => {
    const summary = await getDashboardSummary({ tenantId: "t1" });

    expect(summary.dailySales).toBe(1200);
    expect(summary.totalCollections).toBe(400);
    expect(summary.totalPayments).toBe(100);
    expect(summary.lowStockCount).toBe(1);
    expect(summary.cashBalance).toBe(300);
  });
});
