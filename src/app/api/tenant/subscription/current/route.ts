import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { getPlanUsageSummary } from "@/modules/subscription/application/subscription-service";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const summary = await getPlanUsageSummary(access.tenantId);
    return ok(summary);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Abonelik özeti alınırken hata oluştu.", "SUBSCRIPTION_SUMMARY_ERROR", 500);
  }
}
