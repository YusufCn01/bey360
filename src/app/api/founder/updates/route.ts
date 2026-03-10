import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

const PLATFORM_UPDATES_SCOPE = "platform_updates";
const TENANT_UPDATES_SCOPE = "sistem_guncelleme";

type UpdateTargetScope = "all" | "selected";

type PlatformUpdateItem = {
  id: string;
  version: string;
  title: string;
  summary: string;
  details: string | null;
  isActive: boolean;
  isForce: boolean;
  isPinned: boolean;
  targetScope: UpdateTargetScope;
  tenantIds: string[];
  publishAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

const nullableDateSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.union([z.string().datetime(), z.null()]),
);

const nullableTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.union([z.string().max(5000), z.null()]),
);

const createUpdateSchema = z
  .object({
    version: z.string().min(1).max(50),
    title: z.string().min(3).max(160),
    summary: z.string().min(4).max(400),
    details: nullableTextSchema.default(null),
    isActive: z.boolean().default(true),
    isForce: z.boolean().default(false),
    isPinned: z.boolean().default(false),
    targetScope: z.enum(["all", "selected"]).default("all"),
    tenantIds: z.array(z.string().min(1)).default([]),
    publishAt: nullableDateSchema.default(null),
    expiresAt: nullableDateSchema.default(null),
  })
  .superRefine((value, ctx) => {
    if (value.targetScope === "selected" && value.tenantIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tenantIds"],
        message: "Secili guncelleme icin en az bir bayi secmelisiniz.",
      });
    }
  });

const updateUpdateSchema = z
  .object({
    updateId: z.string().min(1),
    version: z.string().min(1).max(50).optional(),
    title: z.string().min(3).max(160).optional(),
    summary: z.string().min(4).max(400).optional(),
    details: nullableTextSchema.optional(),
    isActive: z.boolean().optional(),
    isForce: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    targetScope: z.enum(["all", "selected"]).optional(),
    tenantIds: z.array(z.string().min(1)).optional(),
    publishAt: nullableDateSchema.optional(),
    expiresAt: nullableDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasAnyField =
      value.version !== undefined ||
      value.title !== undefined ||
      value.summary !== undefined ||
      value.details !== undefined ||
      value.isActive !== undefined ||
      value.isForce !== undefined ||
      value.isPinned !== undefined ||
      value.targetScope !== undefined ||
      value.tenantIds !== undefined ||
      value.publishAt !== undefined ||
      value.expiresAt !== undefined;

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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeItem(input: unknown): PlatformUpdateItem | null {
  const row = asRecord(input);
  const id = asText(row.id);
  const version = asText(row.version);
  const title = asText(row.title);
  const summary = asText(row.summary);
  if (!id || !version || !title || !summary) {
    return null;
  }

  const targetScopeRaw = asText(row.targetScope);
  const targetScope: UpdateTargetScope = targetScopeRaw === "selected" ? "selected" : "all";

  return {
    id,
    version,
    title,
    summary,
    details: row.details === null ? null : asText(row.details) || null,
    isActive: asBoolean(row.isActive, true),
    isForce: asBoolean(row.isForce, false),
    isPinned: asBoolean(row.isPinned, false),
    targetScope,
    tenantIds: asStringArray(row.tenantIds),
    publishAt: row.publishAt === null ? null : asText(row.publishAt) || null,
    expiresAt: row.expiresAt === null ? null : asText(row.expiresAt) || null,
    createdAt: asText(row.createdAt) || new Date().toISOString(),
    createdBy: asText(row.createdBy),
    updatedAt: asText(row.updatedAt) || new Date().toISOString(),
  };
}

function parseItems(payload: unknown): PlatformUpdateItem[] {
  const record = asRecord(payload);
  const items = Array.isArray(record.items) ? record.items : [];
  return items
    .map((item) => normalizeItem(item))
    .filter((item): item is PlatformUpdateItem => item !== null)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

function toJsonPayload(items: PlatformUpdateItem[]): Prisma.InputJsonValue {
  return {
    items,
  } as unknown as Prisma.InputJsonValue;
}

function isVisibleForTenant(item: PlatformUpdateItem, tenantId: string, now: Date): boolean {
  if (!item.isActive) {
    return false;
  }

  if (item.publishAt) {
    const publishAt = new Date(item.publishAt);
    if (!Number.isNaN(publishAt.getTime()) && publishAt > now) {
      return false;
    }
  }

  if (item.expiresAt) {
    const expiresAt = new Date(item.expiresAt);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < now) {
      return false;
    }
  }

  if (item.targetScope === "all") {
    return true;
  }

  return item.tenantIds.includes(tenantId);
}

async function loadPlatformUpdates() {
  const row = await prisma.appSettings.findFirst({
    where: {
      deletedAt: null,
      code: PLATFORM_UPDATES_SCOPE,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    row,
    items: parseItems(row?.payload),
  };
}

async function savePlatformUpdates(rowId: string | null, items: PlatformUpdateItem[]) {
  const payload = toJsonPayload(items);
  const now = new Date();

  if (rowId) {
    await prisma.appSettings.update({
      where: { id: rowId },
      data: {
        payload,
        occurredAt: now,
      },
    });
    return;
  }

  await prisma.appSettings.create({
    data: {
      code: PLATFORM_UPDATES_SCOPE,
      name: "Platform Updates",
      status: "active",
      payload,
      occurredAt: now,
    },
  });
}

async function syncTenantFeeds(items: PlatformUpdateItem[]) {
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  const now = new Date();
  for (const tenant of tenants) {
    const tenantItems = items.filter((item) => isVisibleForTenant(item, tenant.id, now));

    const existing = await prisma.tenantSettings.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        code: TENANT_UPDATES_SCOPE,
      },
      orderBy: { createdAt: "desc" },
    });

    const payload = {
      items: tenantItems,
    } as unknown as Prisma.InputJsonValue;

    if (existing) {
      await prisma.tenantSettings.update({
        where: { id: existing.id },
        data: {
          payload,
          occurredAt: now,
        },
      });
      continue;
    }

    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        code: TENANT_UPDATES_SCOPE,
        name: "Sistem Guncelleme",
        status: "active",
        payload,
        occurredAt: now,
      },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireFounderAccess(request);
    const q = request.nextUrl.searchParams.get("q")?.trim().toLocaleLowerCase("tr") ?? "";

    const { items } = await loadPlatformUpdates();
    const filtered =
      q.length === 0
        ? items
        : items.filter((item) => {
            const target = `${item.version} ${item.title} ${item.summary}`.toLocaleLowerCase("tr");
            return target.includes(q);
          });

    return ok(filtered);
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Guncellemeler alinamadi.", "FOUNDER_UPDATES_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = createUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Guncelleme formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const { row, items } = await loadPlatformUpdates();
    const nowIso = new Date().toISOString();

    const updateItem: PlatformUpdateItem = {
      id: crypto.randomUUID(),
      version: parsed.data.version.trim(),
      title: parsed.data.title.trim(),
      summary: parsed.data.summary.trim(),
      details: parsed.data.details,
      isActive: parsed.data.isActive,
      isForce: parsed.data.isForce,
      isPinned: parsed.data.isPinned,
      targetScope: parsed.data.targetScope,
      tenantIds: parsed.data.targetScope === "selected" ? Array.from(new Set(parsed.data.tenantIds)) : [],
      publishAt: parsed.data.publishAt,
      expiresAt: parsed.data.expiresAt,
      createdAt: nowIso,
      createdBy: founder.email,
      updatedAt: nowIso,
    };

    const nextItems = [updateItem, ...items];
    await savePlatformUpdates(row?.id ?? null, nextItems);
    await syncTenantFeeds(nextItems);

    return ok(
      {
        update: updateItem,
        total: nextItems.length,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Guncelleme kaydedilemedi.", "FOUNDER_UPDATE_CREATE_ERROR", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireFounderAccess(request);
    const parsed = updateUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Guncelleme guncelleme formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const { row, items } = await loadPlatformUpdates();
    const index = items.findIndex((item) => item.id === parsed.data.updateId);
    if (index === -1) {
      return fail("Guncelleme kaydi bulunamadi.", "UPDATE_NOT_FOUND", 404);
    }

    const previous = items[index];
    const targetScope = parsed.data.targetScope ?? previous.targetScope;
    const tenantIds =
      targetScope === "selected"
        ? Array.from(new Set(parsed.data.tenantIds ?? previous.tenantIds))
        : [];

    if (targetScope === "selected" && tenantIds.length === 0) {
      return fail("Secili guncelleme icin en az bir bayi secmelisiniz.", "VALIDATION_ERROR", 422);
    }

    const updated: PlatformUpdateItem = {
      ...previous,
      version: parsed.data.version ?? previous.version,
      title: parsed.data.title ?? previous.title,
      summary: parsed.data.summary ?? previous.summary,
      details: parsed.data.details !== undefined ? parsed.data.details : previous.details,
      isActive: parsed.data.isActive ?? previous.isActive,
      isForce: parsed.data.isForce ?? previous.isForce,
      isPinned: parsed.data.isPinned ?? previous.isPinned,
      targetScope,
      tenantIds,
      publishAt: parsed.data.publishAt !== undefined ? parsed.data.publishAt : previous.publishAt,
      expiresAt: parsed.data.expiresAt !== undefined ? parsed.data.expiresAt : previous.expiresAt,
      updatedAt: new Date().toISOString(),
    };

    const nextItems = [...items];
    nextItems[index] = updated;
    await savePlatformUpdates(row?.id ?? null, nextItems);
    await syncTenantFeeds(nextItems);

    return ok({
      update: updated,
      total: nextItems.length,
    });
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Guncelleme duzenlenemedi.", "FOUNDER_UPDATE_PATCH_ERROR", 500);
  }
}
