import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { getDashboardSummary } from "@/modules/reporting/application/dashboard-service";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, ["report:view", "dashboard:view"]);
    const summary = await getDashboardSummary({
      tenantId: access.tenantId,
    });

    return ok(summary);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Dashboard raporu hazırlanırken hata oluştu.", "REPORT_DASHBOARD_ERROR", 500);
  }
}
