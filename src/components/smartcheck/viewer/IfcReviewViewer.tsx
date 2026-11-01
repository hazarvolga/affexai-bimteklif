import { useEffect, useRef, useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Focus,
  Hand,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Orbit,
  RotateCcw,
  Scissors,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { isStaleChunkError, STALE_CHUNK_MESSAGE } from "@/lib/stale-chunk";
import type { IfcSourceIdentity } from "@/ifc/types";
import {
  parseViewerContext,
  sha256Hex,
  type IfcCameraPreset,
  type IfcViewerContext,
} from "@/ifc/viewer/model";
import type { IfcViewerController, IfcViewerInteractionMode } from "@/ifc/viewer/engine";
import { Button } from "@/components/ui/button";

export interface IfcReviewViewerProps {
  documentId: string;
  selectedElementKey?: string | null;
  onSelectIdentity?: (identity: IfcSourceIdentity | null) => void;
}

type ViewportSizeMode = "normal" | "tall" | "fullscreen";

export function IfcReviewViewer({
  documentId,
  selectedElementKey = null,
  onSelectIdentity,
}: IfcReviewViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<IfcViewerController | null>(null);
  const [context, setContext] = useState<IfcViewerContext | null>(null);
  const [selected, setSelected] = useState<IfcSourceIdentity | null>(null);
  const [status, setStatus] = useState("3B inceleme hazırlanıyor");
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sizeMode, setSizeMode] = useState<ViewportSizeMode>("normal");
  const [interactionMode, setInteractionMode] = useState<IfcViewerInteractionMode>("orbit");
  const [activePreset, setActivePreset] = useState<IfcCameraPreset>("iso");
  const [sectionCutPercent, setSectionCutPercent] = useState<number>(100);
  const [wireframe, setWireframe] = useState<boolean>(false);

  useEffect(() => {
    const abort = new AbortController();
    let disposed = false;
    setIsReady(false);
    const load = async () => {
      try {
        setError(null);
        setStatus("Doğrulanmış IFC kanıtı yükleniyor");
        const contextResponse = await fetchWithAuth(
          `/api/smartcheck/documents/${documentId}/viewer-context`,
          { signal: abort.signal },
        );
        if (!contextResponse.ok) {
          throw new Error(
            (await contextResponse.json().catch(() => ({})))?.error ??
              "3B inceleme bağlamı alınamadı.",
          );
        }
        const parsed = parseViewerContext(await contextResponse.json());
        setContext(parsed);
        const contentResponse = await fetchWithAuth(parsed.contentUrl, { signal: abort.signal });
        if (!contentResponse.ok) throw new Error("Yetkili IFC akışı alınamadı.");
        const bytes = new Uint8Array(await contentResponse.arrayBuffer());
        if (bytes.byteLength !== parsed.fileSizeBytes) throw new Error("IFC_VIEWER_SIZE_MISMATCH");
        if ((await sha256Hex(bytes)) !== parsed.fileSha256) throw new Error("IFC_VIEWER_HASH_MISMATCH");
        if (disposed || !hostRef.current) return;
        setStatus("WebGL modeli oluşturuluyor");
        const { createIfcViewer } = await import("@/ifc/viewer/engine");
        const controller = await createIfcViewer(
          hostRef.current,
          bytes,
          parsed.identities,
          (identity) => {
            setSelected(identity);
            onSelectIdentity?.(identity);
          },
        );
        if (disposed) return controller.dispose();
        controllerRef.current = controller;
        setIsReady(true);
        setStatus("3B inceleme hazır");
      } catch (cause) {
        if (abort.signal.aborted) return;
        setError(isStaleChunkError(cause) ? STALE_CHUNK_MESSAGE : cause instanceof Error ? cause.message : "3B inceleme açılamadı.");
      }
    };
    void load();
    return () => {
      disposed = true;
      abort.abort();
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [documentId]);

  useEffect(() => {
    controllerRef.current?.selectElement(selectedElementKey);
  }, [selectedElementKey]);

  const handleInteractionModeChange = (mode: IfcViewerInteractionMode) => {
    setInteractionMode(mode);
    controllerRef.current?.setInteractionMode(mode);
  };

  const handlePresetChange = (preset: IfcCameraPreset) => {
    setActivePreset(preset);
    controllerRef.current?.setCameraPreset(preset);
  };

  const handleSectionCutChange = (value: number) => {
    setSectionCutPercent(value);
    controllerRef.current?.setSectionCutPercent(value);
  };

  const handleWireframeToggle = () => {
    const next = !wireframe;
    setWireframe(next);
    controllerRef.current?.setWireframe(next);
  };

  const handleResetView = () => {
    setActivePreset("iso");
    setSectionCutPercent(100);
    setWireframe(false);
    setInteractionMode("orbit");
    controllerRef.current?.setWireframe(false);
    controllerRef.current?.setInteractionMode("orbit");
    controllerRef.current?.resetView();
  };

  const viewportHeightClass =
    sizeMode === "fullscreen"
      ? "flex-1 min-h-[280px]"
      : sizeMode === "tall"
        ? "h-[460px] sm:h-[580px] lg:h-[680px]"
        : "h-[340px] sm:h-[420px] lg:h-[480px]";

  return (
    <section
      aria-label="IFC 3B mühendislik inceleme görünümü"
      className={
        sizeMode === "fullscreen"
          ? "fixed inset-2 sm:inset-4 z-50 flex flex-col overflow-hidden border border-border bg-card shadow-2xl"
          : "relative z-0 mx-3 sm:mx-6 my-4 overflow-hidden border border-border bg-card"
      }
    >
      {/* ÜST BAŞLIK & PANEL BOYUTU KONTROLLERİ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Kaynak IFC · 3B İnceleme</h3>
            <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {status}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Geometri yalnız seçme ve görsel inceleme içindir; metraj bu görünümden üretilmez.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {!collapsed && (
            <>
              <Button
                size="sm"
                variant={sizeMode === "normal" ? "secondary" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={() => setSizeMode("normal")}
              >
                Standart
              </Button>
              <Button
                size="sm"
                variant={sizeMode === "tall" ? "secondary" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={() => setSizeMode("tall")}
              >
                Geniş (680px)
              </Button>
              <Button
                size="sm"
                variant={sizeMode === "fullscreen" ? "secondary" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={() =>
                  setSizeMode((prev) => (prev === "fullscreen" ? "normal" : "fullscreen"))
                }
              >
                {sizeMode === "fullscreen" ? (
                  <>
                    <Minimize2 className="mr-1 h-3.5 w-3.5" />
                    Küçült
                  </>
                ) : (
                  <>
                    <Maximize2 className="mr-1 h-3.5 w-3.5" />
                    Tam Ekran
                  </>
                )}
              </Button>
            </>
          )}
          {sizeMode !== "fullscreen" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapsed ? (
                <>
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  3B Görünümü Aç
                </>
              ) : (
                <>
                  <ChevronUp className="mr-1 h-3.5 w-3.5" />
                  Daralt
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="m-4 border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200"
        >
          {error}
          {error === STALE_CHUNK_MESSAGE && (
            <Button size="sm" variant="outline" className="ml-3" onClick={() => window.location.reload()}>Sayfayı yenile</Button>
          )}
        </div>
      ) : (
        <div className={collapsed ? "hidden" : "flex flex-1 flex-col"}>
          {/* 3B UZAY & KAMERA KONTROL ÇUBUĞU */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2">
            {/* Sol: Fare Modu (Döndür / Kaydır) & Yakınlaştırma */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                role="group"
                aria-label="Fare etkileşim modu"
                className="inline-flex items-center rounded border border-border bg-background p-0.5"
              >
                <button
                  type="button"
                  onClick={() => handleInteractionModeChange("orbit")}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    interactionMode === "orbit"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Sol tık ile 3B modeli döndür"
                >
                  <Orbit className="h-3.5 w-3.5" />
                  Döndür
                </button>
                <button
                  type="button"
                  onClick={() => handleInteractionModeChange("pan")}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    interactionMode === "pan"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Sol tık ile 3B modeli kaydır (Sağ tık veya Shift+Sol tık her zaman kaydırır)"
                >
                  <Hand className="h-3.5 w-3.5" />
                  Kaydır (Pan)
                </button>
              </div>

              <div className="inline-flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => controllerRef.current?.zoomByFactor(0.78)}
                  title="Yakınlaştır"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => controllerRef.current?.zoomByFactor(1.28)}
                  title="Uzaklaştır"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => controllerRef.current?.fitToModel()}
                  title="Tüm binayı ekrana ortala ve sığdır"
                >
                  <Crosshair className="mr-1 h-3.5 w-3.5" />
                  Modele Sığdır
                </Button>
              </div>
            </div>

            {/* Orta: Hazır Kamera Bakış Açıları */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 inline-flex items-center text-[10px] font-medium text-muted-foreground">
                <Compass className="mr-1 h-3 w-3" />
                Bakış:
              </span>
              {(
                [
                  { id: "iso", label: "İzometrik" },
                  { id: "top", label: "Üst (Plan)" },
                  { id: "front", label: "Ön" },
                  { id: "right", label: "Sağ" },
                  { id: "left", label: "Sol" },
                ] as const
              ).map((preset) => (
                <Button
                  key={preset.id}
                  size="sm"
                  variant={activePreset === preset.id ? "secondary" : "outline"}
                  className="h-7 px-2 text-[11px]"
                  onClick={() => handlePresetChange(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Sağ: Kat Kesiti (Z-Section) Sürgüsü & Tel Kafes */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground">
                <Scissors className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-medium">Kat Kesiti:</span>
                <input
                  type="range"
                  aria-label="Kat kesiti yüksekliği"
                  min={10}
                  max={100}
                  step={5}
                  value={sectionCutPercent}
                  onChange={(event) => handleSectionCutChange(Number(event.target.value))}
                  className="h-1.5 w-24 cursor-pointer accent-amber-500"
                />
                <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">
                  %{sectionCutPercent}
                </span>
              </label>

              <Button
                size="sm"
                variant={wireframe ? "secondary" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={handleWireframeToggle}
                title="İç mekanları duvarların arkasından görmek için tel kafes görünümü"
              >
                <Layers className="mr-1 h-3.5 w-3.5" />
                Tel Kafes
              </Button>
            </div>
          </div>

          {/* 3B WEBGL SAHNESİ (OVERFLOW-HIDDEN İLE TAŞMA KORUMALI) */}
          <div className={`relative w-full overflow-hidden bg-slate-950 ${viewportHeightClass}`}>
            <div
              ref={hostRef}
              className="absolute inset-0 h-full w-full overflow-hidden"
            />
            {!isReady && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-300">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status}
              </div>
            )}
            <div className="pointer-events-none absolute bottom-2.5 left-3 rounded border border-slate-700/80 bg-slate-900/85 px-2.5 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-sm">
              Sol Tık: {interactionMode === "pan" ? "Kaydır (Pan)" : "Döndür (Orbit)"} · Sağ Tık / Shift: Kaydır · Tekerlek: Yakınlaştır · Tıkla: Eleman Seç
            </div>
          </div>

          {/* ALT ELEMAN SEÇİM & İZOLASYON ÇUBUĞU */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card p-3">
            <Button
              size="sm"
              variant="outline"
              disabled={!selected}
              onClick={() => selected && controllerRef.current?.focusElement(selected.elementKey)}
            >
              <Box className="mr-1 h-3.5 w-3.5" />
              Seçime Odakla
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!selected}
              onClick={() => selected && controllerRef.current?.hideElement(selected.elementKey)}
            >
              <EyeOff className="mr-1 h-3.5 w-3.5" />
              Gizle
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => controllerRef.current?.showAll()}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              Tümünü göster
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!selected}
              onClick={() => selected && controllerRef.current?.isolateElement(selected.elementKey)}
            >
              <Focus className="mr-1 h-3.5 w-3.5" />
              İzole et
            </Button>
            <Button size="sm" variant="outline" onClick={handleResetView}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Sıfırla
            </Button>
            {selected && (
              <span className="ml-auto max-w-full break-all font-mono text-[10px] text-amber-300">
                #{selected.stepId} · {selected.globalId} · {selected.elementKey}
              </span>
            )}
          </div>

          {context && (
            <div className="border-t border-border px-3 py-2 font-mono text-[9px] text-muted-foreground">
              SHA-256 {context.fileSha256} · Run {context.processingRunId}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
