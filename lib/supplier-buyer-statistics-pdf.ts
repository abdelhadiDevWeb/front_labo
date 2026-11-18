import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ClientData, SupplierBuyerStatistics } from "@/lib/api";
import {
  drawPdfCharts,
  formatPdfMoney,
  pdfSafeText,
  type PdfChartImage,
} from "@/lib/pdf-report-charts";

const STATUS_LABELS: Record<string, string> = {
  "en attente": "En attente",
  refusée: "Refusée",
  "en cours": "En cours",
  "on route": "En livraison",
  arrived: "Livrée",
};

type JsPdfWithPages = jsPDF & {
  lastAutoTable?: { finalY: number };
};

const formatMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).toLocaleDateString(
    "fr-FR",
    { month: "short", year: "numeric" }
  );
};

const buyerDisplayName = (s: SupplierBuyerStatistics) => {
  const name = [s.buyer.firstName, s.buyer.lastName].filter(Boolean).join(" ").trim();
  return name || s.buyer.email || "Client";
};

const supplierDisplayName = (profile: ClientData | null) => {
  if (!profile) return "Fournisseur";
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return name || profile.email || "Fournisseur";
};

export function downloadSupplierBuyerStatisticsPdf(options: {
  statistics: SupplierBuyerStatistics;
  profile: ClientData | null;
  charts?: PdfChartImage[];
}): void {
  const { statistics: s, profile, charts = [] } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as JsPdfWithPages;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentW = pageW - marginX * 2;

  type RGB = [number, number, number];
  const ink: RGB = [15, 23, 42];
  const muted: RGB = [100, 116, 139];
  const accent: RGB = [5, 150, 105];
  const line: RGB = [226, 232, 240];
  const slateHead: RGB = [30, 41, 59];
  const altRow: RGB = [248, 250, 252];

  const generatedAt = new Date();
  const clientName = buyerDisplayName(s);
  const supplierName = supplierDisplayName(profile);
  const reportId = `CLI-${generatedAt.toISOString().slice(0, 10).replace(/-/g, "")}`;

  const drawHeader = () => {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("RAPPORT CLIENT — ACHATS", marginX, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(pdfSafeText(`Fournisseur : ${supplierName}`), marginX, 19);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(pdfSafeText(clientName), pageW - marginX, 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(reportId, pageW - marginX, 19, { align: "right" });
  };

  const drawFooter = (pageNumber: number, pageCount: number) => {
    doc.setDrawColor(line[0], line[1], line[2]);
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFontSize(8);
    doc.text(
      `Dz Labmarket — ${generatedAt.toLocaleString("fr-FR")}`,
      marginX,
      pageH - 6
    );
    doc.text(`Page ${pageNumber}/${pageCount}`, pageW - marginX, pageH - 6, {
      align: "right",
    });
  };

  drawHeader();
  let y = 36;

  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(pdfSafeText(clientName), marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  const meta = [
    s.buyer.email,
    s.buyer.phone,
    s.buyer.laboType,
    s.buyer.wilaya ? `Wilaya ${s.buyer.wilaya}` : null,
    s.periodLabel || "",
    s.periodRangeLabel || "",
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(pdfSafeText(meta), marginX, y, { maxWidth: contentW });
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Total dépensé", formatPdfMoney(s.totalSpent)],
      ["Réserves", String(s.totalOrders)],
      ["Articles achetés", String(s.totalItemsBought)],
    ],
    theme: "grid",
    headStyles: { fillColor: slateHead, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: altRow },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  y = (doc.lastAutoTable?.finalY || y) + 8;

  if (charts.length > 0) {
    y = drawPdfCharts(doc, charts, {
      y,
      marginX,
      contentW,
      pageH,
      ink,
      line,
      onNewPage: () => {
        drawHeader();
        return 36;
      },
    });
    y += 4;
  }

  const monthKeys = Object.keys(s.monthlySpend || {}).sort();
  if (monthKeys.length > 0) {
    if (y > pageH - 50) {
      doc.addPage();
      drawHeader();
      y = 36;
    }
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Évolution mensuelle", marginX, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Mois", "Dépenses", "Réserves"]],
      body: monthKeys.map((key) => [
        formatMonthKey(key),
        formatPdfMoney(s.monthlySpend[key] || 0),
        String(s.monthlyOrders?.[key] || 0),
      ]),
      theme: "grid",
      headStyles: { fillColor: slateHead, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: altRow },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 8;
  }

  if (s.topProducts?.length) {
    if (y > pageH - 50) {
      doc.addPage();
      drawHeader();
      y = 36;
    }
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Produits / machines les plus achetés", marginX, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Article", "Qté", "Montant", "Réserves"]],
      body: s.topProducts.map((p) => [
        pdfSafeText(p.name),
        String(p.quantity),
        formatPdfMoney(p.revenue),
        String(p.orders),
      ]),
      theme: "grid",
      headStyles: { fillColor: slateHead, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: altRow },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 80 } },
    });
    y = (doc.lastAutoTable?.finalY || y) + 8;
  }

  if (s.recentOrders?.length) {
    if (y > pageH - 50) {
      doc.addPage();
      drawHeader();
      y = 36;
    }
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Réserves récentes", marginX, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Date", "Statut", "Articles", "Total"]],
      body: s.recentOrders.map((o) => [
        new Date(o.createdAt).toLocaleDateString("fr-FR"),
        STATUS_LABELS[o.status] || o.status,
        String(o.itemsCount),
        formatPdfMoney(o.total),
      ]),
      theme: "grid",
      headStyles: { fillColor: slateHead, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: altRow },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(i, pageCount);
  }

  const safeName = clientName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "client";
  doc.save(`statistiques-client-${safeName}-${generatedAt.toISOString().slice(0, 10)}.pdf`);
}
