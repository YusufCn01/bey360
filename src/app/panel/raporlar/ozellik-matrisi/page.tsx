import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeatureRow = {
  feature: string;
  status: "hazir" | "kismi" | "yeni";
  note: string;
};

const rows: FeatureRow[] = [
  { feature: "Sınırsız stok ve ürün takibi", status: "hazir", note: "Ürün/stok modülleri aktif." },
  { feature: "Barkod ile hızlı satış", status: "hazir", note: "POS barkod akışı çalışıyor." },
  { feature: "Depo transfer ve sayım", status: "hazir", note: "Transfer ve seri sayım API + ekran mevcut." },
  { feature: "Nakit/Kart/Cariye satış", status: "hazir", note: "POS çoklu ödeme ve cari satış aktif." },
  { feature: "Alış-Satış fatura ve sipariş takibi", status: "hazir", note: "Fatura/purchase akışları entegre." },
  { feature: "Cari bakiye POS ekranında", status: "hazir", note: "Cari seçimi sonrası bakiye/risk görünür." },
  { feature: "Açık hesap (veresiye) satış", status: "hazir", note: "Kalan tutar cariye yazılır." },
  { feature: "SMS ile müşteri bilgilendirme", status: "yeni", note: "Satış sonrası SMS log altyapısı eklendi." },
  { feature: "Kredi kartı ödeme takip", status: "kismi", note: "Kart ödemeler var, ileri vade/ekstre takibi genişletilecek." },
  { feature: "Anlık patron raporları", status: "hazir", note: "Dashboard KPI ve rapor ekranları mevcut." },
  { feature: "En çok satan marka/ürün raporları", status: "hazir", note: "Dashboard raporlamaları aktif." },
  { feature: "Kullanıcı / kasiyer yetkilendirme", status: "hazir", note: "RBAC ve rol/yetki yönetimi var." },
  { feature: "Yazarkasa/terazi entegrasyonu", status: "kismi", note: "POS bakım/OKC test uçları var; cihaz entegrasyonu genişletilebilir." },
  { feature: "Hızlı borç ödeme", status: "hazir", note: "Tahsilat API ve ekranları aktif." },
  { feature: "Çoklu dövizle satış", status: "kismi", note: "Veri modeli destekli; POS ekranında genişletme planlandı." },
  { feature: "Termal/laser fiş yazdırma", status: "hazir", note: "Fiş/yazıcı ayarları ve yazdırma altyapısı var." },
  { feature: "Ürüne resim ekleme", status: "hazir", note: "Ürün kartı resim alanları mevcut." },
  { feature: "Min/Max stok kontrolü", status: "hazir", note: "Stok seviye alanları ve raporlar aktif." },
  { feature: "Birden fazla şubede anlık ciro", status: "hazir", note: "Tenant rapor ve şube/depo yönetimi aktif." },
  { feature: "Seri no takibi", status: "hazir", note: "Seri sayım modülü aktif." },
  { feature: "Paralel barkod (AD/PAKET/Kutu)", status: "hazir", note: "Barkod alanları ve ürün birimleri destekleniyor." },
  { feature: "Satış iade işlemleri", status: "hazir", note: "Fiş bazlı tam/kısmi iade akışı mevcut." },
  { feature: "Tartılı ürün", status: "kismi", note: "Barkod altyapısı var; terazi kod parse genişletmesi yapılabilir." },
  { feature: "Sepette ürün/müşteri bekletme", status: "hazir", note: "Askı sepet ve geri yükleme aktif." },
  { feature: "Otomatik günlük yedek alma", status: "yeni", note: "Yedekleme API + günlük backup script eklendi." },
  { feature: "Kasiyer bazlı ciro takibi", status: "hazir", note: "POS/audit üzerinden takip mevcut." },
  { feature: "Ağ ve internet üzerinden kullanım", status: "hazir", note: "Çok kiracılı web mimari hazır." },
  { feature: "Barkod ve raf etiketi yazdırma", status: "hazir", note: "Etiket dizaynı ve toplu yazdırma aktif." },
  { feature: "Çağrı takip (Caller-ID)", status: "yeni", note: "Telefonla müşteri bulma API + panel ekranı eklendi." },
  { feature: "Defolu ürün stok düşümü", status: "hazir", note: "Stok hareketleri ile çıkış yapılabiliyor." },
];

function statusLabel(status: FeatureRow["status"]) {
  if (status === "hazir") return "Hazır";
  if (status === "yeni") return "Yeni Eklendi";
  return "Kısmi";
}

function statusClass(status: FeatureRow["status"]) {
  if (status === "hazir") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "yeni") return "bg-indigo-100 text-indigo-800 border-indigo-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}

export default function OzellikMatrisiPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bey360 Özellik Matrisi</CardTitle>
        <p className="text-sm text-slate-600">Mevcut, kısmi ve yeni eklenen özelliklerin canlı takip görünümü.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="px-3 py-2 font-semibold">Özellik</th>
                <th className="px-3 py-2 font-semibold">Durum</th>
                <th className="px-3 py-2 font-semibold">Not</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{row.feature}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
