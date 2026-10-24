/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import type { CalmIcmalItem, CalmQuantityContribution } from "./calm-icmal";

/**
 * "Bu sayı nasıl oluştu?" sorusunun yanıtı: bir icmal kaleminin hesap izini sade Türkçeyle
 * anlatır ve mühendisin kendi aracında yeniden hesaplayabileceği metraj cetvelini üretir.
 */

type QuantitySource = CalmQuantityContribution["quantitySource"];

export const QUANTITY_SOURCE_LABEL: Record<QuantitySource, string> = {
  qto: "IFC ölçü setinden (Qto) okundu",
  geometry: "Geometriden hesaplandı",
  property: "IFC özelliğinden okundu",
  estimate: "Tahmin (incelenmeli)",
};

const SOURCE_SENTENCE: Record<QuantitySource, string> = {
  qto: "IFC ölçü setinden (Qto) okundu",
  geometry: "geometriden hesaplandı",
  property: "IFC özelliğinden okundu",
  estimate: "tahmin edildi ve incelenmeli",
};

const SOURCE_ORDER: QuantitySource[] = ["qto", "geometry", "property", "estimate"];

export function formatQuantity(value: number, decimals = 2): string {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function countBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  return counts;
}

/** Kalemin hesap adımları; her adım tek cümle, sayılar Türkçe biçimde. */
export function explainIcmalItem(item: CalmIcmalItem): string[] {
  const unit = item.unit;
  const contributions = item.contributions;
  const steps: string[] = [];

  if (!contributions || contributions.length === 0) {
    steps.push("Bu kalemin eleman listesi bu kayıtta yok; miktar kaydedilmiş icmal satırından gösteriliyor.");
  } else {
    const storeyCount = countBy(contributions, (c) => c.storeyLabel).size;
    steps.push(`Modelde bu kaleme giren ${contributions.length} eleman bulundu; elemanlar ${storeyCount} katta.`);
    const sources = countBy(contributions, (c) => c.quantitySource);
    const sourceParts = SOURCE_ORDER.filter((source) => sources.has(source)).map(
      (source) => `${sources.get(source)} elemanın miktarı ${SOURCE_SENTENCE[source]}`,
    );
    steps.push(`${sourceParts.join(", ")}.`);
  }

  if (item.grossAvailable && item.deductedOpeningQuantity > 0) {
    steps.push(
      `Brüt ${formatQuantity(item.grossQuantity)} ${unit} − boşluk ${formatQuantity(item.deductedOpeningQuantity)} ${unit} = net ${formatQuantity(item.netQuantity)} ${unit}. Boşluklar modeldeki değerlerdir.`,
    );
  } else if (item.grossAvailable) {
    steps.push(`Bu kalemde düşülecek boşluk yok; net miktar ${formatQuantity(item.netQuantity)} ${unit}.`);
  } else {
    steps.push(
      `Modelde bu kalem için brüt ve boşluk verisi yok; net ${formatQuantity(item.netQuantity)} ${unit} doğrudan elemanların net miktarlarının toplamıdır. Hiçbir değer çarpanla üretilmedi.`,
    );
  }

  steps.push(`Kalemin hesap notu: ${item.formulaNote}`);
  return steps;
}

function csvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvLine(fields: string[]): string {
  return fields.map(csvField).join(";");
}

const optionalQuantity = (value: number | null) => (value === null ? "" : formatQuantity(value, 3));

/** Türkçe Excel'in doğrudan açtığı metraj cetveli: UTF-8 BOM, noktalı virgül, virgüllü ondalık. */
export function cetvelCsv(item: CalmIcmalItem, meta: { fileName: string; generatedAt: string }): string {
  const contributions = item.contributions ?? [];
  const lines = [
    csvLine(["Kalem", item.title]),
    csvLine(["Poz", item.pozCode.startsWith("UNRESOLVED:") ? "Çözülmedi" : item.pozCode]),
    csvLine(["Kaynak dosya", meta.fileName]),
    csvLine(["Oluşturma", meta.generatedAt]),
    csvLine(["Kural", item.formulaNote]),
    "",
    csvLine(["Sıra", "Eleman", "GlobalId", "IFC sınıfı", "Kat", "Mahal", "Katman", "Brüt", "Boşluk", "Net", "Birim", "Miktar kaynağı"]),
    ...contributions.map((c, index) =>
      csvLine([
        String(index + 1), c.name, c.globalId, c.ifcClass, c.storeyLabel, c.roomLabel ?? "", c.layer ?? "",
        optionalQuantity(c.grossQuantity), optionalQuantity(c.openingQuantity), formatQuantity(c.netQuantity, 3),
        item.unit, QUANTITY_SOURCE_LABEL[c.quantitySource],
      ]),
    ),
    csvLine(["", "", "", "", "", "", "", "", "Toplam", formatQuantity(item.netQuantity, 3), item.unit, ""]),
  ];
  return `﻿${lines.join("\r\n")}`;
}
