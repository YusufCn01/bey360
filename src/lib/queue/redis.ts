import IORedis from "ioredis";
import { env } from "@/lib/env";

const globalRedis = globalThis as unknown as { redis?: IORedis };

export const redis =
  globalRedis.redis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableReadyCheck: false,
  });

redis.on("error", () => {
  // Redis baglantisi runtime'da olmayabilir (build/test).
});

if (process.env.NODE_ENV !== "production") {
  globalRedis.redis = redis;
}
