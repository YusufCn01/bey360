import process from "node:process";
import { PrismaClient } from "@prisma/client";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Eksik ortam degiskeni: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function requireDatabaseUrl() {
  const fromDatabaseUrl = optionalEnv("DATABASE_URL");
  if (fromDatabaseUrl) {
    return fromDatabaseUrl;
  }

  const fromNeon = optionalEnv("NEON_DATABASE_URL");
  if (fromNeon) {
    process.env.DATABASE_URL = fromNeon;
    return fromNeon;
  }

  const fromDirect = optionalEnv("DIRECT_URL");
  if (fromDirect) {
    process.env.DATABASE_URL = fromDirect;
    return fromDirect;
  }

  throw new Error("Eksik ortam degiskeni: DATABASE_URL (veya NEON_DATABASE_URL / DIRECT_URL)");
}

async function main() {
  requireDatabaseUrl();
  requiredEnv("APP_URL");
  requiredEnv("APP_SECRET");

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;

    const activeTenants = await prisma.tenant.findMany({
      where: {
        deletedAt: null,
        status: {
          in: ["TRIALING", "ACTIVE", "PAST_DUE"],
        },
      },
      select: {
        id: true,
        slug: true,
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    if (activeTenants.length === 0) {
      throw new Error("Aktif tenant bulunamadi. En az bir tenant olusturulmadan yayin alinmaz.");
    }

    const defaultTenantSlug = optionalEnv("DEFAULT_TENANT_SLUG");
    if (defaultTenantSlug) {
      const exists = activeTenants.some((row) => row.slug === defaultTenantSlug);
      if (!exists) {
        throw new Error(`DEFAULT_TENANT_SLUG gecersiz: ${defaultTenantSlug}`);
      }
    } else if (activeTenants.length > 1) {
      console.warn(
        "[uyari] DEFAULT_TENANT_SLUG tanimli degil ve birden fazla aktif tenant var. Koken domainde tenant secimi belirsiz olabilir.",
      );
    }

    console.log("[ok] Deploy on-kontrol basarili");
    console.log(`[ok] Aktif tenant sayisi: ${activeTenants.length}`);
    if (defaultTenantSlug) {
      console.log(`[ok] Varsayilan tenant: ${defaultTenantSlug}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[hata] deploy-check basarisiz:", error instanceof Error ? error.message : error);
  process.exit(1);
});
