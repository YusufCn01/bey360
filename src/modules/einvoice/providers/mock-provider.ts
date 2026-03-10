import type {
  EInvoiceProviderAdapter,
  EInvoiceSendInput,
  EInvoiceStatusResult,
} from "@/modules/einvoice/domain/provider";

export class MockEInvoiceProvider implements EInvoiceProviderAdapter {
  readonly code = "mock-einvoice";

  async authenticate(): Promise<void> {
    return;
  }

  async checkRecipient(params: { taxId: string }): Promise<{ isRegistered: boolean; alias: string }> {
    const isRegistered = params.taxId.length >= 10;
    return {
      isRegistered,
      alias: isRegistered ? `urn:mail:${params.taxId}@earsiv.test` : "",
    };
  }

  async createDraft(params: EInvoiceSendInput): Promise<{ providerDraftId: string }> {
    void params;
    return {
      providerDraftId: `draft_${crypto.randomUUID()}`,
    };
  }

  async sendDocument(params: { providerDraftId: string }): Promise<{ providerReference: string }> {
    return {
      providerReference: `ref_${params.providerDraftId}`,
    };
  }

  async getDocumentStatus(params: { providerReference: string }): Promise<EInvoiceStatusResult> {
    return {
      status: "delivered",
      providerReference: params.providerReference,
      rawPayload: { simulated: true },
    };
  }

  async cancelDocument(params: { providerReference: string; reason: string }): Promise<{ cancelled: boolean }> {
    void params;
    return { cancelled: true };
  }

  async downloadXml(params: { providerReference: string }): Promise<string> {
    return `<Invoice><ID>${params.providerReference}</ID><ProfileID>EARSIV</ProfileID></Invoice>`;
  }

  async listInboxDocuments(): Promise<Array<{ providerReference: string }>> {
    return [];
  }

  async processWebhook(payload: unknown, signature: string): Promise<EInvoiceStatusResult> {
    void signature;
    const payloadRecord = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    const providerReference =
      typeof payloadRecord.providerReference === "string" && payloadRecord.providerReference.trim().length > 0
        ? payloadRecord.providerReference
        : `ref_${crypto.randomUUID()}`;

    return {
      status: "delivered",
      providerReference,
      rawPayload: payload,
    };
  }
}
