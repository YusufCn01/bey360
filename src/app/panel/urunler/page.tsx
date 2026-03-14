import { ProductsClient } from "@/app/panel/urunler/products-client";

export default function ProductsPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#1f3553] bg-[#0b1d35] p-4 text-slate-100">
        <h1 className="text-xl font-black">Ürün Yönetimi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Ürün kartları, barkodlar, fiyatlar ve stok limitlerini tek panelde yönetin.
        </p>
      </div>

      <ProductsClient />
    </section>
  );
}
