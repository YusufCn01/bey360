import { describe, expect, it } from "vitest";
import { calculateSaleTotals } from "@/modules/pos/application/pos-calculation";

describe("calculateSaleTotals", () => {
  it("satır ve toplam hesaplarını doğru üretir", () => {
    const result = calculateSaleTotals([
      {
        productId: "p1",
        productName: "Ürün 1",
        quantity: 2,
        unitPrice: 100,
        discountAmount: 10,
        taxRate: 20,
      },
      {
        productId: "p2",
        productName: "Ürün 2",
        quantity: 1,
        unitPrice: 50,
        taxRate: 10,
      },
    ]);

    expect(result.grossTotal).toBe(250);
    expect(result.totalDiscount).toBe(10);
    expect(result.totalTax).toBe(43);
    expect(result.netTotal).toBe(283);
  });
});
