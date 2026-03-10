import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const secret = new TextEncoder().encode(env.APP_SECRET);

export const FOUNDER_COOKIE = "mx_founder";

export type FounderSessionPayload = {
  sub: string;
  email: string;
  fullName: string;
};

export class FounderAuthorizationError extends Error {
  constructor(message: string, public statusCode: number, public code: string) {
    super(message);
  }
}

export async function signFounderSession(payload: FounderSessionPayload, expiresIn = "12h") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyFounderSession(token: string): Promise<FounderSessionPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  return payload as unknown as FounderSessionPayload;
}

export async function setFounderSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(FOUNDER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearFounderSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(FOUNDER_COOKIE);
}

export async function getFounderSessionFromCookies(): Promise<FounderSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(FOUNDER_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    return await verifyFounderSession(token);
  } catch {
    return null;
  }
}

export async function requireFounderAccess(request: NextRequest): Promise<FounderSessionPayload> {
  const token = request.cookies.get(FOUNDER_COOKIE)?.value;
  if (!token) {
    throw new FounderAuthorizationError("Kurucu oturumu bulunamadi.", 401, "FOUNDER_UNAUTHORIZED");
  }

  try {
    return await verifyFounderSession(token);
  } catch {
    throw new FounderAuthorizationError("Kurucu oturumu gecersiz.", 401, "FOUNDER_INVALID_SESSION");
  }
}
