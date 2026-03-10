import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { syncEInvoiceDocumentStatus, syncEInvoiceStatus } from "@/modules/einvoice/application/einvoice-service";

const statusSyncSchema = z
  .object({
    providerCode: z.string().min(1).optional(),
    providerReference: z.string().min(1).optional(),
    documentId: z.string().min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.documentId) || (Boolean(value.providerCode) && Boolean(value.providerReference)),
    {
      message: "documentId veya providerCode + providerReference zorunludur.",
      path: ["documentId"],
    },
  );

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, ["einvoice:manage", "dashboard:view"]);
    const parsed = statusSyncSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("e-Fatura durum sorgu formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    if (parsed.data.documentId) {
      const result = await syncEInvoiceDocumentStatus({
        tenantId: access.tenantId,
        documentId: parsed.data.documentId,
        providerCode: parsed.data.providerCode,
      });

      return ok(result);
    }

    const status = await syncEInvoiceStatus({
      tenantId: access.tenantId,
      providerCode: parsed.data.providerCode!,
      providerReference: parsed.data.providerReference!,
    });

    return ok({
      status,
      providerReference: parsed.data.providerReference,
    });
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

    return fail("e-Fatura durum senkronizasyonu sırasında hata oluştu.", "EINVOICE_STATUS_SYNC_ERROR", 500);
  }
}
