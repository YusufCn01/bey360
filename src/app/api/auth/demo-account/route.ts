import { Prisma, RoleScope, TenantStatus, UserStatus } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit/audit-service";
import { login } from "@/lib/auth/service";
import { setSessionCookies } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { hashPassword } from "@/lib/security/password";

const DEMO_DAYS = 14;

const demoAccountSchema = z.object({
  gsmNumber: z.string().min(10).max(20),
  companyYear: z.coerce.number().int().min(2000).max(2100),
  companyName: z.string().min(2).max(255),
  username: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-zA-Z0-9._-]+$/, "Kullanıcı adı sadece harf, rakam, nokta, alt çizgi ve tire içerebilir."),
  password: z.string().min(8).max(128),
});

function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };
  return value
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-12);
}

async function ensureUniqueTenantSlug(base: string): Promise<string> {
  const fallback = base.length >= 3 ? base : "demo-bayi";
  let candidate = fallback;
  let index = 0;
  while (index < 1000) {
    const exists = await prisma.tenant.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    index += 1;
    candidate = `${fallback}-${index}`;
  }

  return `${fallback}-${Date.now()}`;
}

async function ensureUniqueTaxNumber(seed: string): Promise<string> {
  let index = 0;
  while (index < 500) {
    const base = `${Date.now()}${Math.floor(Math.random() * 9) + 1}${index}`;
    const taxNumber = `${seed}${base}`.replace(/\D/g, "").slice(0, 20);
    const exists = await prisma.tenant.findUnique({
      where: { taxNumber },
      select: { id: true },
    });
    if (!exists && taxNumber.length >= 10) {
      return taxNumber;
    }
    index += 1;
  }

  return `${Date.now()}${Math.floor(Math.random() * 9999)}`.slice(0, 20);
}

function isUniqueError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: string }).code === "P2002";
}

export async function POST(request: NextRequest) {
  try {
    const parsed = demoAccountSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Demo hesap formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const input = parsed.data;
    const baseSlug = slugify(input.companyName);
    const tenantSlug = await ensureUniqueTenantSlug(baseSlug);
    const taxSeed = normalizePhone(input.gsmNumber).slice(-6) || String(input.companyYear);
    const taxNumber = await ensureUniqueTaxNumber(taxSeed);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + DEMO_DAYS * 24 * 60 * 60 * 1000);
    const username = input.username.trim().toLowerCase();
    const email = `${username}@${tenantSlug}.demo.local`;

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: tenantSlug,
          legalName: input.companyName.trim(),
          tradeName: input.companyName.trim(),
          taxNumber,
          locale: "tr-TR",
          timezone: "Europe/Istanbul",
          currency: "TRY",
          status: TenantStatus.TRIALING,
          trialEndsAt,
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

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          username,
          firstName: username.toUpperCase(),
          lastName: "ADMIN",
          phone: normalizePhone(input.gsmNumber),
          passwordHash: await hashPassword(input.password),
          status: UserStatus.ACTIVE,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id,
          assignedBy: null,
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
          code: "tenant.demo.started",
          name: "Tenant demo started",
          status: "active",
          payload: {
            gsmNumber: normalizePhone(input.gsmNumber),
            companyYear: input.companyYear,
            demoDays: DEMO_DAYS,
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });

      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          code: "firma_ayarlari",
          name: "Firma Ayarları",
          status: "active",
          payload: {
            companyName: input.companyName.trim(),
            tradeName: input.companyName.trim(),
            phone: normalizePhone(input.gsmNumber),
            branchName: "MERKEZ",
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });

      return {
        tenantId: tenant.id,
        userId: user.id,
        tenantSlug: tenant.slug,
        userEmail: user.email,
      };
    });

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || "0.0.0.0";
    const userAgent = request.headers.get("user-agent") || undefined;

    const signedIn = await login(
      {
        tenantSlug: created.tenantSlug,
        loginId: username,
        password: input.password,
      },
      ipAddress,
      userAgent,
    );
    await setSessionCookies(signedIn.accessToken, signedIn.refreshToken);

    await writeAuditLog({
      tenantId: created.tenantId,
      userId: created.userId,
      module: "auth",
      entityName: "session",
      entityId: created.userId,
      action: "login.demo.start",
      ipAddress,
      userAgent: userAgent ?? "",
      payload: {
        tenantSlug: created.tenantSlug,
      },
    });

    return ok(
      {
        tenantSlug: created.tenantSlug,
        loginId: username,
        email: created.userEmail,
        trialEndsAt: trialEndsAt.toISOString(),
        demoDays: DEMO_DAYS,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueError(error)) {
      return fail("Demo hesap oluşturulamadı. Aynı bilgilerle kayıt mevcut olabilir.", "UNIQUE_CONSTRAINT", 409);
    }

    return fail("Demo hesap açılırken beklenmeyen bir hata oluştu.", "DEMO_ACCOUNT_CREATE_ERROR", 500);
  }
}
