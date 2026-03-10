import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { extractTenantSlugFromHost } from "@/lib/tenant/resolve-tenant";

const protectedPrefixes = ["/panel", "/api/tenant", "/pos"];

function resolveTenantSlug(request: NextRequest): string | null {
  const explicit = request.headers.get("x-tenant") || request.nextUrl.searchParams.get("tenant");
  if (explicit) {
    return explicit.toLowerCase();
  }

  const host = request.headers.get("host") ?? undefined;
  const hostSlug = extractTenantSlugFromHost(host);
  if (hostSlug) {
    return hostSlug;
  }

  return process.env.NODE_ENV === "development" ? "demo-market" : null;
}

export function proxy(request: NextRequest) {
  const tenantSlug = resolveTenantSlug(request);
  const correlationId = request.headers.get("x-correlation-id") ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-correlation-id", correlationId);

  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  }

  const pathname = request.nextUrl.pathname;
  const requiresAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const hasSession = Boolean(request.cookies.get("mx_access")?.value);

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
