const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "orders", "page.tsx");
let s = fs.readFileSync(filePath, "utf8");

const start = s.indexOf("  const handlePrintInvoice = (order: Order) => {");
const end = s.indexOf("  const getStatusIcon", start);
if (start === -1 || end === -1) {
  console.error("Could not find handlePrintInvoice block");
  process.exit(1);
}

const replacement = `  const handlePrintInvoice = (order: Order) => {
    printInvoiceSafely(order);
  };

`;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(filePath, s);
console.log("orders page print fixed");
