# Phase 13-14 Hazırlık Durumu

## Phase 13 - Testler
- Unit testler:
  - para formatı
  - tenant çözümleme
  - RBAC kontrolü
  - POS doğrulama ve hesaplama
  - raporlama metrikleri
  - abonelik limitleri
- Integration test:
  - tenant izolasyon sorgu kontrolü
- E2E smoke:
  - Türkçe panel başlık doğrulaması

## Phase 14 - Operasyon / DevOps
- Dockerfile + worker Dockerfile hazır.
- docker-compose ile Postgres/Redis/App/Worker orkestrasyonu hazır.
- `.env.example` ile ortam değişkenleri şablonu hazır.
- Health (`/api/health`) ve readiness (`/api/ready`) endpointleri mevcut.
- Structured logging (pino) ve correlation id proxy akışı aktif.
- Prisma schema + seed + migration komutları README’de tanımlı.
