import { prisma } from "@/lib/db/prisma";

export async function listProductsByTenant(tenantId: string) {
  return prisma.products.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProduct(params: {
  tenantId: string;
  name: string;
  code: string;
  barcode: string;
  salePrice: number;
}) {
  return prisma.products.create({
    data: {
      tenantId: params.tenantId,
      code: params.code ?? `URUN-${Date.now()}`,
      name: params.name,
      status: "active",
      payload: {
        barcode: params.barcode,
        salePrice: params.salePrice ?? 0,
      },
      occurredAt: new Date(),
    },
  });
}
