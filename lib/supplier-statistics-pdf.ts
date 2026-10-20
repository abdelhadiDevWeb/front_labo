import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ClientData, DetailedSupplierStatistics } from "@/lib/api";
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

const formatDA = formatPdfMoney;

const formatDayKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
};

const formatMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).toLocaleDateString(
    "fr-FR",
    { month: "long", year: "numeric" }
  );
};

const supplierDisplayName = (profile: ClientData | null) => {
  if (!profile) return "Fournisseur";
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return name || profile.email || "Fournisseur";
};

type JsPdfWithPages = jsPDF & {
  lastAutoTable?: { finalY: number };
};

export async function downloadSupplierStatisticsPdf(options: {
  statistics: DetailedSupplierStatistics;
  profile: ClientData | null;
  /** Chart snapshots taken from the statistics page. */
  charts?: PdfChartImage[];
}): Promise<void> {
  const { statistics: s, profile, charts = [] } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
  const footBg: RGB = [241, 245, 249];

  const generatedAt = new Date();
  const reportId = `FOUR-${generatedAt
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${String(generatedAt.getHours()).padStart(2, "0")}${String(
    generatedAt.getMinutes()
  ).padStart(2, "0")}`;

  const periodTitle = s.periodLabel || "Période sélectionnée";
  const periodRange = s.periodRangeLabel || "";
  const supplierName = supplierDisplayName(profile);

  const drawHeader = () => {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 0, pageW, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RAPPORT STATISTIQUE FOURNISSEUR", marginX, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Analyse des ventes & réserves — usage interne", marginX, 19);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(supplierName, pageW - marginX, 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(reportId, pageW - marginX, 19, { align: "right" });
  };

  const drawFooter = (pageNumber: number, pageCount: number) => {
    doc.setDrawColor(line[0], line[1], line[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageH - 14, pageW - marginX, pageH - 14);

    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "Document confidentiel — généré automatiquement à des fins de suivi comptable / commercial.",
      marginX,
      pageH - 8
    );
    doc.text(`Page ${pageNumber} / ${pageCount}`, pageW - marginX, pageH - 8, {
      align: "right",
    });
  };

  drawHeader();

  let y = 36;

  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Informations du rapport", marginX, y);
  y += 6;

  doc.setDrawColor(line[0], line[1], line[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, y, contentW, 28, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  const metaLeft = [
    `Fournisseur : ${supplierName}`,
    `Email : ${profile?.email || "—"}`,
    `Wilaya : ${profile?.wilaya || "—"}`,
  ];
  const metaRight = [
    `Période : ${periodTitle}`,
    `Intervalle : ${periodRange || "—"}`,
    `Émis le : ${generatedAt.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  ];
  metaLeft.forEach((t, i) => {
    doc.text(pdfSafeText(t), marginX + 4, y + 8 + i * 6, { maxWidth: contentW / 2 - 6 });
  });
  metaRight.forEach((t, i) => {
    doc.text(pdfSafeText(t), marginX + contentW / 2 + 2, y + 8 + i * 6, { maxWidth: contentW / 2 - 6 });
  });
  y += 36;

  let sectionNumber = 0;
  const sectionTitle = (title: string) => {
    if (y > pageH - 40) {
      doc.addPage();
      drawHeader();
      y = 36;
    }
    sectionNumber += 1;
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${sectionNumber}. ${title}`.toUpperCase(), marginX, y);
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.5);
    doc.line(marginX, y + 2, marginX + 42, y + 2);
    y += 8;
  };

  const tableStyles = {
    font: "helvetica" as const,
    fontSize: 8.5,
    cellPadding: 2.6,
    textColor: ink,
    lineColor: line,
    lineWidth: 0.2,
  };

  sectionTitle("Synthèse commerciale");

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Revenus totaux (période)", formatDA(s.totalRevenue)],
      ["Nombre de réserves", String(s.totalOrders)],
      ["Articles vendus", String(s.totalProductsSold)],
      ["Clients actifs", String(s.totalClients)],
      [
        "Panier moyen",
        s.totalOrders > 0 ? formatDA(s.totalRevenue / s.totalOrders) : formatDA(0),
      ],
    ],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3.2,
      textColor: ink,
      lineColor: line,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: accent,
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.55, fontStyle: "bold" },
      1: { cellWidth: contentW * 0.45, halign: "right" },
    },
    alternateRowStyles: { fillColor: altRow },
  });
  y = ((doc as JsPdfWithPages).lastAutoTable?.finalY || y) + 10;

  if (s.comparison) {
    sectionTitle("Comparaison vs période précédente");
    const cmp = s.comparison;
    const revSign = cmp.revenueChange >= 0 ? "+" : "";
    const ordersSign = cmp.ordersChange >= 0 ? "+" : "";
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Mesure", "Période actuelle", "Période précédente", "Variation"]],
      body: [
        [
          "Revenus",
          formatDA(cmp.currentMonthRevenue),
          formatDA(cmp.previousMonthRevenue),
          `${revSign}${cmp.revenueChange.toFixed(1)} %`,
        ],
        [
          "Réserves",
          String(cmp.currentMonthOrders),
          String(cmp.previousMonthOrders),
          `${ordersSign}${cmp.ordersChange.toFixed(1)} %`,
        ],
      ],
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 3,
        textColor: ink,
        lineColor: line,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: slateHead,
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: altRow },
    });
    y = ((doc as JsPdfWithPages).lastAutoTable?.finalY || y) + 10;
  }

  if (charts.length > 0) {
    sectionTitle("Graphiques");
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

  sectionTitle("Répartition mensuelle");

  const monthlyEntries = Object.entries(s.monthlyRevenue || {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const monthlyOrderMap = s.monthlyOrders || {};
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Mois", "Revenus", "Réserves"]],
    body:
      monthlyEntries.length > 0
        ? monthlyEntries.map(([key, revenue]) => [
            formatMonthKey(key),
            formatDA(revenue),
            String(monthlyOrderMap[key] ?? 0),
          ])
        : [["—", formatDA(0), "0"]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: ink,
      lineColor: line,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: accent,
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
    alternateRowStyles: { fillColor: altRow },
    foot: [["Total période", formatDA(s.totalRevenue), String(s.totalOrders)]],
    footStyles: {
      fillColor: footBg,
      textColor: ink,
      fontStyle: "bold",
    },
  });
  y = ((doc as JsPdfWithPages).lastAutoTable?.finalY || y) + 10;

  const dailyEntries = Object.entries(s.dailyRevenue || {})
    .filter(([, revenue]) => revenue > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  if ((s.period || "1m") === "1m" && dailyEntries.length > 0) {
    sectionTitle(`Revenus quotidiens${s.dailyRevenueMonth ? ` — ${s.dailyRevenueMonth}` : ""}`);
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Jour", "Revenus"]],
      body: dailyEntries.map(([key, revenue]) => [formatDayKey(key), formatDA(revenue)]),
      theme: "grid",
      styles: tableStyles,
      headStyles: { fillColor: slateHead, textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" } },
      alternateRowStyles: { fillColor: altRow },
      foot: [["Total", formatDA(dailyEntries.reduce((sum, [, v]) => sum + v, 0))]],
      footStyles: { fillColor: footBg, textColor: ink, fontStyle: "bold" },
    });
    y = ((doc as JsPdfWithPages).lastAutoTable?.finalY || y) + 10;
  }

  sectionTitle("Statut des réserves");

  const statusKeys = Object.keys(STATUS_LABELS);
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Statut", "Nombre", "Montant"]],
    body: statusKeys.map((k) => [
      STATUS_LABELS[k],
      String(s.ordersByStatus?.[k as keyof typeof s.ordersByStatus] || 0),
      formatDA(s.revenueByStatus?.[k as keyof typeof s.revenueByStatus] || 0),
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: ink,
      lineColor: line,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: slateHead,
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
    alternateRowStyles: { fillColor: altRow },
  });
  y = ((doc as JsPdfWithPages).lastAutoTable?.finalY || y) + 10;

  sectionTitle("Meilleurs produits (ventes détaillées)");

  const bestProducts = s.bestProducts || [];
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["#", "Produit", "Qté", "Revenus", "Réserves"]],
    body:
      bestProducts.length > 0
        ? bestProducts.map((p, i) => [
            String(i + 1),
            p.name,
            String(p.quantity),
            formatDA(p.revenue),
            String(p.orders),
          ])
        : [["—", "Aucun produit", "0", formatDA(0), "0"]],
    foot:
      bestProducts.length > 0
        ? [
            [
              "",
              "Total",
              String(bestProducts.reduce((sum, p) => sum + p.quantity, 0)),
              formatDA(bestProducts.reduce((sum, p) => sum + p.revenue, 0)),
              String(bestProducts.reduce((sum, p) => sum + p.orders, 0)),
            ],
          ]
        : undefined,
    footStyles: { fillColor: footBg, textColor: ink, fontStyle: "bold" },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      textColor: ink,
      lineColor: line,
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: accent,
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: contentW - 70 },
      2: { cellWidth: 18, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 14,halign: "right" },
    },
    alternateRowStyles: { fillColor: altRow },
  });
  y = ((doc as JsPdfWithPages).lastAutoTable?.finalY || y) + 10;

  const byRevenue = s.topProductsByRevenue || [];
  if (byRevenue.length > 0) {
    sectionTitle("Top produits par revenus");
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["#", "Produit", "Revenus"]],
      body: byRevenue.map((p, i) => [String(i + 1), p.name, formatDA(p.revenue)]),
      theme: "grid",
      styles: { ...tableStyles, overflow: "linebreak" },
      headStyles: { fillColor: slateHead, textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        2: { cellWidth: 34, halign: "right" },
      },
      alternateRowStyles: { fillColor: altRow },
    });
    y = ((doc as JsPdfWithPages).lastAutoTable?.finalY || y) + 10;
  }

  sectionTitle("Top clients");

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["#", "Client", "Dépenses", "Réserves", "Articles"]],
    body:
      (s.topCustomers || []).length > 0
        ? s.topCustomers.map((row, i) => {
            const name =
              [row.buyer?.firstName, row.buyer?.lastName].filter(Boolean).join(" ") ||
              row.buyer?.email ||
              "Client";
            return [
              String(i + 1),
              name,
              formatDA(row.totalSpent),
              String(row.ordersCount),
              String(row.productsCount),
            ];
          })
        : [["—", "Aucun client", formatDA(0), "0", "0"]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      textColor: ink,
      lineColor: line,
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: slateHead,
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: contentW - 70 },
      2: { cellWidth: 28,halign: "right" },
      3: { cellWidth: 18,halign: "right" },
      4: { cellWidth: 14,halign: "right" },
    },
    alternateRowStyles: { fillColor: altRow },
  });
  y = ((doc as JsPdfWithPages).lastAutoTable?.finalY || y) + 12;

  if (y > pageH - 36) {
    doc.addPage();
    drawHeader();
    y = 36;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(
    "Les montants sont exprimés en dinars algériens (DA). Ce rapport reflète les réserves reçues sur la période sélectionnée.",
    marginX,
    y,
    { maxWidth: contentW }
  );
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.text("Visa / cachet (optionnel) : ____________________________", marginX, y);
  doc.text("Date : ____ / ____ / ________", pageW - marginX - 55, y);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(i, pageCount);
  }

  const safeName = supplierName.replace(/[^\w\-]+/g, "_").slice(0, 40);
  const periodSlug = (s.period || "1m").toUpperCase();
  doc.save(`Rapport_Stats_Fournisseur_${safeName}_${periodSlug}_${reportId}.pdf`);
}
