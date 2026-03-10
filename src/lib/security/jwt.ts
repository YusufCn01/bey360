import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const secret = new TextEncoder().encode(env.APP_SECRET);

export type AccessTokenPayload = {
  sub: string;
  tenantId: string;
  sessionId: string;
  email: string;
  roleCodes: string[];
};

export async function signAccessToken(payload: AccessTokenPayload, expiresIn = "1h") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  return payload as unknown as AccessTokenPayload;
}
