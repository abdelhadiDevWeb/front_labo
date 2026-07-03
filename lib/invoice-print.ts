import { escapeHtml } from "@/lib/security";

interface InvoiceBuyer {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface InvoiceProduct {
  name: string;
  price: number;
  quantity: number;
}

interface InvoiceOrder {
  _id: string;
  createdAt: string;
  status: string;
  total: number;
  idBuyer?: InvoiceBuyer | string | null;
  products: InvoiceProduct[];
}

export const printInvoiceSafely = (order: InvoiceOrder): void => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const orderRef = escapeHtml(order._id.slice(-8).toUpperCase());
  const orderDate = escapeHtml(new Date(order.createdAt).toLocaleString("fr-FR"));
  const status = escapeHtml(order.status);
  const statusClass = escapeHtml(order.status.replace(" ", "-"));
  const total = escapeHtml(order.total.toFixed(2));

  const buyerSection =
    order.idBuyer && typeof order.idBuyer === "object"
    ? `
      <p><strong>${escapeHtml(order.idBuyer.firstName)} ${escapeHtml(order.idBuyer.lastName)}</strong></p>
      <p>${escapeHtml(order.idBuyer.email)}</p>
      ${order.idBuyer.phone ? `<p>Tél: ${escapeHtml(order.idBuyer.phone)}</p>` : ""}
    `
    : `<p><em>Informations client non disponibles</em></p>`;

  const productRows = order.products
    .map(
      (product) => `
        <tr>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(product.price.toFixed(2))} DA</td>
          <td>${escapeHtml(product.quantity)}</td>
          <td>${escapeHtml((product.price * product.quantity).toFixed(2))} DA</td>
        </tr>
      `
    )
    .join("");

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Facture - Commande ${orderRef}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .invoice-header { border-bottom: 3px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
          .invoice-header h1 { color: #16a34a; font-size: 28px; margin-bottom: 10px; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-section { flex: 1; }
          .info-section h3 { color: #16a34a; margin-bottom: 10px; font-size: 16px; }
          .info-section p { margin: 5px 0; font-size: 14px; }
          .products-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .products-table th { background: #16a34a; color: white; padding: 12px; text-align: left; }
          .products-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .total-section { text-align: right; margin-top: 20px; }
          .total-amount { font-size: 24px; font-weight: bold; color: #16a34a; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .status-en-cours { background: #dbeafe; color: #1e40af; }
          .status-on-route { background: #fed7aa; color: #9a3412; }
          .status-arrived { background: #d1fae5; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>FACTURE</h1>
          <p>Commande #${orderRef}</p>
          <p>Date: ${orderDate}</p>
        </div>
        <div class="invoice-info">
          <div class="info-section">
            <h3>Client</h3>
            ${buyerSection}
          </div>
          <div class="info-section">
            <h3>Statut</h3>
            <span class="status-badge status-${statusClass}">${status}</span>
          </div>
        </div>
        <table class="products-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Prix unitaire</th>
              <th>Quantité</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${productRows}</tbody>
        </table>
        <div class="total-section">
          <p><strong>Total: <span class="total-amount">${total} DA</span></strong></p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};
