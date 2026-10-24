/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import { z } from "zod";
import type { CalmIcmalItem } from "./calm-icmal";
import { formatQuantity } from "./calculation-trace";

/**
 * Uzman doğrulama modu: mühendis her icmal satırını kendi hesabıyla karşılaştırır, kararını ve
 * notunu yazar; sonuç imzalanabilir bir rapor olarak indirilir. Tolerans, şirketin 3x3
 * politikasındaki metraj sapma sınırıdır (normatif değildir).
 */
export const VERIFICATION_TOLERANCE_PCT = 3;

export const VERIFICATION_STATUSES = ["dogru", "duzeltme", "emin_degil"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  dogru: "Doğru",
  duzeltme: "Düzeltme gerekli",
  emin_degil: "Emin değilim",
};

const lineVerificationSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(VERIFICATION_STATUSES),
  expertValue: z.number().finite().nonnegative().nullable(),
  note: z.string().max(2000),
  updatedAt: z.string(),
});

export type LineVerification = z.infer<typeof lineVerificationSchema>;

export interface ReviewerIdentity {
  name: string;
  title: string;
  registrationNo: string;
}

/** Sistem değerinin uzman değerinden yüzde sapması; uzman değeri yoksa veya 0 ise null. */
export function deviationPct(systemValue: number, expertValue: number | null): number | null {
  if (expertValue === null || expertValue <= 0) return null;
  return Number((((systemValue - expertValue) / expertValue) * 100).toFixed(2));
}

const isOutsideTolerance = (deviation: number | null) => deviation !== null && Math.abs(deviation) > VERIFICATION_TOLERANCE_PCT;

export function summarizeVerification(items: readonly CalmIcmalItem[], records: Readonly<Record<string, LineVerification>>) {
  const reviewed = items.map((item) => ({ item, record: records[item.id] })).filter((entry) => entry.record);
  return {
    total: items.length,
    reviewed: reviewed.length,
    correct: reviewed.filter((entry) => entry.record.status === "dogru").length,
    corrections: reviewed.filter((entry) => entry.record.status === "duzeltme").length,
    unsure: reviewed.filter((entry) => entry.record.status === "emin_degil").length,
    outsideTolerance: reviewed.filter((entry) => isOutsideTolerance(deviationPct(entry.item.netQuantity, entry.record.expertValue))).length,
  };
}

/** Tarayıcı deposundan okunan veri güvenilmezdir: şemaya uymayan kayıtlar atılır. */
export function parseVerificationRecords(raw: string | null): Record<string, LineVerification> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const entries = Object.entries(parsed as Record<string, unknown>).flatMap(([key, value]) => {
      const result = lineVerificationSchema.safeParse(value);
      return result.success && result.data.itemId === key ? [[key, result.data] as const] : [];
    });
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

function csvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const csvLine = (fields: string[]) => fields.map(csvField).join(";");

const formatPct = (value: number | null) => (value === null ? "" : formatQuantity(value, 2));

export function verificationReportCsv(input: {
  items: readonly CalmIcmalItem[];
  records: Readonly<Record<string, LineVerification>>;
  fileName: string;
  generatedAt: string;
  reviewer: ReviewerIdentity;
}): string {
  const { items, records, reviewer } = input;
  const summary = summarizeVerification(items, records);
  const rows = items.map((item) => {
    const record = records[item.id];
    const deviation = record ? deviationPct(item.netQuantity, record.expertValue) : null;
    const tolerance = deviation === null ? "" : isOutsideTolerance(deviation) ? "Dışında" : "İçinde";
    return csvLine([
      item.pozCode.startsWith("UNRESOLVED:") ? "Çözülmedi" : item.pozCode,
      item.title,
      item.unit,
      formatQuantity(item.netQuantity, 3),
      record?.expertValue === null || record?.expertValue === undefined ? "" : formatQuantity(record.expertValue, 3),
      formatPct(deviation),
      tolerance,
      record ? VERIFICATION_STATUS_LABEL[record.status] : "İncelenmedi",
      record?.note ?? "",
    ]);
  });
  const lines = [
    csvLine(["BIMMetraj uzman doğrulama raporu"]),
    csvLine(["Kaynak dosya", input.fileName]),
    csvLine(["Oluşturma", input.generatedAt]),
    csvLine(["Uzman", reviewer.name]),
    csvLine(["Unvan", reviewer.title]),
    csvLine(["Oda sicil no", reviewer.registrationNo]),
    csvLine(["Tolerans", `±%${VERIFICATION_TOLERANCE_PCT} (şirket politikası, normatif değildir)`]),
    csvLine([
      "Özet",
      `${summary.reviewed}/${summary.total} satır incelendi; ${summary.correct} doğru, ${summary.corrections} düzeltme, ${summary.unsure} emin değil; ${summary.outsideTolerance} satır tolerans dışında`,
    ]),
    "",
    csvLine(["Poz", "Kalem", "Birim", "Sistem değeri", "Uzman değeri", "Sapma %", "Tolerans", "Karar", "Not"]),
    ...rows,
    "",
    csvLine(["Bu rapor uzmanın kendi hesabıyla karşılaştırmasını kaydeder; resmî uygunluk kararı değildir."]),
    csvLine(["İmza", ""]),
    csvLine(["Tarih", ""]),
  ];
  return `﻿${lines.join("\r\n")}`;
}
