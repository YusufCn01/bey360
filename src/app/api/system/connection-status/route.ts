import { NextResponse } from "next/server";
import { prisma, runtimeDatabaseInfo } from "@/lib/db/prisma";
import { env } from "@/lib/env";

type HealthState = "ok" | "degraded" | "down";

async function checkCloudStatus() {
  const cloudUrl = env.CLOUD_STATUS_URL ?? `${env.APP_URL}/api/health`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(cloudUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return {
      status: response.ok ? ("ok" as HealthState) : ("degraded" as HealthState),
      httpStatus: response.status,
      url: cloudUrl,
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      status: "down" as HealthState,
      url: cloudUrl,
      error: error instanceof Error ? error.message : "Bulut baglantisi kurulamadi",
    };
  }
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const cloud = await checkCloudStatus();

    return NextResponse.json({
      success: true,
      data: {
        sql: {
          status: "ok" as HealthState,
          source: runtimeDatabaseInfo.source,
          host: runtimeDatabaseInfo.host,
        },
        cloud,
      },
    });
  } catch (error) {
    const cloud = await checkCloudStatus();

    return NextResponse.json(
      {
        success: false,
        data: {
          sql: {
            status: "down" as HealthState,
            source: runtimeDatabaseInfo.source,
            host: runtimeDatabaseInfo.host,
            error: error instanceof Error ? error.message : "SQL baglantisi kurulamadi",
          },
          cloud,
        },
      },
      { status: 503 },
    );
  }
}
