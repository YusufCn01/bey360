import type { EInvoiceProviderAdapter } from "@/modules/einvoice/domain/provider";
import { MockEInvoiceProvider } from "@/modules/einvoice/providers/mock-provider";

const providers = new Map<string, EInvoiceProviderAdapter>();

providers.set("mock-einvoice", new MockEInvoiceProvider());

export function getEInvoiceProvider(code: string): EInvoiceProviderAdapter {
  const provider = providers.get(code);
  if (!provider) {
    throw new Error(`e-Fatura provider bulunamadı: ${code}`);
  }

  return provider;
}
