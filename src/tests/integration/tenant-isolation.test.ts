import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    products: {
      findMany: vi.fn(async (args: { where: { tenantId: string } }) => {
        return [{ id: "p1", tenantId: args.where.tenantId }];
      }),
    },
  },
}));

import { listProductsByTenant } from "@/lib/repositories/product-repository";

describe("tenant isolation", () => {
  it("sadece istenen tenant kayitlarini dondurur", async () => {
    const rows = await listProductsByTenant("tenant-A");
    expect(rows.every((row) => row.tenantId === "tenant-A")).toBe(true);
  });
});
