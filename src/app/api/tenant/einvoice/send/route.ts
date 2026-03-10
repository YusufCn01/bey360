import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { enqueueEInvoiceDocument } from "@/modules/einvoice/application/einvoice-service";

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, ["einvoice:manage", "dashboard:view"]);
    const body = (await request.json()) as { documentId: string; providerCode: string };

    if (!body.documentId) {
      return fail("Belge numarası zorunludur", "VALIDATION_ERROR", 422);
    }

    const result = await enqueueEInvoiceDocument({
      tenantId: access.tenantId,
      documentId: body.documentId,
      providerCode: body.providerCode,
    });

    return ok({
      message: "Belge kuyruğa alındı",
      ...result,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    if (error instanceof Error && error.message.toLowerCase().includes("bulunamad")) {
      return fail(error.message, "EINVOICE_DOCUMENT_NOT_FOUND", 404);
    }

    return fail("Belge kuyruğa alınırken hata oluştu.", "EINVOICE_QUEUE_ERROR", 500);
  }
}
