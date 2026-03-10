import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

const PLATFORM_ANNOUNCEMENTS_SCOPE = "platform_announcements";
const TENANT_ANNOUNCEMENTS_SCOPE = "duyurular";

type AnnouncementTone = "info" | "success" | "warning" | "danger";
type AnnouncementTargetScope = "all" | "selected";

type PlatformAnnouncement = {
  id: string;
  title: string;
  message: string;
  tone: AnnouncementTone;
  isPinned: boolean;
  isActive: boolean;
  targetScope: AnnouncementTargetScope;
  tenantIds: string[];
  publishAt: string | null;
  expiresAt: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
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
  z.union([z.string().max(160), z.null()]),
);

const nullableUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
  z.union([z.string().url(), z.null()]),
);

const createAnnouncementSchema = z
  .object({
    title: z.string().min(3).max(160),
    message: z.string().min(4).max(4000),
    tone: z.enum(["info", "success", "warning", "danger"]).default("info"),
    isPinned: z.boolean().default(false),
    isActive: z.boolean().default(true),
    targetScope: z.enum(["all", "selected"]).default("all"),
    tenantIds: z.array(z.string().min(1)).default([]),
    publishAt: nullableDateSchema.default(null),
    expiresAt: nullableDateSchema.default(null),
    buttonLabel: nullableTextSchema.default(null),
    buttonUrl: nullableUrlSchema.default(null),
  })
  .superRefine((value, ctx) => {
    if (value.targetScope === "selected" && value.tenantIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tenantIds"],
        message: "Secili duyuru icin en az bir bayi secmelisiniz.",
      });
    }
  });

const updateAnnouncementSchema = z
  .object({
    announcementId: z.string().min(1),
    title: z.string().min(3).max(160).optional(),
    message: z.string().min(4).max(4000).optional(),
    tone: z.enum(["info", "success", "warning", "danger"]).optional(),
    isPinned: z.boolean().optional(),
    isActive: z.boolean().optional(),
    targetScope: z.enum(["all", "selected"]).optional(),
    tenantIds: z.array(z.string().min(1)).optional(),
    publishAt: nullableDateSchema.optional(),
    expiresAt: nullableDateSchema.optional(),
    buttonLabel: nullableTextSchema.optional(),
    buttonUrl: nullableUrlSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasAnyField =
      value.title !== undefined ||
      value.message !== undefined ||
      value.tone !== undefined ||
      value.isPinned !== undefined ||
      value.isActive !== undefined ||
      value.targetScope !== undefined ||
      value.tenantIds !== undefined ||
      value.publishAt !== undefined ||
      value.expiresAt !== undefined ||
      value.buttonLabel !== undefined ||
      value.buttonUrl !== undefined;

    if (!hasAnyField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guncelleme icin en az bir alan gondermelisiniz.",
      });
    }

    const effectiveScope = value.targetScope;
    const effectiveTenantIds = value.tenantIds;
    if (effectiveScope === "selected" && effectiveTenantIds && effectiveTenantIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tenantIds"],
        message: "Secili duyuru icin en az bir bayi secmelisiniz.",
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

function normalizeAnnouncement(item: unknown): PlatformAnnouncement | null {
  const row = asRecord(item);
  const id = asText(row.id);
  const title = asText(row.title);
  const message = asText(row.message);
  if (!id || !title || !message) {
    return null;
  }

  const toneRaw = asText(row.tone);
  const tone: AnnouncementTone = ["info", "success", "warning", "danger"].includes(toneRaw)
    ? (toneRaw as AnnouncementTone)
    : "info";

  const targetScopeRaw = asText(row.targetScope);
  const targetScope: AnnouncementTargetScope =
    targetScopeRaw === "selected" ? "selected" : "all";

  return {
    id,
    title,
    message,
    tone,
    isPinned: asBoolean(row.isPinned),
    isActive: asBoolean(row.isActive, true),
    targetScope,
    tenantIds: asStringArray(row.tenantIds),
    publishAt: row.publishAt === null ? null : asText(row.publishAt) || null,
    expiresAt: row.expiresAt === null ? null : asText(row.expiresAt) || null,
    buttonLabel: row.buttonLabel === null ? null : asText(row.buttonLabel) || null,
    buttonUrl: row.buttonUrl === null ? null : asText(row.buttonUrl) || null,
    createdAt: asText(row.createdAt) || new Date().toISOString(),
    createdBy: asText(row.createdBy),
    updatedAt: asText(row.updatedAt) || new Date().toISOString(),
  };
}

function parseAnnouncements(payload: unknown): PlatformAnnouncement[] {
  const record = asRecord(payload);
  const items = Array.isArray(record.items) ? record.items : [];

  return items
    .map((item) => normalizeAnnouncement(item))
    .filter((item): item is PlatformAnnouncement => item !== null)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

function toJsonPayload(items: PlatformAnnouncement[]): Prisma.InputJsonValue {
  return {
    items,
  } as unknown as Prisma.InputJsonValue;
}

function isAnnouncementVisibleForTenant(item: PlatformAnnouncement, tenantId: string, now: Date): boolean {
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

async function loadPlatformAnnouncements() {
  const row = await prisma.appSettings.findFirst({
    where: {
      deletedAt: null,
      code: PLATFORM_ANNOUNCEMENTS_SCOPE,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    row,
    items: parseAnnouncements(row?.payload),
  };
}

async function savePlatformAnnouncements(rowId: string | null, items: PlatformAnnouncement[]) {
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
      code: PLATFORM_ANNOUNCEMENTS_SCOPE,
      name: "Platform Announcements",
      status: "active",
      payload,
      occurredAt: now,
    },
  });
}

async function syncTenantAnnouncementFeeds(items: PlatformAnnouncement[]) {
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  const now = new Date();

  for (const tenant of tenants) {
    const tenantItems = items.filter((item) => isAnnouncementVisibleForTenant(item, tenant.id, now));

    const existing = await prisma.tenantSettings.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        code: TENANT_ANNOUNCEMENTS_SCOPE,
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
        code: TENANT_ANNOUNCEMENTS_SCOPE,
        name: "Duyurular",
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

    const { items } = await loadPlatformAnnouncements();
    const filtered =
      q.length === 0
        ? items
        : items.filter((item) => {
            const target = `${item.title} ${item.message}`.toLocaleLowerCase("tr");
            return target.includes(q);
          });

    return ok(filtered);
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Duyurular alinamadi.", "FOUNDER_ANNOUNCEMENT_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const founder = await requireFounderAccess(request);
    const parsed = createAnnouncementSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Duyuru formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const { row, items } = await loadPlatformAnnouncements();
    const nowIso = new Date().toISOString();

    const announcement: PlatformAnnouncement = {
      id: crypto.randomUUID(),
      title: parsed.data.title.trim(),
      message: parsed.data.message.trim(),
      tone: parsed.data.tone,
      isPinned: parsed.data.isPinned,
      isActive: parsed.data.isActive,
      targetScope: parsed.data.targetScope,
      tenantIds: parsed.data.targetScope === "selected" ? Array.from(new Set(parsed.data.tenantIds)) : [],
      publishAt: parsed.data.publishAt,
      expiresAt: parsed.data.expiresAt,
      buttonLabel: parsed.data.buttonLabel,
      buttonUrl: parsed.data.buttonUrl,
      createdAt: nowIso,
      createdBy: founder.email,
      updatedAt: nowIso,
    };

    const nextItems = [announcement, ...items];

    await savePlatformAnnouncements(row?.id ?? null, nextItems);
    await syncTenantAnnouncementFeeds(nextItems);

    return ok(
      {
        announcement,
        total: nextItems.length,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Duyuru olusturulamadi.", "FOUNDER_ANNOUNCEMENT_CREATE_ERROR", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireFounderAccess(request);
    const parsed = updateAnnouncementSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Duyuru guncelleme formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const { row, items } = await loadPlatformAnnouncements();
    const index = items.findIndex((item) => item.id === parsed.data.announcementId);
    if (index === -1) {
      return fail("Duyuru bulunamadi.", "ANNOUNCEMENT_NOT_FOUND", 404);
    }

    const previous = items[index];
    const targetScope = parsed.data.targetScope ?? previous.targetScope;
    const tenantIds =
      targetScope === "selected"
        ? Array.from(new Set(parsed.data.tenantIds ?? previous.tenantIds))
        : [];

    if (targetScope === "selected" && tenantIds.length === 0) {
      return fail("Secili duyuru icin en az bir bayi secmelisiniz.", "VALIDATION_ERROR", 422);
    }

    const updated: PlatformAnnouncement = {
      ...previous,
      title: parsed.data.title ?? previous.title,
      message: parsed.data.message ?? previous.message,
      tone: parsed.data.tone ?? previous.tone,
      isPinned: parsed.data.isPinned ?? previous.isPinned,
      isActive: parsed.data.isActive ?? previous.isActive,
      targetScope,
      tenantIds,
      publishAt: parsed.data.publishAt !== undefined ? parsed.data.publishAt : previous.publishAt,
      expiresAt: parsed.data.expiresAt !== undefined ? parsed.data.expiresAt : previous.expiresAt,
      buttonLabel: parsed.data.buttonLabel !== undefined ? parsed.data.buttonLabel : previous.buttonLabel,
      buttonUrl: parsed.data.buttonUrl !== undefined ? parsed.data.buttonUrl : previous.buttonUrl,
      updatedAt: new Date().toISOString(),
    };

    const nextItems = [...items];
    nextItems[index] = updated;

    await savePlatformAnnouncements(row?.id ?? null, nextItems);
    await syncTenantAnnouncementFeeds(nextItems);

    return ok({
      announcement: updated,
      total: nextItems.length,
    });
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Duyuru guncellenemedi.", "FOUNDER_ANNOUNCEMENT_UPDATE_ERROR", 500);
  }
}
