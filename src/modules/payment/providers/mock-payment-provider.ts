import { createHmac } from "crypto";
import { env } from "@/lib/env";
import type { PaymentCreateInput, PaymentProviderAdapter, PaymentStatus } from "@/modules/payment/domain/provider";

export class MockPaymentProvider implements PaymentProviderAdapter {
  readonly code = "mock-payment";

  async createPaymentLink(input: PaymentCreateInput): Promise<{ url: string; providerReference: string }> {
    void input;
    const providerReference = `mock_${crypto.randomUUID()}`;
    const url = `${env.APP_URL}/odeme/mock/${providerReference}`;
    return { url, providerReference };
  }

  async verifyWebhook(signature: string | undefined, rawBody: string): Promise<boolean> {
    if (!signature || !env.PAYMENT_WEBHOOK_SIGNING_KEY) {
      return false;
    }

    const expected = createHmac("sha256", env.PAYMENT_WEBHOOK_SIGNING_KEY).update(rawBody).digest("hex");
    return expected === signature;
  }

  async parseWebhook(
    rawBody: string,
  ): Promise<{ providerReference: string; status: PaymentStatus; rawPayload: unknown }> {
    const payload = JSON.parse(rawBody) as { providerReference: string; status: PaymentStatus };
    return {
      providerReference: payload.providerReference,
      status: payload.status,
      rawPayload: payload,
    };
  }

  async refund(providerReference: string, amount: number): Promise<{ ok: boolean; status: PaymentStatus }> {
    void providerReference;
    void amount;
    return {
      ok: true,
      status: "refunded",
    };
  }
}
