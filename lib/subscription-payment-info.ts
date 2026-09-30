/**
 * Account shown to users who pay their subscription by CCP / BaridiMob.
 * Empty fields are hidden; if all are empty a "contact the admin" message is shown.
 */
export const CCP_PAYMENT_INFO = {
  accountHolder: "",
  ccpNumber: "",
  ccpKey: "",
  rip: "",
};

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
export const RECEIPT_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";

/** Returns an error message, or null when the receipt file is acceptable. */
export const validateReceiptFile = (file: File): string | null => {
  if (!/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) {
    return "Le reçu doit être une image (JPG, PNG, WEBP) ou un PDF";
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return "Le reçu ne doit pas dépasser 10 Mo";
  }
  return null;
};
