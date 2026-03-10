import { z } from "zod";

export const loginSchema = z.object({
  tenantSlug: z.string().min(2).max(80),
  loginId: z.string().min(2).max(255),
  password: z.string().min(8).max(128),
});
