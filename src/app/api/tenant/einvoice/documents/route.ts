import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { listEInvoiceDocuments } from "@/modules/einvoice/application/einvoice-service";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, ["einvoice:view", "dashboard:view"]);
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const search = request.nextUrl.searchParams.get("search") || undefined;
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const documents = await listEInvoiceDocuments({
      tenantId: access.tenantId,
      status,
      search,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return ok(documents);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("e-Fatura belgeleri listelenirken hata oluştu.", "EINVOICE_DOCUMENT_LIST_ERROR", 500);
  }
}
