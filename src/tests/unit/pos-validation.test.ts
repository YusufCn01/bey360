import { describe, expect, it } from "vitest";
import { completePosSale, createPosReturn, PosValidationError } from "@/modules/pos/application/pos-service";

describe("POS doğrulamaları", () => {
  it("boş ürün listesinde hata verir", async () => {
    await expect(
      completePosSale({
        tenantId: "t1",
        userId: "u1",
        registerId: "R1",
        registerName: "Kasa 1",
        items: [],
        payments: [],
      }),
    ).rejects.toBeInstanceOf(PosValidationError);
  });

  it("kısmi ödemede müşteri seçilmemişse hata verir", async () => {
    await expect(
      completePosSale({
        tenantId: "t1",
        userId: "u1",
        registerId: "R1",
        registerName: "Kasa 1",
        items: [
          {
            productId: "p1",
            productName: "Ürün",
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
          },
        ],
        payments: [
          {
            method: "nakit",
            amount: 50,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(PosValidationError);
  });

  it("cari ödeme satırında müşteri seçilmemişse hata verir", async () => {
    await expect(
      completePosSale({
        tenantId: "t1",
        userId: "u1",
        registerId: "R1",
        registerName: "Kasa 1",
        items: [
          {
            productId: "p1",
            productName: "Ürün",
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
          },
        ],
        payments: [
          {
            method: "cari",
            amount: 100,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(PosValidationError);
  });

  it("cari ödeme tutarı kalan borç ile eşleşmiyorsa hata verir", async () => {
    await expect(
      completePosSale({
        tenantId: "t1",
        userId: "u1",
        registerId: "R1",
        registerName: "Kasa 1",
        customerCode: "MUS-1",
        items: [
          {
            productId: "p1",
            productName: "Ürün",
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
          },
        ],
        payments: [
          {
            method: "nakit",
            amount: 100,
          },
          {
            method: "cari",
            amount: 10,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(PosValidationError);
  });

  it("iade ürün satırı yoksa hata verir", async () => {
    await expect(
      createPosReturn({
        tenantId: "t1",
        userId: "u1",
        registerId: "R1",
        registerName: "Kasa 1",
        originalSaleId: "sale-1",
        items: [],
        refundPayments: [
          {
            method: "nakit",
            amount: 1,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(PosValidationError);
  });

  it("iade ödeme toplamı ile iade tutarı farklıysa hata verir", async () => {
    await expect(
      createPosReturn({
        tenantId: "t1",
        userId: "u1",
        registerId: "R1",
        registerName: "Kasa 1",
        originalSaleId: "sale-1",
        items: [
          {
            productId: "p1",
            productName: "Ürün",
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
          },
        ],
        refundPayments: [
          {
            method: "nakit",
            amount: 50,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(PosValidationError);
  });
});
