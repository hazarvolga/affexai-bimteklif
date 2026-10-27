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

/**
 * Real-world Turkish contractor, BIM (Allplan/Revit/ArchiCAD), and public tender (TOKİ/ÇŞB/EKAP) profiles.
 */
export const CONTRACTOR_MAPPING_PROFILES: readonly SmartCheckMappingProfile[] = [
  {
    id: "tr-auto-smart-v1",
    label: "Akıllı Otomatik Algılama (Önerilen)",
    description: "Antetli düz icmal, katlara göre pivot ve TOKİ/Allplan bloklarını otomatik tanır",
    mapping: { tableMode: "auto" },
  },
  {
    id: "tr-allplan-icmal-v1",
    label: "Allplan / BIM İcmal Metrajı",
    description: "Malzeme Pozu / Poz Açıklaması / Birim / Net Metraj (Antetli 16. satır başlık)",
    mapping: { headerRow: 16, tableMode: "flat_or_pivot", positionCode: "Malzeme Pozu", description: "Poz Açıklaması", unit: "Birim", quantity: "Net Metraj" },
  },
  {
    id: "tr-kat-pivot-icmal-v1",
    label: "Katlara / Bloklara Göre Pivot İcmal",
    description: "Poz No / İmalatın Tanımı / Birim / Katlar (B01..K04) / Toplam",
    mapping: { headerRow: 16, tableMode: "flat_or_pivot", positionCode: "Poz No", description: "İmalatın Tanımı", unit: "Birim", quantity: "Toplam" },
  },
  {
    id: "tr-toki-tekrarlayan-blok-v1",
    label: "TOKİ / Kamu Tekrarlayan Poz Bloklu Metraj Cetveli",
    description: "Her poz için POZ NO / İMALATIN ADI / BİRİMİ kartı ve Genel Toplam satırı",
    mapping: { tableMode: "repeating_blocks", positionCode: "POZ NO", description: "İMALATIN ADI", unit: "BİRİMİ", quantity: "Genel Toplam" },
  },
];

export const ALL_MAPPING_PROFILES: readonly SmartCheckMappingProfile[] = [
  ...CONTRACTOR_MAPPING_PROFILES,
  ...MEP_MAPPING_PROFILES,
];

export function getMappingProfile(profileId: string | undefined) {
  return ALL_MAPPING_PROFILES.find((profile) => profile.id === profileId);
}
