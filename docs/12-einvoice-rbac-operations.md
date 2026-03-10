# 12 - e-Fatura Operasyon ve RBAC Genisletmesi

Bu dokuman, son iterasyonda eklenen iki kritik gelistirmeyi ozetler:
- e-Fatura operasyon merkezi (tenant panel + API)
- Rol izin guncelleme akisi (RBAC)

## 1) e-Fatura Operasyon Merkezi

### Yeni Tenant API endpointleri
- `GET /api/tenant/einvoice/documents`
  - Tenant bazli e-Fatura/e-Arsiv belge listesi
  - Filtreler: `status`, `search`, `limit`
  - Yetki: `einvoice:view` veya `dashboard:view`

- `POST /api/tenant/einvoice/documents/[documentId]/send`
  - Belgeyi outbound kuyruða alir
  - Yetki: `einvoice:manage` veya `dashboard:view`

- `POST /api/tenant/einvoice/documents/[documentId]/sync`
  - Belgeyi provider referansi ile durum senkronize eder
  - Yetki: `einvoice:manage` veya `dashboard:view`

### Servis katmani genisletmeleri
Dosya: `src/modules/einvoice/application/einvoice-service.ts`

Eklenen/yenilenen fonksiyonlar:
- `listEInvoiceDocuments(...)`
- `enqueueEInvoiceDocument(...)`
- `sendEInvoiceDocument(...)`
- `syncEInvoiceStatus(...)`
- `syncEInvoiceDocumentStatus(...)`
- `applyEInvoiceProviderStatus(...)`

Kazanilanlar:
- Kuyruk isleri `jobId` ile idempotent hale getirildi
- Belge durumlari (`queued`, `sending`, `sent`, `failed`, vb.) dogrudan `e_invoice_documents` tablosunda izleniyor
- Provider referansi `externalId` alaninda tutuluyor
- `e_invoice_send_attempts` ve `e_invoice_status_logs` tablolarina detayli operasyon kaydi yaziliyor
- Webhook gelen statuler belgeye isleniyor

### Panel ekrani
- Yeni sayfa: `/panel/e-fatura`
- Dosyalar:
  - `src/app/panel/e-fatura/page.tsx`
  - `src/app/panel/e-fatura/einvoice-client.tsx`

Ozellikler:
- Durum filtreli belge listesi
- Kuyruga gonder aksiyonu
- Durum senkronize et aksiyonu
- Turkce durum etiketleri

## 2) RBAC Rol Izin Guncelleme

### Yeni endpoint
- `PATCH /api/tenant/roles/[roleId]/permissions`
  - Rolun tum izin setini transaction icinde gunceller
  - Yetki: `tenant:user.manage`

Dosya:
- `src/app/api/tenant/roles/[roleId]/permissions/route.ts`

### RBAC servis genisletmesi
Dosya: `src/modules/identity/application/rbac-service.ts`

Eklenen fonksiyon:
- `updateRolePermissions(...)`

Davranislar:
- Tenant scope disina cikamaz
- Gecersiz izin anahtari kontrol edilir
- Once mevcut rol izinleri temizlenir, sonra yeni set yazilir
- Audit log olusturulur (`role.permissions.updated`)

### Panelde rol izin editoru
Dosya:
- `src/app/panel/kullanicilar/users-roles-client.tsx`

Ozellikler:
- Yeni rol olustururken izin secimi
- Mevcut rol icin izinleri toplu guncelleme
- Izinlerin module bazli gruplanmis secim arayuzu

## 3) Guvenlik iyilestirmesi

### Yetki kontrolu
Dosyalar:
- `src/lib/rbac/guard.ts`
- `src/lib/auth/tenant-access.ts`

Iyilestirmeler:
- `PermissionDeniedError` ile yetki redlerinin normalize edilmesi
- `requireTenantAccess` fonksiyonunda coklu izin (OR) destegi
- Permission red durumunda tutarli `403 FORBIDDEN` cevabi

## 4) Seed guncellemesi
Dosya:
- `prisma/seed.ts`

Eklenen varsayilan izinler:
- `einvoice:view`
- `einvoice:manage`

## 5) Testler

Eklenen/genisletilen testler:
- `src/tests/unit/mock-einvoice-provider.test.ts`
- `src/tests/unit/rbac-guard.test.ts` (userHasAnyPermission senaryosu)
