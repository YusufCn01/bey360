import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function resolveDatabaseUrl(): string | undefined {
  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    "";

  if (!raw) {
    return undefined;
  }

  try {
    const url = new URL(raw);

    // Some managed hosts + Prisma runtime combinations fail with channel_binding.
    url.searchParams.delete("channel_binding");

    // Neon pooler connections are safer with pgbouncer mode enabled.
    const isPoolerHost = url.hostname.includes("-pooler.");
    if (isPoolerHost && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }

    return url.toString();
  } catch {
    return raw;
  }
}

const resolvedDatabaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
    ...(resolvedDatabaseUrl
      ? {
          datasources: {
            db: {
              url: resolvedDatabaseUrl,
            },
          },
        }
      : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
