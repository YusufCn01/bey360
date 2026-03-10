# 10M Kullanici Yol Haritasi

## Stage 1 - Erken Asama
- Tek DB, tek app, tek worker
- Moduler monolith + net domain sinirlari
- Tenant izolasyonunun tam enforce edilmesi

## Stage 2 - Buyuyen SaaS
- Stateless app node yatay cogaltma
- Worker autoscaling
- Read replica ile rapor okumalari
- Redis cache katmani (tenant-safe key)

## Stage 3 - Buyuk Platform
- Tenant siniflandirma (SMB/Mid/Enterprise)
- Report query offload ve snapshot materialization
- S3 + CDN ile dosya dagitimi
- Olay tabanli entegrasyon genisletmeleri

## Stage 4 - 10M Olcegi
- Tenant shard routing (co-located shard map)
- Domain extraction: e-invoice, payment, reporting
- OLTP/OLAP ayrimi (warehouse/lakehouse)
- Cross-region failover + disaster recovery
- Zero-downtime rollout (blue/green, expand/contract migration)
