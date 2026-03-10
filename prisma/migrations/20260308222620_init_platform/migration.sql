-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('TENANT', 'BRANCH', 'WAREHOUSE', 'REGISTER');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "legalName" VARCHAR(255) NOT NULL,
    "tradeName" VARCHAR(255),
    "taxNumber" VARCHAR(20) NOT NULL,
    "mersisNumber" VARCHAR(20),
    "locale" VARCHAR(10) NOT NULL DEFAULT 'tr-TR',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Europe/Istanbul',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "activeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_roles" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_permissions" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(160) NOT NULL,
    "module" VARCHAR(80) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_permissions" (
    "id" TEXT NOT NULL,
    "platformRoleId" TEXT NOT NULL,
    "platformPermissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(80),
    "firstName" VARCHAR(80) NOT NULL,
    "lastName" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(30),
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "lastLoginAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "isMfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "scope" "RoleScope" NOT NULL DEFAULT 'TENANT',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(160) NOT NULL,
    "module" VARCHAR(80) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "screen" VARCHAR(80),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "contextKey" VARCHAR(120) NOT NULL DEFAULT 'global',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(500),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_modules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_module_entitlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleCode" VARCHAR(80) NOT NULL,
    "entitlementKey" VARCHAR(120) NOT NULL,
    "entitlementValue" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_module_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_usage_counters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metricKey" VARCHAR(120) NOT NULL,
    "metricValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_api_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "keyPrefix" VARCHAR(20) NOT NULL,
    "keyHash" VARCHAR(255) NOT NULL,
    "scopes" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_webhooks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventKey" VARCHAR(120) NOT NULL,
    "endpointUrl" VARCHAR(500) NOT NULL,
    "secretHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventId" VARCHAR(120) NOT NULL,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "module" VARCHAR(80) NOT NULL,
    "entityName" VARCHAR(120) NOT NULL,
    "entityId" VARCHAR(120),
    "action" VARCHAR(80) NOT NULL,
    "severity" "SeverityLevel" NOT NULL DEFAULT 'INFO',
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(500),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "requestKey" VARCHAR(120) NOT NULL,
    "requestHash" VARCHAR(255) NOT NULL,
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_brands" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_status_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_locales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_locales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_timezones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_timezones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_feature_flags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_versions" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subscription_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_features" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subscription_plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_limits" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subscription_plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_usage_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subscription_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_addresses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "billing_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoice_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "billing_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_refunds" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "billing_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_credit_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "billing_credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "trial_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_definitions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "coupon_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_profiles" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_emails" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_phones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_passwords" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_passwords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_methods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "mfa_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_recovery_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_access_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ip_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_groups" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "branch_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "warehouse_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "register_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "register_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_reps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sales_reps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_statuses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_subgroups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_subgroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_conversions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_barcodes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_qrcodes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_qrcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tag_relations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_tag_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_values" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_values" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_variant_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_serial_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_serial_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_lot_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_lot_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_shelf_locations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_shelf_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_locks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_prices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_specific_prices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_specific_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_specific_prices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_specific_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_pricing_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bulk_pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "discount_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "promotion_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "campaign_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_definitions" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "currency_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement_types" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_movement_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_document_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_counts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lot_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serial_numbers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "reorder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expiry_tracking_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "expiry_tracking_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_subgroups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_subgroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contacts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_limits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_risk_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_risk_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_balances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_statements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_subgroups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_subgroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_addresses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contacts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_limits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_balances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_statements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_tags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "current_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_account_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "current_account_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_account_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "current_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movement_sources" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "movement_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "due_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "due_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments_out" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payments_out_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_out_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_out_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_item_taxes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sale_item_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_item_discounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sale_item_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_register_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sale_register_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspended_sales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suspended_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspended_sale_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suspended_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_receipts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sale_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "receipt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cart_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_check_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "price_check_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_sale_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "promo_sale_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_returns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "refund_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cancellation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancelled_cart_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cancelled_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voided_sales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "voided_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoice_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_cost_allocations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "purchase_cost_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_return_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_return_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_return_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dispatch_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_note_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dispatch_note_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_number_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "document_number_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "print_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_attachments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "document_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transaction_types" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cash_transaction_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_cash_closings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "daily_cash_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_opening_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cash_opening_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transfer_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cash_transfer_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_pos_devices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bank_pos_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_virtual_pos_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bank_virtual_pos_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "expense_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "expense_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_expenses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_providers" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_link_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_link_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transaction_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_transaction_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_refunds" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payout_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_providers" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_provider_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_sender_units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_sender_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_receivers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_receivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_document_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_xml_archives" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_xml_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_status_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_send_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_send_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_webhook_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_archive_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_archive_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gib_alias_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "gib_alias_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_scenarios" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoice_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_profiles" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoice_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_document_queues" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "outbound_document_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_document_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "inbound_document_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_folders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "file_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_access_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "file_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_tags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "document_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_relations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "document_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_channels" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "audit_log_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_access_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "api_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspicious_activity_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suspicious_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_export_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "data_export_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_deletion_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "data_deletion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "branch_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pos_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoice_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_invoice_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "e_invoice_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "report_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printer_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "printer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ui_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ui_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_flows" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "approval_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_request_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "approval_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_sales_aggregates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "daily_sales_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_sales_aggregates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "monthly_sales_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_valuation_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_valuation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_failures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "queue_failures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_sync_states" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "external_sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_retries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_retries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" VARCHAR(191),
    "code" VARCHAR(100),
    "name" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "support_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_taxNumber_key" ON "tenants"("taxNumber");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_roles_code_key" ON "platform_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "platform_permissions_key_key" ON "platform_permissions"("key");

-- CreateIndex
CREATE INDEX "platform_role_permissions_platformRoleId_idx" ON "platform_role_permissions"("platformRoleId");

-- CreateIndex
CREATE INDEX "platform_role_permissions_platformPermissionId_idx" ON "platform_role_permissions"("platformPermissionId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_role_permissions_platformRoleId_platformPermission_key" ON "platform_role_permissions"("platformRoleId", "platformPermissionId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "users_tenantId_status_idx" ON "users"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_username_key" ON "users"("tenantId", "username");

-- CreateIndex
CREATE INDEX "roles_tenantId_idx" ON "roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_code_key" ON "roles"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_contextKey_key" ON "role_permissions"("roleId", "permissionId", "contextKey");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_tenantId_userId_idx" ON "sessions"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_tenantId_userId_idx" ON "refresh_tokens"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "tenant_modules_tenantId_idx" ON "tenant_modules"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_modules_tenantId_code_key" ON "tenant_modules"("tenantId", "code");

-- CreateIndex
CREATE INDEX "tenant_module_entitlements_tenantId_idx" ON "tenant_module_entitlements"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_module_entitlements_tenantId_moduleCode_entitlementK_key" ON "tenant_module_entitlements"("tenantId", "moduleCode", "entitlementKey");

-- CreateIndex
CREATE INDEX "tenant_usage_counters_tenantId_metricKey_idx" ON "tenant_usage_counters"("tenantId", "metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_usage_counters_tenantId_metricKey_periodStart_period_key" ON "tenant_usage_counters"("tenantId", "metricKey", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_api_keys_keyHash_key" ON "tenant_api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "tenant_api_keys_tenantId_idx" ON "tenant_api_keys"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_webhooks_tenantId_idx" ON "tenant_webhooks"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_webhook_deliveries_tenantId_idx" ON "tenant_webhook_deliveries"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_webhook_deliveries_webhookId_idx" ON "tenant_webhook_deliveries"("webhookId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_module_idx" ON "audit_logs"("tenantId", "module");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_tenantId_endpoint_requestKey_key" ON "idempotency_keys"("tenantId", "endpoint", "requestKey");

-- CreateIndex
CREATE INDEX "tenant_domains_tenantId_idx" ON "tenant_domains"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_domains_tenantId_status_idx" ON "tenant_domains"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_brands_tenantId_idx" ON "tenant_brands"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_brands_tenantId_status_idx" ON "tenant_brands"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_status_history_tenantId_idx" ON "tenant_status_history"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_status_history_tenantId_status_idx" ON "tenant_status_history"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_settings_tenantId_idx" ON "tenant_settings"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_settings_tenantId_status_idx" ON "tenant_settings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_locales_tenantId_idx" ON "tenant_locales"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_locales_tenantId_status_idx" ON "tenant_locales"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_timezones_tenantId_idx" ON "tenant_timezones"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_timezones_tenantId_status_idx" ON "tenant_timezones"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_feature_flags_tenantId_idx" ON "tenant_feature_flags"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_feature_flags_tenantId_status_idx" ON "tenant_feature_flags"("tenantId", "status");

-- CreateIndex
CREATE INDEX "subscription_plans_status_idx" ON "subscription_plans"("status");

-- CreateIndex
CREATE INDEX "subscription_plan_versions_status_idx" ON "subscription_plan_versions"("status");

-- CreateIndex
CREATE INDEX "subscription_plan_features_status_idx" ON "subscription_plan_features"("status");

-- CreateIndex
CREATE INDEX "subscription_plan_limits_status_idx" ON "subscription_plan_limits"("status");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_tenantId_idx" ON "tenant_subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_tenantId_status_idx" ON "tenant_subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "subscription_items_tenantId_idx" ON "subscription_items"("tenantId");

-- CreateIndex
CREATE INDEX "subscription_items_tenantId_status_idx" ON "subscription_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "subscription_usage_records_tenantId_idx" ON "subscription_usage_records"("tenantId");

-- CreateIndex
CREATE INDEX "subscription_usage_records_tenantId_status_idx" ON "subscription_usage_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_customers_tenantId_idx" ON "billing_customers"("tenantId");

-- CreateIndex
CREATE INDEX "billing_customers_tenantId_status_idx" ON "billing_customers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_addresses_tenantId_idx" ON "billing_addresses"("tenantId");

-- CreateIndex
CREATE INDEX "billing_addresses_tenantId_status_idx" ON "billing_addresses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_invoices_tenantId_idx" ON "billing_invoices"("tenantId");

-- CreateIndex
CREATE INDEX "billing_invoices_tenantId_status_idx" ON "billing_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_invoice_items_tenantId_idx" ON "billing_invoice_items"("tenantId");

-- CreateIndex
CREATE INDEX "billing_invoice_items_tenantId_status_idx" ON "billing_invoice_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_payments_tenantId_idx" ON "billing_payments"("tenantId");

-- CreateIndex
CREATE INDEX "billing_payments_tenantId_status_idx" ON "billing_payments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_refunds_tenantId_idx" ON "billing_refunds"("tenantId");

-- CreateIndex
CREATE INDEX "billing_refunds_tenantId_status_idx" ON "billing_refunds"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_credit_notes_tenantId_idx" ON "billing_credit_notes"("tenantId");

-- CreateIndex
CREATE INDEX "billing_credit_notes_tenantId_status_idx" ON "billing_credit_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "trial_periods_tenantId_idx" ON "trial_periods"("tenantId");

-- CreateIndex
CREATE INDEX "trial_periods_tenantId_status_idx" ON "trial_periods"("tenantId", "status");

-- CreateIndex
CREATE INDEX "coupon_definitions_tenantId_idx" ON "coupon_definitions"("tenantId");

-- CreateIndex
CREATE INDEX "coupon_definitions_tenantId_status_idx" ON "coupon_definitions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "coupon_redemptions_tenantId_idx" ON "coupon_redemptions"("tenantId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_tenantId_status_idx" ON "coupon_redemptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tax_profiles_status_idx" ON "tax_profiles"("status");

-- CreateIndex
CREATE INDEX "user_profiles_tenantId_idx" ON "user_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "user_profiles_tenantId_status_idx" ON "user_profiles"("tenantId", "status");

-- CreateIndex
CREATE INDEX "user_emails_tenantId_idx" ON "user_emails"("tenantId");

-- CreateIndex
CREATE INDEX "user_emails_tenantId_status_idx" ON "user_emails"("tenantId", "status");

-- CreateIndex
CREATE INDEX "user_phones_tenantId_idx" ON "user_phones"("tenantId");

-- CreateIndex
CREATE INDEX "user_phones_tenantId_status_idx" ON "user_phones"("tenantId", "status");

-- CreateIndex
CREATE INDEX "user_passwords_tenantId_idx" ON "user_passwords"("tenantId");

-- CreateIndex
CREATE INDEX "user_passwords_tenantId_status_idx" ON "user_passwords"("tenantId", "status");

-- CreateIndex
CREATE INDEX "password_reset_tokens_tenantId_idx" ON "password_reset_tokens"("tenantId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_tenantId_status_idx" ON "password_reset_tokens"("tenantId", "status");

-- CreateIndex
CREATE INDEX "email_verification_tokens_tenantId_idx" ON "email_verification_tokens"("tenantId");

-- CreateIndex
CREATE INDEX "email_verification_tokens_tenantId_status_idx" ON "email_verification_tokens"("tenantId", "status");

-- CreateIndex
CREATE INDEX "mfa_methods_tenantId_idx" ON "mfa_methods"("tenantId");

-- CreateIndex
CREATE INDEX "mfa_methods_tenantId_status_idx" ON "mfa_methods"("tenantId", "status");

-- CreateIndex
CREATE INDEX "mfa_recovery_codes_tenantId_idx" ON "mfa_recovery_codes"("tenantId");

-- CreateIndex
CREATE INDEX "mfa_recovery_codes_tenantId_status_idx" ON "mfa_recovery_codes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "login_attempts_tenantId_idx" ON "login_attempts"("tenantId");

-- CreateIndex
CREATE INDEX "login_attempts_tenantId_status_idx" ON "login_attempts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "device_sessions_tenantId_idx" ON "device_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "device_sessions_tenantId_status_idx" ON "device_sessions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ip_access_logs_tenantId_idx" ON "ip_access_logs"("tenantId");

-- CreateIndex
CREATE INDEX "ip_access_logs_tenantId_status_idx" ON "ip_access_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "user_invitations_tenantId_idx" ON "user_invitations"("tenantId");

-- CreateIndex
CREATE INDEX "user_invitations_tenantId_status_idx" ON "user_invitations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "user_permission_overrides_tenantId_idx" ON "user_permission_overrides"("tenantId");

-- CreateIndex
CREATE INDEX "user_permission_overrides_tenantId_status_idx" ON "user_permission_overrides"("tenantId", "status");

-- CreateIndex
CREATE INDEX "permission_groups_status_idx" ON "permission_groups"("status");

-- CreateIndex
CREATE INDEX "branches_tenantId_idx" ON "branches"("tenantId");

-- CreateIndex
CREATE INDEX "branches_tenantId_status_idx" ON "branches"("tenantId", "status");

-- CreateIndex
CREATE INDEX "branch_users_tenantId_idx" ON "branch_users"("tenantId");

-- CreateIndex
CREATE INDEX "branch_users_tenantId_status_idx" ON "branch_users"("tenantId", "status");

-- CreateIndex
CREATE INDEX "warehouses_tenantId_idx" ON "warehouses"("tenantId");

-- CreateIndex
CREATE INDEX "warehouses_tenantId_status_idx" ON "warehouses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "warehouse_users_tenantId_idx" ON "warehouse_users"("tenantId");

-- CreateIndex
CREATE INDEX "warehouse_users_tenantId_status_idx" ON "warehouse_users"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cash_registers_tenantId_idx" ON "cash_registers"("tenantId");

-- CreateIndex
CREATE INDEX "cash_registers_tenantId_status_idx" ON "cash_registers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "register_users_tenantId_idx" ON "register_users"("tenantId");

-- CreateIndex
CREATE INDEX "register_users_tenantId_status_idx" ON "register_users"("tenantId", "status");

-- CreateIndex
CREATE INDEX "departments_tenantId_idx" ON "departments"("tenantId");

-- CreateIndex
CREATE INDEX "departments_tenantId_status_idx" ON "departments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "teams_tenantId_idx" ON "teams"("tenantId");

-- CreateIndex
CREATE INDEX "teams_tenantId_status_idx" ON "teams"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sales_reps_tenantId_idx" ON "sales_reps"("tenantId");

-- CreateIndex
CREATE INDEX "sales_reps_tenantId_status_idx" ON "sales_reps"("tenantId", "status");

-- CreateIndex
CREATE INDEX "products_tenantId_idx" ON "products"("tenantId");

-- CreateIndex
CREATE INDEX "products_tenantId_status_idx" ON "products"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_types_tenantId_idx" ON "product_types"("tenantId");

-- CreateIndex
CREATE INDEX "product_types_tenantId_status_idx" ON "product_types"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_statuses_tenantId_idx" ON "product_statuses"("tenantId");

-- CreateIndex
CREATE INDEX "product_statuses_tenantId_status_idx" ON "product_statuses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_groups_tenantId_idx" ON "product_groups"("tenantId");

-- CreateIndex
CREATE INDEX "product_groups_tenantId_status_idx" ON "product_groups"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_subgroups_tenantId_idx" ON "product_subgroups"("tenantId");

-- CreateIndex
CREATE INDEX "product_subgroups_tenantId_status_idx" ON "product_subgroups"("tenantId", "status");

-- CreateIndex
CREATE INDEX "brands_tenantId_idx" ON "brands"("tenantId");

-- CreateIndex
CREATE INDEX "brands_tenantId_status_idx" ON "brands"("tenantId", "status");

-- CreateIndex
CREATE INDEX "units_tenantId_idx" ON "units"("tenantId");

-- CreateIndex
CREATE INDEX "units_tenantId_status_idx" ON "units"("tenantId", "status");

-- CreateIndex
CREATE INDEX "unit_conversions_tenantId_idx" ON "unit_conversions"("tenantId");

-- CreateIndex
CREATE INDEX "unit_conversions_tenantId_status_idx" ON "unit_conversions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_barcodes_tenantId_idx" ON "product_barcodes"("tenantId");

-- CreateIndex
CREATE INDEX "product_barcodes_tenantId_status_idx" ON "product_barcodes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_qrcodes_tenantId_idx" ON "product_qrcodes"("tenantId");

-- CreateIndex
CREATE INDEX "product_qrcodes_tenantId_status_idx" ON "product_qrcodes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_images_tenantId_idx" ON "product_images"("tenantId");

-- CreateIndex
CREATE INDEX "product_images_tenantId_status_idx" ON "product_images"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_files_tenantId_idx" ON "product_files"("tenantId");

-- CreateIndex
CREATE INDEX "product_files_tenantId_status_idx" ON "product_files"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_tags_tenantId_idx" ON "product_tags"("tenantId");

-- CreateIndex
CREATE INDEX "product_tags_tenantId_status_idx" ON "product_tags"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_tag_relations_tenantId_idx" ON "product_tag_relations"("tenantId");

-- CreateIndex
CREATE INDEX "product_tag_relations_tenantId_status_idx" ON "product_tag_relations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_attributes_tenantId_idx" ON "product_attributes"("tenantId");

-- CreateIndex
CREATE INDEX "product_attributes_tenantId_status_idx" ON "product_attributes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_attribute_values_tenantId_idx" ON "product_attribute_values"("tenantId");

-- CreateIndex
CREATE INDEX "product_attribute_values_tenantId_status_idx" ON "product_attribute_values"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_variants_tenantId_idx" ON "product_variants"("tenantId");

-- CreateIndex
CREATE INDEX "product_variants_tenantId_status_idx" ON "product_variants"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_variant_values_tenantId_idx" ON "product_variant_values"("tenantId");

-- CreateIndex
CREATE INDEX "product_variant_values_tenantId_status_idx" ON "product_variant_values"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_serial_profiles_tenantId_idx" ON "product_serial_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "product_serial_profiles_tenantId_status_idx" ON "product_serial_profiles"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_lot_profiles_tenantId_idx" ON "product_lot_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "product_lot_profiles_tenantId_status_idx" ON "product_lot_profiles"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_shelf_locations_tenantId_idx" ON "product_shelf_locations"("tenantId");

-- CreateIndex
CREATE INDEX "product_shelf_locations_tenantId_status_idx" ON "product_shelf_locations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_notes_tenantId_idx" ON "product_notes"("tenantId");

-- CreateIndex
CREATE INDEX "product_notes_tenantId_status_idx" ON "product_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_locks_tenantId_idx" ON "product_locks"("tenantId");

-- CreateIndex
CREATE INDEX "product_locks_tenantId_status_idx" ON "product_locks"("tenantId", "status");

-- CreateIndex
CREATE INDEX "price_lists_tenantId_idx" ON "price_lists"("tenantId");

-- CreateIndex
CREATE INDEX "price_lists_tenantId_status_idx" ON "price_lists"("tenantId", "status");

-- CreateIndex
CREATE INDEX "price_list_items_tenantId_idx" ON "price_list_items"("tenantId");

-- CreateIndex
CREATE INDEX "price_list_items_tenantId_status_idx" ON "price_list_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_prices_tenantId_idx" ON "product_prices"("tenantId");

-- CreateIndex
CREATE INDEX "product_prices_tenantId_status_idx" ON "product_prices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_specific_prices_tenantId_idx" ON "customer_specific_prices"("tenantId");

-- CreateIndex
CREATE INDEX "customer_specific_prices_tenantId_status_idx" ON "customer_specific_prices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_specific_prices_tenantId_idx" ON "supplier_specific_prices"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_specific_prices_tenantId_status_idx" ON "supplier_specific_prices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bulk_pricing_rules_tenantId_idx" ON "bulk_pricing_rules"("tenantId");

-- CreateIndex
CREATE INDEX "bulk_pricing_rules_tenantId_status_idx" ON "bulk_pricing_rules"("tenantId", "status");

-- CreateIndex
CREATE INDEX "discount_rules_tenantId_idx" ON "discount_rules"("tenantId");

-- CreateIndex
CREATE INDEX "discount_rules_tenantId_status_idx" ON "discount_rules"("tenantId", "status");

-- CreateIndex
CREATE INDEX "promotion_rules_tenantId_idx" ON "promotion_rules"("tenantId");

-- CreateIndex
CREATE INDEX "promotion_rules_tenantId_status_idx" ON "promotion_rules"("tenantId", "status");

-- CreateIndex
CREATE INDEX "campaign_rules_tenantId_idx" ON "campaign_rules"("tenantId");

-- CreateIndex
CREATE INDEX "campaign_rules_tenantId_status_idx" ON "campaign_rules"("tenantId", "status");

-- CreateIndex
CREATE INDEX "currency_definitions_status_idx" ON "currency_definitions"("status");

-- CreateIndex
CREATE INDEX "exchange_rates_tenantId_idx" ON "exchange_rates"("tenantId");

-- CreateIndex
CREATE INDEX "exchange_rates_tenantId_status_idx" ON "exchange_rates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tax_rates_status_idx" ON "tax_rates"("status");

-- CreateIndex
CREATE INDEX "stock_balances_tenantId_idx" ON "stock_balances"("tenantId");

-- CreateIndex
CREATE INDEX "stock_balances_tenantId_status_idx" ON "stock_balances"("tenantId", "status");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_idx" ON "stock_movements"("tenantId");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_status_idx" ON "stock_movements"("tenantId", "status");

-- CreateIndex
CREATE INDEX "stock_movement_types_status_idx" ON "stock_movement_types"("status");

-- CreateIndex
CREATE INDEX "inventory_documents_tenantId_idx" ON "inventory_documents"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_documents_tenantId_status_idx" ON "inventory_documents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "inventory_document_items_tenantId_idx" ON "inventory_document_items"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_document_items_tenantId_status_idx" ON "inventory_document_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "stock_counts_tenantId_idx" ON "stock_counts"("tenantId");

-- CreateIndex
CREATE INDEX "stock_counts_tenantId_status_idx" ON "stock_counts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "stock_count_items_tenantId_idx" ON "stock_count_items"("tenantId");

-- CreateIndex
CREATE INDEX "stock_count_items_tenantId_status_idx" ON "stock_count_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "stock_adjustments_tenantId_idx" ON "stock_adjustments"("tenantId");

-- CreateIndex
CREATE INDEX "stock_adjustments_tenantId_status_idx" ON "stock_adjustments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "stock_transfers_tenantId_idx" ON "stock_transfers"("tenantId");

-- CreateIndex
CREATE INDEX "stock_transfers_tenantId_status_idx" ON "stock_transfers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "stock_transfer_items_tenantId_idx" ON "stock_transfer_items"("tenantId");

-- CreateIndex
CREATE INDEX "stock_transfer_items_tenantId_status_idx" ON "stock_transfer_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "lot_batches_tenantId_idx" ON "lot_batches"("tenantId");

-- CreateIndex
CREATE INDEX "lot_batches_tenantId_status_idx" ON "lot_batches"("tenantId", "status");

-- CreateIndex
CREATE INDEX "serial_numbers_tenantId_idx" ON "serial_numbers"("tenantId");

-- CreateIndex
CREATE INDEX "serial_numbers_tenantId_status_idx" ON "serial_numbers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "inventory_reservations_tenantId_idx" ON "inventory_reservations"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_reservations_tenantId_status_idx" ON "inventory_reservations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "reorder_rules_tenantId_idx" ON "reorder_rules"("tenantId");

-- CreateIndex
CREATE INDEX "reorder_rules_tenantId_status_idx" ON "reorder_rules"("tenantId", "status");

-- CreateIndex
CREATE INDEX "expiry_tracking_records_tenantId_idx" ON "expiry_tracking_records"("tenantId");

-- CreateIndex
CREATE INDEX "expiry_tracking_records_tenantId_status_idx" ON "expiry_tracking_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");

-- CreateIndex
CREATE INDEX "customers_tenantId_status_idx" ON "customers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_groups_tenantId_idx" ON "customer_groups"("tenantId");

-- CreateIndex
CREATE INDEX "customer_groups_tenantId_status_idx" ON "customer_groups"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_subgroups_tenantId_idx" ON "customer_subgroups"("tenantId");

-- CreateIndex
CREATE INDEX "customer_subgroups_tenantId_status_idx" ON "customer_subgroups"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_addresses_tenantId_idx" ON "customer_addresses"("tenantId");

-- CreateIndex
CREATE INDEX "customer_addresses_tenantId_status_idx" ON "customer_addresses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_contacts_tenantId_idx" ON "customer_contacts"("tenantId");

-- CreateIndex
CREATE INDEX "customer_contacts_tenantId_status_idx" ON "customer_contacts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_notes_tenantId_idx" ON "customer_notes"("tenantId");

-- CreateIndex
CREATE INDEX "customer_notes_tenantId_status_idx" ON "customer_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_limits_tenantId_idx" ON "customer_limits"("tenantId");

-- CreateIndex
CREATE INDEX "customer_limits_tenantId_status_idx" ON "customer_limits"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_risk_profiles_tenantId_idx" ON "customer_risk_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "customer_risk_profiles_tenantId_status_idx" ON "customer_risk_profiles"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_balances_tenantId_idx" ON "customer_balances"("tenantId");

-- CreateIndex
CREATE INDEX "customer_balances_tenantId_status_idx" ON "customer_balances"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_statements_tenantId_idx" ON "customer_statements"("tenantId");

-- CreateIndex
CREATE INDEX "customer_statements_tenantId_status_idx" ON "customer_statements"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_documents_tenantId_idx" ON "customer_documents"("tenantId");

-- CreateIndex
CREATE INDEX "customer_documents_tenantId_status_idx" ON "customer_documents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_tags_tenantId_idx" ON "customer_tags"("tenantId");

-- CreateIndex
CREATE INDEX "customer_tags_tenantId_status_idx" ON "customer_tags"("tenantId", "status");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_idx" ON "suppliers"("tenantId");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_status_idx" ON "suppliers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_groups_tenantId_idx" ON "supplier_groups"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_groups_tenantId_status_idx" ON "supplier_groups"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_subgroups_tenantId_idx" ON "supplier_subgroups"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_subgroups_tenantId_status_idx" ON "supplier_subgroups"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_addresses_tenantId_idx" ON "supplier_addresses"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_addresses_tenantId_status_idx" ON "supplier_addresses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_contacts_tenantId_idx" ON "supplier_contacts"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_contacts_tenantId_status_idx" ON "supplier_contacts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_notes_tenantId_idx" ON "supplier_notes"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_notes_tenantId_status_idx" ON "supplier_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_limits_tenantId_idx" ON "supplier_limits"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_limits_tenantId_status_idx" ON "supplier_limits"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_balances_tenantId_idx" ON "supplier_balances"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_balances_tenantId_status_idx" ON "supplier_balances"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_statements_tenantId_idx" ON "supplier_statements"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_statements_tenantId_status_idx" ON "supplier_statements"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_documents_tenantId_idx" ON "supplier_documents"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_documents_tenantId_status_idx" ON "supplier_documents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_tags_tenantId_idx" ON "supplier_tags"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_tags_tenantId_status_idx" ON "supplier_tags"("tenantId", "status");

-- CreateIndex
CREATE INDEX "current_accounts_tenantId_idx" ON "current_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "current_accounts_tenantId_status_idx" ON "current_accounts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "current_account_types_tenantId_idx" ON "current_account_types"("tenantId");

-- CreateIndex
CREATE INDEX "current_account_types_tenantId_status_idx" ON "current_account_types"("tenantId", "status");

-- CreateIndex
CREATE INDEX "current_account_movements_tenantId_idx" ON "current_account_movements"("tenantId");

-- CreateIndex
CREATE INDEX "current_account_movements_tenantId_status_idx" ON "current_account_movements"("tenantId", "status");

-- CreateIndex
CREATE INDEX "movement_sources_status_idx" ON "movement_sources"("status");

-- CreateIndex
CREATE INDEX "balance_snapshots_tenantId_idx" ON "balance_snapshots"("tenantId");

-- CreateIndex
CREATE INDEX "balance_snapshots_tenantId_status_idx" ON "balance_snapshots"("tenantId", "status");

-- CreateIndex
CREATE INDEX "due_schedules_tenantId_idx" ON "due_schedules"("tenantId");

-- CreateIndex
CREATE INDEX "due_schedules_tenantId_status_idx" ON "due_schedules"("tenantId", "status");

-- CreateIndex
CREATE INDEX "collections_tenantId_idx" ON "collections"("tenantId");

-- CreateIndex
CREATE INDEX "collections_tenantId_status_idx" ON "collections"("tenantId", "status");

-- CreateIndex
CREATE INDEX "collection_items_tenantId_idx" ON "collection_items"("tenantId");

-- CreateIndex
CREATE INDEX "collection_items_tenantId_status_idx" ON "collection_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payments_out_tenantId_idx" ON "payments_out"("tenantId");

-- CreateIndex
CREATE INDEX "payments_out_tenantId_status_idx" ON "payments_out"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_out_items_tenantId_idx" ON "payment_out_items"("tenantId");

-- CreateIndex
CREATE INDEX "payment_out_items_tenantId_status_idx" ON "payment_out_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sales_tenantId_idx" ON "sales"("tenantId");

-- CreateIndex
CREATE INDEX "sales_tenantId_status_idx" ON "sales"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sale_items_tenantId_idx" ON "sale_items"("tenantId");

-- CreateIndex
CREATE INDEX "sale_items_tenantId_status_idx" ON "sale_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sale_item_taxes_tenantId_idx" ON "sale_item_taxes"("tenantId");

-- CreateIndex
CREATE INDEX "sale_item_taxes_tenantId_status_idx" ON "sale_item_taxes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sale_item_discounts_tenantId_idx" ON "sale_item_discounts"("tenantId");

-- CreateIndex
CREATE INDEX "sale_item_discounts_tenantId_status_idx" ON "sale_item_discounts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sale_payments_tenantId_idx" ON "sale_payments"("tenantId");

-- CreateIndex
CREATE INDEX "sale_payments_tenantId_status_idx" ON "sale_payments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sale_register_sessions_tenantId_idx" ON "sale_register_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "sale_register_sessions_tenantId_status_idx" ON "sale_register_sessions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "suspended_sales_tenantId_idx" ON "suspended_sales"("tenantId");

-- CreateIndex
CREATE INDEX "suspended_sales_tenantId_status_idx" ON "suspended_sales"("tenantId", "status");

-- CreateIndex
CREATE INDEX "suspended_sale_items_tenantId_idx" ON "suspended_sale_items"("tenantId");

-- CreateIndex
CREATE INDEX "suspended_sale_items_tenantId_status_idx" ON "suspended_sale_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sale_receipts_tenantId_idx" ON "sale_receipts"("tenantId");

-- CreateIndex
CREATE INDEX "sale_receipts_tenantId_status_idx" ON "sale_receipts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "receipt_templates_tenantId_idx" ON "receipt_templates"("tenantId");

-- CreateIndex
CREATE INDEX "receipt_templates_tenantId_status_idx" ON "receipt_templates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cart_events_tenantId_idx" ON "cart_events"("tenantId");

-- CreateIndex
CREATE INDEX "cart_events_tenantId_status_idx" ON "cart_events"("tenantId", "status");

-- CreateIndex
CREATE INDEX "price_check_logs_tenantId_idx" ON "price_check_logs"("tenantId");

-- CreateIndex
CREATE INDEX "price_check_logs_tenantId_status_idx" ON "price_check_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "promo_sale_records_tenantId_idx" ON "promo_sale_records"("tenantId");

-- CreateIndex
CREATE INDEX "promo_sale_records_tenantId_status_idx" ON "promo_sale_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sales_returns_tenantId_idx" ON "sales_returns"("tenantId");

-- CreateIndex
CREATE INDEX "sales_returns_tenantId_status_idx" ON "sales_returns"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sales_return_items_tenantId_idx" ON "sales_return_items"("tenantId");

-- CreateIndex
CREATE INDEX "sales_return_items_tenantId_status_idx" ON "sales_return_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "refund_transactions_tenantId_idx" ON "refund_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "refund_transactions_tenantId_status_idx" ON "refund_transactions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cancellation_records_tenantId_idx" ON "cancellation_records"("tenantId");

-- CreateIndex
CREATE INDEX "cancellation_records_tenantId_status_idx" ON "cancellation_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cancelled_cart_items_tenantId_idx" ON "cancelled_cart_items"("tenantId");

-- CreateIndex
CREATE INDEX "cancelled_cart_items_tenantId_status_idx" ON "cancelled_cart_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "voided_sales_tenantId_idx" ON "voided_sales"("tenantId");

-- CreateIndex
CREATE INDEX "voided_sales_tenantId_status_idx" ON "voided_sales"("tenantId", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_tenantId_idx" ON "purchase_orders"("tenantId");

-- CreateIndex
CREATE INDEX "purchase_orders_tenantId_status_idx" ON "purchase_orders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "purchase_order_items_tenantId_idx" ON "purchase_order_items"("tenantId");

-- CreateIndex
CREATE INDEX "purchase_order_items_tenantId_status_idx" ON "purchase_order_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "goods_receipts_tenantId_idx" ON "goods_receipts"("tenantId");

-- CreateIndex
CREATE INDEX "goods_receipts_tenantId_status_idx" ON "goods_receipts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "goods_receipt_items_tenantId_idx" ON "goods_receipt_items"("tenantId");

-- CreateIndex
CREATE INDEX "goods_receipt_items_tenantId_status_idx" ON "goods_receipt_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "purchase_invoices_tenantId_idx" ON "purchase_invoices"("tenantId");

-- CreateIndex
CREATE INDEX "purchase_invoices_tenantId_status_idx" ON "purchase_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "purchase_invoice_items_tenantId_idx" ON "purchase_invoice_items"("tenantId");

-- CreateIndex
CREATE INDEX "purchase_invoice_items_tenantId_status_idx" ON "purchase_invoice_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "purchase_cost_allocations_tenantId_idx" ON "purchase_cost_allocations"("tenantId");

-- CreateIndex
CREATE INDEX "purchase_cost_allocations_tenantId_status_idx" ON "purchase_cost_allocations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_return_notes_tenantId_idx" ON "supplier_return_notes"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_return_notes_tenantId_status_idx" ON "supplier_return_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "supplier_return_items_tenantId_idx" ON "supplier_return_items"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_return_items_tenantId_status_idx" ON "supplier_return_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");

-- CreateIndex
CREATE INDEX "invoices_tenantId_status_idx" ON "invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "invoice_items_tenantId_idx" ON "invoice_items"("tenantId");

-- CreateIndex
CREATE INDEX "invoice_items_tenantId_status_idx" ON "invoice_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "dispatch_notes_tenantId_idx" ON "dispatch_notes"("tenantId");

-- CreateIndex
CREATE INDEX "dispatch_notes_tenantId_status_idx" ON "dispatch_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "dispatch_note_items_tenantId_idx" ON "dispatch_note_items"("tenantId");

-- CreateIndex
CREATE INDEX "dispatch_note_items_tenantId_status_idx" ON "dispatch_note_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "invoice_sequences_tenantId_idx" ON "invoice_sequences"("tenantId");

-- CreateIndex
CREATE INDEX "invoice_sequences_tenantId_status_idx" ON "invoice_sequences"("tenantId", "status");

-- CreateIndex
CREATE INDEX "document_number_series_tenantId_idx" ON "document_number_series"("tenantId");

-- CreateIndex
CREATE INDEX "document_number_series_tenantId_status_idx" ON "document_number_series"("tenantId", "status");

-- CreateIndex
CREATE INDEX "print_templates_tenantId_idx" ON "print_templates"("tenantId");

-- CreateIndex
CREATE INDEX "print_templates_tenantId_status_idx" ON "print_templates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "document_attachments_tenantId_idx" ON "document_attachments"("tenantId");

-- CreateIndex
CREATE INDEX "document_attachments_tenantId_status_idx" ON "document_attachments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cash_accounts_tenantId_idx" ON "cash_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "cash_accounts_tenantId_status_idx" ON "cash_accounts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cash_transactions_tenantId_idx" ON "cash_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "cash_transactions_tenantId_status_idx" ON "cash_transactions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cash_transaction_types_status_idx" ON "cash_transaction_types"("status");

-- CreateIndex
CREATE INDEX "daily_cash_closings_tenantId_idx" ON "daily_cash_closings"("tenantId");

-- CreateIndex
CREATE INDEX "daily_cash_closings_tenantId_status_idx" ON "daily_cash_closings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cash_opening_records_tenantId_idx" ON "cash_opening_records"("tenantId");

-- CreateIndex
CREATE INDEX "cash_opening_records_tenantId_status_idx" ON "cash_opening_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "cash_transfer_records_tenantId_idx" ON "cash_transfer_records"("tenantId");

-- CreateIndex
CREATE INDEX "cash_transfer_records_tenantId_status_idx" ON "cash_transfer_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bank_accounts_tenantId_idx" ON "bank_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "bank_accounts_tenantId_status_idx" ON "bank_accounts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bank_transactions_tenantId_idx" ON "bank_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "bank_transactions_tenantId_status_idx" ON "bank_transactions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bank_reconciliations_tenantId_idx" ON "bank_reconciliations"("tenantId");

-- CreateIndex
CREATE INDEX "bank_reconciliations_tenantId_status_idx" ON "bank_reconciliations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bank_pos_devices_tenantId_idx" ON "bank_pos_devices"("tenantId");

-- CreateIndex
CREATE INDEX "bank_pos_devices_tenantId_status_idx" ON "bank_pos_devices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bank_virtual_pos_profiles_tenantId_idx" ON "bank_virtual_pos_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "bank_virtual_pos_profiles_tenantId_status_idx" ON "bank_virtual_pos_profiles"("tenantId", "status");

-- CreateIndex
CREATE INDEX "expense_groups_tenantId_idx" ON "expense_groups"("tenantId");

-- CreateIndex
CREATE INDEX "expense_groups_tenantId_status_idx" ON "expense_groups"("tenantId", "status");

-- CreateIndex
CREATE INDEX "expenses_tenantId_idx" ON "expenses"("tenantId");

-- CreateIndex
CREATE INDEX "expenses_tenantId_status_idx" ON "expenses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "expense_documents_tenantId_idx" ON "expense_documents"("tenantId");

-- CreateIndex
CREATE INDEX "expense_documents_tenantId_status_idx" ON "expense_documents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "recurring_expenses_tenantId_idx" ON "recurring_expenses"("tenantId");

-- CreateIndex
CREATE INDEX "recurring_expenses_tenantId_status_idx" ON "recurring_expenses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_providers_status_idx" ON "payment_providers"("status");

-- CreateIndex
CREATE INDEX "payment_provider_configs_tenantId_idx" ON "payment_provider_configs"("tenantId");

-- CreateIndex
CREATE INDEX "payment_provider_configs_tenantId_status_idx" ON "payment_provider_configs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_customers_tenantId_idx" ON "payment_customers"("tenantId");

-- CreateIndex
CREATE INDEX "payment_customers_tenantId_status_idx" ON "payment_customers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_links_tenantId_idx" ON "payment_links"("tenantId");

-- CreateIndex
CREATE INDEX "payment_links_tenantId_status_idx" ON "payment_links"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_link_events_tenantId_idx" ON "payment_link_events"("tenantId");

-- CreateIndex
CREATE INDEX "payment_link_events_tenantId_status_idx" ON "payment_link_events"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_tenantId_idx" ON "payment_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "payment_transactions_tenantId_status_idx" ON "payment_transactions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_transaction_attempts_tenantId_idx" ON "payment_transaction_attempts"("tenantId");

-- CreateIndex
CREATE INDEX "payment_transaction_attempts_tenantId_status_idx" ON "payment_transaction_attempts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_refunds_tenantId_idx" ON "payment_refunds"("tenantId");

-- CreateIndex
CREATE INDEX "payment_refunds_tenantId_status_idx" ON "payment_refunds"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_webhook_logs_tenantId_idx" ON "payment_webhook_logs"("tenantId");

-- CreateIndex
CREATE INDEX "payment_webhook_logs_tenantId_status_idx" ON "payment_webhook_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payout_records_tenantId_idx" ON "payout_records"("tenantId");

-- CreateIndex
CREATE INDEX "payout_records_tenantId_status_idx" ON "payout_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_providers_status_idx" ON "e_invoice_providers"("status");

-- CreateIndex
CREATE INDEX "e_invoice_provider_configs_tenantId_idx" ON "e_invoice_provider_configs"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_provider_configs_tenantId_status_idx" ON "e_invoice_provider_configs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_sender_units_tenantId_idx" ON "e_invoice_sender_units"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_sender_units_tenantId_status_idx" ON "e_invoice_sender_units"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_receivers_tenantId_idx" ON "e_invoice_receivers"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_receivers_tenantId_status_idx" ON "e_invoice_receivers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_documents_tenantId_idx" ON "e_invoice_documents"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_documents_tenantId_status_idx" ON "e_invoice_documents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_document_items_tenantId_idx" ON "e_invoice_document_items"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_document_items_tenantId_status_idx" ON "e_invoice_document_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_xml_archives_tenantId_idx" ON "e_invoice_xml_archives"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_xml_archives_tenantId_status_idx" ON "e_invoice_xml_archives"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_status_logs_tenantId_idx" ON "e_invoice_status_logs"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_status_logs_tenantId_status_idx" ON "e_invoice_status_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_send_attempts_tenantId_idx" ON "e_invoice_send_attempts"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_send_attempts_tenantId_status_idx" ON "e_invoice_send_attempts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_webhook_logs_tenantId_idx" ON "e_invoice_webhook_logs"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_webhook_logs_tenantId_status_idx" ON "e_invoice_webhook_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_archive_documents_tenantId_idx" ON "e_archive_documents"("tenantId");

-- CreateIndex
CREATE INDEX "e_archive_documents_tenantId_status_idx" ON "e_archive_documents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "gib_alias_records_tenantId_idx" ON "gib_alias_records"("tenantId");

-- CreateIndex
CREATE INDEX "gib_alias_records_tenantId_status_idx" ON "gib_alias_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "invoice_scenarios_status_idx" ON "invoice_scenarios"("status");

-- CreateIndex
CREATE INDEX "invoice_profiles_status_idx" ON "invoice_profiles"("status");

-- CreateIndex
CREATE INDEX "outbound_document_queues_tenantId_idx" ON "outbound_document_queues"("tenantId");

-- CreateIndex
CREATE INDEX "outbound_document_queues_tenantId_status_idx" ON "outbound_document_queues"("tenantId", "status");

-- CreateIndex
CREATE INDEX "inbound_document_records_tenantId_idx" ON "inbound_document_records"("tenantId");

-- CreateIndex
CREATE INDEX "inbound_document_records_tenantId_status_idx" ON "inbound_document_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "files_tenantId_idx" ON "files"("tenantId");

-- CreateIndex
CREATE INDEX "files_tenantId_status_idx" ON "files"("tenantId", "status");

-- CreateIndex
CREATE INDEX "file_folders_tenantId_idx" ON "file_folders"("tenantId");

-- CreateIndex
CREATE INDEX "file_folders_tenantId_status_idx" ON "file_folders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "file_access_logs_tenantId_idx" ON "file_access_logs"("tenantId");

-- CreateIndex
CREATE INDEX "file_access_logs_tenantId_status_idx" ON "file_access_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "document_tags_tenantId_idx" ON "document_tags"("tenantId");

-- CreateIndex
CREATE INDEX "document_tags_tenantId_status_idx" ON "document_tags"("tenantId", "status");

-- CreateIndex
CREATE INDEX "document_relations_tenantId_idx" ON "document_relations"("tenantId");

-- CreateIndex
CREATE INDEX "document_relations_tenantId_status_idx" ON "document_relations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_tenantId_status_idx" ON "notifications"("tenantId", "status");

-- CreateIndex
CREATE INDEX "notification_templates_tenantId_idx" ON "notification_templates"("tenantId");

-- CreateIndex
CREATE INDEX "notification_templates_tenantId_status_idx" ON "notification_templates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "notification_channels_status_idx" ON "notification_channels"("status");

-- CreateIndex
CREATE INDEX "notification_deliveries_tenantId_idx" ON "notification_deliveries"("tenantId");

-- CreateIndex
CREATE INDEX "notification_deliveries_tenantId_status_idx" ON "notification_deliveries"("tenantId", "status");

-- CreateIndex
CREATE INDEX "email_logs_tenantId_idx" ON "email_logs"("tenantId");

-- CreateIndex
CREATE INDEX "email_logs_tenantId_status_idx" ON "email_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sms_logs_tenantId_idx" ON "sms_logs"("tenantId");

-- CreateIndex
CREATE INDEX "sms_logs_tenantId_status_idx" ON "sms_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "in_app_notifications_tenantId_idx" ON "in_app_notifications"("tenantId");

-- CreateIndex
CREATE INDEX "in_app_notifications_tenantId_status_idx" ON "in_app_notifications"("tenantId", "status");

-- CreateIndex
CREATE INDEX "audit_log_items_tenantId_idx" ON "audit_log_items"("tenantId");

-- CreateIndex
CREATE INDEX "audit_log_items_tenantId_status_idx" ON "audit_log_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "security_events_tenantId_idx" ON "security_events"("tenantId");

-- CreateIndex
CREATE INDEX "security_events_tenantId_status_idx" ON "security_events"("tenantId", "status");

-- CreateIndex
CREATE INDEX "access_policies_tenantId_idx" ON "access_policies"("tenantId");

-- CreateIndex
CREATE INDEX "access_policies_tenantId_status_idx" ON "access_policies"("tenantId", "status");

-- CreateIndex
CREATE INDEX "api_access_logs_tenantId_idx" ON "api_access_logs"("tenantId");

-- CreateIndex
CREATE INDEX "api_access_logs_tenantId_status_idx" ON "api_access_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "suspicious_activity_logs_tenantId_idx" ON "suspicious_activity_logs"("tenantId");

-- CreateIndex
CREATE INDEX "suspicious_activity_logs_tenantId_status_idx" ON "suspicious_activity_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "data_export_logs_tenantId_idx" ON "data_export_logs"("tenantId");

-- CreateIndex
CREATE INDEX "data_export_logs_tenantId_status_idx" ON "data_export_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "data_deletion_logs_tenantId_idx" ON "data_deletion_logs"("tenantId");

-- CreateIndex
CREATE INDEX "data_deletion_logs_tenantId_status_idx" ON "data_deletion_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "app_settings_status_idx" ON "app_settings"("status");

-- CreateIndex
CREATE INDEX "branch_settings_tenantId_idx" ON "branch_settings"("tenantId");

-- CreateIndex
CREATE INDEX "branch_settings_tenantId_status_idx" ON "branch_settings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "pos_settings_tenantId_idx" ON "pos_settings"("tenantId");

-- CreateIndex
CREATE INDEX "pos_settings_tenantId_status_idx" ON "pos_settings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "invoice_settings_tenantId_idx" ON "invoice_settings"("tenantId");

-- CreateIndex
CREATE INDEX "invoice_settings_tenantId_status_idx" ON "invoice_settings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "e_invoice_settings_tenantId_idx" ON "e_invoice_settings"("tenantId");

-- CreateIndex
CREATE INDEX "e_invoice_settings_tenantId_status_idx" ON "e_invoice_settings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_settings_tenantId_idx" ON "payment_settings"("tenantId");

-- CreateIndex
CREATE INDEX "payment_settings_tenantId_status_idx" ON "payment_settings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "report_settings_tenantId_idx" ON "report_settings"("tenantId");

-- CreateIndex
CREATE INDEX "report_settings_tenantId_status_idx" ON "report_settings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "printer_settings_tenantId_idx" ON "printer_settings"("tenantId");

-- CreateIndex
CREATE INDEX "printer_settings_tenantId_status_idx" ON "printer_settings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ui_settings_tenantId_idx" ON "ui_settings"("tenantId");

-- CreateIndex
CREATE INDEX "ui_settings_tenantId_status_idx" ON "ui_settings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "approval_flows_tenantId_idx" ON "approval_flows"("tenantId");

-- CreateIndex
CREATE INDEX "approval_flows_tenantId_status_idx" ON "approval_flows"("tenantId", "status");

-- CreateIndex
CREATE INDEX "approval_steps_tenantId_idx" ON "approval_steps"("tenantId");

-- CreateIndex
CREATE INDEX "approval_steps_tenantId_status_idx" ON "approval_steps"("tenantId", "status");

-- CreateIndex
CREATE INDEX "approval_requests_tenantId_idx" ON "approval_requests"("tenantId");

-- CreateIndex
CREATE INDEX "approval_requests_tenantId_status_idx" ON "approval_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "approval_request_items_tenantId_idx" ON "approval_request_items"("tenantId");

-- CreateIndex
CREATE INDEX "approval_request_items_tenantId_status_idx" ON "approval_request_items"("tenantId", "status");

-- CreateIndex
CREATE INDEX "workflow_events_tenantId_idx" ON "workflow_events"("tenantId");

-- CreateIndex
CREATE INDEX "workflow_events_tenantId_status_idx" ON "workflow_events"("tenantId", "status");

-- CreateIndex
CREATE INDEX "dashboard_snapshots_tenantId_idx" ON "dashboard_snapshots"("tenantId");

-- CreateIndex
CREATE INDEX "dashboard_snapshots_tenantId_status_idx" ON "dashboard_snapshots"("tenantId", "status");

-- CreateIndex
CREATE INDEX "report_definitions_status_idx" ON "report_definitions"("status");

-- CreateIndex
CREATE INDEX "report_runs_tenantId_idx" ON "report_runs"("tenantId");

-- CreateIndex
CREATE INDEX "report_runs_tenantId_status_idx" ON "report_runs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "kpi_snapshots_tenantId_idx" ON "kpi_snapshots"("tenantId");

-- CreateIndex
CREATE INDEX "kpi_snapshots_tenantId_status_idx" ON "kpi_snapshots"("tenantId", "status");

-- CreateIndex
CREATE INDEX "daily_sales_aggregates_tenantId_idx" ON "daily_sales_aggregates"("tenantId");

-- CreateIndex
CREATE INDEX "daily_sales_aggregates_tenantId_status_idx" ON "daily_sales_aggregates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "monthly_sales_aggregates_tenantId_idx" ON "monthly_sales_aggregates"("tenantId");

-- CreateIndex
CREATE INDEX "monthly_sales_aggregates_tenantId_status_idx" ON "monthly_sales_aggregates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "stock_valuation_snapshots_tenantId_idx" ON "stock_valuation_snapshots"("tenantId");

-- CreateIndex
CREATE INDEX "stock_valuation_snapshots_tenantId_status_idx" ON "stock_valuation_snapshots"("tenantId", "status");

-- CreateIndex
CREATE INDEX "job_runs_tenantId_idx" ON "job_runs"("tenantId");

-- CreateIndex
CREATE INDEX "job_runs_tenantId_status_idx" ON "job_runs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "queue_failures_tenantId_idx" ON "queue_failures"("tenantId");

-- CreateIndex
CREATE INDEX "queue_failures_tenantId_status_idx" ON "queue_failures"("tenantId", "status");

-- CreateIndex
CREATE INDEX "integration_logs_tenantId_idx" ON "integration_logs"("tenantId");

-- CreateIndex
CREATE INDEX "integration_logs_tenantId_status_idx" ON "integration_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "external_sync_states_tenantId_idx" ON "external_sync_states"("tenantId");

-- CreateIndex
CREATE INDEX "external_sync_states_tenantId_status_idx" ON "external_sync_states"("tenantId", "status");

-- CreateIndex
CREATE INDEX "webhook_retries_tenantId_idx" ON "webhook_retries"("tenantId");

-- CreateIndex
CREATE INDEX "webhook_retries_tenantId_status_idx" ON "webhook_retries"("tenantId", "status");

-- CreateIndex
CREATE INDEX "support_tickets_tenantId_idx" ON "support_tickets"("tenantId");

-- CreateIndex
CREATE INDEX "support_tickets_tenantId_status_idx" ON "support_tickets"("tenantId", "status");

-- CreateIndex
CREATE INDEX "support_ticket_messages_tenantId_idx" ON "support_ticket_messages"("tenantId");

-- CreateIndex
CREATE INDEX "support_ticket_messages_tenantId_status_idx" ON "support_ticket_messages"("tenantId", "status");

-- CreateIndex
CREATE INDEX "support_sessions_tenantId_idx" ON "support_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "support_sessions_tenantId_status_idx" ON "support_sessions"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_module_entitlements" ADD CONSTRAINT "tenant_module_entitlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_usage_counters" ADD CONSTRAINT "tenant_usage_counters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_api_keys" ADD CONSTRAINT "tenant_api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_webhooks" ADD CONSTRAINT "tenant_webhooks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_webhook_deliveries" ADD CONSTRAINT "tenant_webhook_deliveries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_webhook_deliveries" ADD CONSTRAINT "tenant_webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "tenant_webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_brands" ADD CONSTRAINT "tenant_brands_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_status_history" ADD CONSTRAINT "tenant_status_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_locales" ADD CONSTRAINT "tenant_locales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_timezones" ADD CONSTRAINT "tenant_timezones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_feature_flags" ADD CONSTRAINT "tenant_feature_flags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usage_records" ADD CONSTRAINT "subscription_usage_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_addresses" ADD CONSTRAINT "billing_addresses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice_items" ADD CONSTRAINT "billing_invoice_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_refunds" ADD CONSTRAINT "billing_refunds_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_credit_notes" ADD CONSTRAINT "billing_credit_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_periods" ADD CONSTRAINT "trial_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_definitions" ADD CONSTRAINT "coupon_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_passwords" ADD CONSTRAINT "user_passwords_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_methods" ADD CONSTRAINT "mfa_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ip_access_logs" ADD CONSTRAINT "ip_access_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_users" ADD CONSTRAINT "branch_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_users" ADD CONSTRAINT "warehouse_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_users" ADD CONSTRAINT "register_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reps" ADD CONSTRAINT "sales_reps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_types" ADD CONSTRAINT "product_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_statuses" ADD CONSTRAINT "product_statuses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subgroups" ADD CONSTRAINT "product_subgroups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_qrcodes" ADD CONSTRAINT "product_qrcodes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag_relations" ADD CONSTRAINT "product_tag_relations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_serial_profiles" ADD CONSTRAINT "product_serial_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lot_profiles" ADD CONSTRAINT "product_lot_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_shelf_locations" ADD CONSTRAINT "product_shelf_locations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_notes" ADD CONSTRAINT "product_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_locks" ADD CONSTRAINT "product_locks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_specific_prices" ADD CONSTRAINT "customer_specific_prices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_specific_prices" ADD CONSTRAINT "supplier_specific_prices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_pricing_rules" ADD CONSTRAINT "bulk_pricing_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_rules" ADD CONSTRAINT "campaign_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_documents" ADD CONSTRAINT "inventory_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_document_items" ADD CONSTRAINT "inventory_document_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_batches" ADD CONSTRAINT "lot_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expiry_tracking_records" ADD CONSTRAINT "expiry_tracking_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_subgroups" ADD CONSTRAINT "customer_subgroups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_limits" ADD CONSTRAINT "customer_limits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_risk_profiles" ADD CONSTRAINT "customer_risk_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_balances" ADD CONSTRAINT "customer_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_statements" ADD CONSTRAINT "customer_statements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_groups" ADD CONSTRAINT "supplier_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_subgroups" ADD CONSTRAINT "supplier_subgroups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_addresses" ADD CONSTRAINT "supplier_addresses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_notes" ADD CONSTRAINT "supplier_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_limits" ADD CONSTRAINT "supplier_limits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_balances" ADD CONSTRAINT "supplier_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_statements" ADD CONSTRAINT "supplier_statements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_tags" ADD CONSTRAINT "supplier_tags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_accounts" ADD CONSTRAINT "current_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_types" ADD CONSTRAINT "current_account_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "due_schedules" ADD CONSTRAINT "due_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments_out" ADD CONSTRAINT "payments_out_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_out_items" ADD CONSTRAINT "payment_out_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item_taxes" ADD CONSTRAINT "sale_item_taxes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item_discounts" ADD CONSTRAINT "sale_item_discounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_register_sessions" ADD CONSTRAINT "sale_register_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspended_sales" ADD CONSTRAINT "suspended_sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspended_sale_items" ADD CONSTRAINT "suspended_sale_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_receipts" ADD CONSTRAINT "sale_receipts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_templates" ADD CONSTRAINT "receipt_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_events" ADD CONSTRAINT "cart_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_check_logs" ADD CONSTRAINT "price_check_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_sale_records" ADD CONSTRAINT "promo_sale_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_transactions" ADD CONSTRAINT "refund_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_records" ADD CONSTRAINT "cancellation_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancelled_cart_items" ADD CONSTRAINT "cancelled_cart_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voided_sales" ADD CONSTRAINT "voided_sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_cost_allocations" ADD CONSTRAINT "purchase_cost_allocations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_return_notes" ADD CONSTRAINT "supplier_return_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_return_items" ADD CONSTRAINT "supplier_return_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_notes" ADD CONSTRAINT "dispatch_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_note_items" ADD CONSTRAINT "dispatch_note_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_number_series" ADD CONSTRAINT "document_number_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_templates" ADD CONSTRAINT "print_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_cash_closings" ADD CONSTRAINT "daily_cash_closings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_opening_records" ADD CONSTRAINT "cash_opening_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transfer_records" ADD CONSTRAINT "cash_transfer_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_pos_devices" ADD CONSTRAINT "bank_pos_devices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_virtual_pos_profiles" ADD CONSTRAINT "bank_virtual_pos_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_groups" ADD CONSTRAINT "expense_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_documents" ADD CONSTRAINT "expense_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_provider_configs" ADD CONSTRAINT "payment_provider_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_customers" ADD CONSTRAINT "payment_customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_link_events" ADD CONSTRAINT "payment_link_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transaction_attempts" ADD CONSTRAINT "payment_transaction_attempts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_logs" ADD CONSTRAINT "payment_webhook_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_records" ADD CONSTRAINT "payout_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_provider_configs" ADD CONSTRAINT "e_invoice_provider_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_sender_units" ADD CONSTRAINT "e_invoice_sender_units_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_receivers" ADD CONSTRAINT "e_invoice_receivers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_documents" ADD CONSTRAINT "e_invoice_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_document_items" ADD CONSTRAINT "e_invoice_document_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_xml_archives" ADD CONSTRAINT "e_invoice_xml_archives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_status_logs" ADD CONSTRAINT "e_invoice_status_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_send_attempts" ADD CONSTRAINT "e_invoice_send_attempts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_webhook_logs" ADD CONSTRAINT "e_invoice_webhook_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_archive_documents" ADD CONSTRAINT "e_archive_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gib_alias_records" ADD CONSTRAINT "gib_alias_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_document_queues" ADD CONSTRAINT "outbound_document_queues_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_document_records" ADD CONSTRAINT "inbound_document_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_folders" ADD CONSTRAINT "file_folders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_access_logs" ADD CONSTRAINT "file_access_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log_items" ADD CONSTRAINT "audit_log_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_policies" ADD CONSTRAINT "access_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_access_logs" ADD CONSTRAINT "api_access_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspicious_activity_logs" ADD CONSTRAINT "suspicious_activity_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_export_logs" ADD CONSTRAINT "data_export_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_deletion_logs" ADD CONSTRAINT "data_deletion_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_settings" ADD CONSTRAINT "branch_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_settings" ADD CONSTRAINT "pos_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_settings" ADD CONSTRAINT "invoice_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_invoice_settings" ADD CONSTRAINT "e_invoice_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_settings" ADD CONSTRAINT "report_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_settings" ADD CONSTRAINT "printer_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ui_settings" ADD CONSTRAINT "ui_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request_items" ADD CONSTRAINT "approval_request_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_snapshots" ADD CONSTRAINT "dashboard_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_snapshots" ADD CONSTRAINT "kpi_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_sales_aggregates" ADD CONSTRAINT "daily_sales_aggregates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_sales_aggregates" ADD CONSTRAINT "monthly_sales_aggregates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_valuation_snapshots" ADD CONSTRAINT "stock_valuation_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_failures" ADD CONSTRAINT "queue_failures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_sync_states" ADD CONSTRAINT "external_sync_states_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_retries" ADD CONSTRAINT "webhook_retries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
