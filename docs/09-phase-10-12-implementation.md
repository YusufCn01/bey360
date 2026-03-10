# Phase 10-12 Uygulama Notları

## Phase 10 - e-Fatura / e-Arşiv
- `enqueueEInvoiceDocument` artık DB kuyruğuna ek olarak BullMQ kuyruğuna da iş yazıyor.
- `POST /api/tenant/einvoice/status-sync`
  - provider durum sorgusu ve `e_invoice_status_logs` güncellemesi.
- `POST /api/tenant/einvoice/webhook`
  - imza doğrulama
  - provider webhook işleme
  - webhook log + status log kayıtları

## Phase 11 - SaaS Abonelik / Paket
- `GET /api/tenant/subscription/current`
  - aktif abonelik + kullanım + entitlement özeti.
- `POST /api/tenant/subscription/change-plan`
  - plan değişimi
  - tenant entitlements güncellemesi
  - billing invoice kaydı
  - audit kaydı
- Panelde abonelik ekranı API ile dinamik hale getirildi.

## Phase 12 - Audit / Security Hardening
- `GET /api/tenant/audit/logs`
  - tenant bazlı denetim kayıt filtreleme.
- Panelde `İşlem Geçmişi` ekranı aktif.
- Webhook imza doğrulama ve tenant bağlamı zorunlu kontrolleri güçlendirildi.
