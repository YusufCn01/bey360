import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { setFounderSessionCookie, signFounderSession } from "@/lib/auth/founder-session";
import { hashPassword, verifyPassword } from "@/lib/security/password";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(255).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Kurucu giris formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const email = parsed.data.email.toLowerCase();
    let founder = await prisma.platformUser.findUnique({
      where: { email },
    });

    let bootstrapped = false;
    if (!founder) {
      const totalFounderUsers = await prisma.platformUser.count();
      if (totalFounderUsers === 0) {
        founder = await prisma.platformUser.create({
          data: {
            email,
            fullName: parsed.data.fullName?.trim() || "Kurucu",
            passwordHash: await hashPassword(parsed.data.password),
            isActive: true,
            lastLoginAt: new Date(),
          },
        });
        bootstrapped = true;
      }
    }

    if (!founder) {
      return fail("Kurucu hesabi bulunamadi.", "FOUNDER_NOT_FOUND", 404);
    }
    if (!founder.isActive) {
      return fail("Kurucu hesabi pasif durumda.", "FOUNDER_DISABLED", 403);
    }

    const validPassword = await verifyPassword(parsed.data.password, founder.passwordHash);
    if (!validPassword) {
      return fail("Sifre hatali.", "INVALID_PASSWORD", 401);
    }

    await prisma.platformUser.update({
      where: { id: founder.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signFounderSession({
      sub: founder.id,
      email: founder.email,
      fullName: founder.fullName,
    });
    await setFounderSessionCookie(token);

    return ok({
      id: founder.id,
      email: founder.email,
      fullName: founder.fullName,
      bootstrapped,
    });
  } catch {
    return fail("Kurucu girisi sirasinda hata olustu.", "FOUNDER_LOGIN_ERROR", 500);
  }
}
