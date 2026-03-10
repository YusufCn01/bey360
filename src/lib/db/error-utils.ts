import { Prisma } from "@prisma/client";

const DB_KNOWN_CODES = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1011"]);

export function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && DB_KNOWN_CODES.has(error.code)) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("database_url") ||
    normalized.includes("can't reach database server") ||
    normalized.includes("cant reach database server") ||
    normalized.includes("authentication failed against database server") ||
    normalized.includes("error opening a tls connection")
  );
}
