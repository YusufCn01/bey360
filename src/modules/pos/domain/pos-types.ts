export type PosPaymentMethod = "nakit" | "kart" | "havale_eft" | "cari";

export type PosSaleItemInput = {
  productId: string;
  productCode?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  warehouseId?: string;
};

export type PosPaymentInput = {
  method: PosPaymentMethod;
  amount: number;
  reference?: string;
};

export type CreatePosSaleInput = {
  tenantId: string;
  userId: string;
  registerId: string;
  registerName: string;
  branchId?: string;
  warehouseId?: string;
  customerCode?: string;
  customerName?: string;
  notes?: string;
  currency?: string;
  items: PosSaleItemInput[];
  payments: PosPaymentInput[];
};

export type CreatePosReturnInput = {
  tenantId: string;
  userId: string;
  registerId: string;
  registerName: string;
  originalSaleId: string;
  customerCode?: string;
  customerName?: string;
  reason?: string;
  currency?: string;
  items: PosSaleItemInput[];
  refundPayments: PosPaymentInput[];
};

export type SuspendCartInput = {
  tenantId: string;
  userId: string;
  registerId: string;
  registerName: string;
  customerCode?: string;
  customerName?: string;
  note?: string;
  items: PosSaleItemInput[];
};
