import { describe, expect, it } from "vitest";
import { formatTry } from "@/lib/format/currency";

describe("formatTry", () => {
  it("tr-TR biciminde para birimi formatlar", () => {
    const value = formatTry(12345.67);
    expect(value).toContain("\u20ba");
    expect(value).toContain("12");
  });
});
