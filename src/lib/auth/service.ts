import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/security/password";
import { randomToken, sha256 } from "@/lib/security/crypto";
import { signAccessToken } from "@/lib/security/jwt";
import { env } from "@/lib/env";
import type { LoginRequest } from "@/lib/auth/types";

export class AuthError extends Error {
  constructor(message: string, public code: string = "AUTH_ERROR") {
    super(message);
  }
}

export async function login(payload: LoginRequest, ipAddress: string, userAgent?: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: payload.tenantSlug } });
  if (!tenant || tenant.deletedAt) {
    throw new AuthError("Şirket alanı bulunamadı", "TENANT_NOT_FOUND");
  }

  const loginId = payload.loginId.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      OR: [{ email: loginId }, { username: loginId }],
    },
  });

  if (!user) {
    throw new AuthError("Kullanıcı bulunamadı", "USER_NOT_FOUND");
  }

  const ok = await verifyPassword(payload.password, user.passwordHash);
  if (!ok) {
    await prisma.loginAttempts.create({
      data: {
        tenantId: tenant.id,
        code: "password",
        name: user.email,
        status: "failed",
        payload: {
          userId: user.id,
          ipAddress,
          userAgent,
        },
      },
    });

    throw new AuthError("Şifre hatalı", "INVALID_PASSWORD");
  }

  const roleCodes = await prisma.userRole
    .findMany({
      where: { userId: user.id },
      include: { role: true },
    })
    .then((rows) => rows.map((row) => row.role.code));

  const rawRefreshToken = randomToken(48);
  const refreshHash = sha256(rawRefreshToken);

  const session = await prisma.session.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      tokenHash: sha256(randomToken(32)),
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + env.SESSION_TTL_MINUTES * 60 * 1000),
    },
  });

  await prisma.refreshToken.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = await signAccessToken({
    sub: user.id,
    tenantId: tenant.id,
    sessionId: session.id,
    email: user.email,
    roleCodes,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleCodes,
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      legalName: tenant.legalName,
    },
  };
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: sha256(refreshToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
