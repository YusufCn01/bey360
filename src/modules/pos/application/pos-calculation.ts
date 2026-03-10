import type { PosSaleItemInput } from "@/modules/pos/domain/pos-types";

export type CalculatedLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  netAmount: number;
  taxRate: number;
  warehouseId?: string;
};

export type SaleTotals = {
  lines: CalculatedLine[];
  grossTotal: number;
  totalDiscount: number;
  totalTax: number;
  netTotal: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateSaleTotals(items: PosSaleItemInput[]): SaleTotals {
  const lines = items.map((item) => {
    const quantity = item.quantity;
    const unitPrice = item.unitPrice;
    const taxRate = item.taxRate ?? 20;
    const grossAmount = roundCurrency(quantity * unitPrice);
    const discountAmount = roundCurrency(item.discountAmount ?? 0);
    const taxableAmount = roundCurrency(Math.max(0, grossAmount - discountAmount));
    const taxAmount = roundCurrency((taxableAmount * taxRate) / 100);
    const netAmount = roundCurrency(taxableAmount + taxAmount);

    return {
      productId: item.productId,
      productName: item.productName,
      quantity,
      unitPrice,
      grossAmount,
      discountAmount,
      taxableAmount,
      taxAmount,
      netAmount,
      taxRate,
      warehouseId: item.warehouseId,
    };
  });

  const grossTotal = roundCurrency(lines.reduce((sum, line) => sum + line.grossAmount, 0));
  const totalDiscount = roundCurrency(lines.reduce((sum, line) => sum + line.discountAmount, 0));
  const totalTax = roundCurrency(lines.reduce((sum, line) => sum + line.taxAmount, 0));
  const netTotal = roundCurrency(lines.reduce((sum, line) => sum + line.netAmount, 0));

  return {
    lines,
    grossTotal,
    totalDiscount,
    totalTax,
    netTotal,
  };
}
