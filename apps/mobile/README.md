# Bey360 Mobile (Android)

Bu klasör, Bey360 için Expo tabanlı Android/mobil uygulama temelini içerir.

## Çalıştırma

```bash
cd apps/mobile
npm install
npm run start
```

Expo Developer Tools açıldıktan sonra:

- Fiziksel cihaz: Expo Go ile QR okutun
- Android emülatör: `a` tuşuna basın

Alternatif olarak doğrudan:

```bash
npm run android
```

## Mevcut Durum

- Görsele yakın profesyonel dashboard tasarımı
- Mobil + tablet uyumlu responsive yerleşim
- Açılır hızlı işlem (FAB) menüsü
- Sabit alt kur çubuğu

## Sonraki Adımlar

- Login API entegrasyonu (`/api/auth/login`)
- Dashboard verilerini canlı API'den çekme
- POS / Müşteri / Ürün ekranları için navigation
- Push bildirimleri ve cihaz token kaydı
