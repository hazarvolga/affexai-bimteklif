/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import {
  buildClientCsvTemplate,
  parseClientCsv,
  parseClientRows,
  parseClientXlsx,
  type ClientColumnMapping,
  type ClientImportResult,
} from "@/lib/client-excel-import";
import { buildClientXlsxTemplate } from "@/lib/client-xlsx";
import { CLIENT_STAGE_MAP } from "@/lib/client-notes";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ClientImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ClientImportModal({
  open,
  onOpenChange,
  onImported,
}: ClientImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"update" | "skip">("update");
  const [importResult, setImportResult] = useState<ClientImportResult | null>(null);
  const [mapping, setMapping] = useState<ClientColumnMapping | null>(null);

  const handleDownloadXlsxTemplate = async () => {
    try {
      const bytes = await buildClientXlsxTemplate();
      triggerDownload(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "BIMMetraj-Musteri-Sablonu.xlsx",
      );
      toast.success("Excel müşteri şablonu indirildi.");
    } catch {
      toast.error("Excel şablonu oluşturulamadı.");
    }
  };

  const handleDownloadCsvTemplate = () => {
    const csv = buildClientCsvTemplate();
    triggerDownload(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
      "BIMMetraj-Musteri-Sablonu.csv",
    );
    toast.success("CSV müşteri şablonu indirildi.");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    try {
      const lower = file.name.toLowerCase();
      let result: ClientImportResult;
      if (lower.endsWith(".csv") || file.type === "text/csv") {
        const text = await file.text();
        result = parseClientCsv(text, file.name);
      } else {
        const buffer = await file.arrayBuffer();
        result = await parseClientXlsx(buffer, file.name);
      }
      setImportResult(result);
      setMapping(result.detectedMapping);
      if (result.errors.length > 0) {
        toast.error(result.errors[0]);
      } else {
        toast.success(`${result.totalImported} müşteri satırı önizlemeye hazır.`);
      }
    } catch {
      toast.error("Dosya okunurken bir hata oluştu.");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateColumnMapping = (
    key: keyof Omit<ClientColumnMapping, "headerRowIndex">,
    colValue: string,
  ) => {
    if (!importResult || !mapping) return;
    const nextCol = colValue === "" ? null : Number(colValue);
    const nextMapping: ClientColumnMapping = {
      ...mapping,
      [key]: Number.isFinite(nextCol) ? nextCol : null,
    };
    setMapping(nextMapping);
    const reparsed = parseClientRows(importResult.rawRows, fileName, nextMapping);
    setImportResult(reparsed);
  };

  const handleConfirmImport = async () => {
    if (!importResult || importResult.clients.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/clients/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duplicateStrategy,
          clients: importResult.clients.map((c) => ({
            name: c.name,
            type: c.type,
            email: c.email,
            phone: c.phone,
            address: c.address,
            pipelineStage: c.pipelineStage,
            notes: c.notes,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Toplu müşteri aktarımı başarısız.");
      }
      toast.success(
        `Aktarım tamamlandı: ${data.createdCount} yeni eklendi, ${data.updatedCount} güncellendi${
          data.skippedCount ? `, ${data.skippedCount} atlandı` : ""
        }.`,
      );
      setImportResult(null);
      setMapping(null);
      onImported();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const mappingFields: Array<{
    key: keyof Omit<ClientColumnMapping, "headerRowIndex">;
    label: string;
  }> = [
    { key: "nameCol", label: "Müşteri Adı / Ünvan" },
    { key: "companyCol", label: "Firma / Kurum Adı" },
    { key: "emailCol", label: "E-posta" },
    { key: "phoneCol", label: "Telefon / GSM" },
    { key: "addressCol", label: "Adres / Şehir" },
    { key: "stageCol", label: "Pipeline Aşaması" },
    { key: "notesCol", label: "Görüşme Notu" },
    { key: "typeCol", label: "Tip (Şirket/Bireysel)" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground sm:max-w-4xl max-h-[90dvh] overflow-y-auto p-0">
        <DialogHeader className="p-6 border-b border-border bg-card">
          <DialogTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-500" />
            Akıllı Müşteri / Cari Excel & CSV İçe Aktarma (3 Katmanlı Adaptör)
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Şablon İndirme ve Dosya Yükleme Barı */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-foreground">
                1. Hazır Şablon veya Kendi Excel Dosyanız
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Kendi tuttuğunuz cari/müşteri Excel listesini doğrudan yükleyebilir veya örnek şablonumuzu indirip doldurabilirsiniz.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadXlsxTemplate}
                  className="text-xs gap-1.5"
                >
                  <Download size={14} /> Excel Şablonu (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCsvTemplate}
                  className="text-xs gap-1.5"
                >
                  <Download size={14} /> CSV Şablonu (.csv)
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 flex flex-col justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  2. Dosya Seçin (.xlsx veya .csv)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Üst antet satırları, birleştirilmiş hücreler ve ekstra sütunlar otomatik algılanır; ekstra sütunlar müşteri notlarına eklenir.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  disabled={parsing}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2"
                >
                  {parsing ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                  {fileName ? "Başka Dosya Seç" : "Excel / CSV Dosyası Seç"}
                </Button>
                {fileName && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {fileName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Katman 3: Sütun Eşleştirme ve Önizleme */}
          {importResult && mapping && (
            <div className="space-y-5">
              {importResult.warnings.length > 0 && (
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-300 flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    {importResult.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {importResult.headers.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-widest text-foreground">
                      Katman 3 — Otomatik Sütun Eşleştirmesi (İsterseniz Değiştirin)
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Mükerrer Kayıt Politikası:</span>
                      <select
                        value={duplicateStrategy}
                        onChange={(e) => setDuplicateStrategy(e.target.value as "update" | "skip")}
                        className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                      >
                        <option value="update">Mevcut Kaydı Güncelle ve Notları Birleştir</option>
                        <option value="skip">Mevcut Kayıtları Atla</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {mappingFields.map((field) => (
                      <label key={field.key} className="space-y-1 block">
                        <span className="text-[11px] font-semibold text-muted-foreground block">
                          {field.label}
                        </span>
                        <select
                          value={mapping[field.key] ?? ""}
                          onChange={(e) => updateColumnMapping(field.key, e.target.value)}
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                        >
                          <option value="">— Otomatik / Yok —</option>
                          {importResult.headers.map((h) => (
                            <option key={h.index} value={h.index}>
                              {h.label} {h.sample ? `(${h.sample.slice(0, 18)})` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-card px-4 py-2.5 border-b border-border flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Aktarılacak Müşteriler Önizlemesi ({importResult.clients.length} kayıt)
                  </span>
                  {importResult.skippedRowCount > 0 && (
                    <span className="text-muted-foreground">
                      {importResult.skippedRowCount} başlık/boş satır atlandı
                    </span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-background border-b border-border text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3">Müşteri / Ünvan</th>
                        <th className="py-2 px-3">Tip</th>
                        <th className="py-2 px-3">İletişim</th>
                        <th className="py-2 px-3">Aşama</th>
                        <th className="py-2 px-3">Aktarılacak Not / Ek Bilgiler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {importResult.clients.slice(0, 30).map((c, idx) => {
                        const stageMeta = CLIENT_STAGE_MAP[c.pipelineStage];
                        return (
                          <tr key={idx} className="bg-card/50">
                            <td className="py-2 px-3 font-semibold text-foreground">{c.name}</td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                {c.type === "company" ? <Building2 size={12} /> : <User size={12} />}
                                {c.type === "company" ? "Şirket" : "Bireysel"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              <div>{c.email || "-"}</div>
                              <div>{c.phone || "-"}</div>
                            </td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className={stageMeta.badgeClass}>
                                {stageMeta.label}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground max-w-xs truncate">
                              {c.extraFieldsSummary || (c.notes ? "Not mevcut" : "-")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-card border-t border-border flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          <Button
            disabled={!importResult || importResult.clients.length === 0 || submitting}
            onClick={handleConfirmImport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
          >
            {submitting && <RefreshCw size={14} className="animate-spin" />}
            {importResult?.clients.length
              ? `${importResult.clients.length} Müşteriyi İçe Aktar`
              : "Müşterileri İçe Aktar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
