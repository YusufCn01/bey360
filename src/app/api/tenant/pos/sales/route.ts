import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { userHasPermission } from "@/lib/rbac/guard";
import { ensureSerialCountUnlocked, SerialCountLockedError } from "@/modules/inventory/application/serial-count-lock";
import { completePosSale, PosValidationError } from "@/modules/pos/application/pos-service";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  productCode: z.string().max(100).optional(),
  productName: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  discountAmount: z.number().nonnegative().optional(),
  taxRate: z.number().nonnegative().max(100).optional(),
  warehouseId: z.string().max(100).optional(),
});

const paymentSchema = z.object({
  method: z.enum(["nakit", "kart", "havale_eft", "cari", "cek", "dekont"]),
  amount: z.number().positive(),
  reference: z.string().max(200).optional(),
});

const createSaleSchema = z.object({
  registerId: z.string().min(1).max(100),
  registerName: z.string().min(2).max(255),
  branchId: z.string().max(100).optional(),
  warehouseId: z.string().max(100).optional(),
  customerCode: z.string().max(100).optional(),
  customerName: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  currency: z.string().length(3).optional(),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
});

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "50"), 1), 250);
    const saleCode = (request.nextUrl.searchParams.get("saleCode") ?? "").trim();

    const sales = await prisma.sales.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        status: "completed",
        ...(saleCode
          ? {
              code: {
                contains: saleCode,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const saleIds = sales.map((item) => item.id);
    if (saleIds.length === 0) {
      return ok([]);
    }

    const [items, payments] = await Promise.all([
      prisma.saleItems.findMany({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
          code: { in: saleIds },
        },
      }),
      prisma.salePayments.findMany({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
          code: { in: saleIds },
        },
      }),
    ]);

    const itemMap = new Map<string, typeof items>();
    for (const row of items) {
      const key = row.code ?? "";
      if (!itemMap.has(key)) {
        itemMap.set(key, []);
      }
      itemMap.get(key)?.push(row);
    }

    const paymentMap = new Map<string, typeof payments>();
    for (const row of payments) {
      const key = row.code ?? "";
      if (!paymentMap.has(key)) {
        paymentMap.set(key, []);
      }
      paymentMap.get(key)?.push(row);
    }

    const rows = await Promise.all(
      sales.map(async (sale) => {
        const payload = asRecord(sale.payload);
        const lineRows = itemMap.get(sale.id) ?? [];

        const returnRows = await prisma.salesReturns.findMany({
          where: {
            tenantId: access.tenantId,
            deletedAt: null,
            status: "completed",
            payload: {
              path: ["originalSaleId"],
              equals: sale.id,
            },
          },
          select: { id: true },
        });
        const returnIds = returnRows.map((item) => item.id);

        const returnedByProduct = new Map<string, number>();
        if (returnIds.length > 0) {
          const returnItems = await prisma.salesReturnItems.findMany({
            where: {
              tenantId: access.tenantId,
              deletedAt: null,
              status: "completed",
              code: { in: returnIds },
            },
          });

          for (const item of returnItems) {
            const rowPayload = asRecord(item.payload);
            const productId = asText(rowPayload.productId);
            if (!productId) {
              continue;
            }
            const quantity = asNumber(rowPayload.quantity, 0);
            returnedByProduct.set(productId, (returnedByProduct.get(productId) ?? 0) + quantity);
          }
        }

        const remainingReturnedPool = new Map(returnedByProduct);
        const mappedItems = lineRows.map((line) => {
          const linePayload = asRecord(line.payload);
          const productId = asText(linePayload.productId);
          const quantity = asNumber(linePayload.quantity, 0);
          const returnedPool = remainingReturnedPool.get(productId) ?? 0;
          const returnedQuantity = Math.min(quantity, Math.max(0, returnedPool));
          const remainingQuantity = Math.max(0, quantity - returnedQuantity);
          remainingReturnedPool.set(productId, Math.max(0, returnedPool - returnedQuantity));

          return {
            productId,
            productCode: asText(linePayload.productCode),
            productName: line.name ?? asText(linePayload.productName),
            quantity,
            returnedQuantity,
            remainingQuantity,
            unitPrice: asNumber(linePayload.unitPrice, 0),
            taxRate: asNumber(linePayload.taxRate, 0),
            warehouseId: asText(linePayload.warehouseId),
          };
        });

        return {
          id: sale.id,
          saleCode: sale.code ?? "",
          registerName: sale.name ?? "",
          registerId: asText(payload.registerId),
          customerCode: asText(payload.customerCode),
          customerName: asText(payload.customerName),
          currency: asText(payload.currency, "TRY"),
          total: asNumber(payload.netTotal, 0),
          paidTotal: asNumber(payload.paymentTotal, 0),
          declaredPaymentTotal: asNumber(payload.declaredPaymentTotal, asNumber(payload.paymentTotal, 0)),
          outstanding: asNumber(payload.outstanding, 0),
          maturityDays: asNumber(payload.maturityDays, 0),
          dueDate: asText(payload.dueDate),
          occurredAt: (sale.occurredAt ?? sale.createdAt).toISOString(),
          items: mappedItems,
          payments: (paymentMap.get(sale.id) ?? []).map((line) => {
            const linePayload = asRecord(line.payload);
            return {
              method: asText(linePayload.method),
              amount: asNumber(linePayload.amount, 0),
              reference: asText(linePayload.reference),
            };
          }),
        };
      }),
    );

    return ok(rows);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("POS satış listesi alınırken hata oluştu.", "POS_SALE_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    await ensureSerialCountUnlocked({
      tenantId: access.tenantId,
      operationLabel: "POS satış",
    });

    const parsed = createSaleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("POS satış formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const hasDiscount = parsed.data.items.some((item) => (item.discountAmount ?? 0) > 0);
    if (hasDiscount) {
      const discountPermissionDefined = await prisma.permission.findUnique({
        where: { key: "sale:discount" },
        select: { id: true },
      });
      if (discountPermissionDefined) {
        const allowed = await userHasPermission(access.userId, "sale:discount");
        if (!allowed) {
          return fail("Indirimli satis islemi icin yetkiniz yok.", "FORBIDDEN", 403);
        }
      }
    }

    const result = await completePosSale({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    if (error instanceof PosValidationError) {
      return fail(error.message, "POS_VALIDATION_ERROR", 422);
    }
    if (error instanceof SerialCountLockedError) {
      return fail(error.message, "SERIAL_COUNT_LOCKED", 409);
    }

    return fail("POS satış tamamlanırken hata oluştu.", "POS_SALE_ERROR", 500);
  }
}
