# Mimari - Phase 1

## Kullanilan Skill Durumu
- Bu turde `skill-creator` ve `skill-installer` gerekli degil; is kapsamı mevcut kod tabaninda dogrudan platform implementasyonudur.

## Yuksek Seviye Mimari
- Yaklasim: DDD odakli moduler monolith (Next.js App Router + Route Handlers + service layer).
- Ayrim: Platform domaini (tenant lifecycle, plan, operasyon) ve Tenant domaini (ERP/POS islemleri) kesin sinirlarla ayrildi.
- Veri modeli: PostgreSQL + Prisma, tum tenant-business tablolarinda `tenantId` zorunlu.
- Kuyruk: Redis + BullMQ, e-belge/payout/webhook gibi asenkron surecler worker process ile.
- Depolama: S3 uyumlu obje deposu, tenant-path isolasyonu: `tenant/{tenantId}/...`.
- Gozlemlenebilirlik: JSON structured log (pino), correlation id, health/readiness endpoint.
- Guvenlik: middleware seviyesinde tenant baglami + servis seviyesinde tenant guard + RBAC action checks.

## Cekirdek Akislar
1. Giris: tenant slug + e-posta + sifre > session + refresh > audit log.
2. API: request > middleware tenant/correlation > route > service > repository > Prisma.
3. Finansal operasyonlar: stok/cari/kasa/banka hareketleri immutable movement tablolarina yazilir.
4. e-Fatura/e-Arsiv: outbound queue > worker > provider adapter > status sync > XML archive.
5. Odeme: payment link > provider webhook > verify signature > hareket kaydi > mutabakat logu.

## Tenant Izolasyonu
- DB: her tenant tablosu `tenantId` index + where filtre zorunlulugu.
- API: `x-tenant-slug` middleware ile set edilir.
- Session: JWT payload icinde `tenantId`; endpointte mismatch = 403.
- Queue: tum payloadlar `tenantId` ve `idempotencyKey` tasir.
- Files: tenant klasor namespace, signed URL.
- Webhook: provider + tenant context ile route islemesi.

## Guvenlik Katmanlari
- Session cookie: httpOnly + secure + sameSite=lax.
- Sifre: bcrypt hash.
- JWT: HS256, sureli token, refresh rotation altyapisi.
- RBAC: role-permission-action kontrolu, module/screen/action mantigi.
- Audit: login, kritik islem, entegrasyon hareketleri.
- Idempotency: kritik endpointler icin `idempotency_keys`.
- Rate limiting (plan): Redis bazli token bucket (Phase 3+).
- MFA-ready: `mfa_methods`, `mfa_recovery_codes` tablolari tanimli.

## e-Donusum Mimarisi
- Provider bagimsiz adapter interface.
- Provider registry + mock provider.
- Belge lifecycle: draft > validated > queued > sending > sent > delivered/failed/...
- XML/UBL-TR arsivleme: `e_invoice_xml_archives`.
- Retry/polling: queue + status log tablolari.

## Olceklenme Evreleri
- Stage 1: tek app + tek worker + tek DB.
- Stage 2: yatay app node + birden cok worker + read replica.
- Stage 3: tenant segmentasyonu, raporlama ayirma, materialized snapshot.
- Stage 4 (10M): shard routing, event bus, domain extraction (payment/einvoice/reporting), OLTP-OLAP ayrimi.
