import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userRole: {
      findMany: vi.fn(async () => [
        {
          role: {
            permissions: [
              {
                permission: {
                  key: "dashboard:view",
                },
              },
            ],
          },
        },
      ]),
    },
  },
}));

import { userHasAnyPermission, userHasPermission } from "@/lib/rbac/guard";

describe("userHasPermission", () => {
  it("rol ve izin iliskisi uzerinden yetkiyi dogrular", async () => {
    const allowed = await userHasPermission("u1", "dashboard:view");
    expect(allowed).toBe(true);
  });

  it("izin listesinde en az bir anahtar varsa true doner", async () => {
    const allowed = await userHasAnyPermission("u1", ["einvoice:manage", "dashboard:view"]);
    expect(allowed).toBe(true);
  });
});
