import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { createSalesInvoice } from "@/modules/invoicing/application/invoice-service";

const invoiceLineSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  taxRate: z.number().nonnegative().max(100).optional(),
});

const createInvoiceSchema = z.object({
  customerCode: z.string().min(1).max(100),
  customerName: z.string().min(1).max(255),
  invoiceType: z.enum(["satis", "iade"]),
  scenario: z.enum(["TEMELFATURA", "TICARIFATURA", "EARSIV"]).optional(),
  profile: z.enum(["TEMELFATURA", "TICARIFATURA", "EARSIV"]).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "200"), 1), 500);
    const invoiceType = request.nextUrl.searchParams.get("type") ?? undefined;

    const rows = await prisma.invoices.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        ...(invoiceType ?
           {
              payload: {
                path: ["invoiceType"],
                equals: invoiceType,
              },
            }
          : {}),
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return ok(rows);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Fatura listesi alınırken hata oluştu.", "INVOICE_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const parsed = createInvoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Fatura formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await createSalesInvoice({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Fatura oluşturulurken hata oluştu.", "INVOICE_CREATE_ERROR", 500);
  }
}
