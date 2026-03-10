import type { PaymentProviderAdapter } from "@/modules/payment/domain/provider";
import { MockPaymentProvider } from "@/modules/payment/providers/mock-payment-provider";

const providerMap = new Map<string, PaymentProviderAdapter>();
providerMap.set("mock-payment", new MockPaymentProvider());

export function getPaymentProvider(code: string): PaymentProviderAdapter {
  const provider = providerMap.get(code);
  if (!provider) {
    throw new Error(`Ödeme provider bulunamadı: ${code}`);
  }

  return provider;
}
