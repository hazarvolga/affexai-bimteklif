import React, { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCdeWorkflow } from "@/hooks/useCdeWorkflow";
import {
  cdeMemberForUser,
  canSubmitCdeDecision,
  currentCdeRevision,
  requiresCdeReapproval,
} from "@/hooks/cde-workflow-model";
import type { CdeState, SuitabilityCode } from "@/smartcheck/rules/iso19650";

interface CdeWorkflowPanelProps {
  documentId?: string | null;
  targetState: CdeState | "";
  suitabilityCode: SuitabilityCode | "";
  revisionCode: string;
}

const roleLabels = {
  coordinator: "Koordinatör",
  approver: "Onaylayıcı",
  contributor: "Üretici",
  viewer: "Görüntüleyici",
} as const;

const actionLabels = {
  scope_created: "Yeni kanıt kapsamı",
  approve: "Onay",
  reject: "Ret",
  withdraw: "Geri çekme",
} as const;

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short", timeStyle: "short",
  }).format(date);
}

export function CdeWorkflowPanel({ documentId, targetState, suitabilityCode, revisionCode }: CdeWorkflowPanelProps) {
  const { user } = useAuth();
  const workflow = useCdeWorkflow(documentId);
  const [reason, setReason] = useState("");
  const member = cdeMemberForUser(workflow.project, user?.id);
  const activeRevision = currentCdeRevision(workflow.history);
  const awaitingReapproval = requiresCdeReapproval(workflow.history);
  const mayDecide = member?.projectRole === "coordinator" || member?.projectRole === "approver";
  const decisionReady = canSubmitCdeDecision(workflow.history, workflow.selectedContainerId, workflow.historyLoadState === "ready");
  const events = useMemo(() => [...(workflow.history?.events ?? [])].reverse(), [workflow.history?.events]);

  if (!documentId) {
    return (
      <div className="mt-3 border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-300">
        Sunucu CDE kaydı, yüklenmiş dokümanın kimliği oluştuktan sonra bağlanır. Bu ekran yerel geçmiş üretmez.
      </div>
    );
  }

  if (workflow.loadState === "loading") {
    return <div className="mt-3 border border-border bg-card p-3 text-[11px] text-muted-foreground">Sunucu CDE kaydı yükleniyor…</div>;
  }

  if (workflow.loadState === "unconfigured" || (workflow.loadState === "ready" && !workflow.project?.containers.length)) {
    return (
      <div className="mt-3 border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
        <strong className="block font-semibold">Bu dokümana bağlı sunucu CDE kaydı hazır değil.</strong>
        Proje, konteyner ve revizyon; yetkili sunucu iş akışında gerçek doküman özeti ile doğrulanmış source/rule/result/code hash kanıtları kullanılarak oluşturulmalıdır. Tarayıcı sahte hash veya yerel onay geçmişi üretmez.
      </div>
    );
  }

  if (workflow.loadState === "error") {
    return (
      <div className="mt-3 border border-red-500/30 bg-red-500/5 p-3 text-[11px] text-red-700 dark:text-red-300">
        {workflow.feedback || "CDE projesi yüklenemedi."}
        <button type="button" onClick={() => void workflow.refresh()} className="ml-2 underline">Yeniden dene</button>
      </div>
    );
  }

  return (
    <div className="mt-3 border border-border bg-card p-3 text-[11px] font-mono text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="block text-foreground">{workflow.project?.name}</strong>
          <span>Gerçek üyelik: {member ? `${roleLabels[member.projectRole]} · ${member.discipline}` : "üyelik bilgisi bulunamadı"}</span>
        </div>
        <div className="flex items-center gap-2">
          {(workflow.project?.containers.length ?? 0) > 1 && (
            <select
              aria-label="CDE konteyneri"
              value={workflow.selectedContainerId ?? ""}
              onChange={(event) => workflow.setSelectedContainerId(event.target.value)}
              className="border border-border bg-background px-2 py-1 text-[10px] text-foreground"
            >
              {workflow.project?.containers.map((container) => (
                <option key={container.id} value={container.id}>{container.containerCode} · {container.title}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            aria-label="CDE geçmişini yenile"
            disabled={workflow.busy}
            onClick={() => void workflow.refresh()}
            className="inline-flex items-center gap-1 border border-border bg-background px-2 py-1 text-[10px] text-foreground disabled:opacity-50"
          >
            <RefreshCw size={12} className={workflow.busy ? "animate-spin" : ""} /> Yenile
          </button>
        </div>
      </div>

      {workflow.history && (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <div className="border border-border bg-background p-2"><span className="block text-[9px] uppercase">Konteyner</span><b className="text-foreground">{workflow.history.container.containerCode}</b></div>
            <div className="border border-border bg-background p-2"><span className="block text-[9px] uppercase">Kanonik durum</span><b className="text-foreground">{workflow.history.container.currentState}</b></div>
            <div className="border border-border bg-background p-2"><span className="block text-[9px] uppercase">Güncel revizyon</span><b className="text-foreground">{activeRevision?.revisionCode ?? "Hazır değil"}</b></div>
            <div className="border border-border bg-background p-2"><span className="block text-[9px] uppercase">Projection sürümü</span><b className="text-foreground">v{workflow.history.container.lockVersion}</b></div>
          </div>

          {awaitingReapproval && (
            <div className="mt-2 border border-amber-500/30 bg-amber-500/5 p-2 text-amber-700 dark:text-amber-300">
              Dosya/kaynak/kural/sonuç/kod kapsamı değişti. Önceki karar tarihçede korunuyor; güncel {activeRevision?.revisionCode ?? "revizyon"} yeniden onay bekliyor.
            </div>
          )}

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <input
              aria-label="CDE karar gerekçesi"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ret / geri çekme için zorunlu gerekçe"
              maxLength={2000}
              className="border border-border bg-background px-2 py-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              disabled={workflow.busy || !decisionReady || !mayDecide || !targetState || !suitabilityCode || !revisionCode.trim()}
              onClick={() => void workflow.transition({ action: "approve", toState: targetState as CdeState, suitabilityCode: suitabilityCode as SuitabilityCode, revisionCode: revisionCode.trim() })}
              className="border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 font-semibold text-emerald-700 disabled:opacity-40 dark:text-emerald-300"
            >Onayla</button>
            <button
              type="button"
              disabled={workflow.busy || !decisionReady || !mayDecide || !reason.trim()}
              onClick={async () => { if (await workflow.transition({ action: "reject", reason: reason.trim() })) setReason(""); }}
              className="border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 font-semibold text-red-700 disabled:opacity-40 dark:text-red-300"
            >Reddet</button>
            <button
              type="button"
              disabled={workflow.busy || !decisionReady || !mayDecide || !reason.trim() || !activeRevision}
              onClick={async () => { if (activeRevision && await workflow.transition({ action: "withdraw", reason: reason.trim(), revisionCode: activeRevision.revisionCode })) setReason(""); }}
              className="border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 font-semibold text-amber-700 disabled:opacity-40 dark:text-amber-300"
            >Geri çek</button>
          </div>
          {!mayDecide && <p className="mt-2 text-[10px]">Karar yazma yetkisi koordinatör veya onaylayıcı rolü gerektirir.</p>}
          {workflow.feedback && <p className="mt-2 border-t border-border pt-2 text-foreground">{workflow.feedback}</p>}

          <div className="mt-3 border-t border-border pt-2">
            <strong className="text-foreground">Salt okunur kanonik karar geçmişi</strong>
            {events.length === 0 ? (
              <p className="mt-1">Henüz sunucu olayı yok.</p>
            ) : (
              <div className="mt-1 space-y-1">
                {events.slice(0, 8).map(({ event, actor }) => (
                  <div key={event.id} className="border border-border bg-background p-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-foreground">{event.fromState} → {event.toState ?? "DURUM DEĞİŞMEDİ"} · {actionLabels[event.action]} · {event.decision.toUpperCase()}</span>
                      <span>{displayDate(event.createdAt)}</span>
                    </div>
                    <div className="mt-0.5">{actor.fullName} ({actor.email}) · {event.actorProjectRole} · {event.actorDiscipline} · v{event.expectedVersion}→v{event.resultingVersion}</div>
                    <div className="mt-0.5 text-foreground">{event.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
