import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail } from "@/lib/http/response";
import { getDashboardSummary } from "@/modules/reporting/application/dashboard-service";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "report:view");
    const summary = await getDashboardSummary({ tenantId: access.tenantId });

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Beyoğlu Dashboard Raporu", 14, 20);
    doc.setFontSize(11);

    const lines = [
      `Günlük Satış: ${summary.dailySales.toFixed(2)} TL`,
      `Haftalık Satış: ${summary.weeklySales.toFixed(2)} TL`,
      `Aylık Ciro: ${summary.monthlyRevenue.toFixed(2)} TL`,
      `Düşük Stok Sayısı: ${summary.lowStockCount}`,
      `Toplam Tahsilat: ${summary.totalCollections.toFixed(2)} TL`,
      `Toplam Ödeme: ${summary.totalPayments.toFixed(2)} TL`,
      `Kasa Bakiyesi: ${summary.cashBalance.toFixed(2)} TL`,
      `Güncelleme: ${summary.updatedAt}`,
    ];

    let y = 35;
    for (const line of lines) {
      doc.text(line, 14, y);
      y += 8;
    }

    const buffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="dashboard-raporu.pdf"',
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("PDF raporu hazırlanırken hata oluştu.", "REPORT_PDF_ERROR", 500);
  }
}

