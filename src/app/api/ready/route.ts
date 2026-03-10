import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/queue/redis";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    let redisState: "ok" | "degraded" = "ok";
    let redisError: string | null = null;

    try {
      await redis.ping();
    } catch (error) {
      // Redis is optional for basic auth/panel flows.
      // Do not fail whole readiness when only Redis is unavailable.
      redisState = "degraded";
      redisError = error instanceof Error ? error.message : "Redis ulasilamiyor";
    }

    return NextResponse.json({
      status: "ready",
      checks: {
        database: "ok",
        redis: redisState,
      },
      ...(redisError ? { warnings: { redis: redisError } } : {}),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "not_ready",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 503 },
    );
  }
}
