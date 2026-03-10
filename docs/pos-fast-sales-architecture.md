# POS / Hızlı Satış Mimarisi (Tenant SaaS ERP)

## 1) Mimari Katmanlar
- `UI Katmanı`: `src/app/panel/pos/pos-client.tsx` ve `src/modules/pos/ui/fast-sales/components/*`
- `Domain Katmanı`: POS parametre ve satış domain tipleri (`src/modules/pos/domain/*`)
- `Application Katmanı`: satış tamamlama, cari risk, vade ve iade akışları (`src/modules/pos/application/pos-service.ts`)
- `API Katmanı`: tenant POS uçları (`src/app/api/tenant/pos/*`)
- `Raporlama`: dashboard KPI ve kapanış checklist (`src/modules/reporting/application/dashboard-service.ts`)

## 2) Ekran Bölümleri
- Üst Durum Barı: firma/şube/kasa/kasiyer/aktif satış/bağlantı/saat/müşteri/para birimi
- Satış Sekmeleri: minimum 3 aktif satış sekmesi + yeni satış sekmesi
- Sol Ana Alan: barkod + arama + sepet satırları + hızlı satır işlemleri
- Sağ Aksiyon Paneli: kategori/kısayol ürünler + numpad + iskonto kısayolları + kamera/karm ödeme
- Alt Özet Alanı: ara toplam/KDV/iskonto/tahsilat/kalan/para üstü/toplam + hızlı ödeme tuşları
- Modal Katmanı: cari müşteri seçimi, karma ödeme, kamera barkod tarama, onay kutuları
- Mobil Sabit Çubuk: Ara/Barkod/Nakit/Kart/Karma

## 3) Kasiyer Akışları
- Hızlı Barkod Satışı: okut -> satıra ekle -> ödeme -> tamamla -> fiş
- Fiyat Gör Modu: barkod okutunca sepete eklemeden fiyat + stok + KDV göster
- Karma Ödeme: birden çok ödeme satırıyla tek işlemde kapanış
- Beklemeye Alma: aktif sepeti askıya alıp sonra geri yükleme
- Cari Satış: müşteri seçimi + risk/vade kontrolü + satış
- İade: satış fişinden kısmi/tam iade

## 4) Responsive Strateji
- Desktop: çift kolon profesyonel POS yerleşimi
- Tablet: aynı yerleşim, sağ panel daraltılmış yoğunluk
- Mobile: sabit alt aksiyon çubuğu + modal/drawer odaklı ödeme/okutma

## 5) Yetki Duyarlı İşlemler
- `sale:discount`: indirim ve düşük fiyata geçiş
- `sale:return`: iade işlemleri
- `sale:pos`: temel satış yetkisi
- Cari/risk ihlali ve finansal riskli aksiyonlar backend doğrulaması ile korunur

## 6) Durum Modeli
- Satış sekmeleri: müşteri, not, kısmi ödeme, sepet snapshot
- Aktif sepet: satırlar, seçili satır, fiyat seviyesi, değişim modu
- Ödeme: tek ödeme, kısmi ödeme, karma ödeme satırları
- Müşteri: hızlı müşteri, cari müşteri listesi, risk/vade metriği
- Cihaz/çevre: bağlantı durumu, kamera tarayıcı, ses/uyarı geri bildirimi

## 7) Teknik Notlar
- Barkod bulunamazsa hızlı aksiyonlar: ürün oluştur / manuel satır / tekrar dene
- Terazi barkodu parse desteği: `28xxxxx` formatı
- Kamera barkod: `BarcodeDetector` + `getUserMedia` + torch denemesi
- Dashboard kapanış checklist: açık POS, askı sepet, vadesi geçen alacak, risk ihlali

