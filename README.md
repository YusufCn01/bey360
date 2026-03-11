# MuhasebeX - Cok Kiracili SaaS ERP / POS

Turkiye pazari odakli, cloud-native, cok kiracili ERP/POS platformunun production-grade baslangic implementasyonu.

## Bu Surumde Tamamlananlar
- Phase 1: mimari, modul haritasi, ERP-grade DB gruplamasi, Prisma taslagi, klasor yapisi, bootstrap komutlari
- Phase 2: auth/session, tenant middleware, RBAC altyapisi, audit, idempotency, temel security katmani
- Phase 3: panel shell, Turkce varsayilan UI, navigation, dashboard
- Phase 4: urun/fiyat/stok temel API + urun listesi/formu
- Phase 5: musteri/tedarikci/cari temel API + listeler/formlar
- Phase 6: POS session/satis/aski/iade temel transaction akislari
- Phase 7: alis faturasi + belge ve stok giris akislari
- Phase 8: tahsilat/odeme/kasa transfer finans akislari
- Phase 9: dashboard KPI + Excel/PDF export
- Phase 10: e-Fatura/e-Arsiv queue + status sync + webhook
- Phase 11: abonelik API, plan degisimi ve entitlement yonetimi
- Phase 12: audit log API + islem gecmisi ekrani
- Phase 13: unit/integration/e2e test setinin genisletilmesi
- Phase 14: Docker, worker, health/readiness ve operasyonel hazirlik
- Ek genisletme: payment-link tenant API + public mock odeme sayfasi
- Ek genisletme: kullanici/rol API + panel kullanci/yetki yonetimi
- Ek genisletme: rol izin guncelleme endpointi + panelde rol izin editoru
- Ek genisletme: e-Fatura operasyon merkezi (listeleme, kuyruga alma, durum senkronizasyonu)
- Odeme adapter mimarisi + mock provider + webhook imza dogrulama altyapisi
- e-Fatura webhook akisinda belge durum guncelleme ve provider referans izleme
- Docker + compose + health/readiness endpoint + worker container temeli
- Unit/Integration/E2E test iskeletleri

## Giris
Demo tenant ve kullanici seed ile gelir:
- Sirket alani: `demo-market`
- E-posta: `owner@demo.local`
- Sifre: `Demo1234!`

## Hizli Baslangic
1. `cp .env.example .env`
2. `docker compose up -d postgres redis`
3. `npx prisma migrate dev --name init_platform`
4. `npm run db:seed`
5. `npm run dev`

## Windows Yerel Calistirma (Docker olmadan)
- Tum servisleri tek komutta baslat:
  - `powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1`
- Servis durumunu kontrol et:
  - `powershell -ExecutionPolicy Bypass -File scripts/status.ps1`

## Komutlar
- `npm run dev`: local app
- `npm run worker`: BullMQ worker
- `npm run test`: testler
- `npm run lint`: ESLint
- `npm run deploy:check`: production on-kontrol (env + DB + tenant)
- `npm run deploy:prepare`: migrate + build hazirlik akisi
- `npm run backup:daily`: gunluk JSON yedek snapshot
- `npm run prisma:generate`: Prisma client
- `npm run prisma:migrate`: migration
- `npm run db:seed`: seed

## Not
Bu commit, kurumsal ERP/POS platformunun iskeletini ve guvenlik tabanini atar. Is modullerinin detayli transaction mantigi (stok/cari/kasa entegre hareket defteri, mali kurallar, resmi e-donusum providerlari) sonraki iterasyonlarda ayni mimari sinirlarda genisletilecektir.

Deploy adimlari icin: `docs/deployment-playbook.md`
