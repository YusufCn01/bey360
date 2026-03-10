import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/panel/page";

describe("Turkce UI smoke", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            dailySales: 1500,
            dailyPurchases: 600,
            dailyCashIn: 1200,
            dailyCashOut: 300,
            weeklySales: 7200,
            monthlyRevenue: 31000,
            lowStockCount: 2,
            totalCollections: 8400,
            totalPayments: 2600,
            cashBalance: 5800,
            monthlyCashFlow: [],
            topProducts: [],
            lastSoldItems: [],
            lowStockProducts: [],
            recentFinancialMoves: [],
            updatedAt: new Date().toISOString(),
          },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("panelde Turkce basliklari gosterir", async () => {
    render(<DashboardPage />);

    expect(await screen.findByText("Bugün Satış")).toBeInTheDocument();
    expect(screen.getByText("Bugün Kasa Giriş")).toBeInTheDocument();
  });
});
