import { prisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/crypto";

export async function ensureIdempotent(params: {
  tenantId: string;
  endpoint: string;
  key: string;
  requestBody: unknown;
}) {
  const requestHash = sha256(JSON.stringify(params.requestBody));

  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      tenantId_endpoint_requestKey: {
        tenantId: params.tenantId,
        endpoint: params.endpoint,
        requestKey: params.key,
      },
    },
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new Error("Ayni idempotency key farkli istek govdesi ile tekrarlandi");
    }

    return {
      isReplay: true,
      existing,
    };
  }

  const created = await prisma.idempotencyKey.create({
    data: {
      tenantId: params.tenantId,
      endpoint: params.endpoint,
      requestKey: params.key,
      requestHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return {
    isReplay: false,
    existing: created,
  };
}

export async function saveIdempotentResult(id: string, statusCode: number, responseBody: unknown) {
  await prisma.idempotencyKey.update({
    where: { id },
    data: {
      responseCode: statusCode,
      responseBody: responseBody as object,
    },
  });
}
