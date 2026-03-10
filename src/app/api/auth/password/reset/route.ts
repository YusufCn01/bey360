import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { hashPassword } from "@/lib/security/password";
import {
  asNumber,
  asRecord,
  asText,
  hashOtpCode,
} from "@/lib/auth/password-recovery";

const resetSchema = z
  .object({
    tenantSlug: z.string().min(2).max(80),
    resetTokenId: z.string().min(1),
    otpCode: z.string().length(6),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Şifre tekrarı eşleşmiyor.",
      });
    }
  });

function toDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = resetSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Şifre yenileme formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: parsed.data.tenantSlug.trim() },
      select: { id: true },
    });
    if (!tenant) {
      return fail("Şirket alanı bulunamadı.", "TENANT_NOT_FOUND", 404);
    }

    const token = await prisma.passwordResetTokens.findFirst({
      where: {
        id: parsed.data.resetTokenId,
        tenantId: tenant.id,
        code: "auth.password.reset",
        deletedAt: null,
      },
    });
    if (!token) {
      return fail("Şifre sıfırlama kaydı bulunamadı.", "RESET_TOKEN_NOT_FOUND", 404);
    }
    if (token.status !== "active") {
      return fail("Şifre sıfırlama kodunun süresi dolmuş veya kullanılmış.", "RESET_TOKEN_NOT_ACTIVE", 410);
    }

    const payload = asRecord(token.payload);
    const userId = asText(payload.userId);
    if (!userId) {
      return fail("Şifre sıfırlama kaydı bozuk.", "RESET_TOKEN_INVALID", 422);
    }

    const expiresAt = toDate(asText(payload.expiresAt));
    const now = new Date();
    if (!expiresAt || expiresAt.getTime() < now.getTime()) {
      await prisma.passwordResetTokens.update({
        where: { id: token.id },
        data: {
          status: "expired",
          payload: {
            ...payload,
            expiredAt: now.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      return fail("Kodun süresi doldu. Lütfen yeni kod alın.", "OTP_EXPIRED", 410);
    }

    const maxAttempts = Math.max(1, asNumber(payload.maxAttempts, 5));
    const attempts = Math.max(0, asNumber(payload.attempts, 0));
    const expectedHash = asText(payload.otpHash);
    const incomingHash = hashOtpCode(parsed.data.otpCode.trim());

    if (!expectedHash || incomingHash !== expectedHash) {
      const nextAttempts = attempts + 1;
      const locked = nextAttempts >= maxAttempts;

      await prisma.passwordResetTokens.update({
        where: { id: token.id },
        data: {
          status: locked ? "locked" : "active",
          payload: {
            ...payload,
            attempts: nextAttempts,
            lastAttemptAt: now.toISOString(),
            lockedAt: locked ? now.toISOString() : undefined,
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });

      return fail(
        locked ? "Kod çok fazla hatalı girildi. Yeni kod alın." : "SMS doğrulama kodu hatalı.",
        locked ? "OTP_LOCKED" : "OTP_INVALID",
        401,
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: tenant.id,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
      },
    });
    if (!user) {
      return fail("Kullanıcı bulunamadı.", "USER_NOT_FOUND", 404);
    }

    const newPasswordHash = await hashPassword(parsed.data.newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          updatedAt: now,
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          tenantId: tenant.id,
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.session.updateMany({
        where: {
          tenantId: tenant.id,
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.passwordResetTokens.update({
        where: { id: token.id },
        data: {
          status: "used",
          payload: {
            ...payload,
            attempts: attempts + 1,
            usedAt: now.toISOString(),
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });

      await tx.userPasswords.create({
        data: {
          tenantId: tenant.id,
          code: "auth.password.reset",
          name: user.id,
          status: "active",
          payload: {
            userId: user.id,
            email: user.email,
            changedAt: now.toISOString(),
            source: "forgot_password",
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });

      await tx.securityEvents.create({
        data: {
          tenantId: tenant.id,
          code: "auth.password.reset.success",
          name: user.email,
          status: "active",
          payload: {
            userId: user.id,
            resetTokenId: token.id,
            occurredAt: now.toISOString(),
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });
    });

    return ok({
      message: "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.",
    });
  } catch {
    return fail("Şifre güncellenemedi.", "PASSWORD_RESET_ERROR", 500);
  }
}
