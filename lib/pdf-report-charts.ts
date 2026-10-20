import type { jsPDF } from "jspdf";

export type PdfChartImage = {
  title: string;
  dataUrl: string;
  /** Pixel ratio width / height, used to keep the chart proportions in the PDF. */
  ratio: number;
};

/** jsPDF core fonts cannot draw the narrow no-break spaces used by fr-* number formatting. */
export const pdfSafeText = (text: string) => text.replace(/[\u202F\u00A0\u2009]/g, " ");

export const formatPdfMoney = (n: number) =>
  `${pdfSafeText(Math.round(n || 0).toLocaleString("fr-FR"))} DA`;

/**
 * Snapshot every chart canvas inside `root` marked with `data-pdf-chart="<title>"`,
 * in page order. Canvases are transparent, so each one is flattened on white.
 */
export function collectPdfCharts(root: HTMLElement | null): PdfChartImage[] {
  if (!root) return [];
  const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-chart]"));
  const charts: PdfChartImage[] = [];
  for (const block of blocks) {
    const canvas = block.querySelector("canvas");
    if (!canvas || canvas.width === 0 || canvas.height === 0) continue;
    const flat = document.createElement("canvas");
    flat.width = canvas.width;
    flat.height = canvas.height;
    const ctx = flat.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(canvas, 0, 0);
    charts.push({
      title: block.dataset.pdfChart || "Graphique",
      dataUrl: flat.toDataURL("image/png"),
      ratio: canvas.width / canvas.height,
    });
  }
  return charts;
}

/**
 * Draw charts two per row (full width when alone on the last row).
 * Returns the new Y position.
 */
export function drawPdfCharts(
  doc: jsPDF,
  charts: PdfChartImage[],
  opts: {
    y: number;
    marginX: number;
    contentW: number;
    pageH: number;
    /** Called after doc.addPage(); must return the first usable Y. */
    onNewPage: () => number;
    ink: [number, number, number];
    line: [number, number, number];
  }
): number {
  const { marginX, contentW, pageH, onNewPage, ink, line } = opts;
  let y = opts.y;
  const gap = 6;
  const bottomLimit = pageH - 20;

  for (let i = 0; i < charts.length; i += 2) {
    const pair = charts.slice(i, i + 2);
    const colW = pair.length === 2 ? (contentW - gap) / 2 : contentW;
    const imageHeights = pair.map((c) => Math.min(colW / Math.max(c.ratio, 0.5), 85));
    const rowH = Math.max(...imageHeights) + 12;

    if (y + rowH > bottomLimit) {
      doc.addPage();
      y = onNewPage();
    }

    pair.forEach((chart, idx) => {
      const x = marginX + idx * (colW + gap);
      const imgH = imageHeights[idx];
      const imgW = Math.min(colW - 4, imgH * chart.ratio);

      doc.setDrawColor(line[0], line[1], line[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, colW, rowH - 2, 2, 2, "S");

      doc.setTextColor(ink[0], ink[1], ink[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(pdfSafeText(chart.title), x + 3, y + 5.5, { maxWidth: colW - 6 });

      doc.addImage(chart.dataUrl, "PNG", x + (colW - imgW) / 2, y + 8, imgW, imgH, undefined, "FAST");
    });

    y += rowH + 4;
  }
  return y;
}
