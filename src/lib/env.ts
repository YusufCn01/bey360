import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("Bey360"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(32).default("local-development-secret-please-change-immediately-1234"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/muhasebe?schema=public"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  QUEUE_PREFIX: z.string().default("muhasebe"),
  DEFAULT_LOCALE: z.string().default("tr-TR"),
  DEFAULT_TIMEZONE: z.string().default("Europe/Istanbul"),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(720),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  SUPPORT_IMPERSONATION_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  PAYMENT_WEBHOOK_SIGNING_KEY: z.string().min(16).optional(),
  EINVOICE_WEBHOOK_SIGNING_KEY: z.string().min(16).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Ortam degiskenleri dogrulanamadi", parsed.error.flatten().fieldErrors);
  throw new Error("Gecersiz ortam degiskenleri");
}

export const env = parsed.data;


