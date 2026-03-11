import { z } from "zod";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

const kindSchema = z.enum(["branch", "warehouse"]);

const createUnitSchema = z.object({
  kind: kindSchema,
  code: z.string().trim().min(1).max(100).optional(),
  name: z.string().trim().min(2).max(255),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["active", "passive"]).default("active"),
  branchId: z.string().trim().min(1).max(191).optional(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
});

const updateUnitSchema = z.object({
  id: z.string().trim().min(1),
  kind: kindSchema,
  code: z.string().trim().min(1).max(100).optional(),
  name: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["active", "passive"]).optional(),
  branchId: z.string().trim().min(1).max(191).optional(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  deleted: z.boolean().optional(),
});

type OrgKind = z.infer<typeof kindSchema>;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function toPayload(data: {
  kind: OrgKind;
  branchId?: string;
  address?: string;
  phone?: string;
}): Prisma.InputJsonValue {
  return {
    kind: data.kind,
    ...(data.branchId ? { branchId: data.branchId } : {}),
    ...(data.address ? { address: data.address } : {}),
    ...(data.phone ? { phone: data.phone } : {}),
  } as Prisma.InputJsonValue;
}

function mapRowWithPayload(row: {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  status: string;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  const payload = asRecord(row.payload);
  return {
    id: row.id,
    code: row.code ?? "",
    name: row.name ?? "",
    description: row.description ?? "",
    status: row.status,
    branchId: asText(payload.branchId),
    address: asText(payload.address),
    phone: asText(payload.phone),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

async function buildNextCode(tenantId: string, kind: OrgKind): Promise<string> {
  const prefix = kind === "branch" ? "SUBE" : "DEPO";
  const rows =
    kind === "branch"
      ? await prisma.branches.findMany({
          where: { tenantId, deletedAt: null },
          select: { code: true },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : await prisma.warehouses.findMany({
          where: { tenantId, deletedAt: null },
          select: { code: true },
          orderBy: { createdAt: "desc" },
          take: 200,
        });

  const used = new Set(
    rows
      .map((row) => asText(row.code).toUpperCase())
      .filter(Boolean),
  );

  for (let index = 1; index <= 9999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(3, "0")}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const kindResult = kindSchema.safeParse(request.nextUrl.searchParams.get("kind"));
    if (!kindResult.success) {
      return fail("Tur bilgisi gecersiz. kind=branch veya kind=warehouse olmalidir.", "VALIDATION_ERROR", 422);
    }

    const q = request.nextUrl.searchParams.get("q")?.trim().toLocaleLowerCase("tr") ?? "";
    const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "1";
    const branchId = request.nextUrl.searchParams.get("branchId")?.trim() ?? "";
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "200"), 1), 500);

    if (kindResult.data === "branch") {
      const rows = await prisma.branches.findMany({
        where: {
          tenantId: access.tenantId,
          ...(includeDeleted ? {} : { deletedAt: null }),
        },
        orderBy: [{ createdAt: "desc" }],
        take: limit,
      });

      const mapped = rows
        .map((row) => mapRowWithPayload(row))
        .filter((row) => {
          if (!q) {
            return true;
          }
          const target = `${row.code} ${row.name} ${row.description}`.toLocaleLowerCase("tr");
          return target.includes(q);
        });

      return ok(mapped);
    }

    const rows = await prisma.warehouses.findMany({
      where: {
        tenantId: access.tenantId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });

    const mapped = rows
      .map((row) => mapRowWithPayload(row))
      .filter((row) => (branchId ? row.branchId === branchId : true))
      .filter((row) => {
        if (!q) {
          return true;
        }
        const target = `${row.code} ${row.name} ${row.description} ${row.branchId}`.toLocaleLowerCase("tr");
        return target.includes(q);
      });

    return ok(mapped);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Sube/depo listesi alinamadi.", "ORG_UNITS_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const parsed = createUnitSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Sube/depo formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const normalizedCode =
      parsed.data.code && parsed.data.code.length > 0
        ? parsed.data.code.toUpperCase()
        : await buildNextCode(access.tenantId, parsed.data.kind);
    const now = new Date();

    const payload = toPayload({
      kind: parsed.data.kind,
      branchId: parsed.data.branchId,
      address: parsed.data.address,
      phone: parsed.data.phone,
    });

    const created =
      parsed.data.kind === "branch"
        ? await prisma.branches.create({
            data: {
              tenantId: access.tenantId,
              code: normalizedCode,
              name: parsed.data.name,
              description: parsed.data.description,
              status: parsed.data.status,
              payload,
              occurredAt: now,
            },
          })
        : await prisma.warehouses.create({
            data: {
              tenantId: access.tenantId,
              code: normalizedCode,
              name: parsed.data.name,
              description: parsed.data.description,
              status: parsed.data.status,
              payload,
              occurredAt: now,
            },
          });

    await prisma.auditLog.create({
      data: {
        tenantId: access.tenantId,
        userId: access.userId,
        module: "organization",
        entityName: parsed.data.kind,
        entityId: created.id,
        action: `${parsed.data.kind}.created`,
        ipAddress: resolveIpAddress(request) ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
        payload: {
          code: normalizedCode,
          name: parsed.data.name,
          status: parsed.data.status,
        },
      },
    });

    return ok(mapRowWithPayload(created), { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Sube/depo kaydi olusturulamadi.", "ORG_UNITS_CREATE_ERROR", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const parsed = updateUnitSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Sube/depo guncelleme verisi gecersiz.", "VALIDATION_ERROR", 422);
    }

    const payloadUpdates = {
      ...(parsed.data.branchId !== undefined ? { branchId: parsed.data.branchId } : {}),
      ...(parsed.data.address !== undefined ? { address: parsed.data.address } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
    };

    const existing =
      parsed.data.kind === "branch"
        ? await prisma.branches.findFirst({
            where: {
              id: parsed.data.id,
              tenantId: access.tenantId,
            },
          })
        : await prisma.warehouses.findFirst({
            where: {
              id: parsed.data.id,
              tenantId: access.tenantId,
            },
          });

    if (!existing) {
      return fail("Kayit bulunamadi.", "ORG_UNITS_NOT_FOUND", 404);
    }

    const currentPayload = asRecord(existing.payload);
    const nextPayload = {
      ...currentPayload,
      ...payloadUpdates,
    } as Prisma.InputJsonValue;

    const updated =
      parsed.data.kind === "branch"
        ? await prisma.branches.update({
            where: { id: existing.id },
            data: {
              ...(parsed.data.code !== undefined ? { code: parsed.data.code.toUpperCase() } : {}),
              ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
              ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
              ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
              ...(Object.keys(payloadUpdates).length > 0 ? { payload: nextPayload } : {}),
              ...(parsed.data.deleted !== undefined
                ? { deletedAt: parsed.data.deleted ? new Date() : null }
                : {}),
              occurredAt: new Date(),
            },
          })
        : await prisma.warehouses.update({
            where: { id: existing.id },
            data: {
              ...(parsed.data.code !== undefined ? { code: parsed.data.code.toUpperCase() } : {}),
              ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
              ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
              ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
              ...(Object.keys(payloadUpdates).length > 0 ? { payload: nextPayload } : {}),
              ...(parsed.data.deleted !== undefined
                ? { deletedAt: parsed.data.deleted ? new Date() : null }
                : {}),
              occurredAt: new Date(),
            },
          });

    await prisma.auditLog.create({
      data: {
        tenantId: access.tenantId,
        userId: access.userId,
        module: "organization",
        entityName: parsed.data.kind,
        entityId: updated.id,
        action: `${parsed.data.kind}.updated`,
        ipAddress: resolveIpAddress(request) ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
        payload: {
          code: updated.code,
          name: updated.name,
          status: updated.status,
          deletedAt: updated.deletedAt,
        },
      },
    });

    return ok(mapRowWithPayload(updated));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Sube/depo kaydi guncellenemedi.", "ORG_UNITS_UPDATE_ERROR", 500);
  }
}
