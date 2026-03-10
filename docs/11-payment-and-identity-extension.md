# Ödeme ve Kimlik Genişletmesi

## Ödeme Linki (Tenant)
- `GET /api/tenant/payment-links`
- `POST /api/tenant/payment-links`
- `POST /api/tenant/payment-links/{reference}/simulate`

### Akış
1. Ödeme linki oluşturulur.
2. Link `payment_links` ve olayları `payment_link_events` tablosuna yazılır.
3. Webhook veya simülasyonla durum güncellenir.
4. Başarılı ödemede:
   - `payment_transactions`
   - `cash_transactions` (online kasa)
   - ilgili müşteri varsa `current_account_movements`
5. İadede ters yön hareketler üretilir.

## Mock Müşteri Ödeme Sayfası
- `GET /odeme/mock/{reference}`
- `GET /api/payment/mock/{reference}`
- `POST /api/payment/mock/{reference}/status`

Bu ekran canlı sağlayıcı entegrasyonu olmadan uçtan uca ödeme durum akışını test etmeyi sağlar.

## Kullanıcı / Rol Yönetimi
- `GET/POST /api/tenant/users`
- `GET/POST /api/tenant/roles`
- `POST /api/tenant/roles/assign`
- Panel: `/panel/kullanicilar`

Tenant içinde özel roller tanımlanabilir, kullanıcıya rol atanabilir ve işlem audit’e düşer.
