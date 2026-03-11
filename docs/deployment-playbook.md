# Bey360 Deploy Playbook

Bu dokuman production ortami icin minimum yayin adimlarini icerir.

## 1) Gerekli Ortam Degiskenleri

- `DATABASE_URL`
- `APP_URL`
- `APP_SECRET`
- `NODE_ENV=production`
- `DEFAULT_TENANT_SLUG` (onerilir)

## 2) Yayin Oncesi Kontrol

```bash
npm run deploy:check
```

Bu komut:
- veritabani erisimini test eder
- aktif tenant varligini kontrol eder
- `DEFAULT_TENANT_SLUG` degerini dogrular

## 3) Build + Migration

```bash
npm run deploy:prepare
```

Bu komut sirasiyla:
- deploy check
- prisma generate
- prisma migrate deploy
- production build

## 4) Gunluk Yedekleme

Uygulama ici yedekleme ozeti panelden izlenebilir.
Tam veri JSON snapshot icin sunucuda cron tanimlayin:

```bash
npm run backup:daily
```

Opsiyonel degiskenler:
- `BACKUP_DIR=.backups`
- `BACKUP_MAX_ROWS=5000`

## 5) Health / Ready Kontrolu

- `GET /api/health`
- `GET /api/ready`

Hazirlik endpointi DB ve Redis durumunu dondurur.
