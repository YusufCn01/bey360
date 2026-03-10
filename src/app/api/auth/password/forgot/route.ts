import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import {
  generateOtpCode,
  hashOtpCode,
  maskPhone,
  normalizePhone,
  phoneMatches,
} from "@/lib/auth/password-recovery";

const OTP_EXPIRES_MINUTES = 5;

const forgotSchema = z.object({
  tenantSlug: z.string().min(2).max(80),
  loginId: z.string().min(2).max(255),
  gsmNumber: z.string().min(10).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = forgotSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Şifre sıfırlama formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: parsed.data.tenantSlug.trim() },
      select: {
        id: true,
        slug: true,
      },
    });
    if (!tenant) {
      return fail("Şirket alanı bulunamadı.", "TENANT_NOT_FOUND", 404);
    }

    const loginId = parsed.data.loginId.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        OR: [{ email: loginId }, { username: loginId }],
      },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        status: true,
      },
    });
    if (!user) {
      return fail("Kullanıcı bulunamadı.", "USER_NOT_FOUND", 404);
    }
    if (user.status !== "ACTIVE") {
      return fail("Kullanıcı hesabı aktif değil.", "USER_NOT_ACTIVE", 403);
    }
    if (!phoneMatches(user.phone, parsed.data.gsmNumber)) {
      return fail("GSM numarası doğrulanamadı.", "PHONE_MISMATCH", 403);
    }

    const otpCode = generateOtpCode();
    const otpHash = hashOtpCode(otpCode);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRES_MINUTES * 60 * 1000);

    const resetToken = await prisma.$transaction(async (tx) => {
      await tx.passwordResetTokens.updateMany({
        where: {
          tenantId: tenant.id,
          code: "auth.password.reset",
          name: user.id,
          status: "active",
          deletedAt: null,
        },
        data: {
          status: "expired",
          updatedAt: now,
        },
      });

      const created = await tx.passwordResetTokens.create({
        data: {
          tenantId: tenant.id,
          code: "auth.password.reset",
          name: user.id,
          status: "active",
          payload: {
            userId: user.id,
            loginId,
            gsmNumber: normalizePhone(parsed.data.gsmNumber),
            otpHash,
            attempts: 0,
            maxAttempts: 5,
            expiresAt: expiresAt.toISOString(),
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });

      await tx.smsLogs.create({
        data: {
          tenantId: tenant.id,
          code: "auth.password.reset.otp",
          name: normalizePhone(parsed.data.gsmNumber),
          status: "sent",
          payload: {
            channel: "simulated",
            purpose: "password_reset",
            userId: user.id,
            otpCode,
            expiresAt: expiresAt.toISOString(),
            message: `Tek kullanımlık doğrulama kodunuz: ${otpCode}`,
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });

      await tx.securityEvents.create({
        data: {
          tenantId: tenant.id,
          code: "auth.password.reset.otp.sent",
          name: user.email,
          status: "active",
          payload: {
            userId: user.id,
            loginId,
            gsmNumber: normalizePhone(parsed.data.gsmNumber),
            expiresAt: expiresAt.toISOString(),
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });

      return created;
    });

    return ok({
      resetTokenId: resetToken.id,
      expiresAt: expiresAt.toISOString(),
      maskedPhone: maskPhone(parsed.data.gsmNumber),
      otpPreview: process.env.NODE_ENV === "production" ? undefined : otpCode,
    });
  } catch {
    return fail("Şifre sıfırlama kodu gönderilemedi.", "PASSWORD_RESET_OTP_SEND_ERROR", 500);
  }
}
