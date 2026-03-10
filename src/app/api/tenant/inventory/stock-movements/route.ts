import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { listStockMovements } from "@/modules/catalog/application/product-service";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "product:view");
    const productId = request.nextUrl.searchParams.get("productId") ?? undefined;
    const warehouseId = request.nextUrl.searchParams.get("warehouseId") ?? undefined;
    const dateFrom = request.nextUrl.searchParams.get("dateFrom") ?? undefined;
    const dateTo = request.nextUrl.searchParams.get("dateTo") ?? undefined;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");

    const movements = await listStockMovements({
      tenantId: access.tenantId,
      productId,
      warehouseId,
      dateFrom,
      dateTo,
      limit,
    });

    return ok(movements);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Stok hareketleri alınırken hata oluştu.", "STOCK_MOVEMENT_LIST_ERROR", 500);
  }
}
