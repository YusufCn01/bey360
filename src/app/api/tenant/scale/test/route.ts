import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { readScaleWeight } from "@/modules/scale/application/scale-device-service";
import { loadTenantScaleSettings, mergeScaleSettings } from "@/app/api/tenant/scale/_lib";

export const runtime = "nodejs";

const scaleSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    brand: z.enum(["tem", "cas", "cas_cl3000_stream", "dikomsan", "hana", "betsa", "tess", "custom"]).optional(),
    transport: z.enum(["serial", "tcp"]).optional(),
    host: z.string().max(120).optional(),
    port: z.coerce.number().int().min(1).max(65535).optional(),
    serialPath: z.string().max(120).optional(),
    baudRate: z.coerce.number().int().min(1200).max(115200).optional(),
    dataBits: z.coerce.number().int().min(7).max(8).optional(),
    stopBits: z.coerce.number().int().min(1).max(2).optional(),
    parity: z.enum(["none", "even", "odd"]).optional(),
    timeoutMs: z.coerce.number().int().min(500).max(15000).optional(),
    commandMode: z.enum(["none", "text", "hex"]).optional(),
    pollCommand: z.string().max(200).optional(),
    readMode: z.enum(["poll", "stream"]).optional(),
    responsePattern: z.string().max(300).optional(),
    stableTokens: z.string().max(200).optional(),
    unstableTokens: z.string().max(200).optional(),
    unit: z.enum(["kg", "g"]).optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, ["tenant:user.manage", "sale:pos"]);
    const body = await request.json().catch(() => ({}));
    const parsed = scaleSettingsSchema.safeParse(body?.settings);
    if (!parsed.success) {
      return fail("Terazi baglanti testi formu gecersiz.", "VALIDATION_ERROR", 422);
    }

    const savedSettings = await loadTenantScaleSettings(access.tenantId);
    const resolvedSettings = mergeScaleSettings(savedSettings, parsed.data ?? undefined);
    const result = await readScaleWeight(resolvedSettings);

    return ok({
      reachable: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail(
      error instanceof Error ? error.message : "Terazi baglanti testi basarisiz.",
      "SCALE_TEST_ERROR",
      500,
    );
  }
}
