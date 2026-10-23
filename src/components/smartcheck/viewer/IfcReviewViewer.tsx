import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Focus, Loader2, RotateCcw } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import type { IfcSourceIdentity } from "@/ifc/types";
import { parseViewerContext, sha256Hex, type IfcViewerContext } from "@/ifc/viewer/model";
import type { IfcViewerController } from "@/ifc/viewer/engine";
import { Button } from "@/components/ui/button";

export interface IfcReviewViewerProps {
  documentId: string;
  selectedElementKey?: string | null;
  onSelectIdentity?: (identity: IfcSourceIdentity | null) => void;
}

export function IfcReviewViewer({ documentId, selectedElementKey = null, onSelectIdentity }: IfcReviewViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<IfcViewerController | null>(null);
  const [context, setContext] = useState<IfcViewerContext | null>(null);
  const [selected, setSelected] = useState<IfcSourceIdentity | null>(null);
  const [status, setStatus] = useState("3B inceleme hazırlanıyor");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    let disposed = false;
    const load = async () => {
      try {
        setError(null);
        setStatus("Doğrulanmış IFC kanıtı yükleniyor");
        const contextResponse = await fetchWithAuth(`/api/smartcheck/documents/${documentId}/viewer-context`, { signal: abort.signal });
        if (!contextResponse.ok) throw new Error((await contextResponse.json().catch(() => ({})))?.error ?? "3B inceleme bağlamı alınamadı.");
        const parsed = parseViewerContext(await contextResponse.json());
        setContext(parsed);
        const contentResponse = await fetchWithAuth(parsed.contentUrl, { signal: abort.signal });
        if (!contentResponse.ok) throw new Error("Yetkili IFC akışı alınamadı.");
        const bytes = new Uint8Array(await contentResponse.arrayBuffer());
        if (bytes.byteLength !== parsed.fileSizeBytes) throw new Error("IFC_VIEWER_SIZE_MISMATCH");
        if (await sha256Hex(bytes) !== parsed.fileSha256) throw new Error("IFC_VIEWER_HASH_MISMATCH");
        if (disposed || !hostRef.current) return;
        setStatus("WebGL modeli oluşturuluyor");
        const { createIfcViewer } = await import("@/ifc/viewer/engine");
        const controller = await createIfcViewer(hostRef.current, bytes, parsed.identities, identity => {
          setSelected(identity);
          onSelectIdentity?.(identity);
        });
        if (disposed) return controller.dispose();
        controllerRef.current = controller;
        setStatus("3B inceleme hazır");
      } catch (cause) {
        if (abort.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "3B inceleme açılamadı.");
      }
    };
    void load();
    return () => { disposed = true; abort.abort(); controllerRef.current?.dispose(); controllerRef.current = null; };
  }, [documentId]);

  useEffect(() => { controllerRef.current?.selectElement(selectedElementKey); }, [selectedElementKey]);

  return (
    <section aria-label="IFC 3B mühendislik inceleme görünümü" className="border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Kaynak IFC · 3B İnceleme</h3>
          <p className="mt-1 text-[10px] text-muted-foreground">Geometri yalnız seçme ve görsel inceleme içindir; metraj bu görünümden üretilmez.</p>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{status}</span>
      </div>
      {error ? (
        <div role="alert" className="m-4 border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">{error}</div>
      ) : (
        <>
          <div className="relative h-[460px] min-h-[320px] w-full bg-slate-950">
            <div ref={hostRef} className="absolute inset-0" />
            {!controllerRef.current && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-300"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{status}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
            <Button size="sm" variant="outline" disabled={!selected} onClick={() => selected && controllerRef.current?.hideElement(selected.elementKey)}><EyeOff className="mr-1 h-3.5 w-3.5" />Gizle</Button>
            <Button size="sm" variant="outline" onClick={() => controllerRef.current?.showAll()}><Eye className="mr-1 h-3.5 w-3.5" />Tümünü göster</Button>
            <Button size="sm" variant="outline" disabled={!selected} onClick={() => selected && controllerRef.current?.isolateElement(selected.elementKey)}><Focus className="mr-1 h-3.5 w-3.5" />İzole et</Button>
            <Button size="sm" variant="outline" onClick={() => controllerRef.current?.resetView()}><RotateCcw className="mr-1 h-3.5 w-3.5" />Sıfırla</Button>
            {selected && <span className="ml-auto max-w-full break-all font-mono text-[10px] text-amber-300">#{selected.stepId} · {selected.globalId} · {selected.elementKey}</span>}
          </div>
          {context && <div className="border-t border-border px-3 py-2 font-mono text-[9px] text-muted-foreground">SHA-256 {context.fileSha256} · Run {context.processingRunId}</div>}
        </>
      )}
    </section>
  );
}
