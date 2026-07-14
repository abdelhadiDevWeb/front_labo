/** Canonical values stored in User.laboType and Product unique_data.type_labo */
export const LABO_TYPE_VALUES = [
  "Labo médical",
  "labo d'ana pathologies",
] as const;

export type LaboTypeValue = (typeof LABO_TYPE_VALUES)[number];

export const LABO_TYPE_OPTIONS: Array<{ value: LaboTypeValue; label: string }> = [
  {
    value: "Labo médical",
    label: "Laboratoire d'Analyses Médicales",
  },
  {
    value: "labo d'ana pathologies",
    label: "Laboratoire de Cytologie et d'Anatomie Pathologique",
  },
];

export const isLaboTypeValue = (value: unknown): value is LaboTypeValue =>
  typeof value === "string" &&
  (LABO_TYPE_VALUES as readonly string[]).includes(value);
