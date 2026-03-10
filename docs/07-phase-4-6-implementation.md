# Phase 4-6 Uygulama Notları

## Phase 4 - Ürün / Fiyat / Stok Temeli
- `POST /api/tenant/products`: ürün kartı + varsayılan fiyat + açılış stok hareketi.
- `GET /api/tenant/inventory/stock-movements`: stok hareket listeleme.
- Ürün tablosu ve hızlı ekleme formu panelde aktif.

## Phase 5 - Müşteri / Tedarikçi / Cari Temeli
- `POST /api/tenant/customers`: müşteri kartı + risk profili + cari hesap açılışı.
- `POST /api/tenant/suppliers`: tedarikçi kartı + limit + cari hesap açılışı.
- Müşteri ve tedarikçi listeleri panelde TanStack Table ile aktif.

## Phase 6 - POS Satış / Askı / İade Temeli
- `POST /api/tenant/pos/session/open` ve `.../close`: kasa oturumu.
- `POST /api/tenant/pos/suspended`: askı sepet.
- `POST /api/tenant/pos/sales`: satış tamamlama (transaction-safe).
- `POST /api/tenant/pos/returns`: iade akışı.
- Satış sırasında transaction içinde üretilen kayıtlar:
  - `sales`, `sale_items`, `sale_payments`, `sale_receipts`
  - `stock_movements` + `stock_balances` güncellemesi
  - `cash_transactions`
  - `current_account_movements` + `balance_snapshots`
  - `audit_logs`
