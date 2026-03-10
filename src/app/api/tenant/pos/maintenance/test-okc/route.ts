import net from "node:net";
import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

export const runtime = "nodejs";

const testSchema = z.object({
  ipAddress: z.string().min(3).max(120),
  port: z.coerce.number().int().min(1).max(65535),
  timeoutMs: z.coerce.number().int().min(500).max(15000).optional(),
});

async function testTcpConnection(ipAddress: string, port: number, timeoutMs: number) {
  return new Promise<{ reachable: boolean; latencyMs: number; reason: string }>((resolve) => {
    const startedAt = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finalize = (reachable: boolean, reason: string) => {
      if (settled) {
        return;
      }
      settled = true;
      const latencyMs = Date.now() - startedAt;
      socket.destroy();
      resolve({ reachable, latencyMs, reason });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finalize(true, "Bağlantı başarılı."));
    socket.once("timeout", () => finalize(false, "Bağlantı zaman aşımına uğradı."));
    socket.once("error", (error) => {
      finalize(false, `Bağlantı hatası: ${error.message}`);
    });

    socket.connect(port, ipAddress);
  });
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const parsed = testSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("ÖKC test formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const timeout = parsed.data.timeoutMs ?? 2500;
    const result = await testTcpConnection(parsed.data.ipAddress, parsed.data.port, timeout);

    await prisma.auditLog.create({
      data: {
        tenantId: access.tenantId,
        userId: access.userId,
        module: "pos",
        entityName: "okc",
        entityId: `${parsed.data.ipAddress}:${parsed.data.port}`,
        action: "pos.maintenance.okc_tested",
        payload: {
          ipAddress: parsed.data.ipAddress,
          port: parsed.data.port,
          timeoutMs: timeout,
          reachable: result.reachable,
          latencyMs: result.latencyMs,
          reason: result.reason,
        },
      },
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("ÖKC bağlantı testi sırasında hata oluştu.", "OKC_TEST_ERROR", 500);
  }
}
