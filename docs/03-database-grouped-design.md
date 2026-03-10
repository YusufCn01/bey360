# ERP-Grade Veritabani Tasarimi (120+)

## Not
- Ayrintili teknik taslak: [prisma/schema.prisma](/c:/laragon/www/muhasebe/prisma/schema.prisma)
- Toplam model sayisi: 270+ (core + genisletilmis domain taslaklari)

## 30 Domain Grubu
1. Platform/SaaS
2. Identity/Auth
3. RBAC/Permissions
4. Tenant/Organization
5. Subscription/Billing
6. Product/Catalog
7. Pricing
8. Inventory/Warehouse
9. Sales/POS
10. Returns/Cancellations
11. Customer/Current Account
12. Supplier/Current Account
13. Purchasing
14. Invoice/Dispatch
15. Cash
16. Bank
17. Payment Collection
18. Expenses
19. Accounting-ready Movements
20. Reporting/Snapshots
21. Notifications
22. Files/Documents
23. Integrations
24. e-Fatura/e-Arsiv
25. Audit/Security
26. Settings/Customization
27. Workflow/Approvals
28. Usage/Quotas
29. Background Jobs/Logs
30. Support/Operational Logs

## Cekirdek Tasarim Ilkeleri
- Her tenant tablosunda `tenantId` + index
- Kritik tablolarda soft-delete (`deletedAt`)
- Hareket/event tablolari immutable yaklasimla kullanilir
- Numaralandirma/seri tablolari ayri
- E-belge ve odeme callbackleri loglanir
- Her kritik akista audit izi
- Idempotency key destek tablosu mevcut

## Zorunlu Aileler (Ornek Kume)
- Platform: platform_users, tenants, tenant_modules, tenant_usage_counters, tenant_webhooks
- Billing: subscription_plans, tenant_subscriptions, billing_invoices, billing_payments
- Auth: users, sessions, refresh_tokens, mfa_methods, login_attempts
- RBAC: roles, permissions, role_permissions, user_roles
- Org: branches, warehouses, cash_registers
- Catalog: products, product_variants, product_barcodes, units
- Inventory: stock_balances, stock_movements, stock_transfers
- Sales: sales, sale_items, sale_payments, sale_register_sessions
- Returns: sales_returns, refund_transactions
- Purchasing: purchase_orders, goods_receipts, purchase_invoices
- Finance: cash_transactions, bank_transactions, collections, payments_out
- e-Donusum: e_invoice_documents, e_invoice_xml_archives, e_invoice_status_logs
- Payment: payment_links, payment_transactions, payment_webhook_logs
- Reporting: dashboard_snapshots, daily_sales_aggregates, kpi_snapshots
- Security: audit_logs, security_events, suspicious_activity_logs
