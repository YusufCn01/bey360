import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { asRecord, numberOrZero } from "@/lib/json";
import { fail, ok } from "@/lib/http/response";
import { createSupplier, listSuppliers } from "@/modules/crm/application/supplier-service";

const createSupplierSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(255),
  taxNumber: z.string().max(20).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  riskLimit: z.number().nonnegative().optional(),
  maturityDays: z.number().int().nonnegative().optional(),
  group: z.string().max(120).optional(),
  subgroup: z.string().max(120).optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const search = request.nextUrl.searchParams.get("q") ?? undefined;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
    const view = request.nextUrl.searchParams.get("view");

    if (view === "risk") {
      const rows = await prisma.supplierLimits.findMany({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        take: Math.min(Math.max(limit, 1), 500),
      });

      const mapped = rows.map((row) => {
        const payload = asRecord(row.payload);
        return {
          id: row.id,
          code: row.code,
          name: row.name,
          riskLimit: numberOrZero(payload.riskLimit),
          maturityDays: numberOrZero(payload.maturityDays),
          occurredAt: row.occurredAt ?? row.createdAt,
          status: row.status,
        };
      });

      return ok(mapped);
    }

    if (view === "balance") {
      const rows = await prisma.supplierBalances.findMany({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        take: Math.min(Math.max(limit, 1), 500),
      });

      const mapped = rows.map((row) => {
        const payload = asRecord(row.payload);
        return {
          id: row.id,
          code: row.code,
          name: row.name,
          balance: numberOrZero(payload.balance),
          currency: (payload.currency as string | undefined) ?? "TRY",
          occurredAt: row.occurredAt ?? row.createdAt,
          status: row.status,
        };
      });

      return ok(mapped);
    }

    const rows = await listSuppliers({
      tenantId: access.tenantId,
      search,
      limit,
    });

    return ok(rows);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Tedarikçi listesi alınırken hata oluştu.", "SUPPLIER_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const parsed = createSupplierSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Tedarikçi formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const supplier = await createSupplier({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(supplier, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Tedarikçi oluşturulurken hata oluştu.", "SUPPLIER_CREATE_ERROR", 500);
  }
}
