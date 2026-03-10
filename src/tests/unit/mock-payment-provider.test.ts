import { createHmac } from "crypto";
import { describe, expect, it, vi } from "vitest";

describe("MockPaymentProvider", () => {
  it("webhook imzasını doğrular", async () => {
    vi.resetModules();
    process.env.PAYMENT_WEBHOOK_SIGNING_KEY = "test-signing-key-123456789";
    const { MockPaymentProvider } = await import("@/modules/payment/providers/mock-payment-provider");
    const provider = new MockPaymentProvider();

    const rawBody = JSON.stringify({
      providerReference: "mock_123",
      status: "succeeded",
    });
    const signature = createHmac("sha256", process.env.PAYMENT_WEBHOOK_SIGNING_KEY).update(rawBody).digest("hex");

    const valid = await provider.verifyWebhook(signature, rawBody);
    const invalid = await provider.verifyWebhook("invalid", rawBody);

    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});
