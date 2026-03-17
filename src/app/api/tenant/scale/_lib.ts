import { prisma } from "@/lib/db/prisma";
import {
  defaultScaleConnectionSettings,
  parseScaleConnectionSettings,
  type ScaleConnectionSettings,
} from "@/modules/scale/domain/scale-settings";

export const SCALE_SETTINGS_SCOPE = "scale_connection_settings";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export async function loadTenantScaleSettings(tenantId: string): Promise<ScaleConnectionSettings> {
  const row = await prisma.tenantSettings.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      code: SCALE_SETTINGS_SCOPE,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      payload: true,
    },
  });

  return parseScaleConnectionSettings(row?.payload ?? defaultScaleConnectionSettings);
}

export function mergeScaleSettings(
  base: ScaleConnectionSettings,
  overrides?: Record<string, unknown> | null,
): ScaleConnectionSettings {
  if (!overrides) {
    return base;
  }

  return parseScaleConnectionSettings({
    ...asRecord(base),
    ...asRecord(overrides),
  });
}
