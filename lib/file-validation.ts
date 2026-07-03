const PDF_MIME = "application/pdf";
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const readFileHeader = async (file: File, length = 4): Promise<Uint8Array> => {
  const slice = file.slice(0, length);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
};

const matchesMagic = (header: Uint8Array, magic: number[]): boolean =>
  magic.every((byte, index) => header[index] === byte);

export const validatePdfFile = async (
  file: File,
  maxSizeMb = 5
): Promise<FileValidationResult> => {
  if (file.type !== PDF_MIME) {
    return { valid: false, error: "Seuls les fichiers PDF sont acceptés" };
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return { valid: false, error: `La taille du fichier ne doit pas dépasser ${maxSizeMb}MB` };
  }
  try {
    const header = await readFileHeader(file);
    if (!matchesMagic(header, PDF_MAGIC)) {
      return { valid: false, error: "Le fichier n'est pas un PDF valide" };
    }
  } catch {
    return { valid: false, error: "Impossible de lire le fichier" };
  }
  return { valid: true };
};

export const validateImageFile = async (
  file: File,
  maxSizeMb = 5
): Promise<FileValidationResult> => {
  if (!IMAGE_MIMES.has(file.type)) {
    return { valid: false, error: "Format d'image non supporté (JPEG, PNG, WebP, GIF)" };
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return { valid: false, error: `La taille de l'image ne doit pas dépasser ${maxSizeMb}MB` };
  }
  return { valid: true };
};

export const validatePaymentProofFile = async (file: File): Promise<FileValidationResult> => {
  return validatePdfFile(file, 10);
};
