import { StockMovementsClient } from "@/app/panel/stok/stock-movements-client";

export default function InventoryPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#1f3553] bg-[#0b1d35] p-4 text-slate-100">
        <h1 className="text-xl font-black">Stok & Depo Yönetimi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Satış, iade, sayım ve transfer kaynaklı tüm stok hareketlerini canlı takip edin.
        </p>
      </div>

      <StockMovementsClient />
    </section>
  );
}
