import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import type { CdeState, SuitabilityCode } from "@/smartcheck/rules/iso19650";
import type { CdeHistoryView, CdeProjectView } from "./cde-workflow-model";
import { canSubmitCdeDecision } from "./cde-workflow-model";

type TransitionInput =
  | { action: "approve"; toState: CdeState; suitabilityCode: SuitabilityCode; revisionCode: string }
  | { action: "reject"; reason: string }
  | { action: "withdraw"; reason: string; revisionCode: string };

type LoadState = "idle" | "loading" | "ready" | "unconfigured" | "error";

async function apiError(response: Response): Promise<{ code?: string; message: string }> {
  const body = await response.json().catch(() => ({})) as { code?: string; error?: string };
  return { code: body.code, message: body.error || `CDE isteği başarısız (${response.status}).` };
}

export function useCdeWorkflow(documentId: string | null | undefined) {
  const [project, setProject] = useState<CdeProjectView | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [history, setHistory] = useState<CdeHistoryView | null>(null);
  const [historyLoadState, setHistoryLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadState, setLoadState] = useState<LoadState>(documentId ? "loading" : "idle");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadProject = useCallback(async (signal?: AbortSignal) => {
    if (!documentId) {
      setProject(null);
      setHistory(null);
      setSelectedContainerId(null);
      setLoadState("idle");
      return null;
    }
    setLoadState("loading");
    try {
      const response = await fetchWithAuth(`/api/cde/projects/by-document/${documentId}`, { signal });
      if (response.status === 404) {
        setProject(null);
        setHistory(null);
        setSelectedContainerId(null);
        setLoadState("unconfigured");
        return null;
      }
      if (!response.ok) throw new Error((await apiError(response)).message);
      const nextProject = await response.json() as CdeProjectView;
      setProject(nextProject);
      setSelectedContainerId((current) =>
        current && nextProject.containers.some((container) => container.id === current)
          ? current
          : nextProject.containers[0]?.id ?? null,
      );
      setLoadState("ready");
      return nextProject;
    } catch (error) {
      if (signal?.aborted) return null;
      setFeedback(error instanceof Error ? error.message : "CDE projesi yüklenemedi.");
      setLoadState("error");
      return null;
    }
  }, [documentId]);

  const loadHistory = useCallback(async (containerId = selectedContainerId, signal?: AbortSignal) => {
    if (!containerId) {
      setHistory(null);
      setHistoryLoadState("idle");
      return null;
    }
    setHistory(null);
    setHistoryLoadState("loading");
    try {
      const response = await fetchWithAuth(`/api/cde/containers/${containerId}/history`, { signal });
      if (!response.ok) throw new Error((await apiError(response)).message);
      const nextHistory = await response.json() as CdeHistoryView;
      if (nextHistory.container.id !== containerId) throw new Error("CDE geçmişi seçili konteynerle eşleşmiyor.");
      setHistory(nextHistory);
      setHistoryLoadState("ready");
      return nextHistory;
    } catch (error) {
      if (signal?.aborted) return null;
      setFeedback(error instanceof Error ? error.message : "CDE geçmişi yüklenemedi.");
      setHistoryLoadState("error");
      return null;
    }
  }, [selectedContainerId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadProject(controller.signal);
    return () => controller.abort();
  }, [loadProject]);

  useEffect(() => {
    const controller = new AbortController();
    void loadHistory(selectedContainerId, controller.signal);
    return () => controller.abort();
  }, [loadHistory, selectedContainerId]);

  const refresh = useCallback(async () => {
    const nextProject = await loadProject();
    const targetId = selectedContainerId && nextProject?.containers.some((item) => item.id === selectedContainerId)
      ? selectedContainerId
      : nextProject?.containers[0]?.id ?? null;
    await loadHistory(targetId);
  }, [loadHistory, loadProject, selectedContainerId]);

  const transition = useCallback(async (input: TransitionInput) => {
    if (!canSubmitCdeDecision(history, selectedContainerId, historyLoadState === "ready")) return false;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetchWithAuth(`/api/cde/containers/${selectedContainerId}/transitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ ...input, expectedVersion: history.container.lockVersion }),
      });
      if (!response.ok) {
        const error = await apiError(response);
        if (response.status === 409 && error.code === "CDE_STALE_VERSION") {
          await refresh();
          setFeedback("Kayıt başka bir kullanıcı tarafından değiştirildi. Güncel sürüm ve geçmiş yeniden yüklendi; kararınızı tekrar inceleyin.");
          return false;
        }
        throw new Error(error.message);
      }
      await refresh();
      setFeedback(input.action === "reject" ? "Ret kararı kanonik geçmişe kaydedildi." : "CDE kararı kanonik geçmişe kaydedildi.");
      return true;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "CDE kararı kaydedilemedi.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [history, historyLoadState, refresh, selectedContainerId]);

  const selectedContainer = useMemo(
    () => project?.containers.find((container) => container.id === selectedContainerId) ?? null,
    [project, selectedContainerId],
  );

  return {
    project, selectedContainer, selectedContainerId, setSelectedContainerId,
    history, historyLoadState, loadState, busy, feedback, setFeedback, refresh, transition,
  };
}
