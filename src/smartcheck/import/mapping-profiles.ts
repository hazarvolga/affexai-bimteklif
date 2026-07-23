import type { ColumnMapping } from "./normalize";

export type SmartCheckMappingProfile = {
  id: string;
  label: string;
  description: string;
  mapping: ColumnMapping;
};

/**
 * Known MEP workbook conventions. These are starting points for mapping only;
 * they never become canonical engineering or pricing rules.
 */
export const MEP_MAPPING_PROFILES: readonly SmartCheckMappingProfile[] = [
  {
    id: "mep-tr-standard-v1",
    label: "MEP · Türkçe standart",
    description: "Poz No / Açıklama / Birim / Miktar / Birim Fiyat / Zayiat",
    mapping: { headerRow: 1, positionCode: "Poz No", description: "Açıklama", unit: "Birim", quantity: "Miktar", price: "Birim Fiyat", wastePercent: "Zayiat" },
  },
  {
    id: "mep-quantity-price-v1",
    label: "MEP · miktar ve fiyat",
    description: "Poz / Tanım / Unit / Qty / Price / Waste",
    mapping: { headerRow: 1, positionCode: "Poz", description: "Tanım", unit: "Unit", quantity: "Qty", price: "Price", wastePercent: "Waste" },
  },
  {
    id: "mep-public-analysis-v1",
    label: "Kamu analiz şablonu",
    description: "Poz No / İmalatın Cinsi / Birim / Miktar / Birim Fiyat / Fire",
    mapping: { headerRow: 1, positionCode: "Poz No", description: "İmalatın Cinsi", unit: "Birim", quantity: "Miktar", price: "Birim Fiyat", wastePercent: "Fire" },
  },
];

export function getMappingProfile(profileId: string | undefined) {
  return MEP_MAPPING_PROFILES.find((profile) => profile.id === profileId);
}
