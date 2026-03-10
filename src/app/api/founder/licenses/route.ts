import { Prisma, TenantStatus } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { changeSubscriptionPlan } from "@/modules/subscription/application/subscription-service";

const assignPlanSchema = z.object({
  tenantId: z.string().min(1),
  planCode: z.enum(["starter", "standard", "professional", "enterprise", "custom"]),
  billingCycle: z.enum(["monthly", "yearly"]),
  startAt: z.string().datetime().optional(),
});

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
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
        };
      }),
    );
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Lisans listesi alinamadi.", "FOUNDER_LICENSE_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = assignPlanSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Lisans atama formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: parsed.data.tenantId },
      select: { id: true, status: true },
    });

    if (!tenant) {
      return fail("Bayi bulunamadi.", "DEALER_NOT_FOUND", 404);
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

    return fail("Lisans degisikligi yapilamadi.", "FOUNDER_LICENSE_CHANGE_ERROR", 500);
  }
}
