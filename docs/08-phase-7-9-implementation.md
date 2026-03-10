# Phase 7-9 Uygulama Notları

## Phase 7 - Alış / Fatura / Belge
- `POST /api/tenant/purchases/invoices`
  - alış faturası
  - stok giriş hareketi
  - tedarikçi cari borç kaydı
  - opsiyonel ödeme + kasa çıkışı
- `POST /api/tenant/invoices`
  - satış/iade fatura
  - fatura satırları
  - e-belge taslak kaydı

## Phase 8 - Kasa / Banka / Tahsilat / Ödeme
- `POST /api/tenant/finance/collections`
  - müşteri tahsilatı + kasa giriş + cari kredi
- `POST /api/tenant/finance/payments`
  - tedarikçi ödeme + kasa çıkış + cari kredi
- `POST /api/tenant/finance/cash-transfers`
  - kasalar arası çift taraflı transfer hareketi

## Phase 9 - Raporlama / KPI / Export
- `GET /api/tenant/reports/dashboard`
  - günlük/haftalık/aylık satış
  - düşük stok sayısı
  - tahsilat/ödeme ve kasa bakiyesi
- `GET /api/tenant/reports/exports/excel`
- `GET /api/tenant/reports/exports/pdf`
