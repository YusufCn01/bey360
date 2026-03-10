import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { getDashboardSummary } from "@/modules/reporting/application/dashboard-service";
import type { DashboardSummary } from "@/modules/reporting/application/dashboard-service";

type DashboardCacheEntry = {
  data: DashboardSummary;
  expiresAt: number;
};

type GlobalWithDashboardCache = typeof globalThis & {
  __dashboardSummaryCache?: Map<string, DashboardCacheEntry>;
};

const globalScope = globalThis as GlobalWithDashboardCache;
const dashboardCache = globalScope.__dashboardSummaryCache ?? new Map<string, DashboardCacheEntry>();
globalScope.__dashboardSummaryCache = dashboardCache;

const cacheTtlSeconds = Math.max(5, Number(process.env.DASHBOARD_CACHE_TTL_SECONDS ?? "20"));
const cacheTtlMs = cacheTtlSeconds * 1000;

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, ["report:view", "dashboard:view"]);
    const forceRefresh = request.nextUrl.searchParams.get("fresh") === "1";
    const now = Date.now();

    if (!forceRefresh) {
      const cached = dashboardCache.get(access.tenantId);
      if (cached && cached.expiresAt > now) {
        return ok(cached.data, {
          headers: {
            "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
            "X-Dashboard-Cache": "HIT",
          },
        });
      }
    }

    const summary = await getDashboardSummary({
      tenantId: access.tenantId,
    });

    dashboardCache.set(access.tenantId, {
      data: summary,
      expiresAt: now + cacheTtlMs,
    });

    return ok(summary, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
        "X-Dashboard-Cache": "MISS",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Dashboard raporu hazırlanırken hata oluştu.", "REPORT_DASHBOARD_ERROR", 500);
  }
}
