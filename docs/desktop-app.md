# Bey360 Masaustu Uygulamasi

Bu proje icin Electron tabanli masaustu paketleme `apps/desktop` altina eklendi.

## 1) Kurulum

```bash
npm run desktop:install
```

## 2) Gelistirme Modu

Bu komut Next.js web sunucusunu (`http://localhost:3015`) ve Electron penceresini ayni anda açar:

```bash
npm run desktop:dev
```

## 3) Canli Adrese Baglanan Masaustu Calistirma

Varsayilan olarak masaustu uygulama `https://bey360.com/giris` adresini acar:

```bash
npm run desktop:start
```

Bulut modunda zorlamak icin:

```bash
npm --prefix apps/desktop run start:cloud
```

Local backend URL ile acmak icin:

```bash
npm --prefix apps/desktop run start:local
```

Not: `start:local` komutu `http://localhost:3015` bekler.

## 4) Windows Kurulum Dosyasi (.exe)

```bash
npm run desktop:build:win
```

Uretilen cikti:

`apps/desktop/dist/Bey360-Setup-<versiyon>.exe`

## Notlar

- Bu yapi web/hosting deployment akisindan ayridir, Hostinger buildini etkilemez.
- Masaustu icinde harici linkler sistem tarayicisinda acilir.
- Tekil instance kilidi vardir; ayni anda ikinci uygulama acilamaz.
- Masaustu acilisinda local PostgreSQL konteyneri (Docker) otomatik denenir:
  - konteyner adi: `bey360-postgres`
  - baglanti: `postgresql://postgres:postgres@127.0.0.1:54329/muhasebe_local?schema=public`
  - Docker yoksa uygulama bulut modunda calismaya devam eder.
- Calisma modu:
  - `B360_DESKTOP_RUN_MODE=hybrid` (varsayilan): local backend ayaktaysa local, degilse cloud
  - `B360_DESKTOP_RUN_MODE=local`: sadece local backend URL acilir
  - `B360_DESKTOP_RUN_MODE=cloud`: dogrudan cloud URL acilir
