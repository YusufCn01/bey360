export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partial_refunded";

export type PaymentCreateInput = {
  tenantId: string;
  amount: number;
  currency: string;
  customerReference: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
};

export interface PaymentProviderAdapter {
  readonly code: string;
  createPaymentLink(input: PaymentCreateInput): Promise<{ url: string; providerReference: string }>;
  verifyWebhook(signature: string | undefined, rawBody: string): Promise<boolean>;
  parseWebhook(
    rawBody: string,
  ): Promise<{ providerReference: string; status: PaymentStatus; rawPayload: unknown }>;
  refund(providerReference: string, amount: number): Promise<{ ok: boolean; status: PaymentStatus }>;
}
