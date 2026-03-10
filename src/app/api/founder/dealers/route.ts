import { Prisma, RoleScope, TenantStatus, UserStatus } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { hashPassword } from "@/lib/security/password";
import { changeSubscriptionPlan } from "@/modules/subscription/application/subscription-service";

const nullableDateSchema = z.union([z.string().datetime(), z.null()]);

const createDealerSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug sadece kucuk harf, rakam ve tire icerebilir."),
  legalName: z.string().min(2).max(255),
  tradeName: z.string().max(255).optional(),
  taxNumber: z.string().min(8).max(20),
  ownerEmail: z.string().email(),
  ownerFirstName: z.string().min(2).max(80),
  ownerLastName: z.string().min(2).max(80),
  ownerPassword: z.string().min(8).max(128),
  locale: z.string().min(2).max(10).default("tr-TR"),
  timezone: z.string().min(2).max(100).default("Europe/Istanbul"),
  currency: z.string().length(3).default("TRY"),
  status: z.nativeEnum(TenantStatus).default(TenantStatus.ACTIVE),
  trialDays: z.coerce.number().int().min(1).max(365).default(14),
  autoAssignPlan: z.boolean().default(true),
  planCode: z.enum(["starter", "standard", "professional", "enterprise", "custom"]).default("starter"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

const updateDealerSchema = z
  .object({
    tenantId: z.string().min(1),
    status: z.nativeEnum(TenantStatus).optional(),
    legalName: z.string().min(2).max(255).optional(),
    tradeName: z.union([z.string().max(255), z.null()]).optional(),
    locale: z.string().min(2).max(10).optional(),
    timezone: z.string().min(2).max(100).optional(),
    currency: z.string().length(3).optional(),
    trialEndsAt: nullableDateSchema.optional(),
    activeUntil: nullableDateSchema.optional(),
    note: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    const hasAnyField =
      value.status !== undefined ||
      value.legalName !== undefined ||
      value.tradeName !== undefined ||
      value.locale !== undefined ||
      value.timezone !== undefined ||
      value.currency !== undefined ||
      value.trialEndsAt !== undefined ||
      value.activeUntil !== undefined ||
      value.note !== undefined;

    if (!hasAnyField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guncelleme icin en az bir alan gondermelisiniz.",
      });
    }
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

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseNullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  return new Date(value);
}

async function syncInitialUpdateFeedForTenant(tenantId: string) {
  const row = await prisma.appSettings.findFirst({
    where: {
      deletedAt: null,
      code: "platform_updates",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!row || !row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) {
    return;
  }

  const payload = row.payload as Record<string, unknown>;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const now = new Date();

  const tenantItems = items
    .map((item) => (typeof item === "object" && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : null))
    .filter((item): item is Record<string, unknown> => item !== null)
    .filter((item) => {
      const targetScope = asText(item.targetScope);
      if (targetScope === "selected") {
        const tenantIds = Array.isArray(item.tenantIds)
          ? item.tenantIds.filter((x): x is string => typeof x === "string")
          : [];
        if (!tenantIds.includes(tenantId)) {
          return false;
        }
      }

      if (!asBoolean(item.isActive, true)) {
        return false;
      }

      const publishAt = asText(item.publishAt);
      if (publishAt) {
        const publishDate = new Date(publishAt);
        if (!Number.isNaN(publishDate.getTime()) && publishDate > now) {
          return false;
        }
      }

      const expiresAt = asText(item.expiresAt);
      if (expiresAt) {
        const expiresDate = new Date(expiresAt);
        if (!Number.isNaN(expiresDate.getTime()) && expiresDate < now) {
          return false;
        }
      }

      return true;
    });

  await prisma.tenantSettings.create({
    data: {
      tenantId,
      code: "sistem_guncelleme",
      name: "Sistem Guncelleme",
      status: "active",
      payload: {
        items: tenantItems,
      } as Prisma.InputJsonValue,
      occurredAt: now,
    },
  });
}

function isPrismaUniqueError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (error as { code?: string }).code === "P2002";
}

export async function GET(request: NextRequest) {
  try {
    await requireFounderAccess(request);

    const q = request.nextUrl.searchParams.get("q")?.trim();
    const statusRaw = request.nextUrl.searchParams.get("status");
    const statusParsed = statusRaw ? z.nativeEnum(TenantStatus).safeParse(statusRaw) : null;

    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
    };

    if (statusParsed?.success) {
      where.status = statusParsed.data;
    }

    if (q) {
      where.OR = [
        { slug: { contains: q, mode: "insensitive" } },
        { legalName: { contains: q, mode: "insensitive" } },
        { tradeName: { contains: q, mode: "insensitive" } },
        { taxNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 400,
      select: {
        id: true,
        slug: true,
        legalName: true,
        tradeName: true,
        taxNumber: true,
        locale: true,
        timezone: true,
        currency: true,
        status: true,
        trialEndsAt: true,
        activeUntil: true,
        createdAt: true,
        updatedAt: true,
        users: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true,
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
          },
        },
        _count: {
          select: {
            users: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return ok(
      tenants.map((tenant) => {
        const subscription = tenant.TenantSubscriptions[0] ?? null;
        const payload = asRecord(subscription?.payload);

        return {
          id: tenant.id,
          slug: tenant.slug,
          legalName: tenant.legalName,
          tradeName: tenant.tradeName,
          taxNumber: tenant.taxNumber,
          locale: tenant.locale,
          timezone: tenant.timezone,
          currency: tenant.currency,
          status: tenant.status,
          trialEndsAt: tenant.trialEndsAt,
          activeUntil: tenant.activeUntil,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
          owner: tenant.users[0]
            ? {
                id: tenant.users[0].id,
                email: tenant.users[0].email,
                fullName: `${tenant.users[0].firstName} ${tenant.users[0].lastName}`.trim(),
                status: tenant.users[0].status,
              }
            : null,
          currentPlan: subscription
            ? {
                id: subscription.id,
                code: subscription.code,
                status: subscription.status,
                billingCycle: asText(payload.billingCycle),
                startsAt: asText(payload.startedAt),
                endsAt: asText(payload.endsAt),
              }
            : null,
          userCount: tenant._count.users,
        };
      }),
    );
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Bayi listesi alinamadi.", "FOUNDER_DEALERS_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = createDealerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Bayi formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const input = parsed.data;
    const trialEndsAt =
      input.status === TenantStatus.TRIALING
        ? new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000)
        : null;

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: input.slug,
          legalName: input.legalName,
          tradeName: input.tradeName?.trim() || null,
          taxNumber: input.taxNumber,
          locale: input.locale,
          timezone: input.timezone,
          currency: input.currency.toUpperCase(),
          status: input.status,
          trialEndsAt,
          activeUntil: null,
        },
      });

      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          code: "tenant-owner",
          name: "Tenant Owner",
          scope: RoleScope.TENANT,
          isSystem: true,
        },
      });

      const permissions = await tx.permission.findMany({
        select: { id: true },
      });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: ownerRole.id,
            permissionId: permission.id,
            contextKey: "global",
          })),
          skipDuplicates: true,
        });
      }

      const ownerUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.ownerEmail.toLowerCase(),
          username: input.ownerEmail.split("@")[0],
          firstName: input.ownerFirstName,
          lastName: input.ownerLastName,
          passwordHash: await hashPassword(input.ownerPassword),
          status: UserStatus.ACTIVE,
        },
      });

      await tx.userRole.create({
        data: {
          userId: ownerUser.id,
          roleId: ownerRole.id,
          assignedBy: founder.sub,
        },
      });

      await tx.tenantModule.upsert({
        where: {
          tenantId_code: {
            tenantId: tenant.id,
            code: "pos",
          },
        },
        update: {
          name: "POS",
          isEnabled: true,
        },
        create: {
          tenantId: tenant.id,
          code: "pos",
          name: "POS",
          isEnabled: true,
        },
      });

      await tx.tenantStatusHistory.create({
        data: {
          tenantId: tenant.id,
          code: "tenant.created",
          name: "Tenant created",
          status: "active",
          payload: {
            status: tenant.status,
            createdBy: founder.email,
          },
          occurredAt: new Date(),
        },
      });

      return {
        tenantId: tenant.id,
      };
    });

    let planResult: Awaited<ReturnType<typeof changeSubscriptionPlan>> | null = null;
    if (input.autoAssignPlan) {
      planResult = await changeSubscriptionPlan({
        tenantId: created.tenantId,
        userId: founder.sub,
        planCode: input.planCode,
        billingCycle: input.billingCycle,
      });

      await prisma.tenant.update({
        where: { id: created.tenantId },
        data: {
          activeUntil: new Date(planResult.endsAt),
          status: input.status === TenantStatus.TRIALING ? TenantStatus.TRIALING : TenantStatus.ACTIVE,
        },
      });
    }

    await syncInitialUpdateFeedForTenant(created.tenantId);

    const tenant = await prisma.tenant.findUnique({
      where: { id: created.tenantId },
      select: {
        id: true,
        slug: true,
        legalName: true,
        tradeName: true,
        status: true,
        trialEndsAt: true,
        activeUntil: true,
      },
    });

    return ok(
      {
        tenant,
        assignedPlan: planResult,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    if (isPrismaUniqueError(error)) {
      return fail("Slug, vergi numarasi veya e-posta zaten kayitli.", "UNIQUE_CONSTRAINT", 409);
    }

    return fail("Bayi olusturulamadi.", "FOUNDER_DEALER_CREATE_ERROR", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = updateDealerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Bayi guncelleme formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const input = parsed.data;
    const tenant = await prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!tenant) {
      return fail("Bayi bulunamadi.", "DEALER_NOT_FOUND", 404);
    }

    const updateData: Prisma.TenantUpdateInput = {};
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.legalName !== undefined) {
      updateData.legalName = input.legalName;
    }
    if (input.tradeName !== undefined) {
      updateData.tradeName = input.tradeName;
    }
    if (input.locale !== undefined) {
      updateData.locale = input.locale;
    }
    if (input.timezone !== undefined) {
      updateData.timezone = input.timezone;
    }
    if (input.currency !== undefined) {
      updateData.currency = input.currency.toUpperCase();
    }

    const trialEndsAt = parseNullableDate(input.trialEndsAt);
    if (trialEndsAt !== undefined) {
      updateData.trialEndsAt = trialEndsAt;
    }

    const activeUntil = parseNullableDate(input.activeUntil);
    if (activeUntil !== undefined) {
      updateData.activeUntil = activeUntil;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextTenant = await tx.tenant.update({
        where: { id: input.tenantId },
        data: updateData,
        select: {
          id: true,
          slug: true,
          legalName: true,
          tradeName: true,
          taxNumber: true,
          locale: true,
          timezone: true,
          currency: true,
          status: true,
          trialEndsAt: true,
          activeUntil: true,
          updatedAt: true,
        },
      });

      if (input.status !== undefined && input.status !== tenant.status) {
        await tx.tenantStatusHistory.create({
          data: {
            tenantId: input.tenantId,
            code: "tenant.status.changed",
            name: "Tenant status changed",
            status: "active",
            payload: {
              from: tenant.status,
              to: input.status,
              note: input.note ?? null,
              changedBy: founder.email,
            },
            occurredAt: new Date(),
          },
        });
      }

      return nextTenant;
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    if (isPrismaUniqueError(error)) {
      return fail("Guncellenen alanlardan biri baska bir kayitta kullaniliyor.", "UNIQUE_CONSTRAINT", 409);
    }

    return fail("Bayi guncellenemedi.", "FOUNDER_DEALER_UPDATE_ERROR", 500);
  }
}
