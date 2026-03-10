import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

const saveSettingsSchema = z.object({
  scope: z.string().min(2).max(100),
  payload: z.record(z.string(), z.unknown()),
});

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function resolveIpAddress(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip");
}

function collectChangedKeys(previousPayload: Record<string, unknown>, nextPayload: Record<string, unknown>): string[] {
  const keys = new Set<string>([...Object.keys(previousPayload), ...Object.keys(nextPayload)]);
  const changed: string[] = [];

  for (const key of keys) {
    const prev = previousPayload[key];
    const next = nextPayload[key];
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      changed.push(key);
    }
  }

  return changed.sort((a, b) => a.localeCompare(b, "tr"));
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const scope = request.nextUrl.searchParams.get("scope");
    if (!scope) {
      return fail("Ayar kapsamı zorunludur.", "VALIDATION_ERROR", 422);
    }

    const row = await prisma.tenantSettings.findFirst({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        code: scope,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(
      row
        ? {
            id: row.id,
            scope: row.code ?? scope,
            payload: row.payload ?? {},
            updatedAt: row.updatedAt,
          }
        : {
            id: null,
            scope,
            payload: {},
            updatedAt: null,
          },
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Ayar verisi alınırken hata oluştu.", "SETTINGS_READ_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const parsed = saveSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Ayar formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const now = new Date();
    const existing = await prisma.tenantSettings.findFirst({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        code: parsed.data.scope,
      },
      orderBy: { createdAt: "desc" },
    });

    const payload = parsed.data.payload as Prisma.InputJsonValue;
    const previousPayload = asRecord(existing?.payload);
    const nextPayload = asRecord(parsed.data.payload);
    const changedKeys = collectChangedKeys(previousPayload, nextPayload);
    const ipAddress = resolveIpAddress(request);
    const userAgent = request.headers.get("user-agent");

    const row = await prisma.$transaction(async (tx) => {
      const savedRow = existing
        ? await tx.tenantSettings.update({
            where: { id: existing.id },
            data: {
              payload,
              occurredAt: now,
              name: parsed.data.scope,
            },
          })
        : await tx.tenantSettings.create({
            data: {
              tenantId: access.tenantId,
              code: parsed.data.scope,
              name: parsed.data.scope,
              status: "active",
              payload,
              occurredAt: now,
            },
          });

      await tx.auditLog.create({
        data: {
          tenantId: access.tenantId,
          userId: access.userId,
          module: "settings",
          entityName: "tenant_settings",
          entityId: parsed.data.scope,
          action: existing ? "settings.updated" : "settings.created",
          ipAddress: ipAddress ?? undefined,
          userAgent: userAgent ?? undefined,
          payload: {
            scope: parsed.data.scope,
            changedKeys,
            previousKeyCount: Object.keys(previousPayload).length,
            nextKeyCount: Object.keys(nextPayload).length,
          },
        },
      });

      return savedRow;
    });

    return ok({
      id: row.id,
      scope: row.code ?? parsed.data.scope,
      payload: row.payload ?? {},
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Ayar kaydedilirken hata oluştu.", "SETTINGS_SAVE_ERROR", 500);
  }
}
