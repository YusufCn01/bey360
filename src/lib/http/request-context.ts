import { randomUUID } from "crypto";
import { headers } from "next/headers";
import type { RequestContext } from "@/types/request-context";

export async function getRequestContext(): Promise<RequestContext> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  const correlationId =
    headerStore.get("x-correlation-id") || headerStore.get("x-request-id") || randomUUID();

  return {
    correlationId,
    tenantSlug: headerStore.get("x-tenant-slug") ?? undefined,
    ipAddress: forwardedFor?.split(",")[0]?.trim() || undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
  };
}
