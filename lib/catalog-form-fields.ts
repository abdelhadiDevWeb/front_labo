/** Column schemas for one-by-one supplier create (same as Excel templates). */

export type SingleCatalogType = "machine" | "service" | "product";

export type CategoryKind = "machine" | "services" | "product";

export interface CatalogFieldDef {
  label: string;
  desc: string;
  required?: boolean;
  inputType?: "text" | "number";
}

/** Fields filled automatically or via dedicated upload UI — not text inputs */
export const AUTO_FILLED_FIELDS = new Set([
  "Catégorie",
  "Sous catégorie",
  "Image",
  "Fiche Technique",
]);

export const isFicheTechniqueField = (label: string) =>
  /fiche\s*technique/i.test(label.trim());

export const isImageField = (label: string) => /^images?$/i.test(label.trim());

export const MACHINE_COLUMNS: CatalogFieldDef[] = [
  { label: "Réference", desc: "Référence de la machine" },
  { label: "Désignation", desc: "Nom de la machine", required: true },
  { label: "Conditionnement", desc: "Conditionnement" },
  { label: "N° lot", desc: "Numéro de lot" },
  { label: "DDP", desc: "Date de péremption" },
  { label: "Quantité", desc: "Quantité en stock", inputType: "number" },
  { label: "Disponibilité", desc: "Ex: D, ND, Arrivage" },
  { label: "Marque", desc: "Marque" },
  { label: "Catégorie", desc: "Ignorée — prise depuis votre sélection" },
  { label: "Sous catégorie", desc: "Ignorée — prise depuis votre sélection" },
  { label: "Commande", desc: "Statut commande" },
  { label: "R %", desc: "Remise", inputType: "number" },
  { label: "Fiche Technique", desc: "Nom du fichier PDF (ex: fiche1.pdf)" },
  { label: "Image", desc: "Images" },
  { label: "Prix HT", desc: "Prix hors taxe", required: true, inputType: "number" },
  { label: "Prix TTC", desc: "Prix TTC", inputType: "number" },
  { label: "TVA", desc: "Taux de TVA", inputType: "number" },
  { label: "Assistance technique", desc: "Assistance technique" },
];

export const SERVICE_COLUMNS: CatalogFieldDef[] = [
  { label: "Désignation", desc: "Nom du service", required: true },
  { label: "Marque", desc: "Marque" },
  { label: "Catégorie", desc: "Ignorée — prise depuis votre sélection" },
  { label: "Sous catégorie", desc: "Ignorée — prise depuis votre sélection" },
  { label: "Disponibilité", desc: "Ex: D, ND, Arrivage" },
  { label: "Image", desc: "Images" },
  { label: "Fiche Technique", desc: "Nom du fichier PDF (ex: fiche1.pdf)" },
  { label: "R %", desc: "Remise", inputType: "number" },
  { label: "Prix HT", desc: "Prix hors taxe", required: true, inputType: "number" },
  { label: "Prix TTC", desc: "Prix TTC", inputType: "number" },
  { label: "TVA", desc: "Taux de TVA", inputType: "number" },
];

export const PRODUCT_COLUMNS: CatalogFieldDef[] = [
  { label: "Réference", desc: "Référence du produit" },
  { label: "Désignation", desc: "Nom du produit", required: true },
  { label: "Conditionnement", desc: "Conditionnement" },
  { label: "N° lot", desc: "Numéro de lot" },
  { label: "DDP", desc: "Date de péremption" },
  { label: "Quantité", desc: "Quantité en stock", inputType: "number" },
  { label: "Disponibilité", desc: "Ex: D, ND, Arrivage" },
  { label: "Marque", desc: "Marque" },
  { label: "Catégorie", desc: "Ignorée — prise depuis votre sélection" },
  { label: "Sous catégorie", desc: "Ignorée — prise depuis votre sélection" },
  { label: "Commande", desc: "Statut commande" },
  { label: "R %", desc: "Remise", inputType: "number" },
  { label: "Fiche Technique", desc: "Nom du fichier PDF (ex: fiche1.pdf)" },
  { label: "Image", desc: "Images" },
  { label: "Prix HT", desc: "Prix hors taxe", required: true, inputType: "number" },
  { label: "Prix TTC", desc: "Prix TTC", inputType: "number" },
  { label: "TVA", desc: "Taux de TVA", inputType: "number" },
];

export const columnsForType = (type: SingleCatalogType): CatalogFieldDef[] => {
  if (type === "machine") return MACHINE_COLUMNS;
  if (type === "service") return SERVICE_COLUMNS;
  return PRODUCT_COLUMNS;
};

/** Editable text/number fields for the one-by-one form */
export const editableFieldsForType = (type: SingleCatalogType): CatalogFieldDef[] =>
  columnsForType(type).filter(
    (col) => !AUTO_FILLED_FIELDS.has(col.label) && !isFicheTechniqueField(col.label) && !isImageField(col.label)
  );

export const typeHasFicheTechnique = (type: SingleCatalogType): boolean =>
  columnsForType(type).some((col) => isFicheTechniqueField(col.label));

const normalizeLabel = (label: string) =>
  label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isCategoryLabel = (label: string) => {
  const n = normalizeLabel(label);
  return (
    n === "categorie" ||
    n === "category" ||
    n === "subcategory" ||
    (n.includes("sous") && n.includes("cat"))
  );
};

const isDesignationLabel = (label: string) =>
  ["designation", "name", "nom"].includes(normalizeLabel(label));

const NUMERIC_LABEL = /prix|quantite|tva|remise|^r ?%$/;

/**
 * Columns of the admin's category Excel (header row), falling back to the
 * default schema of the type when the category has no Excel.
 */
export const columnsForCategory = (
  type: SingleCatalogType,
  excelColumns?: string[] | null
): CatalogFieldDef[] => {
  const defaults = columnsForType(type);
  if (!excelColumns || excelColumns.length === 0) return defaults;

  const defaultsByLabel = new Map(defaults.map((col) => [normalizeLabel(col.label), col]));
  const columns: CatalogFieldDef[] = excelColumns.map((label) => {
    const known = defaultsByLabel.get(normalizeLabel(label));
    const field: CatalogFieldDef = known
      ? { ...known, label }
      : {
          label,
          desc: "",
          inputType: NUMERIC_LABEL.test(normalizeLabel(label)) ? "number" : "text",
        };
    if (isDesignationLabel(label)) field.required = true;
    return field;
  });

  // The backend refuses items without a Désignation / nom.
  if (!columns.some((col) => isDesignationLabel(col.label))) {
    columns.unshift({ label: "Désignation", desc: "Nom de l'article", required: true });
  }
  return columns;
};

/** Editable text/number fields among the given columns */
export const editableFieldsFromColumns = (columns: CatalogFieldDef[]): CatalogFieldDef[] =>
  columns.filter(
    (col) =>
      !AUTO_FILLED_FIELDS.has(col.label) &&
      !isCategoryLabel(col.label) &&
      !isFicheTechniqueField(col.label) &&
      !isImageField(col.label)
  );

export const columnsHaveFicheTechnique = (columns: CatalogFieldDef[]): boolean =>
  columns.some((col) => isFicheTechniqueField(col.label));

export const catalogTypeToCategoryKind = (type: SingleCatalogType): CategoryKind => {
  if (type === "machine") return "machine";
  if (type === "service") return "services";
  return "product";
};

export const createEndpointForType = (type: SingleCatalogType): string => {
  if (type === "machine") return "/machines";
  if (type === "service") return "/services";
  return "/products/single";
};
