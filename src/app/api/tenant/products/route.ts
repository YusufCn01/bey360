import { z } from "zod";
import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http/response";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { SerialCountLockedError } from "@/modules/inventory/application/serial-count-lock";
import { createProduct, listProducts } from "@/modules/catalog/application/product-service";

const createProductSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  barcode: z.string().max(100).optional(),
  defaultUnit: z.string().max(40).optional(),
  salePrice: z.number().nonnegative().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  vatRate: z.number().nonnegative().max(100).optional(),
  openingStock: z.number().optional(),
  warehouseId: z.string().max(100).optional(),
  minStockLevel: z.number().nonnegative().optional(),
  maxStockLevel: z.number().nonnegative().optional(),
  expiryTracking: z.boolean().optional(),
  imageUrl: z.string().max(5_000_000).optional(),
  purchaseCurrency: z.string().max(10).optional(),
  saleCurrency1: z.string().max(10).optional(),
  salePrice2: z.number().nonnegative().optional(),
  saleCurrency2: z.string().max(10).optional(),
  salePrice3: z.number().nonnegative().optional(),
  saleCurrency3: z.string().max(10).optional(),
  salePrice4: z.number().nonnegative().optional(),
  saleCurrency4: z.string().max(10).optional(),
  specialCode1: z.string().max(120).optional(),
  specialCode2: z.string().max(120).optional(),
  specialCode3: z.string().max(120).optional(),
  specialCode4: z.string().max(120).optional(),
  productGroup: z.string().max(120).optional(),
  productSubGroup: z.string().max(120).optional(),
  expiryDate: z.string().max(60).optional(),
  discountRate: z.number().nonnegative().max(100).optional(),
  lockedForSale: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "product:view");
    const search = request.nextUrl.searchParams.get("q") ?? undefined;
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");

    const products = await listProducts({
      tenantId: access.tenantId,
      search,
      status,
      limit,
    });

    return ok(products);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Ürün listesi alınırken hata oluştu.", "PRODUCT_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "product:create");
    const parsed = createProductSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Ürün formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const product = await createProduct({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(product, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    if (error instanceof SerialCountLockedError) {
      return fail(error.message, "SERIAL_COUNT_LOCKED", 409);
    }

    return fail("Ürün oluşturulurken hata oluştu.", "PRODUCT_CREATE_ERROR", 500);
  }
}
