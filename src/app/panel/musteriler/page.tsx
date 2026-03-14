import { CustomersClient } from "@/app/panel/musteriler/customers-client";

export default function CustomersPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#1f3553] bg-[#0b1d35] p-4 text-slate-100">
        <h1 className="text-xl font-black">Cari Hesaplar</h1>
        <p className="mt-1 text-sm text-slate-400">
          Cari müşteri kartlarını, iletişim bilgilerini ve risk durumlarını tek yerden yönet.
        </p>
      </div>

      <CustomersClient />
    </section>
  );
}
