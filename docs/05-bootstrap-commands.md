# Kurulum ve Bootstrap Komutlari

## 1) Ortami hazirla
```bash
cp .env.example .env
npm install
```

## 2) Altyapi servisleri
```bash
docker compose up -d postgres redis
```

## 3) Prisma
```bash
npx prisma generate
npx prisma migrate dev --name init_platform
npm run db:seed
```

## 4) Uygulamayi calistir
```bash
npm run dev
```

## 5) Worker
```bash
npm run worker
```

## 6) Testler
```bash
npm run test
```
