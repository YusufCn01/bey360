import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { scaleBrandPresets } from "@/modules/scale/domain/scale-settings";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireTenantAccess(request, ["tenant:user.manage", "sale:pos"]);
    return ok({
      presets: scaleBrandPresets,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Terazi profil listesi alinamadi.", "SCALE_PRESETS_ERROR", 500);
  }
}
