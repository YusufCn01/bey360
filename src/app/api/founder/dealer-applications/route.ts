import { Prisma, TenantStatus } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import {
  parseDealerApplicationPayload,
  parseDealerApplicationStatus,
  slugifyForTenant,
  type DealerApplicationStatus,
} from "@/lib/platform/dealer-application";
import { isUniqueError, provisionDealerTenant } from "@/lib/platform/dealer-provisioning";

const actionSchema = z.object({
  applicationId: z.string().min(1),
  action: z.enum(["review", "reject", "approve"]),
  comment: z.string().max(600).optional(),
  createDealer: z.boolean().default(true),
  preferredSlug: z.string().max(80).optional(),
  ownerPassword: z.string().min(8).max(128).optional(),
  tenantStatus: z.nativeEnum(TenantStatus).default(TenantStatus.TRIALING),
  trialDays: z.coerce.number().int().min(1).max(365).default(14),
  planCode: z.enum(["starter", "standard", "professional", "enterprise", "custom"]).default("starter"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

function statusMeta(status: DealerApplicationStatus): { label: string; className: string } {
  switch (status) {
    case "pending":
      return { label: "Yeni", className: "pending" };
    case "reviewing":
      return { label: "İncelemede", className: "reviewing" };
    case "approved":
      return { label: "Onaylandı", className: "approved" };
    case "rejected":
      return { label: "Reddedildi", className: "rejected" };
    default:
      return { label: status, className: "pending" };
  }
}

function mapApplicationRow(row: {
  id: string;
  externalId: string | null;
  status: string;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const payload = parseDealerApplicationPayload(row.payload);
  const status = parseDealerApplicationStatus(row.status);
  const statusInfo = statusMeta(status);
  return {
    id: row.id,
    applicationNumber: row.externalId || row.id,
    status,
    statusLabel: statusInfo.label,
    statusClass: statusInfo.className,
    companyName: payload.companyName,
    tradeName: payload.tradeName,
    taxNumber: payload.taxNumber,
    contactName: `${payload.contactFirstName} ${payload.contactLastName}`.trim(),
    contactTitle: payload.contactTitle,
    phone: payload.phone,
    email: payload.email,
    city: payload.city,
    district: payload.district,
    address: payload.address,
    note: payload.note,
    requestedPlan: payload.requestedPlan,
    branchCount: payload.branchCount,
    monthlySalesTarget: payload.monthlySalesTarget,
    submittedAt: payload.submittedAt || row.createdAt.toISOString(),
    source: payload.source,
    tenantId: payload.tenantId ?? null,
    tenantSlug: payload.tenantSlug ?? null,
    ownerEmail: payload.ownerEmail ?? null,
    timeline: payload.timeline,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function nextStatusByAction(action: "review" | "reject" | "approve"): DealerApplicationStatus {
  if (action === "review") {
    return "reviewing";
  }
  if (action === "reject") {
    return "rejected";
  }
  return "approved";
}

export async function GET(request: NextRequest) {
  try {
    await requireFounderAccess(request);

    const statusFilter = request.nextUrl.searchParams.get("status");
    const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "250"), 1), 500);

    const where: Prisma.AppSettingsWhereInput = {
      deletedAt: null,
      code: "dealer_application",
    };
    if (statusFilter && ["pending", "reviewing", "approved", "rejected"].includes(statusFilter)) {
      where.status = statusFilter;
    }

    const rows = await prisma.appSettings.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        externalId: true,
        status: true,
        payload: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const mapped = rows.map((row) => mapApplicationRow(row));
    const filtered = query
      ? mapped.filter((item) => {
          const haystack = [
            item.applicationNumber,
            item.companyName,
            item.tradeName || "",
            item.taxNumber,
            item.contactName,
            item.phone,
            item.email,
            item.city,
            item.district || "",
            item.statusLabel,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      : mapped;

    const summary = filtered.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        if (!item.tenantId && item.status !== "rejected") {
          acc.waitingProvision += 1;
        }
        return acc;
      },
      {
        total: 0,
        pending: 0,
        reviewing: 0,
        approved: 0,
        rejected: 0,
        waitingProvision: 0,
      },
    );

    return ok({
      rows: filtered,
      summary,
    });
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Bayi başvuruları alınamadı.", "FOUNDER_DEALER_APPLICATIONS_LIST_ERROR", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Başvuru işlem formu geçersiz.", "VALIDATION_ERROR", 422);
    }
    const input = parsed.data;

    const row = await prisma.appSettings.findFirst({
      where: {
        id: input.applicationId,
        code: "dealer_application",
        deletedAt: null,
      },
      select: {
        id: true,
        externalId: true,
        status: true,
        payload: true,
        createdAt: true,
      },
    });
    if (!row) {
      return fail("Bayi başvurusu bulunamadı.", "APPLICATION_NOT_FOUND", 404);
    }

    const payload = parseDealerApplicationPayload(row.payload);
    if (!payload.companyName || !payload.taxNumber || !payload.email || !payload.contactFirstName || !payload.contactLastName) {
      return fail("Başvuru içeriği eksik olduğu için işlem yapılamadı.", "APPLICATION_PAYLOAD_INVALID", 422);
    }

    const nextStatus = nextStatusByAction(input.action);
    const now = new Date();
    const timeline = [
      ...payload.timeline,
      {
        status: nextStatus,
        at: now.toISOString(),
        by: founder.email,
        note: input.comment?.trim() || null,
      },
    ];

    const nextPayload = {
      ...payload,
      timeline,
      lastAction: {
        action: input.action,
        by: founder.email,
        at: now.toISOString(),
        note: input.comment?.trim() || null,
      },
    };

    let provisionResult:
      | {
          tenantId: string;
          tenantSlug: string;
          ownerEmail: string;
          generatedPassword: string | null;
          planCode: string | null;
        }
      | null = null;

    if (input.action === "approve" && input.createDealer) {
      if (!payload.tenantId) {
        const existingTenant = await prisma.tenant.findUnique({
          where: { taxNumber: payload.taxNumber },
          select: { id: true, slug: true },
        });
        if (existingTenant) {
          return fail("Bu vergi numarasıyla kayıtlı bayi zaten mevcut.", "DEALER_ALREADY_EXISTS", 409);
        }

        const preferredSlug = input.preferredSlug?.trim() || slugifyForTenant(payload.tradeName || payload.companyName);
        const created = await provisionDealerTenant({
          legalName: payload.companyName,
          tradeName: payload.tradeName,
          taxNumber: payload.taxNumber,
          ownerEmail: payload.email,
          ownerFirstName: payload.contactFirstName,
          ownerLastName: payload.contactLastName,
          ownerPhone: payload.phone,
          ownerPassword: input.ownerPassword,
          preferredSlug,
          status: input.tenantStatus,
          trialDays: input.trialDays,
          autoAssignPlan: true,
          planCode: input.planCode,
          billingCycle: input.billingCycle,
          actorUserId: founder.sub,
          actorEmail: founder.email,
          statusReasonCode: "tenant.application.approved",
        });

        nextPayload.tenantId = created.tenantId;
        nextPayload.tenantSlug = created.tenantSlug;
        nextPayload.ownerEmail = created.ownerEmail;
        if (created.generatedPassword) {
          nextPayload.ownerPasswordGeneratedAt = now.toISOString();
        }

        provisionResult = {
          tenantId: created.tenantId,
          tenantSlug: created.tenantSlug,
          ownerEmail: created.ownerEmail,
          generatedPassword: created.generatedPassword,
          planCode: created.assignedPlan?.planCode ?? null,
        };
      } else {
        provisionResult = {
          tenantId: payload.tenantId,
          tenantSlug: payload.tenantSlug || "-",
          ownerEmail: payload.ownerEmail || payload.email,
          generatedPassword: null,
          planCode: input.planCode,
        };
      }
    }

    const updated = await prisma.appSettings.update({
      where: { id: row.id },
      data: {
        status: nextStatus,
        payload: nextPayload as Prisma.InputJsonValue,
        occurredAt: now,
      },
      select: {
        id: true,
        externalId: true,
        status: true,
        payload: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok({
      item: mapApplicationRow(updated),
      provision: provisionResult,
    });
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    if (isUniqueError(error)) {
      return fail("Bayi oluşturma sırasında benzersiz alan çakışması oluştu.", "UNIQUE_CONSTRAINT", 409);
    }

    return fail("Bayi başvurusu güncellenemedi.", "FOUNDER_DEALER_APPLICATION_ACTION_ERROR", 500);
  }
}
