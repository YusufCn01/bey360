export type SaleTabSnapshot = {
  id: string;
  label: string;
  cartLines: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    taxRate: number;
  }>;
  cartNote: string;
  customerCode: string;
  customerName: string;
  partialAmount: string;
};

export type MixedPaymentDraft = {
  id: string;
  method: "nakit" | "kart" | "havale_eft" | "cari";
  amount: string;
  reference: string;
};
