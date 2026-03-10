import { describe, expect, it } from "vitest";
import { MockEInvoiceProvider } from "@/modules/einvoice/providers/mock-provider";

describe("MockEInvoiceProvider", () => {
  it("gonderim yasam dongusunu test ortaminda simule eder", async () => {
    const provider = new MockEInvoiceProvider();

    await provider.authenticate();
    const recipient = await provider.checkRecipient({ taxId: "12345678901" });
    const draft = await provider.createDraft({
      tenantId: "t1",
      documentId: "doc1",
      scenario: "EARSIV",
      receiverTaxId: "12345678901",
      amount: 150,
      currency: "TRY",
    });
    const sent = await provider.sendDocument({ providerDraftId: draft.providerDraftId });
    const status = await provider.getDocumentStatus({ providerReference: sent.providerReference });

    expect(recipient.isRegistered).toBe(true);
    expect(draft.providerDraftId.startsWith("draft_")).toBe(true);
    expect(sent.providerReference.startsWith("ref_")).toBe(true);
    expect(status.status).toBe("delivered");
  });
});
