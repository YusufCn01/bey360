import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/queue/redis";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();

    return NextResponse.json({
      status: "ready",
      checks: {
        database: "ok",
        redis: "ok",
      },
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
