import { describe, expect, it } from "vitest";
import { extractTenantSlugFromHost } from "@/lib/tenant/resolve-tenant";

describe("extractTenantSlugFromHost", () => {
  it("alt alan adindan tenant slug cozer", () => {
    expect(extractTenantSlugFromHost("demo-market.erp.local")).toBe("demo-market");
  });

  it("subdomain yoksa null doner", () => {
    expect(extractTenantSlugFromHost("localhost:3000")).toBeNull();
  });
});
