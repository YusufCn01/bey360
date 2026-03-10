export type EInvoiceScenario = "TEMELFATURA" | "TICARIFATURA" | "EARSIV";

export type EInvoiceLifecycleState =
  | "draft"
  | "validated"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "failed"
  | "retrying"
  | "archived";

export type EInvoiceSendInput = {
  tenantId: string;
  documentId: string;
  scenario: EInvoiceScenario;
  receiverTaxId: string;
  amount: number;
  currency: string;
};

export type EInvoiceStatusResult = {
  status: EInvoiceLifecycleState;
  providerReference?: string;
  rawPayload: unknown;
};

export interface EInvoiceProviderAdapter {
  readonly code: string;
  authenticate(): Promise<void>;
  checkRecipient(params: { taxId: string }): Promise<{ isRegistered: boolean; alias: string }>;
  createDraft(params: EInvoiceSendInput): Promise<{ providerDraftId: string }>;
  sendDocument(params: { providerDraftId: string }): Promise<{ providerReference: string }>;
  getDocumentStatus(params: { providerReference: string }): Promise<EInvoiceStatusResult>;
  cancelDocument(params: { providerReference: string; reason: string }): Promise<{ cancelled: boolean }>;
  downloadXml(params: { providerReference: string }): Promise<string>;
  listInboxDocuments(params: { since: Date }): Promise<Array<{ providerReference: string }>>;
  processWebhook(payload: unknown, signature: string): Promise<EInvoiceStatusResult>;
}
