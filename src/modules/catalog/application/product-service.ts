import { prisma } from "@/lib/db/prisma";
import { applyStockDelta } from "@/modules/catalog/application/stock-service";
import type { ProductCreateInput, ProductListFilter, StockMovementListFilter } from "@/modules/catalog/domain/product-types";

export async function listProducts(filter: ProductListFilter) {
  const take = Math.min(Math.max(filter.limit ?? 100, 1), 250);
  const search = filter.search?.trim() ?? "";

  return prisma.products.findMany({
    where: {
      tenantId: filter.tenantId,
      status: filter.status ?? undefined,
      deletedAt: null,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ createdAt: "desc" }],
    take,
  });
}

export async function createProduct(input: ProductCreateInput) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const code = input.code ?? `URUN-${Date.now()}`;
    const salePrice = input.salePrice ?? 0;
    const purchasePrice = input.purchasePrice ?? 0;
    const openingStock = input.openingStock ?? 0;
    const parallelBarcodes = (input.parallelBarcodes ?? [])
      .map((value) => value.trim())
      .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);

    const productPayload = {
      barcode: input.barcode,
      parallelBarcodes,
      description: input.description,
      defaultUnit: input.defaultUnit ?? "ADET",
      salePrice,
      purchasePrice,
      vatRate: input.vatRate ?? 20,
      minStockLevel: input.minStockLevel ?? 0,
      maxStockLevel: input.maxStockLevel ?? 0,
      expiryTracking: input.expiryTracking ?? false,
      imageUrl: input.imageUrl,
      purchaseCurrency: input.purchaseCurrency ?? "TRY",
      saleCurrency1: input.saleCurrency1 ?? "TRY",
      salePrice2: input.salePrice2 ?? 0,
      saleCurrency2: input.saleCurrency2 ?? "TRY",
      salePrice3: input.salePrice3 ?? 0,
      saleCurrency3: input.saleCurrency3 ?? "TRY",
      salePrice4: input.salePrice4 ?? 0,
      saleCurrency4: input.saleCurrency4 ?? "TRY",
      specialCode1: input.specialCode1,
      specialCode2: input.specialCode2,
      specialCode3: input.specialCode3,
      specialCode4: input.specialCode4,
      productGroup: input.productGroup,
      productSubGroup: input.productSubGroup,
      expiryDate: input.expiryDate,
      discountRate: input.discountRate ?? 0,
      lockedForSale: input.lockedForSale ?? false,
      isScaleProduct: input.isScaleProduct ?? false,
      scaleProductCode: input.scaleProductCode,
      scaleBarcodeMode: input.scaleBarcodeMode ?? "weight",
      scaleTareGrams: input.scaleTareGrams ?? 0,
    };

    const product = await tx.products.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.name,
        status: "active",
        payload: productPayload,
        occurredAt: now,
      },
    });

    await tx.productPrices.create({
      data: {
        tenantId: input.tenantId,
        code: `${code}:1`,
        name: input.name,
        status: "active",
        payload: {
          productId: product.id,
          listName: "Varsayılan Satış Fiyatı",
          currency: input.saleCurrency1 ?? "TRY",
          salePrice,
          purchasePrice,
          vatRate: input.vatRate ?? 20,
        },
        occurredAt: now,
      },
    });

    if (openingStock !== 0) {
      await applyStockDelta({
        tx,
        tenantId: input.tenantId,
        productId: product.id,
        warehouseId: input.warehouseId,
        deltaQuantity: openingStock,
        movementCode: "OPENING",
        movementName: "Açılış Stok Girişi",
        movementPayload: {
          reason: "product_opening_stock",
          userId: input.userId,
        },
        occurredAt: now,
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        module: "product",
        entityName: "products",
        entityId: product.id,
        action: "product.created",
        payload: {
          code,
          name: input.name,
        },
      },
    });

    return product;
  });
}

export async function listStockMovements(filter: StockMovementListFilter) {
  const take = Math.min(Math.max(filter.limit ?? 100, 1), 500);

  return prisma.stockMovements.findMany({
    where: {
      tenantId: filter.tenantId,
      deletedAt: null,
      ...(filter.dateFrom || filter.dateTo
        ? {
            occurredAt: {
              gte: filter.dateFrom ? new Date(filter.dateFrom) : undefined,
              lte: filter.dateTo ? new Date(filter.dateTo) : undefined,
            },
          }
        : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take,
  });
}
