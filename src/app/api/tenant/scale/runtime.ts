import type { NextRequest } from "next/server";

function normalizeHost(value: string | null | undefined): string {
  return (value ?? "").split(",")[0]?.trim().split(":")[0]?.trim().toLowerCase() ?? "";
}

function isLocalRuntimeHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".test")
  );
}

function isPrivateIpv4(host: string): boolean {
  if (/^10\./.test(host)) return true;
  if (/^127\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;

  const match = host.match(/^172\.(\d{1,3})\./);
  if (match) {
    const secondOctet = Number(match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function isPrivateOrLocalTarget(host: string): boolean {
  if (!host) return false;
  if (isLocalRuntimeHost(host)) return true;
  if (host.endsWith(".lan") || host.endsWith(".home") || host.endsWith(".internal")) return true;
  return isPrivateIpv4(host);
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

  return isLocalRuntimeHost(host);
}

export function isTcpScaleTargetReachableOnRequest(request: NextRequest, targetHost: string): boolean {
  const forced = process.env.B360_ALLOW_PRIVATE_TCP_SCALE?.trim().toLowerCase();
  if (forced === "true") {
    return true;
  }

  const runtimeHost = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  if (!runtimeHost) {
    return false;
  }

  if (isLocalRuntimeHost(runtimeHost)) {
    return true;
  }

  return !isPrivateOrLocalTarget(normalizeHost(targetHost));
}
