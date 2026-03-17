import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { extractTenantSlugFromHost } from "@/lib/tenant/resolve-tenant";

const protectedPrefixes = ["/panel", "/api/tenant", "/pos"];

function normalizeTenantSlug(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function getDefaultTenantSlug(): string | null {
  return normalizeTenantSlug(process.env.DEFAULT_TENANT_SLUG);
}

function resolveTenantSlug(request: NextRequest, allowDefaultTenant = true): string | null {
  const explicit = normalizeTenantSlug(request.headers.get("x-tenant") || request.nextUrl.searchParams.get("tenant"));
  if (explicit) {
    return explicit;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || undefined;
  const hostSlug = extractTenantSlugFromHost(host);
  if (hostSlug) {
    return hostSlug;
  }

  if (allowDefaultTenant) {
    const defaultTenant = getDefaultTenantSlug();
    if (defaultTenant) {
      return defaultTenant;
    }
  }

  return allowDefaultTenant && process.env.NODE_ENV === "development" ? "demo-market" : null;
}

export function proxy(request: NextRequest) {
  const correlationId = request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  const hasSession = Boolean(request.cookies.get("mx_access")?.value);
  const tenantSlug = resolveTenantSlug(request, !hasSession);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-correlation-id", correlationId);

  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  }

  const pathname = request.nextUrl.pathname;
  const requiresAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (requiresAuth && !hasSession) {
    const loginUrl = new URL("/giris", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-correlation-id", correlationId);
  if (tenantSlug) {
    response.headers.set("x-tenant-slug", tenantSlug);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
