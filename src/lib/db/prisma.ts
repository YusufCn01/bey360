import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

type DatabaseSourceKey =
  | "LOCAL_DATABASE_URL"
  | "CLOUD_DATABASE_URL"
  | "DATABASE_URL"
  | "NEON_DATABASE_URL"
  | "DIRECT_URL";

type ResolvedDatabaseInfo = {
  url?: string;
  source?: DatabaseSourceKey;
  host?: string;
};

function isLocalDatabaseHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  );
}

function pickDatabaseCandidates(): Array<{ source: DatabaseSourceKey; value: string }> {
  const target = (process.env.DATABASE_TARGET ?? "auto").trim().toLowerCase();

  const local = process.env.LOCAL_DATABASE_URL?.trim() ?? "";
  const cloud = process.env.CLOUD_DATABASE_URL?.trim() ?? "";
  const db = process.env.DATABASE_URL?.trim() ?? "";
  const neon = process.env.NEON_DATABASE_URL?.trim() ?? "";
  const direct = process.env.DIRECT_URL?.trim() ?? "";

  if (target === "local") {
    return [
      { source: "LOCAL_DATABASE_URL", value: local },
      { source: "DATABASE_URL", value: db },
    ];
  }

  if (target === "cloud") {
    return [
      { source: "CLOUD_DATABASE_URL", value: cloud },
      { source: "NEON_DATABASE_URL", value: neon },
      { source: "DATABASE_URL", value: db },
      { source: "DIRECT_URL", value: direct },
    ];
  }

  return [
    { source: "LOCAL_DATABASE_URL", value: local },
    { source: "DATABASE_URL", value: db },
    { source: "CLOUD_DATABASE_URL", value: cloud },
    { source: "NEON_DATABASE_URL", value: neon },
    { source: "DIRECT_URL", value: direct },
  ];
}

function resolveDatabaseInfo(): ResolvedDatabaseInfo {
  const candidate = pickDatabaseCandidates().find((entry) => entry.value.length > 0);
  const raw = candidate?.value ?? "";

  if (!raw) {
    return {};
  }

  try {
    const url = new URL(raw);
    const isLocalHost = isLocalDatabaseHost(url.hostname);
    const isLocalTarget = (process.env.DATABASE_TARGET ?? "auto").trim().toLowerCase() === "local";

    // Some managed hosts + Prisma runtime combinations fail with channel_binding.
    url.searchParams.delete("channel_binding");

    // Neon pooler connections are safer with pgbouncer mode enabled.
    const isPoolerHost = url.hostname.includes("-pooler.");
    if (isPoolerHost && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    if ((isLocalHost || isLocalTarget) && !url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "disable");
    } else if (!isLocalHost && !isLocalTarget && !url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }

    return {
      url: url.toString(),
      source: candidate?.source,
      host: url.hostname,
    };
  } catch {
    return {
      url: raw,
      source: candidate?.source,
    };
  }
}

const resolvedDatabase = resolveDatabaseInfo();
const resolvedDatabaseUrl = resolvedDatabase.url;
export const runtimeDatabaseInfo = {
  source: resolvedDatabase.source ?? "DATABASE_URL",
  host: resolvedDatabase.host ?? "",
};

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
