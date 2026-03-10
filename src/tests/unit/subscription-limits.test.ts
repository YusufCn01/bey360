import { describe, expect, it } from "vitest";
import { planLimits } from "@/lib/subscription/limits";

describe("plan limits", () => {
  it("plan büyüdükçe kullanıcı limitleri artar", () => {
    expect(planLimits.starter.maxUsers).toBeLessThan(planLimits.standard.maxUsers);
    expect(planLimits.standard.maxUsers).toBeLessThan(planLimits.professional.maxUsers);
    expect(planLimits.professional.maxUsers).toBeLessThan(planLimits.enterprise.maxUsers);
  });

  it("custom plan en yüksek limitleri içerir", () => {
    expect(planLimits.custom.maxProducts).toBeGreaterThan(planLimits.enterprise.maxProducts);
    expect(planLimits.custom.maxInvoicesPerMonth).toBeGreaterThan(planLimits.enterprise.maxInvoicesPerMonth);
  });
});
