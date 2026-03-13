import { Prisma, TenantStatus } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import {
  PANEL_MODULE_CODES,
  PANEL_MODULE_LABELS,
  getPlanModuleAccess,
  mergeModuleAccessWithOverrides,
} from "@/lib/subscription/module-access";
import { cancelTenantLicense, changeSubscriptionPlan, setTenantModuleState } from "@/modules/subscription/application/subscription-service";

const assignPlanSchema = z.object({
  tenantId: z.string().min(1),
  planCode: z.enum(["starter", "standard", "professional", "enterprise", "custom"]),
  billingCycle: z.enum(["monthly", "yearly"]),
  startAt: z.string().datetime().optional(),
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
    tenantId: z.string().min(1),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("toggle_module"),
    tenantId: z.string().min(1),
    moduleCode: z.enum(PANEL_MODULE_CODES),
    isEnabled: z.boolean(),
    reason: z.string().max(500).optional(),
  }),
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizePlanCode(value: string | null | undefined) {
  return value === "starter" ||
    value === "standard" ||
    value === "professional" ||
    value === "enterprise" ||
    value === "custom"
    ? value
    : "starter";
}

export async function GET(request: NextRequest) {
  try {
    await requireFounderAccess(request);

    const tenantId = request.nextUrl.searchParams.get("tenantId")?.trim();
    const q = request.nextUrl.searchParams.get("q")?.trim();

    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
    };

    if (tenantId) {
      where.id = tenantId;
    }

    if (q) {
      where.OR = [
        { slug: { contains: q, mode: "insensitive" } },
        { legalName: { contains: q, mode: "insensitive" } },
        { tradeName: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        slug: true,
        legalName: true,
        tradeName: true,
        status: true,
        activeUntil: true,
        trialEndsAt: true,
        modules: {
          select: {
            code: true,
            isEnabled: true,
          },
        },
        TenantSubscriptions: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            code: true,
            status: true,
            payload: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return ok(
      rows.map((row) => {
        const current = row.TenantSubscriptions[0] ?? null;
        const payload = asRecord(current?.payload);
        const moduleAccess = mergeModuleAccessWithOverrides(
          getPlanModuleAccess(normalizePlanCode(current?.code)),
          row.modules,
        );

        return {
          tenantId: row.id,
          tenantSlug: row.slug,
          legalName: row.legalName,
          tradeName: row.tradeName,
          tenantStatus: row.status,
          trialEndsAt: row.trialEndsAt,
          activeUntil: row.activeUntil,
          license: current
            ? {
                subscriptionId: current.id,
                code: current.code,
                status: current.status,
                billingCycle: asText(payload.billingCycle),
                startsAt: asText(payload.startedAt),
                endsAt: asText(payload.endsAt),
                changedBy: asText(payload.changedBy),
                updatedAt: current.updatedAt,
              }
            : null,
          modules: PANEL_MODULE_CODES.map((moduleCode) => ({
            code: moduleCode,
            label: PANEL_MODULE_LABELS[moduleCode],
            isEnabled: moduleAccess[moduleCode],
          })),
        };
      }),
    );
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Lisans listesi alınamadı.", "FOUNDER_LICENSE_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = assignPlanSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Lisans atama formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: parsed.data.tenantId },
      select: { id: true, status: true },
    });

    if (!tenant) {
      return fail("Firma bulunamadı.", "DEALER_NOT_FOUND", 404);
    }

    const result = await changeSubscriptionPlan({
      tenantId: parsed.data.tenantId,
      userId: founder.sub,
      planCode: parsed.data.planCode,
      billingCycle: parsed.data.billingCycle,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
    });

    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: parsed.data.tenantId },
        data: {
          status: TenantStatus.ACTIVE,
          activeUntil: new Date(result.endsAt),
        },
      });

      await tx.tenantStatusHistory.create({
        data: {
          tenantId: parsed.data.tenantId,
          code: "tenant.license.changed",
          name: "Tenant license changed",
          status: "active",
          payload: {
            fromStatus: tenant.status,
            toStatus: TenantStatus.ACTIVE,
            planCode: parsed.data.planCode,
            billingCycle: parsed.data.billingCycle,
            changedBy: founder.email,
          },
          occurredAt: new Date(),
        },
      });
    });

    return ok(
      {
        tenantId: parsed.data.tenantId,
        ...result,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Lisans değişikliği yapılamadı.", "FOUNDER_LICENSE_CHANGE_ERROR", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Lisans işlem formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: parsed.data.tenantId },
      select: { id: true, status: true },
    });

    if (!tenant) {
      return fail("Firma bulunamadı.", "DEALER_NOT_FOUND", 404);
    }

    if (parsed.data.action === "cancel") {
      const result = await cancelTenantLicense({
        tenantId: parsed.data.tenantId,
        userId: founder.sub,
        reason: parsed.data.reason,
      });

      await prisma.$transaction(async (tx) => {
        await tx.tenant.update({
          where: { id: parsed.data.tenantId },
          data: {
            status: TenantStatus.CANCELLED,
            activeUntil: new Date(),
          },
        });

        await tx.tenantStatusHistory.create({
          data: {
            tenantId: parsed.data.tenantId,
            code: "tenant.license.cancelled",
            name: "Tenant license cancelled",
            status: "active",
            payload: {
              fromStatus: tenant.status,
              toStatus: TenantStatus.CANCELLED,
              reason: parsed.data.reason ?? null,
              changedBy: founder.email,
            },
            occurredAt: new Date(),
          },
        });
      });

      return ok({
        tenantId: parsed.data.tenantId,
        status: TenantStatus.CANCELLED,
        ...result,
      });
    }

    const moduleAccess = await setTenantModuleState({
      tenantId: parsed.data.tenantId,
      userId: founder.sub,
      moduleCode: parsed.data.moduleCode,
      isEnabled: parsed.data.isEnabled,
      reason: parsed.data.reason,
    });

    return ok({
      tenantId: parsed.data.tenantId,
      moduleCode: parsed.data.moduleCode,
      isEnabled: parsed.data.isEnabled,
      moduleAccess,
    });
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Lisans işlemi yapılamadı.", "FOUNDER_LICENSE_PATCH_ERROR", 500);
  }
}
