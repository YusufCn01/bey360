import { randomInt } from "crypto";
import { sha256 } from "@/lib/security/crypto";

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function phoneMatches(storedPhone: string | null | undefined, inputPhone: string): boolean {
  const stored = normalizePhone(storedPhone ?? "");
  const input = normalizePhone(inputPhone);
  if (!stored || !input) {
    return false;
  }

  if (stored === input) {
    return true;
  }

  const storedLast10 = stored.slice(-10);
  const inputLast10 = input.slice(-10);
  return storedLast10.length === 10 && inputLast10.length === 10 && storedLast10 === inputLast10;
}

export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length < 6) {
    return normalized;
  }

  const head = normalized.slice(0, 3);
  const tail = normalized.slice(-2);
  return `${head}*****${tail}`;
}

export function generateOtpCode(): string {
  return `${randomInt(0, 1_000_000)}`.padStart(6, "0");
}

export function hashOtpCode(otpCode: string): string {
  return sha256(`mx-otp:${otpCode}`);
}
