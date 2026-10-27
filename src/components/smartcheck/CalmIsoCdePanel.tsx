/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useMemo } from "react";
import type { CalmIcmalItem } from "@/ifc/calm-icmal";
import {
  evaluateIso19650Compliance,
  parseContainerIdentity,
  type CdeState,
  type EirDeliveryMilestone,
  type SuitabilityCode,
} from "@/smartcheck/rules/iso19650";
import { CdeWorkflowPanel } from "./CdeWorkflowPanel";
import { formatTrNumber } from "./calm-format";

interface CalmIsoCdePanelProps {
  projectTitle: string;
  allItems: readonly CalmIcmalItem[];
  documentId?: string | null;
  cdeStateInput: CdeState | "";
  setCdeStateInput: (value: CdeState | "") => void;
  suitabilityInput: SuitabilityCode | "";
  setSuitabilityInput: (value: SuitabilityCode | "") => void;
  revisionInput: string;
  setRevisionInput: (value: string) => void;
  deliveryStageInput: "COORDINATION" | "TENDER_OR_PERMIT";
  setDeliveryStageInput: (value: "COORDINATION" | "TENDER_OR_PERMIT") => void;
  eirMilestoneInput: EirDeliveryMilestone;
  setEirMilestoneInput: (value: EirDeliveryMilestone) => void;
}

/** TS EN ISO 19650-1/2 ve RG 33331 EK-2 CDE / LOIN bilgi yönetimi kartı. */
export function CalmIsoCdePanel({
  projectTitle, allItems, documentId, cdeStateInput, setCdeStateInput, suitabilityInput, setSuitabilityInput,
  revisionInput, setRevisionInput, deliveryStageInput, setDeliveryStageInput, eirMilestoneInput, setEirMilestoneInput,
}: CalmIsoCdePanelProps) {
  const isoContainerIdentity = useMemo(
    () => parseContainerIdentity(projectTitle),
    [projectTitle],
  );

  const iso19650Evaluation = useMemo(
    () =>
      evaluateIso19650Compliance({
        fileName: projectTitle,
        cdeState: cdeStateInput || null,
        suitabilityCode: suitabilityInput || null,
        revisionCode: revisionInput.trim() || null,
        targetDeliveryStage: deliveryStageInput,
        eirMilestone: eirMilestoneInput,
        elements: allItems.map((it) => ({
          id: it.id,
          guid: it.id && !/^row-\d+$/i.test(it.id) ? it.id : null,
          type: it.groupKey === "structural" ? "IfcBuildingElement" : "IfcCovering",
          name: it.title,
          storey: it.storeyBreakdown?.[0]?.storeyLabel || null,
          material: it.subtitle || null,
          pozNo: it.pozCode || null,
          hasAdmissibleQuantity: it.netQuantity > 0,
        })),
      }),
    [
      allItems,
      cdeStateInput,
      projectTitle,
      deliveryStageInput,
      eirMilestoneInput,
      revisionInput,
      suitabilityInput,
    ],
  );

  return (
    <>
      {/* TS EN ISO 19650-1/2 & RG 33331 EK-2 CDE / LOIN BİLGİ YÖNETİMİ KARTI */}
      <div className="mt-4 border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
            ISO 19650 / EN 17412 · LİSANSLI METİN İNCELEMESİ GEREKİR
          </span>
          <span className="stamp-badge bg-card text-foreground">
            LOIN ({iso19650Evaluation.loinMilestone?.targetLod ?? "LOD 350"}): %
            {formatTrNumber(
              iso19650Evaluation.loinMilestone?.overallCompletenessPercent ??
                iso19650Evaluation.loin.alphanumericCompletenessRatio * 100,
              1,
            )}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">CDE Durumu</span>
            <select
              aria-label="ISO 19650 CDE Durumu"
              value={cdeStateInput}
              onChange={(e) => setCdeStateInput(e.target.value as CdeState | "")}
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Seçilmedi</option>
              <option value="WIP">WIP (Çalışma)</option>
              <option value="SHARED">SHARED (Paylaşılan)</option>
              <option value="PUBLISHED">PUBLISHED (Yayımlanan)</option>
              <option value="ARCHIVED">ARCHIVED (Arşiv)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">Uygunluk Kodu</span>
            <select
              aria-label="ISO 19650 Uygunluk Kodu"
              value={suitabilityInput}
              onChange={(e) => setSuitabilityInput(e.target.value as SuitabilityCode | "")}
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Seçilmedi</option>
              <option value="S0">S0 (WIP)</option>
              <option value="S1">S1 (Koordinasyon)</option>
              <option value="S2">S2 (Bilgi İçin)</option>
              <option value="S3">S3 (İnceleme/Yorum)</option>
              <option value="S4">S4 (Aşama Onayı)</option>
              <option value="S5">S5 (Yetkilendirilmiş)</option>
              <option value="S6">S6 (PIM Yetkilendirme)</option>
              <option value="S7">S7 (AIM Yetkilendirme)</option>
              <option value="A1">A1 (İhale/İmalata Uygun)</option>
              <option value="A2">A2 (İmalata Uygun)</option>
              <option value="A3">A3 (İnşaata Uygun)</option>
              <option value="A4">A4 (As-Built Teslim)</option>
              <option value="A5">A5 (Varlık Yönetimi)</option>
              <option value="A6">A6 (Arşiv Onayı)</option>
              <option value="A7">A7 (Sözleşmesel Onay)</option>
              <option value="B">B (Arşiv)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">Revizyon Kodu</span>
            <input
              type="text"
              aria-label="ISO 19650 Revizyon Kodu"
              value={revisionInput}
              onChange={(e) => setRevisionInput(e.target.value)}
              placeholder="Örn: P01.01 veya C01/001"
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">Teslim Aşaması</span>
            <select
              aria-label="ISO 19650 Teslim Aşaması"
              value={deliveryStageInput}
              onChange={(e) => setDeliveryStageInput(e.target.value as "COORDINATION" | "TENDER_OR_PERMIT")}
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            >
              <option value="COORDINATION">Tasarım Koordinasyonu</option>
              <option value="TENDER_OR_PERMIT">İhale / e-PYS Ruhsat</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">EIR / LOIN Şablonu</span>
            <select
              aria-label="EIR LOIN Teslim Şablonu"
              value={eirMilestoneInput}
              onChange={(e) => setEirMilestoneInput(e.target.value as EirDeliveryMilestone)}
              className="w-full border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            >
              <option value="CONCEPT">Avan Proje (LOD 200)</option>
              <option value="DEFINITIVE">Kesin Proje (LOD 300)</option>
              <option value="IMPLEMENTATION">Uygulama / Ruhsat (LOD 350)</option>
              <option value="AS_BUILT">İş Sonu / As-Built (LOD 400)</option>
            </select>
          </label>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-muted-foreground">
            Dosya Adı Şablonu:{" "}
            <strong className="text-foreground">{isoContainerIdentity.namingStandard}</strong>
          </span>
          <span className="stamp-badge bg-card text-muted-foreground">Karar geçmişi: sunucuda kayıtlı</span>
        </div>

        <div className="mt-2.5 border border-border bg-card p-2.5 text-[11px] font-mono text-muted-foreground space-y-1.5">
          {iso19650Evaluation.cdeEvaluationStatus === "not_evaluated" ? (
            <div>
              CDE Değerlendirilmedi — Doküman CDE durumu, uygunluk ve revizyon kodu girildiğinde TS EN ISO 19650-2 geçiş kuralları denetlenir.
            </div>
          ) : iso19650Evaluation.errors.length === 0 ? (
            <div className="text-foreground font-semibold">
              CDE Durumu Geçerli ({iso19650Evaluation.cdeState} · {iso19650Evaluation.suitabilityCode ?? "—"} · {iso19650Evaluation.revisionCode ?? "—"})
            </div>
          ) : (
            <div className="text-primary font-semibold">
              {iso19650Evaluation.errors[0]}
            </div>
          )}
        </div>
        <CdeWorkflowPanel
          documentId={documentId}
          targetState={cdeStateInput}
          suitabilityCode={suitabilityInput}
          revisionCode={revisionInput}
        />
      </div>
    </>
  );
}
