import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { listScaleSerialPorts } from "@/modules/scale/application/scale-device-service";
import { isSerialScaleSupportedOnRequest } from "@/app/api/tenant/scale/runtime";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireTenantAccess(request, ["tenant:user.manage", "sale:pos"]);
    if (!isSerialScaleSupportedOnRequest(request)) {
      return fail(
        "Seri port tarama bu sunucuda desteklenmiyor. Masaustu/local kurulum kullanin veya TCP/Ethernet terazi baglayin.",
        "SCALE_SERIAL_NOT_SUPPORTED",
        422,
      );
    }
    const ports = await listScaleSerialPorts();
    return ok({ ports });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail(
      error instanceof Error ? error.message : "Seri portlar listelenemedi.",
      "SCALE_PORTS_ERROR",
      500,
    );
  }
}
