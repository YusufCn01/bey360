import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { asRecord } from "@/lib/json";
import { fail, ok } from "@/lib/http/response";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, ["product:view", "sale:pos"]);
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "500"), 1), 2000);
    const productId = request.nextUrl.searchParams.get("productId") ?? undefined;
    const warehouseId = request.nextUrl.searchParams.get("warehouseId") ?? undefined;

    const rows = await prisma.stockBalances.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const filtered = rows.filter((row) => {
      const payload = asRecord(row.payload);
      const rowProductId = typeof payload.productId === "string" ? payload.productId : undefined;
      const rowWarehouseId = typeof payload.warehouseId === "string" ? payload.warehouseId : undefined;

      if (productId && rowProductId !== productId) {
        return false;
      }
      if (warehouseId && rowWarehouseId !== warehouseId) {
        return false;
      }

      return true;
    });

    return ok(filtered);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Stok bakiyeleri alınırken hata oluştu.", "STOCK_BALANCE_LIST_ERROR", 500);
  }
}
