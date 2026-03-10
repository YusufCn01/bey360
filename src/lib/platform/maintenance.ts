import { prisma } from "@/lib/db/prisma";

const MAINTENANCE_SCOPE = "platform_maintenance";
const DEFAULT_MESSAGE = "Sistem planli bakim modundadir. Lutfen daha sonra tekrar deneyin.";

export type PlatformMaintenanceState = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
  startedAt: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export async function getPlatformMaintenanceState(): Promise<PlatformMaintenanceState> {
  // Build or CI environments can intentionally omit DATABASE_URL.
  // In that case, return a safe default instead of crashing prerender.
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim().length === 0) {
    return {
      enabled: false,
      message: DEFAULT_MESSAGE,
      updatedAt: null,
      updatedBy: null,
      startedAt: null,
    };
  }

  let row: Awaited<ReturnType<typeof prisma.appSettings.findFirst>>;
  try {
    row = await prisma.appSettings.findFirst({
      where: {
        deletedAt: null,
        code: MAINTENANCE_SCOPE,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return {
      enabled: false,
      message: DEFAULT_MESSAGE,
      updatedAt: null,
      updatedBy: null,
      startedAt: null,
    };
  }

  if (!row) {
    return {
      enabled: false,
      message: DEFAULT_MESSAGE,
      updatedAt: null,
      updatedBy: null,
      startedAt: null,
    };
  }

  const payload = asRecord(row.payload);
  const enabled = asBoolean(payload.enabled, false);
  const message = asText(payload.message) || DEFAULT_MESSAGE;
  const updatedBy = asText(payload.updatedBy) || null;
  const startedAt = asText(payload.startedAt) || null;

  return {
    enabled,
    message,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy,
    startedAt,
  };
}

export function isWriteMethod(method: string): boolean {
  const normalized = method.toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}
