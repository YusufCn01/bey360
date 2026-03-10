import { z } from "zod";
import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { getPlatformMaintenanceState } from "@/lib/platform/maintenance";

const updateSchema = z.object({
  enabled: z.boolean(),
  message: z.string().min(6).max(400).optional(),
});

const MAINTENANCE_SCOPE = "platform_maintenance";
const DEFAULT_MESSAGE = "Sistem planli bakim modundadir. Lutfen daha sonra tekrar deneyin.";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    await requireFounderAccess(request);
    return ok(await getPlatformMaintenanceState());
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Bakim modu bilgisi alinamadi.", "FOUNDER_MAINTENANCE_READ_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Bakim modu formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const existing = await prisma.appSettings.findFirst({
      where: {
        deletedAt: null,
        code: MAINTENANCE_SCOPE,
      },
      orderBy: { createdAt: "desc" },
    });

    const previousPayload = asRecord(existing?.payload);
    const nextMessage = parsed.data.message?.trim() || (previousPayload.message as string) || DEFAULT_MESSAGE;
    const startedAt =
      parsed.data.enabled && !(previousPayload.enabled === true)
        ? new Date().toISOString()
        : (previousPayload.startedAt as string) || null;

    const payload = {
      enabled: parsed.data.enabled,
      message: nextMessage,
      updatedBy: founder.email,
      startedAt: parsed.data.enabled ? startedAt : null,
    };

    if (existing) {
      await prisma.appSettings.update({
        where: { id: existing.id },
        data: {
          payload,
          occurredAt: new Date(),
        },
      });
    } else {
      await prisma.appSettings.create({
        data: {
          code: MAINTENANCE_SCOPE,
          name: "Platform Maintenance",
          status: "active",
          payload,
          occurredAt: new Date(),
        },
      });
    }

    return ok(await getPlatformMaintenanceState());
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Bakim modu guncellenemedi.", "FOUNDER_MAINTENANCE_UPDATE_ERROR", 500);
  }
}
