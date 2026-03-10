import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { syncEInvoiceDocumentStatus } from "@/modules/einvoice/application/einvoice-service";

const syncSchema = z.object({
  providerCode: z.string().min(1).optional(),
});

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireTenantAccess(request, ["einvoice:manage", "dashboard:view"]);
    const { documentId } = await context.params;
    const parsed = syncSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return fail("Durum senkronizasyon formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await syncEInvoiceDocumentStatus({
      tenantId: access.tenantId,
      documentId,
      providerCode: parsed.data.providerCode,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    if (error instanceof Error && error.message.toLowerCase().includes("referans")) {
      return fail(error.message, "EINVOICE_REFERENCE_ERROR", 422);
    }

    if (error instanceof Error && error.message.toLowerCase().includes("bulunamad")) {
      return fail(error.message, "EINVOICE_DOCUMENT_NOT_FOUND", 404);
    }

    return fail("Belge durumu senkronize edilirken hata oluştu.", "EINVOICE_SYNC_ERROR", 500);
  }
}
