import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail } from "@/lib/http/response";
import { getDashboardSummary } from "@/modules/reporting/application/dashboard-service";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "report:view");
    const summary = await getDashboardSummary({ tenantId: access.tenantId });

    const rows = [
      { Metrik: "Günlük Satış", Değer: summary.dailySales },
      { Metrik: "Haftalık Satış", Değer: summary.weeklySales },
      { Metrik: "Aylık Ciro", Değer: summary.monthlyRevenue },
      { Metrik: "Düşük Stok Sayısı", Değer: summary.lowStockCount },
      { Metrik: "Toplam Tahsilat", Değer: summary.totalCollections },
      { Metrik: "Toplam Ödeme", Değer: summary.totalPayments },
      { Metrik: "Kasa Bakiyesi", Değer: summary.cashBalance },
      { Metrik: "Güncelleme Zamanı", Değer: summary.updatedAt },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dashboard");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="dashboard-raporu.xlsx"',
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Excel raporu hazırlanırken hata oluştu.", "REPORT_EXCEL_ERROR", 500);
  }
}
