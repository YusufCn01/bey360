import type { NextRequest } from "next/server";

function normalizeHost(value: string | null | undefined): string {
  return (value ?? "").split(",")[0]?.trim().split(":")[0]?.trim().toLowerCase() ?? "";
}

export function isSerialScaleSupportedOnRequest(request: NextRequest): boolean {
  const forced = process.env.B360_ALLOW_SERIAL_SCALE?.trim().toLowerCase();
  if (forced === "true") {
    return true;
  }

  const host = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  if (!host) {
    return false;
  }

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".test")
  );
}
